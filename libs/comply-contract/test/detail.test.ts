import { describe, expect, it } from 'vitest';
import { corpusDetailSchema } from '../src/index.js';

/**
 * One Corpus as the server would answer for it: two Modules, two declared
 * Facets, one Module nobody answers for, and the two readings side by side.
 *
 * Deliberately shapeless names. Anything here that read like a real Facet would
 * be one Corpus's shape written into the agreement both sides work from.
 */
const DETAIL = {
  id: 'c1',
  name: 'C One',
  reading: {
    outcome: 'read',
    sourceReadAt: '2026-01-01T00:00:00.000Z',
    lensId: 'c1',
    ladder: { levels: ['low', 'high'], approvedAtOrAbove: 'high' },
    facets: ['f1', 'f2'],
    modules: [
      {
        id: 'm1',
        owner: 'someone',
        cells: [
          { facet: 'f1', state: 'approved' },
          { facet: 'f2', state: 'absent' },
        ],
        approved: 1,
        declaredFacets: 2,
        movement: { comparedWith: 'no-earlier-reading' },
      },
      {
        id: 'm2',
        owner: null,
        cells: [
          { facet: 'f1', state: 'well-formed' },
          { facet: 'f2', state: 'present' },
        ],
        approved: 0,
        declaredFacets: 2,
        movement: { comparedWith: 'the-last-reading', approvedDelta: -1 },
      },
    ],
    readiness: { modulesFullyApproved: 1, modules: 2 },
    integrity: { openFindings: 1, lookedFor: ['a-check'] },
  },
};

/** The read reading, with one part of it replaced. */
function reading(part: Record<string, unknown>): unknown {
  return { ...DETAIL, reading: { ...DETAIL.reading, ...part } };
}

/** The Modules, with the first one's row altered. */
function firstModule(part: Record<string, unknown>): unknown {
  return reading({ modules: [{ ...DETAIL.reading.modules[0], ...part }, DETAIL.reading.modules[1]] });
}

describe('what the two sides agree a whole reading looks like', () => {
  it('accepts a Corpus that has been read, including a Module nobody answers for', () => {
    const parsed = corpusDetailSchema.parse(DETAIL);
    if (parsed.reading.outcome !== 'read') throw new Error('the source was written down');

    expect(parsed.reading.modules.map((module) => module.owner)).toEqual(['someone', null]);
  });

  it('accepts a Corpus whose source has never been read', () => {
    const parsed = corpusDetailSchema.safeParse({
      id: 'c1',
      name: 'C One',
      reading: { outcome: 'nothing-written-down-yet' },
    });

    // The same two cases the list tells apart, told apart the same way, because
    // they are the same two facts about the knowledge.
    expect(parsed.success).toBe(true);
  });

  it('refuses a Module whose cells do not line up with the declared Facets', () => {
    // A row one cell short draws every state after the gap under the wrong
    // column: a grid that is confidently wrong rather than visibly broken.
    const short = firstModule({ cells: [DETAIL.reading.modules[0]!.cells[0]], declaredFacets: 1 });
    const outOfOrder = firstModule({ cells: [...DETAIL.reading.modules[0]!.cells].reverse() });

    expect(corpusDetailSchema.safeParse(short).success).toBe(false);
    expect(corpusDetailSchema.safeParse(outOfOrder).success).toBe(false);
  });

  it('refuses a per-Module count sent without what it is out of', () => {
    const { declaredFacets: _omitted, ...ungrounded } = DETAIL.reading.modules[0]!;

    expect(corpusDetailSchema.safeParse(reading({ modules: [ungrounded] })).success).toBe(false);
    // And refuses a denominator that disagrees with what the Lens declares, which
    // would state a figure against a set the Corpus was not read against (LAW-006).
    expect(corpusDetailSchema.safeParse(firstModule({ declaredFacets: 5 })).success).toBe(false);
  });

  it('keeps no baseline distinct from no change', () => {
    const held = firstModule({ movement: { comparedWith: 'the-last-reading', approvedDelta: 0 } });
    const parsed = corpusDetailSchema.parse(held);
    if (parsed.reading.outcome !== 'read') throw new Error('the source was written down');

    // A first-ever reading and a figure that held steady are different facts, so
    // they are different shapes here and cannot be drawn the same by accident.
    expect(parsed.reading.modules[0]!.movement).toEqual({
      comparedWith: 'the-last-reading',
      approvedDelta: 0,
    });
    const first = corpusDetailSchema.parse(DETAIL);
    if (first.reading.outcome !== 'read') throw new Error('the source was written down');
    expect(first.reading.modules[0]!.movement).toEqual({ comparedWith: 'no-earlier-reading' });
  });

  it('will not let a movement with nothing to compare against carry a figure anyway', () => {
    const parsed = corpusDetailSchema.parse(
      firstModule({ movement: { comparedWith: 'no-earlier-reading', approvedDelta: 0 } }),
    );
    if (parsed.reading.outcome !== 'read') throw new Error('the source was written down');

    expect(parsed.reading.modules[0]!.movement).not.toHaveProperty('approvedDelta');
  });

  it('carries the two readings and nothing standing for both', () => {
    const parsed = corpusDetailSchema.parse(reading({ score: 15, grade: 'B' }));
    if (parsed.reading.outcome !== 'read') throw new Error('the source was written down');

    expect(Object.keys(parsed.reading).sort()).toEqual([
      'facets',
      'integrity',
      'ladder',
      'lensId',
      'modules',
      'outcome',
      'readiness',
      'sourceReadAt',
    ]);
  });

  it('refuses a ladder whose approved rung is not on it', () => {
    // The rungs are one Corpus's own words, so a surface can only say what
    // approved means here by being told (LAW-004) — and a rung that is not on
    // the ladder tells it something untrue.
    const adrift = reading({ ladder: { levels: ['low', 'high'], approvedAtOrAbove: 'higher' } });

    expect(corpusDetailSchema.safeParse(adrift).success).toBe(false);
  });
});
