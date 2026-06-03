# GéoGuess Rouen

A daily **grid game of Rouen knowledge**, inspired by [métrodoku](https://metrodoku.fr/).

A 3×3 grid has a criterion on each row and column. Fill every cell with a Rouen
entity — a monument, a person, a neighborhood, a museum… — that satisfies **both**
its row and column criteria. The rarer (more obscure) your valid answer, the more
points it scores; the famous answer everyone thinks of is worth the least. Three
wrong guesses end the game.

The site is 100% static (no backend) and deploys to **GitHub Pages**.

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
```

> Node **20** is recommended (see `.nvmrc`); Node 18.18+ also works.

## Scripts

| Command                           | What it does                                       |
| --------------------------------- | -------------------------------------------------- |
| `npm run dev`                     | Vite dev server with hot reload                    |
| `npm run build`                   | Type-check + production build to `dist/`           |
| `npm run preview`                 | Serve the production build locally                 |
| `npm test`                        | Run the Vitest suite once                          |
| `npm run test:watch`              | Vitest in watch mode                               |
| `npm run validate:data`           | Validate content + assert every puzzle is solvable |
| `npm run lint` / `npm run format` | ESLint / Prettier                                  |
| `npm run typecheck`               | `tsc --noEmit`                                     |

## How it's built

- **React + Vite + TypeScript**, plain CSS Modules, zod for data validation, Vitest for tests.
- Three decoupled layers: curated JSON **data** → a pure-TS game **engine** → the React **UI**.
- See [`CLAUDE.md`](./CLAUDE.md) for the architecture in detail.

## Adding content

All content lives in `src/data/` as JSON validated by `src/data/schema.ts`:

- **New answer** → add an entry to `entities.json` (tags + a `notoriety` estimate from 1–100).
- **New criterion** → add to `categories.json` with a `match` predicate over tags.
- **New daily grid** → add to `puzzles.json`, then run `npm run validate:data` to
  confirm every cell has enough valid answers and the grid is fully solvable.

## Deployment

Pushing to `main` runs `.github/workflows/deploy.yml`, which tests, builds, and
publishes `dist/` to GitHub Pages.

The site is served from `https://<user>.github.io/geoguess_rouen/`, so
`vite.config.ts` sets `base: '/geoguess_rouen/'`. Change it if you rename the repo,
or set `base: '/'` for a user page / custom domain.

## License

[MIT](./LICENSE). Inspired by métrodoku; not affiliated with it.
