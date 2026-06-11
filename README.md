# GéoGuess Rouen

**▶ Jouer : <https://longourp.github.io/geoguess_rouen/>**

Daily **3×3 grid games about Rouen** — fill every cell with an answer that
satisfies **both** its row and column criteria. The rarer (more obscure) your
valid answer, the more points it scores; the famous answer everyone thinks of
is worth the least. Three wrong guesses end the game.

Two games are included:

- **GéoGuess Rouen** (`#/`) — monuments, people, neighborhoods, museums…
- **Astuce Doku** (`#/astuce`) — the stops of the Astuce transit network
  (métro, TEOR, FAST, bus), generated from the
  [official GTFS open data](https://transport.data.gouv.fr/datasets/donnees-statiques-et-temps-reel-du-reseau-astuce-metropole-rouen-normandie)
  (Licence Ouverte 2.0).

A built-in **puzzle editor** (`#/editeur`) lets you compose new grids with live
validity and solvability feedback.

The site is 100% static (no backend) and deploys to **GitHub Pages**.

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
```

> Node **20** is recommended (see `.nvmrc`); Node 18.18+ also works.

## Scripts

| Command                           | What it does                                            |
| --------------------------------- | ------------------------------------------------------- |
| `npm run dev`                     | Vite dev server with hot reload                         |
| `npm run build`                   | Type-check + production build to `dist/`                |
| `npm run preview`                 | Serve the production build locally                      |
| `npm test`                        | Run the Vitest suite once                               |
| `npm run test:watch`              | Vitest in watch mode                                    |
| `npm run validate:data`           | Validate all packs + assert every puzzle is solvable    |
| `npm run ingest:astuce`           | Regenerate the Astuce entities from the GTFS open data  |
| `npm run lint` / `npm run format` | ESLint / Prettier                                       |
| `npm run typecheck`               | `tsc --noEmit`                                          |

## How it's built

- **React + Vite + TypeScript**, plain CSS Modules, zod for data validation, Vitest for tests.
- Three decoupled layers: curated JSON **data** (one `src/data/packs/<id>/` per game) → a pure-TS game **engine** → the React **UI**.
- See [`CLAUDE.md`](./CLAUDE.md) for the architecture in detail.

## Adding content

Each game pack lives in `src/data/packs/<id>/` as JSON validated by `src/data/schema.ts`:

- **New answer** → add an entry to the pack's `entities.json` (tags + a `notoriety`
  estimate from 1–100). For the Astuce pack, don't hand-edit the generated
  `entities.json` — put corrections in `scripts/astuce-overlay.json` and re-run
  `npm run ingest:astuce`.
- **New criterion** → add to the pack's `categories.json` with a `match` predicate over tags.
- **New daily grid** → use the editor at `#/editeur` (in dev it can write straight to
  `puzzles.json`), then run `npm run validate:data` to confirm every cell has enough
  valid answers and the grid is fully solvable.

## Deployment

Pushing to `main` runs `.github/workflows/deploy.yml`, which tests, builds, and
publishes `dist/` to GitHub Pages.

The site is served from `https://longourp.github.io/geoguess_rouen/`, so
`vite.config.ts` sets `base: '/geoguess_rouen/'`. Change it if you rename the repo,
or set `base: '/'` for a user page / custom domain.

## License

[MIT](./LICENSE). Transit data: réseau Astuce, Métropole Rouen Normandie,
Licence Ouverte 2.0.
