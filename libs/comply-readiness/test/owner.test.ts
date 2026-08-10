import { describe, expect, it } from 'vitest';
import { fixturePath } from '@vertuo/comply-fixtures';
import { loadCorpus } from '@vertuo/comply-ingestion';
import { loadProfile } from '@vertuo/comply-profile';
import { resolveOwners } from '@vertuo/comply-readiness';

describe('Module Owner resolution (ADR-0010)', () => {
  it('reads an owner from the document when the adapter declares a key', async () => {
    const profile = await loadProfile(fixturePath('profile-a.json'));
    const { corpus } = await loadCorpus(profile);
    const { owners } = resolveOwners(corpus, profile);
    expect(owners.get('alpha')).toBe('avery');
  });

  it('raises a Finding for a module with no resolvable owner', async () => {
    const profile = await loadProfile(fixturePath('profile-a.json'));
    const { corpus } = await loadCorpus(profile);
    const { findings } = resolveOwners(corpus, profile);
    const missing = findings.filter((f) => f.code === 'missing-owner').map((f) => f.moduleId);
    expect(missing).toContain('beta');
  });

  it('falls back to the profile owner map when the corpus carries none', async () => {
    const profile = await loadProfile(fixturePath('profile-b.json'));
    const { corpus } = await loadCorpus(profile);
    const { owners, findings } = resolveOwners(corpus, profile);
    expect(owners.get('one')).toBe('quinn');
    expect(findings.filter((f) => f.code === 'missing-owner')).toEqual([]);
  });
});
