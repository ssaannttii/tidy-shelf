/**
 * Deterministic level generator for Tidy Shelf.
 *
 * Builds a curated pack of levels across 5 worlds, verifies each is solvable
 * with the real game solver, records the solver's par, derives a time limit,
 * and lays out an irregular cabinet grid. Output: src/data/levels.json.
 *
 * Run with:  npm run gen:levels
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { boardFromLevel, resolveClears, cloneBoard, computeNeighbors } from "../src/lib/engine";
import { solve } from "../src/lib/solver";
import { WORLD_POOLS } from "../src/lib/items";
import type { Difficulty, ItemType, LevelData } from "../src/lib/types";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---- seeded RNG (mulberry32) ---------------------------------------------
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rnd: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---- level spec ----------------------------------------------------------
interface Spec {
  world: number;
  types: number; // distinct item types (each contributes one triple)
  shelves: number;
  maxDepth: number;
  emptySlots: number; // buffer of empty slots
  difficulty: Difficulty;
  crates: number; // obstacles: crates placed on top of slots
  locked: number; // obstacles: shelves that start locked
}

/**
 * Gentle obstacle introduction, one mechanic at a time:
 *  W1 none (teach base) · W2 crates (from mid-world) · W3+ crates + a locked
 *  shelf · W5 the wringer. Placement is still verified solvable per level.
 */
function obstacleCounts(world: number, idx: number): { crates: number; locked: number } {
  switch (world) {
    case 1:
      return { crates: 0, locked: 0 };
    case 2:
      return { crates: idx < 2 ? 0 : idx < 6 ? 1 : 2, locked: idx >= 5 ? 1 : 0 };
    case 3:
      return { crates: idx < 2 ? 1 : 2, locked: 1 };
    case 4:
      return { crates: 2, locked: 1 };
    default:
      return { crates: idx < 4 ? 2 : 3, locked: idx >= 3 ? 2 : 1 };
  }
}

const SLOTS = 3;

// Difficulty curve: 8 levels per world, 5 worlds = 40 levels.
function buildSpecs(): Spec[] {
  const specs: Spec[] = [];
  const perWorld: Omit<Spec, "world" | "crates" | "locked">[][] = [
    // World 1 — Pantry (teach the basics)
    [
      { types: 2, shelves: 4, maxDepth: 1, emptySlots: 6, difficulty: "easy" },
      { types: 3, shelves: 4, maxDepth: 1, emptySlots: 3, difficulty: "easy" },
      { types: 3, shelves: 5, maxDepth: 1, emptySlots: 6, difficulty: "easy" },
      { types: 4, shelves: 5, maxDepth: 1, emptySlots: 3, difficulty: "easy" },
      { types: 3, shelves: 4, maxDepth: 2, emptySlots: 4, difficulty: "easy" },
      { types: 4, shelves: 5, maxDepth: 2, emptySlots: 4, difficulty: "medium" },
      { types: 5, shelves: 6, maxDepth: 1, emptySlots: 3, difficulty: "medium" },
      { types: 5, shelves: 6, maxDepth: 2, emptySlots: 4, difficulty: "medium" },
    ],
    // World 2 — Kitchen
    [
      { types: 3, shelves: 4, maxDepth: 2, emptySlots: 3, difficulty: "easy" },
      { types: 4, shelves: 5, maxDepth: 2, emptySlots: 4, difficulty: "medium" },
      { types: 4, shelves: 5, maxDepth: 2, emptySlots: 3, difficulty: "medium" },
      { types: 5, shelves: 6, maxDepth: 2, emptySlots: 4, difficulty: "medium" },
      { types: 5, shelves: 6, maxDepth: 2, emptySlots: 3, difficulty: "medium" },
      { types: 4, shelves: 5, maxDepth: 3, emptySlots: 4, difficulty: "hard" },
      { types: 6, shelves: 7, maxDepth: 2, emptySlots: 4, difficulty: "hard" },
      { types: 6, shelves: 7, maxDepth: 2, emptySlots: 3, difficulty: "hard" },
    ],
    // World 3 — Garden
    [
      { types: 4, shelves: 5, maxDepth: 2, emptySlots: 3, difficulty: "medium" },
      { types: 5, shelves: 6, maxDepth: 2, emptySlots: 3, difficulty: "medium" },
      { types: 5, shelves: 6, maxDepth: 3, emptySlots: 4, difficulty: "hard" },
      { types: 6, shelves: 7, maxDepth: 2, emptySlots: 4, difficulty: "hard" },
      { types: 6, shelves: 7, maxDepth: 2, emptySlots: 3, difficulty: "hard" },
      { types: 5, shelves: 6, maxDepth: 3, emptySlots: 3, difficulty: "hard" },
      { types: 6, shelves: 7, maxDepth: 3, emptySlots: 4, difficulty: "hard" },
      { types: 6, shelves: 8, maxDepth: 3, emptySlots: 5, difficulty: "hard" },
    ],
    // World 4 — Toy Box
    [
      { types: 5, shelves: 6, maxDepth: 2, emptySlots: 3, difficulty: "medium" },
      { types: 6, shelves: 7, maxDepth: 2, emptySlots: 3, difficulty: "hard" },
      { types: 6, shelves: 7, maxDepth: 3, emptySlots: 4, difficulty: "hard" },
      { types: 7, shelves: 8, maxDepth: 2, emptySlots: 4, difficulty: "hard" },
      { types: 7, shelves: 8, maxDepth: 3, emptySlots: 4, difficulty: "expert" },
      { types: 6, shelves: 7, maxDepth: 3, emptySlots: 3, difficulty: "expert" },
      { types: 7, shelves: 8, maxDepth: 3, emptySlots: 3, difficulty: "expert" },
      { types: 8, shelves: 9, maxDepth: 3, emptySlots: 4, difficulty: "expert" },
    ],
    // World 5 — Workshop (the wringer)
    [
      { types: 6, shelves: 7, maxDepth: 2, emptySlots: 3, difficulty: "hard" },
      { types: 6, shelves: 7, maxDepth: 3, emptySlots: 3, difficulty: "expert" },
      { types: 7, shelves: 8, maxDepth: 3, emptySlots: 4, difficulty: "expert" },
      { types: 7, shelves: 8, maxDepth: 3, emptySlots: 3, difficulty: "expert" },
      { types: 8, shelves: 9, maxDepth: 3, emptySlots: 4, difficulty: "expert" },
      { types: 8, shelves: 9, maxDepth: 3, emptySlots: 3, difficulty: "expert" },
      { types: 8, shelves: 9, maxDepth: 3, emptySlots: 3, difficulty: "expert" },
      { types: 8, shelves: 10, maxDepth: 3, emptySlots: 4, difficulty: "expert" },
    ],
  ];
  for (let w = 0; w < perWorld.length; w++) {
    let idx = 0;
    for (const s of perWorld[w]) {
      specs.push({ world: w + 1, ...s, ...obstacleCounts(w + 1, idx) });
      idx++;
    }
  }
  return specs;
}

/**
 * Try to place `spec.crates` crates (on top of slots) and `spec.locked` locked
 * shelves so the level stays solvable with the obstacle-aware solver. Mutates
 * `level.crates` / `level.locked` on success; leaves them undefined on failure.
 * Returns the solver result for the obstacled board (or null if none worked).
 */
function placeObstacles(level: LevelData, spec: Spec, rnd: () => number, basePar: number) {
  if (spec.crates <= 0 && spec.locked <= 0) return null;
  const n = level.shelves.length;
  const neighbors = computeNeighbors(level.layout, n);
  const withNeighbor: number[] = [];
  for (let s = 0; s < n; s++) if (neighbors[s].length > 0) withNeighbor.push(s);

  // Obstacles add moves, but must not explode the puzzle into a rambling mess
  // (which happens when BFS gives up and greedy returns a very long path).
  const tightCap = basePar * 2 + 8;
  const looseCap = basePar * 3 + 12;
  let best: { crates?: LevelData["crates"]; locked?: number[]; res: ReturnType<typeof solve> } | null = null;

  for (let attempt = 0; attempt < 60; attempt++) {
    const crates: NonNullable<LevelData["crates"]> = [];
    const nonEmpty: { shelf: number; slot: number }[] = [];
    for (const s of withNeighbor)
      for (let j = 0; j < level.shelves[s].length; j++)
        if (level.shelves[s][j].length > 0) nonEmpty.push({ shelf: s, slot: j });
    for (const cand of shuffle(nonEmpty, rnd).slice(0, spec.crates)) {
      crates.push({ shelf: cand.shelf, slot: cand.slot, hits: 1 });
    }
    const crateShelves = new Set(crates.map((c) => c.shelf));
    const locked = shuffle(withNeighbor.filter((s) => !crateShelves.has(s)), rnd).slice(0, spec.locked);

    level.crates = crates.length ? crates : undefined;
    level.locked = locked.length ? locked : undefined;

    const res = solve(boardFromLevel(level), 300000);
    if (!res.solvable) continue;
    if (res.par <= tightCap) return res; // great — accept immediately
    if (!best || res.par < best.res.par) best = { crates: level.crates, locked: level.locked, res };
  }

  // no tight placement found; take the least-bad one if it's still reasonable
  if (best && best.res.par <= looseCap) {
    level.crates = best.crates;
    level.locked = best.locked;
    return best.res;
  }
  level.crates = undefined;
  level.locked = undefined;
  return null;
}

// ---- irregular cabinet layout -------------------------------------------
function makeLayout(nShelves: number, rnd: () => number): (number | null)[][] {
  const cols = nShelves <= 4 ? 2 : nShelves <= 8 ? 3 : 3;
  const rows = Math.ceil(nShelves / cols);
  const total = rows * cols;
  const gaps = total - nShelves;
  // grid of booleans: true = shelf, false = gap
  const cells: boolean[] = new Array(total).fill(true);
  // choose gap positions, avoiding leaving any row completely empty
  const gapPositions: number[] = [];
  const candidates = shuffle(
    Array.from({ length: total }, (_, i) => i),
    rnd,
  );
  for (const c of candidates) {
    if (gapPositions.length >= gaps) break;
    // don't blank an entire row
    const row = Math.floor(c / cols);
    const rowCells = [];
    for (let k = 0; k < cols; k++) rowCells.push(row * cols + k);
    const remainingInRow = rowCells.filter((rc) => cells[rc]).length;
    if (remainingInRow <= 1) continue;
    cells[c] = false;
    gapPositions.push(c);
  }
  // assign shelf indices in reading order to shelf cells
  let idx = 0;
  const grid: (number | null)[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: (number | null)[] = [];
    for (let c = 0; c < cols; c++) {
      const cell = r * cols + c;
      row.push(cells[cell] ? idx++ : null);
    }
    grid.push(row);
  }
  return grid;
}

// ---- board generation ----------------------------------------------------
function hasInitialClear(shelves: ItemType[][][]): boolean {
  // a shelf is pre-cleared if all its slots are non-empty with equal fronts
  for (const shelf of shelves) {
    const fronts = shelf.map((sl) => (sl.length ? sl[sl.length - 1] : null));
    if (fronts.every((f) => f !== null && f === fronts[0])) return true;
  }
  return false;
}

function generateBoard(spec: Spec, pool: ItemType[], rnd: () => number): { shelves: ItemType[][][]; types: ItemType[] } {
  const totalSlots = spec.shelves * SLOTS;
  const chosenTypes = shuffle(pool, rnd).slice(0, spec.types);
  // one triple per type
  const items: ItemType[] = [];
  for (const t of chosenTypes) for (let k = 0; k < 3; k++) items.push(t);
  const N = items.length;

  let emptySlots = spec.emptySlots;
  let maxDepth = spec.maxDepth;
  // feasibility: slots we fill must hold all items within maxDepth
  let slotsToUse = totalSlots - emptySlots;
  while (slotsToUse * maxDepth < N) {
    if (emptySlots > 1) emptySlots -= 1;
    else maxDepth += 1;
    slotsToUse = totalSlots - emptySlots;
  }
  slotsToUse = Math.min(slotsToUse, N); // each used slot needs >=1 item

  const shuffledItems = shuffle(items, rnd);

  // distribute N items across slotsToUse slots as evenly as possible
  const depths: number[] = new Array(slotsToUse).fill(0);
  for (let i = 0; i < N; i++) depths[i % slotsToUse]++;
  // cap depth, spilling overflow to slots with room
  for (let i = 0; i < slotsToUse; i++) {
    while (depths[i] > maxDepth) {
      const target = depths.findIndex((d, j) => j !== i && d < maxDepth);
      if (target === -1) {
        maxDepth += 1;
        break;
      }
      depths[i]--;
      depths[target]++;
    }
  }

  // build slot contents (front = last)
  const slotContents: ItemType[][] = [];
  let p = 0;
  for (let i = 0; i < slotsToUse; i++) {
    const slot: ItemType[] = [];
    for (let d = 0; d < depths[i]; d++) slot.push(shuffledItems[p++]);
    slotContents.push(slot);
  }
  while (slotContents.length < totalSlots) slotContents.push([]);

  // scatter empties by shuffling all slot positions, then chunk into shelves
  const scattered = shuffle(slotContents, rnd);
  const shelves: ItemType[][][] = [];
  for (let s = 0; s < spec.shelves; s++) {
    shelves.push(scattered.slice(s * SLOTS, s * SLOTS + SLOTS));
  }
  return { shelves, types: chosenTypes };
}

function timeLimitFor(par: number, N: number, difficulty: Difficulty): number {
  const base = par * 4 + N * 2 + 30;
  const mult = difficulty === "easy" ? 1.15 : difficulty === "medium" ? 1.05 : 1.0;
  return Math.max(60, Math.min(360, Math.round((base * mult) / 5) * 5));
}

// ---- main ----------------------------------------------------------------
function main() {
  const specs = buildSpecs();
  const levels: LevelData[] = [];
  let id = 0;

  for (let si = 0; si < specs.length; si++) {
    const spec = specs[si];
    const pool = WORLD_POOLS[spec.world];
    let built: LevelData | null = null;

    for (let attempt = 0; attempt < 600 && !built; attempt++) {
      const rnd = mulberry32(1000 + si * 997 + attempt * 31 + 7);
      const { shelves, types } = generateBoard(spec, pool, rnd);
      if (hasInitialClear(shelves)) continue;

      const level: LevelData = {
        id: id + 1,
        world: spec.world,
        name: `${["Despensa", "Cocina", "Jardín", "Juguetes", "Taller"][spec.world - 1]} ${
          ((id) % 8) + 1
        }`,
        difficulty: spec.difficulty,
        slotsPerShelf: SLOTS,
        shelves,
        layout: makeLayout(spec.shelves, mulberry32(500 + si * 13 + attempt)),
        types,
        timeLimit: 0,
        par: 0,
        parExact: false,
      };

      const board = boardFromLevel(level);
      // reject if a stray cascade already exists
      const test = cloneBoard(board);
      if (resolveClears(test).length > 0) continue;

      const res = solve(board, 220000);
      if (!res.solvable) continue;

      const N = types.length * 3;
      // place crates / locked shelves (kept solvable), then recompute par + time
      const obsRes = placeObstacles(level, spec, rnd, res.par);
      const finalRes = obsRes ?? res;
      const extra = level.crates?.length ?? 0;
      level.par = finalRes.par;
      level.parExact = finalRes.exact;
      level.timeLimit = timeLimitFor(finalRes.par, N + extra, spec.difficulty);
      built = level;
    }

    if (!built) {
      console.error(`FAILED to build a solvable level for spec ${si} (world ${spec.world}). Relaxing.`);
      // last-resort relaxation: more buffer, less depth
      const relaxed: Spec = { ...spec, emptySlots: spec.emptySlots + 2, maxDepth: Math.max(1, spec.maxDepth - 1) };
      const rnd = mulberry32(99999 + si);
      const { shelves, types } = generateBoard(relaxed, pool, rnd);
      const level: LevelData = {
        id: id + 1,
        world: spec.world,
        name: `${["Despensa", "Cocina", "Jardín", "Juguetes", "Taller"][spec.world - 1]} ${(id % 8) + 1}`,
        difficulty: spec.difficulty,
        slotsPerShelf: SLOTS,
        shelves,
        layout: makeLayout(relaxed.shelves, mulberry32(777 + si)),
        types,
        timeLimit: 0,
        par: 0,
        parExact: false,
      };
      const res = solve(boardFromLevel(level), 300000);
      level.par = res.solvable ? res.par : types.length * 4;
      level.parExact = res.exact;
      level.timeLimit = timeLimitFor(level.par, types.length * 3, spec.difficulty);
      built = level;
    }

    id++;
    levels.push(built);
    const obs = `${built.crates?.length ? `${built.crates.length}📦` : ""}${built.locked?.length ? `${built.locked.length}🔒` : ""}`;
    console.log(
      `L${built.id} w${built.world} ${built.difficulty}\t${built.types.length} types\t${built.shelves.length} shelves\tpar ${built.par}${built.parExact ? "" : "~"}\t${built.timeLimit}s\t${obs}`,
    );
  }

  const out = join(__dirname, "..", "src", "data", "levels.json");
  writeFileSync(out, JSON.stringify(levels, null, 2));
  console.log(`\nWrote ${levels.length} levels to ${out}`);
}

main();
