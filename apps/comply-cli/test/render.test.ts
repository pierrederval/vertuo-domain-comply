import { describe, expect, it } from 'vitest';
import { fixturePath } from '@vertuo/comply-fixtures';
import { renderFindings, renderMatrix } from '../src/render.js';
import { loadCorpus } from '@vertuo/comply-ingestion';
import { loadLens } from '@vertuo/comply-lens';
import type { Lens } from '@vertuo/comply-lens';
import { runChecks } from '@vertuo/comply-integrity';
import { buildMatrix } from '@vertuo/comply-readiness';
import { scoreMatrix } from '@vertuo/comply-readiness';
import { buildCorpus } from '@vertuo/comply-core';
import type { Fact } from '@vertuo/comply-core';

/** Minimal inline Lens: one Module facet, one Term facet, a two-rung ladder. */
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
    { name: 'summary', factKind: 'Module', extractor: 'document', criteria: [], bodyAttribute: 'description' },
    { name: 'items', factKind: 'Term', extractor: 'heading', bodyAttribute: 'definition',
      criteria: [{ type: 'requiredAttributes', attributes: ['name', 'definition'] }] },
  ],
  maturity: { levels: ['draft', 'final'], approvedAtOrAbove: 'final' },
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

describe('rendering', () => {
  it('shows every score against its denominator (LAW-006)', async () => {
    const lens = await loadLens(fixturePath('lens-a.json'));
    const { corpus } = await loadCorpus(lens);
    const matrix = buildMatrix(corpus, lens);
    const out = renderMatrix(matrix, scoreMatrix(matrix), []);

    expect(out).toContain('alpha');
    // Alpha has two of the four Facets its Lens declares approved. Both numbers,
    // always: a bare 2 is the figure LAW-006 refuses.
    expect(out).toMatch(/2\/4/);
    expect(out).toContain('avery');
  });

  it('marks a module with no owner rather than leaving it blank (ADR-0010)', async () => {
    const lens = await loadLens(fixturePath('lens-a.json'));
    const { corpus } = await loadCorpus(lens);
    const matrix = buildMatrix(corpus, lens);
    expect(renderMatrix(matrix, scoreMatrix(matrix), [])).toContain('NO OWNER');
  });

  it('renders a module with no trend baseline as "n/a", never as the "·" used for a genuine zero delta', async () => {
    const lens = await loadLens(fixturePath('lens-a.json'));
    const { corpus } = await loadCorpus(lens);
    const matrix = buildMatrix(corpus, lens);
    const scores = scoreMatrix(matrix);

    // No trend row at all for this run's modules (e.g. a first-ever run).
    const noBaseline = renderMatrix(matrix, scores, []);
    expect(noBaseline).toContain('n/a');
    expect(noBaseline).not.toMatch(/·/);

    // An explicit null delta reads the same way as no trend row.
    const explicitNull = renderMatrix(
      matrix, scores,
      scores.map((s) => ({ moduleId: s.moduleId, approvedDelta: null })),
    );
    expect(explicitNull).toContain('n/a');
    expect(explicitNull).not.toMatch(/·/);

    // A genuine zero delta still reads as "no change".
    const zeroDelta = renderMatrix(
      matrix, scores,
      scores.map((s) => ({ moduleId: s.moduleId, approvedDelta: 0 })),
    );
    expect(zeroDelta).toMatch(/·/);
  });

  it('renders each finding with a file and line a human can open, as a path relative to the corpus root', async () => {
    const lens = await loadLens(fixturePath('lens-a.json'));
    const { corpus } = await loadCorpus(lens);
    const out = renderFindings(runChecks(corpus, lens), lens.adapter.root);
    expect(out).toMatch(/\.md:\d+/);
    expect(out).toContain('split-identity');
    expect(out).toContain('[split-identity] beta/terms.md');
    expect(out).not.toContain('[split-identity] /');
  });

  it('renders each related origin on its own line, relative to the corpus root, with no absolute path anywhere', async () => {
    const lens = await loadLens(fixturePath('lens-a.json'));
    const { corpus } = await loadCorpus(lens);
    const out = renderFindings(runChecks(corpus, lens), lens.adapter.root);

    const conflictLine = out
      .split('\n')
      .findIndex((line) => line.includes('[conflicting-definition]'));
    expect(conflictLine).toBeGreaterThan(-1);
    // The line after the message must carry the other definition's location,
    // relativised exactly like the primary origin.
    const relatedLine = out.split('\n')[conflictLine + 2];
    expect(relatedLine).toContain('beta/terms.md:9');
    expect(relatedLine).not.toContain(lens.adapter.root);

    expect(out).not.toContain(lens.adapter.root);
  });

  it('renders the unmet reasons for a facet that fell short, so the owner is told why (LAW-007)', () => {
    const facts: Fact[] = [
      fact({ id: 'm1', kind: 'Module', moduleId: null, facet: 'summary', attributes: { description: 'ok' } }),
      fact({
        id: 'm1-term',
        kind: 'Term',
        moduleId: 'm1',
        facet: 'items',
        attributes: { name: 'Foo' }, // 'definition' missing -> fails requiredAttributes
      }),
    ];
    const matrix = buildMatrix(buildCorpus(facts), inlineLens);
    const out = renderMatrix(matrix, scoreMatrix(matrix), []);

    expect(out).toContain('Facets not yet approved:');
    expect(out).toContain('m1 / items');
    expect(out).toContain('missing: definition');
    // The criterion's own name is not something a person needs to read, and a
    // reason that carried it would be the shortfall stated in the vocabulary of
    // whatever computed it.
    expect(out).not.toContain('requiredAttributes');
  });

  it('puts every kind of shortfall into words of its own', () => {
    const strict: Lens = {
      ...inlineLens,
      // Every kind of shortfall at once, each asked for by the Facet that would
      // fall short of it (ADR-0019).
      facets: [
        ...inlineLens.facets.map((facet) =>
          facet.name === 'items'
            ? {
                ...facet,
                criteria: [
                  { type: 'requiredAttributes' as const, attributes: ['name', 'definition'] },
                  { type: 'minSources' as const, count: 2 },
                  { type: 'minRelations' as const, relation: 'refines', count: 1 },
                ],
              }
            : facet,
        ),
        {
          name: 'steps', factKind: 'Transition' as const, extractor: 'table' as const,
          criteria: [
            { type: 'allStatesReachable' as const, fromAttribute: 'from', toAttribute: 'to' },
          ],
        },
      ],
    };
    const facts: Fact[] = [
      fact({ id: 'm1', kind: 'Module', moduleId: null, facet: 'summary', attributes: { description: 'ok' } }),
      fact({
        id: 'm1-term', kind: 'Term', moduleId: 'm1', facet: 'items',
        attributes: { name: 'Foo' }, sources: ['one'],
      }),
      fact({
        id: 'm1-step', kind: 'Transition', moduleId: 'm1', facet: 'steps',
        attributes: { from: 'stuck', to: 'stuck' },
      }),
    ];
    const matrix = buildMatrix(buildCorpus(facts), strict);
    const out = renderMatrix(matrix, scoreMatrix(matrix), []);

    expect(out).toContain('missing: definition');
    expect(out).toContain('backed by 1 of the 2 sources this Lens asks for');
    expect(out).toContain('0 of the 1 "refines" links this Lens asks for');
    expect(out).toContain('nothing leads to: stuck');
    // Not one of the four criterion names reaches the terminal.
    for (const kind of ['requiredAttributes', 'minSources', 'minRelations', 'allStatesReachable']) {
      expect(out).not.toContain(kind);
    }
  });

  it('names the maturity shortfall for a well-formed facet that has no unmet content criteria', () => {
    const facts: Fact[] = [
      fact({ id: 'm1', kind: 'Module', moduleId: null, facet: 'summary', attributes: { description: 'ok' } }),
      fact({
        id: 'm1-term',
        kind: 'Term',
        moduleId: 'm1',
        facet: 'items',
        attributes: { name: 'Foo', definition: 'def' },
        maturityLevel: 'draft', // below the approved rung, so well-formed but not approved
      }),
    ];
    const matrix = buildMatrix(buildCorpus(facts), inlineLens);
    const out = renderMatrix(matrix, scoreMatrix(matrix), []);

    expect(out).toContain('m1 / items');
    expect(out).toContain('approved maturity level');
  });

  it('omits the shortfalls section entirely when every cell is absent or approved', () => {
    const facts: Fact[] = [
      fact({
        id: 'm1', kind: 'Module', moduleId: null, facet: 'summary',
        attributes: { description: 'ok' },
        maturityLevel: 'final', // the module's own facet must also be approved, not just well-formed
      }),
      fact({
        id: 'm1-term',
        kind: 'Term',
        moduleId: 'm1',
        facet: 'items',
        attributes: { name: 'Foo', definition: 'def' },
        maturityLevel: 'final', // meets every criterion and the approved rung
      }),
    ];
    const matrix = buildMatrix(buildCorpus(facts), inlineLens);
    const out = renderMatrix(matrix, scoreMatrix(matrix), []);

    expect(out).not.toContain('Facets not yet approved');
  });
});
