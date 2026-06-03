import { useState } from 'react';
import type { Category, Entity, Puzzle } from '../data/schema';
import { GRID_SIZE, rankedAnswersWithPoints, type GameState } from '../game';
import { buildShareText, copyToClipboard } from '../lib/share';
import styles from './EndScreen.module.css';

interface Props {
  state: GameState;
  puzzle: Puzzle;
  rows: Category[];
  cols: Category[];
  entities: Entity[];
  onReplay: () => void;
}

export function EndScreen({ state, puzzle, rows, cols, entities, onReplay }: Props) {
  const [copied, setCopied] = useState(false);
  const won = state.status === 'won';

  async function share() {
    setCopied(await copyToClipboard(buildShareText(state, puzzle)));
  }

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={styles.card}>
        <h2 className={styles.heading}>{won ? '🎉 Grille complétée !' : 'Partie terminée'}</h2>
        <p className={styles.score}>
          {state.score} <span>points</span>
        </p>

        <div className={styles.actions}>
          <button type="button" className={styles.primary} onClick={share}>
            {copied ? 'Copié ✓' : 'Partager'}
          </button>
          <button type="button" className={styles.secondary} onClick={onReplay}>
            Rejouer
          </button>
        </div>

        <h3 className={styles.solTitle}>Réponses possibles</h3>
        <div className={styles.solutions}>
          {rows.map((row, r) =>
            cols.map((col, c) => {
              const cell = r * GRID_SIZE + c;
              const chosen = state.placed[cell]?.entityId;
              return (
                <div key={cell} className={styles.sol}>
                  <div className={styles.solHead}>
                    {row.label} × {col.label}
                  </div>
                  <ul className={styles.solList}>
                    {rankedAnswersWithPoints(entities, row, col).map(({ entity, points }) => (
                      <li
                        key={entity.id}
                        className={entity.id === chosen ? styles.picked : undefined}
                      >
                        <span>{entity.name}</span>
                        <span className={styles.pts}>{points}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            }),
          )}
        </div>
      </div>
    </div>
  );
}
