/**
 * Headless correctness test: for every level, ask the solver for a solution,
 * replay it through the real engine, and assert the board ends solved.
 * Also sanity-checks item counts and that no level starts pre-cleared.
 */
import { boardFromLevel, applyMove, isSolved, resolveClears, cloneBoard, itemsRemaining } from "../src/lib/engine";
import { solve } from "../src/lib/solver";
import { LEVELS } from "../src/lib/levels";
import type { Move } from "../src/lib/engine";

let failures = 0;
let exact = 0;

for (const level of LEVELS) {
  const board = boardFromLevel(level);
  const items = itemsRemaining(board);

  // no pre-existing clears at start
  const startClone = cloneBoard(board);
  const startClears = resolveClears(startClone);
  if (startClears.length > 0) {
    console.error(`L${level.id}: starts with ${startClears.length} auto-clears!`);
    failures++;
  }
  if (items % 3 !== 0) {
    console.error(`L${level.id}: item count ${items} not divisible by 3`);
    failures++;
  }

  const res = solve(board, 250000);
  if (res.exact) exact++;
  if (!res.solvable) {
    console.error(`L${level.id}: solver reports UNSOLVABLE`);
    failures++;
    continue;
  }

  // replay the solution
  let b = board;
  let ok = true;
  for (const mv of res.solution as Move[]) {
    const src = b.shelves[mv.fromShelf]?.[mv.fromSlot];
    const dst = b.shelves[mv.toShelf]?.[mv.toSlot];
    if (!src || src.length === 0 || !dst || dst.length !== 0) {
      console.error(`L${level.id}: illegal move in solution`, mv);
      ok = false;
      break;
    }
    b = applyMove(b, mv).board;
  }
  if (ok && !isSolved(b)) {
    console.error(`L${level.id}: replaying solution did NOT solve the board`);
    failures++;
  } else if (!ok) {
    failures++;
  }
}

console.log(`\nChecked ${LEVELS.length} levels · exact-par: ${exact} · failures: ${failures}`);
if (failures > 0) process.exit(1);
console.log("ALL LEVELS SOLVABLE AND VALID ✓");
