import { create } from "zustand";
import { clamp } from "@/lib/math";
import { DEFAULT_SHAPE, SHAPE_RANGE, ShapeParams } from "@/lib/seal/shape";

export type Phase = "paint" | "shape" | "play";

interface GameState {
  phase: Phase;
  shape: ShapeParams;
  /** 正在拖動體型控制點(此時暫停鏡頭旋轉) */
  dragging: boolean;
  /** 要求海豹做某個動作;n 每次遞增以便重複觸發 */
  command: { name: string; n: number } | null;
  setPhase(phase: Phase): void;
  setShape(patch: Partial<ShapeParams>): void;
  resetShape(): void;
  setDragging(dragging: boolean): void;
  doAction(name: string): void;
}

export const useGame = create<GameState>((set) => ({
  phase: "paint",
  shape: DEFAULT_SHAPE,
  dragging: false,
  command: null,
  setPhase: (phase) => set({ phase }),
  setShape: (patch) =>
    set((s) => {
      const shape = { ...s.shape };
      for (const key of Object.keys(patch) as (keyof ShapeParams)[]) {
        const [min, max] = SHAPE_RANGE[key];
        shape[key] = clamp(patch[key]!, min, max);
      }
      return { shape };
    }),
  resetShape: () => set({ shape: DEFAULT_SHAPE }),
  setDragging: (dragging) => set({ dragging }),
  doAction: (name) => set((s) => ({ command: { name, n: (s.command?.n ?? 0) + 1 } })),
}));
