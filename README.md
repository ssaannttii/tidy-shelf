# 🗄️ Tidy Shelf — a cozy sorting puzzle

A mobile-first web game in the **"Goods Sort / Tidy Shelf"** genre. Move goods
between shelves, line up **three of a kind** on a shelf to clear them (revealing
whatever was hidden behind), and tidy the whole cabinet before the timer runs
out. Built with **Next.js + TypeScript**, deployed on **Vercel**.

> The art is intentionally **emoji placeholders** — the whole game is data- and
> mechanics-driven, so you can swap in your own product sprites later without
> touching the logic.

## ✨ Features

- **Core sort mechanic** — 3-slot shelves, match-three-to-clear, hidden depth
  that reveals as you clear the front item.
- **Irregular cabinets** — every level lays its shelves out on a tetris-like
  grid with gaps, driven by data.
- **40 hand-tuned levels** across **5 worlds** (Pantry, Kitchen, Garden, Toy
  Box, Workshop) with a rising difficulty curve — more item types, more hidden
  depth, tighter buffers.
- **Guaranteed solvable** — every level is verified by a real solver at
  generation time; the solver also computes each level's **par** (used for the
  ★★★ rating).
- **Timer + combos** — a countdown per level, a combo multiplier that builds
  with quick consecutive clears (`x2 … x5`), and praise pop-ups
  (*Nice! → Bravo! → Unbelievable!*).
- **Boosters** — 🔨 Smash (remove any item), 💡 Hint (solver-powered), 🔀
  Shuffle (kept solvable), ❄️ Freeze (pause the timer), ✨ Double (×2 points).
- **Coins + shop** — earn coins from clears and level rewards, spend them on
  extra boosters that carry into every level.
- **Progression** — level map with locked/unlocked nodes and stars, saved to
  `localStorage`. Includes a **Relax mode** (no timer).
- **Juice** — paper-shred particle bursts on clears, full-screen confetti on
  win, WebAudio SFX, haptics, tap **and** drag controls.
- **PWA-ready** — manifest, icons, theme color, installable, safe-area aware.

## 🎮 How to play

Tap a product to pick it up, then tap an **empty spot** to place it (or just
drag it). Get three of the same product together on one shelf and they pop.
Clear the whole cabinet to win. Fewer moves → more stars.

## 🧱 Tech & structure

```
src/
  app/            Next.js App Router (layout, page, global styles)
  components/     React UI (Home, LevelMap, GameScreen, Board, Modals…)
  lib/
    engine.ts     pure game logic (moves, clears, win detection)
    solver.ts     BFS/greedy solver (solvability, par, hints)
    store.ts      Zustand game store (timer, combos, coins, boosters)
    items.ts      item catalog + world themes
    levels.ts     level loader + star thresholds
    storage.ts    localStorage progress
    audio.ts      synthesized WebAudio SFX
  data/
    levels.json   the generated, solver-verified level pack
scripts/
  genLevels.ts    deterministic level generator + solver verification
  test.ts         replays every level's solution to prove it's winnable
```

Everything runs client-side — no backend required.

## 🚀 Run locally

```bash
npm install
npm run dev          # http://localhost:3000
```

Other scripts:

```bash
npm run gen:levels   # regenerate & verify src/data/levels.json
npx tsx scripts/test.ts   # assert all 40 levels are solvable
npm run build && npm start
```

## 🧩 Designing / regenerating levels

Level difficulty is described declaratively in `scripts/genLevels.ts`
(`types`, `shelves`, `maxDepth`, `emptySlots` per world). The generator places
items, rejects any board that isn't solvable, records the solver's par and a
derived time limit, and writes `src/data/levels.json`. Re-run `npm run
gen:levels` after editing the specs.

## 📦 Deploy

This is a stock Next.js app — push to GitHub and import into Vercel, or run
`vercel`. No environment variables needed.

---

Made with care. Swap the emoji for your own art and it's yours. 🧡
