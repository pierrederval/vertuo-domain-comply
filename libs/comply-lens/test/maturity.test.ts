import { describe, expect, it } from 'vitest';
import { decomposeStatus, isApproved, sourcesWritten } from '@vertuo/comply-lens';
import type { Lens } from '@vertuo/comply-lens';

const lens = {
  id: 'p',
  adapter: { kind: 'markdown-frontmatter', root: '.', moduleIdKey: 'm', facetKey: 'f', statusKey: 's' },
  facets: [],
  maturity: { levels: ['blank', 'guessed', 'agreed'], approvedAtOrAbove: 'agreed' },
  statusMappings: [
    { match: 'Guess - From System X', maturity: 'guessed', sources: ['system-x'] },
    { match: 'Agreed', maturity: 'agreed', sources: ['review'] },
  ],
} satisfies Lens;

describe('maturity decomposition (ADR-0006)', () => {
  it('splits one composite status into a level and a source set', () => {
    expect(decomposeStatus(lens, 'Guess - From System X')).toEqual({
      maturityLevel: 'guessed',
      sources: ['system-x'],
    });
  });

  it('returns null for an unrecognised status so the caller can raise a Finding', () => {
    expect(decomposeStatus(lens, 'Something Else')).toBeNull();
  });

  it('treats the top of the ladder and above as approved', () => {
    expect(isApproved(lens, 'agreed')).toBe(true);
    expect(isApproved(lens, 'guessed')).toBe(false);
    expect(isApproved(lens, null)).toBe(false);
  });
});

describe('the sources one passage names (ADR-0022)', () => {
  it('reads a list a source wrote as a list as the several sources it is', () => {
    // The passage arrives as one string, because a part maps onto one attribute. A
    // set with one element that is three places glued together is worse than no
    // sources at all: asking for two of them would then be unmeetable by a fact
    // naming five (LAW-005).
    expect(sourcesWritten('- one.php\n- two.php\n- three.php')).toEqual([
      'one.php',
      'two.php',
      'three.php',
    ]);
  });

  it('reads one line as one source, whether or not it is marked as a list', () => {
    expect(sourcesWritten('one.php')).toEqual(['one.php']);
    expect(sourcesWritten('- one.php')).toEqual(['one.php']);
  });

  it('takes each line exactly as written, apart from the mark saying it is a list item', () => {
    // A place a reader is sent to is quoted and never tidied. Half of this corpus
    // writes a bare path and half writes a path with a note narrowing which part of
    // it, and a rule that folded the first half would leave the second untouched —
    // so the set would be half one thing and half another (LAW-009).
    expect(sourcesWritten('- `a/b.php` (the part that decides)')).toEqual([
      '`a/b.php` (the part that decides)',
    ]);
  });

  it('reads several passages as one set, in the order the source writes them', () => {
    // An attribute holds two passages when a source wrote the same part twice
    // (ADR-0026). Both were written down, so both are read.
    expect(sourcesWritten(['- one.php', '- two.php'])).toEqual(['one.php', 'two.php']);
  });

  it('names nothing where nothing is written', () => {
    expect(sourcesWritten(undefined)).toEqual([]);
    expect(sourcesWritten('')).toEqual([]);
    expect(sourcesWritten('-\n-  \n')).toEqual([]);
  });

  it('names one place once, however many times the source writes it', () => {
    expect(sourcesWritten('- one.php\n- one.php')).toEqual(['one.php']);
  });
});
