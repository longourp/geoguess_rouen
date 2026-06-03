import { GameDataSchema, type Category, type Entity, type GameData } from './schema';
import entities from './entities.json';
import categories from './categories.json';
import puzzles from './puzzles.json';

/**
 * Parsed + validated content. Importing this module runs the zod schema once;
 * if any JSON is malformed or references a missing category, it throws here
 * (and `npm run validate:data` turns that into a failing test).
 */
export const gameData: GameData = GameDataSchema.parse({ entities, categories, puzzles });

const entitiesById = new Map<string, Entity>(gameData.entities.map((e) => [e.id, e]));
const categoriesById = new Map<string, Category>(gameData.categories.map((c) => [c.id, c]));

export function getEntity(id: string): Entity {
  const entity = entitiesById.get(id);
  if (!entity) throw new Error(`Unknown entity id: ${id}`);
  return entity;
}

/** Like getEntity but returns undefined instead of throwing (e.g. for stale saved progress). */
export function findEntity(id: string): Entity | undefined {
  return entitiesById.get(id);
}

export function getCategory(id: string): Category {
  const category = categoriesById.get(id);
  if (!category) throw new Error(`Unknown category id: ${id}`);
  return category;
}

export * from './schema';
