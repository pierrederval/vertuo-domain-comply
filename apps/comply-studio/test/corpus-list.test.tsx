import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import {
  corpusListSchema,
  type CorpusSummary,
  type CriteriaNotFollowed,
} from '@vertuo/comply-contract';
import { CorpusList } from '../src/corpus/CorpusList.js';

/**
 * Two Corpus of deliberately unalike shape, as the server would answer for them:
 * different names, different Module counts, one with defects and one without, and
 * one whose source has never been read (ADR-0001).
 *
 * Read through the shared definition, so a payload this test accepts is one the
 * server could actually send.
 */
const CORPUS: CorpusSummary[] = corpusListSchema.parse({
  corpus: [
    {
      id: 'corpus-a',
      name: 'Alpha',
      reading: {
        outcome: 'read',
        sourceReadAt: '2026-01-01T08:00:00.000Z',
        readiness: { modulesFullyApproved: 0, modules: 3 },
        integrity: { openFindings: 5, lookedFor: ['split-identity', 'missing-owner'] },
      },
    },
    {
      id: 'corpus-b',
      name: 'corpus-b',
      reading: {
        outcome: 'read',
        sourceReadAt: '2026-01-01T11:30:00.000Z',
        readiness: { modulesFullyApproved: 1, modules: 1 },
        integrity: { openFindings: 0, lookedFor: ['split-identity'] },
      },
    },
    { id: 'corpus-c', name: 'Third', reading: { outcome: 'nothing-written-down-yet' } },
  ],
  criteriaNotFollowed: [],
}).corpus;

/** Each Corpus's name leads to its own page, so the list is drawn where links work. */
function draw(corpus: CorpusSummary[], criteriaNotFollowed: CriteriaNotFollowed[] = []): string {
  return renderToStaticMarkup(
    <MemoryRouter>
      <CorpusList corpus={corpus} criteriaNotFollowed={criteriaNotFollowed} />
    </MemoryRouter>,
  );
}

describe('the Corpus list', () => {
  it('shows every Corpus the server answered with', () => {
    const drawn = draw(CORPUS);
    for (const entry of CORPUS) expect(drawn).toContain(entry.name);
  });

  it('shows the two readings as two figures, each saying what it is out of', () => {
    const drawn = draw([CORPUS[0]!]);

    expect(drawn).toContain('Readiness');
    expect(drawn).toContain('Modules fully approved');
    expect(drawn).toContain('of 3 Modules');

    expect(drawn).toContain('Integrity');
    expect(drawn).toContain('Open Findings');
    expect(drawn).toContain('from 2 Checks');
    // One of a thing is not "1 things": a denominator a reader trips over is one
    // they discount.
    expect(draw([CORPUS[1]!])).toContain('from 1 Check');
    expect(draw([CORPUS[1]!])).toContain('of 1 Module');
    // What was looked for, in full, for anyone who wants it.
    expect(drawn).toContain('split-identity, missing-owner');
  });

  it('draws no figure standing for both readings', () => {
    const drawn = draw(CORPUS);

    // A rate, a grade, or an average across Corpus routes to nobody and implies
    // nothing is missing. None is drawn because none is computed (spec §4).
    expect(drawn).not.toContain('%');
    expect(drawn).not.toMatch(/\bscore\b/i);
    expect(drawn).not.toMatch(/\bgrade\b/i);
    // Three Corpus, and exactly two figures each. Nothing sits between them.
    expect(drawn.match(/data-figure=""/g)).toHaveLength(4);
  });

  it('says how old each reading is', () => {
    const drawn = draw(CORPUS);

    expect(drawn).toContain('Read from source');
    for (const entry of CORPUS) {
      if (entry.reading.outcome === 'read') expect(drawn).toContain(entry.reading.sourceReadAt);
    }
  });

  it('says plainly that a Corpus has nothing written down, rather than showing a zero', () => {
    const drawn = draw([CORPUS[2]!]);

    expect(drawn).toContain('Nothing has been written down from this source yet');
    // No reading exists, so no figure is drawn: zero approved of zero Modules
    // would be a reading, and there is none to report.
    expect(drawn).not.toContain('data-figure');
  });

  it('leads from each Corpus to the whole reading of it', () => {
    const drawn = draw(CORPUS);

    for (const entry of CORPUS) expect(drawn).toContain(`href="/corpus/${entry.id}"`);
  });

  it('says the shelf is empty rather than drawing nothing at all', () => {
    expect(draw([])).toContain('No Corpus is on the shelf yet');
  });

  it('holds no word belonging to any one Corpus', () => {
    // The shapes differ in every respect that matters and the same component draws
    // both, so nothing here can have been written for one of them (LAW-004). The
    // vocabulary guard covers this file too; this asserts the consequence.
    const drawn = draw(CORPUS);
    for (const word of ['Alpha', 'corpus-b', 'Third']) expect(drawn).toContain(word);
    expect(draw([])).not.toMatch(/Alpha|corpus-|Third/);
  });
});

/**
 * Spec §8's other half, drawn: a Corpus that cannot be read, and a file that was
 * meant to describe one.
 */
describe('what the shelf says about what it could not read', () => {
  const UNREADABLE: CorpusSummary = corpusListSchema.parse({
    corpus: [{
      id: 'corpus-d',
      name: 'Fourth',
      reading: {
        outcome: 'could-not-be-read',
        because: 'The knowledge last written down from this source cannot be read back.',
      },
    }],
    criteriaNotFollowed: [],
  }).corpus[0]!;

  const REFUSED: CriteriaNotFollowed = {
    where: 'lens-b.json',
    because: 'Nothing about the Corpus described in lens-b.json can be read yet, because it counts anything at "signed-off" or above as approved.',
  };

  it('says why a Corpus has no reading, in the words the server sent', () => {
    // Never a summary of them. A reason worded again here is a second wording to keep
    // in step with the one the runner prints (ADR-0034).
    const drawn = draw([UNREADABLE]);

    expect(drawn).toContain('cannot be read back');
  });

  it('draws no figure for it, and does not say nothing has been written down', () => {
    const drawn = draw([UNREADABLE]);

    expect(drawn).not.toContain('data-figure');
    expect(drawn).not.toContain('Nothing has been written down');
  });

  it('still leads to its page, because that is where the thing to do about it is', () => {
    // It has a Lens, so it has a page, and the action that reads its source again is
    // on that page and nowhere else (ADR-0034 §5, spec §5.5).
    expect(draw([UNREADABLE])).toContain('href="/corpus/corpus-d"');
  });

  it('says which file to put right, where a set of criteria could not be followed', () => {
    const drawn = draw([], [REFUSED]);

    expect(drawn).toContain('lens-b.json');
    // Quoted at source; the markup carries the quotes as entities.
    expect(drawn).toContain('signed-off');
  });

  it('leads a file that is not a Corpus yet to no page at all', () => {
    // It has no id, no name and no reading, so there is nothing to open. A link would
    // go to a page about a Corpus nothing knows anything about.
    expect(draw([], [REFUSED])).not.toContain('href=');
  });

  it('tells the two apart by a handle, and neither of them by how it is styled', () => {
    const both = draw([UNREADABLE], [REFUSED]);

    expect(both.match(/data-cannot-be-read="knowledge"/g)).toHaveLength(1);
    expect(both.match(/data-cannot-be-read="criteria"/g)).toHaveLength(1);
  });

  it('says a shelf holds nothing readable at all rather than saying it holds nothing', () => {
    // *No Corpus is on the shelf yet* was what a shelf with one unreadable file said,
    // which is what a shelf with nothing on it says (LAW-006).
    const drawn = draw([], [REFUSED]);

    expect(drawn).not.toContain('No Corpus is on the shelf yet');
    expect(drawn).toContain('lens-b.json');
  });

  it('shows every readable Corpus beside them, with every figure it had (AC-4)', () => {
    const alone = draw(CORPUS);
    const beside = draw(CORPUS, [REFUSED]);

    for (const entry of CORPUS) {
      expect(beside).toContain(entry.name);
      expect(beside).toContain(`href="/corpus/${entry.id}"`);
    }
    // Two Corpus have been read, each drawing two figures and never a third.
    expect(beside.match(/data-figure=""/g)).toHaveLength(alone.match(/data-figure=""/g)!.length);
  });
});
