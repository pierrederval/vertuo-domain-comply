import { z } from 'zod';
import { WAYS_OF_HAVING_NO_READING } from './no-reading.js';
import { sourceTextSchema } from './fact.js';
import { placeSchema } from './module.js';

/**
 * One Corpus's Findings as a queue apiece, the ones reaching nobody first
 * (spec §5.2).
 *
 * The surface where the other reading becomes a list of specific work for a named
 * person. A score, a gap or a violation that belongs to nobody is a dashboard: the
 * person is what makes compliance tooling work, and removing them is how a
 * knowledge base quietly dies (LAW-007, ADR-0010). So the order of the queues is
 * part of what the two sides agree rather than something a surface decides, and the
 * ones nobody answers for cannot be put anywhere but first.
 */

/**
 * One place a Finding concerns, and the source text at it.
 *
 * The text travels with the Finding for the reason it travels with a piece of
 * knowledge: a place is verifiable evidence for somebody at a terminal and useless
 * to somebody in a browser who cannot open it (LAW-009, ADR-0030). Nothing where
 * the knowledge on the shelf holds no text for the place — which is not a fault
 * here, because a Finding may cite a place precisely to say nothing is written at
 * it.
 */
export const citedPlaceSchema = z.object({
  at: placeSchema,
  /**
   * The Module that writes knowledge at this place, or nothing where none does.
   *
   * Resolved from the place and never from the Finding, because the two disagree
   * and often: a Finding routes to the Module it is *about* and cites the place the
   * words are *written*, which another Module may own. An address for the knowledge
   * at this place built out of the Finding's own Module would send a reader to a
   * Module that writes nothing there.
   */
  writtenUnder: z.string().min(1).nullable(),
  quoted: sourceTextSchema.nullable(),
});

/**
 * One open Finding, as the person who has to answer for it meets it.
 *
 * It reaches a reader as the sentence written for them, the Module it routes to,
 * the places it cites with their text, and the name of the Check that found it.
 *
 * That last one was withheld here, on the grounds that the Check's name is how the
 * product talks to itself and that a word no business surface may show would arrive
 * as data and get past a guard (LAW-010). Both halves of that were already untrue.
 * Every code is drawn on the surface that shows these Findings — in the sentence
 * naming what was looked for, which is this figure's denominator — and the surface
 * guard's list is applied to codes for exactly that reason (ADR-0028, ADR-0035). So
 * the vocabulary was on the page and only the row-by-row use of it was missing, which
 * is the one place it tells a reader something: a queue of a hundred where one kind of
 * defect accounts for most of it cannot be read at all until the kinds can be told
 * apart (ADR-0041).
 *
 * There is nowhere here to keep that somebody dismissed it, hid it, or has seen it.
 * A Finding is resolved by the knowledge changing and the Finding no longer being
 * found, and nothing in this product may hold what a rebuild could not reproduce
 * (LAW-011). A field for it is how such a thing arrives.
 */
export const inboxFindingSchema = z.object({
  says: z.string().min(1),
  /**
   * The Check that found it, by the name the Check gives itself.
   *
   * Always sent and never empty. A Finding whose kind is unstated is one a reader
   * cannot group, count apart or filter out, and on a queue of a hundred that is the
   * difference between a list and a wall. It is the Check's own code and not a
   * sentence about it: `lookedFor` states the same vocabulary as this figure's
   * denominator, and two spellings of one Check's name across one page is how the
   * denominator stops matching what it is counting.
   */
  foundBy: z.string().min(1),
  /**
   * The Module it routes to, or nothing where it belongs to no Module at all.
   *
   * Nothing rather than an empty name, for the reason every owner field says it: an
   * empty name cannot be marked, and a Finding belonging to no Module is one that
   * appears nowhere else in the product — no Module's page can show it, because
   * showing it there would make it look answered for.
   */
  moduleId: z.string().min(1).nullable(),
  /** The place it is about. */
  cites: citedPlaceSchema,
  /**
   * Every further place the same defect concerns — the other place a word is
   * defined differently, say. Always sent, empty where there are none, so a surface
   * never has to tell an absent list from an empty one.
   */
  alsoCites: z.array(citedPlaceSchema),
});

/**
 * Everything reaching one person, or everything reaching nobody.
 *
 * Never empty. A person with nothing to answer for has no queue rather than an
 * empty one: drawn, an empty queue reads as work that has been dealt with, and that
 * is a claim nothing here can make.
 */
export const routedFindingsSchema = z.object({
  /** Who answers for these, or nothing where nobody does. */
  owner: z.string().min(1).nullable(),
  findings: z.array(inboxFindingSchema).min(1),
});

export const inboxReadingSchema = z.discriminatedUnion('outcome', [
  /**
   * Nothing has been written down from this Corpus's source, so there is nothing
   * to have found anything in — which is a different answer from a Corpus nothing
   * was found in, and sends a reader somewhere else.
   */
  ...WAYS_OF_HAVING_NO_READING,
  z.object({
    outcome: z.literal('read'),
    sourceReadAt: z.string().datetime(),
    lensId: z.string().min(1),
    /**
     * One queue per person who answers for something, with the queue reaching
     * nobody first. Empty where nothing was found at all.
     *
     * The named queues follow in the order their person first answers for a
     * Module in this Corpus — the Corpus's own order, and not one this product
     * invented. Ordering them by how much each holds would be a ranking, which is
     * a figure by another name and would put the person with most to do at the top
     * for no reason a reader could act on.
     */
    routesTo: z.array(routedFindingsSchema),
    /**
     * What was looked for, and so what the queues above are stated against. Sent
     * even when they are empty: *nothing was found* is a bare claim, and can only
     * ever mean *nothing these Checks would have found* (LAW-006).
     */
    lookedFor: z.array(z.string().min(1)).min(1),
  }),
]);

/**
 * One Corpus's Findings, and enough of the Corpus to say where a reader is.
 *
 * Checked for agreement here rather than trusted, on the three points a server could
 * break and a surface would then draw as though it were the reading: the queue
 * reaching nobody put anywhere but first, one person's Findings split across two
 * queues, and a Finding filed under a Check that is not among the ones this figure is
 * counted against.
 */
export const corpusInboxSchema = z
  .object({
    corpus: z.object({ id: z.string().min(1), name: z.string().min(1) }),
    reading: inboxReadingSchema,
  })
  .superRefine((held, ctx) => {
    if (held.reading.outcome !== 'read') return;
    const { routesTo, lookedFor } = held.reading;

    /*
     * What was looked for is this figure's denominator, so a Finding filed under a
     * Check that is not in it is a row counted against something that did not run —
     * and on a surface that offers the same list as a way to narrow, it is a row no
     * filter can reach and a kind no reader can rule out. One vocabulary or the two
     * halves of the figure stop describing each other (LAW-006).
     */
    const ran = new Set(lookedFor);
    for (const [position, queue] of routesTo.entries()) {
      for (const [at, finding] of queue.findings.entries()) {
        if (ran.has(finding.foundBy)) continue;
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['reading', 'routesTo', position, 'findings', at, 'foundBy'],
          message: `A Finding is filed under "${finding.foundBy}", which is not among the Checks it is counted against`,
        });
      }
    }

    const nobody = routesTo.findIndex((queue) => queue.owner === null);
    if (nobody > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['reading', 'routesTo', nobody],
        message: `The Findings reaching nobody are ${nobody} queues down, where they answer to no one and are read last`,
      });
    }

    for (const [position, queue] of routesTo.entries()) {
      const first = routesTo.findIndex((other) => other.owner === queue.owner);
      if (first !== position) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['reading', 'routesTo', position, 'owner'],
          message:
            queue.owner === null
              ? 'The Findings reaching nobody are in two queues, and a reader who reads the first cannot know the second is there'
              : `"${queue.owner}" has two queues, and a reader who reads the first cannot know the second is there`,
        });
      }
    }
  });

export type CitedPlace = z.infer<typeof citedPlaceSchema>;
export type InboxFinding = z.infer<typeof inboxFindingSchema>;
export type RoutedFindings = z.infer<typeof routedFindingsSchema>;
export type InboxReading = z.infer<typeof inboxReadingSchema>;
export type CorpusInbox = z.infer<typeof corpusInboxSchema>;
