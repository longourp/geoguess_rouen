import { z } from 'zod';

/**
 * Single source of truth for the game's content. Both the runtime validation
 * (zod schemas) and the TypeScript types (via z.infer) come from here, so the
 * curated JSON in this folder can never drift from what the engine expects.
 */

export const ENTITY_TYPES = [
  'monument',
  'edifice-religieux',
  'museum',
  'neighborhood',
  'bridge',
  'person',
  'event',
  'station',
] as const;

/** Stable identifier: lowercase kebab-case. Puzzles reference entities and
 * categories by id, so an id must never change even if the display name does. */
const slug = z
  .string()
  .min(1)
  .regex(/^[a-z0-9-]+$/, 'must be a lowercase kebab-case slug');

export const EntitySchema = z.object({
  id: slug,
  /** Display name, with accents and punctuation. */
  name: z.string().min(1),
  /** Alternate / accent-free spellings accepted when matching a guess. */
  aliases: z.array(z.string().min(1)).default([]),
  type: z.enum(ENTITY_TYPES),
  /** Free-form tags that drive category membership (see CategoryMatch). */
  tags: z.array(z.string().min(1)).min(1),
  /** 1–100. High = famous = common = FEW points. Low = obscure = rare = MANY points. */
  notoriety: z.number().int().min(1).max(100),
  blurb: z.string().optional(),
  wiki: z.string().url().optional(),
});

/** A predicate over an entity's `tags`. An entity matches when it has every
 * tag in `allOf`, at least one tag in `anyOf`, and none of the tags in `noneOf`.
 * At least one of `allOf` / `anyOf` must be provided. */
export const CategoryMatchSchema = z
  .object({
    allOf: z.array(z.string().min(1)).optional(),
    anyOf: z.array(z.string().min(1)).optional(),
    noneOf: z.array(z.string().min(1)).optional(),
  })
  .refine((m) => (m.allOf?.length ?? 0) > 0 || (m.anyOf?.length ?? 0) > 0, {
    message: 'match needs at least one of `allOf` or `anyOf`',
  });

export const CategorySchema = z.object({
  id: slug,
  /** Short label shown on the grid axis. */
  label: z.string().min(1),
  /** Longer player-facing clarification (shown on click / in help). */
  description: z.string().min(1),
  match: CategoryMatchSchema,
});

export const PuzzleSchema = z.object({
  id: slug,
  /** ISO date (YYYY-MM-DD). Used to serve the matching daily grid. */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  title: z.string().optional(),
  rowCategoryIds: z.array(slug).length(3),
  colCategoryIds: z.array(slug).length(3),
});

/** Identity of a game pack — one self-contained game (entities + categories
 * + puzzles) selectable from the UI. */
export const PackMetaSchema = z.object({
  id: slug,
  /** Game title shown in the header and the share text. */
  title: z.string().min(1),
  /** One-line pitch shown in the help modal. */
  description: z.string().min(1),
});

const contentShape = {
  entities: z.array(EntitySchema),
  categories: z.array(CategorySchema),
  puzzles: z.array(PuzzleSchema),
};

/** Referential-integrity checks shared by every content bundle, so loading
 * invalid data throws immediately rather than failing deep in the UI. */
function checkIntegrity(
  data: { entities: Entity[]; categories: Category[]; puzzles: Puzzle[] },
  ctx: z.RefinementCtx,
): void {
  const duplicates = (values: string[]): string[] => {
    const seen = new Set<string>();
    const dups = new Set<string>();
    for (const value of values) {
      if (seen.has(value)) dups.add(value);
      seen.add(value);
    }
    return [...dups];
  };

  const report = (kind: string, dups: string[]) => {
    for (const value of dups) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `duplicate ${kind}: ${value}` });
    }
  };

  report('entity id', duplicates(data.entities.map((e) => e.id)));
  report('category id', duplicates(data.categories.map((c) => c.id)));
  report('puzzle id', duplicates(data.puzzles.map((p) => p.id)));
  report('puzzle date', duplicates(data.puzzles.map((p) => p.date)));

  const categoryIds = new Set(data.categories.map((c) => c.id));
  for (const puzzle of data.puzzles) {
    for (const id of [...puzzle.rowCategoryIds, ...puzzle.colCategoryIds]) {
      if (!categoryIds.has(id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `puzzle "${puzzle.id}" references unknown category "${id}"`,
        });
      }
    }
  }
}

export const GameDataSchema = z.object(contentShape).superRefine(checkIntegrity);

/** A full game pack: meta + content, validated as one unit. */
export const GamePackSchema = z
  .object({ meta: PackMetaSchema, ...contentShape })
  .superRefine(checkIntegrity);

export type EntityType = (typeof ENTITY_TYPES)[number];
export type Entity = z.infer<typeof EntitySchema>;
export type CategoryMatch = z.infer<typeof CategoryMatchSchema>;
export type Category = z.infer<typeof CategorySchema>;
export type Puzzle = z.infer<typeof PuzzleSchema>;
export type GameData = z.infer<typeof GameDataSchema>;
export type PackMeta = z.infer<typeof PackMetaSchema>;
export type GamePack = z.infer<typeof GamePackSchema>;
