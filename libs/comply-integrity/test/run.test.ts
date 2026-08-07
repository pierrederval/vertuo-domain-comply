import { describe, expect, it } from 'vitest';
import { fixturePath } from '@vertuo/comply-fixtures';
import { loadCorpus } from '@vertuo/comply-ingestion';
import { loadProfile } from '@vertuo/comply-profile';
import { runChecks } from '@vertuo/comply-integrity';

describe('check runner', () => {
  it('finds all four defect kinds planted in fixture A', async () => {
    const profile = await loadProfile(fixturePath('profile-a.json'));
    const { corpus } = await loadCorpus(profile);
    const codes = [...new Set(runChecks(corpus, profile).map((f) => f.code))].sort();
    expect(codes).toEqual([
      'broken-reference', 'conflicting-definition', 'missing-owner', 'split-identity',
    ]);
  });

  it('finds nothing in the clean fixture B', async () => {
    const profile = await loadProfile(fixturePath('profile-b.json'));
    const { corpus } = await loadCorpus(profile);
    expect(runChecks(corpus, profile)).toEqual([]);
  });
});
