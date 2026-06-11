import {
  candidatesPerCell,
  cellCategories,
  findSolution,
  MIN_ANSWERS_PER_CELL,
} from '../game/engine';
import { packs } from './index';

/**
 * Content integrity. Importing `packs` already runs the zod schema (so
 * malformed JSON or unknown category references fail here). On top of that we
 * assert every authored puzzle of every pack is actually playable.
 */
describe('game packs', () => {
  it('have unique ids', () => {
    const ids = packs.map((p) => p.meta.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  describe.each(packs.map((p) => [p.meta.id, p] as const))('pack "%s"', (_packId, pack) => {
    it('loads and parses non-empty content', () => {
      expect(pack.entities.length).toBeGreaterThan(0);
      expect(pack.categories.length).toBeGreaterThan(0);
      expect(pack.puzzles.length).toBeGreaterThan(0);
    });

    describe.each(pack.puzzles.map((p) => [p.id, p] as const))('puzzle "%s"', (_id, puzzle) => {
      it('references categories that resolve for every cell', () => {
        for (let cell = 0; cell < 9; cell++) {
          const { row, col } = cellCategories(puzzle, cell, pack.categories);
          expect(row.id).toBeTruthy();
          expect(col.id).toBeTruthy();
        }
      });

      it(`gives every cell at least ${MIN_ANSWERS_PER_CELL} valid answers`, () => {
        candidatesPerCell(puzzle, pack.entities, pack.categories).forEach((answers, cell) => {
          expect(
            answers.length,
            `cell ${cell} has only ${answers.length} valid answer(s)`,
          ).toBeGreaterThanOrEqual(MIN_ANSWERS_PER_CELL);
        });
      });

      it('is fully solvable with distinct answers (no reuse)', () => {
        const solution = findSolution(puzzle, pack.entities, pack.categories);
        expect(solution).not.toBeNull();
        expect(solution!.size).toBe(9);
        expect(new Set(solution!.values()).size).toBe(9); // all distinct
      });
    });
  });
});
