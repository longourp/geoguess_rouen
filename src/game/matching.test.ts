import type { Entity } from '../data/schema';
import { entityMatchesGuess, findEntityByGuess, normalize, searchEntities } from './matching';

const ent = (id: string, name: string, aliases: string[] = []): Entity => ({
  id,
  name,
  aliases,
  type: 'monument',
  tags: ['t'],
  notoriety: 50,
});

describe('normalize', () => {
  it('strips accents, case and punctuation', () => {
    expect(normalize('Cathédrale Notre-Dame')).toBe('cathedrale notre dame');
    expect(normalize("Jeanne d'Arc")).toBe('jeanne d arc');
    expect(normalize('  Île  Lacroix ')).toBe('ile lacroix');
  });
});

describe('guess matching', () => {
  const entities = [
    ent('flaubert', 'Gustave Flaubert', ['Flaubert']),
    ent('cathedrale', 'Cathédrale Notre-Dame de Rouen', ['Cathédrale de Rouen']),
  ];

  it('matches on name or alias, accent-insensitively', () => {
    expect(entityMatchesGuess(entities[0], 'FLAUBERT')).toBe(true);
    expect(entityMatchesGuess(entities[1], 'cathedrale de rouen')).toBe(true);
    expect(entityMatchesGuess(entities[0], 'flobert')).toBe(false);
  });

  it('findEntityByGuess resolves or returns null', () => {
    expect(findEntityByGuess(entities, 'gustave flaubert')?.id).toBe('flaubert');
    expect(findEntityByGuess(entities, 'inconnu')).toBeNull();
  });

  it('searchEntities ranks exact and prefix matches first', () => {
    expect(searchEntities(entities, 'cath').map((e) => e.id)).toEqual(['cathedrale']);
    expect(searchEntities(entities, 'xyz')).toEqual([]);
  });
});
