import { z } from 'zod';
import { WAYS_OF_HAVING_NO_READING } from './no-reading.js';
import { integrityFigureSchema, readinessFigureSchema } from './corpus.js';
import { ladderSchema, movementSchema } from './detail.js';

/**
 * Home: what needs a person in one Corpus, and what moved in it (spec §5.1).
 *
 * Per Corpus, and there is no shelf-wide equivalent of any of it. An Owner is free
 * text lifted from one corpus and two corpora spell the same person differently, so
 * a figure or a queue spanning the shelf would merge people the product cannot prove
 * are one.
 */

/**
 * One Module short of having every Facet its Lens declares approved.
 *
 * The same figure and the same movement the grid states, for the Modules where
 * there is work. Nothing is ordered by how thin a Module is: an order by how much
 * each holds would be a ranking, which is a figure by another name.
 */
export const needsWorkSchema = z.object({
  id: z.string().min(1),
  /**
   * Who answers for this Module, or nothing.
   *
   * Nothing is sent as nothing and never as an empty name, so a surface can mark
   * it. A Module nobody answers for is a defect and not a blank: every Finding
   * against it routes to nobody (LAW-007).
   */
  owner: z.string().min(1).nullable(),
  approved: z.number().int().nonnegative(),
  /** The denominator this Module's figure is stated against (LAW-006). */
  declaredFacets: z.number().int().nonnegative(),
  movement: movementSchema,
});

/**
 * One time this source was read and what it said differed from what was already
 * held.
 *
 * There is one of these per writing-down the shelf still holds, and a writing-down
 * exists only where what was written down differs from what was already there —
 * re-reading a source that yields the same reading of it finds what is already held
 * and writes nothing (ADR-0012). So this can never become *a run completed*, which
 * is the noise the tooling generates about itself and the one thing this list may
 * never carry.
 *
 * It is not *the source said something new* either, which is what this claimed until
 * ADR-0036. Usually it is: a document was edited and what came out differs. It is
 * also this product coming to read the same documents differently — raising how much
 * of a source a quotation carries wrote one of these down on the DDD Corpus's shelf
 * with no document touched, no figure moved and nothing at all in the comparison
 * beside it. One entry means the source was read and something was written down.
 * Whether any of it moved is what a comparison says, and it is a separate field for
 * exactly that reason.
 */
export const writtenDownSchema = z.object({
  at: z.string().datetime(),
});

/**
 * What a Facet or a Finding did between two readings of one Corpus.
 *
 * Two kinds, and both are about the knowledge. A Facet crossing the rung this
 * Corpus counts as approved is what moves the figures above; a Finding starting or
 * stopping is what moves the other one. A Facet that got further without being
 * approved is real work and is not here — the grid shows that, Facet by Facet, and
 * an item moving no figure on this page would send a reader looking for a number
 * that did not move.
 */
export const corpusChangeSchema = z.discriminatedUnion('changed', [
  z.object({
    changed: z.literal('facet'),
    moduleId: z.string().min(1),
    /** What the Facet is keyed on, and what to call it. Both from the Lens. */
    facet: z.string().min(1),
    label: z.string().min(1),
    /** True where it reached that rung, false where it fell off it. */
    approved: z.boolean(),
  }),
  z.object({
    changed: z.literal('finding'),
    /** What was found, in the words the Check reported it in and never a summary. */
    says: z.string().min(1),
    /** The Module it routes to, or nothing where it reaches nobody. */
    moduleId: z.string().min(1).nullable(),
    /** True where nothing said this before, false where it is no longer said. */
    appeared: z.boolean(),
  }),
]);

/**
 * What can be said about the knowledge since the last reading kept for this Corpus
 * — or which of three reasons means nothing can be.
 *
 * Four shapes rather than an empty list, because *nothing changed* and *nothing can
 * be worked out* are different facts and a reader acts on them differently
 * (LAW-006).
 *
 * The criteria are checked before the knowledge, in the order `trend` checks them
 * and for the same reason: a Facet asking for more than it did last week moves every
 * figure in the Corpus without a word of the knowledge changing, so a feed stated
 * across that would report the Corpus getting worse on the morning somebody raised
 * the bar (ADR-0016, §6).
 *
 * A recorded reading holds the figures and not the Facets they were counted from, so
 * this half is worked out again from the knowledge that reading was made of. Where
 * that knowledge is no longer on the shelf — pruned away, or written down in a form
 * this can no longer read — the figures still compare and this cannot, which is why
 * it is a statement of its own and not the absence of one.
 */
export const sinceSchema = z.discriminatedUnion('comparedWith', [
  z.object({ comparedWith: z.literal('no-earlier-reading') }),
  z.object({ comparedWith: z.literal('a-reading-under-other-criteria') }),
  z.object({ comparedWith: z.literal('knowledge-no-longer-held') }),
  z.object({
    comparedWith: z.literal('the-last-reading'),
    /** When that reading was taken, which is what everything below is stated since. */
    takenAt: z.string().datetime(),
    /**
     * What moved, in the Corpus's own order. Empty is a real answer and means the
     * knowledge has not moved since — which is why it is inside this shape and not
     * one of the three beside it.
     */
    changed: z.array(corpusChangeSchema),
  }),
]);

export const homeReadingSchema = z.discriminatedUnion('outcome', [
  ...WAYS_OF_HAVING_NO_READING,
  z.object({
    outcome: z.literal('read'),
    /** When the knowledge this reading is made of was written down from source. */
    sourceReadAt: z.string().datetime(),
    /** The Lens that declared the Facets every figure here is counted out of. */
    lensId: z.string().min(1),
    ladder: ladderSchema,
    /**
     * The two readings, side by side and never fused. No third figure is derived
     * from them here any more than anywhere else: they answer different questions,
     * demand different work, and often different people (spec §4).
     */
    readiness: readinessFigureSchema,
    integrity: integrityFigureSchema,
    /** How many Facets every per-Module figure below is stated out of (LAW-006). */
    declaredFacets: z.number().int().nonnegative(),
    needsWork: z.array(needsWorkSchema),
    /**
     * Every writing-down of this source the shelf still holds, oldest first.
     *
     * Its own horizon, and a wider one than the knowledge half below: a Seed is
     * retained whole, so every writing-down can still be named, where what a Facet
     * did before the last kept reading cannot be worked out from anything held.
     * Both horizons are stated at the surface rather than the wider one being cut
     * back to the narrower, because they are two different limits of what the shelf
     * knows.
     */
    writtenDown: z.array(writtenDownSchema),
    since: sinceSchema,
  }),
]);

export const corpusHomeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  reading: homeReadingSchema,
});

export type NeedsWork = z.infer<typeof needsWorkSchema>;
export type WrittenDown = z.infer<typeof writtenDownSchema>;
export type CorpusChange = z.infer<typeof corpusChangeSchema>;
export type Since = z.infer<typeof sinceSchema>;
export type HomeReading = z.infer<typeof homeReadingSchema>;
export type CorpusHome = z.infer<typeof corpusHomeSchema>;
