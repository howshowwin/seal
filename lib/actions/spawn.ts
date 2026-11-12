import { smoothstep } from "../math";
import type { ActionDef } from "./types";

const FALL = 0.38;
const HEIGHT = 3.4;

/** 登場:從天而降,落在浮冰上彈一下。 */
export const spawn: ActionDef = {
  name: "spawn",
  duration: 1.5,
  blendIn: 0,
  update(pose, _t, u, ctx) {
    if (u < FALL) {
      const a = u / FALL;
      pose.rootY = HEIGHT * (1 - a * a);
      pose.squash = 1.2;
      pose.flipperL = pose.flipperR = 1.1;
      pose.bendTail = 0.4;
      pose.tailFan = 0.3;
      pose.rootPitch = -0.15 * (1 - a);
      return;
    }
    const w = (u - FALL) / (1 - FALL);
    if (ctx.once("land")) ctx.emit("land", 1.8);
    const hit = smoothstep(0, 0.06, w);
    pose.squash = 1.2 + (1 - 0.4 * Math.exp(-4 * w) * Math.cos(11 * w) - 1.2) * hit;
    pose.flipperL = pose.flipperR = 1.1 * Math.exp(-5 * w);
    pose.bendTail = 0.4 * Math.exp(-5 * w);
    pose.headPitch = 0.2 * Math.sin(Math.PI * w) * Math.exp(-2 * w);
  },
};
