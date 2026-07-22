"use client";
import React, { useMemo, useState } from "react";
import { useGame, POWER_COST, type PowerId } from "../lib/store";
import { getLevel } from "../lib/levels";
import { Modal, Toggle } from "./ui";

const CONFETTI_COLORS = ["#ff6b6b", "#ffd54a", "#57b368", "#4b8fe8", "#c065c0", "#ff9f43", "#ffffff"];

export function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 80 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        dur: 1.6 + Math.random() * 1.6,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        rot: Math.random() * 360,
        size: 6 + Math.random() * 7,
      })),
    [],
  );
  return (
    <div className="confetti-layer">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 1.4,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.dur}s`,
            transform: `rotate(${p.rot}deg)`,
          }}
        />
      ))}
    </div>
  );
}

export function WinModal() {
  const level = useGame((s) => s.level);
  const moves = useGame((s) => s.moves);
  const stars = useGame((s) => s.earnedStars);
  const wonCoins = useGame((s) => s.wonCoins);
  const nextLevel = useGame((s) => s.nextLevel);
  const replay = useGame((s) => s.replay);
  const goMap = useGame((s) => s.goMap);
  if (!level) return null;
  const isLast = !getLevel(level.id + 1);
  return (
    <Modal>
      <div style={{ fontSize: 40 }}>{stars >= 3 ? "🎉" : "✨"}</div>
      <p style={{ fontWeight: 800, fontSize: 15, margin: 0 }}>Level {level.id}</p>
      <h2>Completed!</h2>
      <div className="big-stars">
        {[0, 1, 2].map((i) => (
          <span key={i} className={`s ${i < stars ? "on" : ""} ${i === 1 ? "mid" : ""}`}>
            ★
          </span>
        ))}
      </div>
      <div className="coin-reward">
        <span className="coin-ico">🪙</span> +{wonCoins}
      </div>
      <div className="stat-row">
        <div className="stat">
          <span className="v">{moves}</span>
          <span className="k">Moves</span>
        </div>
        <div className="stat">
          <span className="v">{level.par}</span>
          <span className="k">Par</span>
        </div>
      </div>
      <div className="modal-actions">
        <button className="btn ghost" onClick={goMap} aria-label="Levels">
          ☰
        </button>
        <button className="btn ghost" onClick={replay} aria-label="Replay">
          ↻
        </button>
        <button className="btn primary" onClick={nextLevel} style={{ flex: 1 }}>
          {isLast ? "Finish 🏆" : "Next ▶"}
        </button>
      </div>
    </Modal>
  );
}

export function LoseModal({ onShop }: { onShop: () => void }) {
  const reason = useGame((s) => s.lostReason);
  const replay = useGame((s) => s.replay);
  const goMap = useGame((s) => s.goMap);
  return (
    <Modal>
      <div style={{ fontSize: 40 }}>{reason === "time" ? "⏰" : "🧩"}</div>
      <h2>{reason === "time" ? "Time's up!" : "No moves left"}</h2>
      <p>
        {reason === "time"
          ? "Almost tidy — give it another go."
          : "That shelf got stuck. A booster can help you out."}
      </p>
      <div className="modal-actions" style={{ flexDirection: "column" }}>
        <button className="btn" onClick={onShop}>
          🛒 Get boosters
        </button>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn ghost" onClick={goMap} style={{ flex: 1 }}>
            ☰ Levels
          </button>
          <button className="btn primary" onClick={replay} style={{ flex: 1 }}>
            ↻ Retry
          </button>
        </div>
      </div>
    </Modal>
  );
}

const SHOP_ITEMS: { id: PowerId; icon: string; label: string; desc: string }[] = [
  { id: "hammer", icon: "🔨", label: "Smash", desc: "Remove any single item" },
  { id: "hint", icon: "💡", label: "Hint", desc: "Show a helpful move" },
  { id: "shuffle", icon: "🔀", label: "Shuffle", desc: "Rearrange the shelves" },
  { id: "freeze", icon: "❄️", label: "Freeze", desc: "Pause the timer 10s" },
  { id: "double", icon: "✨", label: "Double", desc: "×2 points for 15s" },
];

export function ShopModal({ onClose }: { onClose: () => void }) {
  const coins = useGame((s) => s.progress.coins);
  const bought = useGame((s) => s.progress.bought);
  const buyBooster = useGame((s) => s.buyBooster);
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal shop" onClick={(e) => e.stopPropagation()}>
        <h2>Booster Shop</h2>
        <p className="coin-balance">
          <span className="coin-ico">🪙</span> {coins} coins
        </p>
        <div className="shop-list">
          {SHOP_ITEMS.map((it) => {
            const cost = POWER_COST[it.id];
            const owned = bought?.[it.id] ?? 0;
            const canAfford = coins >= cost;
            return (
              <div className="shop-row" key={it.id}>
                <span className="shop-ico">{it.icon}</span>
                <span className="shop-info">
                  <b>
                    {it.label}
                    {owned > 0 ? ` +${owned}` : ""}
                  </b>
                  <small>{it.desc}</small>
                </span>
                <button
                  className={`btn buy ${canAfford ? "" : "poor"}`}
                  onClick={() => buyBooster(it.id)}
                  disabled={!canAfford}
                >
                  🪙 {cost}
                </button>
              </div>
            );
          })}
        </div>
        <p className="shop-note">Boosters you buy are added on top of the free ones each level.</p>
        <button className="btn primary" onClick={onClose} style={{ width: "100%" }}>
          Done
        </button>
      </div>
    </div>
  );
}

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const progress = useGame((s) => s.progress);
  const setSound = useGame((s) => s.setSound);
  const setRelax = useGame((s) => s.setRelax);
  const [confirmReset, setConfirmReset] = useState(false);

  function resetAll() {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("tidy-shelf:v1");
      window.location.reload();
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Settings</h2>
        <div className="settings-list">
          <div className="setting">
            <span>🔊 Sound</span>
            <Toggle on={progress.sound} onClick={() => setSound(!progress.sound)} />
          </div>
          <div className="setting">
            <span>🧘 Relax mode (no timer)</span>
            <Toggle on={progress.relax} onClick={() => setRelax(!progress.relax)} />
          </div>
        </div>
        <p style={{ fontSize: 13, textAlign: "left", lineHeight: 1.5 }}>
          <b>How to play:</b> Move a product onto an empty spot. Line up three of the same kind
          on one shelf and they clear, revealing what&apos;s behind. Tidy the whole cabinet!
        </p>
        <div className="modal-actions" style={{ flexDirection: "column" }}>
          {!confirmReset ? (
            <button className="btn ghost" onClick={() => setConfirmReset(true)}>
              Reset progress
            </button>
          ) : (
            <button className="btn" style={{ background: "var(--bad)", color: "#fff" }} onClick={resetAll}>
              Tap again to erase everything
            </button>
          )}
          <button className="btn primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export function Tutorial({ onClose }: { onClose: () => void }) {
  return (
    <div className="tut">
      <div className="bubble">
        <div className="hand">👆</div>
        Tap a product, then tap an <b>empty spot</b> to move it. Line up <b>three of a kind</b> on
        one shelf to clear them!
        <div>
          <button className="btn primary" onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
