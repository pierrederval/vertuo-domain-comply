import { z } from 'zod';
import { criteriaNotFollowedSchema, WAYS_OF_HAVING_NO_READING } from './no-reading.js';

/**
 * What the API answers and what the Studio expects, defined once.
 *
 * Two definitions of one payload is how a surface starts drawing a figure the
 * server stopped sending. Both sides validate against this, so a drift is a
 * failure at the boundary rather than a blank space on a screen.
 */

/**
 * Readiness: how much of the knowledge is agreed.
 *
 * Both numbers travel together and neither is ever sent alone. A count without
 * what it is out of is the figure LAW-006 forbids — it reads as a verdict on the
 * whole Corpus when it is a verdict on the Facets one Lens declares.
 */
export const readinessFigureSchema = z.object({
  modulesFullyApproved: z.number().int().nonnegative(),
  /** The denominator: every Module the Corpus has. */
  modules: z.number().int().nonnegative(),
});

/**
 * Integrity: how much of the knowledge disagrees with itself.
 *
 * `lookedFor` is this figure's denominator. A bare count of open Findings reads
 * as *these are the problems*, and can only ever mean *these are the problems
 * these Checks would have found*.
 */
export const integrityFigureSchema = z.object({
  openFindings: z.number().int().nonnegative(),
  lookedFor: z.array(z.string().min(1)).min(1),
});

/**
 * A Corpus whose source has been read, or one whose source has not.
 *
 * Told apart in the payload rather than by an absent field, because they are
 * different facts about the knowledge and a reader is owed the difference. This is
 * the spot that was reserved for a Corpus that could not be read to say why, and
 * `WAYS_OF_HAVING_NO_READING` is now where both of those live, said once for all six
 * surfaces that answer for them.
 */
export const corpusReadingSchema = z.discriminatedUnion('outcome', [
  ...WAYS_OF_HAVING_NO_READING,
  z.object({
    outcome: z.literal('read'),
    /**
     * When the knowledge this reading is made of was written down from source.
     * Always sent: a surface that cannot say how old its reading is invites false
     * confidence.
     */
    sourceReadAt: z.string().datetime(),
    /**
     * The two readings, side by side and never fused. There is deliberately no
     * third field derived from them: no score, no percentage, no grade, no badge.
     * They demand different work from often different people, so one figure
     * standing for both would hide which is failing (spec §4).
     */
    readiness: readinessFigureSchema,
    integrity: integrityFigureSchema,
  }),
]);

export const corpusSummarySchema = z.object({
  id: z.string().min(1),
  /** What to call this Corpus. Its Lens's name where it declares one, else its id. */
  name: z.string().min(1),
  reading: corpusReadingSchema,
});

/**
 * Every Corpus on the shelf, and every set of criteria on it that could not be
 * followed.
 *
 * Both, always. A list quietly one Corpus short reads exactly like a shelf holding one
 * Corpus fewer, and would go on reading that way for as long as the file stayed
 * unreadable (LAW-006).
 */
export const corpusListSchema = z.object({
  corpus: z.array(corpusSummarySchema),
  criteriaNotFollowed: z.array(criteriaNotFollowedSchema),
});

export type ReadinessFigure = z.infer<typeof readinessFigureSchema>;
export type IntegrityFigure = z.infer<typeof integrityFigureSchema>;
export type CorpusReading = z.infer<typeof corpusReadingSchema>;
export type CorpusSummary = z.infer<typeof corpusSummarySchema>;
export type CorpusList = z.infer<typeof corpusListSchema>;
