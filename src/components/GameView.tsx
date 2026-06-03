import { useState } from 'react';
import { findEntity } from '../data';
import type { Category, Entity, Puzzle } from '../data/schema';
import { GRID_SIZE, type GameEvent } from '../game';
import { useGame } from '../hooks/useGame';
import { Scoreboard } from './Scoreboard';
import { Grid } from './Grid';
import { GuessInput } from './GuessInput';
import { EndScreen } from './EndScreen';
import styles from './GameView.module.css';

interface Props {
  puzzle: Puzzle;
  rows: Category[];
  cols: Category[];
  entities: Entity[];
}

export function GameView({ puzzle, rows, cols, entities }: Props) {
  const { state, dispatch } = useGame(puzzle, entities);
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const playing = state.status === 'playing';

  function select(cell: number) {
    if (playing && !state.placed[cell]) setSelectedCell((cur) => (cur === cell ? null : cell));
  }

  function submit(entity: Entity) {
    if (selectedCell === null) return;
    dispatch({ type: 'guess', cellIndex: selectedCell, entity });
    setSelectedCell(null);
  }

  const selRow = selectedCell === null ? null : rows[Math.floor(selectedCell / GRID_SIZE)];
  const selCol = selectedCell === null ? null : cols[selectedCell % GRID_SIZE];

  return (
    <section className={styles.game}>
      {puzzle.title && <h2 className={styles.puzzleTitle}>{puzzle.title}</h2>}
      <Scoreboard state={state} />
      <Feedback event={state.lastEvent} />
      <Grid
        rows={rows}
        cols={cols}
        state={state}
        selectedCell={selectedCell}
        onSelectCell={select}
        interactive={playing}
      />
      {selRow && selCol && (
        <GuessInput
          row={selRow}
          col={selCol}
          entities={entities}
          usedEntityIds={state.usedEntityIds}
          onSubmit={submit}
          onClose={() => setSelectedCell(null)}
        />
      )}
      {!playing && (
        <EndScreen
          state={state}
          puzzle={puzzle}
          rows={rows}
          cols={cols}
          entities={entities}
          onReplay={() => {
            dispatch({ type: 'reset' });
            setSelectedCell(null);
          }}
        />
      )}
    </section>
  );
}

function Feedback({ event }: { event: GameEvent | null }) {
  if (!event) return null;
  const name = findEntity(event.entityId)?.name ?? '';
  const message =
    event.kind === 'correct'
      ? `✓ ${name} placé (+${event.points})`
      : event.kind === 'wrong'
        ? `✗ ${name} ne convient pas pour cette case`
        : `${name} est déjà placé ailleurs`;

  return (
    <p className={styles.feedback} data-kind={event.kind} role="status">
      {message}
    </p>
  );
}
