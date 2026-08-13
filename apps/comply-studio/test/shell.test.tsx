import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { corpusListSchema, type CorpusSummary } from '@vertuo/comply-contract';
import { AppShell, type ShelfState } from '../src/shell/AppShell.js';
import { DESTINATIONS, OPENS_AT } from '../src/shell/destinations.js';
import { theOneCorpusToOpen, whereTheReaderIs } from '../src/shell/where.js';

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
  criteriaNotFollowed: [],
}).corpus;

const READ: ShelfState = { corpus: { corpus: SHELF, criteriaNotFollowed: [] }, trouble: null };

/**
 * Reading a source again, as the shell is handed it.
 *
 * A stub rather than the real thing, because what the shell is responsible for is
 * offering the action wherever a reader is inside a Corpus. What a press *does* is
 * asserted where it lives, against `ReadAgain` itself.
 */
const NOT_READING = { doingTo: () => ({ at: 'ready' }) as const, read: () => {} };

function draw(shelf: ShelfState, at = '/corpus'): string {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[at]}>
      <AppShell shelf={shelf} reading={NOT_READING} />
    </MemoryRouter>,
  );
}

/** Just the words a reader meets, with every attribute this is drawn with taken off. */
function words(markup: string): string {
  return markup.replace(/<[^>]*>/g, ' ');
}

/** Asked exactly as the shell asks it, from the destinations there actually are. */
function where(pathname: string) {
  return whereTheReaderIs(
    pathname,
    DESTINATIONS.map((destination) => destination.at),
    OPENS_AT,
  );
}

describe('where the reader is, read off the address', () => {
  it('is nowhere in particular on the shelf', () => {
    expect(where('/corpus')).toEqual({ corpusId: null, moduleId: null, standingAt: null });
    expect(where('/')).toEqual({ corpusId: null, moduleId: null, standingAt: null });
  });

  it('is one Corpus, at whichever of its destinations was named', () => {
    for (const at of DESTINATIONS) {
      expect(where(`/corpus/corpus-a/${at.at}`)).toEqual({
        corpusId: 'corpus-a',
        moduleId: null,
        standingAt: at.at,
      });
    }
  });

  it('stands where a Corpus opens when nothing more specific was asked for', () => {
    expect(where('/corpus/corpus-a')).toEqual({
      corpusId: 'corpus-a',
      moduleId: null,
      standingAt: OPENS_AT,
    });
  });

  it('is one Module, and still standing where it was reached from', () => {
    // A Module is not a destination of its own. Marking none would leave the row
    // saying the reader is nowhere in the Corpus they are plainly inside.
    expect(where('/corpus/corpus-a/modules/alpha')).toEqual({
      corpusId: 'corpus-a',
      moduleId: 'alpha',
      standingAt: OPENS_AT,
    });
  });

  it('reads a name back out of the address it travelled in', () => {
    // A Module or Corpus whose name has a space in it is still that name, and the
    // trail shows a reader the name and never the address.
    expect(where('/corpus/field%20service/modules/work%20orders')).toMatchObject({
      corpusId: 'field service',
      moduleId: 'work orders',
    });
  });
});

describe('where a reader arriving is sent', () => {
  const held = (corpus: { id: string }[], criteriaNotFollowed: unknown[] = []) => ({
    corpus,
    criteriaNotFollowed,
  });

  it('is into the one Corpus, where the shelf holds one', () => {
    // A list of one is a decision asked of somebody who has none to make.
    expect(theOneCorpusToOpen(held([{ id: 'corpus-a' }]))).toBe('corpus-a');
  });

  it('is nowhere in particular where there is more than one to choose between', () => {
    expect(theOneCorpusToOpen(held([{ id: 'corpus-a' }, { id: 'corpus-b' }]))).toBeNull();
  });

  it('is nowhere until the shelf has been read', () => {
    // Sending a reader somewhere on the strength of an empty array sends them nowhere.
    expect(theOneCorpusToOpen(null)).toBeNull();
    expect(theOneCorpusToOpen(held([]))).toBeNull();
  });

  it('is nowhere while anything on the shelf could not be read at all', () => {
    // A set of criteria that could not be followed has no page of its own: the shelf
    // is the only surface that names it, and being sent past it hides the one thing
    // there that somebody has to put right (ADR-0035).
    expect(
      theOneCorpusToOpen(held([{ id: 'corpus-a' }], [{ where: 'lens-b.json' }])),
    ).toBeNull();
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
    expect(draw({ corpus: { corpus: [], criteriaNotFollowed: [] }, trouble: null })).not.toMatch(/Alpha|corpus-a|corpus-b/);
  });

  it('names the Corpus being read, and marks it among the others', () => {
    const drawn = draw(READ, '/corpus/corpus-a/readiness');

    expect(drawn).toContain('Alpha');
    /*
     * Read off the Corpus's own entry and not off `data-active`, which the rail also
     * puts on the destination the reader stands at. Asserted loosely this passed on a
     * frame that had stopped marking the Corpus at all and was only marking Readiness —
     * a test that has quietly stopped testing, which is worse here than a wrong one.
     */
    expect(drawn).toMatch(/data-corpus="corpus-a"[^>]*data-here=""/);
    expect(drawn).not.toMatch(/data-corpus="corpus-b"[^>]*data-here=""/);
  });

  it('says which Corpus a reader is in before saying where they can go in it', () => {
    // The containment is the whole of the arrangement: every figure, queue and Finding
    // in the product belongs to one Corpus. Drawn the other way round, the frame holds
    // two lists of equal weight and neither says it is inside the other.
    const drawn = draw(READ, '/corpus/corpus-a/readiness');

    expect(drawn.indexOf('data-switcher')).toBeGreaterThan(-1);
    expect(drawn.indexOf('data-switcher')).toBeLessThan(drawn.indexOf('data-destination'));
  });

  it('carries the Module inside the Corpus it belongs to', () => {
    const drawn = draw(READ, '/corpus/corpus-a/modules/alpha');

    expect(drawn).toContain('alpha');
    // Back to the Corpus from the Module, which is what makes the trail a trail
    // rather than a caption.
    expect(drawn).toContain('href="/corpus/corpus-a/readiness"');
    // Still standing where the Module was reached from, so the row of
    // destinations does not read as nowhere.
    expect(drawn).toContain('aria-current="page"');
  });

  it('leads back to the Corpus from a Module of one never read from source', () => {
    // The way back does not depend on there being a reading. A Module of a Corpus
    // with nothing written down yet is exactly where a reader most needs it.
    const drawn = draw(READ, '/corpus/corpus-b/modules/only');

    expect(drawn).toContain('href="/corpus/corpus-b/readiness"');
    expect(drawn).toContain('only');
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
    expect(draw({ corpus: { corpus: [], criteriaNotFollowed: [] }, trouble: null })).toContain('Nothing is on the shelf yet');
  });

  it('tells an empty shelf apart from one whose every file could not be read', () => {
    // The menu names neither of them, because a set of criteria that could not be
    // followed has no page to go to. But *nothing is on the shelf yet* is what this
    // said about a shelf holding one, which is what a shelf holding nothing says
    // (LAW-006, spec §8).
    const refused = draw({
      corpus: {
        corpus: [],
        criteriaNotFollowed: [{ where: 'lens-b.json', because: 'nothing about it can be read yet' }],
      },
      trouble: null,
    });

    expect(refused).not.toContain('Nothing is on the shelf yet');
    expect(refused).toContain('Nothing on the shelf can be read yet');
    expect(refused).toContain('says which file to put right');
  });

  it('names the surface being read, and says what that surface answers', () => {
    // The Corpus is named in the trail; the heading names the *surface*, because a
    // reader who has arrived somewhere is owed the name of where that is and what it
    // will tell them. Naming the Corpus twice on one screen reads as two things.
    const opens = DESTINATIONS.find((destination) => destination.at === OPENS_AT)!;
    const drawn = draw(READ, `/corpus/corpus-a/${OPENS_AT}`);

    expect(drawn).toContain(`data-surface="${OPENS_AT}"`);
    expect(words(drawn)).toContain(opens.label);
    expect(words(drawn)).toContain(opens.describes);
  });

  it('is titled by the Module where the reader is inside one', () => {
    // A Module is not a destination of its own. Titled by the destination it was
    // reached through, its page would be headed by the surface a reader came
    // *through* rather than the thing they came to read.
    const drawn = draw(READ, '/corpus/corpus-a/modules/alpha');

    expect(drawn).toContain('data-surface="module"');
    expect(words(drawn)).toContain('alpha');
  });

  it('is titled by the shelf where no Corpus is being read', () => {
    expect(draw(READ)).toContain('data-surface="shelf"');
  });

  it('says what every destination answers, so a fourth cannot arrive unnamed', () => {
    for (const destination of DESTINATIONS) {
      expect(destination.describes.length).toBeGreaterThan(0);
    }
  });

  it('offers the one action that changes what the shelf holds, once, wherever the reader is in a Corpus', () => {
    // It reached one destination of three before this: a reader looking at a queue or
    // at what moved had to go back to the grid to bring new knowledge in. One of it,
    // because two buttons doing one thing are two things to keep in step.
    for (const destination of DESTINATIONS) {
      const drawn = draw(READ, `/corpus/corpus-a/${destination.at}`);

      expect(drawn.match(/data-read-again=/g)).toHaveLength(1);
    }
    expect(draw(READ, '/corpus/corpus-a/modules/alpha').match(/data-read-again=/g)).toHaveLength(1);
  });

  it('offers it on a Corpus with nothing written down yet, which is what it is for', () => {
    // The whole remedy for that state, so the state it is missing from is the one
    // where it matters most (ADR-0035).
    expect(draw(READ, '/corpus/corpus-b/readiness')).toContain('data-read-again=');
  });

  it('offers it nowhere on the shelf, where there is no one source to read', () => {
    expect(draw(READ)).not.toContain('data-read-again');
  });

  it('offers nothing to sign in to, because there is nobody to be', () => {
    // A Module Owner is free text lifted from a corpus, not an account. An
    // affordance for something that does not exist is a lie.
    const drawn = draw(READ, '/corpus/corpus-a/readiness');

    expect(drawn).not.toMatch(/sign in|log out|settings|account/i);
  });
});
