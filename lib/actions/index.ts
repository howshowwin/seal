import { clap } from "./clap";
import { hop } from "./hop";
import { idle } from "./idle";
import { spawn } from "./spawn";
import type { ActionDef } from "./types";

/**
 * 動作註冊表。之後要加吃魚、睡覺、滑行等動作:
 * 新增一個檔案、輸出 ActionDef,然後加進這裡。
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ACTIONS: Record<string, ActionDef<any>> = {
  idle,
  hop,
  spawn,
  clap,
};

/** 有 label 的動作會顯示成遊玩介面上的按鈕。 */
export const USER_ACTIONS = Object.values(ACTIONS).filter((a) => a.label);
