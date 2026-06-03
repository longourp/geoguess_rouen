import type { Entity } from '../data/schema';

/**
 * Accent- and punctuation-insensitive normalization so a player can type
 * "cathedrale notre dame" and match "Cathédrale Notre-Dame". Strips diacritics
 * via NFD decomposition, lowercases, and collapses everything else to spaces.
 */
export function normalize(input: string): string {
  return input
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function namesOf(entity: Entity): string[] {
  return [entity.name, ...entity.aliases].map(normalize);
}

export function entityMatchesGuess(entity: Entity, guess: string): boolean {
  const needle = normalize(guess);
  return needle.length > 0 && namesOf(entity).includes(needle);
}

/** Resolves a free-text guess to an entity by exact (normalized) name/alias. */
export function findEntityByGuess(entities: Entity[], guess: string): Entity | null {
  return entities.find((e) => entityMatchesGuess(e, guess)) ?? null;
}

/** Ranked autocomplete suggestions: exact > prefix > substring match. */
export function searchEntities(entities: Entity[], query: string, limit = 8): Entity[] {
  const needle = normalize(query);
  if (!needle) return [];
  return entities
    .map((entity) => {
      const names = namesOf(entity);
      let score = 0;
      if (names.includes(needle)) score = 3;
      else if (names.some((n) => n.startsWith(needle))) score = 2;
      else if (names.some((n) => n.includes(needle))) score = 1;
      return { entity, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.entity.name.localeCompare(b.entity.name))
    .slice(0, limit)
    .map((x) => x.entity);
}
