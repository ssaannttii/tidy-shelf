import levelsData from "../data/levels.json";
import type { LevelData } from "./types";

export const LEVELS = levelsData as unknown as LevelData[];

export function getLevel(id: number): LevelData | undefined {
  return LEVELS.find((l) => l.id === id);
}

export function levelsByWorld(world: number): LevelData[] {
  return LEVELS.filter((l) => l.world === world);
}

export const TOTAL_LEVELS = LEVELS.length;

/** Star rating on win, based on moves used vs the solver's par. */
export function starsForMoves(moves: number, par: number): number {
  if (par <= 0) return 3;
  if (moves <= par) return 3;
  const r = moves / par;
  if (r <= 1.25) return 3;
  if (r <= 1.8) return 2;
  return 1;
}
