import { describe, expect, it } from 'vitest';
import { fixturePath } from '@vertuo/comply-fixtures';
import { loadCorpus } from '@vertuo/comply-ingestion';
import { loadProfile } from '@vertuo/comply-profile';
import { checkSplitIdentity } from '@vertuo/comply-integrity';

describe('split identity check', () => {
  it('reports one container carrying two module identities', async () => {
    const profile = await loadProfile(fixturePath('profile-a.json'));
    const { corpus } = await loadCorpus(profile);
    const findings = checkSplitIdentity(corpus);

    expect(findings).toHaveLength(1);
    expect(findings[0]!.code).toBe('split-identity');
    expect(findings[0]!.message).toContain('beta');
    expect(findings[0]!.message).toContain('bravo');
    expect(findings[0]!.origin.file).toContain('beta/');
  });

  it('reports nothing for a corpus whose containers are internally consistent', async () => {
    const profile = await loadProfile(fixturePath('profile-b.json'));
    const { corpus } = await loadCorpus(profile);
    expect(checkSplitIdentity(corpus)).toEqual([]);
  });
});
