"use client";
import React, { useState } from "react";
import { useGame } from "../lib/store";
import { TOTAL_LEVELS } from "../lib/levels";
import { SettingsModal, ShopModal } from "./Modals";

export default function Home() {
  const progress = useGame((s) => s.progress);
  const startLevel = useGame((s) => s.startLevel);
  const goMap = useGame((s) => s.goMap);
  const [settings, setSettings] = useState(false);
  const [shop, setShop] = useState(false);

  const totalStars = Object.values(progress.stars).reduce((a, b) => a + b, 0);
  const cleared = Object.keys(progress.stars).length;
  const continueId = Math.min(progress.unlocked, TOTAL_LEVELS);
  const fresh = cleared === 0;

  return (
    <div className="screen home" style={{ background: "linear-gradient(180deg,#f7ecd9,#efd0a8)" }}>
      <div className="home-top">
        <button className="pill coins" onClick={() => setShop(true)}>
          <span className="ico">🪙</span> {progress.coins}
          <span className="plus">＋</span>
        </button>
        <button className="icon-btn" onClick={() => setSettings(true)} aria-label="Ajustes">
          ⚙
        </button>
      </div>

      <div className="home-center">
        <div className="logo">
          <div className="mark">🗄️</div>
          <h1>Estantería Ordenada</h1>
          <p>Un puzle de ordenar relajante</p>
        </div>

        <div className="mini-row">
          <span className="pill">
            <span className="ico">⭐</span>
            {totalStars}/{TOTAL_LEVELS * 3}
          </span>
          <span className="pill">
            <span className="ico">🗂️</span>
            {cleared}/{TOTAL_LEVELS}
          </span>
        </div>

        <div className="home-actions">
          <button className="btn primary big-play" onClick={() => startLevel(continueId)}>
            {fresh ? "▶  Jugar" : `▶  Nivel ${continueId}`}
          </button>
        </div>
      </div>

      <div className="bottom-nav">
        <button className="nav-btn" onClick={() => setShop(true)}>
          <span className="nico">🛒</span>Tienda
        </button>
        <button className="nav-btn" onClick={goMap}>
          <span className="nico">☰</span>Niveles
        </button>
        <button className="nav-btn active" onClick={() => startLevel(continueId)}>
          <span className="nico">🏠</span>Jugar
        </button>
        <button className="nav-btn" onClick={() => setSettings(true)}>
          <span className="nico">⚙️</span>Ajustes
        </button>
      </div>

      {settings && <SettingsModal onClose={() => setSettings(false)} />}
      {shop && <ShopModal onClose={() => setShop(false)} />}
    </div>
  );
}
