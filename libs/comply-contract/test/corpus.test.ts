import { describe, expect, it } from 'vitest';
import { corpusListSchema, corpusSummarySchema } from '../src/index.js';

function summary(reading: unknown): unknown {
  return { id: 'c1', name: 'C One', reading };
}

const READING = {
  outcome: 'read',
  sourceReadAt: '2026-01-01T00:00:00.000Z',
  readiness: { modulesFullyApproved: 3, modules: 20 },
  integrity: { openFindings: 14, lookedFor: ['split-identity'] },
};

describe('what the two sides agree a Corpus looks like', () => {
  it('accepts a Corpus that has been read', () => {
    expect(corpusSummarySchema.safeParse(summary(READING)).success).toBe(true);
  });

  it('accepts a Corpus whose source has never been read', () => {
    const parsed = corpusSummarySchema.safeParse(summary({ outcome: 'nothing-written-down-yet' }));
    expect(parsed.success).toBe(true);
  });

  it('refuses a reading that will not say how old it is', () => {
    const { sourceReadAt: _omitted, ...ageless } = READING;
    expect(corpusSummarySchema.safeParse(summary(ageless)).success).toBe(false);
  });

  it('refuses either figure sent without what it is out of', () => {
    // A count on its own reads as a verdict on the whole Corpus. Rejected at the
    // boundary, so no surface ever has the chance to draw one (LAW-006).
    const withoutModules = { ...READING, readiness: { modulesFullyApproved: 3 } };
    const withoutChecks = { ...READING, integrity: { openFindings: 14, lookedFor: [] } };

    expect(corpusSummarySchema.safeParse(summary(withoutModules)).success).toBe(false);
    expect(corpusSummarySchema.safeParse(summary(withoutChecks)).success).toBe(false);
  });

  it('carries the two readings and nothing standing for both', () => {
    const parsed = corpusSummarySchema.parse(summary(READING));
    if (parsed.reading.outcome !== 'read') throw new Error('the reading was taken');

    // Whatever else changes here, a single figure for a Corpus's worth does not
    // arrive: it routes to nobody and implies nothing is missing (spec §4).
    expect(Object.keys(parsed.reading).sort()).toEqual([
      'integrity', 'outcome', 'readiness', 'sourceReadAt',
    ]);
  });

  it('drops anything the two sides did not agree on', () => {
    const parsed = corpusSummarySchema.parse(summary({ ...READING, score: 15, grade: 'B' }));
    if (parsed.reading.outcome !== 'read') throw new Error('the reading was taken');

    expect(parsed.reading).not.toHaveProperty('score');
    expect(parsed.reading).not.toHaveProperty('grade');
  });

  it('accepts a shelf holding no Corpus at all', () => {
    expect(corpusListSchema.parse({ corpus: [], criteriaNotFollowed: [] })).toEqual({
      corpus: [],
      criteriaNotFollowed: [],
    });
  });
});

/**
 * A Corpus that cannot be read, and the two different things that can mean
 * (spec §8).
 */
describe('what the two sides agree an unreadable Corpus looks like', () => {
  it('accepts a Corpus whose knowledge could not be read, with the reason', () => {
    const parsed = corpusSummarySchema.safeParse(
      summary({ outcome: 'could-not-be-read', because: 'it is written in a form nothing here reads' }),
    );
    expect(parsed.success).toBe(true);
  });

  it('refuses one that will not say why', () => {
    // The whole of this outcome is the reason. Sent without one it is a blank space
    // with a name, which is what the list already had (LAW-006).
    expect(corpusSummarySchema.safeParse(summary({ outcome: 'could-not-be-read' })).success).toBe(
      false,
    );
    expect(
      corpusSummarySchema.safeParse(summary({ outcome: 'could-not-be-read', because: '' })).success,
    ).toBe(false);
  });

  it('gives it no figure rather than a figure of nothing', () => {
    // A Corpus that cannot be read has no Modules to count and nothing was looked
    // for in it, so it has neither denominator — and a zero would read as a Corpus
    // measured and found empty (LAW-006).
    const parsed = corpusSummarySchema.parse(
      summary({ outcome: 'could-not-be-read', because: 'anything', readiness: { modulesFullyApproved: 0, modules: 0 } }),
    );

    expect(parsed.reading).not.toHaveProperty('readiness');
    expect(parsed.reading).not.toHaveProperty('integrity');
  });

  it('carries a set of criteria that could not be followed beside the Corpus, not among them', () => {
    // It has no id, no name and no page: what says a Corpus is called anything is
    // the file that could not be read. So it cannot be a Corpus in the list without
    // one being invented for it, and the file it is written in is the only name it
    // has — which is also the one thing to act on.
    const parsed = corpusListSchema.parse({
      corpus: [],
      criteriaNotFollowed: [{ where: 'lens-b.json', because: 'nothing about it can be read yet' }],
    });

    expect(parsed.criteriaNotFollowed).toEqual([
      { where: 'lens-b.json', because: 'nothing about it can be read yet' },
    ]);
  });

  it('refuses a set of criteria that names neither its file nor its reason', () => {
    for (const bad of [{ where: 'lens-b.json' }, { because: 'why' }, { where: '', because: 'why' }]) {
      expect(corpusListSchema.safeParse({ corpus: [], criteriaNotFollowed: [bad] }).success).toBe(
        false,
      );
    }
  });
});
