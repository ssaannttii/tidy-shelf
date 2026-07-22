import type { ItemType, LevelData } from "./types";

/** A slot is a stack of items; the LAST element is the visible front item. */
export type Slot = ItemType[];

export interface Board {
  shelves: Slot[][]; // shelves[shelf][slot] = Slot
  slotsPerShelf: number;
}

export interface Move {
  fromShelf: number;
  fromSlot: number;
  toShelf: number;
  toSlot: number;
}

export interface ClearEvent {
  shelf: number;
  type: ItemType;
  combo: number; // 1-based position within a single resolveClears cascade
}

export function boardFromLevel(level: LevelData): Board {
  return {
    slotsPerShelf: level.slotsPerShelf,
    shelves: level.shelves.map((shelf) => shelf.map((slot) => slot.slice())),
  };
}

export function cloneBoard(b: Board): Board {
  return {
    slotsPerShelf: b.slotsPerShelf,
    shelves: b.shelves.map((sh) => sh.map((sl) => sl.slice())),
  };
}

export function front(slot: Slot): ItemType | null {
  return slot.length ? slot[slot.length - 1] : null;
}

export function isSolved(b: Board): boolean {
  for (const sh of b.shelves) for (const sl of sh) if (sl.length) return false;
  return true;
}

export function itemsRemaining(b: Board): number {
  let n = 0;
  for (const sh of b.shelves) for (const sl of sh) n += sl.length;
  return n;
}

/**
 * Repeatedly clear any shelf whose slots are all filled with the same front
 * item. Mutates the board. Returns the list of clear events (cascades produce
 * multiple, with an increasing combo index).
 */
export function resolveClears(b: Board): ClearEvent[] {
  const events: ClearEvent[] = [];
  let combo = 0;
  let changed = true;
  while (changed) {
    changed = false;
    for (let s = 0; s < b.shelves.length; s++) {
      const shelf = b.shelves[s];
      const f0 = front(shelf[0]);
      if (f0 === null) continue;
      let same = true;
      for (let i = 0; i < shelf.length; i++) {
        if (front(shelf[i]) !== f0) {
          same = false;
          break;
        }
      }
      if (same) {
        for (let i = 0; i < shelf.length; i++) shelf[i].pop();
        combo += 1;
        events.push({ shelf: s, type: f0, combo });
        changed = true;
      }
    }
  }
  return events;
}

export function isLegalMove(b: Board, m: Move): boolean {
  if (m.fromShelf === m.toShelf && m.fromSlot === m.toSlot) return false;
  const src = b.shelves[m.fromShelf]?.[m.fromSlot];
  const dst = b.shelves[m.toShelf]?.[m.toSlot];
  if (!src || !dst) return false;
  if (src.length === 0) return false;
  if (dst.length !== 0) return false;
  return true;
}

/** Apply a move to a CLONE and resolve clears. Throws on illegal move. */
export function applyMove(b: Board, m: Move): { board: Board; clears: ClearEvent[] } {
  const nb = cloneBoard(b);
  const item = nb.shelves[m.fromShelf][m.fromSlot].pop();
  if (item === undefined) throw new Error("illegal move: empty source slot");
  nb.shelves[m.toShelf][m.toSlot].push(item);
  const clears = resolveClears(nb);
  return { board: nb, clears };
}

/** All empty-slot indices (first per shelf) — for building legal destinations. */
export function emptySlots(b: Board): { shelf: number; slot: number }[] {
  const out: { shelf: number; slot: number }[] = [];
  for (let s = 0; s < b.shelves.length; s++) {
    for (let j = 0; j < b.shelves[s].length; j++) {
      if (b.shelves[s][j].length === 0) out.push({ shelf: s, slot: j });
    }
  }
  return out;
}

/** Is the board in a dead state (no legal moves and not solved)? */
export function isStuck(b: Board): boolean {
  if (isSolved(b)) return false;
  const hasEmpty = b.shelves.some((sh) => sh.some((sl) => sl.length === 0));
  const hasItem = b.shelves.some((sh) => sh.some((sl) => sl.length > 0));
  // A move is possible iff there is at least one empty slot and one item, and
  // the item is not the only occupant with every empty slot on its own shelf
  // being its own — in practice, empty + item elsewhere always yields a move.
  if (!hasEmpty || !hasItem) return true;
  for (let s = 0; s < b.shelves.length; s++) {
    for (let j = 0; j < b.shelves[s].length; j++) {
      if (b.shelves[s][j].length === 0) continue;
      for (let t = 0; t < b.shelves.length; t++) {
        for (let k = 0; k < b.shelves[t].length; k++) {
          if (b.shelves[t][k].length === 0 && !(t === s && k === j)) return false;
        }
      }
    }
  }
  return true;
}
