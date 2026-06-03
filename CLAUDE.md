# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

GéoGuess Rouen is a daily grid game of Rouen knowledge, inspired by metrodoku.fr. A 3×3 grid has a criterion on each row and column; the player fills every cell with a Rouen entity (monument, person, neighborhood, museum, event…) that satisfies _both_ its row and column criteria. Rarer (more obscure) valid answers score more — the famous answer most people would give is worth little; the obscure-but-valid answer is worth the most. Three wrong guesses ends the game. (Title/branding is a placeholder, easy to change.)

The site is 100% static (no backend) and deploys to GitHub Pages. Rarity is approximated from a curated `notoriety` value per entity rather than live player data; the data layer is structured so a real "community rarity" backend can be added later without touching the engine.

## Commands

- `npm run dev` — start the Vite dev server
- `npm run build` — typecheck + production build to `dist/`
- `npm run preview` — serve the production build locally
- `npm test` — run all tests once; `npm run test:watch` for watch mode
- `npx vitest run src/game/engine.test.ts` — run one test file; add `-t "name"` for a single test
- `npm run validate:data` — validate content against the schema and assert every puzzle is solvable (also part of `npm test` / CI)
- `npm run lint` · `npm run format` · `npm run typecheck`

Local toolchain targets Node 20 (`.nvmrc`); Node 18.18+ also works (the project is pinned to Vite 6 for that reason). Deployment is automatic: pushing to `main` runs `.github/workflows/deploy.yml`, which tests, builds, and publishes to GitHub Pages.

## Architecture

Three deliberately decoupled layers so game logic stays testable and UI-agnostic:

1. **Data (`src/data/`)** — curated, versioned content as plain JSON validated by zod. `schema.ts` is the single source of truth for both runtime validation and TS types.
   - `entities.json` — answerable items: `id` (stable slug), `name`, `aliases` (alternate/accent-free spellings for matching), `type`, `tags[]`, `notoriety` (1–100; high = famous = common = low points).
   - `categories.json` — row/column criteria: `id`, `label`, player-facing `description`, and a `match` predicate (`allOf`/`anyOf`/`noneOf`) over entity `tags`.
   - `puzzles.json` — authored grids: `date` + 3 row + 3 column category ids. **Valid answers per cell are computed, never hardcoded.**
   - `index.ts` parses everything through `GameDataSchema` on import (so bad data throws immediately) and exposes `getEntity` / `getCategory` / `findEntity`.

2. **Engine (`src/game/`)** — pure TypeScript, no React imports.
   - `engine.ts` — `matchesCategory`, `validAnswersForCell`, rarity scoring (rank a cell's valid entities by `notoriety`; rarest ≈ `maxPerCell` scaling down to `minPerCell`), and `findSolution` (bipartite matching) which produces a full no-reuse solution — used by both the validator and the end-of-game reveal. Tunables live in the `SCORING` object.
   - `matching.ts` — accent-insensitive guess normalization (NFD + diacritic strip) and lookup/autocomplete over names + aliases.
   - `state.ts` — `createReducer(ctx)` returns a `useReducer`-compatible game state machine (placed answers, used-entity set, errors, score, status). All rules live here; the UI only dispatches `{ type: 'guess' }` / `{ type: 'reset' }`.
   - `daily.ts` — deterministic daily puzzle selection from the (UTC) date, so every player gets the same grid with no backend.

3. **UI (`src/components/`, `src/hooks/`)** — React + Vite, CSS Modules. Components render state and dispatch engine actions; `useGame` wires the reducer to React and persists progress to `localStorage`. `GameView` is mounted with `key={puzzle.id}` so switching puzzles re-initialises cleanly.

### Invariants

- The engine must never import React or `src/components` — keep it pure and unit-testable.
- Never hardcode a cell's valid answers; derive from entities + categories so adding an entity updates every relevant puzzle automatically.
- Every puzzle cell must have at least `MIN_ANSWERS_PER_CELL` (3) valid answers **and** the whole grid must be solvable with distinct answers — both enforced by `src/data/data.test.ts` (`npm run validate:data`).
- Entity/category `id`s are stable slugs; renaming a display `name` must not change its `id` (puzzles reference ids).

### Adding content

- New answer → add to `entities.json` with `tags` + a `notoriety` estimate.
- New criterion → add to `categories.json` with a `match` over existing tags.
- New daily grid → add to `puzzles.json`, then `npm run validate:data` to confirm it's solvable. Tip: keep "type" criteria (musée, pont, personnalité) and incompatible themes on the _same_ axis, since only row×column pairs are ever crossed.

### GitHub Pages notes

- `vite.config.ts` sets `base: '/geoguess_rouen/'` to match the repo name. Change it on rename, or set `base: '/'` for a user-page / custom domain, or Pages 404s on assets.
- The MVP has no client router; if one is added, use hash routing or a `404.html` fallback (Pages has no server-side rewrites).
