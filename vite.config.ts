import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vitest/config';
import react from '@vitejs/plugin-react';

const ROOT = path.dirname(fileURLToPath(import.meta.url));

/**
 * Dev uniquement : l'éditeur (#/editeur) peut enregistrer une grille
 * directement dans src/data/packs/<pack>/puzzles.json via POST
 * /__editor/save-puzzle. En production le bouton n'existe pas et ce
 * middleware n'est jamais monté (`apply: 'serve'`).
 */
function editorSavePlugin(): Plugin {
  return {
    name: 'editor-save',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__editor/save-puzzle', (req, res) => {
        const reply = (status: number, body: object) => {
          res.statusCode = status;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(body));
        };
        if (req.method !== 'POST') return reply(405, { error: 'POST attendu' });

        let raw = '';
        req.on('data', (chunk) => (raw += chunk));
        req.on('end', () => {
          try {
            const { packId, puzzle } = JSON.parse(raw);
            if (typeof packId !== 'string' || !/^[a-z0-9-]+$/.test(packId)) {
              return reply(400, { error: 'packId invalide' });
            }
            const file = path.join(ROOT, 'src/data/packs', packId, 'puzzles.json');
            if (!existsSync(file)) return reply(400, { error: `pack inconnu : ${packId}` });

            const ok =
              puzzle &&
              typeof puzzle.id === 'string' &&
              /^\d{4}-\d{2}-\d{2}$/.test(puzzle.date ?? '') &&
              Array.isArray(puzzle.rowCategoryIds) &&
              puzzle.rowCategoryIds.length === 3 &&
              Array.isArray(puzzle.colCategoryIds) &&
              puzzle.colCategoryIds.length === 3;
            if (!ok) return reply(400, { error: 'grille incomplète ou malformée' });

            const puzzles = JSON.parse(readFileSync(file, 'utf8')) as Array<
              Record<string, unknown> & { id: string; date: string }
            >;
            if (puzzles.some((p) => p.id === puzzle.id)) {
              return reply(409, { error: `id déjà existant : ${puzzle.id}` });
            }
            if (puzzles.some((p) => p.date === puzzle.date)) {
              return reply(409, { error: `date déjà prise : ${puzzle.date}` });
            }

            puzzles.push({
              id: puzzle.id,
              date: puzzle.date,
              ...(puzzle.title ? { title: puzzle.title } : {}),
              rowCategoryIds: puzzle.rowCategoryIds,
              colCategoryIds: puzzle.colCategoryIds,
            });
            writeFileSync(file, JSON.stringify(puzzles, null, 2) + '\n');
            reply(200, { ok: true, path: `src/data/packs/${packId}/puzzles.json` });
          } catch (err) {
            reply(400, { error: err instanceof Error ? err.message : String(err) });
          }
        });
      });
    },
  };
}

// Served at https://<user>.github.io/geoguess_rouen/ on GitHub Pages.
// Change `base` to '/' for a user-page or custom domain, or assets will 404.
// https://vite.dev/config/
export default defineConfig({
  base: '/geoguess_rouen/',
  plugins: [react(), editorSavePlugin()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
