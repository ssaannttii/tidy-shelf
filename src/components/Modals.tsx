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
  const stars = useGame((s) => s.earnedStars);
  const wonCoins = useGame((s) => s.wonCoins);
  const nextLevel = useGame((s) => s.nextLevel);
  const replay = useGame((s) => s.replay);
  const goMap = useGame((s) => s.goMap);
  if (!level) return null;
  const isLast = !getLevel(level.id + 1);
  return (
    <div className="win-screen">
      <div className="big-stars">
        {[0, 1, 2].map((i) => (
          <span key={i} className={`s ${i < stars ? "on" : ""} ${i === 1 ? "mid" : ""}`}>
            ★
          </span>
        ))}
      </div>
      <div className="w-level">Nivel {level.id}</div>
      <div className="w-title">¡Completado!</div>
      <div className="w-gift">🎁</div>
      <div className="w-coins">🪙 +{wonCoins}</div>
      <div className="w-actions">
        <button className="icon-btn" onClick={goMap} aria-label="Niveles">
          ☰
        </button>
        <button className="icon-btn" onClick={replay} aria-label="Reintentar">
          ↻
        </button>
        <button className="btn primary" onClick={nextLevel}>
          {isLast ? "Terminar 🏆" : "Recoger ▶"}
        </button>
      </div>
    </div>
  );
}

export function LoseModal({ onShop }: { onShop: () => void }) {
  const reason = useGame((s) => s.lostReason);
  const replay = useGame((s) => s.replay);
  const goMap = useGame((s) => s.goMap);
  return (
    <Modal>
      <div style={{ fontSize: 40 }}>{reason === "time" ? "⏰" : "🧩"}</div>
      <h2>{reason === "time" ? "¡Se acabó el tiempo!" : "Sin movimientos"}</h2>
      <p>
        {reason === "time"
          ? "Casi lo tienes — inténtalo otra vez."
          : "La estantería se atascó. Un potenciador puede ayudarte."}
      </p>
      <div className="modal-actions" style={{ flexDirection: "column" }}>
        <button className="btn" onClick={onShop}>
          🛒 Conseguir potenciadores
        </button>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn ghost" onClick={goMap} style={{ flex: 1 }}>
            ☰ Niveles
          </button>
          <button className="btn primary" onClick={replay} style={{ flex: 1 }}>
            ↻ Reintentar
          </button>
        </div>
      </div>
    </Modal>
  );
}

const SHOP_ITEMS: { id: PowerId; icon: string; label: string; desc: string }[] = [
  { id: "hammer", icon: "🔨", label: "Romper", desc: "Quita cualquier objeto (o rompe una caja)" },
  { id: "hint", icon: "💡", label: "Pista", desc: "Muestra un buen movimiento" },
  { id: "shuffle", icon: "🔀", label: "Mezclar", desc: "Reordena las estanterías" },
  { id: "freeze", icon: "❄️", label: "Congelar", desc: "Pausa el tiempo 10s" },
  { id: "double", icon: "✨", label: "Doble", desc: "×2 puntos durante 15s" },
];

export function ShopModal({ onClose }: { onClose: () => void }) {
  const coins = useGame((s) => s.progress.coins);
  const bought = useGame((s) => s.progress.bought);
  const buyBooster = useGame((s) => s.buyBooster);
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal shop" onClick={(e) => e.stopPropagation()}>
        <h2>Tienda de potenciadores</h2>
        <p className="coin-balance">
          <span className="coin-ico">🪙</span> {coins} monedas
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
        <p className="shop-note">Los potenciadores que compras se suman a los gratis de cada nivel.</p>
        <button className="btn primary" onClick={onClose} style={{ width: "100%" }}>
          Hecho
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
        <h2>Ajustes</h2>
        <div className="settings-list">
          <div className="setting">
            <span>🔊 Sonido</span>
            <Toggle on={progress.sound} onClick={() => setSound(!progress.sound)} />
          </div>
          <div className="setting">
            <span>🧘 Modo relax (sin tiempo)</span>
            <Toggle on={progress.relax} onClick={() => setRelax(!progress.relax)} />
          </div>
        </div>
        <p style={{ fontSize: 13, textAlign: "left", lineHeight: 1.5 }}>
          <b>Cómo jugar:</b> mueve un producto a un hueco vacío. Junta tres iguales
          en un estante y se limpian, revelando lo que hay detrás. ¡Ordena todo el mueble!
        </p>
        <div className="modal-actions" style={{ flexDirection: "column" }}>
          {!confirmReset ? (
            <button className="btn ghost" onClick={() => setConfirmReset(true)}>
              Reiniciar progreso
            </button>
          ) : (
            <button className="btn" style={{ background: "var(--bad)", color: "#fff" }} onClick={resetAll}>
              Toca otra vez para borrarlo todo
            </button>
          )}
          <button className="btn primary" onClick={onClose}>
            Hecho
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
        Toca un producto y luego un <b>hueco vacío</b> para moverlo. Junta <b>tres iguales</b> en
        un estante para limpiarlos.
        <div>
          <button className="btn primary" onClick={onClose}>
            ¡Entendido!
          </button>
        </div>
      </div>
    </div>
  );
}

const MECH_TUT: Record<string, { icon: string; text: React.ReactNode }> = {
  crate: {
    icon: "📦",
    text: (
      <>
        Limpia un estante <b>justo al lado de una caja</b> para romperla — o usa el martillo 🔨.
      </>
    ),
  },
  lock: {
    icon: "🔒",
    text: (
      <>
        Un <b>estante bloqueado</b> se abre al limpiar uno de al lado.
      </>
    ),
  },
  gift: {
    icon: "🎁",
    text: (
      <>
        Limpia al lado de una <b>caja regalo</b> para abrirla y descubrir un objeto.
      </>
    ),
  },
  frozen: {
    icon: "❄️",
    text: (
      <>
        Un objeto <b>congelado</b> se descongela al limpiar un estante al lado.
      </>
    ),
  },
  chained: {
    icon: "⛓️",
    text: (
      <>
        Un objeto <b>encadenado</b> no se puede mover hasta que limpies un estante al lado.
      </>
    ),
  },
};

export function MechTutorial({ mech, onClose }: { mech: string; onClose: () => void }) {
  const t = MECH_TUT[mech];
  if (!t) return null;
  return (
    <div className="tut">
      <div className="bubble">
        <div className="hand">{t.icon}</div>
        {t.text}
        <div>
          <button className="btn primary" onClick={onClose}>
            ¡Entendido!
          </button>
        </div>
      </div>
    </div>
  );
}
