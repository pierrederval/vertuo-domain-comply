import { describe, expect, it } from 'vitest';
import { fixturePath } from '@vertuo/comply-fixtures';
import { loadCorpus } from '@vertuo/comply-ingestion';
import { loadProfile } from '@vertuo/comply-profile';
import { buildMatrix } from '@vertuo/comply-readiness';
import { scoreMatrix } from '@vertuo/comply-readiness';
import { buildCorpus } from '@vertuo/comply-core';
import type { Fact } from '@vertuo/comply-core';
import type { Profile } from '@vertuo/comply-profile';

/** Minimal inline Profile: one Module facet, one Term facet, a three-rung ladder. */
const inlineProfile: Profile = {
  id: 'inline-profile',
  adapter: {
    kind: 'markdown-frontmatter',
    root: './inline',
    moduleIdKey: 'area',
    facetKey: 'kind',
    statusKey: 'state',
  },
  facets: [
    { name: 'summary', factKind: 'Module', extractor: 'document', bodyAttribute: 'description' },
    { name: 'items', factKind: 'Term', extractor: 'heading', bodyAttribute: 'definition' },
  ],
  maturity: { levels: ['draft', 'reviewed', 'final'], approvedAtOrAbove: 'final' },
  statusMappings: [],
  criteria: {
    Term: [{ type: 'requiredAttributes', attributes: ['name', 'definition'] }],
  },
};

function fact(overrides: Partial<Fact> & Pick<Fact, 'id' | 'kind' | 'moduleId' | 'facet'>): Fact {
  return {
    containerId: 'inline',
    attributes: {},
    relations: [],
    maturityLevel: null,
    sources: [],
    origin: { file: 'inline', line: 1 },
    ...overrides,
  };
}

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

  it('does not reach approved when maturity is approved but a criterion still fails', () => {
    const facts: Fact[] = [
      fact({ id: 'm1', kind: 'Module', moduleId: null, facet: 'summary', attributes: { description: 'ok' } }),
      fact({
        id: 'm1-term',
        kind: 'Term',
        moduleId: 'm1',
        facet: 'items',
        attributes: { name: 'Foo' }, // 'definition' missing -> fails requiredAttributes
        maturityLevel: 'final', // the profile's approved rung
        sources: ['review'],
      }),
    ];
    const corpus = buildCorpus(facts);
    const matrix = buildMatrix(corpus, inlineProfile);

    const row = matrix.rows.find((r) => r.moduleId === 'm1')!;
    const cell = row.cells.find((c) => c.facet === 'items')!;

    expect(cell.state).toBe('present');
    expect(cell.state).not.toBe('approved');
  });

  it('caps a facet with mixed maturity at well-formed, never approved', () => {
    const facts: Fact[] = [
      fact({ id: 'm2', kind: 'Module', moduleId: null, facet: 'summary', attributes: { description: 'ok' } }),
      fact({
        id: 'm2-term-a',
        kind: 'Term',
        moduleId: 'm2',
        facet: 'items',
        attributes: { name: 'A', definition: 'def A' },
        maturityLevel: 'final', // approved rung
        sources: ['review'],
      }),
      fact({
        id: 'm2-term-b',
        kind: 'Term',
        moduleId: 'm2',
        facet: 'items',
        attributes: { name: 'B', definition: 'def B' },
        maturityLevel: 'reviewed', // below the approved rung
        sources: ['review'],
      }),
    ];
    const corpus = buildCorpus(facts);
    const matrix = buildMatrix(corpus, inlineProfile);

    const row = matrix.rows.find((r) => r.moduleId === 'm2')!;
    const cell = row.cells.find((c) => c.facet === 'items')!;

    expect(cell.state).toBe('well-formed');
    expect(cell.state).not.toBe('approved');
  });
});
