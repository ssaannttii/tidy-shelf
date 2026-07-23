import type { ItemType, LevelData } from "./types";

/**
 * A Cell is what occupies one position in a slot's stack. Most cells are plain
 * items; the rest are obstacles that gate the puzzle. Modifiers (frozen/chained)
 * travel WITH the item as it moves, which is why they live on the cell rather
 * than in a position-keyed sidecar.
 *
 * Backward compatibility: v1 levels store slots as ItemType[] (plain strings).
 * `boardFromLevel` converts each string into { k:"item", t }, so with no
 * obstacles present every function below behaves exactly like the v1 engine.
 */
export type Cell =
  | { k: "item"; t: ItemType; frozen?: number; chained?: boolean }
  | { k: "crate"; hits: number } // occupies a slot; breaks when a neighbour clears (or hammer)
  | { k: "gift"; drop: ItemType }; // opens when a neighbour clears, revealing `drop`

/** A slot is a stack of cells; the LAST element is the visible front. */
export type Slot = Cell[];

export interface Board {
  shelves: Slot[][]; // shelves[shelf][slot] = Slot
  slotsPerShelf: number;
  /** locked[shelf] = the whole shelf is inert until unlocked. */
  locked: boolean[];
  /** neighbours[shelf] = orthogonally-adjacent shelf indices (from the layout). */
  neighbors: number[][];
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

// ---- cell helpers --------------------------------------------------------

/** The front cell of a slot (or null if empty). */
export function front(slot: Slot): Cell | null {
  return slot.length ? slot[slot.length - 1] : null;
}

/** The item type a cell contributes to a match right now, or null if it can't
 *  be matched/grabbed (obstacle, or a frozen item). */
export function matchable(cell: Cell | null | undefined): ItemType | null {
  return cell && cell.k === "item" && !cell.frozen ? cell.t : null;
}

/** The matchable type of a slot's front (null when empty / not matchable). */
export function frontType(slot: Slot): ItemType | null {
  return matchable(front(slot));
}

/** Can the front of this slot be picked up and moved? */
export function isMovableFront(b: Board, shelf: number, slot: number): boolean {
  if (b.locked[shelf]) return false;
  const c = front(b.shelves[shelf]?.[slot]);
  if (!c || c.k !== "item") return false; // crate/gift can't be grabbed
  if (c.frozen) return false;
  if (c.chained) return false;
  return true;
}

/** Serialize a cell for the solver's canonical key. */
export function cellKey(c: Cell): string {
  if (c.k === "item") return c.t + (c.frozen ? "F" + c.frozen : "") + (c.chained ? "C" : "");
  if (c.k === "crate") return "K" + c.hits;
  return "G" + c.drop;
}

/** Orthogonal adjacency between shelves, derived from the tetris layout. */
export function computeNeighbors(layout: (number | null)[][], nShelves: number): number[][] {
  const pos = new Map<number, { r: number; c: number }>();
  for (let r = 0; r < layout.length; r++) {
    for (let c = 0; c < layout[r].length; c++) {
      const idx = layout[r][c];
      if (idx !== null && idx !== undefined) pos.set(idx, { r, c });
    }
  }
  const nb: number[][] = Array.from({ length: nShelves }, () => []);
  for (let a = 0; a < nShelves; a++) {
    const pa = pos.get(a);
    if (!pa) continue;
    for (let b = a + 1; b < nShelves; b++) {
      const pb = pos.get(b);
      if (!pb) continue;
      if (Math.abs(pa.r - pb.r) + Math.abs(pa.c - pb.c) === 1) {
        nb[a].push(b);
        nb[b].push(a);
      }
    }
  }
  return nb;
}

// ---- construction --------------------------------------------------------

interface LevelWithObstacles extends LevelData {
  /** optional v2 fields (added by later phases; absent = none) */
  locked?: number[];
}

export function boardFromLevel(level: LevelData): Board {
  const shelves: Slot[][] = level.shelves.map((shelf) =>
    shelf.map((slot) => slot.map((t) => ({ k: "item", t }) as Cell)),
  );
  const nShelves = shelves.length;
  const lockedList = (level as LevelWithObstacles).locked ?? [];
  const locked = new Array(nShelves).fill(false);
  for (const s of lockedList) if (s >= 0 && s < nShelves) locked[s] = true;
  return {
    shelves,
    slotsPerShelf: level.slotsPerShelf,
    locked,
    neighbors: computeNeighbors(level.layout, nShelves),
  };
}

export function cloneBoard(b: Board): Board {
  return {
    slotsPerShelf: b.slotsPerShelf,
    shelves: b.shelves.map((sh) => sh.map((sl) => sl.map((c) => ({ ...c }) as Cell))),
    locked: b.locked.slice(),
    neighbors: b.neighbors, // static — safe to share
  };
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

// ---- obstacle effects ----------------------------------------------------

/** After a shelf clears, poke its neighbours: break a crate, open a gift,
 *  thaw a frozen front, unchain, or unlock. Returns true if anything changed.
 *  With no obstacles present this is a no-op (v1 behaviour). */
function onShelfCleared(b: Board, s: number): boolean {
  let changed = false;
  for (const adj of b.neighbors[s]) {
    if (b.locked[adj]) {
      b.locked[adj] = false;
      changed = true;
    }
    for (const slot of b.shelves[adj]) {
      const c = front(slot);
      if (!c) continue;
      if (c.k === "crate") {
        c.hits -= 1;
        if (c.hits <= 0) slot.pop();
        changed = true;
      } else if (c.k === "gift") {
        slot[slot.length - 1] = { k: "item", t: c.drop };
        changed = true;
      } else if (c.k === "item" && c.frozen) {
        c.frozen -= 1;
        if (c.frozen <= 0) delete c.frozen;
        changed = true;
      } else if (c.k === "item" && c.chained) {
        c.chained = false;
        changed = true;
      }
    }
  }
  return changed;
}

/**
 * Repeatedly clear any (unlocked) shelf whose slots all show the same matchable
 * front. Mutates the board. Returns the clear events (cascades produce several,
 * with an increasing combo index).
 */
export function resolveClears(b: Board): ClearEvent[] {
  const events: ClearEvent[] = [];
  let combo = 0;
  let changed = true;
  while (changed) {
    changed = false;
    for (let s = 0; s < b.shelves.length; s++) {
      if (b.locked[s]) continue;
      const shelf = b.shelves[s];
      const f0 = frontType(shelf[0]);
      if (f0 === null) continue;
      let same = true;
      for (let i = 0; i < shelf.length; i++) {
        if (frontType(shelf[i]) !== f0) {
          same = false;
          break;
        }
      }
      if (same) {
        for (let i = 0; i < shelf.length; i++) shelf[i].pop();
        combo += 1;
        events.push({ shelf: s, type: f0, combo });
        onShelfCleared(b, s);
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
  if (b.locked[m.toShelf]) return false; // can't drop into a locked shelf
  if (!isMovableFront(b, m.fromShelf, m.fromSlot)) return false;
  return true;
}

/** Apply a move to a CLONE and resolve clears. Throws on illegal move. */
export function applyMove(b: Board, m: Move): { board: Board; clears: ClearEvent[] } {
  const nb = cloneBoard(b);
  const cell = nb.shelves[m.fromShelf][m.fromSlot].pop();
  if (cell === undefined) throw new Error("illegal move: empty source slot");
  nb.shelves[m.toShelf][m.toSlot].push(cell);
  const clears = resolveClears(nb);
  return { board: nb, clears };
}

/** All empty-slot indices — for building legal destinations. */
export function emptySlots(b: Board): { shelf: number; slot: number }[] {
  const out: { shelf: number; slot: number }[] = [];
  for (let s = 0; s < b.shelves.length; s++) {
    if (b.locked[s]) continue;
    for (let j = 0; j < b.shelves[s].length; j++) {
      if (b.shelves[s][j].length === 0) out.push({ shelf: s, slot: j });
    }
  }
  return out;
}

/** Is the board dead (not solved and no legal move exists)? */
export function isStuck(b: Board): boolean {
  if (isSolved(b)) return false;
  // need at least one empty slot in an unlocked shelf...
  const hasEmpty = emptySlots(b).length > 0;
  if (!hasEmpty) return true;
  // ...and at least one movable front to put there.
  for (let s = 0; s < b.shelves.length; s++) {
    for (let j = 0; j < b.shelves[s].length; j++) {
      if (b.shelves[s][j].length === 0) continue;
      if (isMovableFront(b, s, j)) return false;
    }
  }
  return true;
}
