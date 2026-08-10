import { z } from 'zod';
import { ladderSchema } from './detail.js';

/**
 * One Module, whole: every Facet its Corpus's Lens declares, what state each one
 * is in, and — where a Facet is not approved — why not (spec §5.4).
 *
 * This is where a figure becomes a list of specific work, so the payload's job
 * is to make the *kind* of work unmistakable. Knowledge that is short on content
 * and knowledge that is sufficient but unapproved are different work for often
 * different people — write something down, versus get it reviewed — and are
 * never conflated here or drawn the same anywhere.
 */

/**
 * Somewhere a person can open to check a claim (LAW-009).
 *
 * The path is relative to where this Corpus's knowledge is kept. An absolute one
 * bakes in the machine that read it: it cannot be shared, compared, or quoted to
 * anybody else, which is the whole use a reader has for it.
 */
export const placeSchema = z.object({
  file: z.string().min(1),
  /** Counted from one, as an editor counts. */
  line: z.number().int().positive(),
});

/**
 * Why one criterion this Corpus's Lens declares was not met — as the parts of
 * the reason, never as a sentence.
 *
 * The wording belongs to whatever surface is speaking to the person: it writes
 * one sentence per kind of shortfall, from these parts, as a literal in its own
 * source. That is what makes LAW-010 provable here rather than merely intended —
 * a guard can read a literal, and cannot read a sentence assembled at runtime.
 * A reason sent as prose would also be prose written where nobody reading it
 * can see it.
 *
 * Each kind carries what it is stated against, because a shortfall without it is
 * the bare figure LAW-006 refuses: *one Source* means nothing until you know the
 * Lens asked for three.
 */
export const unmetCriterionSchema = z.discriminatedUnion('criterion', [
  z.object({
    criterion: z.literal('requiredAttributes'),
    /** What this Corpus calls the things nothing has been written down under. */
    missing: z.array(z.string().min(1)).min(1),
  }),
  z.object({
    criterion: z.literal('minSources'),
    has: z.number().int().nonnegative(),
    needs: z.number().int().positive(),
  }),
  z.object({
    criterion: z.literal('minRelations'),
    /** What this Corpus calls the kind of link it is short of. */
    relation: z.string().min(1),
    has: z.number().int().nonnegative(),
    needs: z.number().int().positive(),
  }),
  z.object({
    criterion: z.literal('allStatesReachable'),
    unreachable: z.array(z.string().min(1)).min(1),
  }),
]);

/**
 * One piece of knowledge written down under a Facet.
 *
 * Identified by where it is written down, and never by its own id. A Fact's id
 * is a Module's name only for a Module; for everything else it is the document
 * it came from and its position in it, which is not a name anybody chose and not
 * stable across an edit. Nothing in a Lens promises a piece of knowledge a name
 * at all — that some corpora give one is a property of the extractor they happen
 * to use. Where it is written down is the one thing every Corpus has, and it is
 * also the thing a reader can act on (LAW-009).
 *
 * Its attributes, its Sources as a set, and the text it was taken from belong to
 * Fact detail, which is its own surface.
 */
export const knowledgeSchema = z.object({
  at: placeSchema,
  /**
   * The step on this Corpus's ladder it is graded at, or nothing where the
   * Corpus said nothing about it. Sent as nothing so a surface can say that in
   * its own words rather than showing an empty space (LAW-010).
   */
  maturity: z.string().min(1).nullable(),
});

/**
 * How far one Module has got with one Facet, and what stands between it and
 * approval.
 *
 * One shape, keyed on the same four states the grid draws, so a page and a grid
 * cannot come to disagree about what a cell is. A union rather than a state
 * beside some optional fields, because that is what makes the distinction
 * structural instead of remembered: knowledge short on content *cannot* be sent
 * without saying what is missing from it, and knowledge that is sufficient but
 * unapproved *cannot* be sent without saying how much of it is unapproved. Which
 * step approval needs is named once, by the ladder alongside.
 */
export const moduleFacetSchema = z.discriminatedUnion('state', [
  z.object({
    facet: z.string().min(1),
    /** Nothing is written down here. It falls short of nothing; it is unwritten. */
    state: z.literal('absent'),
  }),
  z.object({
    facet: z.string().min(1),
    state: z.literal('present'),
    knowledge: z.array(knowledgeSchema).min(1),
    /** Never empty: this state is *what is written down is not yet enough*. */
    shortOf: z.array(unmetCriterionSchema).min(1),
  }),
  z.object({
    facet: z.string().min(1),
    state: z.literal('well-formed'),
    knowledge: z.array(knowledgeSchema).min(1),
    /**
     * How much of the knowledge here has not reached the step approval needs.
     * Never zero: at zero this Facet would be approved.
     */
    notYetApproved: z.number().int().positive(),
  }),
  z.object({
    facet: z.string().min(1),
    state: z.literal('approved'),
    knowledge: z.array(knowledgeSchema).min(1),
  }),
]);

/**
 * One open Finding against this Module.
 *
 * It reaches a reader as the sentence written for them and the place it cites,
 * and never as the Check's name for the defect. That name is how the product
 * talks to itself; several of them are words no business surface may show, and
 * arriving as data is exactly how such a word gets past a guard (LAW-010).
 */
export const findingSchema = z.object({
  says: z.string().min(1),
  at: placeSchema,
  /**
   * Further places the same defect concerns — the other place a Term is defined
   * differently, say. Always sent, empty where there are none, so a surface never
   * has to tell an absent list from an empty one.
   */
  alsoAt: z.array(placeSchema),
});

export const moduleReadingSchema = z.discriminatedUnion('outcome', [
  /**
   * Nothing has been written down from this Corpus's source, so this Module has
   * no reading — the same fact the list and the grid report, told apart the same
   * way, because a Module that cannot be found and a Corpus nobody has written
   * down yet send a reader to different places.
   */
  z.object({ outcome: z.literal('nothing-written-down-yet') }),
  z.object({
    outcome: z.literal('read'),
    sourceReadAt: z.string().datetime(),
    /**
     * The Lens the Facets below were declared by. A Facet nobody has written
     * anything under may be work not begun or a Facet this Corpus does not have,
     * and a reader can only tell by looking at what declared it.
     */
    lensId: z.string().min(1),
    ladder: ladderSchema,
    /**
     * Who answers for this Module, or nothing. Nothing is sent as nothing and
     * never as an empty name, because a surface has to be able to mark it: a
     * Module nobody answers for is a defect, and every Finding below routes to
     * nobody (LAW-007).
     */
    owner: z.string().min(1).nullable(),
    /** One entry per declared Facet, in the order the Lens declares them. */
    facets: z.array(moduleFacetSchema),
    /** Readiness for this Module, with what it is out of beside it (LAW-006). */
    approved: z.number().int().nonnegative(),
    declaredFacets: z.number().int().nonnegative(),
    /**
     * Integrity for this Module: the Findings against it, and never folded into
     * the Facets above. The two readings answer different questions and demand
     * different work, on this surface as on every other (spec §4).
     */
    findings: z.array(findingSchema),
    /**
     * What was looked for, and so what the Findings above are stated against.
     * Sent even when there are none: *no Findings* is a bare claim, and can only
     * ever mean *nothing these Checks would have found*.
     */
    lookedFor: z.array(z.string().min(1)).min(1),
  }),
]);

/**
 * One Module, and enough of its Corpus to say where a reader is.
 *
 * The figures are checked for agreement here rather than trusted. A Module
 * claiming more approved Facets than it lists, or stating its figure against a
 * denominator that is not the number of Facets it was read against, is a page
 * that is confidently wrong instead of visibly broken.
 */
export const corpusModuleSchema = z
  .object({
    corpus: z.object({ id: z.string().min(1), name: z.string().min(1) }),
    id: z.string().min(1),
    reading: moduleReadingSchema,
  })
  .superRefine((module, ctx) => {
    if (module.reading.outcome !== 'read') return;
    const { facets, approved, declaredFacets } = module.reading;

    if (declaredFacets !== facets.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['reading', 'declaredFacets'],
        message: `Module "${module.id}" states its figure out of ${declaredFacets}, where it lists ${facets.length} Facets`,
      });
    }

    const counted = facets.filter((facet) => facet.state === 'approved').length;
    if (approved !== counted) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['reading', 'approved'],
        message: `Module "${module.id}" reports ${approved} approved Facets and lists ${counted}`,
      });
    }

    for (const [position, facet] of facets.entries()) {
      if (facet.state !== 'well-formed') continue;
      if (facet.notYetApproved > facet.knowledge.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['reading', 'facets', position, 'notYetApproved'],
          message: `Facet "${facet.facet}" says ${facet.notYetApproved} of its ${facet.knowledge.length} are not yet approved`,
        });
      }
    }
  });

export type Place = z.infer<typeof placeSchema>;
export type UnmetCriterion = z.infer<typeof unmetCriterionSchema>;
export type Knowledge = z.infer<typeof knowledgeSchema>;
export type ModuleFacet = z.infer<typeof moduleFacetSchema>;
export type ModuleFinding = z.infer<typeof findingSchema>;
export type ModuleReading = z.infer<typeof moduleReadingSchema>;
export type CorpusModule = z.infer<typeof corpusModuleSchema>;
