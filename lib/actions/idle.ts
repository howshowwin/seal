import type { ActionDef } from "./types";

/** 待機:左右張望、尾巴輕拍、偶爾抬一下鰭。 */
export const idle: ActionDef<{ duration?: number }> = {
  name: "idle",
  duration: (p) => p.duration ?? Infinity,
  blendIn: 0.3,
  interruptible: true,
  update(pose, t, _u, ctx) {
    const o = ctx.seed * 20;
    const look = Math.sin(t * 0.8 + o) * 0.6 + Math.sin(t * 1.9 + o * 2) * 0.25;
    pose.headYaw = look * 0.4;
    pose.yawFront = look * 0.12;
    pose.headPitch = 0.06 + Math.sin(t * 1.3 + o) * 0.06;
    pose.headRoll = Math.sin(t * 0.6 + o) * 0.08;
    pose.bendFront = 0.05;
    pose.tailFlap = Math.max(0, Math.sin(t * 2.4 + o)) * 0.35;
    pose.bendTail = 0.08 + Math.max(0, Math.sin(t * 2.4 + o)) * 0.08;
    pose.tailFan = Math.sin(t * 1.2) * 0.08;
    pose.flipperR = Math.pow(Math.max(0, Math.sin(t * 1.1 + o)), 6) * 0.5;
    pose.flipperL = Math.pow(Math.max(0, Math.sin(t * 0.9 + o + 2)), 6) * 0.5;
  },
};
