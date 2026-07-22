export interface Progress {
  unlocked: number; // highest unlocked level id
  stars: Record<number, number>;
  bestMoves: Record<number, number>;
  coins: number;
  sound: boolean;
  relax: boolean;
  seenTutorial: boolean;
  bought: Partial<Record<string, number>>;
}

const KEY = "tidy-shelf:v1";

export function defaultProgress(): Progress {
  return {
    unlocked: 1,
    stars: {},
    bestMoves: {},
    coins: 0,
    sound: true,
    relax: false,
    seenTutorial: false,
    bought: {},
  };
}

export function loadProgress(): Progress {
  if (typeof window === "undefined") return defaultProgress();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return defaultProgress();
    const p = JSON.parse(raw);
    return {
      ...defaultProgress(),
      ...p,
      stars: p.stars ?? {},
      bestMoves: p.bestMoves ?? {},
    };
  } catch {
    return defaultProgress();
  }
}

export function saveProgress(p: Progress): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}
