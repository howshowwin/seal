import { easeInOut, easeOutCubic, lerp, smoothstep } from "../math";
import type { ActionDef } from "./types";

export interface HopParams {
  /** 起跳前轉向的角度(弧度) */
  turn?: number;
  /** 往前跳的距離 */
  distance?: number;
  /** 跳的高度 */
  height?: number;
}

const ANTICIPATE = 0.3;
const LAND = 0.72;

/** 跳一下:蓄力壓扁 → 彈起拉長、身體拱起 → 落地回彈。 */
export const hop: ActionDef<HopParams> = {
  name: "hop",
  label: "跳一下",
  duration: (p) => 0.85 + (p.height ?? 0.4) * 0.35,
  blendIn: 0.12,
  update(pose, _t, u, ctx) {
    const { turn = 0, distance = 0.3, height = 0.4 } = ctx.params;

    if (u < ANTICIPATE) {
      const a = u / ANTICIPATE;
      pose.squash = lerp(1, 0.76, easeOutCubic(a));
      pose.turn = turn * easeInOut(a * 1.2);
      pose.headPitch = -0.12 * a;
      pose.bendTail = -0.05 * a;
      pose.flipperL = pose.flipperR = -0.15 * a;
      return;
    }

    pose.turn = turn;

    if (u < LAND) {
      const v = (u - ANTICIPATE) / (LAND - ANTICIPATE);
      const arc = Math.sin(Math.PI * v);
      pose.rootY = height * 4 * v * (1 - v);
      pose.advance = distance * v;
      pose.squash = v < 0.2 ? lerp(0.76, 1.18, easeOutCubic(v / 0.2)) : lerp(1.18, 1.05, (v - 0.2) / 0.8);
      pose.rootPitch = 0.22 * Math.cos(Math.PI * v);
      pose.bendFront = 0.3 * arc;
      pose.bendTail = 0.55 * arc;
      pose.headPitch = 0.1 * arc;
      pose.flipperL = pose.flipperR = 1.0 * arc;
      pose.tailFan = 0.35 * arc;
      pose.tailFlap = 0.3 * arc;
      return;
    }

    // 落地:阻尼彈簧式的回彈
    const w = (u - LAND) / (1 - LAND);
    if (ctx.once("land")) ctx.emit("land", 0.6 + height);
    const hit = smoothstep(0, 0.1, w);
    const spring = -0.27 * Math.exp(-4.5 * w) * Math.cos(9 * w);
    pose.advance = distance;
    pose.squash = lerp(1.05, 1 + spring, hit);
    pose.headPitch = -0.14 * Math.exp(-5 * w) * hit;
    pose.bendTail = 0.2 * Math.exp(-6 * w);
    pose.flipperL = pose.flipperR = 0.4 * Math.exp(-6 * w);
  },
};
