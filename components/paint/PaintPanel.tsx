"use client";

import { PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { BASE_COLOR, clearPaint, drawSpots, drawStroke, floodFill, getPaintCanvas, pushUndo, undo } from "@/lib/seal/paint";
import { DEFAULT_BODY, FEATURES, featurePoint, sideToCanvas, templateOutline, TEX_H, TEX_W } from "@/lib/seal/profile";
import { useGame } from "@/store/game";
import { Button } from "../ui/Button";

const PALETTE = [
  BASE_COLOR,
  "#cfd6de",
  "#8e99a8",
  "#4f5665",
  "#ffb3c7",
  "#ff8c7a",
  "#ffd3a8",
  "#ffe58a",
  "#a8e6cf",
  "#9fd8f5",
  "#c9b6f2",
  "#c49a7a",
];
const SIZES = [14, 30, 60];
type Tool = "brush" | "fill";

/** 著色畫布:畫在海豹的側面輪廓上,畫的內容即時成為 3D 海豹的貼圖。 */
export function PaintPanel() {
  const holder = useRef<HTMLDivElement>(null);
  const last = useRef<[number, number] | null>(null);
  const [color, setColor] = useState("#9fd8f5");
  const [size, setSize] = useState(SIZES[1]);
  const [tool, setTool] = useState<Tool>("brush");
  const setPhase = useGame((s) => s.setPhase);

  // 把全域唯一的貼圖畫布直接掛進畫面
  useEffect(() => {
    const canvas = getPaintCanvas();
    canvas.className = "absolute inset-0 h-full w-full";
    holder.current?.prepend(canvas);
    return () => canvas.remove();
  }, []);

  const guide = useMemo(() => {
    const outline = templateOutline();
    const path = outline.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ") + " Z";
    const eye = featurePoint(DEFAULT_BODY, FEATURES.eye);
    const nose = featurePoint(DEFAULT_BODY, FEATURES.nose);
    return {
      path,
      eye: sideToCanvas(eye[0], eye[1]),
      nose: sideToCanvas(nose[0], nose[1]),
      labelY: TEX_H - 18,
    };
  }, []);

  const toCanvas = (e: PointerEvent): [number, number] => {
    const rect = holder.current!.getBoundingClientRect();
    return [((e.clientX - rect.left) / rect.width) * TEX_W, ((e.clientY - rect.top) / rect.height) * TEX_H];
  };

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    const [x, y] = toCanvas(e);
    if (tool === "fill") {
      floodFill(x, y, color);
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    pushUndo();
    last.current = [x, y];
    drawStroke(x, y, x, y, color, size);
  };

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!last.current) return;
    const [x, y] = toCanvas(e);
    drawStroke(last.current[0], last.current[1], x, y, color, size);
    last.current = [x, y];
  };

  const onUp = () => {
    last.current = null;
  };

  return (
    <div className="card flex w-full max-w-[30rem] flex-col gap-3 p-4 sm:p-5">
      <div>
        <h1 className="text-xl font-extrabold text-sky-900 sm:text-2xl">幫海豹寶寶著色</h1>
        <p className="text-sm text-sky-800/70">在輪廓裡面畫畫,旁邊的海豹會馬上換上新的花紋。</p>
      </div>

      <div
        ref={holder}
        className="relative w-full touch-none overflow-hidden rounded-2xl border-4 border-white shadow-inner"
        style={{ aspectRatio: `${TEX_W} / ${TEX_H}`, cursor: tool === "fill" ? "cell" : "crosshair" }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        <svg viewBox={`0 0 ${TEX_W} ${TEX_H}`} className="pointer-events-none absolute inset-0 h-full w-full">
          {/* 輪廓外面蓋一層半透明,提示可以畫的範圍 */}
          <path d={`M0 0H${TEX_W}V${TEX_H}H0Z ${guide.path}`} fill="#eaf6fc" fillOpacity={0.88} fillRule="evenodd" />
          <path d={guide.path} fill="none" stroke="#5b7f96" strokeWidth={4} strokeLinejoin="round" strokeDasharray="2 12" strokeLinecap="round" />
          <ellipse cx={guide.eye[0] - 8} cy={guide.eye[1]} rx={22} ry={36} fill="#17141c" />
          <circle cx={guide.eye[0] - 2} cy={guide.eye[1] - 13} r={8} fill="#fff" />
          <ellipse cx={guide.nose[0] - 5} cy={guide.nose[1]} rx={7} ry={12} fill="#2a2430" />
          <text x={40} y={guide.labelY} fontSize={26} fill="#5b7f96" fontWeight={700}>
            尾巴
          </text>
          <text x={TEX_W - 70} y={guide.labelY} fontSize={26} fill="#5b7f96" fontWeight={700}>
            頭
          </text>
        </svg>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {PALETTE.map((c) => (
          <button
            key={c}
            aria-label={`顏色 ${c}`}
            onClick={() => setColor(c)}
            className={`h-9 w-9 rounded-full border-2 transition-transform active:scale-90 ${
              color === c ? "scale-110 border-sky-600 ring-2 ring-sky-300" : "border-white"
            } shadow`}
            style={{ background: c }}
          />
        ))}
        <label className="relative h-9 w-9 cursor-pointer overflow-hidden rounded-full border-2 border-white shadow" title="自訂顏色">
          <span className="absolute inset-0 bg-[conic-gradient(#ff8c7a,#ffe58a,#a8e6cf,#9fd8f5,#c9b6f2,#ff8c7a)]" />
          <input
            type="color"
            aria-label="自訂顏色"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button active={tool === "brush"} onClick={() => setTool("brush")}>
          畫筆
        </Button>
        <Button active={tool === "fill"} onClick={() => setTool("fill")}>
          油漆桶
        </Button>
        <div className="mx-1 flex items-center gap-1.5">
          {SIZES.map((s) => (
            <button
              key={s}
              aria-label={`筆刷粗細 ${s}`}
              onClick={() => {
                setSize(s);
                setTool("brush");
              }}
              className={`flex h-10 w-10 items-center justify-center rounded-full bg-white shadow transition-transform active:scale-90 ${
                size === s && tool === "brush" ? "ring-2 ring-sky-400" : ""
              }`}
            >
              <span className="rounded-full" style={{ width: 6 + s / 3, height: 6 + s / 3, background: color === BASE_COLOR ? "#cfd6de" : color }} />
            </button>
          ))}
        </div>
        <Button onClick={() => drawSpots(color)}>隨機斑點</Button>
        <Button onClick={undo}>復原</Button>
        <Button onClick={clearPaint}>清空</Button>
        <div className="grow" />
        <Button primary onClick={() => setPhase("shape")}>
          下一步:調整體型
        </Button>
      </div>
    </div>
  );
}
