import { z } from 'zod';
import { WAYS_OF_HAVING_NO_READING } from './no-reading.js';
import { ladderSchema } from './detail.js';
import { placeSchema } from './module.js';

/**
 * One piece of knowledge, whole: what it says, how far along it is, what backs it
 * up, where it came from, and the source text it was read out of (spec §5.4).
 *
 * The surface the Module page's list of places drills into. A place is verifiable
 * evidence for an engineer at a terminal and useless to somebody in a browser who
 * cannot open it, so this is where the cited text itself reaches a reader and
 * every claim on it becomes checkable where it is made (LAW-009).
 */

/**
 * One part of a piece of knowledge, as its source writes it.
 *
 * `named` is this Corpus's own word for the part — a column header, a subheading,
 * whatever the Lens maps onto an attribute — and is drawn, never interpreted
 * (LAW-004).
 *
 * `says` is a list because a source may write the same part more than once, and
 * an attribute then holds each passage separately (ADR-0026). They are never
 * joined: two passages that are not next to each other in the source, handed to a
 * reader as continuous prose, are not what the source says (ADR-0017). There is
 * deliberately no shape here that could carry them fused, so a server cannot join
 * them and a page cannot be handed them joined.
 */
export const writtenPartSchema = z.object({
  named: z.string().min(1),
  says: z.array(z.string().min(1)).min(1),
});

/**
 * The source text a piece of knowledge was read out of, exactly as written.
 *
 * Never summarised, reworded, or assembled out of lines that are not next to each
 * other. Cutting is the only alteration there is, and `cut` says when it happened
 * so the surface can send the reader to the origin for the rest — a cut with a
 * pointer is honest about being partial in a way a summary is not (LAW-006,
 * LAW-009, ADR-0017).
 */
export const sourceTextSchema = z.object({
  says: z.string().min(1),
  cut: z.boolean(),
});

export const factReadingSchema = z.discriminatedUnion('outcome', [
  /**
   * Nothing has been written down from this Corpus's source, so there is no
   * knowledge at the place asked about — which is a different answer from a place
   * this Corpus has nothing at, and sends a reader somewhere else.
   */
  ...WAYS_OF_HAVING_NO_READING,
  z.object({
    outcome: z.literal('read'),
    /** When the knowledge this reading is made of was written down from source. */
    sourceReadAt: z.string().datetime(),
    lensId: z.string().min(1),
    /**
     * The rungs this Corpus grades against, so the page can draw where this sits
     * on them rather than leaving a reader to take one word on trust (LAW-009).
     */
    ladder: ladderSchema,
    /** Where it is written down, which is the only name every Corpus gives it. */
    at: placeSchema,
    /** The Module it belongs to, so a reader has a way back to the rest of it. */
    moduleId: z.string().min(1),
    /**
     * The Facet it is written under: what it is keyed on and what to call it.
     * Kept apart for the reason `declaredFacetSchema` keeps them apart — a label
     * is drawn and a name is keyed on, and one standing for both makes renaming
     * what a Facet is called into a different Facet.
     */
    facet: z.string().min(1),
    label: z.string().min(1),
    /**
     * The rung this Corpus grades it at, or nothing where it graded it at nothing.
     * Never merged with the set below: how far along a piece of knowledge is and
     * how well backed it is are independent readings, and conflating them is what
     * made coverage uncomputable in the first place (LAW-005, ADR-0006).
     */
    maturity: z.string().min(1).nullable(),
    /**
     * Everywhere this Corpus says the knowledge came from, as the set it is —
     * never a count, never a rung, and never in either's place.
     *
     * Each entry is a place as the Corpus writes it, quoted and not tidied: a
     * corpus writes half of them as a bare path and half as a path with a note
     * narrowing which part of it, so anything folding the first would leave the
     * second alone and the set would be half one thing and half another
     * (ADR-0029, LAW-009). Empty where nothing says where it came from.
     */
    sources: z.array(z.string().min(1)),
    /** Its parts, in the order the source writes them. */
    written: z.array(writtenPartSchema),
    /**
     * The source text it was read out of, or nothing where the knowledge on the
     * shelf no longer holds the text it was taken from.
     *
     * Nothing rather than an empty quotation: a reader shown one has been shown a
     * claim they cannot check and told nothing about why, and the surface owes
     * them the difference.
     */
    quoted: sourceTextSchema.nullable(),
  }),
]);

/**
 * One piece of knowledge, and enough of its Corpus to say where a reader is.
 *
 * Checked for agreement here rather than trusted, on the two points where a
 * server could send something a page would draw confidently and wrongly: a rung
 * the ladder beside it does not have, and one part arriving twice.
 */
export const corpusFactSchema = z
  .object({
    corpus: z.object({ id: z.string().min(1), name: z.string().min(1) }),
    reading: factReadingSchema,
  })
  .superRefine((held, ctx) => {
    if (held.reading.outcome !== 'read') return;
    const { ladder, maturity, written } = held.reading;

    if (maturity !== null && !ladder.levels.includes(maturity)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['reading', 'maturity'],
        message: `This is graded at "${maturity}", which is not a rung of [${ladder.levels.join(', ')}]`,
      });
    }

    for (const [position, part] of written.entries()) {
      const first = written.findIndex((other) => other.named === part.named);
      if (first !== position) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['reading', 'written', position, 'named'],
          message: `"${part.named}" is written down twice, so neither set of passages can be told to be the one this reading was made of`,
        });
      }
    }
  });

export type WrittenPart = z.infer<typeof writtenPartSchema>;
export type SourceText = z.infer<typeof sourceTextSchema>;
export type FactReading = z.infer<typeof factReadingSchema>;
export type CorpusFact = z.infer<typeof corpusFactSchema>;
