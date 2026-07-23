import type { ItemType, WorldMeta } from "./types";

/**
 * Item catalog. The key IS the emoji (used directly in level data).
 * Each item has a soft background tint so players can sort by colour quickly.
 */
export interface ItemMeta {
  emoji: ItemType;
  tint: string;
  label: string;
}

export const ITEM_TINTS: Record<ItemType, { tint: string; label: string }> = {
  // Pantry
  "🍎": { tint: "#ffd7d0", label: "Apple" },
  "🍌": { tint: "#fff3c4", label: "Banana" },
  "🍇": { tint: "#e6d7ff", label: "Grapes" },
  "🍞": { tint: "#f4e2c9", label: "Bread" },
  "🧀": { tint: "#ffe9a8", label: "Cheese" },
  "🥕": { tint: "#ffd9b0", label: "Carrot" },
  // Kitchen
  "☕": { tint: "#e5d3c0", label: "Coffee" },
  "🍵": { tint: "#d6ecd2", label: "Tea" },
  "🥤": { tint: "#d0e8ff", label: "Soda" },
  "🧂": { tint: "#eef0f2", label: "Salt" },
  "🫙": { tint: "#dfeef0", label: "Jar" },
  "🍯": { tint: "#ffe6a0", label: "Honey" },
  // Garden
  "🌻": { tint: "#fff0b8", label: "Sunflower" },
  "🌷": { tint: "#ffd6e8", label: "Tulip" },
  "🌵": { tint: "#d2eccb", label: "Cactus" },
  "🪴": { tint: "#dbe9cf", label: "Plant" },
  "🍄": { tint: "#ffd6cf", label: "Mushroom" },
  "🌿": { tint: "#d8ecd4", label: "Herb" },
  // Toy box
  "🧸": { tint: "#f0dcc4", label: "Bear" },
  "🚗": { tint: "#d3e4ff", label: "Car" },
  "🪀": { tint: "#ffd9d9", label: "Yo-yo" },
  "🎈": { tint: "#ffdce6", label: "Balloon" },
  "🎲": { tint: "#e3e3ef", label: "Dice" },
  "🧩": { tint: "#d5ece4", label: "Puzzle" },
  "🪁": { tint: "#d9e6ff", label: "Kite" },
  "🎨": { tint: "#f2e0c0", label: "Palette" },
  // Workshop
  "🔧": { tint: "#dfe3e8", label: "Wrench" },
  "🔩": { tint: "#e4e4e4", label: "Bolt" },
  "🔨": { tint: "#e9dcc6", label: "Hammer" },
  "🪛": { tint: "#dbe6ee", label: "Screwdriver" },
  "🔦": { tint: "#e0e7d8", label: "Torch" },
  "🧲": { tint: "#f2d5d0", label: "Magnet" },
  "💡": { tint: "#fff2c2", label: "Bulb" },
  "🔌": { tint: "#dde3ea", label: "Plug" },
};

export function itemTint(t: ItemType): string {
  return ITEM_TINTS[t]?.tint ?? "#e8e2d8";
}
export function itemLabel(t: ItemType): string {
  return ITEM_TINTS[t]?.label ?? t;
}

/** Theme pools per world (used by the generator to pick item types). */
export const WORLD_POOLS: Record<number, ItemType[]> = {
  1: ["🍎", "🍌", "🍇", "🍞", "🧀", "🥕"],
  2: ["☕", "🍵", "🥤", "🧂", "🫙", "🍯"],
  3: ["🌻", "🌷", "🌵", "🪴", "🍄", "🌿"],
  4: ["🧸", "🚗", "🪀", "🎈", "🎲", "🧩", "🪁", "🎨"],
  5: ["🔧", "🔩", "🔨", "🪛", "🔦", "🧲", "💡", "🔌"],
};

export const WORLDS: WorldMeta[] = [
  { id: 1, name: "Despensa", emoji: "🍎", accent: "#e8794b", wood: "#b07a4e", bg: ["#f7ecd9", "#efd9bd"] },
  { id: 2, name: "Cocina", emoji: "☕", accent: "#4b8fe8", wood: "#9c7a5c", bg: ["#e6eff7", "#cfe0f2"] },
  { id: 3, name: "Jardín", emoji: "🌷", accent: "#5aa96b", wood: "#8a7a55", bg: ["#e9f4e4", "#d3ead0"] },
  { id: 4, name: "Juguetes", emoji: "🧸", accent: "#c065c0", wood: "#a9744f", bg: ["#f4e8f7", "#e6d3f2"] },
  { id: 5, name: "Taller", emoji: "🔧", accent: "#5b6b7a", wood: "#7d7266", bg: ["#e9ecef", "#d5dbe1"] },
];

export function worldMeta(id: number): WorldMeta {
  return WORLDS.find((w) => w.id === id) ?? WORLDS[0];
}
