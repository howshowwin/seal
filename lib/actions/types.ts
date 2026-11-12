import type { ShapeParams } from "../seal/shape";
import type { SealPose } from "./pose";

export interface ActionContext<P = Record<string, number>> {
  /** 啟動動作時傳入的參數 */
  params: P;
  shape: ShapeParams;
  /** 每次啟動動作時的隨機數,讓同一個動作每次略有不同 */
  seed: number;
  /** 發出事件(例如落地),場景可以據此反應 */
  emit(event: string, value?: number): void;
  /** 同一次動作中,同一個 key 只會回傳一次 true */
  once(key: string): boolean;
}

/**
 * 一個動作 = 「給定時間,寫出一個姿勢」的函式。
 * 新增動作:寫一個 ActionDef,加進 lib/actions/index.ts 的 ACTIONS 即可。
 */
export interface ActionDef<P = Record<string, number>> {
  name: string;
  /** 顯示在按鈕上的名稱;有 label 的動作會出現在遊玩介面 */
  label?: string;
  /** 秒數;Infinity 代表持續到被其他動作打斷 */
  duration: number | ((params: P) => number);
  /** 從上一個姿勢混合進來的秒數 */
  blendIn?: number;
  /** 是否可以被新的動作中途打斷 */
  interruptible?: boolean;
  /**
   * pose 進來時是靜止姿勢,把想改的通道寫進去。
   * t = 已經過的秒數,u = 0→1 的進度(duration 為 Infinity 時恆為 0)。
   */
  update(pose: SealPose, t: number, u: number, ctx: ActionContext<P>): void;
}
