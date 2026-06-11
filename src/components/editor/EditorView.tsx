import { useMemo, useState } from 'react';
import { packs } from '../../data';
import type { Category, Puzzle } from '../../data/schema';
import {
  GRID_SIZE,
  MIN_ANSWERS_PER_CELL,
  findSolution,
  normalize,
  rankedAnswersWithPoints,
  todayKey,
  validAnswersForCell,
} from '../../game';
import { copyToClipboard } from '../../lib/share';
import styles from './EditorView.module.css';

/**
 * Éditeur de grilles : choisissez 3 critères de lignes + 3 de colonnes et
 * voyez en direct le nombre de réponses valides par case et si la grille est
 * résoluble (mêmes fonctions moteur que le jeu et le validateur). Exportez
 * ensuite le JSON à coller dans puzzles.json — ou, en dev, enregistrez-le
 * directement dans le fichier.
 */

type Axis = 'row' | 'col';

function slugify(input: string): string {
  return normalize(input).replace(/ /g, '-');
}

export function EditorView() {
  const [packId, setPackId] = useState(packs[0].meta.id);
  const pack = packs.find((p) => p.meta.id === packId) ?? packs[0];

  const [rowIds, setRowIds] = useState<(string | null)[]>([null, null, null]);
  const [colIds, setColIds] = useState<(string | null)[]>([null, null, null]);
  const [date, setDate] = useState(todayKey());
  const [title, setTitle] = useState('');
  const [filter, setFilter] = useState('');
  const [openCell, setOpenCell] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  function selectPack(id: string) {
    setPackId(id);
    setRowIds([null, null, null]);
    setColIds([null, null, null]);
    setOpenCell(null);
  }

  function setAxis(axis: Axis, index: number, value: string) {
    const update = (ids: (string | null)[]) =>
      ids.map((cur, i) => (i === index ? value || null : cur));
    if (axis === 'row') setRowIds(update);
    else setColIds(update);
    setOpenCell(null);
    setSaveMessage(null);
  }

  const categoryById = (id: string | null): Category | null =>
    (id && pack.categories.find((c) => c.id === id)) || null;

  const rows = rowIds.map(categoryById);
  const cols = colIds.map(categoryById);

  const visibleCategories = useMemo(() => {
    const needle = normalize(filter);
    if (!needle) return pack.categories;
    return pack.categories.filter((c) => normalize(c.label).includes(needle));
  }, [pack, filter]);

  /** Réponses valides par case (null tant que les deux axes ne sont pas choisis). */
  const cells = useMemo(
    () =>
      Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => {
        const row = rows[Math.floor(i / GRID_SIZE)];
        const col = cols[i % GRID_SIZE];
        return row && col ? validAnswersForCell(pack.entities, row, col) : null;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pack, ...rowIds, ...colIds],
  );

  const complete = rows.every(Boolean) && cols.every(Boolean);
  const id = `${slugify(title) || 'grille'}-${date}`;

  const draft: Puzzle | null = complete
    ? {
        id,
        date,
        ...(title ? { title } : {}),
        rowCategoryIds: rowIds as string[],
        colCategoryIds: colIds as string[],
      }
    : null;

  const solution = useMemo(
    () => (draft ? findSolution(draft, pack.entities, pack.categories) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pack, complete, ...rowIds, ...colIds],
  );

  const warnings: string[] = [];
  cells.forEach((answers, i) => {
    if (answers && answers.length < MIN_ANSWERS_PER_CELL) {
      warnings.push(
        `Case L${Math.floor(i / GRID_SIZE) + 1}×C${(i % GRID_SIZE) + 1} : seulement ${answers.length} réponse(s) valide(s) (minimum ${MIN_ANSWERS_PER_CELL}).`,
      );
    }
  });
  for (const [axis, ids] of [
    ['lignes', rowIds],
    ['colonnes', colIds],
  ] as const) {
    const chosen = ids.filter(Boolean);
    if (new Set(chosen).size !== chosen.length) {
      warnings.push(`Une même catégorie est utilisée deux fois sur l'axe des ${axis}.`);
    }
  }
  if (pack.puzzles.some((p) => p.date === date)) {
    warnings.push(`La date ${date} est déjà prise par une grille existante de ce pack.`);
  }
  if (pack.puzzles.some((p) => p.id === id)) {
    warnings.push(`L'id « ${id} » existe déjà dans ce pack — changez le titre ou la date.`);
  }
  if (complete && !solution) {
    warnings.push(
      'Pas de solution complète : impossible de remplir les 9 cases sans réutiliser une réponse.',
    );
  }

  const valid = complete && solution !== null && warnings.length === 0;
  const json = draft ? JSON.stringify(draft, null, 2) : '';

  async function copy() {
    setCopied(await copyToClipboard(json));
    setTimeout(() => setCopied(false), 2000);
  }

  async function saveToFile() {
    if (!draft) return;
    try {
      const res = await fetch('/__editor/save-puzzle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packId: pack.meta.id, puzzle: draft }),
      });
      const body = await res.json();
      setSaveMessage(
        res.ok ? `✓ Enregistré dans ${body.path}` : `✗ ${body.error ?? 'Erreur inconnue'}`,
      );
    } catch {
      setSaveMessage('✗ Enregistrement impossible (serveur de dev uniquement).');
    }
  }

  function cellClass(answers: Category[] | unknown[] | null): string {
    if (!answers) return styles.cellEmpty;
    const n = (answers as unknown[]).length;
    if (n < MIN_ANSWERS_PER_CELL) return styles.cellBad;
    if (n === MIN_ANSWERS_PER_CELL) return styles.cellTight;
    return styles.cellOk;
  }

  return (
    <div className={styles.editor}>
      <header className={styles.header}>
        <h1>Éditeur de grilles</h1>
        <a href="#/">← Retour au jeu</a>
      </header>

      <section className={styles.meta}>
        <label>
          Jeu
          <select value={packId} onChange={(e) => selectPack(e.target.value)}>
            {packs.map((p) => (
              <option key={p.meta.id} value={p.meta.id}>
                {p.meta.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          Date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label>
          Titre (optionnel)
          <input
            type="text"
            value={title}
            placeholder="Patrimoine, Spécial TEOR…"
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
      </section>

      <section>
        <label className={styles.filter}>
          Filtrer les catégories
          <input
            type="search"
            value={filter}
            placeholder="métro, rive, musée…"
            onChange={(e) => setFilter(e.target.value)}
          />
        </label>
        <div className={styles.axes}>
          {(['row', 'col'] as const).map((axis) => (
            <fieldset key={axis} className={styles.axis}>
              <legend>{axis === 'row' ? 'Lignes' : 'Colonnes'}</legend>
              {[0, 1, 2].map((i) => {
                const current = axis === 'row' ? rowIds[i] : colIds[i];
                return (
                  <select
                    key={i}
                    value={current ?? ''}
                    onChange={(e) => setAxis(axis, i, e.target.value)}
                  >
                    <option value="">
                      — {axis === 'row' ? `Ligne ${i + 1}` : `Colonne ${i + 1}`} —
                    </option>
                    {visibleCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                    {current && !visibleCategories.some((c) => c.id === current) && (
                      <option value={current}>{categoryById(current)?.label}</option>
                    )}
                  </select>
                );
              })}
            </fieldset>
          ))}
        </div>
      </section>

      <section>
        <h2>Aperçu (réponses valides par case)</h2>
        <div className={styles.grid}>
          <div />
          {cols.map((c, i) => (
            <div key={`c${i}`} className={styles.axisLabel}>
              {c?.label ?? '…'}
            </div>
          ))}
          {rows.map((r, ri) => (
            <Row
              key={`r${ri}`}
              label={r?.label ?? '…'}
              cells={cells.slice(ri * GRID_SIZE, ri * GRID_SIZE + GRID_SIZE)}
              baseIndex={ri * GRID_SIZE}
              cellClass={cellClass}
              openCell={openCell}
              onToggle={(i) => setOpenCell((cur) => (cur === i ? null : i))}
            />
          ))}
        </div>
        {openCell !== null && cells[openCell] && rows[Math.floor(openCell / GRID_SIZE)] && (
          <div className={styles.answers}>
            <h3>
              {rows[Math.floor(openCell / GRID_SIZE)]!.label} × {cols[openCell % GRID_SIZE]!.label}
            </h3>
            <ul>
              {rankedAnswersWithPoints(
                pack.entities,
                rows[Math.floor(openCell / GRID_SIZE)]!,
                cols[openCell % GRID_SIZE]!,
              ).map(({ entity, points }) => (
                <li key={entity.id}>
                  {entity.name} <span>{points} pts</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {warnings.length > 0 && (
        <ul className={styles.warnings}>
          {warnings.map((w) => (
            <li key={w}>⚠ {w}</li>
          ))}
        </ul>
      )}
      {valid && (
        <p className={styles.valid}>✓ Grille résoluble : 9 réponses distinctes possibles.</p>
      )}

      {draft && (
        <section className={styles.export}>
          <h2>Export</h2>
          <pre>{json}</pre>
          <div className={styles.exportActions}>
            <button type="button" onClick={copy}>
              {copied ? 'Copié ✓' : 'Copier le JSON'}
            </button>
            {import.meta.env.DEV && (
              <button type="button" onClick={saveToFile} disabled={!valid}>
                Enregistrer dans puzzles.json
              </button>
            )}
          </div>
          {saveMessage && <p className={styles.saveMessage}>{saveMessage}</p>}
          <p className={styles.hint}>
            Collez cet objet dans <code>src/data/packs/{pack.meta.id}/puzzles.json</code> puis
            lancez <code>npm run validate:data</code>.
          </p>
        </section>
      )}
    </div>
  );
}

interface RowProps {
  label: string;
  cells: (unknown[] | null)[];
  baseIndex: number;
  cellClass: (answers: unknown[] | null) => string;
  openCell: number | null;
  onToggle: (index: number) => void;
}

function Row({ label, cells, baseIndex, cellClass, openCell, onToggle }: RowProps) {
  return (
    <>
      <div className={styles.axisLabel}>{label}</div>
      {cells.map((answers, i) => {
        const index = baseIndex + i;
        return (
          <button
            key={index}
            type="button"
            className={`${styles.cell} ${cellClass(answers)} ${openCell === index ? styles.cellOpen : ''}`}
            onClick={() => answers && onToggle(index)}
            title={answers ? 'Voir les réponses valides' : 'Choisissez les deux critères'}
          >
            {answers ? answers.length : '·'}
          </button>
        );
      })}
    </>
  );
}
