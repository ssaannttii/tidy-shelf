/**
 * Locked-shelf deadlock guarantee.
 *
 * Real bug observed in play (L33, screenshot): the player cleared 17/20 goods,
 * the last 3 sat inside a chained shelf, and the lock's only key ("clear a
 * neighbour") was gone — the neighbours had been emptied by moving goods out,
 * never by completing a trio in them. Dead level, no feedback, and the hammer
 * refused locked shelves so the "try a booster" hint was a lie.
 *
 * Guarantee now enforced by Board.unlockBelow / applyAutoUnlocks: locks open on
 * their own once FREE material (cells outside every lock) runs low, so the board
 * can never end up with everything sealed. These tests drive the engine into
 * exactly that end-state and assert the locks open.
 */
import {
  boardFromLevel, resolveClears, applyAutoUnlocks, itemsRemaining, isStuck, isSolved,
  cloneBoard, type Board,
} from "../src/lib/engine";
import { LEVELS } from "../src/lib/levels";

let fail = 0, checked = 0;
const bad = (m: string) => { console.error("  ✗ " + m); fail++; };

/** empty every shelf that is NOT locked — the worst case the player can create */
function stripFreeMaterial(b: Board) {
  for (let s = 0; s < b.shelves.length; s++)
    if (!b.locked[s]) for (const sl of b.shelves[s]) sl.length = 0;
}

// ---- 1. every real level with locks -------------------------------------
for (const lv of LEVELS) {
  const b = boardFromLevel(lv);
  if (!b.locked.some(Boolean)) continue;
  checked++;
  stripFreeMaterial(b);
  resolveClears(b);            // engine reacts to the new board state
  applyAutoUnlocks(b);
  if (b.locked.some(Boolean))
    bad(`L${lv.id}: all free material gone but a shelf is STILL locked (${JSON.stringify(b.locked)}, ${itemsRemaining(b)} sealed cells)`);
  else if (!isSolved(b) && isStuck(b))
    bad(`L${lv.id}: unlocked but board is stuck with ${itemsRemaining(b)} cells left`);
}

// ---- 2. synthetic: TWO locks, nothing outside (per-shelf thresholds fail) --
{
  const mk = (t: string) => [{ k: "item", t } as const];
  const b: Board = {
    slotsPerShelf: 3,
    shelves: [
      [mk("🍎"), mk("🍌"), mk("🍇")], // locked A — 3 cells
      [mk("🍎"), mk("🍌"), mk("🍇")], // locked B — 3 cells
      [[], [], []],                    // free, empty
    ],
    locked: [true, true, false],
    neighbors: [[2], [2], [0, 1]],
    unlockBelow: [6, 6],
  };
  applyAutoUnlocks(b);
  if (b.locked[0] || b.locked[1])
    bad(`two-lock case: 6 cells sealed across 2 locks, 0 free, but locks stayed shut ${JSON.stringify(b.locked)}`);
}

// ---- 3. a lock whose neighbours were emptied without ever clearing --------
{
  const mk = (t: string) => [{ k: "item", t } as const];
  const b: Board = {
    slotsPerShelf: 3,
    shelves: [
      [mk("🍎"), mk("🍎"), mk("🍎")], // locked, 3 identical (would clear if open)
      [[], [], []],                    // neighbour, emptied by moving goods away
    ],
    locked: [true, false],
    neighbors: [[1], [0]],
    unlockBelow: [6],
  };
  const ev = resolveClears(b);
  if (b.locked[0]) bad("stranded lock: neighbour emptied without clearing, lock never opened");
  else if (!ev.length || !isSolved(b)) bad("stranded lock opened but the matching trio did not clear");
}

console.log(`\nLocked-shelf deadlock guarantee: ${checked} real levels + 2 synthetic cases · failures: ${fail}`);
if (fail) { console.error("DEADLOCK GUARANTEE BROKEN ✗"); process.exit(1); }
console.log("LOCKS ALWAYS OPEN BEFORE THE BOARD CAN DIE ✓");
