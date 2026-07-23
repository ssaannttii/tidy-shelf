"use client";
import React, { useId } from "react";
import type { ItemType } from "../lib/types";

/* Scalable SVG "goods" ported from the Happy Tidy design handoff (Good.dc.html).
   Each good is a recolorable grocery item drawn in a 40×60 portrait viewBox and
   bottom-anchored (preserveAspectRatio xMidYMax) so it sits on the shelf floor
   and scales to whatever size the slot lands on. Every game ItemType (an emoji)
   maps to a distinct (shape, palette) so a level's items stay easy to tell
   apart — the emoji is kept only as the stable identity key in the engine. */

type Shape = "can" | "jar" | "bag" | "bottle" | "spray" | "carton" | "cupcake" | "box";
type PalKey =
  | "red" | "orange" | "yellow" | "green" | "teal" | "blue" | "purple" | "pink"
  | "brown" | "steel" | "cream";

interface Pal {
  light: string;
  main: string;
  dark: string;
}

const PAL: Record<PalKey, Pal> = {
  red: { light: "#F16256", main: "#E23B2E", dark: "#B02A20" },
  orange: { light: "#FDB65A", main: "#F59E2E", dark: "#CE7D15" },
  yellow: { light: "#F8D45E", main: "#EBB524", dark: "#C99417" },
  green: { light: "#A6D466", main: "#7CB342", dark: "#5E9A2E" },
  teal: { light: "#3EC077", main: "#2E9E5B", dark: "#227A45" },
  blue: { light: "#5FB6EA", main: "#3F9FD6", dark: "#2F80B6" },
  purple: { light: "#B95FE0", main: "#9B3FCF", dark: "#7A2FA8" },
  pink: { light: "#F585B4", main: "#E85C97", dark: "#C43C77" },
  brown: { light: "#D9A96C", main: "#B9834B", dark: "#8A5E34" },
  steel: { light: "#AEB8C4", main: "#8A94A0", dark: "#5F6874" },
  cream: { light: "#F7EFDD", main: "#E7DABE", dark: "#C4B189" },
};

/* ItemType (emoji) → [shape, palette]. Assigned per world so each world's
   6–8 types are visually distinct. */
const MAP: Record<string, [Shape, PalKey]> = {
  // 1 · Despensa
  "🍎": ["can", "red"], "🍌": ["bag", "yellow"], "🍇": ["jar", "purple"],
  "🍞": ["bag", "brown"], "🧀": ["box", "yellow"], "🥕": ["bottle", "orange"],
  // 2 · Cocina
  "☕": ["can", "brown"], "🍵": ["carton", "teal"], "🥤": ["bottle", "blue"],
  "🧂": ["box", "cream"], "🫙": ["jar", "blue"], "🍯": ["jar", "orange"],
  // 3 · Jardín
  "🌻": ["bottle", "yellow"], "🌷": ["bottle", "pink"], "🌵": ["carton", "green"],
  "🪴": ["box", "teal"], "🍄": ["jar", "red"], "🌿": ["bag", "green"],
  // 4 · Juguetes
  "🧸": ["box", "brown"], "🚗": ["can", "blue"], "🪀": ["jar", "red"],
  "🎈": ["bottle", "pink"], "🎲": ["box", "cream"], "🧩": ["bag", "teal"],
  "🪁": ["carton", "blue"], "🎨": ["spray", "orange"],
  // 5 · Taller
  "🔧": ["bottle", "steel"], "🔩": ["can", "steel"], "🔨": ["box", "red"],
  "🪛": ["bottle", "blue"], "🔦": ["can", "green"], "🧲": ["jar", "red"],
  "💡": ["carton", "yellow"], "🔌": ["bag", "steel"],
};

const WHITE = "rgba(255,255,255,0.92)";
const HI = "rgba(255,255,255,0.42)";
const SH = "rgba(0,0,0,0.16)";

function shapeEls(shape: Shape, c: Pal, g: string): React.ReactNode {
  const body = `url(#${g})`;
  switch (shape) {
    case "can":
      return (
        <>
          <rect x="8" y="13" width="24" height="43" rx="7" fill={body} />
          <ellipse cx="20" cy="13" rx="12" ry="3.4" fill={c.light} />
          <ellipse cx="20" cy="12.3" rx="12" ry="2.6" fill="rgba(255,255,255,0.55)" />
          <rect x="8" y="27" width="24" height="15" fill={WHITE} />
          <rect x="8" y="27" width="24" height="2.4" fill={c.dark} opacity="0.5" />
          <rect x="8" y="39.6" width="24" height="2.4" fill={c.dark} opacity="0.5" />
          <circle cx="20" cy="34.5" r="4" fill={c.main} />
          <rect x="11.5" y="17" width="3" height="34" rx="1.5" fill={HI} />
        </>
      );
    case "jar":
      return (
        <>
          <rect x="10" y="6" width="20" height="8" rx="3" fill={c.dark} />
          <rect x="11.5" y="6.5" width="17" height="2.4" rx="1.2" fill="rgba(255,255,255,0.4)" />
          <rect x="8" y="13" width="24" height="43" rx="7" fill={body} />
          <rect x="11" y="30" width="18" height="17" rx="2.5" fill="#F5E7CB" />
          <circle cx="20" cy="38.5" r="4.2" fill={c.main} />
          <rect x="11.5" y="17" width="3" height="34" rx="1.5" fill={HI} />
        </>
      );
    case "bag":
      return (
        <>
          <rect x="6" y="12" width="28" height="44" rx="5" fill={body} />
          <rect x="6" y="12" width="28" height="6" fill={c.dark} />
          <rect x="6" y="50" width="28" height="6" fill={c.dark} />
          <ellipse cx="20" cy="33" rx="9.5" ry="7.5" fill={WHITE} />
          <rect x="9.5" y="16" width="3" height="36" rx="1.5" fill={HI} />
        </>
      );
    case "bottle":
      return (
        <>
          <rect x="15" y="6" width="10" height="7" rx="2" fill={c.dark} />
          <rect x="16.5" y="12" width="7" height="6" fill={c.main} />
          <path d="M9 24 C9 19 16 18 16 18 L24 18 C24 18 31 19 31 24 L31 50 C31 54 28 56 20 56 C12 56 9 54 9 50 Z" fill={body} />
          <rect x="11" y="32" width="18" height="15" rx="2" fill={WHITE} />
          <rect x="12" y="21" width="2.6" height="30" rx="1.3" fill={HI} />
        </>
      );
    case "spray":
      return (
        <>
          <path d="M13 6 L26 6 L24 15 L15 15 Z" fill={c.dark} />
          <rect x="7" y="8" width="9" height="5" rx="2" fill={c.main} />
          <rect x="12" y="17" width="18" height="39" rx="6" fill={body} />
          <rect x="14" y="32" width="14" height="15" rx="2" fill={WHITE} />
          <rect x="15" y="20" width="2.6" height="30" rx="1.3" fill={HI} />
        </>
      );
    case "carton":
      return (
        <>
          <path d="M10 15 L20 5 L30 15 Z" fill={c.light} />
          <path d="M20 5 L30 15 L30 17 L20 8 Z" fill={c.dark} opacity="0.55" />
          <rect x="10" y="14" width="20" height="42" rx="3" fill={body} />
          <rect x="12" y="30" width="16" height="18" rx="2" fill={WHITE} />
          <circle cx="20" cy="39" r="4" fill={c.main} />
          <rect x="12" y="18" width="2.6" height="34" rx="1.3" fill={HI} />
        </>
      );
    case "cupcake":
      return (
        <>
          <path d="M9 34 L31 34 L28 56 L12 56 Z" fill={c.main} />
          <path d="M9 34 L31 34 L30.6 37 L9.4 37 Z" fill={c.dark} opacity="0.5" />
          {[12, 16, 20, 24, 28].map((x) => (
            <rect key={x} x={x} y="34" width="1.6" height="22" fill={c.dark} opacity="0.28" />
          ))}
          <circle cx="14" cy="30" r="7" fill="#FBE3D0" />
          <circle cx="26" cy="30" r="7" fill="#F7C9CB" />
          <circle cx="20" cy="25" r="8" fill="#FBE3D0" />
          <circle cx="20" cy="18" r="3.6" fill="#E23B2E" />
          <circle cx="18.8" cy="16.8" r="1.1" fill="rgba(255,255,255,0.6)" />
        </>
      );
    case "box":
      return (
        <>
          <rect x="9" y="10" width="22" height="46" rx="3" fill={body} />
          <rect x="9" y="8" width="22" height="5" rx="1.5" fill={c.dark} />
          <rect x="12" y="26" width="16" height="21" rx="2" fill={WHITE} />
          <circle cx="20" cy="36.5" r="4" fill={c.main} />
          <rect x="11.5" y="14" width="2.6" height="38" rx="1.3" fill={HI} />
          <rect x="9" y="52" width="22" height="4" rx="2" fill={SH} />
        </>
      );
  }
}

export function Good({ type }: { type: ItemType }) {
  const uid = useId().replace(/[:]/g, "");
  const g = `g${uid}`;
  const [shape, palKey] = MAP[type] ?? ["jar", "teal"];
  const c = PAL[palKey];
  return (
    <svg
      className="good-svg"
      viewBox="4 2 32 58"
      preserveAspectRatio="xMidYMax meet"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={g} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c.light} />
          <stop offset="0.5" stopColor={c.main} />
          <stop offset="1" stopColor={c.dark} />
        </linearGradient>
      </defs>
      {/* soft contact shadow on the shelf floor */}
      <ellipse cx="20" cy="57.5" rx="13" ry="2.4" fill="rgba(0,0,0,0.14)" />
      {shapeEls(shape, c, g)}
    </svg>
  );
}
