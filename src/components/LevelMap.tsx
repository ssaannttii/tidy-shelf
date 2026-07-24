"use client";
import React, { useEffect, useRef, useState } from "react";
import { useGame } from "../lib/store";
import { LEVELS, TOTAL_LEVELS } from "../lib/levels";
import { WORLDS } from "../lib/items";
import { SettingsModal } from "./Modals";

/* Zigzag level path per design v2 (screen 3): a single winding trail, level 1 at
   the bottom, progressing upward. Nodes alternate horizontal offsets. */
const OFFSETS = [0, 52, 74, 52, 0, -52, -74, -52];

export default function LevelMap() {
  const progress = useGame((s) => s.progress);
  const startLevel = useGame((s) => s.startLevel);
  const goHome = useGame((s) => s.goHome);
  const [settings, setSettings] = useState(false);
  const currentRef = useRef<HTMLDivElement | null>(null);

  const totalStars = Object.values(progress.stars).reduce((a, b) => a + b, 0);
  // "current" = lowest unlocked level not yet cleared
  let currentId = progress.unlocked;
  for (let i = 1; i <= progress.unlocked; i++) {
    if (!((progress.stars[i] ?? 0) > 0)) {
      currentId = i;
      break;
    }
  }

  // bring the current node into view on open
  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: "center" });
  }, []);

  return (
    <div className="screen map">
      <div className="stage">
        <div className="topbar mapbar">
          <button className="icon-btn back" onClick={goHome} aria-label="Inicio">
            <span className="chev" />
          </button>
          <h2 className="map-title">Niveles</h2>
          <div className="group">
            <span className="pill stars">
              <span className="ico">⭐</span>
              {totalStars}/{TOTAL_LEVELS * 3}
            </span>
            <button className="icon-btn" onClick={() => setSettings(true)} aria-label="Ajustes">
              ⚙
            </button>
          </div>
        </div>

        <div className="map-scroll">
          <div className="map-path">
            {LEVELS.map((l, i) => {
              const locked = l.id > progress.unlocked;
              const stars = progress.stars[l.id] ?? 0;
              const done = stars > 0;
              const current = !locked && l.id === currentId;
              const world = WORLDS.find((w) => w.id === l.world);
              const firstOfWorld = i === 0 || LEVELS[i - 1].world !== l.world;
              return (
                <React.Fragment key={l.id}>
                  {/* column-reverse: DOM order runs bottom→top, so the world
                      banner must come BEFORE its first level to sit under it */}
                  {firstOfWorld && world && (
                    <div className="world-flag">
                      <span className="we">{world.emoji}</span>
                      {world.name}
                    </div>
                  )}
                  <div
                    className="path-row"
                    style={{ transform: `translateX(${OFFSETS[i % OFFSETS.length]}px)` }}
                    ref={current ? currentRef : undefined}
                  >
                    <button
                      className={`level-node ${locked ? "locked" : ""} ${done ? "done" : ""} ${
                        current ? "current" : ""
                      }`}
                      onClick={() => !locked && startLevel(l.id)}
                      disabled={locked}
                      aria-label={locked ? `Nivel ${l.id} bloqueado` : `Nivel ${l.id}`}
                    >
                      {current && <span className="play-tip">JUGAR</span>}
                      {locked ? (
                        <span className="node-lock" aria-hidden />
                      ) : (
                        <>
                          <span className="lvnum">{l.id}</span>
                          {done && (
                            <span className="node-stars">
                              {[0, 1, 2].map((s) => (
                                <i key={s} className={`ns ${s < stars ? "on" : ""} ${s === 1 ? "mid" : ""}`} />
                              ))}
                            </span>
                          )}
                        </>
                      )}
                    </button>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {settings && <SettingsModal onClose={() => setSettings(false)} />}
    </div>
  );
}
