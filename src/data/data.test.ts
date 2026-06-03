import {
  candidatesPerCell,
  cellCategories,
  findSolution,
  MIN_ANSWERS_PER_CELL,
} from '../game/engine';
import { gameData } from './index';

/**
 * Content integrity. Importing `gameData` already runs the zod schema (so
 * malformed JSON or unknown category references fail here). On top of that we
 * assert every authored puzzle is actually playable.
 */
describe('game data', () => {
  it('loads and parses non-empty content', () => {
    expect(gameData.entities.length).toBeGreaterThan(0);
    expect(gameData.categories.length).toBeGreaterThan(0);
    expect(gameData.puzzles.length).toBeGreaterThan(0);
  });

  describe.each(gameData.puzzles.map((p) => [p.id, p] as const))('puzzle "%s"', (_id, puzzle) => {
    it('references categories that resolve for every cell', () => {
      for (let cell = 0; cell < 9; cell++) {
        const { row, col } = cellCategories(puzzle, cell);
        expect(row.id).toBeTruthy();
        expect(col.id).toBeTruthy();
      }
    });

    it(`gives every cell at least ${MIN_ANSWERS_PER_CELL} valid answers`, () => {
      candidatesPerCell(puzzle, gameData.entities).forEach((answers, cell) => {
        expect(
          answers.length,
          `cell ${cell} has only ${answers.length} valid answer(s)`,
        ).toBeGreaterThanOrEqual(MIN_ANSWERS_PER_CELL);
      });
    });

    it('is fully solvable with distinct answers (no reuse)', () => {
      const solution = findSolution(puzzle, gameData.entities);
      expect(solution).not.toBeNull();
      expect(solution!.size).toBe(9);
      expect(new Set(solution!.values()).size).toBe(9); // all distinct
    });
  });
});
