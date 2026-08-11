import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { corpusFactSchema, type CorpusFact } from '@vertuo/comply-contract';
import { FactDetail } from '../src/corpus/FactDetail.js';

/**
 * One piece of knowledge as the server would answer for it: written in two parts,
 * one of them two passages the source wrote apart from each other, corroborated by
 * three places, part-way up its Corpus's ladder, and quoted from the text it was
 * read out of.
 *
 * Deliberately shapeless names. Anything here that read like a real Facet, a real
 * rung or a real attribute would be one Corpus's shape written into the component
 * that has to draw every Corpus (LAW-004).
 */
const HELD: CorpusFact = corpusFactSchema.parse({
  corpus: { id: 'c1', name: 'C One' },
  reading: {
    outcome: 'read',
    sourceReadAt: '2026-01-01T08:00:00.000Z',
    lensId: 'c1',
    ladder: { levels: ['low', 'middling', 'high'], approvedAtOrAbove: 'high' },
    at: { file: 'one/two.md', line: 12 },
    moduleId: 'm1',
    facet: 'f1',
    label: 'F One',
    maturity: 'middling',
    sources: ['p1', 'p2 (the part that decides)', 'p3'],
    written: [
      { named: 'a1', says: ['the first thing'] },
      { named: 'a2', says: ['one passage', 'another, written far below it'] },
    ],
    quoted: { says: '## the first thing\n\nand the line under it', cut: false },
  },
});

/** The same piece of knowledge, with one part of its reading replaced. */
function like(part: Record<string, unknown>): CorpusFact {
  return corpusFactSchema.parse({ ...HELD, reading: { ...HELD.reading, ...part } });
}

/** Drawn where links work, because the way back to its Module is one. */
function draw(held: CorpusFact): string {
  return renderToStaticMarkup(
    <MemoryRouter>
      <FactDetail held={held} />
    </MemoryRouter>,
  );
}

/** How many times a handle appears in what was drawn. */
function handles(drawn: string, handle: string): number {
  return drawn.split(`data-${handle}=""`).length - 1;
}

describe('one piece of knowledge, drilled into', () => {
  it('shows what it says, how far along it is, what backs it up, where it is, and the text it came from', () => {
    const drawn = draw(HELD);

    // All five, on one screen. Four of them are claims and the fifth is what
    // makes them checkable where they are made (LAW-009).
    expect(drawn).toContain('a1');
    expect(drawn).toContain('the first thing');
    expect(drawn).toContain('data-rung="middling"');
    expect(drawn).toContain('p2 (the part that decides)');
    expect(drawn).toContain('one/two.md, line 12');
    expect(drawn).toContain('and the line under it');
  });

  it('draws how far along it is apart from what backs it up, and neither as the other', () => {
    const drawn = draw(HELD);

    // Two readings of one piece of knowledge, never one thing (LAW-005). Nothing
    // carries both, and the set is drawn as the places it is rather than as a
    // count of them — there is no figure on this surface at all, because a count
    // of Sources has nothing to be counted against (LAW-006).
    expect(handles(drawn, 'corroboration')).toBe(1);
    expect(drawn).toContain('data-rung="middling"');
    expect(drawn).not.toMatch(/data-rung[^>]*data-source/);
    expect(drawn).not.toMatch(/data-source[^>]*data-rung/);
    expect(drawn).not.toContain('data-figure');
    expect(drawn).not.toContain('%');
    expect(drawn).not.toMatch(/\bscore\b/i);
    expect(drawn).not.toMatch(/\bgrade\b/i);
  });

  it('tells knowledge several places attest from the same knowledge attested by one', () => {
    const several = draw(HELD);
    const alone = draw(like({ sources: ['p1'] }));

    // The difference a reader sees is the set itself, so the places are what is
    // drawn and there is nothing to read but them.
    expect(handles(several, 'source')).toBe(3);
    expect(handles(alone, 'source')).toBe(1);
    expect(alone).not.toContain('p3');
  });

  it('says nothing says where it came from, rather than drawing an empty list', () => {
    const drawn = draw(like({ sources: [] }));

    // Nothing at all backs this up, which is something a reader has to act on and
    // not a blank space (LAW-006, LAW-010).
    expect(handles(drawn, 'source')).toBe(0);
    expect(drawn).toContain('Nothing here says where this came from');
    expect(drawn).toContain('data-conspicuous');
  });

  it('quotes the source text as written, and draws two passages as two', () => {
    const drawn = draw(HELD);

    // Word for word, line break for line break: a reader shown altered evidence
    // has been told a second-hand version of the knowledge (LAW-009, ADR-0017).
    expect(drawn).toContain('## the first thing\n\nand the line under it');
    // Two passages the source wrote apart from each other, drawn apart. Handed to
    // a reader as continuous prose they would not be what the source says.
    expect(handles(drawn, 'passage')).toBe(3);
    expect(drawn).not.toContain('one passageanother');
    expect(drawn).not.toContain('one passage another');
    expect(drawn).toContain('data-apart');
  });

  it('says where the source text was cut, and where the rest of it is', () => {
    const whole = draw(HELD);
    const cut = draw(like({ quoted: { says: 'as far as this', cut: true } }));

    // A cut with a pointer is honest about being partial in a way a summary is
    // not — and a cut left unsaid reads as the whole of what the source says.
    expect(cut).toContain('data-cut');
    expect(cut).toContain('goes on past this');
    expect(cut).toContain('one/two.md, line 12');
    expect(whole).not.toContain('data-cut');
  });

  it('says the source text did not come with it, rather than showing an empty quotation', () => {
    const drawn = draw(like({ quoted: null }));

    expect(drawn).toContain('did not come with this');
    expect(drawn).toContain('data-conspicuous');
  });

  it('says where on its Corpus’s ladder the rung it is at sits, beside the rung', () => {
    const drawn = draw(HELD);

    // A rung is one word until a reader is told what the steps are and which of
    // them is enough. Said beside it, that is something they can check where it is
    // drawn; said in a footnote, it is the same sentence twice.
    expect(drawn).toContain('This Corpus grades from low → middling → high');
    expect(drawn).toContain('counts “high” and above as approved');
    expect(drawn.split('low → middling → high').length - 1).toBe(1);
  });

  it('says the Corpus does not grade it, rather than leaving an empty space', () => {
    const drawn = draw(like({ maturity: null }));

    // Not a blank, and not the word the code has for nothing (LAW-010).
    expect(drawn).toContain('this Corpus does not say how far along it is');
    expect(drawn).not.toContain('data-rung="');
  });

  it('draws a rung whose name is a number without it reading as a count', () => {
    const drawn = draw(
      corpusFactSchema.parse({
        corpus: { id: 'c2', name: 'C Two' },
        reading: {
          ...HELD.reading,
          ladder: { levels: ['0', '1', '2'], approvedAtOrAbove: '2' },
          maturity: '0',
          sources: [],
          label: 'G One',
          written: [{ named: 'b1', says: ['what it says here'] }],
          quoted: { says: '## what it says here', cut: false },
        },
      }),
    );

    // Two zeros about one piece of knowledge, and only one of them is a count.
    // The rung is the name its Corpus gave a step, so it is drawn as a name and in
    // the quotation marks that say a Corpus chose the word — “At 0 of 0 → 1 → 2”
    // reads as a measurement of something. That nothing backs this up is drawn as
    // the absence it is, and never as a nought.
    expect(drawn).toContain('data-rung="0"');
    expect(drawn).toContain('At <span data-rung="0" class="font-semibold">“0”</span>.');
    expect(drawn).toContain('This Corpus grades from 0 → 1 → 2');
    expect(drawn).toContain('Nothing here says where this came from');
    expect(handles(drawn, 'source')).toBe(0);
    expect(drawn).not.toContain('data-figure');
  });

  it('sends a reader back to the Module the knowledge belongs to', () => {
    const drawn = draw(HELD);

    // Drilled into from a Module, so there is a way back to the rest of it. The
    // shell says which Corpus and which Module a reader is in; this is the one
    // link out of here that goes anywhere.
    expect(drawn).toContain('/corpus/c1/modules/m1');
    expect(drawn).toContain('F One');
    expect(drawn).toContain('m1');
  });

  it('says plainly that nothing has been written down, rather than that the place is empty', () => {
    const drawn = draw(
      corpusFactSchema.parse({
        corpus: { id: 'c1', name: 'C One' },
        reading: { outcome: 'nothing-written-down-yet' },
      }),
    );

    expect(drawn).toContain('Nothing has been written down from this source yet');
    expect(drawn).not.toContain('data-rung');
  });

  it('holds no word belonging to any one Corpus', () => {
    const drawn = draw(HELD);
    const elsewhere = draw(
      corpusFactSchema.parse({
        corpus: { id: 'c2', name: 'C Two' },
        reading: {
          ...HELD.reading,
          ladder: { levels: ['x', 'y'], approvedAtOrAbove: 'y' },
          maturity: 'x',
          label: 'G One',
          facet: 'g1',
          moduleId: 'm2',
          sources: ['q1'],
          written: [{ named: 'b1', says: ['something else entirely'] }],
          quoted: { says: '## something else entirely', cut: false },
        },
      }),
    );

    // The same component draws two Corpus that share not one word, so nothing in
    // it can have been written for either (LAW-004).
    for (const word of ['a1', 'a2', 'middling', 'p1', 'F One']) expect(drawn).toContain(word);
    for (const word of ['a1', 'a2', 'middling', 'p1', 'F One', 'low → middling']) {
      expect(elsewhere).not.toContain(word);
    }
    expect(elsewhere).toContain('b1');
    expect(elsewhere).toContain('x → y');
  });
});
