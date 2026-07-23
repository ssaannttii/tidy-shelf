"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useGame } from "../lib/store";
import { Good } from "./Good";
import type { ItemType } from "../lib/types";

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
  movable: boolean;
  type: ItemType | null;
}

function slotElFromPoint(x: number, y: number): { shelf: number; slot: number; el: HTMLElement } | null {
  const el = document.elementFromPoint(x, y);
  const slotEl = el?.closest?.(".slot") as HTMLElement | null;
  if (!slotEl) return null;
  const shelf = Number(slotEl.dataset.shelf);
  const slot = Number(slotEl.dataset.slot);
  if (Number.isNaN(shelf) || Number.isNaN(slot)) return null;
  return { shelf, slot, el: slotEl };
}

function slotEl(shelf: number, slot: number): HTMLElement | null {
  return document.querySelector(`.slot[data-shelf="${shelf}"][data-slot="${slot}"]`);
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
  const [dragSrc, setDragSrc] = useState<{ shelf: number; slot: number } | null>(null);
  const [dragType, setDragType] = useState<ItemType | null>(null);
  const [shaking, setShaking] = useState(false);

  const down = useRef<DownInfo | null>(null);
  const dragging = useRef(false);
  const prevPulse = useRef<number[]>([]);
  const ghostRef = useRef<HTMLDivElement | null>(null);
  const ghostSize = useRef({ w: 40, h: 60 });
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(
    () => () => {
      if (settleTimer.current) clearTimeout(settleTimer.current);
    },
    [],
  );

  // position the floating ghost above the finger
  function placeGhost(x: number, y: number, lifted: boolean) {
    const g = ghostRef.current;
    if (!g) return;
    const { w, h } = ghostSize.current;
    g.style.transition = "none";
    g.style.transform = `translate(${x - w / 2}px, ${y - h * 0.86}px) scale(${lifted ? 1.1 : 1})`;
  }

  function endDrag() {
    dragging.current = false;
    setDragSrc(null);
    setDragType(null);
    setDropTarget(null);
    const g = ghostRef.current;
    if (g) {
      g.style.transition = "none";
      g.style.opacity = "0";
    }
  }

  useEffect(() => {
    function beginDrag(d: DownInfo, x: number, y: number) {
      const srcEl = slotEl(d.shelf, d.slot);
      const goodEl = srcEl?.querySelector(".good") as HTMLElement | null;
      const r = (goodEl ?? srcEl)?.getBoundingClientRect();
      ghostSize.current = { w: r?.width || 40, h: r?.height || 60 };
      dragging.current = true;
      setDragType(d.type);
      setDragSrc({ shelf: d.shelf, slot: d.slot });
      // show + place the ghost (opacity reset after last drag's fade-out)
      const g = ghostRef.current;
      if (g) {
        g.style.setProperty("--gw", `${ghostSize.current.w}px`);
        g.style.setProperty("--gh", `${ghostSize.current.h}px`);
        g.style.opacity = "1";
      }
      placeGhost(x, y, true);
    }

    function onMove(e: PointerEvent) {
      const d = down.current;
      if (!d) return;
      if (!dragging.current) {
        const dist = Math.hypot(e.clientX - d.x, e.clientY - d.y);
        if (dist > 8 && d.movable) beginDrag(d, e.clientX, e.clientY);
        else return;
      }
      placeGhost(e.clientX, e.clientY, true);
      const t = slotElFromPoint(e.clientX, e.clientY);
      if (t && board.shelves[t.shelf]?.[t.slot]?.length === 0) setDropTarget({ shelf: t.shelf, slot: t.slot });
      else setDropTarget(null);
    }

    function settleAndCommit(rect: DOMRect, from: { shelf: number; slot: number }, to: { shelf: number; slot: number }) {
      const g = ghostRef.current;
      const { w, h } = ghostSize.current;
      if (g) {
        g.style.transition = "transform .17s cubic-bezier(.2,.75,.3,1.08)";
        g.style.transform = `translate(${rect.left + rect.width / 2 - w / 2}px, ${rect.bottom - h - 4}px) scale(1)`;
      }
      settleTimer.current = setTimeout(() => {
        dragMove(from, to);
        endDrag();
      }, 165);
    }

    function settleBack(from: { shelf: number; slot: number }) {
      const el = slotEl(from.shelf, from.slot);
      const rect = el?.getBoundingClientRect();
      const g = ghostRef.current;
      if (g && rect) {
        const { w, h } = ghostSize.current;
        g.style.transition = "transform .16s ease-out";
        g.style.transform = `translate(${rect.left + rect.width / 2 - w / 2}px, ${rect.bottom - h - 4}px) scale(1)`;
      }
      settleTimer.current = setTimeout(endDrag, 155);
    }

    function onUp(e: PointerEvent) {
      const d = down.current;
      down.current = null;
      if (!d) return;
      if (dragging.current) {
        const t = slotElFromPoint(e.clientX, e.clientY);
        if (t && !(t.shelf === d.shelf && t.slot === d.slot) && board.shelves[t.shelf]?.[t.slot]?.length === 0) {
          settleAndCommit(t.el.getBoundingClientRect(), { shelf: d.shelf, slot: d.slot }, { shelf: t.shelf, slot: t.slot });
        } else {
          settleBack({ shelf: d.shelf, slot: d.slot });
        }
      } else {
        tapSlot(d.shelf, d.slot);
      }
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
    const stack = board.shelves[shelf]?.[slot];
    const front = stack?.[stack.length - 1];
    const movable = !!front && front.k === "item" && !front.chained && !front.frozen;
    down.current = {
      shelf,
      slot,
      x: e.clientX,
      y: e.clientY,
      hadItem: (stack?.length ?? 0) > 0,
      movable,
      type: front && front.k === "item" ? front.t : null,
    };
    dragging.current = false;
  }

  if (!level) return null;

  const slotsPer = board.slotsPerShelf;
  // widest row (in shelves) → every shelf becomes 1/cols of the cabinet width,
  // so the mueble always fits the viewport and never reflows as items clear.
  const cols = Math.max(1, ...level.layout.map((row) => row.length));

  return (
    <div className="board-wrap">
      <div
        className={`cabinet ${shaking ? "shake" : ""} ${hammerArmed ? "armed" : ""} ${dragSrc ? "dragging" : ""}`}
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
                  className={`shelf ${pulsing[cell] ? "pulsing" : ""} ${board.locked[cell] ? "locked" : ""}`}
                  key={ci}
                  style={{ "--slots": slotsPer } as React.CSSProperties}
                >
                  {shelf.map((stack, si) => {
                    const top = stack[stack.length - 1];
                    const isSel = selected?.shelf === cell && selected?.slot === si;
                    const isSrc = dragSrc?.shelf === cell && dragSrc?.slot === si;
                    const isDrop = dropTarget?.shelf === cell && dropTarget?.slot === si;
                    const isHintFrom = hint && hint.fromShelf === cell && hint.fromSlot === si;
                    const isHintTo = hint && hint.toShelf === cell && hint.toSlot === si;
                    const behind = stack.length - 1;
                    const cls = [
                      "slot",
                      isSel ? "selected" : "",
                      isSrc ? "drag-src" : "",
                      isDrop ? "drop-ok" : "",
                      isHintFrom ? "hint-from" : "",
                      isHintTo ? "hint-to" : "",
                    ]
                      .filter(Boolean)
                      .join(" ");
                    return (
                      <div className={cls} key={si} data-shelf={cell} data-slot={si}>
                        {top &&
                          (top.k === "item" ? (
                            <div
                              className={`good ${behind > 0 ? "depth" : ""} ${top.frozen ? "frozen" : ""} ${
                                top.chained ? "chained" : ""
                              }`}
                            >
                              {behind > 0 && <span className="depth-cards" aria-hidden />}
                              <Good type={top.t} />
                              {behind > 0 && <span className="badge">{stack.length}</span>}
                              {top.chained ? <span className="chain">⛓️</span> : null}
                            </div>
                          ) : top.k === "crate" ? (
                            <div className="good obstacle crate">
                              <span className="glyph">📦</span>
                            </div>
                          ) : (
                            <div className="good obstacle gift">
                              <span className="glyph">🎁</span>
                            </div>
                          ))}
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

      {/* floating drag ghost — follows the finger, glides into the slot on drop */}
      <div className="drag-ghost" ref={ghostRef} aria-hidden>
        {dragType ? <Good type={dragType} /> : null}
      </div>
    </div>
  );
}
