import { describe, expect, it } from 'vitest';
import { fixturePath } from '@vertuo/comply-fixtures';
import { loadCorpus } from '@vertuo/comply-ingestion';
import { loadProfile } from '@vertuo/comply-profile';
import { checkConflictingDefinition } from '@vertuo/comply-integrity';
import { buildTermRegistry } from '@vertuo/comply-integrity';

describe('conflicting definition check', () => {
  it('collects every Term across the corpus', async () => {
    const profile = await loadProfile(fixturePath('profile-a.json'));
    const { corpus } = await loadCorpus(profile);
    expect(buildTermRegistry(corpus, profile).map((t) => t.canonical).sort())
      .toEqual(['Cog', 'Sprocket', 'Widget', 'Widget']);
  });

  it('reports one Term defined two different ways, citing both places', async () => {
    const profile = await loadProfile(fixturePath('profile-a.json'));
    const { corpus } = await loadCorpus(profile);
    const findings = checkConflictingDefinition(corpus, profile);

    expect(findings).toHaveLength(1);
    expect(findings[0]!.code).toBe('conflicting-definition');
    expect(findings[0]!.message).toContain('Widget');
    expect(findings[0]!.message).toContain('beta/terms.md');
    expect(findings[0]!.origin.file).toContain('alpha/terms.md');
  });

  it('reports nothing when every Term is defined once', async () => {
    const profile = await loadProfile(fixturePath('profile-b.json'));
    const { corpus } = await loadCorpus(profile);
    expect(checkConflictingDefinition(corpus, profile)).toEqual([]);
  });
});
