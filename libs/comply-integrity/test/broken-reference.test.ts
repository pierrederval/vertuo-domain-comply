import { describe, expect, it } from 'vitest';
import { fixturePath } from '@vertuo/comply-fixtures';
import { loadCorpus } from '@vertuo/comply-ingestion';
import { loadProfile } from '@vertuo/comply-profile';
import { checkBrokenReference } from '@vertuo/comply-integrity';

describe('broken reference check', () => {
  it('reports a reference whose target exists nowhere in the corpus', async () => {
    const profile = await loadProfile(fixturePath('profile-a.json'));
    const { corpus } = await loadCorpus(profile);
    const findings = checkBrokenReference(corpus);

    expect(findings).toHaveLength(1);
    expect(findings[0]!.code).toBe('broken-reference');
    expect(findings[0]!.message).toContain('r-9-missing');
    expect(findings[0]!.origin.file).toContain('beta/terms.md');
  });

  it('accepts a reference resolving to another fact by slug', async () => {
    const profile = await loadProfile(fixturePath('profile-a.json'));
    const { corpus } = await loadCorpus(profile);
    const resolved = corpus.facts
      .flatMap((f) => f.relations)
      .filter((r) => r.targetRef === 'r-2-sprockets-turn');
    expect(resolved).toHaveLength(1);
    expect(checkBrokenReference(corpus).map((f) => f.message).join())
      .not.toContain('r-2-sprockets-turn');
  });
});
