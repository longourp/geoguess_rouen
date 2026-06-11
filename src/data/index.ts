import { GamePackSchema, type GamePack } from './schema';
import rouenMeta from './packs/rouen/meta.json';
import rouenEntities from './packs/rouen/entities.json';
import rouenCategories from './packs/rouen/categories.json';
import rouenPuzzles from './packs/rouen/puzzles.json';
import astuceMeta from './packs/astuce/meta.json';
import astuceEntities from './packs/astuce/entities.json';
import astuceCategories from './packs/astuce/categories.json';
import astucePuzzles from './packs/astuce/puzzles.json';

/**
 * Parsed + validated content, one "pack" per playable game. Importing this
 * module runs the zod schema once per pack; if any JSON is malformed or
 * references a missing category, it throws here (and `npm run validate:data`
 * turns that into a failing test).
 */
export const packs: GamePack[] = [
  GamePackSchema.parse({
    meta: rouenMeta,
    entities: rouenEntities,
    categories: rouenCategories,
    puzzles: rouenPuzzles,
  }),
  GamePackSchema.parse({
    meta: astuceMeta,
    entities: astuceEntities,
    categories: astuceCategories,
    puzzles: astucePuzzles,
  }),
];

export const DEFAULT_PACK_ID = packs[0].meta.id;

export function getPack(id: string): GamePack {
  const pack = packs.find((p) => p.meta.id === id);
  if (!pack) throw new Error(`Unknown pack id: ${id}`);
  return pack;
}

export function findPack(id: string): GamePack | undefined {
  return packs.find((p) => p.meta.id === id);
}

export * from './schema';
