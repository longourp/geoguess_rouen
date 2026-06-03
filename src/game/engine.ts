import { getCategory } from '../data';
import type { Category, CategoryMatch, Entity, Puzzle } from '../data/schema';

/**
 * Pure game logic. NO React, NO data imports beyond the typed catalog helpers,
 * so every rule here is trivially unit-testable.
 *
 * Validity is always *computed* from entity tags + category predicates — a
 * cell's valid answers are never hardcoded. Rarity points come from each
 * entity's `notoriety`: within a cell, the least-notorious (rarest) valid
 * answer is worth the most.
 */

export const GRID_SIZE = 3;
export const CELL_COUNT = GRID_SIZE * GRID_SIZE;

/** Minimum valid answers a puzzle cell must have (enforced by data.test.ts). */
export const MIN_ANSWERS_PER_CELL = 3;

export interface ScoringConfig {
  /** Points for the rarest valid answer in a cell. */
  maxPerCell: number;
  /** Points for the most common valid answer in a cell. */
  minPerCell: number;
  /** Points removed per wrong guess. */
  errorPenalty: number;
  /** Wrong guesses allowed before the game ends. */
  maxErrors: number;
  /** Hard cap on the total score. */
  maxScore: number;
}

export const SCORING: ScoringConfig = {
  maxPerCell: 100,
  minPerCell: 20,
  errorPenalty: 20,
  maxErrors: 3,
  maxScore: 900,
};

export function rowOf(cellIndex: number): number {
  return Math.floor(cellIndex / GRID_SIZE);
}

export function colOf(cellIndex: number): number {
  return cellIndex % GRID_SIZE;
}

export function matchesPredicate(tags: readonly string[], match: CategoryMatch): boolean {
  const set = new Set(tags);
  if (match.allOf && !match.allOf.every((t) => set.has(t))) return false;
  if (match.anyOf && !match.anyOf.some((t) => set.has(t))) return false;
  if (match.noneOf && match.noneOf.some((t) => set.has(t))) return false;
  return true;
}

export function matchesCategory(entity: Entity, category: Category): boolean {
  return matchesPredicate(entity.tags, category.match);
}

export function cellCategories(
  puzzle: Puzzle,
  cellIndex: number,
): { row: Category; col: Category } {
  return {
    row: getCategory(puzzle.rowCategoryIds[rowOf(cellIndex)]),
    col: getCategory(puzzle.colCategoryIds[colOf(cellIndex)]),
  };
}

export function validAnswersForCell(entities: Entity[], row: Category, col: Category): Entity[] {
  return entities.filter((e) => matchesCategory(e, row) && matchesCategory(e, col));
}

/** Valid answers for a cell, rarest first (lowest notoriety), deterministic. */
export function rankedAnswers(entities: Entity[], row: Category, col: Category): Entity[] {
  return validAnswersForCell(entities, row, col)
    .slice()
    .sort((a, b) => a.notoriety - b.notoriety || a.id.localeCompare(b.id));
}

/** Points for an answer given its rarity rank (0 = rarest) among `total` answers. */
export function pointsForRank(
  rank: number,
  total: number,
  scoring: ScoringConfig = SCORING,
): number {
  if (rank < 0) return 0;
  if (total <= 1) return scoring.maxPerCell;
  const t = rank / (total - 1); // 0 = rarest → max, 1 = most common → min
  return Math.round(scoring.maxPerCell - (scoring.maxPerCell - scoring.minPerCell) * t);
}

export interface RankedAnswer {
  entity: Entity;
  rank: number;
  points: number;
}

/** Every valid answer for a cell, with its rarity rank and point value. */
export function rankedAnswersWithPoints(
  entities: Entity[],
  row: Category,
  col: Category,
  scoring: ScoringConfig = SCORING,
): RankedAnswer[] {
  const ranked = rankedAnswers(entities, row, col);
  return ranked.map((entity, rank) => ({
    entity,
    rank,
    points: pointsForRank(rank, ranked.length, scoring),
  }));
}

export function scoreEntityInCell(
  entity: Entity,
  entities: Entity[],
  row: Category,
  col: Category,
  scoring: ScoringConfig = SCORING,
): number {
  const ranked = rankedAnswers(entities, row, col);
  return pointsForRank(
    ranked.findIndex((e) => e.id === entity.id),
    ranked.length,
    scoring,
  );
}

/** Valid answers per cell, indexed by cell (0..CELL_COUNT-1). */
export function candidatesPerCell(puzzle: Puzzle, entities: Entity[]): Entity[][] {
  return Array.from({ length: CELL_COUNT }, (_, i) => {
    const { row, col } = cellCategories(puzzle, i);
    return validAnswersForCell(entities, row, col);
  });
}

/**
 * Finds one full, valid solution (a distinct entity for every cell, no reuse)
 * via bipartite matching (Kuhn's algorithm). Returns a cellIndex→entityId map,
 * or null if the grid cannot be completed. Used by the validator and the
 * end-of-game "reveal a solution" feature.
 */
export function findSolution(puzzle: Puzzle, entities: Entity[]): Map<number, string> | null {
  const candidates = candidatesPerCell(puzzle, entities).map((list) => list.map((e) => e.id));
  const entityToCell = new Map<string, number>();

  const assign = (cell: number, seen: Set<string>): boolean => {
    for (const entityId of candidates[cell]) {
      if (seen.has(entityId)) continue;
      seen.add(entityId);
      const taker = entityToCell.get(entityId);
      if (taker === undefined || assign(taker, seen)) {
        entityToCell.set(entityId, cell);
        return true;
      }
    }
    return false;
  };

  for (let cell = 0; cell < CELL_COUNT; cell++) {
    if (!assign(cell, new Set())) return null;
  }

  const solution = new Map<number, string>();
  for (const [entityId, cell] of entityToCell) solution.set(cell, entityId);
  return solution;
}
