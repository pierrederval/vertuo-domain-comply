import { describe, expect, it } from 'vitest';
import { fixturePath } from '@vertuo/comply-fixtures';
import { loadCorpus } from '@vertuo/comply-ingestion';
import { loadLens } from '@vertuo/comply-lens';
import { runChecks } from '@vertuo/comply-integrity';

describe('check runner', () => {
  it('finds all four defect kinds planted in fixture A', async () => {
    const lens = await loadLens(fixturePath('lens-a.json'));
    const { corpus } = await loadCorpus(lens);
    const codes = [...new Set(runChecks(corpus, lens).map((f) => f.code))].sort();
    expect(codes).toEqual([
      'broken-reference', 'conflicting-definition', 'missing-owner', 'split-identity',
    ]);
  });

  it('finds nothing in the clean fixture B', async () => {
    const lens = await loadLens(fixturePath('lens-b.json'));
    const { corpus } = await loadCorpus(lens);
    expect(runChecks(corpus, lens)).toEqual([]);
  });
});
