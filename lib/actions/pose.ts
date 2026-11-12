/**
 * 姿勢 = 一組數值通道。所有動作都只是「在某個時間點輸出一個姿勢」,
 * 所以新增動作不需要改動模型;要新增可動部位時,在這裡加一個通道,
 * 再到 SealRig.applyPose 裡使用它即可。
 */
export const POSE_KEYS = [
  // 整體
  "rootX",
  "rootY",
  "rootZ",
  "rootPitch",
  "rootYaw",
  "rootRoll",
  "squash", // 1 = 正常;<1 壓扁、>1 拉長(體積守恆)
  // 位移:動作結束時會被烘焙進海豹的位置與朝向
  "advance",
  "turn",
  // 脊椎
  "bendFront", // 前半身上抬
  "bendTail", // 尾巴上翹
  "yawFront", // 前半身左右彎
  "yawTail",
  // 頭
  "headPitch",
  "headYaw",
  "headRoll",
  // 鰭
  "flipperL",
  "flipperR",
  "flipperSweep",
  "tailFan",
  "tailFlap",
  // 臉
  "blink",
] as const;

export type PoseKey = (typeof POSE_KEYS)[number];
export type SealPose = Record<PoseKey, number>;

export function restPose(): SealPose {
  const p = {} as SealPose;
  for (const k of POSE_KEYS) p[k] = 0;
  p.squash = 1;
  return p;
}

export function resetPose(p: SealPose) {
  for (const k of POSE_KEYS) p[k] = 0;
  p.squash = 1;
}

export function copyPose(out: SealPose, src: SealPose) {
  for (const k of POSE_KEYS) out[k] = src[k];
}

export function blendPose(out: SealPose, a: SealPose, b: SealPose, k: number) {
  for (const key of POSE_KEYS) out[key] = a[key] + (b[key] - a[key]) * k;
}
