import { describe, expect, it } from 'vitest';
import { fixturePath } from '@vertuo/comply-fixtures';
import { loadCorpus } from '@vertuo/comply-ingestion';
import { loadLens } from '@vertuo/comply-lens';
import { buildMatrix } from '@vertuo/comply-readiness';
import { scoreMatrix } from '@vertuo/comply-readiness';
import { buildCorpus } from '@vertuo/comply-core';
import type { Fact } from '@vertuo/comply-core';
import type { Lens } from '@vertuo/comply-lens';

/** Minimal inline Lens: one Module facet, one Term facet, a three-rung ladder. */
const inlineLens: Lens = {
  id: 'inline-lens',
  adapter: {
    kind: 'markdown-frontmatter',
    root: './inline',
    moduleIdKey: 'area',
    facetKey: 'kind',
    statusKey: 'state',
  },
  facets: [
    { name: 'summary', factKind: 'Module', extractor: 'document', bodyAttribute: 'description',
      criteria: [] },
    { name: 'items', factKind: 'Term', extractor: 'heading', bodyAttribute: 'definition',
      criteria: [{ type: 'requiredAttributes', attributes: ['name', 'definition'] }] },
  ],
  maturity: { levels: ['draft', 'reviewed', 'final'], approvedAtOrAbove: 'final' },
  statusMappings: [],
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
    const lens = await loadLens(fixturePath('lens-a.json'));
    const { corpus } = await loadCorpus(lens);
    const matrix = buildMatrix(corpus, lens);

    expect(matrix.facets).toEqual(['overview', 'terms', 'rules', 'invariants']);
    const alpha = matrix.rows.find((r) => r.moduleId === 'alpha')!;
    expect(alpha.cells.map((c) => c.state)).toEqual([
      'approved',
      'approved',
      'well-formed',
      'present',
    ]);
    expect(alpha.owner).toBe('avery');
  });

  it('grades two Facets of one Fact Kind by what each of them asks for', async () => {
    // Rules and Invariants are both Rules, written the same way and corroborated
    // once by the same status. Enough for the Facet that asks for one Source and
    // not for the one that asks for two, so the same knowledge lands in two
    // different states (ADR-0019). Keyed by Fact Kind this could not happen.
    const lens = await loadLens(fixturePath('lens-a.json'));
    const { corpus } = await loadCorpus(lens);
    const alpha = buildMatrix(corpus, lens).rows.find((r) => r.moduleId === 'alpha')!;

    const rules = alpha.cells.find((c) => c.facet === 'rules')!;
    const invariants = alpha.cells.find((c) => c.facet === 'invariants')!;

    expect(rules.state).toBe('well-formed');
    expect(rules.unmet).toEqual([]);
    expect(invariants.state).toBe('present');
    expect(invariants.unmet).toEqual([{ criterion: 'minSources', has: 1, needs: 2 }]);
  });

  it('marks a facet absent when the module has no facts for it', async () => {
    const lens = await loadLens(fixturePath('lens-a.json'));
    const { corpus } = await loadCorpus(lens);
    const matrix = buildMatrix(corpus, lens);

    const beta = matrix.rows.find((r) => r.moduleId === 'beta')!;
    expect(beta.cells.find((c) => c.facet === 'rules')!.state).toBe('absent');
    expect(beta.owner).toBeNull();
  });

  it('reports each score with its denominator (LAW-006)', async () => {
    const lens = await loadLens(fixturePath('lens-a.json'));
    const { corpus } = await loadCorpus(lens);
    const scores = scoreMatrix(buildMatrix(corpus, lens));

    const alpha = scores.find((s) => s.moduleId === 'alpha')!;
    expect(alpha.total).toBe(4);
    expect(alpha.present).toBe(4);
    expect(alpha.approved).toBe(2);
  });

  it('builds rows for a corpus with no Module facet at all', async () => {
    const lens = await loadLens(fixturePath('lens-b.json'));
    const { corpus } = await loadCorpus(lens);
    const matrix = buildMatrix(corpus, lens);

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
        maturityLevel: 'final', // the lens's approved rung
        sources: ['review'],
      }),
    ];
    const corpus = buildCorpus(facts);
    const matrix = buildMatrix(corpus, inlineLens);

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
    const matrix = buildMatrix(corpus, inlineLens);

    const row = matrix.rows.find((r) => r.moduleId === 'm2')!;
    const cell = row.cells.find((c) => c.facet === 'items')!;

    expect(cell.state).toBe('well-formed');
    expect(cell.state).not.toBe('approved');
  });

  it('says how much of a facet is not yet approved, against how much there is', () => {
    const facts: Fact[] = [
      fact({ id: 'm3', kind: 'Module', moduleId: null, facet: 'summary', attributes: { description: 'ok' } }),
      fact({
        id: 'm3-term-a', kind: 'Term', moduleId: 'm3', facet: 'items',
        attributes: { name: 'A', definition: 'def A' },
        maturityLevel: 'final',
      }),
      fact({
        id: 'm3-term-b', kind: 'Term', moduleId: 'm3', facet: 'items',
        attributes: { name: 'B', definition: 'def B' },
        maturityLevel: 'draft',
      }),
    ];
    const matrix = buildMatrix(buildCorpus(facts), inlineLens);
    const cell = matrix.rows.find((r) => r.moduleId === 'm3')!.cells.find((c) => c.facet === 'items')!;

    // The figure a surface needs to say what work is left, with what it is out
    // of beside it. Computed here, where whether a Fact is approved is decided.
    expect(cell.notYetApproved).toBe(1);
    expect(cell.factCount).toBe(2);
  });

  it('lists each reason a facet fell short once, however many facts fell short that way', () => {
    const facts: Fact[] = [
      fact({ id: 'm4', kind: 'Module', moduleId: null, facet: 'summary', attributes: { description: 'ok' } }),
      fact({ id: 'm4-a', kind: 'Term', moduleId: 'm4', facet: 'items', attributes: { name: 'A' } }),
      fact({ id: 'm4-b', kind: 'Term', moduleId: 'm4', facet: 'items', attributes: { name: 'B' } }),
    ];
    const matrix = buildMatrix(buildCorpus(facts), inlineLens);
    const cell = matrix.rows.find((r) => r.moduleId === 'm4')!.cells.find((c) => c.facet === 'items')!;

    // Two Facts missing the same thing is one job, not two. A reason names what
    // is missing and never which Fact is missing it, so a repeat gives a reader
    // nothing to act on differently.
    expect(cell.unmet).toEqual([{ criterion: 'requiredAttributes', missing: ['definition'] }]);
  });
});
