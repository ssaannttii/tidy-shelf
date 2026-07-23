/**
 * Unit tests for the cell-aware engine (Fase 1). Covers plain clears/cascades
 * and every obstacle effect, even though no shipped level uses obstacles yet.
 * Run: npx tsx scripts/engine.test.ts
 */
import {
  applyMove,
  cloneBoard,
  front,
  frontType,
  isLegalMove,
  isMovableFront,
  isSolved,
  resolveClears,
  type Board,
  type Cell,
} from "../src/lib/engine";

let fails = 0;
function ok(cond: boolean, msg: string) {
  if (!cond) {
    console.error("  ✗ " + msg);
    fails++;
  } else {
    console.log("  ✓ " + msg);
  }
}

const I = (t: string, extra: Partial<Cell> = {}): Cell => ({ k: "item", t, ...extra }) as Cell;
const CRATE = (hits = 1): Cell => ({ k: "crate", hits });
const GIFT = (drop: string): Cell => ({ k: "gift", drop });

/** Build a 2-shelf board where shelf 0 and shelf 1 are neighbours. */
function twoShelf(s0: Cell[][], s1: Cell[][], locked = [false, false]): Board {
  return { shelves: [s0, s1], slotsPerShelf: 3, locked: locked.slice(), neighbors: [[1], [0]] };
}

console.log("basic clears");
{
  const b: Board = { shelves: [[[I("A")], [I("A")], [I("A")]]], slotsPerShelf: 3, locked: [false], neighbors: [[]] };
  const ev = resolveClears(b);
  ok(ev.length === 1 && isSolved(b), "3 equal fronts clear the shelf");
}
{
  // cascade: clearing reveals a second matching layer
  const b: Board = {
    shelves: [[[I("B"), I("A")], [I("B"), I("A")], [I("B"), I("A")]]],
    slotsPerShelf: 3,
    locked: [false],
    neighbors: [[]],
  };
  const ev = resolveClears(b);
  ok(ev.length === 2 && ev[1].combo === 2 && isSolved(b), "cascade produces combo 2 and solves");
}

console.log("crate");
{
  const b = twoShelf(
    [[I("A")], [I("A")], [I("A")]], // shelf 0 clears
    [[I("Z"), CRATE(1)], [I("B")], [I("C")]], // crate on top of Z
  );
  resolveClears(b);
  const f = front(b.shelves[1][0]);
  ok(f?.k === "item" && f.t === "Z", "crate breaks when a neighbour clears, revealing the item beneath");
}
{
  const b = twoShelf([[I("A")], [I("A")], [I("A")]], [[CRATE(2)], [I("B")], [I("C")]]);
  resolveClears(b);
  const f = front(b.shelves[1][0]);
  ok(f?.k === "crate" && f.hits === 1, "a 2-hit crate only loses one hit per neighbour clear");
}

console.log("gift");
{
  const b = twoShelf([[I("A")], [I("A")], [I("A")]], [[GIFT("B")], [I("C")], [I("D")]]);
  resolveClears(b);
  const f = front(b.shelves[1][0]);
  ok(f?.k === "item" && f.t === "B", "gift opens into its drop item when a neighbour clears");
}

console.log("frozen");
{
  const b = twoShelf([[I("A")], [I("A")], [I("A")]], [[I("B", { frozen: 1 })], [I("C")], [I("D")]]);
  ok(frontType(b.shelves[1][0]) === null, "frozen front is not matchable");
  ok(!isMovableFront(b, 1, 0), "frozen front is not movable");
  resolveClears(b);
  const f = front(b.shelves[1][0]);
  ok(f?.k === "item" && f.frozen === undefined, "frozen thaws after a neighbour clears");
  ok(isMovableFront(b, 1, 0), "thawed item is movable");
}

console.log("chained");
{
  const b = twoShelf([[I("A")], [I("A")], [I("A")]], [[I("B", { chained: true })], [I("C")], [I("D")]]);
  ok(frontType(b.shelves[1][0]) === "B", "chained item still counts as a matchable front in place");
  ok(!isMovableFront(b, 1, 0), "chained front cannot be moved");
  resolveClears(b);
  ok(isMovableFront(b, 1, 0), "chain releases after a neighbour clears");
}

console.log("locked shelf");
{
  const b = twoShelf(
    [[I("A")], [I("A")], [I("A")]],
    [[I("B")], [I("B")], [I("B")]], // would clear, but it's locked
    [false, true],
  );
  const ev = resolveClears(b);
  // shelf 0 clears (unlocks shelf 1 as its neighbour), then shelf 1 clears too
  ok(ev.length === 2, "locked shelf does not clear until a neighbour unlocks it");
  ok(b.locked[1] === false, "locked shelf unlocks when a neighbour clears");
  ok(isSolved(b), "unlocked shelf then clears");
}
{
  const b = twoShelf([[I("A")], [], [I("A")]], [[I("B")], [I("B")], [I("B")]], [false, true]);
  ok(!isLegalMove(b, { fromShelf: 0, fromSlot: 0, toShelf: 1, toSlot: 0 }), "cannot target a locked shelf");
}

console.log("legal moves");
{
  const b = twoShelf([[I("A")], [], [I("C")]], [[I("A")], [I("B")], [I("C")]]);
  ok(isLegalMove(b, { fromShelf: 0, fromSlot: 0, toShelf: 0, toSlot: 1 }), "move movable front to empty slot is legal");
  ok(!isLegalMove(b, { fromShelf: 0, fromSlot: 0, toShelf: 1, toSlot: 0 }), "move onto a non-empty slot is illegal");
  ok(!isLegalMove(b, { fromShelf: 0, fromSlot: 1, toShelf: 0, toSlot: 1 }), "move from an empty slot is illegal");
  const applied = applyMove(b, { fromShelf: 0, fromSlot: 0, toShelf: 0, toSlot: 1 });
  ok(applied.board.shelves[0][1].length === 1, "applyMove pushes the cell to the destination");
  ok(cloneBoard(b).shelves !== b.shelves, "cloneBoard is a deep copy");
}

console.log(`\nengine unit tests · failures: ${fails}`);
if (fails > 0) process.exit(1);
console.log("ENGINE OBSTACLE LOGIC OK ✓");
