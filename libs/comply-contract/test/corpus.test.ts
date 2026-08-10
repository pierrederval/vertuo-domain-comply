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
    expect(corpusListSchema.parse({ corpus: [] })).toEqual({ corpus: [] });
  });
});
