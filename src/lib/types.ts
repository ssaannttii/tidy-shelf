// Core data types for Tidy Shelf.
// An ItemType is simply the emoji string used as a stable key.
export type ItemType = string;

export type Difficulty = "easy" | "medium" | "hard" | "expert";

/**
 * A level, as authored/generated and stored in data/levels.json.
 *
 * shelves[shelfIndex][slotIndex] is a stack of items where the LAST element
 * is the visible "front" item (what the player can grab). Deeper items are
 * hidden behind it and are revealed as the front is removed.
 *
 * `layout` positions each shelf on a visual grid so the cabinet can take an
 * irregular, tetris-like shape (with gaps), matching the genre. Each cell is
 * a shelf index or null for an empty gap.
 */
export interface LevelData {
  id: number;
  world: number;
  name: string;
  difficulty: Difficulty;
  slotsPerShelf: number;
  shelves: ItemType[][][];
  layout: (number | null)[][];
  types: ItemType[];
  /** Countdown for timed mode, in seconds. */
  timeLimit: number;
  /** Reference move count from the solver (used for star thresholds). */
  par: number;
  /** Whether par is exact (BFS optimal) or an upper bound (DFS). */
  parExact: boolean;

  // ---- optional obstacles (v2; absent = none, so v1 levels are unchanged) ----
  /** Shelves that start locked (inert until a neighbour clears). */
  locked?: number[];
  /** Crates placed on top of a slot; break when a neighbour clears (or hammer). */
  crates?: { shelf: number; slot: number; hits?: number }[];
  /** Gift boxes; open into `drop` when a neighbour clears. */
  gifts?: { shelf: number; slot: number; drop: ItemType }[];
  /** Frozen fronts; thaw after `n` neighbour clears (default 1). */
  frozen?: { shelf: number; slot: number; n?: number }[];
  /** Chained fronts; can't be moved until a neighbour clears. */
  chained?: { shelf: number; slot: number }[];
}

export interface WorldMeta {
  id: number;
  name: string;
  emoji: string;
  accent: string;
  wood: string;
  bg: [string, string];
}
