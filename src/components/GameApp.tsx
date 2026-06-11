import { useMemo, useState } from 'react';
import type { GamePack, Puzzle } from '../data/schema';
import { packs } from '../data';
import { categoryById, puzzleForDate, todayKey } from '../game';
import { GameView } from './GameView';
import { Header, type Mode } from './Header';
import { HelpModal } from './HelpModal';
import { useLocalStorage } from '../hooks/useLocalStorage';
import styles from '../App.module.css';

function pickRandom(pool: Puzzle[], excludeId?: string): Puzzle {
  const rest = pool.filter((p) => p.id !== excludeId);
  const list = rest.length > 0 ? rest : pool;
  return list[Math.floor(Math.random() * list.length)];
}

/** One full game (header, grid, footer) bound to a single content pack. */
export function GameApp({ pack }: { pack: GamePack }) {
  const daily = useMemo(() => puzzleForDate(pack.puzzles, todayKey()), [pack]);
  const [mode, setMode] = useState<Mode>('daily');
  const [puzzle, setPuzzle] = useState<Puzzle>(daily);

  const [seenHelp, setSeenHelp] = useLocalStorage(`seen-help:${pack.meta.id}`, false);
  const [helpOpen, setHelpOpen] = useState(!seenHelp);

  const rows = useMemo(
    () => puzzle.rowCategoryIds.map((id) => categoryById(pack.categories, id)),
    [puzzle, pack],
  );
  const cols = useMemo(
    () => puzzle.colCategoryIds.map((id) => categoryById(pack.categories, id)),
    [puzzle, pack],
  );

  function changeMode(next: Mode) {
    setMode(next);
    setPuzzle(next === 'daily' ? daily : pickRandom(pack.puzzles, puzzle.id));
  }

  function closeHelp() {
    setHelpOpen(false);
    setSeenHelp(true);
  }

  return (
    <div className={styles.app}>
      <Header
        packs={packs.map((p) => p.meta)}
        activePackId={pack.meta.id}
        title={pack.meta.title}
        mode={mode}
        onModeChange={changeMode}
        onHelp={() => setHelpOpen(true)}
      />

      <main className={styles.main}>
        <GameView
          key={`${pack.meta.id}:${puzzle.id}`}
          packId={pack.meta.id}
          packTitle={pack.meta.title}
          puzzle={puzzle}
          rows={rows}
          cols={cols}
          entities={pack.entities}
          categories={pack.categories}
        />
      </main>

      <footer className={styles.footer}>
        Données ouvertes (patrimoine de Rouen, réseau Astuce) ·{' '}
        <a href="#/editeur">éditeur de grilles</a>
      </footer>

      {helpOpen && (
        <HelpModal intro={pack.meta.description} rows={rows} cols={cols} onClose={closeHelp} />
      )}
    </div>
  );
}
