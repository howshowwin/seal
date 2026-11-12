"use client";

import { SHAPE_LABEL, SHAPE_RANGE, ShapeParams } from "@/lib/seal/shape";
import { useGame } from "@/store/game";
import { Button } from "./Button";

const DOT: Record<keyof ShapeParams, string> = {
  length: "#ff8fa3",
  girth: "#ffb347",
  head: "#7ac8f5",
  flipper: "#8fd6a5",
  headLift: "#b79cf0",
};

/** 調整體型:可以直接拖海豹身上的圓點,也可以用這裡的滑桿。 */
export function ShapePanel() {
  const shape = useGame((s) => s.shape);
  const setShape = useGame((s) => s.setShape);
  const resetShape = useGame((s) => s.resetShape);
  const setPhase = useGame((s) => s.setPhase);

  return (
    <div className="card pointer-events-auto flex w-full max-w-xl flex-col gap-3 p-4 sm:p-5">
      <div>
        <h1 className="text-xl font-extrabold text-sky-900">調整體型</h1>
        <p className="text-sm text-sky-800/70">拖動海豹身上的彩色圓點,或用下面的滑桿。</p>
      </div>
      <div className="grid grid-cols-1 gap-x-5 gap-y-2 sm:grid-cols-2">
        {(Object.keys(SHAPE_LABEL) as (keyof ShapeParams)[]).map((key) => (
          <label key={key} className="flex items-center gap-2 text-sm font-bold text-sky-900">
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: DOT[key] }} />
            <span className="w-16 shrink-0">{SHAPE_LABEL[key]}</span>
            <input
              type="range"
              min={SHAPE_RANGE[key][0]}
              max={SHAPE_RANGE[key][1]}
              step={0.01}
              value={shape[key]}
              onChange={(e) => setShape({ [key]: Number(e.target.value) })}
              className="w-full accent-sky-500"
            />
          </label>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => setPhase("paint")}>回去著色</Button>
        <Button onClick={resetShape}>恢復預設</Button>
        <div className="grow" />
        <Button primary onClick={() => setPhase("play")}>
          生成海豹!
        </Button>
      </div>
    </div>
  );
}
