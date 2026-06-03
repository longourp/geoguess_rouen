import { useEffect, useMemo, useReducer } from 'react';
import type { Entity, Puzzle } from '../data/schema';
import { createReducer, initialState, type GameState } from '../game';
import { loadJSON, saveJSON } from '../lib/storage';

const progressKey = (puzzle: Puzzle) => `progress:${puzzle.id}`;

/**
 * Wires the framework-agnostic game reducer to React and persists progress to
 * localStorage, so a refresh resumes the same grid. Mount this component with
 * `key={puzzle.id}` so switching puzzles re-initialises from saved state.
 */
export function useGame(puzzle: Puzzle, entities: Entity[]) {
  const reducer = useMemo(() => createReducer({ puzzle, entities }), [puzzle, entities]);

  const [state, dispatch] = useReducer(reducer, puzzle, (p) => {
    const saved = loadJSON<GameState | null>(progressKey(p), null);
    return saved && saved.puzzleId === p.id ? saved : initialState(p);
  });

  useEffect(() => {
    saveJSON(progressKey(puzzle), state);
  }, [puzzle, state]);

  return { state, dispatch };
}
