import { clamp, rand, wrapAngle } from "../math";
import type { SealBase } from "../seal/rig";

/** 海豹重心可以活動的半徑(浮冰比這個大一些)。 */
const SAFE_RADIUS = 0.6;

export type Decision = [name: string, params?: Record<string, number>];

/**
 * 自主行為:決定「接下來做什麼」。
 * 目前是:發呆一下 → 連跳 1~3 下 → 再發呆。快跳出浮冰時會轉回中心。
 */
export class SealBrain {
  private hopsLeft = 0;

  next(finished: string, base: SealBase): Decision {
    if (finished === "idle") this.hopsLeft = 1 + Math.floor(Math.random() * 3);
    if (this.hopsLeft > 0) {
      this.hopsLeft--;
      return ["hop", this.planHop(base)];
    }
    return ["idle", { duration: rand(1.2, 3) }];
  }

  planHop(base: SealBase) {
    let turn = rand(-0.8, 0.8);
    let distance = rand(0.25, 0.5);
    const height = rand(0.3, 0.55);
    const yaw = base.yaw + turn;
    const nx = base.x + Math.cos(yaw) * distance;
    const nz = base.z - Math.sin(yaw) * distance;
    if (Math.hypot(nx, nz) > SAFE_RADIUS) {
      // 朝浮冰中心轉回去
      const toCenter = Math.atan2(base.z, -base.x);
      turn = clamp(wrapAngle(toCenter - base.yaw), -1.4, 1.4);
      distance = Math.abs(wrapAngle(toCenter - base.yaw)) > 1.4 ? 0.05 : 0.35;
    }
    return { turn, distance, height };
  }
}
