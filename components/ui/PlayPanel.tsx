"use client";

import { USER_ACTIONS } from "@/lib/actions";
import { useGame } from "@/store/game";
import { Button } from "./Button";

/** 遊玩階段:動作按鈕由動作註冊表自動產生。 */
export function PlayPanel() {
  const setPhase = useGame((s) => s.setPhase);
  const doAction = useGame((s) => s.doAction);

  return (
    <div className="card pointer-events-auto flex flex-wrap items-center justify-center gap-2 px-4 py-3">
      {USER_ACTIONS.map((a) => (
        <Button key={a.name} primary onClick={() => doAction(a.name)}>
          {a.label}
        </Button>
      ))}
      <span className="mx-1 hidden h-6 w-px bg-sky-200 sm:block" />
      <Button onClick={() => setPhase("paint")}>重新著色</Button>
      <Button onClick={() => setPhase("shape")}>調整體型</Button>
    </div>
  );
}
