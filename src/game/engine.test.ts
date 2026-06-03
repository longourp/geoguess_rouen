import type { Category, CategoryMatch, Entity } from '../data/schema';
import {
  matchesCategory,
  pointsForRank,
  rankedAnswers,
  scoreEntityInCell,
  validAnswersForCell,
} from './engine';

const ent = (id: string, tags: string[], notoriety: number): Entity => ({
  id,
  name: id,
  aliases: [],
  type: 'monument',
  tags,
  notoriety,
});

const cat = (match: CategoryMatch): Category => ({ id: 'c', label: 'c', description: 'c', match });

describe('matchesCategory', () => {
  const e = ent('e', ['a', 'b'], 50);

  it('anyOf matches when at least one tag is present', () => {
    expect(matchesCategory(e, cat({ anyOf: ['a'] }))).toBe(true);
    expect(matchesCategory(e, cat({ anyOf: ['z'] }))).toBe(false);
  });

  it('allOf requires every tag', () => {
    expect(matchesCategory(e, cat({ allOf: ['a', 'b'] }))).toBe(true);
    expect(matchesCategory(e, cat({ allOf: ['a', 'z'] }))).toBe(false);
  });

  it('noneOf excludes', () => {
    expect(matchesCategory(e, cat({ anyOf: ['a'], noneOf: ['z'] }))).toBe(true);
    expect(matchesCategory(e, cat({ anyOf: ['a'], noneOf: ['b'] }))).toBe(false);
  });
});

describe('validAnswersForCell', () => {
  it('returns entities matching both axes', () => {
    const entities = [
      ent('x', ['religious', 'right'], 10),
      ent('y', ['religious'], 20),
      ent('z', ['museum', 'right'], 30),
    ];
    const valid = validAnswersForCell(
      entities,
      cat({ anyOf: ['religious'] }),
      cat({ anyOf: ['right'] }),
    );
    expect(valid.map((e) => e.id)).toEqual(['x']);
  });
});

describe('rarity scoring', () => {
  const entities = [ent('common', ['t'], 90), ent('rare', ['t'], 10), ent('mid', ['t'], 50)];
  const both = cat({ anyOf: ['t'] });

  it('ranks rarest (lowest notoriety) first', () => {
    expect(rankedAnswers(entities, both, both).map((e) => e.id)).toEqual(['rare', 'mid', 'common']);
  });

  it('awards the most points to the rarest answer', () => {
    const rare = scoreEntityInCell(entities[1], entities, both, both);
    const common = scoreEntityInCell(entities[0], entities, both, both);
    expect(rare).toBeGreaterThan(common);
    expect(rare).toBe(100);
    expect(common).toBe(20);
  });

  it('pointsForRank is a single max for a lone answer and 0 for non-answers', () => {
    expect(pointsForRank(0, 1)).toBe(100);
    expect(pointsForRank(-1, 5)).toBe(0);
    expect(pointsForRank(1, 3)).toBe(60);
  });
});
