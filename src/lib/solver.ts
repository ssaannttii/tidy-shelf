import {
  applyMove,
  cloneBoard,
  front,
  isSolved,
  itemsRemaining,
  type Board,
  type Move,
} from "./engine";

/**
 * Canonical key of a board that treats:
 *  - slot order within a shelf as irrelevant (only the multiset matters),
 *  - shelf order as irrelevant,
 *  - empty slots as interchangeable.
 * This dramatically shrinks the search space for the solver.
 */
export function canonicalKey(b: Board): string {
  const shelfKeys = b.shelves.map((sh) => {
    const slotKeys = sh.map((sl) => sl.join(">"));
    slotKeys.sort();
    return slotKeys.join("|");
  });
  shelfKeys.sort();
  return b.slotsPerShelf + ";" + shelfKeys.join("/");
}

/** Generate candidate moves, deduping equivalent empty destinations per shelf. */
function genMoves(b: Board): Move[] {
  const firstEmpty: number[] = new Array(b.shelves.length).fill(-1);
  for (let s = 0; s < b.shelves.length; s++) {
    for (let j = 0; j < b.shelves[s].length; j++) {
      if (b.shelves[s][j].length === 0) {
        firstEmpty[s] = j;
        break;
      }
    }
  }
  const moves: Move[] = [];
  for (let s = 0; s < b.shelves.length; s++) {
    for (let j = 0; j < b.shelves[s].length; j++) {
      if (b.shelves[s][j].length === 0) continue;
      for (let t = 0; t < b.shelves.length; t++) {
        const e = firstEmpty[t];
        if (e === -1) continue;
        if (t === s && e === j) continue;
        moves.push({ fromShelf: s, fromSlot: j, toShelf: t, toSlot: e });
      }
    }
  }
  return moves;
}

/** Heuristic score of a board for greedy ordering (higher = more promising). */
function boardScore(b: Board): number {
  let score = -itemsRemaining(b) * 6;
  for (const shelf of b.shelves) {
    const counts = new Map<string, number>();
    let filled = 0;
    for (const slot of shelf) {
      const f = front(slot);
      if (f !== null) {
        filled += 1;
        counts.set(f, (counts.get(f) ?? 0) + 1);
      }
    }
    let best = 0;
    for (const c of counts.values()) best = Math.max(best, c);
    // Reward shelves close to a same-front match.
    score += best * best;
    if (best === filled && filled === b.slotsPerShelf) score += 20;
  }
  return score;
}

export interface SolveResult {
  solvable: boolean;
  par: number;
  solution: Move[];
  exact: boolean;
  nodes: number;
}

/**
 * BFS for the shortest solution (exact par). Falls back to a greedy DFS when
 * the node budget is exceeded, returning a valid (non-optimal) solution.
 */
export function solve(b0: Board, maxNodes = 250000): SolveResult {
  if (isSolved(b0)) return { solvable: true, par: 0, solution: [], exact: true, nodes: 0 };

  const visited = new Set<string>([canonicalKey(b0)]);
  interface Node {
    board: Board;
    path: Move[];
  }
  let frontier: Node[] = [{ board: b0, path: [] }];
  let nodes = 0;

  while (frontier.length) {
    const next: Node[] = [];
    for (const node of frontier) {
      for (const mv of genMoves(node.board)) {
        const { board } = applyMove(node.board, mv);
        nodes += 1;
        if (isSolved(board)) {
          return {
            solvable: true,
            par: node.path.length + 1,
            solution: [...node.path, mv],
            exact: true,
            nodes,
          };
        }
        const key = canonicalKey(board);
        if (visited.has(key)) continue;
        visited.add(key);
        next.push({ board, path: [...node.path, mv] });
        if (nodes >= maxNodes) {
          const dfs = solveGreedy(b0, maxNodes * 3);
          return { ...dfs, exact: false };
        }
      }
    }
    frontier = next;
  }
  return { solvable: false, par: Infinity, solution: [], exact: true, nodes };
}

/** Greedy depth-first search that finds *a* solution quickly (not optimal). */
export function solveGreedy(b0: Board, maxNodes = 400000): SolveResult {
  const visited = new Set<string>();
  const path: Move[] = [];
  let nodes = 0;
  let found: Move[] | null = null;

  function dfs(b: Board, depth: number): boolean {
    if (isSolved(b)) {
      found = path.slice();
      return true;
    }
    if (nodes >= maxNodes || depth > 240) return false;
    const key = canonicalKey(b);
    if (visited.has(key)) return false;
    visited.add(key);

    const children = genMoves(b).map((mv) => {
      const { board, clears } = applyMove(b, mv);
      return { mv, board, score: boardScore(board) + clears.length * 1000 };
    });
    children.sort((a, c) => c.score - a.score);

    for (const child of children) {
      nodes += 1;
      path.push(child.mv);
      if (dfs(child.board, depth + 1)) return true;
      path.pop();
      if (nodes >= maxNodes) return false;
    }
    return false;
  }

  const ok = dfs(b0, 0);
  const sol = (found as Move[] | null) ?? [];
  return {
    solvable: ok,
    par: ok && sol.length ? sol.length : Infinity,
    solution: sol,
    exact: false,
    nodes,
  };
}

/**
 * Find a single good next move for the in-game hint. Uses a small greedy
 * search budget so it stays responsive in the browser.
 */
export function findHint(b: Board, maxNodes = 40000): Move | null {
  const res = solveGreedy(cloneBoard(b), maxNodes);
  if (res.solvable && res.solution.length) return res.solution[0];
  // Fallback: any move that produces a clear, else any legal move.
  let anyMove: Move | null = null;
  const firstEmpty: number[] = new Array(b.shelves.length).fill(-1);
  for (let s = 0; s < b.shelves.length; s++)
    for (let j = 0; j < b.shelves[s].length; j++)
      if (b.shelves[s][j].length === 0) {
        firstEmpty[s] = j;
        break;
      }
  for (let s = 0; s < b.shelves.length; s++) {
    for (let j = 0; j < b.shelves[s].length; j++) {
      if (b.shelves[s][j].length === 0) continue;
      for (let t = 0; t < b.shelves.length; t++) {
        const e = firstEmpty[t];
        if (e === -1 || (t === s && e === j)) continue;
        const mv = { fromShelf: s, fromSlot: j, toShelf: t, toSlot: e };
        const { clears } = applyMove(b, mv);
        if (clears.length) return mv;
        if (!anyMove) anyMove = mv;
      }
    }
  }
  return anyMove;
}
