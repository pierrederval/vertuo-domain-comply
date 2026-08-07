import { describe, expect, it } from 'vitest';
import { decomposeStatus, isApproved } from '@vertuo/comply-profile';
import type { Profile } from '@vertuo/comply-profile';

const profile = {
  id: 'p',
  adapter: { kind: 'markdown-frontmatter', root: '.', moduleIdKey: 'm', facetKey: 'f', statusKey: 's' },
  facets: [],
  maturity: { levels: ['blank', 'guessed', 'agreed'], approvedAtOrAbove: 'agreed' },
  statusMappings: [
    { match: 'Guess - From System X', maturity: 'guessed', sources: ['system-x'] },
    { match: 'Agreed', maturity: 'agreed', sources: ['review'] },
  ],
  criteria: {},
} satisfies Profile;

describe('maturity decomposition (ADR-0006)', () => {
  it('splits one composite status into a level and a source set', () => {
    expect(decomposeStatus(profile, 'Guess - From System X')).toEqual({
      maturityLevel: 'guessed',
      sources: ['system-x'],
    });
  });

  it('returns null for an unrecognised status so the caller can raise a Finding', () => {
    expect(decomposeStatus(profile, 'Something Else')).toBeNull();
  });

  it('treats the top of the ladder and above as approved', () => {
    expect(isApproved(profile, 'agreed')).toBe(true);
    expect(isApproved(profile, 'guessed')).toBe(false);
    expect(isApproved(profile, null)).toBe(false);
  });
});
