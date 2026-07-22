"use client";
import React from "react";

export function StarsInline({ n, size = 13 }: { n: number; size?: number }) {
  return (
    <span className="stars-inline" style={{ fontSize: size }}>
      {[0, 1, 2].map((i) => (
        <span key={i} className={i < n ? "" : "off"}>
          ★
        </span>
      ))}
    </span>
  );
}

export function fmtTime(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${m}:${ss.toString().padStart(2, "0")}`;
}

export function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button className={`toggle ${on ? "on" : ""}`} onClick={onClick} aria-pressed={on}>
      <span className="knob" />
    </button>
  );
}

export function Modal({ children }: { children: React.ReactNode }) {
  return (
    <div className="overlay">
      <div className="modal">{children}</div>
    </div>
  );
}

export const DIFF_LABEL: Record<string, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
  expert: "Expert",
};
