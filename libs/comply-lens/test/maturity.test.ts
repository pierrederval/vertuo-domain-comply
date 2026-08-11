import { describe, expect, it } from 'vitest';
import { decomposeStatus, isApproved } from '@vertuo/comply-lens';
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
