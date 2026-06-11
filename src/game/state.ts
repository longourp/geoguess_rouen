import type { Category, Entity, Puzzle } from '../data/schema';
import {
  CELL_COUNT,
  SCORING,
  type ScoringConfig,
  cellCategories,
  matchesCategory,
  pointsForRank,
  rankedAnswers,
} from './engine';

/**
 * Framework-agnostic game state machine. The UI only dispatches actions and
 * renders the result — every rule (validity, scoring, used-once, error limit,
 * win/lose) lives here so it can be tested without a DOM.
 */

export type GameStatus = 'playing' | 'won' | 'lost';

export interface PlacedAnswer {
  cellIndex: number;
  entityId: string;
  points: number;
}

/** Outcome of the most recent guess, so the UI can flash feedback. */
export type GameEvent =
  | { kind: 'correct'; cellIndex: number; entityId: string; points: number }
  | { kind: 'wrong'; cellIndex: number; entityId: string }
  | { kind: 'duplicate'; cellIndex: number; entityId: string };

export interface GameState {
  puzzleId: string;
  placed: Record<number, PlacedAnswer>;
  usedEntityIds: string[];
  errors: number;
  score: number;
  status: GameStatus;
  lastEvent: GameEvent | null;
}

export type GameAction = { type: 'guess'; cellIndex: number; entity: Entity } | { type: 'reset' };

export interface GameContext {
  puzzle: Puzzle;
  entities: Entity[];
  categories: Category[];
  scoring?: ScoringConfig;
}

export function initialState(puzzle: Puzzle): GameState {
  return {
    puzzleId: puzzle.id,
    placed: {},
    usedEntityIds: [],
    errors: 0,
    score: 0,
    status: 'playing',
    lastEvent: null,
  };
}

export function computeScore(
  placed: Record<number, PlacedAnswer>,
  errors: number,
  scoring: ScoringConfig = SCORING,
): number {
  const base = Object.values(placed).reduce((sum, p) => sum + p.points, 0);
  return Math.max(0, Math.min(scoring.maxScore, base - errors * scoring.errorPenalty));
}

/** Builds a `useReducer`-compatible reducer bound to a puzzle + catalog. */
export function createReducer(ctx: GameContext) {
  const scoring = ctx.scoring ?? SCORING;

  return function reducer(state: GameState, action: GameAction): GameState {
    if (action.type === 'reset') return initialState(ctx.puzzle);

    if (state.status !== 'playing') return state;
    const { cellIndex, entity } = action;
    if (state.placed[cellIndex]) return state; // cell already solved

    const { row, col } = cellCategories(ctx.puzzle, cellIndex, ctx.categories);

    if (!matchesCategory(entity, row) || !matchesCategory(entity, col)) {
      const errors = state.errors + 1;
      return {
        ...state,
        errors,
        status: errors >= scoring.maxErrors ? 'lost' : 'playing',
        score: computeScore(state.placed, errors, scoring),
        lastEvent: { kind: 'wrong', cellIndex, entityId: entity.id },
      };
    }

    if (state.usedEntityIds.includes(entity.id)) {
      // Correct answer, but already placed elsewhere — rejected without penalty.
      return { ...state, lastEvent: { kind: 'duplicate', cellIndex, entityId: entity.id } };
    }

    const ranked = rankedAnswers(ctx.entities, row, col);
    const points = pointsForRank(
      ranked.findIndex((e) => e.id === entity.id),
      ranked.length,
      scoring,
    );
    const placed = { ...state.placed, [cellIndex]: { cellIndex, entityId: entity.id, points } };
    const usedEntityIds = [...state.usedEntityIds, entity.id];
    const solved = Object.keys(placed).length === CELL_COUNT;

    return {
      ...state,
      placed,
      usedEntityIds,
      status: solved ? 'won' : 'playing',
      score: computeScore(placed, state.errors, scoring),
      lastEvent: { kind: 'correct', cellIndex, entityId: entity.id, points },
    };
  };
}
