import type { PackMeta } from '../data/schema';
import styles from './Header.module.css';

export type Mode = 'daily' | 'random';

interface Props {
  packs: PackMeta[];
  activePackId: string;
  title: string;
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  onHelp: () => void;
}

/** Short nav label per game (full titles are too long for the header pill). */
function navLabel(meta: PackMeta): string {
  return meta.id === 'rouen' ? 'Rouen' : meta.id === 'astuce' ? 'Astuce' : meta.title;
}

export function Header({ packs, activePackId, title, mode, onModeChange, onHelp }: Props) {
  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <span className={styles.logo} aria-hidden="true">
          ▦
        </span>
        <h1 className={styles.title}>{title}</h1>
      </div>

      <div className={styles.actions}>
        <nav className={styles.modes} aria-label="Choix du jeu">
          {packs.map((meta) => (
            <a
              key={meta.id}
              href={meta.id === packs[0].id ? '#/' : `#/${meta.id}`}
              className={meta.id === activePackId ? styles.navActive : styles.nav}
              aria-current={meta.id === activePackId ? 'page' : undefined}
            >
              {navLabel(meta)}
            </a>
          ))}
        </nav>
        <div className={styles.modes} role="tablist" aria-label="Mode de jeu">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'daily'}
            className={mode === 'daily' ? styles.modeActive : styles.mode}
            onClick={() => onModeChange('daily')}
          >
            Quotidien
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'random'}
            className={mode === 'random' ? styles.modeActive : styles.mode}
            onClick={() => onModeChange('random')}
          >
            Aléatoire
          </button>
        </div>
        <button type="button" className={styles.help} onClick={onHelp} aria-label="Aide / règles">
          ?
        </button>
      </div>
    </header>
  );
}
