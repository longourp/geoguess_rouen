import type { Puzzle } from '../data/schema';
import { dailyIndex, dateKey, puzzleForDate } from './daily';

const puzzle = (id: string, date: string): Puzzle => ({
  id,
  date,
  rowCategoryIds: ['a', 'b', 'c'],
  colCategoryIds: ['d', 'e', 'f'],
});

describe('dateKey', () => {
  it('formats a UTC date as YYYY-MM-DD', () => {
    expect(dateKey(new Date(Date.UTC(2026, 5, 3)))).toBe('2026-06-03');
    expect(dateKey(new Date(Date.UTC(2026, 0, 9)))).toBe('2026-01-09');
  });
});

describe('dailyIndex', () => {
  it('is deterministic and within range', () => {
    expect(dailyIndex('2026-06-03', 1)).toBe(0);
    expect(dailyIndex('2026-06-03', 2)).toBe(dailyIndex('2026-06-03', 2));
    expect(dailyIndex('2026-06-03', 5)).toBeGreaterThanOrEqual(0);
    expect(dailyIndex('2026-06-03', 5)).toBeLessThan(5);
  });
});

describe('puzzleForDate', () => {
  const puzzles = [puzzle('p1', '2026-06-03'), puzzle('p2', '2026-06-04')];

  it('prefers an explicit date match', () => {
    expect(puzzleForDate(puzzles, '2026-06-04').id).toBe('p2');
  });

  it('falls back to deterministic rotation for other dates', () => {
    const chosen = puzzleForDate(puzzles, '2030-12-25');
    expect(puzzles).toContain(chosen);
  });
});
