import type { Category } from '../data/schema';
import { SCORING } from '../game';
import styles from './HelpModal.module.css';

interface Props {
  intro?: string;
  rows: Category[];
  cols: Category[];
  onClose: () => void;
}

export function HelpModal({ intro, rows, cols, onClose }: Props) {
  const categories = [...new Map([...rows, ...cols].map((c) => [c.id, c])).values()];

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" onClick={onClose}>
      <div className={styles.card} onClick={(e) => e.stopPropagation()}>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Fermer">
          ✕
        </button>
        <h2>Comment jouer</h2>
        {intro && <p>{intro}</p>}
        <p>
          Remplissez chaque case avec une réponse qui respecte à la fois le critère de sa{' '}
          <strong>ligne</strong> et celui de sa <strong>colonne</strong>.
        </p>
        <ul className={styles.rules}>
          <li>
            Plus votre réponse est <strong>rare</strong>, plus elle rapporte de points (jusqu'à{' '}
            {SCORING.maxPerCell}).
          </li>
          <li>Une même réponse ne peut être utilisée qu'une seule fois.</li>
          <li>
            {SCORING.maxErrors} erreurs et la partie s'arrête (−{SCORING.errorPenalty} points
            chacune).
          </li>
        </ul>
        <h3>Critères de cette grille</h3>
        <ul className={styles.legend}>
          {categories.map((c) => (
            <li key={c.id}>
              <strong>{c.label}</strong> — {c.description}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
