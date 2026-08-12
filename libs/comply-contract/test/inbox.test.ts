import { describe, expect, it } from 'vitest';
import { corpusInboxSchema } from '../src/index.js';

/**
 * One Corpus's Findings as the server would answer for them: the ones nobody
 * answers for first, then one queue per person who does.
 *
 * The first queue holds both kinds of Finding that reach nobody — one belonging to
 * a Module nobody answers for, and one belonging to no Module at all. The second
 * carries a Finding that concerns two places, one of them written under a Module
 * other than the one the Finding routes to.
 *
 * Deliberately shapeless names. Anything here that read like a real Module, a real
 * person or a real defect would be one Corpus's shape written into the agreement
 * both sides work from (LAW-004).
 */
const INBOX = {
  corpus: { id: 'c1', name: 'C One' },
  reading: {
    outcome: 'read',
    sourceReadAt: '2026-01-01T00:00:00.000Z',
    lensId: 'c1',
    routesTo: [
      {
        owner: null,
        findings: [
          {
            says: 'nobody answers for this',
            moduleId: 'm2',
            cites: {
              at: { file: 'two.md', line: 4 },
              writtenUnder: 'm2',
              quoted: { says: '## a heading', cut: false },
            },
            alsoCites: [],
          },
          {
            says: 'this belongs to no Module',
            moduleId: null,
            cites: { at: { file: 'three.md', line: 1 }, writtenUnder: null, quoted: null },
            alsoCites: [],
          },
        ],
      },
      {
        owner: 'p1',
        findings: [
          {
            says: 'two things are called the same and are not the same',
            moduleId: 'm1',
            cites: {
              at: { file: 'one.md', line: 3 },
              writtenUnder: 'm1',
              quoted: { says: 'one thing', cut: false },
            },
            alsoCites: [
              {
                at: { file: 'two.md', line: 9 },
                writtenUnder: 'm2',
                quoted: { says: 'the other thing', cut: true },
              },
            ],
          },
        ],
      },
    ],
    lookedFor: ['a-check', 'another-check'],
  },
};

/** The same Inbox, with one part of its reading replaced. */
function reading(part: Record<string, unknown>): unknown {
  return { ...INBOX, reading: { ...INBOX.reading, ...part } };
}

/** The queues of that Inbox, or a failure saying its source was written down. */
function queues(held: unknown) {
  const parsed = corpusInboxSchema.parse(held);
  if (parsed.reading.outcome !== 'read') throw new Error('the source was written down');
  return parsed.reading.routesTo;
}

describe('one Corpus’s Findings, as a queue apiece', () => {
  it('accepts one as the server would answer for it', () => {
    expect(corpusInboxSchema.safeParse(INBOX).success).toBe(true);
  });

  it('refuses a queue that puts somebody’s Findings above the ones reaching nobody', () => {
    // A violation belonging to nobody is how a knowledge base quietly dies, so
    // the order is part of the agreement and not a rendering choice: mixed in
    // among named queues, unowned Findings reproduce exactly the failure LAW-007
    // exists to prevent, and no surface can put them there.
    const [nobody, somebody] = INBOX.reading.routesTo;

    expect(corpusInboxSchema.safeParse(reading({ routesTo: [somebody, nobody] })).success).toBe(
      false,
    );
  });

  it('refuses one person’s Findings split across two queues', () => {
    // Two queues under one name is two answers to *what is mine to do*, and a
    // reader who reads the first has no way to know the second is there.
    const twice = reading({
      routesTo: [
        { owner: 'p1', findings: INBOX.reading.routesTo[1]!.findings },
        { owner: 'p1', findings: INBOX.reading.routesTo[1]!.findings },
      ],
    });

    expect(corpusInboxSchema.safeParse(twice).success).toBe(false);
  });

  it('refuses a queue with nothing in it', () => {
    // A person with nothing to do has no queue, rather than an empty one. Drawn,
    // an empty queue reads as work that has been dealt with — which is a claim
    // nothing here can make.
    expect(corpusInboxSchema.safeParse(reading({ routesTo: [{ owner: 'p1', findings: [] }] })).success)
      .toBe(false);
    expect(corpusInboxSchema.safeParse(reading({ routesTo: [{ owner: null, findings: [] }] })).success)
      .toBe(false);
  });

  it('accepts a Corpus nothing was found in, still stated against what was looked for', () => {
    // Not a bare *none*: it can only ever mean none that these Checks would have
    // found, so what ran is sent even when it found nothing (LAW-006).
    expect(corpusInboxSchema.safeParse(reading({ routesTo: [] })).success).toBe(true);
    expect(corpusInboxSchema.safeParse(reading({ routesTo: [], lookedFor: [] })).success).toBe(
      false,
    );
  });

  it('tells a Finding that belongs to no Module from one that belongs to a Module nobody answers for', () => {
    const [nobody] = queues(INBOX);
    const [unowned, unattached] = nobody!.findings;

    // Both reach nobody and they are different work: one needs a person named
    // against a Module, the other needs somebody to work out which Module it is
    // about at all. Sent apart, because a surface has to be able to say which.
    expect(nobody!.owner).toBeNull();
    expect(unowned!.moduleId).toBe('m2');
    expect(unattached!.moduleId).toBeNull();
    // Nothing rather than an empty name, for the reason every owner field says
    // it: an empty name cannot be marked, and a Finding belonging to no Module is
    // one nothing on the grid shows.
    expect(
      corpusInboxSchema.safeParse(
        reading({
          routesTo: [{ owner: null, findings: [{ ...unattached, moduleId: '' }] }],
        }),
      ).success,
    ).toBe(false);
  });

  it('carries the source text at each place a Finding cites, and says nothing where there is none', () => {
    const [nobody, somebody] = queues(INBOX);

    // A place is verifiable evidence for somebody at a terminal and useless to
    // somebody in a browser who cannot open it, so the cited text travels with
    // the Finding (LAW-009, ADR-0030).
    expect(somebody!.findings[0]!.cites.quoted).toEqual({ says: 'one thing', cut: false });
    // Nothing rather than an empty quotation. A Finding may cite a place
    // precisely because nothing is written at it, and the two are not the same.
    expect(nobody!.findings[1]!.cites.quoted).toBeNull();
    expect(
      corpusInboxSchema.safeParse(
        reading({
          routesTo: [
            {
              owner: null,
              findings: [
                {
                  ...nobody!.findings[1],
                  cites: { at: { file: 'three.md', line: 1 }, writtenUnder: null, quoted: { says: '', cut: false } },
                },
              ],
            },
          ],
        }),
      ).success,
    ).toBe(false);
  });

  it('carries every further place one Finding concerns, each with its own text', () => {
    const [, somebody] = queues(INBOX);
    const [contradiction] = somebody!.findings;

    // A defect about two statements that disagree is about both of them, and
    // evidence is not summarised into the one place it fits (LAW-009). Always
    // sent, empty where there are none, so a surface never has to tell an absent
    // list from an empty one.
    expect(contradiction!.alsoCites).toHaveLength(1);
    expect(contradiction!.alsoCites[0]!.quoted).toEqual({ says: 'the other thing', cut: true });
    expect(queues(INBOX)[0]!.findings[0]!.alsoCites).toEqual([]);
  });

  it('names the Module that writes at a cited place apart from the one the Finding routes to', () => {
    const [, somebody] = queues(INBOX);
    const [contradiction] = somebody!.findings;

    // The two disagree, and often: a Finding routes to the Module it is about and
    // cites the place the words are written, which another Module may own. An
    // address for that place built out of the Finding's own Module would send a
    // reader to a Module that writes nothing there.
    expect(contradiction!.moduleId).toBe('m1');
    expect(contradiction!.alsoCites[0]!.writtenUnder).toBe('m2');
    // Nothing where no knowledge is written at the place at all, which is the
    // case for every Finding whose whole point is that nothing is there.
    expect(queues(INBOX)[0]!.findings[1]!.cites.writtenUnder).toBeNull();
  });

  it('holds nothing on a Finding that a reading could not produce again', () => {
    const [, somebody] = queues(INBOX);

    // A Finding is resolved by knowledge changing and the Finding no longer being
    // found. There is nowhere here to keep that somebody dismissed it, hid it, or
    // has seen it — nothing in this product may hold what a rebuild could not
    // reproduce (LAW-011), and a field for it is how one arrives.
    expect(Object.keys(somebody!.findings[0]!).sort()).toEqual([
      'alsoCites',
      'cites',
      'moduleId',
      'says',
    ]);
    expect(Object.keys(somebody!).sort()).toEqual(['findings', 'owner']);
  });

  it('says nothing has been written down from this source rather than sending an empty queue', () => {
    const unread = {
      corpus: { id: 'c1', name: 'C One' },
      reading: { outcome: 'nothing-written-down-yet' },
    };

    // A Corpus nobody has read and a Corpus nothing was found in send a reader to
    // different places, and an empty queue for both would say the second.
    expect(corpusInboxSchema.safeParse(unread).success).toBe(true);
  });
});
