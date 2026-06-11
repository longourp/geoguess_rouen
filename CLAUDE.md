# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A collection of daily 3×3 grid games ("doku" style), one per **game pack**:

- **GéoGuess Rouen** (`#/`) — Rouen knowledge: the player fills every cell with a Rouen entity (monument, person, neighborhood, museum…) satisfying _both_ its row and column criteria.
- **Astuce Doku** (`#/astuce`) — same gameplay over the stops of the Astuce transit network (métro, TEOR, FAST, bus), generated from the official GTFS open data.

Rarer (more obscure) valid answers score more — the famous answer most people would give is worth little. Three wrong guesses ends the game.

The site is 100% static (no backend) and deploys to GitHub Pages. Rarity is approximated from a curated `notoriety` value per entity (for Astuce: derived from service frequency) rather than live player data; the data layer is structured so a real "community rarity" backend can be added later without touching the engine.

## Commands

- `npm run dev` — start the Vite dev server
- `npm run build` — typecheck + production build to `dist/`
- `npm run preview` — serve the production build locally
- `npm test` — run all tests once; `npm run test:watch` for watch mode
- `npx vitest run src/game/engine.test.ts` — run one test file; add `-t "name"` for a single test
- `npm run validate:data` — validate every pack against the schema and assert every puzzle is solvable (also part of `npm test` / CI)
- `npm run ingest:astuce` — regenerate `src/data/packs/astuce/entities.json` from the Astuce GTFS feed (downloads it; pass a local zip or extracted dir to skip the download). Never runs at build/runtime.
- `npm run lint` · `npm run format` · `npm run typecheck`

Local toolchain targets Node 20 (`.nvmrc`); Node 18.18+ also works (the project is pinned to Vite 6 for that reason). Deployment is automatic: pushing to `main` runs `.github/workflows/deploy.yml`, which tests, builds, and publishes to GitHub Pages.

## Architecture

Three deliberately decoupled layers so game logic stays testable and UI-agnostic:

1. **Data (`src/data/`)** — curated, versioned content as plain JSON validated by zod. `schema.ts` is the single source of truth for both runtime validation and TS types.
   - `packs/<id>/` — one directory per game pack, each with four files:
     - `meta.json` — `id`, `title`, `description` (drives the header, help modal, share text).
     - `entities.json` — answerable items: `id` (stable slug), `name`, `aliases` (alternate/accent-free spellings for matching), `type`, `tags[]`, `notoriety` (1–100; high = famous = common = low points).
     - `categories.json` — row/column criteria: `id`, `label`, player-facing `description`, and a `match` predicate (`allOf`/`anyOf`/`noneOf`) over entity `tags`.
     - `puzzles.json` — authored grids: `date` + 3 row + 3 column category ids. **Valid answers per cell are computed, never hardcoded.**
   - `index.ts` parses each pack through `GamePackSchema` on import (so bad data throws immediately) and exposes `packs` / `getPack(id)` / `findPack(id)`.
   - The **astuce** pack's `entities.json` is **generated** by `scripts/ingest-astuce.mjs` from the GTFS feed (Licence Ouverte 2.0). Never hand-edit it: human corrections (wrong rive tag, bad merge of homonym stops, aliases…) go in `scripts/astuce-overlay.json`, which the script re-applies on every ingest. The script prints a tag-density report to help calibrate categories.

2. **Engine (`src/game/`)** — pure TypeScript, no React imports, no data imports: entities AND categories are always passed in, so the engine works with any pack.
   - `engine.ts` — `matchesCategory`, `validAnswersForCell`, rarity scoring (rank a cell's valid entities by `notoriety`; rarest ≈ `maxPerCell` scaling down to `minPerCell`), and `findSolution(puzzle, entities, categories)` (bipartite matching) which produces a full no-reuse solution — used by the validator, the editor, and the end-of-game reveal. Tunables live in the `SCORING` object.
   - `matching.ts` — accent-insensitive guess normalization (NFD + diacritic strip) and lookup/autocomplete over names + aliases.
   - `state.ts` — `createReducer(ctx)` returns a `useReducer`-compatible game state machine (placed answers, used-entity set, errors, score, status). `ctx` carries the pack's `entities` + `categories`. All rules live here; the UI only dispatches `{ type: 'guess' }` / `{ type: 'reset' }`.
   - `daily.ts` — deterministic daily puzzle selection from the (UTC) date, per pack, so every player gets the same grid with no backend.

3. **UI (`src/components/`, `src/hooks/`)** — React + Vite, CSS Modules. `App.tsx` is a tiny hash-route switch (`useHashRoute`): `#/` → first pack, `#/<packId>` → that pack, `#/editeur` → the puzzle editor (lazy-loaded). `GameApp` renders one pack; `useGame` wires the reducer to React and persists progress to `localStorage` under `progress:<packId>:<puzzleId>`. `GameView` is mounted with `key={packId:puzzleId}` so switching puzzles/packs re-initialises cleanly.

### Puzzle editor (`#/editeur`)

Ships with the site (lazy chunk, linked from the footer). Pick a pack, 3 row + 3 col categories, a date and a title: it shows live per-cell valid-answer counts (red < 3, orange = 3, green > 3, click a cell to list answers with points), checks full solvability with `findSolution`, and exports the puzzle JSON (copy/paste into the pack's `puzzles.json`). In dev only, an "Enregistrer" button POSTs to `/__editor/save-puzzle` — a Vite serve-only middleware in `vite.config.ts` that appends the puzzle to the right `puzzles.json` (rejects unknown packs, duplicate id/date). `npm run validate:data` stays the final gate.

### Invariants

- The engine must never import React, `src/components`, or `src/data` — keep it pure and pack-agnostic.
- Never hardcode a cell's valid answers; derive from entities + categories so adding an entity updates every relevant puzzle automatically.
- Every puzzle cell must have at least `MIN_ANSWERS_PER_CELL` (3) valid answers **and** the whole grid must be solvable with distinct answers — enforced for every pack by `src/data/data.test.ts` (`npm run validate:data`).
- Entity/category `id`s are stable slugs; renaming a display `name` must not change its `id` (puzzles reference ids).
- Never hand-edit `packs/astuce/entities.json` (generated); use `scripts/astuce-overlay.json` + `npm run ingest:astuce`.

### Adding content

- New answer → add to the pack's `entities.json` (Rouen pack) or via overlay + re-ingest (Astuce pack).
- New criterion → add to the pack's `categories.json` with a `match` over existing tags (the ingest report lists Astuce tag densities).
- New daily grid → use the editor at `#/editeur` (or hand-edit `puzzles.json`), then `npm run validate:data`. Tip: keep "type" criteria (musée, pont, personnalité / métro, TEOR…) and incompatible themes on the _same_ axis, since only row×column pairs are ever crossed.
- New game pack → create `src/data/packs/<id>/` with the four JSON files and register it in `src/data/index.ts` (`packs` array). Tests, the editor, and the header nav pick it up automatically.

### GitHub Pages notes

- `vite.config.ts` sets `base: '/geoguess_rouen/'` to match the repo name. Change it on rename, or set `base: '/'` for a user-page / custom domain, or Pages 404s on assets.
- Routing is hash-based (`useHashRoute`) — required on Pages, which has no server-side rewrites. Keep it that way (no history-API router).
