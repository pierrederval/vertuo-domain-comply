import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { corpusHomeSchema, type CorpusHome } from '@vertuo/comply-contract';
import { CorpusHome as WhatNeedsWork } from '../src/corpus/CorpusHome.js';

/**
 * One Corpus as the server answers for it, built through the shared definition so
 * anything this test draws is something the server could actually send.
 */
function corpus(part: Record<string, unknown>): CorpusHome {
  return corpusHomeSchema.parse({
    id: 'c-one',
    name: 'C One',
    reading: {
      outcome: 'read',
      sourceReadAt: '2026-01-04T08:00:00.000Z',
      lensId: 'c-one',
      ladder: { levels: ['low', 'middle', 'high'], approvedAtOrAbove: 'high' },
      readiness: { modulesFullyApproved: 0, modules: 2 },
      integrity: { openFindings: 3, lookedFor: ['a-check', 'b-check'] },
      declaredFacets: 2,
      needsWork: [
        {
          id: 'm-one',
          owner: 'someone',
          approved: 1,
          declaredFacets: 2,
          movement: { comparedWith: 'the-last-reading', approvedDelta: 1 },
        },
        {
          id: 'm-two',
          owner: null,
          approved: 0,
          declaredFacets: 2,
          movement: { comparedWith: 'the-last-reading', approvedDelta: 0 },
        },
      ],
      writtenDown: [{ at: '2026-01-01T08:00:00.000Z' }, { at: '2026-01-04T08:00:00.000Z' }],
      since: {
        comparedWith: 'the-last-reading',
        takenAt: '2026-01-02T09:00:00.000Z',
        changed: [
          { changed: 'facet', moduleId: 'm-one', facet: 'f-one', label: 'F One', approved: true },
          {
            changed: 'finding',
            says: 'Term "Widget" is defined 2 different ways',
            moduleId: 'm-one',
            appeared: true,
          },
        ],
      },
      ...part,
    },
  });
}

/**
 * A second Corpus of deliberately unalike shape: a different ladder, one more Facet,
 * every Module owned, nothing found in it, and a source read once (ADR-0001). The
 * same component draws both.
 */
const OTHER: CorpusHome = corpusHomeSchema.parse({
  id: 'c-two',
  name: 'c-two',
  reading: {
    outcome: 'read',
    sourceReadAt: '2026-02-01T11:00:00.000Z',
    lensId: 'c-two',
    ladder: { levels: ['1', '2'], approvedAtOrAbove: '2' },
    readiness: { modulesFullyApproved: 1, modules: 2 },
    integrity: { openFindings: 0, lookedFor: ['g-check'] },
    declaredFacets: 3,
    needsWork: [
      {
        id: 'n-two',
        owner: 'anyone',
        approved: 2,
        declaredFacets: 3,
        movement: { comparedWith: 'no-earlier-reading' },
      },
    ],
    writtenDown: [{ at: '2026-02-01T11:00:00.000Z' }],
    since: { comparedWith: 'no-earlier-reading' },
  },
});

function draw(home: CorpusHome): string {
  return renderToStaticMarkup(
    <MemoryRouter>
      <WhatNeedsWork corpus={home} />
    </MemoryRouter>,
  );
}

/** Every item kind the feed drew, in the order it drew them. */
function feed(drawn: string): string[] {
  return [...drawn.matchAll(/data-change="([a-z-]+)"/g)].map((found) => found[1]!);
}

describe('the two readings on the work surface', () => {
  it('draws exactly two figures and never a third fused from them', () => {
    for (const home of [corpus({}), OTHER]) {
      const drawn = draw(home);
      // LAW-006 made testable: two readings, never a third standing for the pair.
      expect(drawn.match(/data-figure=""/g)).toHaveLength(2);
      // No percentage, rate, grade, or score anywhere on the page.
      expect(drawn).not.toMatch(/%|score|grade|out of 100/i);
    }
  });

  it('states what each figure is counted out of', () => {
    const drawn = draw(corpus({}));

    expect(drawn).toContain('of 2 Modules');
    expect(drawn).toContain('from 2 Checks');
  });
});

describe('the Modules where there is work', () => {
  it('draws one row per Module short of its declared Facets, with the figure it is out of', () => {
    const drawn = draw(corpus({}));

    expect(drawn.match(/data-needs-work=""/g)).toHaveLength(2);
    expect(drawn).toContain('1 of 2');
    expect(drawn).toContain('0 of 2');
  });

  it('marks a Module nobody answers for rather than leaving it blank', () => {
    // LAW-007: every Finding against it routes to nobody, which is a defect.
    expect(draw(corpus({}))).toContain('data-conspicuous=""');
  });

  it('leads to the Module rather than to the grid, because the work is stated there', () => {
    expect(draw(corpus({}))).toContain('href="/corpus/c-one/modules/m-one"');
  });

  it('says every Module holds what its Lens declares, without claiming the knowledge is complete', () => {
    const drawn = draw(corpus({ needsWork: [], readiness: { modulesFullyApproved: 2, modules: 2 } }));

    expect(drawn).not.toContain('data-needs-work');
    expect(drawn).toContain('Knowledge nobody has written down anywhere is not counted');
  });

  it('says what approved means in this Corpus’s own words', () => {
    expect(draw(corpus({}))).toContain('low → middle → high');
    expect(draw(OTHER)).toContain('1 → 2');
  });
});

describe('movement beside a figure', () => {
  it('draws no baseline differently from a figure that held steady', () => {
    const none = draw(
      corpus({
        needsWork: [
          {
            id: 'm-one',
            owner: 'someone',
            approved: 1,
            declaredFacets: 2,
            movement: { comparedWith: 'no-earlier-reading' },
          },
        ],
      }),
    );

    expect(none).toContain('data-movement="none"');
    expect(none).not.toContain('data-movement="steady"');
    // A first-ever reading shown as zero movement is the reassurance LAW-006 refuses.
    expect(draw(corpus({}))).toContain('data-movement="steady"');
  });

  it('draws a reading taken against other criteria as neither a number nor no baseline', () => {
    const drawn = draw(
      corpus({
        needsWork: [
          {
            id: 'm-one',
            owner: 'someone',
            approved: 0,
            declaredFacets: 2,
            movement: { comparedWith: 'a-reading-under-other-criteria' },
          },
        ],
        since: { comparedWith: 'a-reading-under-other-criteria' },
      }),
    );

    expect(drawn).toContain('data-movement="other-criteria"');
    expect(drawn).not.toContain('data-movement="none"');
    expect(drawn).not.toContain('data-movement="lost"');
    // And the page says so in words, naming the Lens as the thing that changed.
    expect(drawn).toContain('taken against different criteria');
    expect(drawn).toContain('c-one');
  });

  it('says what — means wherever it draws one', () => {
    expect(draw(OTHER)).toContain('It is not the same as nothing having changed.');
    expect(draw(corpus({}))).not.toContain('It is not the same as nothing having changed.');
  });
});

describe('what changed', () => {
  it('carries only the three kinds of item, and nothing about a run', () => {
    const drawn = draw(corpus({}));

    expect(new Set(feed(drawn))).toEqual(new Set(['facet', 'finding', 'read-from-source']));
    // A run completed, a request served, a reading taken: noise the tooling makes
    // about itself, and there is no shape for any of it to arrive in (ADR-0012).
    expect(drawn).not.toMatch(/run |request|refreshed|synchronis|reading taken/i);
  });

  it('quotes a Finding in the words it was found in', () => {
    // Never summarised. A reader shown a reworded Finding has been shown a
    // second-hand version of the thing this product exists to detect.
    expect(draw(corpus({}))).toContain('Term &quot;Widget&quot; is defined 2 different ways');
  });

  it('marks a Finding that has arrived and does not mark one that has gone', () => {
    const arrived = draw(corpus({}));
    const gone = draw(
      corpus({
        since: {
          comparedWith: 'the-last-reading',
          takenAt: '2026-01-02T09:00:00.000Z',
          changed: [
            { changed: 'finding', says: 'Term "Widget" is defined 2 different ways', moduleId: 'm-one', appeared: false },
          ],
        },
      }),
    );

    expect(arrived).toContain('Finding appeared');
    expect(gone).toContain('Finding no longer found');
    expect(gone).not.toContain('Finding appeared');
  });

  it('marks a Finding that reaches nobody', () => {
    const drawn = draw(
      corpus({
        since: {
          comparedWith: 'the-last-reading',
          takenAt: '2026-01-02T09:00:00.000Z',
          changed: [
            { changed: 'finding', says: 'One Term is defined nowhere', moduleId: null, appeared: true },
          ],
        },
      }),
    );

    expect(drawn).toContain('reaches nobody');
  });

  it('names a Facet as its Lens names it, and says which way it crossed', () => {
    const fellBack = draw(
      corpus({
        since: {
          comparedWith: 'the-last-reading',
          takenAt: '2026-01-02T09:00:00.000Z',
          changed: [
            { changed: 'facet', moduleId: 'm-one', facet: 'f-one', label: 'F One', approved: false },
          ],
        },
      }),
    );

    expect(draw(corpus({}))).toContain('F One became approved');
    expect(fellBack).toContain('F One is no longer approved');
  });

  it('names every writing-down of the source, most recent first', () => {
    const drawn = draw(corpus({}));

    expect(drawn.match(/data-change="read-from-source"/g)).toHaveLength(2);
    // The moment travels in the markup, so the phrase can be read against a fixed
    // value rather than against whatever day the suite runs on.
    const order = [...drawn.matchAll(/dateTime="([^"]+)"/g)].map((found) => found[1]!);
    expect(order.slice(0, 2)).toEqual(['2026-01-04T08:00:00.000Z', '2026-01-01T08:00:00.000Z']);
  });

  it('says both horizons, because they are not the same horizon', () => {
    const drawn = draw(corpus({}));

    expect(drawn).toContain('however long ago');
    expect(drawn).toContain('as far back as the shelf holds');
  });

  /**
   * A writing-down happens when what is written down differs from what the shelf
   * already held. That is usually the source changing and it is sometimes this
   * product reading the source differently — raising how much of a source a
   * quotation carries wrote one down on the DDD Corpus's shelf twelve seconds after
   * the one before it, with no document touched, nothing moved and every figure
   * identical (ADR-0036).
   *
   * So the feed says what happened and the comparison beside it says what changed.
   * Claiming the first means the second puts this product's own changes into a
   * reader's account of what the business did.
   */
  it('never claims a writing-down means the source said something new', () => {
    for (const drawn of [draw(corpus({})), draw(corpus({ since: { comparedWith: 'no-earlier-reading' } }))]) {
      expect(drawn).toContain('Read from source');
      expect(drawn).toContain('every writing-down this shelf still holds');
      expect(drawn).not.toContain('said something new');
    }
  });
});

describe('what the feed says when it can say nothing', () => {
  const nothing = (since: Record<string, unknown>) => draw(corpus({ since }));

  it('tells no baseline apart from nothing having moved', () => {
    const noBaseline = nothing({ comparedWith: 'no-earlier-reading' });
    const heldStill = draw(
      corpus({
        since: { comparedWith: 'the-last-reading', takenAt: '2026-01-02T09:00:00.000Z', changed: [] },
      }),
    );

    expect(noBaseline).toContain('No reading has been kept for this Corpus yet');
    expect(heldStill).toContain('Nothing about the knowledge has moved since that reading');
    // Four reasons, four sentences. None of them is a blank space and no two of
    // them are the same words (LAW-006).
    expect(noBaseline).not.toContain('Nothing about the knowledge has moved');
    expect(heldStill).not.toContain('No reading has been kept');
  });

  it('says the knowledge it was measured from has gone, and that the figures still compare', () => {
    const drawn = nothing({ comparedWith: 'knowledge-no-longer-held' });

    expect(drawn).toContain('not on the shelf any more');
    expect(drawn).toContain('still what each one above is compared with');
    // Not the same statement as any of the other three.
    expect(drawn).not.toContain('No reading has been kept');
    expect(drawn).not.toContain('different criteria');
  });

  it('still draws every figure and every Module when it can say nothing', () => {
    const drawn = nothing({ comparedWith: 'knowledge-no-longer-held' });

    expect(drawn.match(/data-figure=""/g)).toHaveLength(2);
    expect(drawn.match(/data-needs-work=""/g)).toHaveLength(2);
  });
});

describe('a Corpus whose source has never been read', () => {
  it('says so rather than drawing an empty work surface', () => {
    const drawn = draw(
      corpusHomeSchema.parse({
        id: 'c-three',
        name: 'C Three',
        reading: { outcome: 'nothing-written-down-yet' },
      }),
    );

    expect(drawn).toContain('Nothing has been written down from this source yet.');
    // Not a figure of nothing, and not an empty list either.
    expect(drawn).not.toContain('data-figure');
    expect(drawn).not.toContain('data-needs-work');
  });
});

describe('what this surface knows about any Corpus', () => {
  it('knows nothing: handed one Corpus it draws no word of the other', () => {
    // LAW-004 at the interface. Every name, rung, and Facet arrives in the payload,
    // so a component that drew one Corpus's word would be a defect even where it
    // rendered perfectly.
    expect(draw(OTHER)).not.toMatch(/m-one|m-two|F One|Widget|low → middle/);
    expect(draw(corpus({}))).not.toMatch(/n-two|c-two|g-check/);
  });
});
