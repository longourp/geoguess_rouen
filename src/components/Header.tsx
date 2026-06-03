import styles from './Header.module.css';

export type Mode = 'daily' | 'random';

interface Props {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  onHelp: () => void;
}

export function Header({ mode, onModeChange, onHelp }: Props) {
  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <span className={styles.logo} aria-hidden="true">
          ▦
        </span>
        <h1 className={styles.title}>GéoGuess Rouen</h1>
      </div>

      <div className={styles.actions}>
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
