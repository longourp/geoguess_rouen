import { useEffect, useMemo, useReducer } from 'react';
import type { Category, Entity, Puzzle } from '../data/schema';
import { createReducer, initialState, type GameState } from '../game';
import { loadJSON, saveJSON } from '../lib/storage';

const progressKey = (packId: string, puzzle: Puzzle) => `progress:${packId}:${puzzle.id}`;

/**
 * Wires the framework-agnostic game reducer to React and persists progress to
 * localStorage (namespaced per pack so two games never collide), so a refresh
 * resumes the same grid. Mount this component with `key={packId:puzzle.id}` so
 * switching puzzles re-initialises from saved state.
 */
export function useGame(
  packId: string,
  puzzle: Puzzle,
  entities: Entity[],
  categories: Category[],
) {
  const reducer = useMemo(
    () => createReducer({ puzzle, entities, categories }),
    [puzzle, entities, categories],
  );

  const [state, dispatch] = useReducer(reducer, puzzle, (p) => {
    const saved = loadJSON<GameState | null>(progressKey(packId, p), null);
    return saved && saved.puzzleId === p.id ? saved : initialState(p);
  });

  useEffect(() => {
    saveJSON(progressKey(packId, puzzle), state);
  }, [packId, puzzle, state]);

  return { state, dispatch };
}
