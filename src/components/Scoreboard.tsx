import { CELL_COUNT, SCORING, type GameState } from '../game';
import styles from './Scoreboard.module.css';

interface Props {
  state: GameState;
}

export function Scoreboard({ state }: Props) {
  const solved = Object.keys(state.placed).length;

  return (
    <div className={styles.board}>
      <div className={styles.stat}>
        <span className={styles.value}>{state.score}</span>
        <span className={styles.label}>/ {SCORING.maxScore} pts</span>
      </div>
      <div className={styles.stat}>
        <span className={styles.value}>
          {solved}/{CELL_COUNT}
        </span>
        <span className={styles.label}>cases</span>
      </div>
      <div className={styles.stat}>
        <span
          className={styles.errors}
          aria-label={`${state.errors} erreur(s) sur ${SCORING.maxErrors}`}
        >
          {Array.from({ length: SCORING.maxErrors }, (_, i) => (
            <span key={i} className={i < state.errors ? styles.errOn : styles.errOff}>
              ✕
            </span>
          ))}
        </span>
        <span className={styles.label}>erreurs</span>
      </div>
    </div>
  );
}
