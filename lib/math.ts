export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
export const clamp01 = (v: number) => clamp(v, 0, 1);
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const smoothstep = (a: number, b: number, v: number) => {
  const k = clamp01((v - a) / (b - a));
  return k * k * (3 - 2 * k);
};
export const easeOutCubic = (k: number) => 1 - Math.pow(1 - clamp01(k), 3);
export const easeInOut = (k: number) => {
  const c = clamp01(k);
  return c * c * (3 - 2 * c);
};
export const rand = (a: number, b: number) => a + Math.random() * (b - a);
export const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
