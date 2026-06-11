import { packs, type Entity } from '../data';
import { findSolution } from './engine';
import { createReducer, initialState, type GameAction, type GameState } from './state';

const pack = packs[0];
const puzzle = pack.puzzles[0];
const ctx = { puzzle, entities: pack.entities, categories: pack.categories };
const reducer = createReducer(ctx);

const getEntity = (id: string): Entity => {
  const entity = pack.entities.find((e) => e.id === id);
  if (!entity) throw new Error(`Unknown entity id: ${id}`);
  return entity;
};

const play = (actions: GameAction[], from: GameState = initialState(puzzle)): GameState =>
  actions.reduce(reducer, from);

// Cell 0 of puzzle #1 = (row "jeanne-d-arc" × col "rive-droite").
const VALID_CELL0 = getEntity('place-du-vieux-marche'); // jeanne-d-arc + rive-droite
const WRONG_CELL0 = getEntity('gustave-flaubert'); // matches neither

describe('game reducer', () => {
  it('places a correct answer, scores it, and marks it used', () => {
    const state = play([{ type: 'guess', cellIndex: 0, entity: VALID_CELL0 }]);
    expect(state.placed[0]?.entityId).toBe(VALID_CELL0.id);
    expect(state.placed[0]?.points).toBeGreaterThan(0);
    expect(state.usedEntityIds).toContain(VALID_CELL0.id);
    expect(state.score).toBeGreaterThan(0);
    expect(state.status).toBe('playing');
  });

  it('counts a wrong answer as an error without placing it', () => {
    const state = play([{ type: 'guess', cellIndex: 0, entity: WRONG_CELL0 }]);
    expect(state.errors).toBe(1);
    expect(state.placed[0]).toBeUndefined();
    expect(state.lastEvent?.kind).toBe('wrong');
  });

  it('ends the game after the third error', () => {
    const wrong: GameAction = { type: 'guess', cellIndex: 0, entity: WRONG_CELL0 };
    const state = play([wrong, wrong, wrong]);
    expect(state.errors).toBe(3);
    expect(state.status).toBe('lost');
  });

  it('rejects reusing an entity in another cell', () => {
    const state = play([
      { type: 'guess', cellIndex: 0, entity: VALID_CELL0 },
      { type: 'guess', cellIndex: 1, entity: VALID_CELL0 }, // also valid for cell 1, but used
    ]);
    expect(state.placed[1]).toBeUndefined();
    expect(state.lastEvent?.kind).toBe('duplicate');
  });

  it('wins when every cell is filled from a real solution', () => {
    const solution = findSolution(puzzle, pack.entities, pack.categories);
    expect(solution).not.toBeNull();
    const actions: GameAction[] = [...solution!].map(([cellIndex, entityId]) => ({
      type: 'guess',
      cellIndex,
      entity: getEntity(entityId),
    }));
    const state = play(actions);
    expect(state.status).toBe('won');
    expect(Object.keys(state.placed)).toHaveLength(9);
    expect(state.score).toBeGreaterThan(0);
  });

  it('resets to the initial state', () => {
    const dirty = play([{ type: 'guess', cellIndex: 0, entity: VALID_CELL0 }]);
    expect(reducer(dirty, { type: 'reset' })).toEqual(initialState(puzzle));
  });
});
