import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { smoothstep } from "../math";
import type { SealPose } from "../actions/pose";
import type { RawFeature } from "./bodyData";
import {
  Body,
  computeBody,
  DEFAULT_BODY,
  featureLocal,
  FEATURES,
  FRONT_FLIPPER_RING,
  NECK_END,
  NECK_START,
  PIVOT_RING,
  REAR_FLIPPER_RING,
  RING_COUNT,
  ringOffset,
  ringPoint,
  SCALE,
  SEGMENTS,
  sideToUV,
  TIP_RING,
} from "./profile";
import { DEFAULT_SHAPE, ShapeParams } from "./shape";

const TAIL_VERTEX = RING_COUNT * SEGMENTS;
const TOP_VERTEX = TAIL_VERTEX + 1;
const vertexIndex = (ring: number, j: number) => ring * SEGMENTS + (j % SEGMENTS);

// 每個環受各種彎曲影響的比重
const TAIL_W = Array.from({ length: RING_COUNT }, (_, i) => smoothstep(0, 1, (PIVOT_RING - i) / PIVOT_RING));
const BODY_W = Array.from({ length: RING_COUNT }, (_, i) => smoothstep(PIVOT_RING, NECK_START + 1, i));
const HEAD_W = Array.from({ length: RING_COUNT }, (_, i) => smoothstep(NECK_START, NECK_END, i));

const _euler = new THREE.Euler();
const _v = new THREE.Vector3();
const FORWARD = new THREE.Vector3(1, 0, 0);

export interface SealBase {
  x: number;
  z: number;
  yaw: number;
}

/**
 * 程式建模的海豹。
 * 身體是一串環,每一幀依姿勢重新計算每個環的位置與方向(類似脊椎骨架),
 * 臉與鰭掛在對應的環上跟著動。
 */
export class SealRig {
  readonly group = new THREE.Group();
  readonly skin: THREE.MeshPhysicalMaterial;

  private body: Body = DEFAULT_BODY;
  private readonly geometry = new THREE.BufferGeometry();
  private readonly positions: THREE.BufferAttribute;
  private readonly ringPos = Array.from({ length: RING_COUNT }, () => new THREE.Vector3());
  private readonly ringQuat = Array.from({ length: RING_COUNT }, () => new THREE.Quaternion());

  /** 掛在頭頂環上;內層 face 會跟著頭的大小縮放 */
  private readonly headFrame = new THREE.Group();
  private readonly face = new THREE.Group();
  private readonly chest = new THREE.Group();
  private readonly hips = new THREE.Group();
  private readonly eyes: THREE.Group[] = [];
  private readonly frontFlippers: THREE.Group[] = [];
  private readonly rearFlippers: THREE.Group[] = [];

  constructor(texture: THREE.Texture) {
    // sheen 讓邊緣帶一圈柔光,看起來像絨毛玩偶
    this.skin = new THREE.MeshPhysicalMaterial({
      map: texture,
      roughness: 0.78,
      sheen: 0.6,
      sheenRoughness: 0.5,
      sheenColor: new THREE.Color("#fff6ec"),
    });

    // ---- 身體 ----
    const count = TOP_VERTEX + 1;
    const geo = this.geometry;
    this.positions = new THREE.BufferAttribute(new Float32Array(count * 3), 3);
    this.positions.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute("position", this.positions);
    geo.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(count * 3), 3));

    // 貼圖座標固定取自預設體型的側面投影,所以改體型時花紋會跟著拉伸
    const uv = new Float32Array(count * 2);
    const setUV = (i: number, x: number, y: number) => {
      const [u, v] = sideToUV(x, y);
      uv[i * 2] = u;
      uv[i * 2 + 1] = v;
    };
    setUV(TAIL_VERTEX, ...DEFAULT_BODY.tail);
    setUV(TOP_VERTEX, ...DEFAULT_BODY.top);
    for (let i = 0; i < RING_COUNT; i++) {
      for (let j = 0; j < SEGMENTS; j++) {
        const p = ringPoint(DEFAULT_BODY.rings[i], j);
        setUV(vertexIndex(i, j), p[0], p[1]);
      }
    }
    geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));

    const index: number[] = [];
    for (let j = 0; j < SEGMENTS; j++) {
      index.push(TAIL_VERTEX, vertexIndex(0, j), vertexIndex(0, j + 1));
      index.push(TOP_VERTEX, vertexIndex(TIP_RING, j + 1), vertexIndex(TIP_RING, j));
      for (let i = 0; i < TIP_RING; i++) {
        const a = vertexIndex(i, j);
        const b = vertexIndex(i, j + 1);
        const c = vertexIndex(i + 1, j + 1);
        const d = vertexIndex(i + 1, j);
        index.push(a, d, b, b, d, c);
      }
    }
    geo.setIndex(index);

    const mesh = new THREE.Mesh(geo, this.skin);
    mesh.castShadow = true;
    mesh.frustumCulled = false;
    this.headFrame.add(this.face);
    this.group.add(mesh, this.headFrame, this.chest, this.hips);

    this.buildFace();
    this.buildFlippers();
    this.setShape(DEFAULT_SHAPE);
  }

  // ---- 臉:獨立的小模型,不吃貼圖,怎麼塗都看得到五官 ----
  private buildFace() {
    // 不受光照影響的純黑,避免出現生硬的反光
    const eyeMat = new THREE.MeshBasicMaterial({ color: "#16131a" });
    const shineMat = new THREE.MeshBasicMaterial({ color: "#ffffff" });
    const darkMat = new THREE.MeshStandardMaterial({ color: "#2a2430", roughness: 0.45 });
    const lineMat = new THREE.MeshStandardMaterial({ color: "#3a333f", roughness: 0.7 });
    const blushMat = new THREE.MeshStandardMaterial({ color: "#ffb4c4", roughness: 1, transparent: true, opacity: 0.55 });
    const ball = new THREE.SphereGeometry(1, 24, 16);
    const S = SCALE;

    /** 把零件放到量測到的位置,+X 朝外;out = 沿朝外方向凸出的距離。 */
    const place = (obj: THREE.Object3D, f: RawFeature, side: number, out: number, size: [number, number, number], forward = 0) => {
      const p = featureLocal(f, side);
      _v.set(f.n[0], f.n[1], f.n[2] * side).lerp(FORWARD, forward).normalize();
      obj.position.set(p[0] + _v.x * out * S, p[1] + _v.y * out * S, p[2] + _v.z * out * S);
      obj.quaternion.setFromUnitVectors(FORWARD, _v);
      obj.scale.set(size[0] * S, size[1] * S, size[2] * S);
      this.face.add(obj);
    };
    const local = (f: RawFeature, side: number, out: number) => {
      const p = featureLocal(f, side);
      return new THREE.Vector3(p[0] + f.n[0] * out * S, p[1] + f.n[1] * out * S, p[2] + f.n[2] * side * out * S);
    };
    const tube = (points: THREE.Vector3[], radius: number, material: THREE.Material) => {
      const curve = new THREE.CatmullRomCurve3(points, false, "centripetal");
      const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, points.length * 6, radius * S, 6), material);
      this.face.add(mesh);
      return mesh;
    };

    for (const side of [1, -1]) {
      // 眼睛:純黑、霧面的眼珠
      const eye = new THREE.Group();
      const pupil = new THREE.Mesh(ball, eyeMat);
      pupil.scale.set(0.5, 1, 1);
      // 上方一顆小白點當反光
      const shine = new THREE.Mesh(ball, shineMat);
      shine.scale.set(0.08, 0.17, 0.17);
      shine.position.set(0.46, 0.4, -0.22 * side);
      eye.add(pupil, shine);
      const holder = new THREE.Group();
      holder.add(eye);
      place(holder, FEATURES.eye, side, -0.004, [0.033, 0.033, 0.033], 0.45);
      this.eyes.push(eye);

      place(new THREE.Mesh(ball, darkMat), FEATURES.ear, side, -0.002, [0.004, 0.009, 0.009]);
      place(new THREE.Mesh(ball, darkMat), FEATURES.brow, side, -0.002, [0.004, 0.007, 0.009]);
      place(new THREE.Mesh(ball, blushMat), FEATURES.blush, side, -0.004, [0.008, 0.026, 0.034]);

      // 鬍鬚:嘴邊的小點,各長出一根微微下垂的鬍子
      FEATURES.whiskers.forEach((w, n) => {
        place(new THREE.Mesh(ball, darkMat), w, side, 0, [0.003, 0.0045, 0.0045]);
        const root = local(w, side, 0.001);
        const lift = (1 - n) * 0.012;
        tube(
          [
            root,
            root.clone().add(new THREE.Vector3(-0.006 * S, (lift - 0.004) * S, 0.035 * S * side)),
            root.clone().add(new THREE.Vector3(-0.03 * S, (lift * 2 - 0.022) * S, 0.075 * S * side)),
          ],
          0.0013,
          lineMat,
        );
      });
    }

    // 鼻子、人中、微笑的 w 形嘴
    place(new THREE.Mesh(ball, darkMat), FEATURES.nose, 1, -0.003, [0.012, 0.015, 0.026], 0.7);
    tube(FEATURES.philtrum.map((f) => local(f, 1, 0.0015)), 0.0028, lineMat);
    const right = FEATURES.mouth.map((f) => local(f, 1, 0.0015));
    const left = FEATURES.mouth
      .slice(0, -1)
      .map((f) => local(f, -1, 0.0015))
      .reverse();
    tube([...right, ...left], 0.0028, lineMat);
  }

  // ---- 鰭:手掌加五根腳趾,顏色取自貼圖上對應的位置,越往趾尖越深 ----
  private buildFlippers() {
    const makeFlipper = (len: number, width: number, toe: number, thick: number, uvAt: [number, number]) => {
      const parts: THREE.BufferGeometry[] = [];
      const palm = new THREE.SphereGeometry(1, 16, 10);
      palm.scale(width * 0.5, thick, len * 0.55);
      palm.translate(0, 0, len * 0.45);
      parts.push(palm);
      for (let k = -2; k <= 2; k++) {
        const toeLen = toe * (1 - 0.1 * k * k);
        const g = new THREE.SphereGeometry(1, 10, 8);
        g.scale(width * 0.125, thick * 0.8, toeLen * 0.62);
        g.translate(0, 0, toeLen * 0.45);
        g.rotateY(k * 0.2);
        g.translate(k * width * 0.19, 0, len * (0.82 - 0.035 * k * k));
        parts.push(g);
      }
      const geo = mergeGeometries(parts)!;
      const pos = geo.getAttribute("position");
      const color = new Float32Array(pos.count * 3);
      const uv = geo.getAttribute("uv");
      const [u, v] = sideToUV(uvAt[0], uvAt[1]);
      for (let i = 0; i < pos.count; i++) {
        const shade = 0.8 - 0.42 * smoothstep(len * 0.05, len + toe * 0.8, pos.getZ(i));
        color.set([shade, shade, shade * 1.04], i * 3);
        uv.setXY(i, u, v);
      }
      geo.setAttribute("color", new THREE.BufferAttribute(color, 3));
      return geo;
    };

    const flipperMat = this.skin.clone();
    flipperMat.vertexColors = true;

    const frontAt = ringPoint(DEFAULT_BODY.rings[FRONT_FLIPPER_RING], SEGMENTS * 0.4);
    const rearAt = ringPoint(DEFAULT_BODY.rings[REAR_FLIPPER_RING], SEGMENTS * 0.3);
    const frontGeo = makeFlipper(0.16, 0.135, 0.075, 0.03, [frontAt[0], frontAt[1]]);
    const rearGeo = makeFlipper(0.2, 0.15, 0.13, 0.022, [rearAt[0], rearAt[1]]);

    for (const side of [1, -1]) {
      for (const [geo, list, parent] of [
        [frontGeo, this.frontFlippers, this.chest],
        [rearGeo, this.rearFlippers, this.hips],
      ] as const) {
        const flipper = new THREE.Group();
        const mesh = new THREE.Mesh(geo, flipperMat);
        mesh.castShadow = true;
        flipper.add(mesh);
        flipper.rotation.order = "YXZ";
        flipper.userData.side = side;
        list.push(flipper);
        parent.add(flipper);
      }
    }
  }

  setShape(shape: ShapeParams) {
    this.body = computeBody(shape);
    this.face.scale.setScalar(shape.head);

    // 鰭的根部:貼著地面、在身體兩側;胖瘦會把它往外推
    const g = shape.girth;
    const chest = this.body.rings[FRONT_FLIPPER_RING];
    const hips = this.body.rings[REAR_FLIPPER_RING];
    for (const f of this.frontFlippers) {
      const side = f.userData.side as number;
      f.position.set(0.07 * SCALE, 0.04 * SCALE - chest.y, side * 0.19 * SCALE * g);
      const s = SCALE * shape.flipper;
      f.scale.set(s, s, s * side);
    }
    for (const f of this.rearFlippers) {
      const side = f.userData.side as number;
      f.position.set(0.02 * SCALE, 0.03 * SCALE - hips.y, side * 0.17 * SCALE * g);
      const s = SCALE * (0.4 + 0.6 * shape.flipper);
      f.scale.set(s, s, s * side);
    }
  }

  /** 依姿勢更新整隻海豹。base 是海豹在浮冰上的位置與朝向。 */
  applyPose(pose: SealPose, base: SealBase) {
    const { ringPos: P, ringQuat: Q } = this;
    const { rings, tail, top } = this.body;
    const k = PIVOT_RING;

    // 以肚子為支點,往頭、往尾兩個方向累積彎曲;頭在脖子處另外轉動
    P[k].set(rings[k].x, rings[k].y, 0);
    Q[k].identity();
    for (let i = k + 1; i < RING_COUNT; i++) {
      const s = BODY_W[i];
      const h = HEAD_W[i];
      _euler.set(pose.headRoll * h, pose.yawFront * s + pose.headYaw * h, pose.bendFront * s + pose.headPitch * h, "YZX");
      Q[i].setFromEuler(_euler);
      _v.set(rings[i].x - rings[i - 1].x, rings[i].y - rings[i - 1].y, 0).applyQuaternion(Q[i]);
      P[i].copy(P[i - 1]).add(_v);
    }
    for (let i = k - 1; i >= 0; i--) {
      const s = TAIL_W[i];
      _euler.set(0, -pose.yawTail * s, -pose.bendTail * s, "YZX");
      Q[i].setFromEuler(_euler);
      _v.set(rings[i].x - rings[i + 1].x, rings[i].y - rings[i + 1].y, 0).applyQuaternion(Q[i]);
      P[i].copy(P[i + 1]).add(_v);
    }

    const pos = this.positions;
    for (let i = 0; i < RING_COUNT; i++) {
      for (let j = 0; j < SEGMENTS; j++) {
        const o = ringOffset(rings[i], j);
        _v.set(o[0], o[1], o[2]).applyQuaternion(Q[i]).add(P[i]);
        pos.setXYZ(vertexIndex(i, j), _v.x, _v.y, _v.z);
      }
    }
    _v.set(tail[0] - rings[0].x, tail[1] - rings[0].y, 0).applyQuaternion(Q[0]).add(P[0]);
    pos.setXYZ(TAIL_VERTEX, _v.x, _v.y, _v.z);
    _v.set(top[0] - rings[TIP_RING].x, top[1] - rings[TIP_RING].y, 0).applyQuaternion(Q[TIP_RING]).add(P[TIP_RING]);
    pos.setXYZ(TOP_VERTEX, _v.x, _v.y, _v.z);
    pos.needsUpdate = true;
    this.geometry.computeVertexNormals();

    this.headFrame.position.copy(P[TIP_RING]);
    this.headFrame.quaternion.copy(Q[TIP_RING]);
    this.chest.position.copy(P[FRONT_FLIPPER_RING]);
    this.chest.quaternion.copy(Q[FRONT_FLIPPER_RING]);
    this.hips.position.copy(P[REAR_FLIPPER_RING]);
    this.hips.quaternion.copy(Q[REAR_FLIPPER_RING]);

    const eyeOpen = 1 - 0.92 * Math.min(1, Math.max(0, pose.blink));
    for (const eye of this.eyes) eye.scale.set(1, eyeOpen, 1);

    // 鰭平貼地面:前鰭朝前外側,後鰭朝後外側
    for (const f of this.frontFlippers) {
      const side = f.userData.side as number;
      const raise = side > 0 ? pose.flipperR : pose.flipperL;
      f.rotation.set(side * (0.1 - raise), side * (0.62 + pose.flipperSweep), 0);
    }
    for (const f of this.rearFlippers) {
      const side = f.userData.side as number;
      f.rotation.set(side * -(0.03 + pose.tailFlap), side * (-0.72 + pose.tailFan), 0);
    }

    // 整體:位置、朝向、擠壓拉伸
    const yaw = base.yaw + pose.turn;
    const g = this.group;
    g.position.set(
      base.x + Math.cos(yaw) * pose.advance + pose.rootX,
      pose.rootY,
      base.z - Math.sin(yaw) * pose.advance + pose.rootZ,
    );
    g.rotation.set(pose.rootRoll, yaw + pose.rootYaw, pose.rootPitch, "YZX");
    const sq = Math.max(0.3, pose.squash);
    const wide = 1 / Math.sqrt(sq);
    g.scale.set(wide, sq, wide);
  }

  dispose() {
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.dispose();
    });
  }
}
