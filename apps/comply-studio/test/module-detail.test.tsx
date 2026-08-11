import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { corpusModuleSchema, type CorpusModule } from '@vertuo/comply-contract';
import { ModuleDetail } from '../src/corpus/ModuleDetail.js';

/**
 * One Module as the server would answer for it, in all four states at once: a
 * Facet nobody has written under, one short on content for two different
 * reasons, one sufficient and unapproved, and one approved. Nobody answers for
 * it, and it has a Finding citing two places.
 *
 * Deliberately shapeless names. Anything here that read like a real Facet, a
 * real step or a real attribute would be one Corpus's shape written into the
 * component that has to draw every Corpus (LAW-004).
 */
const MODULE: CorpusModule = corpusModuleSchema.parse({
  corpus: { id: 'c1', name: 'C One' },
  id: 'm1',
  reading: {
    outcome: 'read',
    sourceReadAt: '2026-01-01T08:00:00.000Z',
    lensId: 'c1',
    ladder: { levels: ['low', 'middling', 'high'], approvedAtOrAbove: 'high' },
    owner: null,
    facets: [
      { facet: 'f1', state: 'absent' },
      {
        facet: 'f2',
        state: 'present',
        knowledge: [{ at: { file: 'one.md', line: 3 }, maturity: 'low' }],
        shortOf: [
          { criterion: 'requiredAttributes', missing: ['a1', 'a2'] },
          { criterion: 'minSources', has: 1, needs: 3 },
        ],
      },
      {
        facet: 'f3',
        state: 'well-formed',
        knowledge: [
          { at: { file: 'two.md', line: 4 }, maturity: 'middling' },
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
      {
        says: 'two things here are called the same and are not the same',
        at: { file: 'one.md', line: 3 },
        alsoAt: [{ file: 'two.md', line: 9 }],
      },
    ],
    lookedFor: ['a-check', 'another-check'],
  },
});

/** The same Module, with one part of its reading replaced. */
function like(part: Record<string, unknown>): CorpusModule {
  return corpusModuleSchema.parse({
    ...MODULE,
    reading: { ...MODULE.reading, ...part },
  });
}

/** Drawn where links work, because every route out of this page is one. */
function draw(module: CorpusModule): string {
  return renderToStaticMarkup(
    <MemoryRouter>
      <ModuleDetail module={module} />
    </MemoryRouter>,
  );
}

describe('one Module, drilled into', () => {
  it('lists every Facet the Lens declares, with the state each is in', () => {
    const drawn = draw(MODULE);
    if (MODULE.reading.outcome !== 'read') throw new Error('the source was written down');

    for (const facet of MODULE.reading.facets) {
      expect(drawn).toContain(facet.facet);
      expect(drawn).toContain(`data-facet-state="${facet.state}"`);
    }
  });

  it('says what is missing from a Facet short on content', () => {
    const drawn = draw(MODULE);

    // The parts arrive as data and the sentence is written here, so what a
    // reader meets is what this file says and not what computed it.
    expect(drawn).toContain('Nothing is written down under a1, a2.');
    expect(drawn).toContain('Backed by 1 Source, where this Corpus asks for 3.');
  });

  it('says a sufficient Facet needs approving, and never that something is missing from it', () => {
    const drawn = draw(MODULE);

    // Different work, usually a different person: this one asks somebody to
    // read what is there, not to write more.
    expect(drawn).toContain('What is written down here is enough');
    expect(drawn).toContain('somebody to approve it');
    expect(drawn).toContain('Not yet at “high”: 2 of 2 pieces of knowledge here');
  });

  it('draws the two shortfalls differently', () => {
    const short = draw(
      like({
        facets: [
          {
            facet: 'f1',
            state: 'present',
            knowledge: [{ at: { file: 'one.md', line: 1 }, maturity: 'low' }],
            shortOf: [{ criterion: 'requiredAttributes', missing: ['a1'] }],
          },
        ],
        approved: 0,
        declaredFacets: 1,
      }),
    );
    const unapproved = draw(
      like({
        facets: [
          {
            facet: 'f1',
            state: 'well-formed',
            knowledge: [{ at: { file: 'one.md', line: 1 }, maturity: 'low' }],
            notYetApproved: 1,
          },
        ],
        approved: 0,
        declaredFacets: 1,
      }),
    );

    // Same Facet, same knowledge, two different pieces of work. A page that drew
    // them the same would send half its readers to do the wrong one.
    expect(short).toContain('not yet enough');
    expect(short).not.toContain('somebody to approve it');
    expect(unapproved).toContain('somebody to approve it');
    expect(unapproved).not.toContain('not yet enough');
  });

  it('says nothing is written down under an absent Facet, and shows no shortfall for it', () => {
    const drawn = draw(
      like({ facets: [{ facet: 'f1', state: 'absent' }], approved: 0, declaredFacets: 1 }),
    );

    // It falls short of nothing. Listing criteria it has no content to meet
    // would send an Owner to review knowledge that does not exist.
    expect(drawn).toContain('Nothing is written down here.');
    expect(drawn).toContain('write it down before there is anything to approve');
    expect(drawn).not.toContain('shortfalls');
  });

  it('holds no word belonging to whatever computed a reason', () => {
    const drawn = draw(
      like({
        facets: [
          {
            facet: 'f1',
            state: 'present',
            knowledge: [{ at: { file: 'one.md', line: 1 }, maturity: 'low' }],
            shortOf: [
              { criterion: 'requiredAttributes', missing: ['a1'] },
              { criterion: 'minSources', has: 0, needs: 2 },
              { criterion: 'minRelations', relation: 'r1', has: 0, needs: 1 },
              { criterion: 'allStatesReachable', unreachable: ['s1', 's2'] },
            ],
          },
        ],
        approved: 0,
        declaredFacets: 1,
      }),
    );

    // Every kind of shortfall there is, drawn at once. Not one of the criterion
    // names reaches a reader — which is what makes the guard's verdict on this
    // file worth anything, since it can only read what is written as text.
    expect(drawn).toContain('Nothing is written down under a1.');
    expect(drawn).toContain('Backed by 0 Sources, where this Corpus asks for 2.');
    expect(drawn).toContain('0 links of the kind “r1”, where this Corpus asks for 1.');
    expect(drawn).toContain('Nothing leads to s1, s2.');
    for (const kind of ['requiredAttributes', 'minSources', 'minRelations', 'allStatesReachable']) {
      expect(drawn).not.toContain(kind);
    }
  });

  it('marks a Module nobody answers for rather than leaving it blank', () => {
    const nobody = draw(MODULE);
    const answered = draw(like({ owner: 'someone' }));

    expect(nobody).toContain('Nobody answers for this Module');
    expect(nobody).toContain('data-conspicuous');
    expect(answered).toContain('someone');
    expect(answered).not.toContain('Nobody answers for this Module');
  });

  it('lists each Finding with the place it cites, and every other place it concerns', () => {
    const drawn = draw(MODULE);

    expect(drawn).toContain('two things here are called the same');
    expect(drawn).toContain('one.md, line 3');
    // Evidence is not summarised into the one place it fits (LAW-009).
    expect(drawn).toContain('two.md, line 9');
  });

  it('names what was looked for when it found nothing here', () => {
    const drawn = draw(like({ findings: [] }));

    // "No Findings" is a claim about the whole Module; what is true is that
    // these Checks found none (LAW-006).
    expect(drawn).toContain('Nothing was found against this Module by the 2 Checks that ran');
    expect(drawn).toContain('a-check, another-check');
  });

  it('shows where each piece of knowledge is, and says so when the Corpus grades it at nothing', () => {
    const drawn = draw(MODULE);

    expect(drawn).toContain('two.md, line 4');
    expect(drawn).toContain('at “middling”');
    // Not an empty space, and not the word the code has for nothing (LAW-010).
    expect(drawn).toContain('this Corpus does not say how far along it is');
  });

  it('states the denominator in words, and what approved means here', () => {
    const drawn = draw(MODULE);

    expect(drawn).toContain('counted out of the 4 Facets the Lens “c1” declares');
    expect(drawn).toContain('Knowledge nobody has written down anywhere is not counted here');
    expect(drawn).toContain('Approved means at or above “high”');
    expect(drawn).toContain('low → middling → high');
  });

  it('draws the two readings as two figures and nothing standing for both', () => {
    const drawn = draw(MODULE);

    expect(drawn).toContain('Facets approved');
    expect(drawn).toContain('of 4 Facets');
    expect(drawn).toContain('Open Findings');
    expect(drawn).toContain('from 2 Checks');
    expect(drawn.match(/data-figure=""/g)).toHaveLength(2);
    expect(drawn).not.toContain('%');
    expect(drawn).not.toMatch(/\bscore\b/i);
    expect(drawn).not.toMatch(/\bgrade\b/i);
  });

  // Which Corpus this Module sits in, and the way back to it, are the shell's:
  // it carries both in the trail. Asserted in `shell.test.tsx`, including for a
  // Corpus whose source has never been read, so the way back never depends on
  // there being a reading.

  it('says plainly that nothing has been written down, rather than that the Module is missing', () => {
    const unread = corpusModuleSchema.parse({
      corpus: { id: 'c1', name: 'C One' },
      id: 'm1',
      reading: { outcome: 'nothing-written-down-yet' },
    });
    const drawn = draw(unread);

    expect(drawn).toContain('Nothing has been written down from this source yet');
    expect(drawn).not.toContain('data-figure');
  });

  it('holds no word belonging to any one Corpus', () => {
    const drawn = draw(MODULE);
    const elsewhere = draw(
      like({
        ladder: { levels: ['x', 'y'], approvedAtOrAbove: 'y' },
        facets: [{ facet: 'g1', state: 'absent' }],
        approved: 0,
        declaredFacets: 1,
      }),
    );

    // The same component draws two Corpus that share not one word, so nothing in
    // it can have been written for either (LAW-004).
    for (const word of ['f1', 'f4', 'middling', 'a-check']) expect(drawn).toContain(word);
    for (const word of ['f2', 'f3', 'f4', 'middling', 'low → middling']) {
      expect(elsewhere).not.toContain(word);
    }
    expect(elsewhere).toContain('g1');
  });
});
