import { z } from 'zod';

/**
 * Every way a Corpus can have no reading, said once for every surface that has to
 * answer for it (spec §8).
 *
 * Six payloads carry a reading — the list, the grid, Home, the Inbox, a Module and
 * a Fact — and each of them tells a Corpus with a reading apart from one without in
 * the payload rather than by an absent field, because they are different facts about
 * the knowledge and a reader is owed the difference.
 *
 * Spelled out six times, they were six chances for one surface to learn a new way of
 * having no reading and five to go on drawing the old sentence for it — which is not
 * a blank space but something worse: the wrong true-sounding one. *Nothing has been
 * written down from this source yet* is what all six said about a Corpus whose
 * knowledge had been written down and could not be read back, and it invited a reader
 * to go and read a source that had already been read.
 *
 * So the ways of having none are declared here and every union spreads them. A
 * seventh surface cannot be added that knows about one and not the other, and neither
 * can a third way of having no reading be added to one surface alone.
 */
export const WAYS_OF_HAVING_NO_READING = [
  /** The source has never been read, so there is nothing to read a Corpus from. */
  z.object({ outcome: z.literal('nothing-written-down-yet') }),
  /**
   * The source was read and what it says cannot be read back, so this Corpus has
   * knowledge and no reading of it.
   *
   * The reason travels with it and is required. The whole of this outcome is the
   * reason: without one it is the blank space it replaced, wearing a name (LAW-006).
   * And it carries no figure of any kind — a Corpus that cannot be read has no
   * Modules to count and nothing was looked for in it, so it has neither
   * denominator, and a zero in place of either would read as a Corpus measured and
   * found empty rather than one not measured at all.
   */
  z.object({ outcome: z.literal('could-not-be-read'), because: z.string().min(1) }),
] as const;

/**
 * A Corpus with no reading, whichever way it has none.
 *
 * Named so the server can decide which of the two once for all six surfaces. Six
 * decisions would be six chances for one page to answer *nothing has been written
 * down from this source yet* about a Corpus whose source had been read.
 */
export const noReadingSchema = z.discriminatedUnion('outcome', [...WAYS_OF_HAVING_NO_READING]);

export type NoReading = z.infer<typeof noReadingSchema>;

/**
 * A set of criteria on a shelf that could not be followed, so the Corpus it
 * describes cannot be read at all (spec §8).
 *
 * Beside the Corpus in the list rather than among them, because it is not one yet.
 * What says a Corpus has an id, a name, Modules and a page is the file that could not
 * be read, so putting it in the list means inventing all four — and every page the
 * invented id led to would then have to answer for a Corpus nothing knows anything
 * about.
 *
 * The file it is written in is the only name it has, and it is also the one thing to
 * act on. This is the one message in the product that reaches nobody the product
 * knows: a Lens is hand-authored, there is no Module and so no Owner to route it to,
 * and no reading in which to raise a Finding. LAW-007 says a finding belonging to
 * nobody is a dashboard — the exception is named rather than hidden, and it is
 * answered the only way it can be, by the sentence carrying its own remedy.
 */
export const criteriaNotFollowedSchema = z.object({
  /** The file, by the name it has on the shelf and never by where a machine keeps it. */
  where: z.string().min(1),
  because: z.string().min(1),
});

export type CriteriaNotFollowed = z.infer<typeof criteriaNotFollowedSchema>;
