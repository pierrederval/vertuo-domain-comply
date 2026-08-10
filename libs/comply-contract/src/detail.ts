import { z } from 'zod';
import { integrityFigureSchema, readinessFigureSchema } from './corpus.js';

/**
 * The whole reading of one Corpus: every Module against every Facet its Lens
 * declares, which is what the Corpus page is (spec §5.3).
 *
 * Where the list carries two headline figures, this carries the grid they are
 * made of. Both are agreed here once, so a surface can only draw what a server
 * could actually send.
 */

/** How far one Module has got with one Facet. Four states, and no fifth. */
export const facetStateSchema = z.enum(['absent', 'present', 'well-formed', 'approved']);

/**
 * The rungs this Corpus's knowledge is graded against, in order, and which of
 * them counts as approved.
 *
 * Sent rather than assumed. The rungs are one Corpus's own words — nothing in a
 * surface may know them (LAW-004) — so being told is the only way a page can say
 * what approved means here rather than leaving a reader to guess.
 */
export const ladderSchema = z
  .object({
    levels: z.array(z.string().min(1)).min(1),
    approvedAtOrAbove: z.string().min(1),
  })
  .refine((ladder) => ladder.levels.includes(ladder.approvedAtOrAbove), {
    message: 'the rung that counts as approved is not on the ladder',
    path: ['approvedAtOrAbove'],
  });

/**
 * What one Module's figure has done since the last reading kept for comparison.
 *
 * Two shapes rather than a number that is sometimes absent, so that *there is
 * nothing to compare this with* cannot be sent as, drawn as, or mistaken for
 * *nothing changed*. They are different facts about a Module: one says a reading
 * is the first of its kind, the other says work has stood still. A first-ever
 * reading shown as zero movement is the reassurance LAW-006 exists to refuse.
 */
export const movementSchema = z.discriminatedUnion('comparedWith', [
  z.object({ comparedWith: z.literal('no-earlier-reading') }),
  z.object({
    comparedWith: z.literal('the-last-reading'),
    /** Approved Facets gained, or lost where it is negative. Zero means held steady. */
    approvedDelta: z.number().int(),
  }),
]);

export const moduleCellSchema = z.object({
  facet: z.string().min(1),
  state: facetStateSchema,
});

export const moduleRowSchema = z.object({
  id: z.string().min(1),
  /**
   * Who answers for this Module, or nothing.
   *
   * Nothing is sent as nothing and never as an empty name, because a surface has
   * to be able to mark it. A Module nobody answers for is a defect and not a
   * blank: every Finding against it routes to nobody (LAW-007, ADR-0010).
   */
  owner: z.string().min(1).nullable(),
  /** One cell per declared Facet, in the order the Facets are declared. */
  cells: z.array(moduleCellSchema),
  approved: z.number().int().nonnegative(),
  /** The denominator this Module's figure is stated against (LAW-006). */
  declaredFacets: z.number().int().nonnegative(),
  movement: movementSchema,
});

export const wholeReadingSchema = z.discriminatedUnion('outcome', [
  z.object({ outcome: z.literal('nothing-written-down-yet') }),
  z.object({
    outcome: z.literal('read'),
    /** When the knowledge this reading is made of was written down from source. */
    sourceReadAt: z.string().datetime(),
    /**
     * The Lens the Facets below were declared by, so a reader who finds a Facet
     * nobody has filled knows what to go and change. An all-absent column is as
     * often a defect in the denominator as it is work nobody has started
     * (spec §5.3).
     */
    lensId: z.string().min(1),
    ladder: ladderSchema,
    /** Every Facet the Lens declares, including any no Module has filled. */
    facets: z.array(z.string().min(1)),
    /** Every Module, including any with nothing in it. */
    modules: z.array(moduleRowSchema),
    /**
     * The two readings, side by side and never fused — on this page as on the
     * list. The grid below is Readiness; Integrity is not folded into a cell, a
     * row, or a column of it (spec §4).
     */
    readiness: readinessFigureSchema,
    integrity: integrityFigureSchema,
  }),
]);

/**
 * One Corpus, whole.
 *
 * The grid is checked for squareness here rather than trusted: a row one cell
 * short would draw every state after the gap under the wrong Facet, which is a
 * page that is confidently wrong instead of visibly broken.
 */
export const corpusDetailSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    reading: wholeReadingSchema,
  })
  .superRefine((corpus, ctx) => {
    if (corpus.reading.outcome !== 'read') return;
    const { facets, modules } = corpus.reading;

    for (const [position, module] of modules.entries()) {
      const under = module.cells.map((cell) => cell.facet);
      if (under.length !== facets.length || under.some((facet, at) => facet !== facets[at])) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['reading', 'modules', position, 'cells'],
          message: `Module "${module.id}" has cells for [${under.join(', ')}] where the Lens declares [${facets.join(', ')}]`,
        });
      }
      if (module.declaredFacets !== facets.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['reading', 'modules', position, 'declaredFacets'],
          message: `Module "${module.id}" states its figure out of ${module.declaredFacets}, where the Lens declares ${facets.length} Facets`,
        });
      }
    }
  });

export type FacetState = z.infer<typeof facetStateSchema>;
export type Ladder = z.infer<typeof ladderSchema>;
export type Movement = z.infer<typeof movementSchema>;
export type ModuleCell = z.infer<typeof moduleCellSchema>;
export type ModuleRow = z.infer<typeof moduleRowSchema>;
export type WholeReading = z.infer<typeof wholeReadingSchema>;
export type CorpusDetail = z.infer<typeof corpusDetailSchema>;
