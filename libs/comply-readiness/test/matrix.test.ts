import { describe, expect, it } from 'vitest';
import { fixturePath } from '@vertuo/comply-fixtures';
import { loadCorpus } from '@vertuo/comply-ingestion';
import { loadProfile } from '@vertuo/comply-profile';
import { buildMatrix } from '@vertuo/comply-readiness';
import { scoreMatrix } from '@vertuo/comply-readiness';

describe('Readiness Matrix', () => {
  it('grades every module against every declared facet', async () => {
    const profile = await loadProfile(fixturePath('profile-a.json'));
    const { corpus } = await loadCorpus(profile);
    const matrix = buildMatrix(corpus, profile);

    expect(matrix.facets).toEqual(['overview', 'terms', 'rules']);
    const alpha = matrix.rows.find((r) => r.moduleId === 'alpha')!;
    expect(alpha.cells.map((c) => c.state)).toEqual(['approved', 'approved', 'well-formed']);
    expect(alpha.owner).toBe('avery');
  });

  it('marks a facet absent when the module has no facts for it', async () => {
    const profile = await loadProfile(fixturePath('profile-a.json'));
    const { corpus } = await loadCorpus(profile);
    const matrix = buildMatrix(corpus, profile);

    const beta = matrix.rows.find((r) => r.moduleId === 'beta')!;
    expect(beta.cells.find((c) => c.facet === 'rules')!.state).toBe('absent');
    expect(beta.owner).toBeNull();
  });

  it('reports each score with its denominator (LAW-006)', async () => {
    const profile = await loadProfile(fixturePath('profile-a.json'));
    const { corpus } = await loadCorpus(profile);
    const scores = scoreMatrix(buildMatrix(corpus, profile));

    const alpha = scores.find((s) => s.moduleId === 'alpha')!;
    expect(alpha.total).toBe(3);
    expect(alpha.present).toBe(3);
    expect(alpha.approved).toBe(2);
  });

  it('builds rows for a corpus with no Module facet at all', async () => {
    const profile = await loadProfile(fixturePath('profile-b.json'));
    const { corpus } = await loadCorpus(profile);
    const matrix = buildMatrix(corpus, profile);

    expect(matrix.rows.map((r) => r.moduleId)).toEqual(['one', 'two']);
    expect(matrix.rows[1]!.cells.find((c) => c.facet === 'constraints')!.state).toBe('absent');
  });
});
