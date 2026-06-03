import type { Puzzle } from '../data/schema';

/** UTC date key (YYYY-MM-DD), so the "daily" puzzle is the same everywhere. */
export function dateKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayKey(): string {
  return dateKey(new Date());
}

function daysSinceEpoch(key: string): number {
  const [year, month, day] = key.split('-').map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

/** Deterministic puzzle index for a date — same date always maps to the same puzzle. */
export function dailyIndex(key: string, count: number): number {
  if (count <= 0) throw new Error('No puzzles available');
  return ((daysSinceEpoch(key) % count) + count) % count;
}

/**
 * The puzzle for a given date: an explicit `date` match wins (authored dailies),
 * otherwise the deterministic rotation fills in any other day with no backend.
 */
export function puzzleForDate(puzzles: Puzzle[], key: string): Puzzle {
  if (puzzles.length === 0) throw new Error('No puzzles available');
  return puzzles.find((p) => p.date === key) ?? puzzles[dailyIndex(key, puzzles.length)];
}
