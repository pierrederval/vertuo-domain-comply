import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { corpusInboxSchema, type CorpusInbox } from '@vertuo/comply-contract';
import { EVERYTHING, Inbox, type Narrowing } from '../src/corpus/Inbox.js';

/**
 * One Corpus's Findings as the server would answer for them: the ones reaching
 * nobody first, then a queue for each of two people.
 *
 * The first queue holds both kinds that reach nobody — one belonging to a Module
 * nobody answers for, and one belonging to no Module at all, which cites a place
 * nothing is written at. The second holds a defect about two statements that
 * disagree, whose second place is written under another Module.
 *
 * Deliberately shapeless names. Anything here that read like a real Module, a real
 * person or a real defect would be one Corpus's shape written into the component
 * that has to draw every Corpus (LAW-004).
 */
const INBOX: CorpusInbox = corpusInboxSchema.parse({
  corpus: { id: 'c1', name: 'C One' },
  reading: {
    outcome: 'read',
    sourceReadAt: '2026-01-01T08:00:00.000Z',
    lensId: 'c1',
    routesTo: [
      {
        owner: null,
        findings: [
          {
            says: 'two things here are called the same and are not the same',
            foundBy: 'a-check',
            moduleId: 'm2',
            cites: {
              at: { file: 'two.md', line: 4 },
              writtenUnder: 'm2',
              quoted: { says: '| a word | what it means |', cut: false },
            },
            alsoCites: [],
          },
          {
            says: 'nothing could be read out of this at all',
            foundBy: 'another-check',
            moduleId: null,
            cites: { at: { file: 'four.md', line: 1 }, writtenUnder: null, quoted: null },
            alsoCites: [],
          },
        ],
      },
      {
        owner: 'p1',
        findings: [
          {
            says: 'one word is written down two different ways',
            foundBy: 'a-check',
            moduleId: 'm1',
            cites: {
              at: { file: 'one.md', line: 3 },
              writtenUnder: 'm1',
              quoted: { says: 'the first way it is put', cut: false },
            },
            alsoCites: [
              {
                at: { file: 'two.md', line: 9 },
                writtenUnder: 'm2',
                quoted: { says: 'the second way it is put', cut: true },
              },
            ],
          },
        ],
      },
      {
        owner: 'p2',
        findings: [
          {
            says: 'this points at something that is not there',
            foundBy: 'another-check',
            moduleId: 'm3',
            cites: {
              at: { file: 'three.md', line: 6 },
              writtenUnder: 'm3',
              quoted: { says: 'see the other page', cut: false },
            },
            alsoCites: [],
          },
        ],
      },
    ],
    lookedFor: ['a-check', 'another-check', 'a-check-that-found-nothing'],
  },
});

/** The same Inbox, with one part of its reading replaced. */
function like(part: Record<string, unknown>): CorpusInbox {
  return corpusInboxSchema.parse({ ...INBOX, reading: { ...INBOX.reading, ...part } });
}

/** Narrowed one way and no other. */
function only(part: Partial<Narrowing>): Narrowing {
  return { ...EVERYTHING, ...part };
}

/**
 * The address a reader would be at, narrowed that way.
 *
 * Built from the narrowing rather than written beside it, so the page is always drawn
 * where it says it is: how it is narrowed lives in the address and nowhere else, and a
 * test that set the two independently could pass over a page reading one and drawing
 * the other.
 */
function addressOf(narrowing: Narrowing): string {
  const asked = new URLSearchParams();
  for (const [of, value] of Object.entries(narrowing)) {
    if (value !== null && value !== '') asked.set(of, String(value));
  }
  const query = asked.toString();
  return `/corpus/c1/inbox${query === '' ? '' : `?${query}`}`;
}

/** Drawn where links work and the address is the one the reader is at. */
function draw(inbox: CorpusInbox, narrowing: Narrowing = EVERYTHING): string {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[addressOf(narrowing)]}>
      <Inbox inbox={inbox} narrowing={narrowing} />
    </MemoryRouter>,
  );
}

/**
 * The words on the page, with the markup taken out and nothing put in its place.
 *
 * The figure and what it is counted against are two elements and one phrase — the count
 * carries the weight of the row it leads and the rest of the sentence does not — so
 * `4 Findings in this Corpus` cannot be found in the markup. Stripping without inserting
 * a space is the point: a space between the two halves would be a phrase this page never
 * draws, and the alternative is writing the markup into the assertion, which is the
 * class-name assertion this repository refuses by another route.
 */
function words(markup: string): string {
  return markup.replace(/<[^>]*>/g, '');
}

/**
 * Who each row on the page routes to, in the order a reader meets them.
 *
 * The empty value is the row reaching nobody, for the same reason its address is: every
 * owner field in the agreement refuses an empty name, so it is the one value that can
 * never be somebody's.
 */
function routesToIn(drawn: string): string[] {
  return [...drawn.matchAll(/data-routes-to="([^"]*)"/g)].map((found) => found[1]!);
}

/** Which Check found each row, in order. */
function foundByIn(drawn: string): string[] {
  return [...drawn.matchAll(/data-found-by="([^"]*)"/g)].map((found) => found[1]!);
}

/**
 * Each Finding's own markup, on its own.
 *
 * So that a control inside a row can be told from one in the toolbar above the list.
 * The first is the thing LAW-011 refuses; the second is four queries in an address.
 */
function rowsIn(drawn: string): string[] {
  return drawn
    .split('<li ')
    .slice(1)
    .map((rest) => rest.split('</li>')[0]!);
}

describe('a Corpus’s Findings, worked as an Inbox', () => {
  it('puts the Findings reaching nobody above everything else', () => {
    const drawn = draw(INBOX);

    // The law made into a position in one list. A violation belonging to nobody is
    // how a knowledge base quietly dies, and mixed in among owned rows these
    // reproduce exactly the failure LAW-007 exists to prevent — so the order is
    // asserted rather than left to whoever next changes the layout.
    expect(routesToIn(drawn)).toEqual(['', '', 'p1', 'p2']);
    expect(drawn).toContain('data-conspicuous');
  });

  it('says on every row who answers for it, and not over a section of rows', () => {
    const drawn = draw(INBOX);

    // The Owner was a card heading above a hundred rows, so the one fact LAW-007
    // exists to keep visible was a property of a section a reader had scrolled past.
    // It travels with each Finding now (ADR-0041).
    expect([...drawn.matchAll(/data-answers-for="([^"]*)"/g)].map((found) => found[1]!)).toEqual([
      '',
      '',
      'p1',
      'p2',
    ]);
  });

  it('says what nobody answering for these means, and not only that nobody does', () => {
    const drawn = draw(INBOX);

    // The mark says there is a defect; this says what the defect costs. A reader
    // who does not know why the top of the page is loud reads it as decoration.
    expect(drawn).toContain('data-reaches-nobody');
    expect(drawn).toContain('2 Findings in this Corpus route to nobody');
    expect(drawn).toContain('until somebody is named to answer for them');
    // And not *until somebody answers for the Module each belongs to*: one of
    // these belongs to no Module, so for that one there is no Module to name
    // anybody against, and the sentence would be a promise the page cannot keep.
    expect(drawn).not.toContain('answers for the Module');
  });

  it('says what routes to nobody wherever a reader has narrowed away from it', () => {
    const mine = draw(INBOX, only({ owner: 'p1' }));
    const byKind = draw(INBOX, only({ kind: 'another-check' }));
    const nobody = draw(INBOX, only({ owner: '' }));

    // A bookmark is how the loudest thing on a page stops being seen, and a filter is
    // a bookmark somebody made for themselves (LAW-007).
    for (const drawn of [mine, byKind]) {
      expect(drawn).toContain('2 Findings in this Corpus route to nobody');
      expect(drawn).toContain('data-conspicuous');
    }
    // One of a thing is not "1 things", and a denominator a reader trips over is one
    // they discount — which is the whole use this sentence has.
    const alone = draw(
      like({
        routesTo: [
          {
            owner: null,
            findings: [
              {
                says: 'the only one of these',
                foundBy: 'a-check',
                moduleId: 'm2',
                cites: { at: { file: 'two.md', line: 4 }, writtenUnder: 'm2', quoted: null },
                alsoCites: [],
              },
            ],
          },
        ],
      }),
      only({ owner: 'p1' }),
    );
    expect(alone).toContain('1 Finding in this Corpus routes to nobody');
    // Not where they are already looking at exactly those, which would be the page
    // telling them twice what they can see.
    expect(routesToIn(nobody)).toEqual(['', '']);
    expect(nobody).not.toContain('data-reaches-nobody');
  });

  it('narrows to one person from the address, so a queue is a link somebody can send', () => {
    const mine = draw(INBOX, only({ owner: 'p1' }));
    const nobody = draw(INBOX, only({ owner: '' }));

    // Nobody's queue is addressed by the one value no name can ever be, which is what
    // it has always been — so every link already made to somebody's queue arrives.
    expect(routesToIn(mine)).toEqual(['p1']);
    expect(mine).toContain('one word is written down two different ways');
    expect(mine).not.toContain('this points at something that is not there');
    expect(routesToIn(nobody)).toEqual(['', '']);
    expect(nobody).toContain('data-narrowed="owner"');
  });

  it('shows the queue reaching nobody as the one a reader has chosen, not as everybody’s', () => {
    const nobody = draw(INBOX, only({ owner: '' }));
    const everybody = draw(INBOX);

    // Nobody's queue is narrowed to by the empty value, and *nothing narrowed* is a
    // value the menu needs too. As two strings those are one string: the menu could
    // neither show that nobody's queue was chosen nor let a reader choose it, and
    // picking it cleared the filter instead — so the loudest thing in the product was
    // the one thing that could not be asked for (LAW-007).
    //
    // What a reader picks is carried as the option's position, which no name a corpus
    // writes can collide with. So the chosen option is the first one and not the one
    // standing for all of them.
    const chosenIn = (drawn: string) =>
      [...drawn.matchAll(/<option value="([^"]*)" selected=""/g)].map((found) => found[1]!);

    // Nobody's is the first option of the three menus, and the other two are still on
    // the option standing for all of theirs.
    expect(nobody).toContain('data-narrowed="owner"');
    expect(chosenIn(nobody)).toEqual(['', '0', '']);
    // And every menu is on that option where nothing is narrowed at all.
    expect(everybody).not.toContain('data-narrowed');
    expect(chosenIn(everybody)).toEqual(['', '', '']);
  });

  it('narrows to the Findings one Check found', () => {
    const drawn = draw(INBOX, only({ kind: 'another-check' }));

    // The identifier a reader groups by. On the real Corpus one kind accounts for most
    // of 125 Findings, and until this existed a hundred rows opening on the same
    // phrase could not be told from a hundred different defects (ADR-0041).
    expect(foundByIn(drawn)).toEqual(['another-check', 'another-check']);
    expect(drawn).toContain('data-narrowed="kind"');
    expect(drawn).not.toContain('one word is written down two different ways');
  });

  it('narrows to the Findings about one Module', () => {
    const drawn = draw(INBOX, only({ module: 'm1' }));

    expect(routesToIn(drawn)).toEqual(['p1']);
    expect(drawn).toContain('data-narrowed="module"');
  });

  it('narrows to the Findings that say a word, however it was typed', () => {
    const drawn = draw(INBOX, only({ says: 'CALLED the same' }));

    // The one filter that needs no list behind it, and the only way to narrow by
    // something no Check and no Module names — the word a defect is about.
    expect(routesToIn(drawn)).toEqual(['']);
    expect(drawn).toContain('two things here are called the same');
    expect(drawn).toContain('data-narrowed="says"');
  });

  it('offers only what the reading offers, and a Check that found nothing among them', () => {
    const drawn = draw(INBOX);

    // Four ways to narrow, every option in them out of the payload (LAW-004).
    for (const of of ['says', 'kind', 'owner', 'module']) {
      expect(drawn).toContain(`data-narrows="${of}"`);
    }
    // A Check that ran and found nothing is still offered. *Nothing here* is a
    // different answer from *never looked for*, and worth being able to ask.
    expect(drawn).toContain('a-check-that-found-nothing');
    // Nothing is narrowed, so nothing says it is.
    expect(drawn).not.toContain('data-narrowed');
    expect(drawn).not.toContain('Showing');
  });

  it('states the whole Corpus’s figure against what was looked for, however it is narrowed', () => {
    const whole = draw(INBOX);
    const mine = draw(INBOX, only({ owner: 'p1' }));

    // Never a bare figure. Four Findings can only ever mean four that these
    // Checks found, so what ran is named beside the number (LAW-006) — and it is
    // the Corpus's figure on every one of these pages, because a narrowed page
    // reporting its own slice as the total is how a queue looks finished.
    for (const drawn of [whole, mine]) {
      expect(words(drawn)).toContain(
        '4 Findings in this Corpus, from the 3 Checks that ran: a-check, another-check, a-check-that-found-nothing.',
      );
    }
    // And the slice said as a slice, never in place of the whole.
    expect(mine).toContain('data-showing');
    expect(mine).toContain('Showing 1 of 4.');
  });

  it('shows the text each Finding cites, in place', () => {
    const drawn = draw(INBOX);

    // The reason the Inbox is worth reading in a browser at all: a place is
    // verifiable evidence for somebody at a terminal and useless to somebody who
    // cannot open it (LAW-009).
    expect(drawn).toContain('the first way it is put');
    expect(drawn).toContain('one.md, line 3');
    expect(drawn.match(/data-quoted=""/g)).toHaveLength(4);
  });

  it('shows both statements of a defect about two, each where it is written', () => {
    const drawn = draw(INBOX);

    // Evidence is not summarised into the one place it fits, and a cut is said
    // rather than left to be noticed (LAW-006, LAW-009).
    expect(drawn).toContain('the second way it is put');
    expect(drawn).toContain('two.md, line 9');
    expect(drawn).toContain('data-cut');
    expect(drawn).toContain('goes on past this');
  });

  it('says nothing is written at a place where nothing is, without making it look broken', () => {
    const drawn = draw(INBOX);

    // A Finding may cite a place precisely because nothing is written at it. Said
    // plainly and not marked: the mark belongs to what a person has to act on,
    // and a Finding whose whole point is an empty place is not a fault in the
    // Finding.
    expect(drawn).toContain('Nothing is written down at that place');
    expect(drawn).toContain('four.md, line 1');
  });

  it('marks a Finding that belongs to no Module, because nothing else in the product shows it', () => {
    const drawn = draw(INBOX);

    // No Module's page can show it — showing it there would make it look
    // answered for — so this page is the only place it appears at all.
    expect(drawn).toContain('belongs to no Module');
    expect(drawn).toContain('nothing could be read out of this at all');
  });

  it('opens a cited place under the Module that writes there, and not the one it routes to', () => {
    const drawn = draw(INBOX);

    // The two disagree as a matter of course: a Finding routes to the Module it
    // is about and cites the place the words are written. An address built out of
    // the Finding's own Module would send a reader to a Module writing nothing
    // there, which the surface that opens a place refuses — correctly.
    expect(drawn).toContain('/corpus/c1/modules/m2/knowledge?in=two.md&amp;line=9');
    expect(drawn).not.toContain('/corpus/c1/modules/m1/knowledge?in=two.md&amp;line=9');
    // And nowhere to follow where nothing is written, rather than a link that
    // would be refused when it was clicked.
    expect(drawn).not.toContain('in=four.md');
    // The Module each Finding routes to is where a reader goes for the rest of it.
    expect(drawn).toContain('/corpus/c1/modules/m1"');
  });

  it('says what was looked for when it found nothing at all', () => {
    const drawn = draw(like({ routesTo: [] }));

    // The empty Inbox is the harder page: "nothing was found" is a claim about a
    // Corpus, and can only ever mean nothing these Checks would have found.
    expect(drawn).toContain('Nothing was found in this Corpus by the 3 Checks that ran');
    expect(drawn).toContain('a-check, another-check');
    expect(routesToIn(drawn)).toEqual([]);
    // Nothing to narrow, so nothing offering to. A toolbar over an empty Corpus is
    // four ways to ask a question that has already been answered.
    expect(drawn).not.toContain('data-narrows');
  });

  it('says so when a narrowing holds nothing, without saying the Corpus is clean', () => {
    const drawn = draw(INBOX, only({ owner: 'p3' }));

    // Somebody's queue emptying is the good outcome, and it is not the same claim
    // as the Corpus being clean — there are four Findings on this page's own
    // reckoning, and they belong to other people.
    expect(routesToIn(drawn)).toEqual([]);
    expect(drawn).toContain('Nothing that these Checks found matches what you have narrowed');
    expect(words(drawn)).toContain('4 Findings in this Corpus');
  });

  it('offers nothing to do to a Finding but read it', () => {
    const drawn = draw(INBOX);

    // A Finding is resolved by the knowledge changing and the Finding no longer
    // being found. Nothing here dismisses, hides, or remembers having seen one,
    // because nothing in this product may hold what a rebuild could not reproduce
    // (LAW-011) — and a control for it is how such a thing arrives.
    //
    // Asserted of the row and not of the page, which is the whole difference: a
    // `select` whose value is in the address remembers nothing about a Finding, and
    // narrowing a queue of a hundred is what makes the surface readable at all
    // (ADR-0041, amending ADR-0039 §2). Inside a row there is still nothing but a
    // disclosure and places to go.
    const rows = rowsIn(drawn);
    expect(rows).toHaveLength(4);
    for (const row of rows) {
      for (const control of ['<button', '<input', '<select', '<textarea']) {
        expect(row).not.toContain(control);
      }
    }
    expect(drawn).not.toContain('type="checkbox"');
    for (const word of ['ismiss', 'nooze', 'cknowledge', 'ark as read', 'esolve']) {
      expect(drawn).not.toContain(word);
    }
  });

  it('remembers how it is narrowed in the address and nowhere else', () => {
    const mine = draw(INBOX, only({ owner: 'p1', kind: 'a-check' }));

    // Which is what keeps a filter from being the control above: the page is drawn
    // from the address, so there is nothing to hold and nothing to invalidate
    // (LAW-011). Two of them at once, because one filter that clears the others
    // would be a page arguing with its own address.
    expect(routesToIn(mine)).toEqual(['p1']);
    expect(mine).toContain('data-narrowed="owner"');
    expect(mine).toContain('data-narrowed="kind"');
    expect(mine).toContain('Showing 1 of 4.');
    // The way back out is stated wherever a filter is on.
    expect(mine).toContain('Everything in this Corpus');
  });

  it('draws no figure a reader could take for a measurement of a queue', () => {
    const drawn = draw(INBOX);

    // How much of my queue I have dealt with has no denominator a rebuild could
    // reproduce, so there is no such reading here — and a count of Findings with
    // a bar beside it is that reading by another name (LAW-006).
    expect(drawn).not.toContain('data-figure');
    expect(drawn).not.toContain('%');
    expect(drawn).not.toMatch(/\bscore\b/i);
    expect(drawn).not.toMatch(/\bprogress\b/i);
  });

  it('says plainly that nothing has been written down, rather than that nothing was found', () => {
    const unread = corpusInboxSchema.parse({
      corpus: { id: 'c1', name: 'C One' },
      reading: { outcome: 'nothing-written-down-yet' },
    });
    const drawn = draw(unread);

    // A Corpus nobody has read drawn as a Corpus nothing was found in tells a
    // reader their knowledge is clean.
    expect(drawn).toContain('Nothing has been written down from this source yet');
    expect(drawn).not.toContain('Nothing was found in this Corpus');
  });

  it('holds no word belonging to any one Corpus', () => {
    const drawn = draw(INBOX);
    const elsewhere = draw(
      like({
        routesTo: [
          {
            owner: 'p9',
            findings: [
              {
                says: 'something else entirely',
                foundBy: 'one-more-check',
                moduleId: 'm9',
                cites: {
                  at: { file: 'nine.md', line: 2 },
                  writtenUnder: 'm9',
                  quoted: { says: 'what is written there', cut: false },
                },
                alsoCites: [],
              },
            ],
          },
        ],
        lookedFor: ['one-more-check'],
      }),
    );

    // The same component draws two Corpus that share not one word, so nothing in
    // it can have been written for either (LAW-004). Every name, every person, every
    // Check and every sentence a Check wrote arrives in the payload — including the
    // options a reader is offered to narrow by, which is the newest way for one
    // Corpus's shape to get written in here.
    for (const word of ['p1', 'm2', 'a-check', 'the first way it is put']) {
      expect(drawn).toContain(word);
    }
    for (const word of ['p1', 'p2', 'm1', 'a-check', 'the first way it is put']) {
      expect(elsewhere).not.toContain(word);
    }
    expect(elsewhere).toContain('p9');
    expect(elsewhere).toContain('m9');
    expect(elsewhere).toContain('one-more-check');
    expect(elsewhere).toContain('something else entirely');
  });
});
