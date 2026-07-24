import { create } from "zustand";
import {
  applyMove,
  boardFromLevel,
  cloneBoard,
  frontType,
  isLegalMove,
  isMovableFront,
  isSolved,
  isStuck,
  itemsRemaining,
  resolveClears,
  type Board,
  type Cell,
  type ClearEvent,
  type Move,
} from "./engine";
import { findHint, solveGreedy } from "./solver";
import { getLevel, starsForMoves, TOTAL_LEVELS } from "./levels";
import type { ItemType, LevelData } from "./types";

/** In-game "order" informer: collect ×need of a good; ticks fill as you clear it. */
export interface Order {
  id: number;
  type: ItemType;
  need: number;
  got: number;
}
const ORDER_SLOTS = 3;
const ORDER_MAX = 3; // most ticks an order can ask for
const ORDER_REWARD = 30;
import {
  defaultProgress,
  loadProgress,
  saveProgress,
  type Progress,
} from "./storage";
import { play, setAudioEnabled, vibrate } from "./audio";

export const COMBO_WINDOW_MS = 5200;
export const FREEZE_MS = 10000;
export const DOUBLE_MS = 15000;
export const HINT_MS = 4200;
export const POINTS = 12;

export type Screen = "home" | "map" | "game";
export type Status = "playing" | "won" | "lost";
export type PowerId = "hammer" | "hint" | "shuffle" | "freeze" | "double";
export type LostReason = "time" | "stuck" | null;

export const POWER_COST: Record<PowerId, number> = {
  hammer: 220,
  hint: 120,
  shuffle: 160,
  freeze: 150,
  double: 180,
};

export interface SlotRef {
  shelf: number;
  slot: number;
}

export interface FloatMsg {
  id: number;
  text: string;
  kind: "combo" | "coins" | "info" | "praise";
}

interface Snapshot {
  board: Board;
  moves: number;
  combo: number;
  comboMs: number;
  score: number;
  coins: number;
  powerups: Record<PowerId, number>;
}

function basePowerups(bought?: Partial<Record<PowerId, number>>): Record<PowerId, number> {
  const b: Record<PowerId, number> = { hammer: 2, hint: 3, shuffle: 3, freeze: 2, double: 2 };
  (Object.keys(b) as PowerId[]).forEach((k) => {
    b[k] += bought?.[k] ?? 0;
  });
  return b;
}

function praiseFor(combo: number): string | null {
  if (combo >= 22) return "¡Increíble!";
  if (combo >= 17) return "¡Alucinante!";
  if (combo >= 13) return "¡Bravo!";
  if (combo >= 9) return "¡Asombroso!";
  if (combo >= 6) return "¡Genial!";
  if (combo >= 3) return "¡Bien!";
  return null;
}

function hasAllSameFrontShelf(b: Board): boolean {
  for (let s = 0; s < b.shelves.length; s++) {
    if (b.locked[s]) continue;
    const shelf = b.shelves[s];
    const f0 = frontType(shelf[0]);
    if (f0 === null) continue;
    if (shelf.every((sl) => frontType(sl) === f0)) return true;
  }
  return false;
}

interface GameStore {
  screen: Screen;
  hydrated: boolean;
  progress: Progress;

  levelId: number;
  level: LevelData | null;
  board: Board;
  totalItems: number;
  moves: number;
  status: Status;
  lostReason: LostReason;
  selected: SlotRef | null;
  hammerArmed: boolean;

  timeLeftMs: number;
  combo: number;
  comboMs: number;
  score: number;

  powerups: Record<PowerId, number>;
  freezeMs: number;
  doubleMs: number;

  hint: Move | null;
  hintMs: number;

  history: Snapshot[];
  earnedStars: number;
  wonCoins: number;

  fxId: number;
  pulse: number[];
  shake: number;
  floats: FloatMsg[];
  _floatSeq: number;
  orders: Order[];

  hydrate: () => void;
  setSound: (v: boolean) => void;
  setRelax: (v: boolean) => void;
  seeMech: (m: string) => void;
  goHome: () => void;
  goMap: () => void;
  startLevel: (id: number) => void;
  nextLevel: () => void;
  replay: () => void;
  tapSlot: (shelf: number, slot: number) => void;
  dragMove: (from: SlotRef, to: SlotRef) => void;
  undo: () => void;
  usePower: (p: PowerId) => void;
  buyBooster: (p: PowerId) => void;
  tick: (dtMs: number) => void;
  dismissFloat: (id: number) => void;
}

const emptyBoard: Board = { shelves: [], slotsPerShelf: 3, locked: [], neighbors: [] };

/** count of a specific item type still on the board (all depths) */
function typeCount(b: Board, t: ItemType): number {
  let n = 0;
  for (const shelf of b.shelves)
    for (const slot of shelf) for (const cell of slot) if (cell.k === "item" && cell.t === t) n += 1;
  return n;
}

/** distinct item types on the board, sorted by remaining count (desc) */
function boardItemTypes(b: Board): ItemType[] {
  const count = new Map<ItemType, number>();
  for (const shelf of b.shelves)
    for (const slot of shelf) for (const cell of slot) if (cell.k === "item") count.set(cell.t, (count.get(cell.t) ?? 0) + 1);
  return [...count.keys()].sort((a, z) => (count.get(z) ?? 0) - (count.get(a) ?? 0));
}

export const useGame = create<GameStore>((set, get) => {
  let orderSeq = 0;

  /** an order asks for as many clears of a good as the board can give, up to 3 */
  function makeOrder(b: Board, t: ItemType): Order {
    const need = Math.max(1, Math.min(ORDER_MAX, Math.floor(typeCount(b, t) / 3)));
    return { id: ++orderSeq, type: t, need, got: 0 };
  }

  /** pick up to ORDER_SLOTS types (favouring the most plentiful) as fresh orders */
  function initOrders(b: Board): Order[] {
    return boardItemTypes(b)
      .slice(0, ORDER_SLOTS)
      .map((t) => makeOrder(b, t));
  }

  /** +1 tick per clear of a matching good; recycle completed / exhausted orders */
  function advanceOrders(prev: Order[], clears: ClearEvent[], boardAfter: Board) {
    const orders = prev.map((o) => ({ ...o }));
    for (const c of clears) {
      const o = orders.find((x) => x.type === c.type && x.got < x.need);
      if (o) o.got += 1;
    }
    const present = boardItemTypes(boardAfter);
    const presentSet = new Set(present);
    const active = new Set(orders.map((o) => o.type));
    let bonus = 0;
    let completed = 0;
    const next: Order[] = [];
    for (const o of orders) {
      const done = o.got >= o.need;
      const exhausted = !presentSet.has(o.type);
      if (done || exhausted) {
        if (done) {
          bonus += ORDER_REWARD;
          completed += 1;
        }
        active.delete(o.type);
        const nt = present.find((t) => !active.has(t));
        if (nt) {
          active.add(nt);
          next.push(makeOrder(boardAfter, nt));
        }
        // else: no fresh type left → drop this slot
      } else {
        next.push(o);
      }
    }
    return { orders: next, bonus, completed };
  }

  function pushFloat(text: string, kind: FloatMsg["kind"]) {
    const seq = get()._floatSeq + 1;
    const f: FloatMsg = { id: seq, text, kind };
    set((s) => ({ floats: [...s.floats, f], _floatSeq: seq }));
    setTimeout(() => get().dismissFloat(seq), 1150);
  }

  function commitProgress(p: Progress) {
    saveProgress(p);
    set({ progress: p });
  }

  function finishWin() {
    const s = get();
    if (!s.level) return;
    const level = s.level;
    const stars = starsForMoves(s.moves, level.par);
    const timeBonus = s.progress.relax ? 0 : Math.floor(s.timeLeftMs / 1000) * 2;
    const winCoins = stars * 40 + timeBonus + 10;
    const coins = s.progress.coins + winCoins;

    const starsMap = { ...s.progress.stars };
    starsMap[level.id] = Math.max(starsMap[level.id] ?? 0, stars);
    const bestMoves = { ...s.progress.bestMoves };
    bestMoves[level.id] = Math.min(bestMoves[level.id] ?? Infinity, s.moves);
    const unlocked = Math.max(s.progress.unlocked, Math.min(level.id + 1, TOTAL_LEVELS));

    const p: Progress = { ...s.progress, coins, stars: starsMap, bestMoves, unlocked };
    commitProgress(p);
    set({ status: "won", earnedStars: stars, wonCoins: winCoins, selected: null, hint: null, hammerArmed: false });
    play("win");
    vibrate([15, 40, 15, 40, 30]);
  }

  // Shared scoring / board-commit for a resolved board + its clears.
  function applyOutcome(board: Board, clears: ClearEvent[], smash: boolean) {
    const s = get();
    let combo = s.combo;
    let comboMs = s.comboMs;
    let score = s.score;
    let coins = s.progress.coins;
    let orders = s.orders;
    const pulse = s.pulse.slice();

    if (clears.length > 0) {
      combo += clears.length;
      comboMs = COMBO_WINDOW_MS;
      const mult = Math.min(5, combo);
      const dbl = s.doubleMs > 0 ? 2 : 1;
      const gained = clears.length * POINTS * mult * dbl + (clears.length > 1 ? clears.length * 8 : 0);
      score += gained;
      coins += gained;
      for (const c of clears) pulse[c.shelf] = (pulse[c.shelf] ?? 0) + 1;
      play("clear", combo);
      const praise = praiseFor(combo);
      if (praise) {
        pushFloat(praise, "praise");
        play("combo", combo);
      } else {
        pushFloat(`+${gained}`, "coins");
      }
      vibrate(clears.length > 1 ? [12, 30, 12] : 14);

      // advance the order informers, reward completed ones
      const adv = advanceOrders(orders, clears, board);
      orders = adv.orders;
      if (adv.bonus > 0) {
        coins += adv.bonus;
        pushFloat(`¡Pedido! +${adv.bonus}`, "coins");
        play("power");
        vibrate([10, 25, 10]);
      }
    } else if (smash) {
      play("power");
      vibrate(12);
    } else {
      play("place");
      vibrate(8);
    }

    const won = isSolved(board);
    set({
      board,
      combo,
      comboMs,
      score,
      pulse,
      orders,
      selected: null,
      hint: null,
      hintMs: 0,
      fxId: s.fxId + 1,
      progress: { ...s.progress, coins },
    });

    if (won) {
      finishWin();
      return;
    }
    if (isStuck(board)) {
      if (get().powerups.shuffle > 0 || get().powerups.hammer > 0) {
        pushFloat("¡Atascado! Prueba un potenciador", "info");
      } else {
        set({ status: "lost", lostReason: "stuck" });
        play("lose");
      }
    }
  }

  function performMove(from: SlotRef, to: SlotRef) {
    const s = get();
    if (s.status !== "playing" || !s.level) return;
    const b = s.board;
    const move: Move = { fromShelf: from.shelf, fromSlot: from.slot, toShelf: to.shelf, toSlot: to.slot };
    if (!isLegalMove(b, move)) {
      play("error");
      set((st) => ({ shake: st.shake + 1, selected: null }));
      return;
    }
    const snapshot: Snapshot = {
      board: cloneBoard(b),
      moves: s.moves,
      combo: s.combo,
      comboMs: s.comboMs,
      score: s.score,
      coins: s.progress.coins,
      powerups: { ...s.powerups },
    };
    const { board, clears } = applyMove(b, move);
    set({ moves: s.moves + 1, history: [...s.history, snapshot].slice(-80) });
    applyOutcome(board, clears, false);
  }

  function performHammer(shelf: number, slot: number) {
    const s = get();
    if (s.status !== "playing") {
      set({ hammerArmed: false });
      return;
    }
    const cell = s.board.shelves[shelf]?.[slot];
    if (!cell || cell.length === 0 || s.board.locked[shelf] || s.powerups.hammer <= 0) {
      set({ hammerArmed: false, selected: null });
      return;
    }
    const snapshot: Snapshot = {
      board: cloneBoard(s.board),
      moves: s.moves,
      combo: s.combo,
      comboMs: s.comboMs,
      score: s.score,
      coins: s.progress.coins,
      powerups: { ...s.powerups },
    };
    const nb = cloneBoard(s.board);
    const slotArr = nb.shelves[shelf][slot];
    const f = slotArr[slotArr.length - 1];
    if (f && f.k === "crate") {
      // smashing a crate chips a hit; only pops when broken
      f.hits -= 1;
      if (f.hits <= 0) slotArr.pop();
    } else {
      slotArr.pop(); // item or gift: remove it
    }
    const clears = resolveClears(nb);
    set({
      history: [...s.history, snapshot].slice(-80),
      hammerArmed: false,
      powerups: { ...s.powerups, hammer: s.powerups.hammer - 1 },
    });
    applyOutcome(nb, clears, true);
  }

  function loadLevelState(level: LevelData) {
    const board = boardFromLevel(level);
    set({
      screen: "game",
      levelId: level.id,
      level,
      board,
      totalItems: itemsRemaining(board),
      moves: 0,
      status: "playing",
      lostReason: null,
      selected: null,
      hammerArmed: false,
      timeLeftMs: level.timeLimit * 1000,
      combo: 0,
      comboMs: 0,
      score: 0,
      powerups: basePowerups(get().progress.bought),
      freezeMs: 0,
      doubleMs: 0,
      hint: null,
      hintMs: 0,
      history: [],
      earnedStars: 0,
      wonCoins: 0,
      fxId: 0,
      pulse: new Array(level.shelves.length).fill(0),
      shake: 0,
      floats: [],
      orders: initOrders(board),
    });
  }

  return {
    screen: "home",
    hydrated: false,
    progress: defaultProgress(),

    levelId: 0,
    level: null,
    board: emptyBoard,
    totalItems: 0,
    moves: 0,
    status: "playing",
    lostReason: null,
    selected: null,
    hammerArmed: false,
    timeLeftMs: 0,
    combo: 0,
    comboMs: 0,
    score: 0,
    powerups: basePowerups(),
    freezeMs: 0,
    doubleMs: 0,
    hint: null,
    hintMs: 0,
    history: [],
    earnedStars: 0,
    wonCoins: 0,
    fxId: 0,
    pulse: [],
    shake: 0,
    floats: [],
    _floatSeq: 0,
    orders: [],

    hydrate: () => {
      if (get().hydrated) return;
      const p = loadProgress();
      setAudioEnabled(p.sound);
      set({ progress: p, hydrated: true });
    },

    setSound: (v) => {
      setAudioEnabled(v);
      commitProgress({ ...get().progress, sound: v });
    },
    setRelax: (v) => {
      commitProgress({ ...get().progress, relax: v });
    },

    seeMech: (m) => {
      const s = get();
      if (s.progress.seenMech?.[m]) return;
      commitProgress({ ...s.progress, seenMech: { ...s.progress.seenMech, [m]: true } });
    },

    goHome: () => set({ screen: "home", selected: null, hammerArmed: false }),
    goMap: () => set({ screen: "map", selected: null, hammerArmed: false }),

    startLevel: (id) => {
      const level = getLevel(id);
      if (!level) return;
      if (id > get().progress.unlocked) return;
      loadLevelState(level);
      if (!get().progress.seenTutorial) {
        commitProgress({ ...get().progress, seenTutorial: true });
      }
    },

    nextLevel: () => {
      const nextId = get().levelId + 1;
      const level = getLevel(nextId);
      if (level && nextId <= get().progress.unlocked) loadLevelState(level);
      else set({ screen: "map" });
    },

    replay: () => {
      const level = get().level;
      if (level) loadLevelState(level);
    },

    tapSlot: (shelf, slot) => {
      const s = get();
      if (s.status !== "playing" || !s.level) return;
      if (s.hammerArmed) {
        performHammer(shelf, slot);
        return;
      }
      const cell = s.board.shelves[shelf]?.[slot];
      if (!cell) return;
      const sel = s.selected;
      if (sel) {
        if (sel.shelf === shelf && sel.slot === slot) {
          set({ selected: null });
          return;
        }
        if (cell.length === 0) {
          performMove(sel, { shelf, slot });
          return;
        }
        if (!isMovableFront(s.board, shelf, slot)) {
          play("error");
          set((st) => ({ shake: st.shake + 1, selected: null }));
          return;
        }
        set({ selected: { shelf, slot } });
        play("select");
      } else {
        if (cell.length === 0) return;
        if (!isMovableFront(s.board, shelf, slot)) {
          play("error");
          set((st) => ({ shake: st.shake + 1 }));
          return;
        }
        set({ selected: { shelf, slot } });
        play("select");
      }
    },

    dragMove: (from, to) => {
      if (get().hammerArmed) {
        performHammer(from.shelf, from.slot);
        return;
      }
      performMove(from, to);
    },

    undo: () => {
      const s = get();
      if (s.status !== "playing") return;
      const snap = s.history[s.history.length - 1];
      if (!snap) return;
      set({
        board: snap.board,
        moves: snap.moves,
        combo: snap.combo,
        comboMs: snap.comboMs,
        score: snap.score,
        powerups: snap.powerups,
        history: s.history.slice(0, -1),
        selected: null,
        hint: null,
        hintMs: 0,
        hammerArmed: false,
        progress: { ...s.progress, coins: snap.coins },
        fxId: s.fxId + 1,
      });
      play("select");
    },

    usePower: (p) => {
      const s = get();
      if (s.status !== "playing") return;
      if (s.powerups[p] <= 0) {
        play("error");
        set((st) => ({ shake: st.shake + 1 }));
        return;
      }
      if (p === "freeze") {
        set({ freezeMs: FREEZE_MS, powerups: { ...s.powerups, freeze: s.powerups.freeze - 1 } });
        pushFloat("Tiempo congelado ❄", "info");
        play("power");
      } else if (p === "double") {
        set({ doubleMs: DOUBLE_MS, powerups: { ...s.powerups, double: s.powerups.double - 1 } });
        pushFloat("Puntos dobles ×2", "info");
        play("power");
      } else if (p === "hammer") {
        set({ hammerArmed: !s.hammerArmed, selected: null });
        if (!s.hammerArmed) pushFloat("Rompe cualquier objeto 🔨", "info");
        play("power");
      } else if (p === "hint") {
        const mv = findHint(s.board);
        if (mv) {
          set({ hint: mv, hintMs: HINT_MS, powerups: { ...s.powerups, hint: s.powerups.hint - 1 } });
          play("power");
        } else {
          play("error");
          set((st) => ({ shake: st.shake + 1 }));
        }
      } else if (p === "shuffle") {
        const reshuffled = reshuffleBoard(s.board);
        if (reshuffled) {
          set({
            board: reshuffled,
            powerups: { ...s.powerups, shuffle: s.powerups.shuffle - 1 },
            selected: null,
            hint: null,
            hintMs: 0,
            hammerArmed: false,
            history: [
              ...s.history,
              {
                board: cloneBoard(s.board),
                moves: s.moves,
                combo: s.combo,
                comboMs: s.comboMs,
                score: s.score,
                coins: s.progress.coins,
                powerups: { ...s.powerups },
              },
            ].slice(-80),
            fxId: s.fxId + 1,
          });
          pushFloat("¡Mezclado! 🔀", "info");
          play("power");
        } else {
          play("error");
          set((st) => ({ shake: st.shake + 1 }));
        }
      }
    },

    buyBooster: (p) => {
      const s = get();
      const cost = POWER_COST[p];
      if (s.progress.coins < cost) {
        play("error");
        return;
      }
      const bought = { ...(s.progress.bought ?? {}) };
      bought[p] = (bought[p] ?? 0) + 1;
      commitProgress({ ...s.progress, coins: s.progress.coins - cost, bought });
      // if mid-level, also top up the live count
      if (s.status === "playing" && s.level) {
        set({ powerups: { ...s.powerups, [p]: s.powerups[p] + 1 } });
      }
      play("power");
    },

    tick: (dt) => {
      const s = get();
      if (s.status !== "playing") return;
      const patch: Partial<GameStore> = {};
      let changed = false;

      if (s.freezeMs > 0) {
        patch.freezeMs = Math.max(0, s.freezeMs - dt);
        changed = true;
      }
      if (s.doubleMs > 0) {
        patch.doubleMs = Math.max(0, s.doubleMs - dt);
        changed = true;
      }
      if (s.hintMs > 0) {
        const h = Math.max(0, s.hintMs - dt);
        patch.hintMs = h;
        if (h === 0) patch.hint = null;
        changed = true;
      }
      if (s.comboMs > 0) {
        const c = Math.max(0, s.comboMs - dt);
        patch.comboMs = c;
        if (c === 0) patch.combo = 0;
        changed = true;
      }
      const timerRunning = !s.progress.relax && s.freezeMs <= 0;
      if (timerRunning && s.timeLeftMs > 0) {
        const t = Math.max(0, s.timeLeftMs - dt);
        patch.timeLeftMs = t;
        changed = true;
        if (t === 0) {
          patch.status = "lost";
          patch.lostReason = "time";
          play("lose");
        }
      }
      if (changed) set(patch);
    },

    dismissFloat: (id) => set((s) => ({ floats: s.floats.filter((f) => f.id !== id) })),
  };
});

/** Reshuffle all items into the current slot shape; keep it solvable & clear-free. */
type ItemCell = Extract<Cell, { k: "item" }>;

function reshuffleBoard(b: Board): Board | null {
  // Permute item TYPES among item cells only; keep depths, obstacles (crate/
  // gift) and modifier positions fixed. Retry until a solvable, non-pre-cleared
  // arrangement is found.
  for (let attempt = 0; attempt < 20; attempt++) {
    const nb = cloneBoard(b);
    const itemCells: ItemCell[] = [];
    for (const sh of nb.shelves) for (const sl of sh) for (const c of sl) if (c.k === "item") itemCells.push(c);
    if (itemCells.length === 0) return null;
    const types = itemCells.map((c) => c.t);
    for (let i = types.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [types[i], types[j]] = [types[j], types[i]];
    }
    itemCells.forEach((c, i) => {
      c.t = types[i];
    });
    if (hasAllSameFrontShelf(nb)) continue;
    const test = cloneBoard(nb);
    if (resolveClears(test).length > 0) continue;
    if (solveGreedy(nb, 60000).solvable) return nb;
  }
  return null;
}
