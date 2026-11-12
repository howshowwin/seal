"use client";

import dynamic from "next/dynamic";
import { useGame } from "@/store/game";
import { PaintPanel } from "./paint/PaintPanel";
import { PlayPanel } from "./ui/PlayPanel";
import { ShapePanel } from "./ui/ShapePanel";

// three.js 只能在瀏覽器執行,所以不做伺服器端渲染
const Scene = dynamic(() => import("./scene/Scene"), { ssr: false });

export function Game() {
  const phase = useGame((s) => s.phase);

  return (
    <main className="sky fixed inset-0 flex flex-col md:flex-row">
      {phase === "paint" && (
        <section className="order-2 flex max-h-[62%] items-start justify-center overflow-y-auto p-3 md:order-1 md:max-h-none md:w-[54%] md:items-center md:p-6">
          <PaintPanel />
        </section>
      )}
      <section className="relative order-1 min-h-0 flex-1 md:order-2">
        <Scene />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-3 md:p-6">
          {phase === "shape" && <ShapePanel />}
          {phase === "play" && <PlayPanel />}
        </div>
        {phase === "play" && (
          <p className="pointer-events-none absolute inset-x-0 top-4 text-center text-sm font-bold text-sky-900/60">
            點一下海豹,牠會跳一下
          </p>
        )}
      </section>
    </main>
  );
}
