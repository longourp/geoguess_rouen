import { Fragment } from 'react';
import type { Category, Entity } from '../data/schema';
import { GRID_SIZE, type GameState } from '../game';
import styles from './Grid.module.css';

interface Props {
  rows: Category[];
  cols: Category[];
  entities: Entity[];
  state: GameState;
  selectedCell: number | null;
  onSelectCell: (cell: number) => void;
  interactive: boolean;
}

export function Grid({
  rows,
  cols,
  entities,
  state,
  selectedCell,
  onSelectCell,
  interactive,
}: Props) {
  return (
    <div
      className={styles.grid}
      style={{ gridTemplateColumns: `minmax(72px, 0.8fr) repeat(${GRID_SIZE}, 1fr)` }}
    >
      <div className={styles.corner} aria-hidden="true" />
      {cols.map((col) => (
        <div key={col.id} className={styles.colHead} title={col.description}>
          {col.label}
        </div>
      ))}

      {rows.map((row, r) => (
        <Fragment key={row.id}>
          <div className={styles.rowHead} title={row.description}>
            {row.label}
          </div>
          {cols.map((_, c) => {
            const cell = r * GRID_SIZE + c;
            const placed = state.placed[cell];
            const selected = selectedCell === cell;
            const entity = placed ? entities.find((e) => e.id === placed.entityId) : undefined;
            const className = [
              styles.cell,
              placed ? styles.filled : '',
              selected ? styles.selected : '',
            ]
              .filter(Boolean)
              .join(' ');

            return (
              <button
                key={cell}
                type="button"
                className={className}
                disabled={!interactive || Boolean(placed)}
                aria-label={`${row.label} et ${cols[c].label}`}
                onClick={() => onSelectCell(cell)}
              >
                {placed ? (
                  <>
                    <span className={styles.cellName}>{entity?.name ?? placed.entityId}</span>
                    <span className={styles.cellPts}>+{placed.points}</span>
                  </>
                ) : (
                  <span className={styles.cellEmpty}>{selected ? '…' : '+'}</span>
                )}
              </button>
            );
          })}
        </Fragment>
      ))}
    </div>
  );
}
