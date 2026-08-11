import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { corpusInboxSchema, type CorpusInbox } from '@vertuo/comply-contract';
import { Inbox } from '../src/corpus/Inbox.js';

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
    lookedFor: ['a-check', 'another-check'],
  },
});

/** The same Inbox, with one part of its reading replaced. */
function like(part: Record<string, unknown>): CorpusInbox {
  return corpusInboxSchema.parse({ ...INBOX, reading: { ...INBOX.reading, ...part } });
}

/** Drawn where links work, because every route out of this page is one. */
function draw(inbox: CorpusInbox, narrowedTo: string | null = null): string {
  return renderToStaticMarkup(
    <MemoryRouter>
      <Inbox inbox={inbox} narrowedTo={narrowedTo} />
    </MemoryRouter>,
  );
}

/** Every queue on the page, in the order a reader meets them. */
function queuesIn(drawn: string): string[] {
  return [...drawn.matchAll(/data-queue="[^"]*"/g)].map((found) => found[0]!);
}

describe('a Corpus’s Findings, worked as an Inbox', () => {
  it('puts the Findings reaching nobody above everything else', () => {
    const drawn = draw(INBOX);
    const [first, ...rest] = queuesIn(drawn);

    // The law made into a position on a page. A violation belonging to nobody is
    // how a knowledge base quietly dies, and mixed in among named queues these
    // reproduce exactly the failure LAW-007 exists to prevent — so the order is
    // asserted rather than left to whoever next changes the layout.
    //
    // Nobody's queue is handled by the empty value here for the same reason its
    // address is: every owner field in the agreement refuses an empty name, so it
    // is the one value that can never be somebody's.
    expect(first).toBe('data-queue=""');
    expect(rest).toEqual(['data-queue="p1"', 'data-queue="p2"']);
    expect(drawn).toContain('Routes to nobody');
    expect(drawn).toContain('data-conspicuous');
  });

  it('says what nobody answering for these means, and not only that nobody does', () => {
    const drawn = draw(INBOX);

    // The mark says there is a defect; this says what the defect costs. A reader
    // who does not know why the top of the page is loud reads it as decoration.
    expect(drawn).toContain('2 Findings');
    expect(drawn).toContain('until somebody is named to answer for them');
    // And not *until somebody answers for the Module each belongs to*: one of
    // these belongs to no Module, so for that one there is no Module to name
    // anybody against, and the sentence would be a promise the page cannot keep.
    expect(drawn).not.toContain('answers for the Module');
  });

  it('gives everybody else a queue of their own, and each one a page of its own', () => {
    const drawn = draw(INBOX);

    // Deep-linkable, so a person can bookmark their own queue and be sent it.
    // Nobody's queue is addressed by the one value no name can ever be: every
    // owner field in the agreement refuses an empty name, so an empty one here
    // cannot collide with somebody called after whatever word this reserved.
    expect(drawn).toContain('/corpus/c1/inbox?owner=p1');
    expect(drawn).toContain('/corpus/c1/inbox?owner=p2');
    expect(drawn).toContain('/corpus/c1/inbox?owner="');
  });

  it('shows one person’s queue on its own, with the way back to the rest', () => {
    const drawn = draw(INBOX, 'p1');

    expect(queuesIn(drawn)).toEqual(['data-queue="p1"']);
    expect(drawn).toContain('one word is written down two different ways');
    expect(drawn).not.toContain('this points at something that is not there');
    expect(drawn).toContain('/corpus/c1/inbox"');
  });

  it('says what routes to nobody even on somebody’s own queue', () => {
    const mine = draw(INBOX, 'p1');
    const nobody = draw(INBOX, '');

    // A bookmark is how the loudest thing on the page stops being seen. Somebody
    // reading their own queue is still told what nobody is going to do anything
    // about, with the way to it (LAW-007).
    expect(mine).toContain('2 Findings in this Corpus route to nobody');
    expect(mine).toContain('data-conspicuous');
    // One of a thing is not "1 things", and a denominator a reader trips over is
    // one they discount — which is the whole use this sentence has.
    const alone = draw(
      like({
        routesTo: [
          {
            owner: null,
            findings: [
              {
                says: 'the only one of these',
                moduleId: 'm2',
                cites: { at: { file: 'two.md', line: 4 }, writtenUnder: 'm2', quoted: null },
                alsoCites: [],
              },
            ],
          },
        ],
      }),
      'p1',
    );
    expect(alone).toContain('1 Finding in this Corpus routes to nobody');
    // Not on nobody's own queue, where it would be the page saying twice what the
    // reader is already looking at.
    expect(queuesIn(nobody)).toEqual(['data-queue=""']);
    expect(nobody).not.toContain('in this Corpus route to nobody');
  });

  it('states the whole queue against what was looked for, wherever the reader is', () => {
    const whole = draw(INBOX);
    const mine = draw(INBOX, 'p1');

    // Never a bare figure. Four Findings can only ever mean four that these
    // Checks found, so what ran is named beside the number (LAW-006) — and it is
    // the Corpus's figure on every one of these pages, because a narrowed page
    // reporting its own slice as the total is how a queue looks finished.
    for (const drawn of [whole, mine]) {
      expect(drawn).toContain('4 Findings in this Corpus');
      expect(drawn).toContain('from the 2 Checks that ran: a-check, another-check');
    }
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
    expect(drawn).toContain('Nothing was found in this Corpus by the 2 Checks that ran');
    expect(drawn).toContain('a-check, another-check');
    expect(queuesIn(drawn)).toEqual([]);
  });

  it('says so when a bookmarked queue holds nothing, without saying the Corpus is clean', () => {
    const drawn = draw(INBOX, 'p3');

    // Somebody's queue emptying is the good outcome, and it is not the same claim
    // as the Corpus being clean — there are four Findings on this page's own
    // reckoning, and they belong to other people.
    expect(queuesIn(drawn)).toEqual([]);
    expect(drawn).toContain('Nothing that these Checks found routes to “p3”');
    expect(drawn).toContain('4 Findings in this Corpus');
  });

  it('offers nothing to do to a Finding but read it', () => {
    const drawn = draw(INBOX);

    // A Finding is resolved by the knowledge changing and the Finding no longer
    // being found. Nothing here dismisses, hides, or remembers having seen one,
    // because nothing in this product may hold what a rebuild could not reproduce
    // (LAW-011) — and a control for it is how such a thing arrives.
    expect(drawn).not.toContain('<button');
    expect(drawn).not.toContain('<input');
    expect(drawn).not.toContain('type="checkbox"');
    for (const word of ['ismiss', 'nooze', 'cknowledge', 'ark as read', 'esolve']) {
      expect(drawn).not.toContain(word);
    }
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
    // it can have been written for either (LAW-004). Every name, every person and
    // every sentence a Check wrote arrives in the payload.
    for (const word of ['p1', 'm2', 'a-check', 'the first way it is put']) {
      expect(drawn).toContain(word);
    }
    for (const word of ['p1', 'p2', 'm1', 'a-check', 'the first way it is put']) {
      expect(elsewhere).not.toContain(word);
    }
    expect(elsewhere).toContain('p9');
    expect(elsewhere).toContain('something else entirely');
  });
});
