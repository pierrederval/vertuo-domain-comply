import { z } from 'zod';

/**
 * Reading one Corpus's source again (spec §5.5).
 *
 * The one thing the product does that changes what it holds. Everything else is a
 * reading, which is free and computed per request; this writes down what is at source
 * and takes it in, which is the Door's second operation and the only way knowledge
 * arrives (LAW-002).
 *
 * What comes back says what happened to the knowledge and nothing about the run. How
 * long it took, how many documents were opened and whether a reading went on record
 * are the product's own bookkeeping — a reader has nothing to do about any of them,
 * and a surface reporting them would be reporting the tooling to the business
 * (ADR-0012).
 *
 * The age of the reading is deliberately absent. It is shown wherever a reading is
 * shown, from the one derivation that produces it, and a second copy arriving here
 * would be a second answer to *how old is this* on the very screen where the first
 * one is expected to move.
 */
export const sourceWasReadSchema = z.discriminatedUnion('outcome', [
  z.object({
    outcome: z.literal('read'),
    /**
     * True where what is at source said nothing that was not already written down.
     *
     * A real answer and the common one: a person presses this because they want to
     * know, not because they know something changed. Told apart from a read that
     * found something, because *nothing to bring in* and *brought something in* send
     * a reader to different places, and one sentence for both would leave somebody
     * looking for a change that is not there.
     */
    unchangedAtSource: z.boolean(),
  }),
  z.object({
    outcome: z.literal('could-not-read'),
    /**
     * What went wrong, in words a person can act on, and never a fault code.
     *
     * The error state a business reader is most likely to meet: the documents are a
     * separate checkout and a shelf outlives one. What was already read stands, so
     * this is a sentence beside an intact reading and never a screen with nothing on
     * it (LAW-010, spec §8).
     */
    because: z.string().min(1),
  }),
]);

export type SourceWasRead = z.infer<typeof sourceWasReadSchema>;
