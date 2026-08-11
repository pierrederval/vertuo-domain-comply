import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { corpusListSchema, type CorpusSummary } from '@vertuo/comply-contract';
import { AppShell, type ShelfState } from '../src/shell/AppShell.js';
import { DESTINATIONS } from '../src/shell/destinations.js';
import { whereTheReaderIs } from '../src/shell/where.js';

/**
 * A shelf of deliberately unalike Corpus, as the server would answer for it: one
 * read and one never read from source, differently named, different sizes
 * (ADR-0001). Read through the shared definition, so what this test hands the
 * shell is what the server could send it.
 */
const SHELF: CorpusSummary[] = corpusListSchema.parse({
  corpus: [
    {
      id: 'corpus-a',
      name: 'Alpha',
      reading: {
        outcome: 'read',
        sourceReadAt: '2026-01-01T08:00:00.000Z',
        readiness: { modulesFullyApproved: 1, modules: 3 },
        integrity: { openFindings: 5, lookedFor: ['split-identity'] },
      },
    },
    { id: 'corpus-b', name: 'corpus-b', reading: { outcome: 'nothing-written-down-yet' } },
  ],
}).corpus;

const READ: ShelfState = { corpus: SHELF, trouble: null };

function draw(shelf: ShelfState, at = '/corpus'): string {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[at]}>
      <AppShell shelf={shelf} />
    </MemoryRouter>,
  );
}

describe('where the reader is, read off the address', () => {
  it('is nowhere in particular on the shelf', () => {
    expect(whereTheReaderIs('/corpus')).toEqual({ corpusId: null, moduleId: null });
    expect(whereTheReaderIs('/')).toEqual({ corpusId: null, moduleId: null });
  });

  it('is one Corpus, at every destination inside it', () => {
    for (const at of ['/corpus/corpus-a', '/corpus/corpus-a/readiness', '/corpus/corpus-a/inbox']) {
      expect(whereTheReaderIs(at)).toEqual({ corpusId: 'corpus-a', moduleId: null });
    }
  });

  it('is one Module inside one Corpus', () => {
    expect(whereTheReaderIs('/corpus/corpus-a/modules/alpha')).toEqual({
      corpusId: 'corpus-a',
      moduleId: 'alpha',
    });
  });

  it('reads a name back out of the address it travelled in', () => {
    // A Module or Corpus whose name has a space in it is still that name, and the
    // trail shows a reader the name and never the address.
    expect(whereTheReaderIs('/corpus/field%20service/modules/work%20orders')).toEqual({
      corpusId: 'field service',
      moduleId: 'work orders',
    });
  });
});

describe('the shell', () => {
  it('draws the shelf as one place to go per Corpus, and nothing of its own', () => {
    const drawn = draw(READ);

    for (const entry of SHELF) {
      expect(drawn).toContain(`data-corpus="${entry.id}"`);
      expect(drawn).toContain(entry.name);
    }
    expect(drawn.match(/data-corpus="/g)).toHaveLength(SHELF.length);

    // Nothing belonging to any one Corpus is written into the shell (LAW-004):
    // handed an empty shelf it has no name of its own left to draw.
    expect(draw({ corpus: [], trouble: null })).not.toMatch(/Alpha|corpus-a|corpus-b/);
  });

  it('names the Corpus being read, and marks it on the shelf', () => {
    const drawn = draw(READ, '/corpus/corpus-a/readiness');

    expect(drawn).toContain('Alpha');
    expect(drawn).toContain('data-active="true"');
  });

  it('carries the Module inside the Corpus it belongs to', () => {
    const drawn = draw(READ, '/corpus/corpus-a/modules/alpha');

    expect(drawn).toContain('alpha');
    // Back to the Corpus from the Module, which is what makes the trail a trail
    // rather than a caption.
    expect(drawn).toContain('href="/corpus/corpus-a/readiness"');
  });

  it('says how old the reading is wherever a Corpus is being read', () => {
    // A surface that cannot say how old its reading is invites false confidence.
    const drawn = draw(READ, '/corpus/corpus-a/readiness');

    expect(drawn).toContain('Read from source');
    expect(drawn).toContain('2026-01-01T08:00:00.000Z');
  });

  it('claims no age for a Corpus whose source has never been read', () => {
    // Not "read never ago", and not a blank where a date goes. There is no
    // reading, so nothing about one is said.
    expect(draw(READ, '/corpus/corpus-b/readiness')).not.toContain('Read from source');
  });

  it('offers the Corpus its destinations, and only inside one', () => {
    const inside = draw(READ, '/corpus/corpus-a/readiness');

    expect(inside.match(/data-destination=""/g)).toHaveLength(DESTINATIONS.length);
    for (const destination of DESTINATIONS) {
      expect(inside).toContain(`href="/corpus/corpus-a/${destination.at}"`);
    }
    // On the shelf there is no Corpus for them to belong to.
    expect(draw(READ)).not.toContain('data-destination');
  });

  it('says the shelf could not be read without emptying the page beside it', () => {
    const drawn = draw({ corpus: null, trouble: 'The Studio could not reach the knowledge it holds.' });

    expect(drawn).toContain('could not reach the knowledge it holds');
    // Not drawn as an empty shelf: knowledge that could not be read and knowledge
    // nobody has written down are different facts about a reader's Corpus.
    expect(drawn).not.toContain('Nothing is on the shelf yet');
  });

  it('tells waiting apart from an empty shelf', () => {
    expect(draw({ corpus: null, trouble: null })).toContain('Reading the shelf');
    expect(draw({ corpus: [], trouble: null })).toContain('Nothing is on the shelf yet');
  });

  it('offers nothing to sign in to, because there is nobody to be', () => {
    // A Module Owner is free text lifted from a corpus, not an account. An
    // affordance for something that does not exist is a lie.
    const drawn = draw(READ, '/corpus/corpus-a/readiness');

    expect(drawn).not.toMatch(/sign in|log out|settings|account/i);
  });
});
