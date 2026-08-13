import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
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
      facets: [{ name: 'f-one', label: 'f-one' }, { name: 'f-two', label: 'f-two' }],
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
    facets: [{ name: 'g-one', label: 'g-one' }, { name: 'g-two', label: 'g-two' }, { name: 'g-three', label: 'g-three' }],
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

/** Each Module's row leads to the Module, so the grid is drawn where links work. */
/**
 * Just the words a reader meets, with the markup between them taken out.
 *
 * Tags are removed rather than replaced by a space, so a phrase split across two
 * elements still reads as the one phrase it is on screen. A figure and the denominator
 * beside it are set at two different weights and are one sentence — `1 of 2` — and this
 * is what asserts a reader sees that rather than what asserts how it is marked up.
 */
function words(markup: string): string {
  return markup.replace(/<[^>]*>/g, '');
}

function draw(detail: CorpusDetail): string {
  return renderToStaticMarkup(
    <MemoryRouter>
      <CorpusMatrix corpus={detail} />
    </MemoryRouter>,
  );
}

describe('the Corpus page, which is the Readiness Matrix', () => {
  it('draws every Module against every declared Facet, whatever shape the Corpus is', () => {
    for (const detail of [corpus({}), OTHER]) {
      if (detail.reading.outcome !== 'read') throw new Error('the source was written down');
      const drawn = draw(detail);

      // The Corpus's own name is the shell's to draw, once, at the top; this
      // page draws what is in it. Asserted in `shell.test.tsx`.
      // By the label the Lens gave it, which is the only thing a reader sees.
      for (const facet of detail.reading.facets) expect(drawn).toContain(facet.label);
      // Every Module, including one with nothing in it. A row left out is a
      // Module nobody is ever reminded of.
      for (const module of detail.reading.modules) expect(drawn).toContain(module.id);

      const cells = drawn.match(/data-cell="[^"]*"/g) ?? [];
      expect(cells).toHaveLength(detail.reading.facets.length * detail.reading.modules.length);
    }
  });

  it('heads each column with the label the Lens gave it, not the name it keys on', () => {
    const drawn = draw(
      corpus({
        facets: [
          { name: 'f-one', label: 'Business Rules', describes: 'What must always hold here.' },
          { name: 'f-two', label: 'State Machines' },
        ],
      }),
    );

    // A Facet name comes from the source, so it is whatever slug that corpus used.
    // A reader who does not already know what one means cannot learn it from that.
    expect(drawn).toContain('Business Rules');
    expect(drawn).toContain('State Machines');
    expect(drawn).toContain('What must always hold here.');
    // A Facet whose Lens says nothing about it draws nothing extra: an empty space
    // where a sentence goes reads as a sentence somebody forgot to write.
    expect(drawn.match(/<abbr title="What must always hold here\."/g)).toHaveLength(1);
  });

  it('keeps a Facet no Module has started named, and calls it out by that name', () => {
    // The column with nothing in it is the one a reader most needs named, and no
    // document could have supplied the name because there are no documents.
    const drawn = draw(
      corpus({
        facets: [
          { name: 'f-one', label: 'Terms' },
          { name: 'f-two', label: 'Transitions' },
        ],
      }),
    );

    expect(drawn).toContain('Transitions');
    expect(drawn).toMatch(/No Module has anything under “Transitions” yet/);
    expect(drawn.match(/data-facet="unstarted"/g)).toHaveLength(1);
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
    expect(drawn.match(/data-facet="unstarted"/g)).toHaveLength(1);
  });

  it('marks a Module nobody answers for, rather than leaving it blank', () => {
    const drawn = draw(corpus({}));

    // LAW-007: every Finding against this Module routes to nobody, which is a
    // defect and not an empty space.
    expect(drawn).toContain('someone');
    expect(drawn).toContain('data-conspicuous');
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
    expect(nothingToCompare).toContain('data-movement="none"');
    expect(nothingToCompare).not.toContain('data-movement="steady"');
    expect(compared).toContain('data-movement="steady"');
    expect(compared).toContain('data-movement="gained"');
    expect(compared).toContain('▲ 2');
    expect(compared).not.toContain('data-movement="none"');
  });

  it('keeps a reading taken against other criteria distinct from both of those', () => {
    const otherCriteria = draw(
      corpus({
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
            movement: { comparedWith: 'a-reading-under-other-criteria' },
          },
        ],
      }),
    );

    // Its own handle, positioned where a movement is drawn, and neither of the
    // other two: there *is* an earlier reading, so `—` would be untrue, and no
    // number can stand for a figure that fell because the bar moved (§6).
    expect(otherCriteria).toContain('data-movement="other-criteria"');
    expect(otherCriteria).not.toContain('data-movement="none"');
    expect(otherCriteria).not.toContain('data-movement="steady"');
    expect(otherCriteria).not.toContain('data-movement="lost"');
    expect(otherCriteria).not.toContain('data-movement="gained"');
    // And the page says why, rather than leaving a reader to work out what a
    // column of one phrase means.
    expect(otherCriteria).toMatch(/taken against different criteria/);
    // The aside for having no baseline is a different sentence and is not shown here.
    expect(otherCriteria).not.toContain('no earlier reading to compare this one with.');
  });

  it('shows the two readings on this page as two figures, never fused', () => {
    const drawn = draw(corpus({}));

    expect(drawn).toContain('Readiness');
    expect(drawn).toContain('of 2 Modules');
    expect(drawn).toContain('Integrity');
    expect(drawn).toContain('from 2 Checks');
    // The grid is Readiness. Nothing folds Integrity into a cell, a row, or a
    // column of it, and no third figure stands for the pair (spec §4).
    expect(drawn.match(/data-figure=""/g)).toHaveLength(2);
    expect(drawn).not.toContain('%');
    expect(drawn).not.toMatch(/\bscore\b/i);
    expect(drawn).not.toMatch(/\bgrade\b/i);
  });

  it("states each Module's figure against what it is out of", () => {
    expect(words(draw(corpus({})))).toContain('1 of 2');
    expect(words(draw(OTHER))).toContain('1 of 3');
  });

  it('lets wide content scroll inside itself, so the page never scrolls sideways', () => {
    // The grid is the one thing here that grows with a Corpus, and it grows
    // sideways. A page that slides under a reader hides the Module column, which
    // is the one column every other one is read against (criterion 8, spec §12).
    expect(draw(OTHER)).toMatch(/data-grid-scroll=""[^>]*>\s*<table/);
  });

  // How old the reading is belongs to the shell, which keeps it in view at every
  // destination inside a Corpus rather than only on this one. Asserted in
  // `shell.test.tsx`.

  it('leads from each Module to what to do about it', () => {
    const drawn = draw(corpus({}));

    // A cell says how far along a Module is and never what to do, which is a
    // Facet at a time with the reason it fell short (spec §5.4).
    expect(drawn).toContain('href="/corpus/c-one/modules/m-one"');
    expect(drawn).toContain('href="/corpus/c-one/modules/m-two"');
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
    expect(drawn).not.toContain('data-figure');
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
