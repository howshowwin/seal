import { lerp, smoothstep } from "../math";
import { FEATURES, FIRST_HEAD_RING, HEAD_TIP, RAW_RINGS, RawFeature, SEG, TAIL_TIP } from "./bodyData";
import { DEFAULT_SHAPE, ShapeParams } from "./shape";

/**
 * 海豹的身體 = 一串「環」,每個環有自己的中心、朝向與一圈半徑。
 * 環的資料來自 bodyData.ts(由參考模型量測),這裡負責套用體型參數。
 *
 * 座標:X = 前方、Y = 上方、Z = 右側。環從尾巴排到頭頂:
 * 後半身是直立的切片,胸口到脖子是繞著背部折痕旋轉的扇形切片,頭是水平切片。
 */
export const SCALE = 1.7; // 參考模型單位 → 遊戲單位
export const SEGMENTS = SEG;
export const RING_COUNT = RAW_RINGS.length;
/** 預設的頭比量測到的位置低一點(縮著脖子),headLift 從這裡往上加 */
const HEAD_LIFT_BASE = -0.14;
export const PIVOT_RING = 8; // 肚子:身體彎曲的支點
export const NECK_START = FIRST_HEAD_RING - 6; // 脖子:頭從這裡開始轉動
export const NECK_END = FIRST_HEAD_RING;
export const TIP_RING = RING_COUNT - 1; // 頭頂最後一個環
export const FRONT_FLIPPER_RING = 17;
export const REAR_FLIPPER_RING = 2;

const SIN = Array.from({ length: SEG }, (_, j) => Math.sin(Math.PI / 2 + (j / SEG) * Math.PI * 2));
const COS = Array.from({ length: SEG }, (_, j) => Math.cos(Math.PI / 2 + (j / SEG) * Math.PI * 2));
/** 每個環上「正前方 / 肚子側」的那一格(j=0 是背側)。 */
export const FRONT_SEGMENT = SEG / 2;

/** 0 = 身體、1 = 頭 */
export const headWeight = (i: number) => smoothstep(NECK_START, NECK_END - 1, i);

export interface Ring {
  /** 中心 */
  x: number;
  y: number;
  /** 環平面內「朝背側」的方向 */
  ex: number;
  ey: number;
  /** 每一格的半徑(已套用體型與比例) */
  r: number[];
  /** 這個環的寬度縮放(胖瘦或頭大小) */
  scale: number;
}

export interface Body {
  rings: Ring[];
  tail: [number, number];
  top: [number, number];
  shape: ShapeParams;
}

export function computeBody(shape: ShapeParams): Body {
  const k = PIVOT_RING;
  const sx = (i: number) => lerp(shape.length, shape.head, headWeight(i));
  const sy = (i: number) => lerp(shape.girth, shape.head, headWeight(i));
  const rings: Ring[] = RAW_RINGS.map((raw, i) => ({
    x: 0,
    y: 0,
    ex: raw.e1[0],
    ey: raw.e1[1],
    r: raw.r.map((v) => v * SCALE * sy(i)),
    scale: sy(i),
  }));
  // 從肚子往前、往後累加,體型參數只改變每一段的長度
  rings[k].x = RAW_RINGS[k].c[0] * SCALE;
  rings[k].y = RAW_RINGS[k].c[1] * SCALE * shape.girth;
  for (let i = k + 1; i < RING_COUNT; i++) {
    rings[i].x = rings[i - 1].x + (RAW_RINGS[i].c[0] - RAW_RINGS[i - 1].c[0]) * SCALE * sx(i);
    rings[i].y = rings[i - 1].y + (RAW_RINGS[i].c[1] - RAW_RINGS[i - 1].c[1]) * SCALE * sy(i);
    // 頭的高低:把位移平均分給脖子那幾個環,脖子就會伸長或縮短
    if (i > NECK_START && i <= NECK_END) rings[i].y += (HEAD_LIFT_BASE + shape.headLift) / (NECK_END - NECK_START);
  }
  for (let i = k - 1; i >= 0; i--) {
    rings[i].x = rings[i + 1].x + (RAW_RINGS[i].c[0] - RAW_RINGS[i + 1].c[0]) * SCALE * sx(i);
    rings[i].y = rings[i + 1].y + (RAW_RINGS[i].c[1] - RAW_RINGS[i + 1].c[1]) * SCALE * sy(i);
  }
  const first = rings[0];
  const last = rings[TIP_RING];
  return {
    rings,
    shape,
    tail: [
      first.x + (TAIL_TIP[0] - RAW_RINGS[0].c[0]) * SCALE * shape.length,
      first.y + (TAIL_TIP[1] - RAW_RINGS[0].c[1]) * SCALE * shape.girth,
    ],
    top: [
      last.x + (HEAD_TIP[0] - RAW_RINGS[TIP_RING].c[0]) * SCALE * shape.head,
      last.y + (HEAD_TIP[1] - RAW_RINGS[TIP_RING].c[1]) * SCALE * shape.head,
    ],
  };
}

/** 環上第 j 格相對於環中心的偏移。 */
export function ringOffset(ring: Ring, j: number): [number, number, number] {
  const r = ring.r[j];
  return [ring.ex * r * SIN[j], ring.ey * r * SIN[j], r * COS[j]];
}

/** 環上第 j 格在靜止姿勢下的位置。 */
export function ringPoint(ring: Ring, j: number): [number, number, number] {
  const [ox, oy, oz] = ringOffset(ring, j);
  return [ring.x + ox, ring.y + oy, oz];
}

/**
 * 臉部零件相對於頭頂環中心的位置(頭大小 = 1 時)。
 * 頭是整顆等比例縮放的,所以零件只要跟著頭的縮放即可。
 */
export function featureLocal(f: RawFeature, side = 1): [number, number, number] {
  const c = RAW_RINGS[TIP_RING].c;
  return [(f.p[0] - c[0]) * SCALE, (f.p[1] - c[1]) * SCALE, f.p[2] * SCALE * side];
}

/** 臉部零件在靜止姿勢下的位置。 */
export function featurePoint(body: Body, f: RawFeature, side = 1): [number, number, number] {
  const l = featureLocal(f, side);
  const tip = body.rings[TIP_RING];
  const k = body.shape.head;
  return [tip.x + l[0] * k, tip.y + l[1] * k, l[2] * k];
}

export { FEATURES };

// ---- 貼圖:側面投影(左右鏡射) ----
export const TEX_W = 1024;
export const TEX_H = 832;
const SPAN_X = 0.96 * SCALE;
const SPAN_Y = 0.81 * SCALE;
const TEX_SCALE = Math.min((TEX_W * 0.9) / SPAN_X, (TEX_H * 0.9) / SPAN_Y);
const TEX_CX = 0.025 * SCALE;
const TEX_CY = 0.405 * SCALE;

/** 把預設體型的側面座標 (x, y) 轉成畫布像素。 */
export function sideToCanvas(x: number, y: number): [number, number] {
  return [TEX_W / 2 + (x - TEX_CX) * TEX_SCALE, TEX_H / 2 + (TEX_CY - y) * TEX_SCALE];
}

export function sideToUV(x: number, y: number): [number, number] {
  const [px, py] = sideToCanvas(x, y);
  return [px / TEX_W, 1 - py / TEX_H];
}

export const DEFAULT_BODY = computeBody(DEFAULT_SHAPE);

const canvasPoint = (p: [number, number, number]) => sideToCanvas(p[0], p[1]);

/** 沿著背部到頭頂的那條線(畫布像素),預設毛色用它來畫深色的背。 */
export function backLine(): [number, number][] {
  const b = DEFAULT_BODY;
  return [sideToCanvas(...b.tail), ...b.rings.map((g) => canvasPoint(ringPoint(g, 0))), sideToCanvas(...b.top)];
}

/** 著色畫布上的海豹側面輪廓(像素座標的多邊形)。 */
export function templateOutline(): [number, number][] {
  const b = DEFAULT_BODY;
  const front = b.rings.map((g) => canvasPoint(ringPoint(g, FRONT_SEGMENT))).reverse();
  return [...backLine(), ...front];
}
