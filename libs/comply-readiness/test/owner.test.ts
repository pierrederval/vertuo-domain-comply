import { describe, expect, it } from 'vitest';
import { fixturePath } from '@vertuo/comply-fixtures';
import { loadCorpus } from '@vertuo/comply-ingestion';
import { loadLens } from '@vertuo/comply-lens';
import { resolveOwners } from '@vertuo/comply-readiness';

describe('Module Owner resolution (ADR-0010)', () => {
  it('reads an owner from the document when the adapter declares a key', async () => {
    const lens = await loadLens(fixturePath('lens-a.json'));
    const { corpus } = await loadCorpus(lens);
    const { owners } = resolveOwners(corpus, lens);
    expect(owners.get('alpha')).toBe('avery');
  });

  it('raises a Finding for a module with no resolvable owner', async () => {
    const lens = await loadLens(fixturePath('lens-a.json'));
    const { corpus } = await loadCorpus(lens);
    const { findings } = resolveOwners(corpus, lens);
    const missing = findings.filter((f) => f.code === 'missing-owner').map((f) => f.moduleId);
    expect(missing).toContain('beta');
  });

  it('falls back to the lens owner map when the corpus carries none', async () => {
    const lens = await loadLens(fixturePath('lens-b.json'));
    const { corpus } = await loadCorpus(lens);
    const { owners, findings } = resolveOwners(corpus, lens);
    expect(owners.get('one')).toBe('quinn');
    expect(findings.filter((f) => f.code === 'missing-owner')).toEqual([]);
  });
});
