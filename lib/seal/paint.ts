import * as THREE from "three";
import { backLine, TEX_H, TEX_W } from "./profile";

export const BASE_COLOR = "#f7f2ea";
const BACK_COLOR = "#a9a8b6";

/** 預設毛色:奶油白的肚子與臉,沿著背部到頭頂是一片柔和的灰。 */
function paintDefault(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = BASE_COLOR;
  ctx.fillRect(0, 0, TEX_W, TEX_H);
  const line = backLine();
  ctx.save();
  ctx.filter = "blur(34px)";
  ctx.strokeStyle = BACK_COLOR;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.lineWidth = 300;
  ctx.beginPath();
  line.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
  ctx.restore();
}

let canvas: HTMLCanvasElement | null = null;
let texture: THREE.CanvasTexture | null = null;
const undoStack: ImageData[] = [];

/** 著色畫布是全域唯一的一張,同時也是海豹的貼圖來源。 */
export function getPaintCanvas(): HTMLCanvasElement {
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.width = TEX_W;
    canvas.height = TEX_H;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    paintDefault(ctx);
  }
  return canvas;
}

const ctx2d = () => getPaintCanvas().getContext("2d", { willReadFrequently: true })!;

export function getPaintTexture(): THREE.CanvasTexture {
  if (!texture) {
    texture = new THREE.CanvasTexture(getPaintCanvas());
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
  }
  return texture;
}

const touch = () => {
  if (texture) texture.needsUpdate = true;
};

export function pushUndo() {
  undoStack.push(ctx2d().getImageData(0, 0, TEX_W, TEX_H));
  if (undoStack.length > 20) undoStack.shift();
}

export function undo() {
  const img = undoStack.pop();
  if (img) {
    ctx2d().putImageData(img, 0, 0);
    touch();
  }
}

export function clearPaint() {
  pushUndo();
  paintDefault(ctx2d());
  touch();
}

export function drawStroke(x0: number, y0: number, x1: number, y1: number, color: string, size: number) {
  const ctx = ctx2d();
  ctx.strokeStyle = color;
  ctx.lineWidth = size;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1 + 0.01, y1 + 0.01);
  ctx.stroke();
  touch();
}

export function drawSpots(color: string, count = 14) {
  pushUndo();
  const ctx = ctx2d();
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const x = TEX_W * (0.1 + Math.random() * 0.8);
    const y = TEX_H * (0.12 + Math.random() * 0.76);
    const r = 10 + Math.random() * 22;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * (0.7 + Math.random() * 0.5), Math.random() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  touch();
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** 油漆桶:從 (x, y) 開始填滿相近顏色的區域。 */
export function floodFill(x: number, y: number, color: string, tolerance = 60) {
  x = Math.floor(x);
  y = Math.floor(y);
  if (x < 0 || y < 0 || x >= TEX_W || y >= TEX_H) return;
  pushUndo();
  const ctx = ctx2d();
  const img = ctx.getImageData(0, 0, TEX_W, TEX_H);
  const d = img.data;
  const [r, g, b] = hexToRgb(color);
  const start = (y * TEX_W + x) * 4;
  const sr = d[start];
  const sg = d[start + 1];
  const sb = d[start + 2];
  const seen = new Uint8Array(TEX_W * TEX_H);
  const stack = [y * TEX_W + x];
  while (stack.length) {
    const p = stack.pop()!;
    if (seen[p]) continue;
    seen[p] = 1;
    const i = p * 4;
    const same = Math.abs(d[i] - sr) + Math.abs(d[i + 1] - sg) + Math.abs(d[i + 2] - sb) <= tolerance;
    // 邊界像素也塗上顏色,避免反鋸齒留下一圈舊顏色
    d[i] = r;
    d[i + 1] = g;
    d[i + 2] = b;
    if (!same) continue;
    const px = p % TEX_W;
    if (px > 0) stack.push(p - 1);
    if (px < TEX_W - 1) stack.push(p + 1);
    if (p >= TEX_W) stack.push(p - TEX_W);
    if (p < TEX_W * (TEX_H - 1)) stack.push(p + TEX_W);
  }
  ctx.putImageData(img, 0, 0);
  touch();
}
