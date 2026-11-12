"use client";

import type { ButtonHTMLAttributes } from "react";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  primary?: boolean;
  active?: boolean;
}

export function Button({ primary, active, className = "", ...rest }: Props) {
  const tone = primary
    ? "bg-[#ff8fa3] text-white shadow-[0_4px_0_#e06a82] hover:bg-[#ff9db0]"
    : active
      ? "bg-sky-500 text-white shadow-[0_4px_0_#2f86b8]"
      : "bg-white text-sky-900 shadow-[0_4px_0_#c5dfee] hover:bg-sky-50";
  return (
    <button
      {...rest}
      className={`rounded-full px-4 py-2 text-sm font-bold transition-transform duration-100 active:translate-y-[3px] active:shadow-none ${tone} ${className}`}
    />
  );
}
