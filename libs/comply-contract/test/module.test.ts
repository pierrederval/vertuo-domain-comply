import { describe, expect, it } from 'vitest';
import { corpusModuleSchema, facetStateSchema, moduleFacetSchema } from '../src/index.js';

/**
 * One Module as the server would answer for it: four declared Facets in the four
 * states there are, one of them short on content, nobody answering for it, and
 * one Finding.
 *
 * Deliberately shapeless names. Anything here that read like a real Facet, a real
 * rung or a real attribute would be one Corpus's shape written into the agreement
 * both sides work from (LAW-004).
 */
const MODULE = {
  corpus: { id: 'c1', name: 'C One' },
  id: 'm1',
  reading: {
    outcome: 'read',
    sourceReadAt: '2026-01-01T00:00:00.000Z',
    lensId: 'c1',
    ladder: { levels: ['low', 'high'], approvedAtOrAbove: 'high' },
    owner: null,
    facets: [
      { facet: 'f1', state: 'absent' },
      {
        facet: 'f2',
        state: 'present',
        knowledge: [{ at: { file: 'one.md', line: 3 }, maturity: 'low' }],
        shortOf: [{ criterion: 'requiredAttributes', missing: ['a1'] }],
      },
      {
        facet: 'f3',
        state: 'well-formed',
        knowledge: [
          { at: { file: 'two.md', line: 4 }, maturity: 'low' },
          { at: { file: 'two.md', line: 9 }, maturity: null },
        ],
        notYetApproved: 2,
      },
      {
        facet: 'f4',
        state: 'approved',
        knowledge: [{ at: { file: 'three.md', line: 1 }, maturity: 'high' }],
      },
    ],
    approved: 1,
    declaredFacets: 4,
    findings: [
      { says: 'two things here disagree', at: { file: 'one.md', line: 3 }, alsoAt: [] },
    ],
    lookedFor: ['a-check', 'another-check'],
  },
};

/** The read reading, with one part of it replaced. */
function reading(part: Record<string, unknown>): unknown {
  return { ...MODULE, reading: { ...MODULE.reading, ...part } };
}

/** The Facets, with the one at `position` altered. */
function facet(position: number, part: Record<string, unknown>): unknown {
  return reading({
    facets: MODULE.reading.facets.map((declared, at) =>
      at === position ? { ...declared, ...part } : declared,
    ),
  });
}

/**
 * The Facets, with one part of the one at `position` left out. The others stay,
 * so what fails is the silence and never the figures it would also have upset.
 */
function facetSilentAbout(position: number, part: string): unknown {
  return reading({
    facets: MODULE.reading.facets.map((declared, at) => {
      if (at !== position) return declared;
      const said: Record<string, unknown> = { ...declared };
      delete said[part];
      return said;
    }),
  });
}

describe('what the two sides agree one Module looks like', () => {
  it('accepts a Module in every state a Facet has, including one nobody answers for', () => {
    const parsed = corpusModuleSchema.parse(MODULE);
    if (parsed.reading.outcome !== 'read') throw new Error('the source was written down');

    expect(parsed.reading.facets.map((declared) => declared.state)).toEqual([
      'absent',
      'present',
      'well-formed',
      'approved',
    ]);
    expect(parsed.reading.owner).toBeNull();
  });

  it('accepts a Module whose Corpus has never been read', () => {
    const parsed = corpusModuleSchema.safeParse({
      corpus: { id: 'c1', name: 'C One' },
      id: 'm1',
      reading: { outcome: 'nothing-written-down-yet' },
    });

    // Not the same answer as no Module of that name: one sends a reader to the
    // source, the other to the grid.
    expect(parsed.success).toBe(true);
  });

  it('tells a Facet apart by the same four states the grid draws', () => {
    const carried = moduleFacetSchema.options.map((option) => option.shape.state.value);

    // One vocabulary for a cell, whether it is being drawn in a grid or
    // explained on a page. Two would be how the two start disagreeing.
    expect([...carried].sort()).toEqual([...facetStateSchema.options].sort());
  });

  it('will not let knowledge short on content be sent without saying what is missing', () => {
    expect(corpusModuleSchema.safeParse(facetSilentAbout(1, 'shortOf')).success).toBe(false);
    // Nor with an empty list, which is the same silence spelled differently.
    expect(corpusModuleSchema.safeParse(facet(1, { shortOf: [] })).success).toBe(false);
  });

  it('will not let sufficient-but-unapproved knowledge be sent without how much is unapproved', () => {
    expect(corpusModuleSchema.safeParse(facetSilentAbout(2, 'notYetApproved')).success).toBe(false);
    // Zero is not a shortfall: at zero this Facet is approved, and saying both
    // would be a page telling a reader to review knowledge nobody disputes.
    expect(corpusModuleSchema.safeParse(facet(2, { notYetApproved: 0 })).success).toBe(false);
    // Nor more than there is knowledge to be unapproved.
    expect(corpusModuleSchema.safeParse(facet(2, { notYetApproved: 3 })).success).toBe(false);
  });

  it('lets neither shortfall be sent as the other', () => {
    // Short on content has nowhere to put a maturity shortfall, and
    // sufficient-but-unapproved has nowhere to put an unmet criterion. Whatever
    // a server sends, a page reading one of these can only meet the reason that
    // belongs to the state it is in.
    const parsed = corpusModuleSchema.parse(facet(1, { notYetApproved: 1 }));
    const other = corpusModuleSchema.parse(
      facet(2, { shortOf: [{ criterion: 'requiredAttributes', missing: ['a1'] }] }),
    );
    if (parsed.reading.outcome !== 'read') throw new Error('the source was written down');
    if (other.reading.outcome !== 'read') throw new Error('the source was written down');

    expect(parsed.reading.facets[1]).not.toHaveProperty('notYetApproved');
    expect(other.reading.facets[2]).not.toHaveProperty('shortOf');
  });

  it('refuses a reason that would be read without knowing what it is out of', () => {
    const bare = facet(1, { shortOf: [{ criterion: 'minSources', has: 1 }] });
    const grounded = facet(1, { shortOf: [{ criterion: 'minSources', has: 1, needs: 3 }] });

    // "backed by one Source" is a verdict on nothing until the Lens's figure is
    // beside it (LAW-006).
    expect(corpusModuleSchema.safeParse(bare).success).toBe(false);
    expect(corpusModuleSchema.safeParse(grounded).success).toBe(true);
  });

  it('refuses a per-Module figure that disagrees with the Facets it is drawn from', () => {
    expect(corpusModuleSchema.safeParse(reading({ declaredFacets: 5 })).success).toBe(false);
    expect(corpusModuleSchema.safeParse(reading({ approved: 3 })).success).toBe(false);
  });

  it('refuses a count of Findings sent without what was looked for', () => {
    const { lookedFor: _omitted, ...ungrounded } = MODULE.reading;

    expect(corpusModuleSchema.safeParse({ ...MODULE, reading: ungrounded }).success).toBe(false);
    // Not even when there is nothing to report: no Findings can only mean none
    // that these Checks would have found.
    expect(corpusModuleSchema.safeParse(reading({ findings: [], lookedFor: [] })).success).toBe(
      false,
    );
    expect(corpusModuleSchema.safeParse(reading({ findings: [] })).success).toBe(true);
  });

  it('carries the two readings and nothing standing for both', () => {
    const parsed = corpusModuleSchema.parse(reading({ score: 15, grade: 'B' }));
    if (parsed.reading.outcome !== 'read') throw new Error('the source was written down');

    expect(Object.keys(parsed.reading).sort()).toEqual([
      'approved',
      'declaredFacets',
      'facets',
      'findings',
      'ladder',
      'lensId',
      'lookedFor',
      'outcome',
      'owner',
      'sourceReadAt',
    ]);
  });

  it('refuses a place nobody could open', () => {
    const nowhere = facet(1, {
      knowledge: [{ at: { file: 'one.md', line: 0 }, maturity: 'low' }],
    });

    // A line counted from zero is nowhere in any editor, and a place a reader
    // cannot open is not evidence of anything (LAW-009).
    expect(corpusModuleSchema.safeParse(nowhere).success).toBe(false);
  });
});
