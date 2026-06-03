import { useMemo, useState } from 'react';
import type { Category, Entity } from '../data/schema';
import { findEntityByGuess, searchEntities } from '../game';
import styles from './GuessInput.module.css';

interface Props {
  row: Category;
  col: Category;
  entities: Entity[];
  usedEntityIds: string[];
  onSubmit: (entity: Entity) => void;
  onClose: () => void;
}

export function GuessInput({ row, col, entities, usedEntityIds, onSubmit, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [notFound, setNotFound] = useState(false);

  const available = useMemo(() => {
    const used = new Set(usedEntityIds);
    return entities.filter((e) => !used.has(e.id));
  }, [entities, usedEntityIds]);

  const suggestions = useMemo(() => searchEntities(available, query), [available, query]);

  function submit(entity: Entity | null) {
    if (!entity) {
      setNotFound(true);
      return;
    }
    onSubmit(entity);
  }

  return (
    <div className={styles.panel}>
      <div className={styles.prompt}>
        <span>
          Ligne&nbsp;: <strong>{row.label}</strong>
        </span>
        <span>
          Colonne&nbsp;: <strong>{col.label}</strong>
        </span>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Annuler">
          ✕
        </button>
      </div>

      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          submit(findEntityByGuess(entities, query));
        }}
      >
        <input
          autoFocus
          className={styles.input}
          placeholder="Tapez un lieu, une personnalité…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setNotFound(false);
          }}
        />
        <button type="submit" className={styles.submit}>
          Valider
        </button>
      </form>

      {notFound && <p className={styles.hint}>Lieu non reconnu — choisissez une suggestion.</p>}

      {suggestions.length > 0 && (
        <ul className={styles.suggestions}>
          {suggestions.map((entity) => (
            <li key={entity.id}>
              <button type="button" className={styles.suggestion} onClick={() => submit(entity)}>
                {entity.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
