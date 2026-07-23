"use client";
import React, { useState } from "react";
import { useGame, type PowerId } from "../lib/store";
import { itemsRemaining } from "../lib/engine";
import { worldMeta } from "../lib/items";
import { fmtTime } from "./ui";
import Board from "./Board";
import { WinModal, LoseModal, SettingsModal, Tutorial, MechTutorial, ShopModal, Confetti } from "./Modals";

const POWERS: { id: PowerId; icon: string; label: string }[] = [
  { id: "hammer", icon: "🔨", label: "Smash" },
  { id: "hint", icon: "💡", label: "Hint" },
  { id: "shuffle", icon: "🔀", label: "Shuffle" },
  { id: "freeze", icon: "❄️", label: "Freeze" },
  { id: "double", icon: "✨", label: "×2" },
];

export default function GameScreen() {
  const level = useGame((s) => s.level);
  const board = useGame((s) => s.board);
  const totalItems = useGame((s) => s.totalItems);
  const status = useGame((s) => s.status);
  const coins = useGame((s) => s.progress.coins);
  const relax = useGame((s) => s.progress.relax);
  const stars1 = useGame((s) => s.progress.stars[1] ?? 0);
  const seenMech = useGame((s) => s.progress.seenMech);
  const seeMech = useGame((s) => s.seeMech);
  const timeLeftMs = useGame((s) => s.timeLeftMs);
  const combo = useGame((s) => s.combo);
  const freezeMs = useGame((s) => s.freezeMs);
  const doubleMs = useGame((s) => s.doubleMs);
  const powerups = useGame((s) => s.powerups);
  const hammerArmed = useGame((s) => s.hammerArmed);
  const historyLen = useGame((s) => s.history.length);
  const floats = useGame((s) => s.floats);

  const goMap = useGame((s) => s.goMap);
  const undo = useGame((s) => s.undo);
  const replay = useGame((s) => s.replay);
  const usePower = useGame((s) => s.usePower);

  const [settings, setSettings] = useState(false);
  const [shop, setShop] = useState(false);
  const [tutClosed, setTutClosed] = useState(false);

  if (!level) return null;
  const wm = worldMeta(level.world);
  const sorted = totalItems - itemsRemaining(board);
  const totalMs = level.timeLimit * 1000;
  const pct = totalMs > 0 ? Math.max(0, (timeLeftMs / totalMs) * 100) : 0;
  const low = !relax && timeLeftMs <= 15000;
  const showTut = level.id === 1 && stars1 === 0 && !tutClosed && status === "playing";
  const mechs: string[] = [];
  if (level.crates?.length) mechs.push("crate");
  if (level.locked?.length) mechs.push("lock");
  if (level.gifts?.length) mechs.push("gift");
  if (level.frozen?.length) mechs.push("frozen");
  if (level.chained?.length) mechs.push("chained");
  const pendingMech = status === "playing" && !showTut ? mechs.find((m) => !seenMech?.[m]) : undefined;

  return (
    <div
      className="screen game"
      style={{ background: `linear-gradient(180deg, ${wm.bg[0]}, ${wm.bg[1]})` }}
    >
      <div className="stage">
        <div className="topbar gamebar">
          <span className="pill progress">
            {sorted}/{totalItems}
          </span>
          <span className="level-pill">Lv. {level.id}</span>
          <div className="group">
            <button className="pill coins" onClick={() => setShop(true)}>
              <span className="ico">⭐</span>
              {coins}
            </button>
            <button className="icon-btn" onClick={() => setSettings(true)} aria-label="Settings">
              ⏸
            </button>
          </div>
        </div>

        <div className="combo-slot">
          {combo >= 2 ? (
            <span className="combo-pill">{combo} combo!</span>
          ) : doubleMs > 0 ? (
            <span className="combo-pill dbl">Double ×2!</span>
          ) : null}
        </div>

        {!relax && (
          <div className="timebar">
            <div
              className={`fill ${low ? "low" : ""} ${freezeMs > 0 ? "frozen" : ""}`}
              style={{ width: `${pct}%` }}
            />
            <span className="tlabel">{freezeMs > 0 ? "❄️ " : ""}{fmtTime(timeLeftMs)}</span>
          </div>
        )}

        <Board />

        {hammerArmed && (
          <div className="hammer-banner">
            🔨 Tap an item to smash it
            <button onClick={() => usePower("hammer")}>Cancel</button>
          </div>
        )}

        <div className="util-row">
          <button className="icon-btn" onClick={goMap} aria-label="Levels">
            ☰
          </button>
          <button
            className="icon-btn"
            onClick={undo}
            disabled={historyLen === 0}
            style={{ opacity: historyLen === 0 ? 0.45 : 1 }}
            aria-label="Undo"
          >
            ↶
          </button>
          <button className="icon-btn" onClick={replay} aria-label="Restart">
            ↻
          </button>
        </div>

        <div className="powerbar">
          {POWERS.map((p) => {
            const count = powerups[p.id];
            const active =
              (p.id === "freeze" && freezeMs > 0) ||
              (p.id === "double" && doubleMs > 0) ||
              (p.id === "hammer" && hammerArmed);
            return (
              <button
                key={p.id}
                className={`power ${active ? "active" : ""} ${count === 0 ? "spent" : ""}`}
                onClick={() => (count === 0 ? setShop(true) : usePower(p.id))}
                aria-label={p.label}
              >
                {p.icon}
                <span className="count">{count === 0 ? "+" : count}</span>
                <span className="plabel">{p.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="floats">
        {floats.map((f, i) => (
          <div
            key={f.id}
            className={`float ${f.kind}`}
            style={{
              transform: `translateX(${((f.id % 3) - 1) * 46}px)`,
              top: `${36 + (i % 2) * 8}%`,
            }}
          >
            {f.text}
          </div>
        ))}
      </div>

      {status === "won" && (
        <>
          <Confetti />
          <WinModal />
        </>
      )}
      {status === "lost" && <LoseModal onShop={() => setShop(true)} />}
      {settings && <SettingsModal onClose={() => setSettings(false)} />}
      {shop && <ShopModal onClose={() => setShop(false)} />}
      {showTut && <Tutorial onClose={() => setTutClosed(true)} />}
      {pendingMech && <MechTutorial mech={pendingMech} onClose={() => seeMech(pendingMech)} />}
    </div>
  );
}
