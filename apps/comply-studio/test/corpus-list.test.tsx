import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { corpusListSchema, type CorpusSummary } from '@vertuo/comply-contract';
import { Navigation } from '../src/App.js';
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
}).corpus;

function draw(corpus: CorpusSummary[]): string {
  return renderToStaticMarkup(<CorpusList corpus={corpus} />);
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
    expect(drawn.match(/class="figure"/g)).toHaveLength(4);
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
    expect(drawn).not.toContain('class="figure"');
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

describe('where a person can go', () => {
  it('offers three destinations and no more', () => {
    const drawn = renderToStaticMarkup(
      <MemoryRouter>
        <Navigation />
      </MemoryRouter>,
    );

    expect(drawn.match(/class="destination[^"]*"/g)).toHaveLength(3);
    expect(drawn).toContain('Home');
    expect(drawn).toContain('Inbox');
    expect(drawn).toContain('Corpus');
  });
});
