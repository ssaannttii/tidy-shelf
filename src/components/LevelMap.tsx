"use client";
import React, { useState } from "react";
import { useGame } from "../lib/store";
import { LEVELS, TOTAL_LEVELS } from "../lib/levels";
import { WORLDS } from "../lib/items";
import { StarsInline } from "./ui";
import { SettingsModal } from "./Modals";

export default function LevelMap() {
  const progress = useGame((s) => s.progress);
  const startLevel = useGame((s) => s.startLevel);
  const goHome = useGame((s) => s.goHome);
  const [settings, setSettings] = useState(false);
  const totalStars = Object.values(progress.stars).reduce((a, b) => a + b, 0);

  return (
    <div className="screen" style={{ background: "linear-gradient(180deg,#f7ecd9,#eccfa6)" }}>
      <div className="stage">
        <div className="topbar">
          <div className="group">
            <button className="icon-btn" onClick={goHome} aria-label="Inicio">
              ⌂
            </button>
          </div>
          <div className="group">
            <span className="pill">
              <span className="ico">⭐</span>
              {totalStars}/{TOTAL_LEVELS * 3}
            </span>
            <button className="icon-btn" onClick={() => setSettings(true)} aria-label="Ajustes">
              ⚙
            </button>
          </div>
        </div>

        <div className="map-scroll">
          {WORLDS.map((w) => {
            const levels = LEVELS.filter((l) => l.world === w.id);
            return (
              <div className="world" key={w.id}>
                <div className="world-head">
                  <span className="we">{w.emoji}</span>
                  {w.name}
                  <span className="line" />
                </div>
                <div className="level-grid">
                  {levels.map((l) => {
                    const locked = l.id > progress.unlocked;
                    const stars = progress.stars[l.id] ?? 0;
                    const done = stars > 0;
                    return (
                      <button
                        key={l.id}
                        className={`level-node ${locked ? "locked" : ""} ${done ? "done" : ""}`}
                        onClick={() => !locked && startLevel(l.id)}
                        disabled={locked}
                      >
                        {locked ? (
                          <span className="lock">🔒</span>
                        ) : (
                          <>
                            <span className="lvnum">{l.id}</span>
                            <span className="node-stars">
                              {done ? <StarsInline n={stars} size={11} /> : <span style={{ opacity: 0.3 }}>· · ·</span>}
                            </span>
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {settings && <SettingsModal onClose={() => setSettings(false)} />}
    </div>
  );
}
