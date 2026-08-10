import { z } from 'zod';

/**
 * The Seed: knowledge as found at source, and nothing else.
 *
 * A Seed carries no reading. Nothing here says which rung of a ladder a status
 * denotes, which Fact Kind a facet carries, whether anything is well-formed, or
 * what to tell a person about a document that could not be read. Every one of
 * those is decided by applying a Lens, so tightening a criterion or rewording a
 * message changes what a reader sees without re-extracting anything.
 *
 * It is also the contract between the runner and the server, so it depends on no
 * other package here and is validated at both ends.
 */

export const attributeValueSchema = z.union([z.string(), z.array(z.string())]);

export const seedRelationSchema = z.object({
  type: z.string(),
  targetRef: z.string(),
});

export const seedItemSchema = z.object({
  /** 1-indexed line in the source document where this item begins. */
  line: z.number().int().positive(),
  attributes: z.record(attributeValueSchema),
  relations: z.array(seedRelationSchema),
  /**
   * The source text this item was read from, exactly as written — never
   * summarised, reworded, or stitched together from lines that are not adjacent.
   * A reader who is shown altered evidence is being told a second-hand version
   * of the knowledge, which is the defect this product exists to detect.
   */
  excerpt: z.string(),
  /**
   * True when the excerpt stops short of what the source says. The reader is then
   * told to follow the origin for the rest — a cut with a pointer is honest about
   * being partial in a way a summary is not (LAW-006, LAW-009).
   */
  excerptCut: z.boolean(),
});

export const seedDocumentSchema = z.object({
  /**
   * Relative to the adapter root, so two machines extracting the same source
   * produce the same digest. Absolute paths are the reader's concern and are
   * resolved when a Seed is interpreted.
   */
  path: z.string().min(1),
  containerId: z.string().min(1),
  /**
   * False when nothing at all could be read from the document. Every field below
   * is then empty, and what to tell the reader is decided by interpretation.
   */
  readable: z.boolean(),
  /** 1-indexed line where the body begins; null for a document nothing was read from. */
  bodyStartLine: z.number().int().positive().nullable(),
  /** The four adapter-declared frontmatter values, exactly as written. Null when absent or empty. */
  moduleId: z.string().nullable(),
  facet: z.string().nullable(),
  status: z.string().nullable(),
  owner: z.string().nullable(),
  items: z.array(seedItemSchema),
});

export const seedSchema = z.object({
  /** The Seed format is a portability contract and is versioned (ADR-0012). */
  version: z.literal(1),
  /** Which Lens's adapter half produced this Seed. */
  lensId: z.string().min(1),
  /** In discovery order, so interpretation reports what it finds in the order it was found. */
  documents: z.array(seedDocumentSchema),
});

export const SEED_VERSION = 1;

export type SeedRelation = z.infer<typeof seedRelationSchema>;
export type SeedItem = z.infer<typeof seedItemSchema>;
export type SeedDocument = z.infer<typeof seedDocumentSchema>;
export type Seed = z.infer<typeof seedSchema>;
