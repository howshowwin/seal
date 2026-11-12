import type { ActionDef } from "./types";

/** 拍拍手:抬起上半身,兩片前鰭快速拍動。示範如何新增一個動作。 */
export const clap: ActionDef = {
  name: "clap",
  label: "拍拍手",
  duration: 1.6,
  blendIn: 0.2,
  interruptible: true,
  update(pose, t, u) {
    const env = Math.pow(Math.sin(Math.PI * u), 0.5);
    const beat = Math.sin(t * 16);
    pose.bendFront = 0.38 * env;
    pose.headPitch = 0.12 * env;
    pose.bendTail = 0.25 * env;
    pose.flipperL = pose.flipperR = (0.5 + 0.45 * beat) * env;
    pose.flipperSweep = 0.5 * env;
    pose.squash = 1 + 0.035 * beat * env;
    pose.headRoll = 0.1 * Math.sin(t * 8) * env;
    pose.tailFlap = 0.4 * Math.max(0, beat) * env;
  },
};
