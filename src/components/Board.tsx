"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useGame } from "../lib/store";
import { itemTint } from "../lib/items";

const SHRED_COLORS = ["#ffffff", "#fff2cf", "#ffd7c8", "#d6eccf", "#d3e6ff", "#f0d7f2"];

function Burst({ seed }: { seed: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => ({
        tx: (Math.random() * 2 - 1) * 100,
        ty: -(Math.random() * 70 + 20),
        rot: Math.random() * 540 - 270,
        color: SHRED_COLORS[i % SHRED_COLORS.length],
        delay: Math.random() * 60,
        w: 4 + Math.random() * 5,
        h: 6 + Math.random() * 7,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [seed],
  );
  return (
    <div className="burst">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="shred"
          style={
            {
              "--tx": `${p.tx}px`,
              "--ty": `${p.ty}px`,
              "--rot": `${p.rot}deg`,
              background: p.color,
              width: p.w,
              height: p.h,
              animationDelay: `${p.delay}ms`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

interface DownInfo {
  shelf: number;
  slot: number;
  x: number;
  y: number;
  hadItem: boolean;
}

function slotFromPoint(x: number, y: number): { shelf: number; slot: number } | null {
  const el = document.elementFromPoint(x, y);
  const slotEl = el?.closest?.(".slot") as HTMLElement | null;
  if (!slotEl) return null;
  const shelf = Number(slotEl.dataset.shelf);
  const slot = Number(slotEl.dataset.slot);
  if (Number.isNaN(shelf) || Number.isNaN(slot)) return null;
  return { shelf, slot };
}

export default function Board() {
  const level = useGame((s) => s.level);
  const board = useGame((s) => s.board);
  const selected = useGame((s) => s.selected);
  const hint = useGame((s) => s.hint);
  const pulse = useGame((s) => s.pulse);
  const shake = useGame((s) => s.shake);
  const tapSlot = useGame((s) => s.tapSlot);
  const dragMove = useGame((s) => s.dragMove);
  const hammerArmed = useGame((s) => s.hammerArmed);

  const [pulsing, setPulsing] = useState<Record<number, boolean>>({});
  const [dropTarget, setDropTarget] = useState<{ shelf: number; slot: number } | null>(null);
  const [liftSource, setLiftSource] = useState<{ shelf: number; slot: number } | null>(null);
  const [shaking, setShaking] = useState(false);

  const down = useRef<DownInfo | null>(null);
  const moving = useRef(false);
  const prevPulse = useRef<number[]>([]);

  // shelf clear pulse
  useEffect(() => {
    const prev = prevPulse.current;
    const next: Record<number, boolean> = {};
    let any = false;
    for (let i = 0; i < pulse.length; i++) {
      if (pulse[i] !== (prev[i] ?? 0)) {
        next[i] = true;
        any = true;
      }
    }
    prevPulse.current = pulse.slice();
    if (any) {
      setPulsing((p) => ({ ...p, ...next }));
      const keys = Object.keys(next);
      const t = setTimeout(() => {
        setPulsing((p) => {
          const c = { ...p };
          for (const k of keys) delete c[Number(k)];
          return c;
        });
      }, 560);
      return () => clearTimeout(t);
    }
  }, [pulse]);

  // illegal-move shake
  useEffect(() => {
    if (shake === 0) return;
    setShaking(true);
    const t = setTimeout(() => setShaking(false), 320);
    return () => clearTimeout(t);
  }, [shake]);

  useEffect(() => {
    function onMove(e: PointerEvent) {
      if (!down.current) return;
      const dx = e.clientX - down.current.x;
      const dy = e.clientY - down.current.y;
      if (!moving.current && Math.hypot(dx, dy) > 9 && down.current.hadItem) {
        moving.current = true;
        setLiftSource({ shelf: down.current.shelf, slot: down.current.slot });
      }
      if (moving.current) {
        const t = slotFromPoint(e.clientX, e.clientY);
        if (t && board.shelves[t.shelf]?.[t.slot]?.length === 0) setDropTarget(t);
        else setDropTarget(null);
      }
    }
    function onUp(e: PointerEvent) {
      const d = down.current;
      down.current = null;
      if (!d) return;
      if (moving.current) {
        const t = slotFromPoint(e.clientX, e.clientY);
        if (t && !(t.shelf === d.shelf && t.slot === d.slot)) {
          dragMove({ shelf: d.shelf, slot: d.slot }, { shelf: t.shelf, slot: t.slot });
        }
      } else {
        tapSlot(d.shelf, d.slot);
      }
      moving.current = false;
      setDropTarget(null);
      setLiftSource(null);
    }
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [board, dragMove, tapSlot]);

  function onPointerDown(e: React.PointerEvent) {
    const target = (e.target as HTMLElement).closest(".slot") as HTMLElement | null;
    if (!target) return;
    const shelf = Number(target.dataset.shelf);
    const slot = Number(target.dataset.slot);
    if (Number.isNaN(shelf) || Number.isNaN(slot)) return;
    const hadItem = (board.shelves[shelf]?.[slot]?.length ?? 0) > 0;
    down.current = { shelf, slot, x: e.clientX, y: e.clientY, hadItem };
    moving.current = false;
  }

  if (!level) return null;

  const slotsPer = board.slotsPerShelf;
  // widest row (in shelves) → every shelf becomes 1/cols of the cabinet width,
  // so the mueble always fits the viewport and never reflows as items clear.
  const cols = Math.max(1, ...level.layout.map((row) => row.length));

  return (
    <div className="board-wrap">
      <div
        className={`cabinet ${shaking ? "shake" : ""} ${hammerArmed ? "armed" : ""}`}
        onPointerDown={onPointerDown}
        style={{ "--cols": cols } as React.CSSProperties}
      >
        {level.layout.map((row, ri) => (
          <div className="cab-row" key={ri}>
            {row.map((cell, ci) => {
              if (cell === null) {
                return <div className="shelf gap" key={ci} style={{ "--slots": slotsPer } as React.CSSProperties} />;
              }
              const shelf = board.shelves[cell];
              return (
                <div
                  className={`shelf ${pulsing[cell] ? "pulsing" : ""}`}
                  key={ci}
                  style={{ "--slots": slotsPer } as React.CSSProperties}
                >
                  {shelf.map((stack, si) => {
                    const top = stack[stack.length - 1];
                    const isSel = selected?.shelf === cell && selected?.slot === si;
                    const isLift = liftSource?.shelf === cell && liftSource?.slot === si;
                    const isDrop = dropTarget?.shelf === cell && dropTarget?.slot === si;
                    const isHintFrom = hint && hint.fromShelf === cell && hint.fromSlot === si;
                    const isHintTo = hint && hint.toShelf === cell && hint.toSlot === si;
                    const cls = [
                      "slot",
                      isSel || isLift ? "selected" : "",
                      isDrop ? "drop-ok" : "",
                      isHintFrom ? "hint-from" : "",
                      isHintTo ? "hint-to" : "",
                    ]
                      .filter(Boolean)
                      .join(" ");
                    return (
                      <div className={cls} key={si} data-shelf={cell} data-slot={si}>
                        {top && (
                          <div
                            className={`item ${stack.length > 1 ? "depth" : ""}`}
                            style={{ background: itemTint(top) }}
                          >
                            <span className="glyph">{top}</span>
                            {stack.length > 1 && <span className="badge">{stack.length}</span>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {pulsing[cell] && <Burst seed={pulse[cell] ?? 0} />}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
