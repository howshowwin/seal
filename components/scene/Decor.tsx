"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { FLOE_RADIUS } from "./Floe";

/** 固定種子的亂數:場景的擺設每次載入都一樣。 */
function seeded(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
}
const rnd = seeded(2026);
const range = (a: number, b: number) => a + rnd() * (b - a);

/** 柔邊的小圓點,給雪花和波光用(否則點會是方形的)。 */
let dot: THREE.CanvasTexture | null = null;
function dotTexture() {
  if (!dot) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 32;
    const ctx = canvas.getContext("2d")!;
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.45, "rgba(255,255,255,0.9)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);
    dot = new THREE.CanvasTexture(canvas);
  }
  return dot;
}

const ICE = "#f6fbff";
const ICE_BLUE = "#d3ecf8";

// ---------------------------------------------------------------- 冰山

interface Peak {
  dx: number;
  dz: number;
  r: number;
  h: number;
  rot: number;
  tilt: number;
}
const BERGS = (
  [
    [-9, -13, 2.3],
    [-4.5, -17, 1.4],
    [9, -16, 2.7],
    [15, -8, 1.7],
    [-16, -5, 1.9],
    [3, -24, 2.2],
    [-13, 12, 1.5],
    [17, 11, 2],
    [2, 19, 1.6],
  ] as const
).map(([x, z, size]) => ({
  x,
  z,
  size,
  peaks: Array.from({ length: 3 }, (_, i): Peak => {
    const k = i === 0 ? 1 : range(0.45, 0.75);
    return {
      dx: i === 0 ? 0 : range(-1, 1) * size * 0.75,
      dz: i === 0 ? 0 : range(-1, 1) * size * 0.75,
      r: size * k,
      h: size * k * range(1.3, 1.9),
      rot: range(0, 6),
      tilt: range(-0.12, 0.12),
    };
  }),
}));

/** 多個尖峰疊成的冰山,底下有一圈淡藍色的冰座。 */
function Icebergs() {
  return (
    <>
      {BERGS.map((b, i) => (
        <group key={i} position={[b.x, 0, b.z]}>
          <mesh position={[0, 0.05, 0]} rotation={[0, i, 0]}>
            <cylinderGeometry args={[b.size * 1.25, b.size * 1.45, 0.5, 8]} />
            <meshStandardMaterial color={ICE_BLUE} flatShading roughness={0.8} />
          </mesh>
          {b.peaks.map((p, n) => (
            <mesh key={n} position={[p.dx, p.h / 2 + 0.2, p.dz]} rotation={[p.tilt, p.rot, p.tilt]}>
              <coneGeometry args={[p.r, p.h, 6]} />
              <meshStandardMaterial color={ICE} flatShading roughness={0.85} />
            </mesh>
          ))}
        </group>
      ))}
    </>
  );
}

// ---------------------------------------------------------------- 遠方的雪島

const RIDGE = Array.from({ length: 34 }, (_, i) => {
  const a = (i / 34) * Math.PI * 2 + range(-0.05, 0.05);
  const d = range(39, 45);
  return { x: Math.cos(a) * d, z: Math.sin(a) * d, r: range(4, 8), h: range(3, 8.5), rot: range(0, 6) };
});

/** 繞著地平線的一圈雪山,被霧蓋成淡淡的剪影,讓畫面有遠景。 */
function Ridge() {
  return (
    <>
      {RIDGE.map((m, i) => (
        <mesh key={i} position={[m.x, m.h / 2 - 0.3, m.z]} rotation={[0, m.rot, 0]}>
          <coneGeometry args={[m.r, m.h, 5]} />
          <meshStandardMaterial color="#eef7fc" flatShading roughness={1} />
        </mesh>
      ))}
    </>
  );
}

// ---------------------------------------------------------------- 漂浮的小浮冰

const FLOES = Array.from({ length: 11 }, (_, i) => {
  const a = (i / 11) * Math.PI * 2 + range(-0.2, 0.2);
  const d = range(4.6, 12);
  return { x: Math.cos(a) * d, z: Math.sin(a) * d, r: range(0.45, 1.25), rot: range(0, 6), phase: range(0, 6), sides: 5 + Math.floor(rnd() * 3) };
});

function SmallFloes() {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    refs.current.forEach((m, i) => {
      if (!m) return;
      const f = FLOES[i];
      m.position.y = 0.1 + Math.sin(t * 0.9 + f.phase) * 0.05;
      m.rotation.x = Math.sin(t * 0.7 + f.phase) * 0.04;
      m.rotation.z = Math.cos(t * 0.6 + f.phase) * 0.04;
      m.rotation.y = f.rot + t * 0.02;
    });
  });
  return (
    <>
      {FLOES.map((f, i) => (
        <mesh
          key={i}
          ref={(m) => {
            refs.current[i] = m;
          }}
          position={[f.x, 0.1, f.z]}
          scale={[f.r, 1, f.r * 0.85]}
        >
          <cylinderGeometry args={[1, 0.82, 0.3, f.sides]} />
          <meshStandardMaterial color="#eaf6fc" flatShading roughness={0.9} />
        </mesh>
      ))}
    </>
  );
}

// ---------------------------------------------------------------- 主浮冰邊緣的浪花

function Foam() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const m = ref.current;
    if (!m) return;
    const k = 0.5 + 0.5 * Math.sin(clock.elapsedTime * 1.3);
    m.scale.setScalar(1 + 0.035 * k);
    (m.material as THREE.MeshBasicMaterial).opacity = 0.14 + 0.14 * k;
  });
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.16, 0]}>
      <ringGeometry args={[FLOE_RADIUS * 0.95, FLOE_RADIUS * 1.13, 40]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0.3} depthWrite={false} />
    </mesh>
  );
}

// ---------------------------------------------------------------- 波光

const SPARKLE_COUNT = 110;

/** 海面上隨機閃爍的亮點。用加色混合,頂點顏色的亮度就是閃爍的強度。 */
function Sparkles() {
  const { geometry, seeds } = useMemo(() => {
    const local = seeded(7);
    const position = new Float32Array(SPARKLE_COUNT * 3);
    const seeds = new Float32Array(SPARKLE_COUNT * 2);
    for (let i = 0; i < SPARKLE_COUNT; i++) {
      const a = local() * Math.PI * 2;
      const d = 3 + local() * 22;
      position.set([Math.cos(a) * d, 0.2, Math.sin(a) * d], i * 3);
      seeds.set([local() * 6.28, 0.8 + local() * 1.8], i * 2);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(position, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(SPARKLE_COUNT * 3), 3));
    return { geometry, seeds };
  }, []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const color = geometry.getAttribute("color") as THREE.BufferAttribute;
    for (let i = 0; i < SPARKLE_COUNT; i++) {
      const v = Math.pow(Math.max(0, Math.sin(t * seeds[i * 2 + 1] + seeds[i * 2])), 10);
      color.setXYZ(i, v, v, v);
    }
    color.needsUpdate = true;
  });

  return (
    <points geometry={geometry}>
      <pointsMaterial size={0.26} map={dotTexture()} vertexColors transparent depthWrite={false} blending={THREE.AdditiveBlending} fog={false} />
    </points>
  );
}

// ---------------------------------------------------------------- 跳出水面的魚

const JUMP_TIME = 1.15;

/** 每隔幾秒,一條小魚從海裡跳出來畫一道弧線,入水、出水處各有一圈水花。 */
function JumpingFish() {
  const fish = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const rings = useRef<(THREE.Mesh | null)[]>([]);
  const state = useRef({ next: 2.5, start: -10, x: 0, z: 0, heading: 0, dist: 1.6, height: 1, ringLife: [9, 9] });

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    const s = state.current;
    if (t > s.next) {
      const a = Math.random() * Math.PI * 2;
      const d = 3.6 + Math.random() * 4;
      s.x = Math.cos(a) * d;
      s.z = Math.sin(a) * d;
      s.heading = a + Math.PI / 2 + (Math.random() - 0.5);
      s.dist = 1.2 + Math.random() * 0.9;
      s.height = 0.8 + Math.random() * 0.6;
      s.start = t;
      s.next = t + 3.5 + Math.random() * 4.5;
      s.ringLife[0] = 0;
      rings.current[0]?.position.set(s.x, 0.17, s.z);
    }

    const u = (t - s.start) / JUMP_TIME;
    const g = fish.current;
    if (g && body.current) {
      g.visible = u >= 0 && u <= 1;
      if (g.visible) {
        const fx = Math.cos(s.heading);
        const fz = -Math.sin(s.heading);
        g.position.set(s.x + fx * s.dist * u, s.height * 4 * u * (1 - u) - 0.05, s.z + fz * s.dist * u);
        g.rotation.y = s.heading;
        // 身體沿著拋物線的切線方向,外加一點甩尾
        body.current.rotation.z = Math.atan2(s.height * 4 * (1 - 2 * u), s.dist);
        body.current.rotation.y = Math.sin(t * 22) * 0.25;
      } else if (u > 1 && s.ringLife[1] > 5 && u < 1.2) {
        s.ringLife[1] = 0;
        rings.current[1]?.position.set(s.x + Math.cos(s.heading) * s.dist, 0.17, s.z - Math.sin(s.heading) * s.dist);
      }
    }

    for (let i = 0; i < 2; i++) {
      const ring = rings.current[i];
      if (!ring) continue;
      s.ringLife[i] += dt;
      const k = Math.min(1, s.ringLife[i] / 1.1);
      ring.visible = k < 1;
      ring.scale.setScalar(0.2 + k * 0.75);
      (ring.material as THREE.MeshBasicMaterial).opacity = 0.6 * (1 - k);
    }
  });

  return (
    <>
      <group ref={fish} visible={false}>
        <group ref={body}>
          <mesh scale={[0.26, 0.11, 0.07]}>
            <icosahedronGeometry args={[1, 1]} />
            <meshStandardMaterial color="#ffb26b" flatShading roughness={0.5} />
          </mesh>
          <mesh position={[-0.3, 0, 0]} rotation={[0, 0, -Math.PI / 2]} scale={[1, 1, 0.3]}>
            <coneGeometry args={[0.11, 0.16, 4]} />
            <meshStandardMaterial color="#ff8f5a" flatShading roughness={0.5} />
          </mesh>
          <mesh position={[0.13, 0.03, 0.06]} scale={0.018}>
            <icosahedronGeometry args={[1, 0]} />
            <meshBasicMaterial color="#2a2430" />
          </mesh>
          <mesh position={[0.13, 0.03, -0.06]} scale={0.018}>
            <icosahedronGeometry args={[1, 0]} />
            <meshBasicMaterial color="#2a2430" />
          </mesh>
        </group>
      </group>
      {[0, 1].map((i) => (
        <mesh
          key={i}
          ref={(m) => {
            rings.current[i] = m;
          }}
          rotation={[-Math.PI / 2, 0, 0]}
          visible={false}
        >
          <ringGeometry args={[0.78, 1, 16]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
    </>
  );
}

/** 所有放在海面高度的擺設(要放在 Sea 的群組裡)。 */
export function SeaDecor() {
  return (
    <>
      <Icebergs />
      <Ridge />
      <SmallFloes />
      <Foam />
      <Sparkles />
      <JumpingFish />
    </>
  );
}

// ---------------------------------------------------------------- 海鳥

const BIRDS = [
  { radius: 15, height: 8.5, speed: 0.16, phase: 0 },
  { radius: 17, height: 9.6, speed: 0.16, phase: 0.22 },
  { radius: 13.5, height: 7.6, speed: 0.16, phase: -0.2 },
  { radius: 22, height: 11, speed: -0.11, phase: 2.6 },
];

function makeWing() {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array([0, 0, 0.13, 0, 0, -0.1, 0, 0.02, 0.62]), 3));
  g.computeVertexNormals();
  return g;
}

/** 在遠方高空盤旋的海鳥,翅膀上下拍動。 */
function Birds() {
  const wing = useMemo(() => makeWing(), []);
  const refs = useRef<(THREE.Group | null)[]>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    refs.current.forEach((g, i) => {
      if (!g) return;
      const b = BIRDS[i];
      const a = t * b.speed + b.phase;
      g.position.set(Math.cos(a) * b.radius, b.height + Math.sin(t * 0.5 + i) * 0.4, Math.sin(a) * b.radius);
      g.rotation.y = -a + (b.speed > 0 ? Math.PI : 0);
      const flap = Math.sin(t * 5 + i * 1.7) * 0.6;
      g.children[0].rotation.x = flap;
      g.children[1].rotation.x = -flap;
    });
  });
  return (
    <>
      {BIRDS.map((_, i) => (
        <group
          key={i}
          ref={(g) => {
            refs.current[i] = g;
          }}
          scale={1.5}
        >
          <mesh geometry={wing}>
            <meshBasicMaterial color="#5b6b7d" side={THREE.DoubleSide} fog={false} />
          </mesh>
          <mesh geometry={wing} scale={[1, 1, -1]}>
            <meshBasicMaterial color="#5b6b7d" side={THREE.DoubleSide} fog={false} />
          </mesh>
          <mesh scale={[0.2, 0.05, 0.05]}>
            <icosahedronGeometry args={[1, 0]} />
            <meshBasicMaterial color="#4b5a6b" fog={false} />
          </mesh>
        </group>
      ))}
    </>
  );
}

// ---------------------------------------------------------------- 飄雪

const SNOW_COUNT = 240;
const SNOW_BOX = 10;
const SNOW_TOP = 8;

function Snow() {
  const { geometry, speed } = useMemo(() => {
    const local = seeded(99);
    const position = new Float32Array(SNOW_COUNT * 3);
    const speed = new Float32Array(SNOW_COUNT);
    for (let i = 0; i < SNOW_COUNT; i++) {
      position.set([(local() * 2 - 1) * SNOW_BOX, local() * SNOW_TOP, (local() * 2 - 1) * SNOW_BOX], i * 3);
      speed[i] = 0.3 + local() * 0.45;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(position, 3));
    return { geometry, speed };
  }, []);

  useFrame(({ clock }, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const t = clock.elapsedTime;
    const pos = geometry.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < SNOW_COUNT; i++) {
      let y = pos.getY(i) - speed[i] * dt;
      if (y < -0.2) y = SNOW_TOP;
      pos.setY(i, y);
      pos.setX(i, pos.getX(i) + Math.sin(t * 0.8 + i) * 0.12 * dt);
    }
    pos.needsUpdate = true;
  });

  return (
    <points geometry={geometry} frustumCulled={false}>
      <pointsMaterial size={0.085} map={dotTexture()} color="#ffffff" transparent opacity={0.85} depthWrite={false} fog={false} />
    </points>
  );
}

/** 空中的擺設:海鳥與飄雪。 */
export function AirDecor() {
  return (
    <>
      <Birds />
      <Snow />
    </>
  );
}

// ---------------------------------------------------------------- 主浮冰上的小物

const EDGE = FLOE_RADIUS * 0.8;
const at = (angle: number, d = EDGE): [number, number, number] => [Math.cos(angle) * d, 0, Math.sin(angle) * d];

/** 浮冰邊緣的雪堆、冰晶和一個小雪人。都放在海豹活動範圍之外。 */
export function FloeDecor() {
  return (
    <>
      {/* 雪堆 */}
      {(
        [
          [2.3, 0.42, 0.2],
          [2.75, 0.3, 0.15],
          [5.3, 0.36, 0.17],
        ] as const
      ).map(([a, r, h], i) => (
        <mesh key={i} position={at(a, EDGE * (i === 1 ? 0.92 : 1))} scale={[r, h, r * 0.85]} castShadow receiveShadow>
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color="#ffffff" flatShading roughness={1} />
        </mesh>
      ))}

      {/* 冰晶 */}
      <group position={at(3.9)} rotation={[0, 0.6, 0]}>
        {(
          [
            [0, 0, 0.16, 0.62, 0.08],
            [0.2, 0.05, 0.11, 0.4, -0.3],
            [-0.17, 0.1, 0.09, 0.3, 0.35],
          ] as const
        ).map(([x, z, r, h, tilt], i) => (
          <mesh key={i} position={[x, h / 2 - 0.02, z]} rotation={[tilt * 0.5, i, tilt]} castShadow>
            <coneGeometry args={[r, h, 4]} />
            <meshPhysicalMaterial color="#bfe6fb" flatShading roughness={0.15} transparent opacity={0.82} />
          </mesh>
        ))}
      </group>

      {/* 小雪人 */}
      <group position={at(0.85, EDGE * 0.98)} rotation={[0, -0.85 + Math.PI, 0]}>
        <mesh position={[0, 0.17, 0]} scale={0.2} castShadow>
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color="#ffffff" flatShading roughness={1} />
        </mesh>
        <mesh position={[0, 0.44, 0]} scale={0.14} castShadow>
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color="#ffffff" flatShading roughness={1} />
        </mesh>
        <mesh position={[0.15, 0.44, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[0.025, 0.1, 5]} />
          <meshStandardMaterial color="#ff9a52" flatShading />
        </mesh>
        {[0.05, -0.05].map((z) => (
          <mesh key={z} position={[0.12, 0.49, z]} scale={0.017}>
            <icosahedronGeometry args={[1, 0]} />
            <meshBasicMaterial color="#2a2430" />
          </mesh>
        ))}
        {/* 圍巾 */}
        <mesh position={[0, 0.33, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.11, 0.03, 5, 10]} />
          <meshStandardMaterial color="#ff8fa3" flatShading />
        </mesh>
      </group>
    </>
  );
}
