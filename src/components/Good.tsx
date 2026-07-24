"use client";
import React, { useId } from "react";
import type { ItemType } from "../lib/types";

/* ---------------------------------------------------------------------------
   Goods — the 22 products from the Happy Tidy design handoff (Good.dc.html),
   redrawn as scalable SVG with the handoff's exact palette.

   Authoring model: every good is drawn in its OWN local coordinate space at its
   authored footprint (e.g. the wine bottle is 24×56, the donut 46×44). We then
   place it centred + bottom-anchored inside a shared 48×60 viewBox, so the size
   differences between goods are preserved exactly as designed and everything
   stands on the shelf floor.
--------------------------------------------------------------------------- */

export type GoodId =
  | "canRed" | "canOrange" | "sodaPurple" | "jar" | "bagYellow" | "bagGreen"
  | "bottleGreen" | "sprayBlue" | "cupcake" | "gift" | "juiceGreen" | "milkCarton"
  | "teaBox" | "coffeeCan" | "ketchup" | "honeyJar" | "cerealBox" | "chipsRed"
  | "wineBottle" | "donut" | "soap" | "toothpaste";

/* Every game ItemType (an emoji, the engine's identity key) maps to one design
   good. Within a world the assignments are visually distinct (different
   silhouette AND colour) so a level's goods are easy to tell apart at a glance. */
const ITEM_GOOD: Record<string, GoodId> = {
  // 1 · Despensa
  "🍎": "canRed", "🍌": "bagYellow", "🍇": "jar", "🍞": "cerealBox",
  "🧀": "honeyJar", "🥕": "juiceGreen",
  // 2 · Cocina
  "☕": "coffeeCan", "🍵": "teaBox", "🥤": "sodaPurple", "🧂": "milkCarton",
  "🫙": "sprayBlue", "🍯": "ketchup",
  // 3 · Jardín
  "🌻": "bagYellow", "🌷": "cerealBox", "🌵": "bottleGreen", "🪴": "soap",
  "🍄": "canRed", "🌿": "bagGreen",
  // 4 · Juguetes
  "🧸": "teaBox", "🚗": "canOrange", "🪀": "donut", "🎈": "cupcake",
  "🎲": "milkCarton", "🧩": "soap", "🪁": "sprayBlue", "🎨": "gift",
  // 5 · Taller
  "🔧": "toothpaste", "🔩": "coffeeCan", "🔨": "wineBottle", "🪛": "sodaPurple",
  "🔦": "bottleGreen", "🧲": "canRed", "💡": "honeyJar", "🔌": "chipsRed",
};

const W = 48; // shared viewBox width
const H = 60; // shared viewBox height

interface Spec {
  w: number;
  h: number;
  /** `g(name)` returns a document-unique gradient/clip id for this instance. */
  draw: (g: (n: string) => string) => React.ReactNode;
}

/* gradient helpers — CSS angle → SVG vector.
   vertical (top→bottom), horiz (left→right, CSS 90deg), diag (CSS ~100–160deg) */
function Grad({ id, dir, stops }: { id: string; dir: "v" | "h" | "d"; stops: [number, string][] }) {
  const v = dir === "v" ? { x1: 0, y1: 0, x2: 0, y2: 1 } : dir === "h" ? { x1: 0, y1: 0, x2: 1, y2: 0 } : { x1: 0.18, y1: 0, x2: 0.82, y2: 1 };
  return (
    <linearGradient id={id} x1={v.x1} y1={v.y1} x2={v.x2} y2={v.y2}>
      {stops.map(([o, c]) => (
        <stop key={o + c} offset={o} stopColor={c} />
      ))}
    </linearGradient>
  );
}

const GLARE = "rgba(255,255,255,0.5)";

/* ---- the 22 goods ------------------------------------------------------- */

/** shared template for the three cans (only the body gradient differs) */
function can(stops: [number, string][]): Spec {
  return {
    w: 31,
    h: 50,
    draw: (g) => (
      <>
        <defs>
          <Grad id={g("b")} dir="h" stops={stops} />
          <Grad id={g("l")} dir="v" stops={[[0, "#E2E2E2"], [1, "#A9A9A9"]]} />
          <clipPath id={g("c")}>
            <rect width="31" height="50" rx="8" />
          </clipPath>
        </defs>
        <g clipPath={`url(#${g("c")})`}>
          <rect width="31" height="50" rx="8" fill={`url(#${g("b")})`} />
          <rect width="31" height="6" fill={`url(#${g("l")})`} />
          {/* white label band, overhangs both edges, tilted */}
          <rect x="-8" y="17" width="47" height="15" fill="#fff" transform="rotate(-11 15.5 24.5)" />
          <rect x="5" y="8" width="4" height="35" rx="2" fill={GLARE} />
        </g>
      </>
    ),
  };
}

/** shared template for the two snack bags */
function bag(stops: [number, string][], crimpA: string, crimpB: string): Spec {
  return {
    w: 36,
    h: 48,
    draw: (g) => (
      <>
        <defs>
          <Grad id={g("b")} dir="d" stops={stops} />
          <pattern id={g("p")} width="4" height="6" patternUnits="userSpaceOnUse">
            <rect width="2" height="6" fill={crimpA} />
            <rect x="2" width="2" height="6" fill={crimpB} />
          </pattern>
          <clipPath id={g("c")}>
            <rect width="36" height="48" rx="5" />
          </clipPath>
        </defs>
        <g clipPath={`url(#${g("c")})`}>
          <rect width="36" height="48" rx="5" fill={`url(#${g("b")})`} />
          <rect width="36" height="6" fill={`url(#${g("p")})`} />
          <rect y="42" width="36" height="6" fill={`url(#${g("p")})`} />
          <ellipse cx="18" cy="24" rx="12" ry="10" fill="rgba(255,255,255,0.92)" />
          <rect x="5" y="7" width="4" height="34" rx="2" fill="rgba(255,255,255,0.4)" />
        </g>
      </>
    ),
  };
}

const SPECS: Record<GoodId, Spec> = {
  canRed: can([[0, "#F16256"], [0.46, "#E23B2E"], [1, "#B02A20"]]),
  canOrange: can([[0, "#FDB65A"], [0.46, "#F59E2E"], [1, "#CE7D15"]]),
  sodaPurple: can([[0, "#B57BE0"], [0.46, "#8A4BC9"], [1, "#6A34A3"]]),

  bagYellow: bag([[0, "#F8D45E"], [0.55, "#EBB524"], [1, "#D19A17"]], "#C9971A", "#A97E14"),
  bagGreen: bag([[0, "#A6D466"], [0.55, "#7CB342"], [1, "#5E9A2E"]], "#5E9A2E", "#4D7F26"),

  jar: {
    w: 34,
    h: 52,
    draw: (g) => (
      <>
        <defs>
          <Grad id={g("l")} dir="v" stops={[[0, "#D24B3B"], [1, "#B0301F"]]} />
          <Grad id={g("b")} dir="d" stops={[[0, "#EE6F5D"], [0.6, "#C0392B"], [1, "#9E2B1F"]]} />
        </defs>
        <rect x="3" width="28" height="11" rx="5" fill={`url(#${g("l")})`} />
        <rect y="9" width="34" height="43" rx="8" fill={`url(#${g("b")})`} />
        <rect x="5" y="20" width="24" height="20" rx="4" fill="#F5E7CB" />
        <circle cx="17" cy="30" r="5.5" fill="#C0392B" opacity="0.35" />
        <circle cx="17" cy="30" r="4" fill="#C0392B" />
        <rect x="4.5" y="14" width="3" height="30" rx="1.5" fill="rgba(255,255,255,0.3)" />
      </>
    ),
  },

  bottleGreen: {
    w: 28,
    h: 54,
    draw: (g) => (
      <>
        <defs>
          <Grad id={g("n")} dir="v" stops={[[0, "#25864C"], [1, "#1C6A3B"]]} />
          <Grad id={g("b")} dir="d" stops={[[0, "#3EC077"], [0.6, "#2E9E5B"], [1, "#227A45"]]} />
        </defs>
        <rect x="8" width="12" height="9" rx="3" fill={`url(#${g("n")})`} />
        <rect y="8" width="28" height="46" rx="8" fill={`url(#${g("b")})`} />
        <rect x="4" y="22" width="20" height="20" rx="3" fill="rgba(255,255,255,0.9)" />
        <rect x="4" y="13" width="3" height="30" rx="1.5" fill="rgba(255,255,255,0.3)" />
      </>
    ),
  },

  sprayBlue: {
    w: 34,
    h: 54,
    draw: (g) => (
      <>
        <defs>
          <Grad id={g("h")} dir="v" stops={[[0, "#5FB6EA"], [1, "#3F9FD6"]]} />
          <Grad id={g("b")} dir="d" stops={[[0, "#63B9EC"], [0.6, "#3F9FD6"], [1, "#2F80B6"]]} />
        </defs>
        <rect x="12" y="1" width="20" height="13" rx="4" fill={`url(#${g("h")})`} />
        <rect y="5" width="14" height="6" rx="3" fill="#3F9FD6" />
        <rect x="6" y="14" width="26" height="40" rx="7" fill={`url(#${g("b")})`} />
        <rect x="11" y="24" width="17" height="18" rx="3" fill="rgba(255,255,255,0.9)" />
        <rect x="9" y="19" width="3" height="28" rx="1.5" fill="rgba(255,255,255,0.35)" />
      </>
    ),
  },

  cupcake: {
    w: 42,
    h: 48,
    draw: (g) => (
      <>
        <defs>
          <pattern id={g("p")} width="8" height="24" patternUnits="userSpaceOnUse">
            <rect width="4" height="24" fill="#DDA468" />
            <rect x="4" width="4" height="24" fill="#C2894E" />
          </pattern>
          <clipPath id={g("c")}>
            <polygon points="7.3,24 34.7,24 40,48 2,48" />
          </clipPath>
        </defs>
        <g clipPath={`url(#${g("c")})`}>
          <rect x="2" y="24" width="38" height="24" fill={`url(#${g("p")})`} />
        </g>
        <ellipse cx="13" cy="11" rx="8" ry="9" fill="#FBE3D0" />
        <circle cx="24" cy="11" r="9" fill="#F7C9CB" />
        <ellipse cx="20" cy="8" rx="9" ry="8" fill="#FBE3D0" />
        <circle cx="21" cy="1" r="4" fill="#E23B2E" />
        <circle cx="19.8" cy="-0.2" r="1.2" fill="rgba(255,255,255,0.6)" />
      </>
    ),
  },

  gift: {
    w: 42,
    h: 42,
    draw: (g) => (
      <>
        <defs>
          <Grad id={g("b")} dir="d" stops={[[0, "#5CB9EC"], [0.6, "#3F9FD6"], [1, "#2F80B6"]]} />
          <Grad id={g("r")} dir="v" stops={[[0, "#FBD255"], [1, "#EBB01F"]]} />
        </defs>
        <rect x="1" y="8" width="40" height="34" rx="5" fill={`url(#${g("b")})`} />
        <rect x="16" y="8" width="10" height="34" fill={`url(#${g("r")})`} />
        <rect x="1" y="22" width="40" height="8" fill={`url(#${g("r")})`} />
        <ellipse cx="14" cy="2.5" rx="6" ry="5.5" fill="#F6C445" transform="rotate(-18 14 2.5)" />
        <ellipse cx="26" cy="2.5" rx="6" ry="5.5" fill="#F6C445" transform="rotate(18 26 2.5)" />
        <circle cx="21" cy="4" r="4" fill="#EBB01F" />
      </>
    ),
  },

  juiceGreen: {
    w: 28,
    h: 52,
    draw: (g) => (
      <>
        <defs>
          <Grad id={g("b")} dir="d" stops={[[0, "#57C079"], [0.6, "#3E9E58"], [1, "#2F7C44"]]} />
        </defs>
        <polygon points="2,12 14,0 26,12" fill="#2E7D46" />
        <rect y="10" width="28" height="42" rx="4" fill={`url(#${g("b")})`} />
        <rect x="3" y="22" width="22" height="20" rx="2" fill="rgba(255,255,255,0.9)" />
        <rect x="3" y="15" width="2.6" height="30" rx="1.3" fill="rgba(255,255,255,0.3)" />
      </>
    ),
  },

  milkCarton: {
    w: 32,
    h: 54,
    draw: (g) => (
      <>
        <defs>
          <Grad id={g("t")} dir="v" stops={[[0, "#EDE7DC"], [1, "#D3CBBB"]]} />
          <Grad id={g("b")} dir="d" stops={[[0, "#FCFAF4"], [0.6, "#E4DED0"], [1, "#CFC7B6"]]} />
        </defs>
        <polygon points="5,11 16,0 27,11" fill={`url(#${g("t")})`} />
        <rect y="8" width="32" height="46" rx="3" fill={`url(#${g("b")})`} />
        <rect x="4" y="20" width="24" height="16" rx="2" fill="#4F9FD0" />
        <ellipse cx="16" cy="27.5" rx="7" ry="3.5" fill="rgba(255,255,255,0.85)" />
        <rect x="3" y="14" width="3" height="32" rx="1.5" fill="rgba(255,255,255,0.5)" />
      </>
    ),
  },

  teaBox: {
    w: 34,
    h: 46,
    draw: (g) => (
      <>
        <defs>
          <Grad id={g("b")} dir="d" stops={[[0, "#E88C55"], [0.6, "#C96A2E"], [1, "#A9541F"]]} />
        </defs>
        <rect width="34" height="46" rx="4" fill={`url(#${g("b")})`} />
        <rect x="5" y="8" width="24" height="16" rx="3" fill="#F5E7CB" />
        <ellipse cx="17" cy="16" rx="6" ry="4" fill="#7CB342" />
        <rect x="6" y="37" width="22" height="4" rx="2" fill="rgba(255,255,255,0.5)" />
        <rect x="3" y="6" width="3" height="30" rx="1.5" fill="rgba(255,255,255,0.28)" />
      </>
    ),
  },

  coffeeCan: {
    w: 33,
    h: 50,
    draw: (g) => (
      <>
        <defs>
          <Grad id={g("b")} dir="h" stops={[[0, "#7A4A2A"], [0.5, "#5A3418"], [1, "#3F2410"]]} />
          <Grad id={g("l")} dir="v" stops={[[0, "#D8D8D8"], [1, "#A5A5A5"]]} />
          <clipPath id={g("c")}>
            <rect width="33" height="50" rx="5" />
          </clipPath>
        </defs>
        <g clipPath={`url(#${g("c")})`}>
          <rect width="33" height="50" rx="5" fill={`url(#${g("b")})`} />
          <rect width="33" height="5" fill={`url(#${g("l")})`} />
          <rect x="5" y="16" width="23" height="18" rx="3" fill="#E8C48A" />
          <rect x="11" y="20" width="11" height="9" rx="2" fill="#5A3418" />
          <rect x="4" y="9" width="3" height="32" rx="1.5" fill="rgba(255,255,255,0.25)" />
        </g>
      </>
    ),
  },

  ketchup: {
    w: 26,
    h: 54,
    draw: (g) => (
      <>
        <defs>
          <Grad id={g("s")} dir="v" stops={[[0, "#EE6F5D"], [1, "#C0392B"]]} />
          <Grad id={g("b")} dir="d" stops={[[0, "#EE6F5D"], [0.6, "#C0392B"], [1, "#9E2B1F"]]} />
        </defs>
        <rect x="9" width="8" height="8" rx="2" fill="#B0301F" />
        <rect x="6" y="6" width="14" height="9" rx="3" fill={`url(#${g("s")})`} />
        <rect y="13" width="26" height="41" rx="7" fill={`url(#${g("b")})`} />
        <rect x="4" y="24" width="18" height="18" rx="3" fill="#F5E7CB" />
        <rect x="3.5" y="19" width="2.8" height="26" rx="1.4" fill="rgba(255,255,255,0.3)" />
      </>
    ),
  },

  honeyJar: {
    w: 34,
    h: 48,
    draw: (g) => (
      <>
        <defs>
          <Grad id={g("l")} dir="v" stops={[[0, "#E0A72E"], [1, "#B7841E"]]} />
          <Grad id={g("b")} dir="d" stops={[[0, "#FBD86A"], [0.6, "#EBAF1E"], [1, "#CE9615"]]} />
        </defs>
        <rect x="8" width="18" height="8" rx="3" fill={`url(#${g("l")})`} />
        <rect x="2" y="6" width="30" height="42" rx="10" fill={`url(#${g("b")})`} />
        <rect x="5" y="18" width="24" height="16" rx="3" fill="#F5E7CB" />
        <rect x="11" y="21.5" width="12" height="9" rx="2" fill="#EBAF1E" />
        <rect x="5.5" y="12" width="3" height="26" rx="1.5" fill="rgba(255,255,255,0.4)" />
      </>
    ),
  },

  cerealBox: {
    w: 33,
    h: 52,
    draw: (g) => (
      <>
        <defs>
          <Grad id={g("b")} dir="d" stops={[[0, "#F16DA0"], [0.6, "#D8467F"], [1, "#B62F63"]]} />
        </defs>
        <rect width="33" height="52" rx="4" fill={`url(#${g("b")})`} />
        <rect x="4" y="7" width="25" height="22" rx="3" fill="#FFF3E2" />
        <ellipse cx="16.5" cy="17.5" rx="7.5" ry="6.5" fill="#F0A82E" />
        <rect x="6" y="41" width="21" height="5" rx="2" fill="rgba(255,255,255,0.6)" />
        <rect x="3" y="6" width="3" height="32" rx="1.5" fill="rgba(255,255,255,0.3)" />
      </>
    ),
  },

  chipsRed: {
    w: 32,
    h: 50,
    draw: (g) => (
      <>
        <defs>
          <Grad id={g("b")} dir="d" stops={[[0, "#F15A5A"], [0.6, "#D8322E"], [1, "#B0201D"]]} />
          <clipPath id={g("c")}>
            <rect width="32" height="50" rx="5" />
          </clipPath>
        </defs>
        <g clipPath={`url(#${g("c")})`}>
          <rect width="32" height="50" rx="5" fill={`url(#${g("b")})`} />
          <polygon fill="#9E1C19" points="0,0 32,0 32,4.2 28,7 24,4.2 20,7 16,4.2 12,7 8,4.2 4,7 0,4.2" />
          <polygon fill="#9E1C19" points="0,45.8 4,43 8,45.8 12,43 16,45.8 20,43 24,45.8 28,43 32,45.8 32,50 0,50" />
          <ellipse cx="16" cy="24" rx="10" ry="8" fill="#FDE08A" />
          <rect x="4" y="12" width="3" height="26" rx="1.5" fill="rgba(255,255,255,0.32)" />
        </g>
      </>
    ),
  },

  wineBottle: {
    w: 24,
    h: 56,
    draw: (g) => (
      <>
        <defs>
          <Grad id={g("n")} dir="h" stops={[[0, "#8E1F3A"], [1, "#6A1228"]]} />
          <Grad id={g("b")} dir="h" stops={[[0, "#A83450"], [0.55, "#7A1B33"], [1, "#5A1024"]]} />
        </defs>
        <rect x="9" width="6" height="7" rx="2" fill="#3A1A22" />
        <rect x="8" y="5" width="8" height="16" rx="2" fill={`url(#${g("n")})`} />
        <rect x="1" y="19" width="22" height="37" rx="7" fill={`url(#${g("b")})`} />
        <rect x="3" y="30" width="18" height="18" rx="2" fill="#F0E4CC" />
        <rect x="4" y="24" width="2.6" height="22" rx="1.3" fill="rgba(255,255,255,0.25)" />
      </>
    ),
  },

  donut: {
    w: 46,
    h: 44,
    draw: (g) => (
      <>
        <defs>
          <radialGradient id={g("d")} cx="0.4" cy="0.35" r="0.75">
            <stop offset="0" stopColor="#E8B57A" />
            <stop offset="1" stopColor="#C88C4E" />
          </radialGradient>
          <radialGradient id={g("i")} cx="0.4" cy="0.3" r="0.75">
            <stop offset="0" stopColor="#F6A9C8" />
            <stop offset="1" stopColor="#E06AA0" />
          </radialGradient>
          <mask id={g("m")}>
            <rect width="46" height="44" fill="#000" />
            <ellipse cx="23" cy="22" rx="21" ry="20" fill="#fff" />
            <circle cx="23" cy="22" r="7" fill="#000" />
          </mask>
        </defs>
        <g mask={`url(#${g("m")})`}>
          <ellipse cx="23" cy="22" rx="23" ry="22" fill={`url(#${g("d")})`} />
          <ellipse cx="23" cy="22" rx="21" ry="20" fill={`url(#${g("i")})`} />
        </g>
        <rect x="12" y="6" width="5" height="9" rx="2" fill="#7CB342" transform="rotate(20 14.5 10.5)" />
        <rect x="24" y="5" width="5" height="9" rx="2" fill="#5CB9EC" transform="rotate(-25 26.5 9.5)" />
        <rect x="6" y="14" width="5" height="9" rx="2" fill="#FBD24E" transform="rotate(50 8.5 18.5)" />
        <rect x="35" y="15" width="5" height="9" rx="2" fill="#8A4BC9" transform="rotate(-50 37.5 19.5)" />
      </>
    ),
  },

  soap: {
    w: 34,
    h: 44,
    draw: (g) => (
      <>
        <defs>
          <Grad id={g("b")} dir="d" stops={[[0, "#8FD9C4"], [0.6, "#4FB79E"], [1, "#369480"]]} />
        </defs>
        <rect width="34" height="44" rx="8" fill={`url(#${g("b")})`} />
        <ellipse cx="17" cy="16" rx="12" ry="7" fill="rgba(255,255,255,0.9)" />
        <ellipse cx="17" cy="15.5" rx="5" ry="3.5" fill="#4FB79E" />
        <rect x="4" y="8" width="3" height="26" rx="1.5" fill="rgba(255,255,255,0.4)" />
      </>
    ),
  },

  toothpaste: {
    w: 24,
    h: 52,
    draw: (g) => (
      <>
        <defs>
          <Grad id={g("b")} dir="h" stops={[[0, "#FFFFFF"], [0.55, "#DDEAF2"], [1, "#BCD2E0"]]} />
          <clipPath id={g("c")}>
            <polygon points="9,5 15,5 22,15 22,52 2,52 2,15" />
          </clipPath>
        </defs>
        <rect x="9" width="6" height="7" rx="2" fill="#3F9FD6" />
        <g clipPath={`url(#${g("c")})`}>
          <rect x="2" y="5" width="20" height="47" fill={`url(#${g("b")})`} />
          <rect x="4" y="22" width="16" height="8" fill="#E23B2E" />
          <rect x="4" y="31" width="16" height="6" fill="#3F9FD6" />
        </g>
      </>
    ),
  },
};

export function goodIdFor(type: ItemType): GoodId {
  return ITEM_GOOD[type] ?? "jar";
}

export function Good({ type }: { type: ItemType }) {
  const raw = useId();
  const uid = raw.replace(/:/g, "");
  const g = (n: string) => `${n}${uid}`;
  const id = goodIdFor(type);
  const spec = SPECS[id];
  const x = (W - spec.w) / 2;
  const y = H - spec.h;
  return (
    <svg
      className="good-svg"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMax meet"
      aria-hidden="true"
      focusable="false"
    >
      <ellipse cx={W / 2} cy={H - 1.5} rx={spec.w * 0.42} ry="2.2" fill="rgba(0,0,0,0.14)" />
      <g transform={`translate(${x} ${y})`}>{spec.draw(g)}</g>
    </svg>
  );
}
