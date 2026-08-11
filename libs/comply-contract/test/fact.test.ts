import { describe, expect, it } from 'vitest';
import { corpusFactSchema } from '../src/index.js';

/**
 * One piece of knowledge as the server would answer for it: written in three
 * parts, one of them two passages that are not next to each other in the source,
 * corroborated by two places, at a rung of its Corpus's ladder, and quoted from
 * the text it was read out of.
 *
 * Deliberately shapeless names. Anything here that read like a real Facet, a real
 * rung or a real attribute would be one Corpus's shape written into the agreement
 * both sides work from (LAW-004).
 */
const FACT = {
  corpus: { id: 'c1', name: 'C One' },
  reading: {
    outcome: 'read',
    sourceReadAt: '2026-01-01T00:00:00.000Z',
    lensId: 'c1',
    ladder: { levels: ['low', 'high'], approvedAtOrAbove: 'high' },
    at: { file: 'one/two.md', line: 12 },
    moduleId: 'm1',
    facet: 'f1',
    label: 'F One',
    maturity: 'low',
    sources: ['p1', 'p2'],
    written: [
      { named: 'a1', says: ['the first thing'] },
      { named: 'a2', says: ['one passage', 'another, written elsewhere'] },
      { named: 'a3', says: ['the third thing'] },
    ],
    quoted: { says: '## the first thing\n\nand what follows it', cut: false },
  },
};

/** The read reading, with one part of it replaced. */
function reading(part: Record<string, unknown>): unknown {
  return { ...FACT, reading: { ...FACT.reading, ...part } };
}

describe('one piece of knowledge, whole', () => {
  it('accepts one as the server would answer for it', () => {
    expect(corpusFactSchema.safeParse(FACT).success).toBe(true);
  });

  it('keeps how far along it is and what backs it up as two fields, with nothing standing for both', () => {
    const parsed = corpusFactSchema.parse(reading({ backing: 'low, from p1 and p2', score: 2 }));
    if (parsed.reading.outcome !== 'read') throw new Error('the source was written down');

    // A rung and a set of places are two readings of one piece of knowledge, and
    // fusing them is what made coverage uncomputable in the first place
    // (LAW-005). Nothing derived from the pair can travel, because there is no
    // such field for a server to put one in.
    expect(Object.keys(parsed.reading).sort()).toEqual([
      'at',
      'facet',
      'label',
      'ladder',
      'lensId',
      'maturity',
      'moduleId',
      'outcome',
      'quoted',
      'sourceReadAt',
      'sources',
      'written',
    ]);
  });

  it('refuses a rung that is not on this Corpus’s ladder', () => {
    // The page draws the rung beside the ladder so a reader can see where on it
    // this sits (LAW-009). A rung the ladder does not have would be drawn against
    // a ladder with no place for it, which is a page confidently wrong rather
    // than visibly broken.
    expect(corpusFactSchema.safeParse(reading({ maturity: 'middling' })).success).toBe(false);
  });

  it('accepts knowledge its Corpus graded at nothing', () => {
    // Sent as nothing, so a surface says that in its own words rather than
    // showing an empty space (LAW-010).
    expect(corpusFactSchema.safeParse(reading({ maturity: null })).success).toBe(true);
  });

  it('accepts knowledge nothing says the provenance of, and refuses an unopenable place', () => {
    expect(corpusFactSchema.safeParse(reading({ sources: [] })).success).toBe(true);
    // A place named as nothing is not somewhere a reader can be sent.
    expect(corpusFactSchema.safeParse(reading({ sources: ['p1', ''] })).success).toBe(false);
  });

  it('carries two passages as two, and refuses a part that says nothing', () => {
    const parsed = corpusFactSchema.parse(FACT);
    if (parsed.reading.outcome !== 'read') throw new Error('the source was written down');

    // Two passages that are not next to each other in the source, handed to a
    // reader as continuous prose, are not what the source says (ADR-0017,
    // ADR-0026). There is no shape here that could carry them joined.
    expect(parsed.reading.written[1]!.says).toHaveLength(2);
    expect(corpusFactSchema.safeParse(reading({ written: [{ named: 'a1', says: [] }] })).success)
      .toBe(false);
    expect(corpusFactSchema.safeParse(reading({ written: [{ named: 'a1', says: [''] }] })).success)
      .toBe(false);
  });

  it('refuses one part named twice', () => {
    // Drawn as written, it would be one name with two sets of passages under it,
    // and a reader has no way to tell which of them the reading is made of.
    const twice = reading({
      written: [
        { named: 'a1', says: ['the first thing'] },
        { named: 'a1', says: ['something else'] },
      ],
    });

    expect(corpusFactSchema.safeParse(twice).success).toBe(false);
  });

  it('says nothing was quoted rather than sending evidence that quotes nothing', () => {
    // A reader shown an empty quotation has been shown a claim they cannot check
    // and told nothing about why (LAW-009). Nothing is sent as nothing, and the
    // surface says it.
    expect(corpusFactSchema.safeParse(reading({ quoted: null })).success).toBe(true);
    expect(corpusFactSchema.safeParse(reading({ quoted: { says: '', cut: false } })).success).toBe(
      false,
    );
  });

  it('carries a quotation that stops short of what the source says', () => {
    const parsed = corpusFactSchema.parse(
      reading({ quoted: { says: 'as far as this', cut: true } }),
    );
    if (parsed.reading.outcome !== 'read') throw new Error('the source was written down');

    // Always sent, so a surface never has to tell a quotation that is whole from
    // one it has no opinion about. A cut with a pointer is honest about being
    // partial in a way a summary is not (LAW-006, LAW-009).
    expect(parsed.reading.quoted).toEqual({ says: 'as far as this', cut: true });
  });

  it('refuses a place nobody could open', () => {
    // A line counted from zero is nowhere in any editor.
    expect(corpusFactSchema.safeParse(reading({ at: { file: 'one/two.md', line: 0 } })).success)
      .toBe(false);
  });

  it('says nothing has been written down from this source rather than sending an empty piece', () => {
    const unread = {
      corpus: { id: 'c1', name: 'C One' },
      reading: { outcome: 'nothing-written-down-yet' },
    };

    expect(corpusFactSchema.safeParse(unread).success).toBe(true);
  });
});
