import { useMemo, useState } from 'react';
import { gameData, getCategory } from './data';
import type { Puzzle } from './data/schema';
import { puzzleForDate, todayKey } from './game';
import { GameView } from './components/GameView';
import { Header, type Mode } from './components/Header';
import { HelpModal } from './components/HelpModal';
import { useLocalStorage } from './hooks/useLocalStorage';
import styles from './App.module.css';

function pickRandom(excludeId?: string): Puzzle {
  const pool = gameData.puzzles.filter((p) => p.id !== excludeId);
  const list = pool.length > 0 ? pool : gameData.puzzles;
  return list[Math.floor(Math.random() * list.length)];
}

export default function App() {
  const daily = useMemo(() => puzzleForDate(gameData.puzzles, todayKey()), []);
  const [mode, setMode] = useState<Mode>('daily');
  const [puzzle, setPuzzle] = useState<Puzzle>(daily);

  const [seenHelp, setSeenHelp] = useLocalStorage('seen-help', false);
  const [helpOpen, setHelpOpen] = useState(!seenHelp);

  const rows = useMemo(() => puzzle.rowCategoryIds.map(getCategory), [puzzle]);
  const cols = useMemo(() => puzzle.colCategoryIds.map(getCategory), [puzzle]);

  function changeMode(next: Mode) {
    setMode(next);
    setPuzzle(next === 'daily' ? daily : pickRandom(puzzle.id));
  }

  function closeHelp() {
    setHelpOpen(false);
    setSeenHelp(true);
  }

  return (
    <div className={styles.app}>
      <Header mode={mode} onModeChange={changeMode} onHelp={() => setHelpOpen(true)} />

      <main className={styles.main}>
        <GameView
          key={puzzle.id}
          puzzle={puzzle}
          rows={rows}
          cols={cols}
          entities={gameData.entities}
        />
      </main>

      <footer className={styles.footer}>
        Inspiré de{' '}
        <a href="https://metrodoku.fr/" target="_blank" rel="noreferrer noopener">
          métrodoku
        </a>{' '}
        · données ouvertes sur le patrimoine de Rouen.
      </footer>

      {helpOpen && <HelpModal rows={rows} cols={cols} onClose={closeHelp} />}
    </div>
  );
}
