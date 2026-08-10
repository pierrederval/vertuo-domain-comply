import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { corpusDetailSchema, type CorpusDetail } from '@vertuo/comply-contract';
import { CorpusMatrix } from '../src/corpus/CorpusMatrix.js';

/**
 * One Corpus as the server answers for it, built through the shared definition
 * so anything this test draws is something the server could actually send.
 */
function corpus(part: Record<string, unknown>): CorpusDetail {
  return corpusDetailSchema.parse({
    id: 'c-one',
    name: 'C One',
    reading: {
      outcome: 'read',
      sourceReadAt: '2026-01-01T08:00:00.000Z',
      lensId: 'c-one',
      ladder: { levels: ['low', 'middle', 'high'], approvedAtOrAbove: 'high' },
      facets: ['f-one', 'f-two'],
      modules: [
        {
          id: 'm-one',
          owner: 'someone',
          cells: [
            { facet: 'f-one', state: 'approved' },
            { facet: 'f-two', state: 'absent' },
          ],
          approved: 1,
          declaredFacets: 2,
          movement: { comparedWith: 'no-earlier-reading' },
        },
        {
          id: 'm-two',
          owner: null,
          cells: [
            { facet: 'f-one', state: 'well-formed' },
            { facet: 'f-two', state: 'absent' },
          ],
          approved: 0,
          declaredFacets: 2,
          movement: { comparedWith: 'no-earlier-reading' },
        },
      ],
      readiness: { modulesFullyApproved: 0, modules: 2 },
      integrity: { openFindings: 3, lookedFor: ['a-check', 'b-check'] },
      ...part,
    },
  });
}

/**
 * A second Corpus of deliberately unalike shape: a different ladder, different
 * Facets, one more of them, a Module with nothing in it at all, and no defects
 * (ADR-0001). The same component draws both.
 */
const OTHER: CorpusDetail = corpusDetailSchema.parse({
  id: 'c-two',
  name: 'c-two',
  reading: {
    outcome: 'read',
    sourceReadAt: '2026-01-01T11:00:00.000Z',
    lensId: 'c-two',
    ladder: { levels: ['1', '2'], approvedAtOrAbove: '2' },
    facets: ['g-one', 'g-two', 'g-three'],
    modules: [
      {
        id: 'n-one',
        owner: 'anyone',
        cells: [
          { facet: 'g-one', state: 'approved' },
          { facet: 'g-two', state: 'present' },
          { facet: 'g-three', state: 'absent' },
        ],
        approved: 1,
        declaredFacets: 3,
        movement: { comparedWith: 'the-last-reading', approvedDelta: 2 },
      },
      {
        id: 'n-two',
        owner: 'anyone',
        cells: [
          { facet: 'g-one', state: 'absent' },
          { facet: 'g-two', state: 'absent' },
          { facet: 'g-three', state: 'absent' },
        ],
        approved: 0,
        declaredFacets: 3,
        movement: { comparedWith: 'the-last-reading', approvedDelta: 0 },
      },
    ],
    readiness: { modulesFullyApproved: 0, modules: 2 },
    integrity: { openFindings: 0, lookedFor: ['a-check'] },
  },
});

function draw(detail: CorpusDetail): string {
  return renderToStaticMarkup(<CorpusMatrix corpus={detail} />);
}

describe('the Corpus page, which is the Readiness Matrix', () => {
  it('draws every Module against every declared Facet, whatever shape the Corpus is', () => {
    for (const detail of [corpus({}), OTHER]) {
      if (detail.reading.outcome !== 'read') throw new Error('the source was written down');
      const drawn = draw(detail);

      expect(drawn).toContain(detail.name);
      for (const facet of detail.reading.facets) expect(drawn).toContain(facet);
      // Every Module, including one with nothing in it. A row left out is a
      // Module nobody is ever reminded of.
      for (const module of detail.reading.modules) expect(drawn).toContain(module.id);

      const cells = drawn.match(/class="cell[^"]*"/g) ?? [];
      expect(cells).toHaveLength(detail.reading.facets.length * detail.reading.modules.length);
    }
  });

  it('says what each cell is, rather than leaving a mark to be guessed at', () => {
    const drawn = draw(corpus({}));

    for (const state of ['approved', 'well-formed', 'absent']) {
      expect(drawn).toContain(`title="${state}"`);
    }
  });

  it('calls out a Facet no Module has started, and names the Lens that declared it', () => {
    const drawn = draw(corpus({}));

    // An all-absent column is as often a defect in the denominator as it is work
    // nobody has begun, and the reader has to know what to go and change.
    expect(drawn).toContain('f-two');
    expect(drawn).toContain('c-one');
    expect(drawn).toMatch(/No Module has anything under/);
    // The Facet that some Module has filled is not called out with it.
    expect(drawn.match(/class="facet unstarted"/g)).toHaveLength(1);
  });

  it('marks a Module nobody answers for, rather than leaving it blank', () => {
    const drawn = draw(corpus({}));

    // LAW-007: every Finding against this Module routes to nobody, which is a
    // defect and not an empty space.
    expect(drawn).toContain('someone');
    expect(drawn).toContain('class="conspicuous"');
    expect(drawn).toMatch(/nobody/i);
  });

  it('states in words what every figure here is counted out of', () => {
    const drawn = draw(corpus({}));

    expect(drawn).toContain('2 Facets');
    expect(drawn).toContain('this Corpus’s Lens declares');
    // The unknown band, said where the reader is already at the boundary of what
    // is measured (LAW-006).
    expect(drawn).toMatch(/nobody has written down anywhere is not counted/);
  });

  it("says what approved means on this Corpus, in this Corpus's own words", () => {
    expect(draw(corpus({}))).toContain('at or above “high”');
    // A different Corpus grades its knowledge differently, and the same component
    // says so without knowing either ladder (LAW-004).
    expect(draw(OTHER)).toContain('at or above “2”');
  });

  it('keeps no baseline distinct from no change', () => {
    const nothingToCompare = draw(corpus({}));
    const compared = draw(OTHER);

    // A first-ever reading is not a figure that held steady, and neither is a
    // figure that moved. Three facts, three ways of saying them.
    expect(nothingToCompare).toContain('class="movement none"');
    expect(nothingToCompare).not.toContain('class="movement steady"');
    expect(compared).toContain('class="movement steady"');
    expect(compared).toContain('class="movement gained"');
    expect(compared).toContain('▲ 2');
    expect(compared).not.toContain('class="movement none"');
  });

  it('shows the two readings on this page as two figures, never fused', () => {
    const drawn = draw(corpus({}));

    expect(drawn).toContain('Readiness');
    expect(drawn).toContain('of 2 Modules');
    expect(drawn).toContain('Integrity');
    expect(drawn).toContain('from 2 Checks');
    // The grid is Readiness. Nothing folds Integrity into a cell, a row, or a
    // column of it, and no third figure stands for the pair (spec §4).
    expect(drawn.match(/class="figure"/g)).toHaveLength(2);
    expect(drawn).not.toContain('%');
    expect(drawn).not.toMatch(/\bscore\b/i);
    expect(drawn).not.toMatch(/\bgrade\b/i);
  });

  it("states each Module's figure against what it is out of", () => {
    expect(draw(corpus({}))).toContain('1 of 2');
    expect(draw(OTHER)).toContain('1 of 3');
  });

  it('lets wide content scroll inside itself, so the page never scrolls sideways', () => {
    // The grid is the one thing here that grows with a Corpus, and it grows
    // sideways. A page that slides under a reader hides the Module column, which
    // is the one column every other one is read against (criterion 8, spec §12).
    expect(draw(OTHER)).toMatch(/class="grid-scroll"[^>]*>\s*<table/);
  });

  it('says how old the reading is', () => {
    const drawn = draw(corpus({}));

    expect(drawn).toContain('Read from source');
    expect(drawn).toContain('2026-01-01T08:00:00.000Z');
  });

  it('says a Corpus has nothing written down rather than drawing an empty grid', () => {
    const unread = corpusDetailSchema.parse({
      id: 'c-one',
      name: 'C One',
      reading: { outcome: 'nothing-written-down-yet' },
    });

    const drawn = draw(unread);
    expect(drawn).toContain('Nothing has been written down from this source yet');
    expect(drawn).not.toContain('<table');
    expect(drawn).not.toContain('class="figure"');
  });

  it('holds no word belonging to any one Corpus', () => {
    // Two Corpus that share no Facet, no ladder and no Module, drawn by the same
    // component: nothing here can have been written for either of them (LAW-004).
    const drawn = draw(corpus({}));
    for (const word of ['g-one', 'g-two', 'g-three', 'n-one', 'n-two']) {
      expect(drawn).not.toContain(word);
    }
  });
});
