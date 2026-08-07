import { describe, expect, it } from 'vitest';
import { fixturePath } from '@vertuo/comply-fixtures';
import { loadCorpus } from '@vertuo/comply-ingestion';
import { loadProfile } from '@vertuo/comply-profile';

describe('markdown adapter', () => {
  it('imports every facet into typed Facts with origins', async () => {
    const profile = await loadProfile(fixturePath('profile-a.json'));
    const { corpus } = await loadCorpus(profile);

    // moduleIds() lists Module facts only. 'bravo' is declared by a Term document,
    // so it does not appear here — Task 10's allModuleIds() is what surfaces it.
    expect(corpus.moduleIds().sort()).toEqual(['alpha', 'beta']);
    expect(corpus.byKind('Term').map((f) => f.attributes.name).sort())
      .toEqual(['Cog', 'Sprocket', 'Widget', 'Widget']);
    expect(corpus.facts.every((f) => f.origin.line > 0)).toBe(true);
  });

  it('decomposes the corpus status into a level and sources (ADR-0006)', async () => {
    const profile = await loadProfile(fixturePath('profile-a.json'));
    const { corpus } = await loadCorpus(profile);

    const agreed = corpus.facts.find((f) => f.origin.file.includes('alpha/terms.md'));
    expect(agreed?.maturityLevel).toBe('agreed');
    expect(agreed?.sources).toEqual(['system-x', 'review']);

    const guessed = corpus.facts.find((f) => f.origin.file.includes('alpha/rules.md'));
    expect(guessed?.maturityLevel).toBe('guessed');
    expect(guessed?.sources).toEqual(['system-x']);
  });

  it('reports an unrecognised status as a Finding rather than swallowing it', async () => {
    const profile = await loadProfile(fixturePath('profile-a.json'));
    const mangled = {
      ...profile,
      statusMappings: profile.statusMappings.filter((m) => m.match === 'Agreed'),
    };
    const { findings } = await loadCorpus(mangled);
    const unknown = findings.filter((f) => f.code === 'unknown-status');
    expect(unknown.length).toBeGreaterThan(0);
    expect(unknown[0]!.message).toContain('Guess - From System X');
    expect(unknown[0]!.origin.file).toMatch(/\.md$/);
  });
});
