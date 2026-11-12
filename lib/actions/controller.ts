import { easeInOut } from "../math";
import type { SealBase } from "../seal/rig";
import { DEFAULT_SHAPE, ShapeParams } from "../seal/shape";
import { SealBrain } from "./brain";
import { ACTIONS } from "./index";
import { blendPose, copyPose, resetPose, restPose, SealPose } from "./pose";
import type { ActionContext, ActionDef } from "./types";

type Params = Record<string, number>;
/** 疊加層:在動作之上再修改姿勢(呼吸、眨眼…),不論正在做什麼動作都會套用。 */
export type Overlay = (pose: SealPose, time: number, dt: number) => void;

interface Running {
  def: ActionDef<Params>;
  time: number;
  duration: number;
  ctx: ActionContext<Params>;
}

/** 動作狀態機:播放動作、在動作之間平滑混合、動作結束時交給 brain 決定下一步。 */
export class SealController {
  /** 這一幀最終的姿勢 */
  readonly pose = restPose();
  /** 海豹在浮冰上的位置與朝向 */
  readonly base: SealBase = { x: 0, z: 0, yaw: 0 };
  /** true = 自主行為(自然跳動);false = 只待機 */
  auto = false;
  onEvent?: (event: string, value: number) => void;
  readonly overlays: Overlay[] = [breathing, makeBlink()];

  private readonly brain = new SealBrain();
  private readonly target = restPose();
  private readonly from = restPose();
  private running!: Running;
  private blend = 1;
  private blendDur = 0;
  private queued: [string, Params] | null = null;
  private clock = 0;
  private shape: ShapeParams = DEFAULT_SHAPE;

  constructor() {
    this.start("idle", {});
  }

  get current() {
    return this.running.def.name;
  }

  /** 切換自主行為,並設定事件(例如落地)的接收者。 */
  configure(auto: boolean, onEvent?: (event: string, value: number) => void) {
    this.auto = auto;
    if (onEvent) this.onEvent = onEvent;
  }

  /** 播放動作。若目前的動作不能被打斷,會排到它結束之後。 */
  play(name: string, params: Params = {}) {
    if (!ACTIONS[name]) return;
    if (this.running.def.interruptible) this.start(name, params);
    else this.queued = [name, params];
  }

  /** 使用者要求跳一下:由 brain 規劃一個不會跳出浮冰的跳躍。 */
  hop() {
    this.play("hop", this.brain.planHop(this.base));
  }

  /** 回到浮冰中央並重新開始。 */
  reset(name = "idle", params: Params = {}) {
    this.base.x = this.base.z = this.base.yaw = 0;
    this.queued = null;
    this.start(name, params);
    this.blend = 1;
  }

  update(dt: number, shape: ShapeParams) {
    this.shape = shape;
    this.clock += dt;
    let run = this.running;
    run.time += dt;

    if (run.time >= run.duration) {
      // 動作結束:把位移烘焙進位置,再決定下一個動作
      this.evaluate(run, run.duration);
      const yaw = this.base.yaw + this.target.turn;
      this.base.x += Math.cos(yaw) * this.target.advance;
      this.base.z -= Math.sin(yaw) * this.target.advance;
      this.base.yaw = yaw;
      this.pose.advance = this.pose.turn = 0;

      const next = this.queued ?? (this.auto ? this.brain.next(run.def.name, this.base) : (["idle"] as const));
      this.queued = null;
      this.start(next[0], next[1] ?? {});
      run = this.running;
    }

    this.evaluate(run, run.time);
    if (this.blend < 1) {
      this.blend = Math.min(1, this.blend + dt / this.blendDur);
      blendPose(this.pose, this.from, this.target, easeInOut(this.blend));
    } else {
      copyPose(this.pose, this.target);
    }
    for (const overlay of this.overlays) overlay(this.pose, this.clock, dt);
  }

  private evaluate(run: Running, time: number) {
    resetPose(this.target);
    const u = Number.isFinite(run.duration) ? Math.min(1, time / run.duration) : 0;
    run.def.update(this.target, time, u, run.ctx);
  }

  private start(name: string, params: Params) {
    const def = ACTIONS[name] as ActionDef<Params>;
    const fired = new Set<string>();
    const getShape = () => this.shape;
    this.running = {
      def,
      time: 0,
      duration: typeof def.duration === "function" ? def.duration(params) : def.duration,
      ctx: {
        params,
        seed: Math.random(),
        get shape() {
          return getShape();
        },
        emit: (event, value = 1) => this.onEvent?.(event, value),
        once: (key) => !fired.has(key) && !!fired.add(key),
      },
    };
    copyPose(this.from, this.pose);
    this.blendDur = def.blendIn ?? 0.2;
    this.blend = this.blendDur > 0 ? 0 : 1;
  }
}

const breathing: Overlay = (pose, time) => {
  pose.squash *= 1 + 0.018 * Math.sin(time * 2.3);
};

function makeBlink(): Overlay {
  let next = 2;
  return (pose, time) => {
    if (time > next + 0.14) next = time + 1.5 + Math.random() * 3.5;
    if (time > next) pose.blink = Math.max(pose.blink, Math.sin(((time - next) / 0.14) * Math.PI));
  };
}
