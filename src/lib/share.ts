import type { Puzzle } from '../data/schema';
import { CELL_COUNT, GRID_SIZE, SCORING, type GameState } from '../game';

function tile(points: number | undefined): string {
  if (points === undefined) return '⬛';
  if (points >= 80) return '🟩';
  if (points >= 50) return '🟨';
  return '🟧';
}

/** Spoiler-free emoji recap of a finished (or abandoned) grid, à la Wordle. */
export function buildShareText(state: GameState, puzzle: Puzzle, gameTitle: string): string {
  const rows: string[] = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    let line = '';
    for (let c = 0; c < GRID_SIZE; c++) {
      line += tile(state.placed[r * GRID_SIZE + c]?.points);
    }
    rows.push(line);
  }
  const title = puzzle.title ? `${puzzle.title} ` : '';
  const solved = Object.keys(state.placed).length;
  return [
    `${gameTitle} — ${title}(${puzzle.date})`,
    `Score ${state.score}/${SCORING.maxScore} · ${solved}/${CELL_COUNT} cases · ${state.errors} ❌`,
    ...rows,
  ].join('\n');
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
