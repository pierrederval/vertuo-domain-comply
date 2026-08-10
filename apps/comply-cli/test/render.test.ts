import { describe, expect, it } from 'vitest';
import { fixturePath } from '@vertuo/comply-fixtures';
import { renderFindings, renderMatrix } from '../src/render.js';
import { loadCorpus } from '@vertuo/comply-ingestion';
import { loadProfile } from '@vertuo/comply-profile';
import type { Profile } from '@vertuo/comply-profile';
import { runChecks } from '@vertuo/comply-integrity';
import { buildMatrix } from '@vertuo/comply-readiness';
import { scoreMatrix } from '@vertuo/comply-readiness';
import { buildCorpus } from '@vertuo/comply-core';
import type { Fact } from '@vertuo/comply-core';

/** Minimal inline Profile: one Module facet, one Term facet, a two-rung ladder. */
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
  maturity: { levels: ['draft', 'final'], approvedAtOrAbove: 'final' },
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

describe('rendering', () => {
  it('shows every score against its denominator (LAW-006)', async () => {
    const profile = await loadProfile(fixturePath('profile-a.json'));
    const { corpus } = await loadCorpus(profile);
    const matrix = buildMatrix(corpus, profile);
    const out = renderMatrix(matrix, scoreMatrix(matrix), []);

    expect(out).toContain('alpha');
    expect(out).toMatch(/2\/3/);
    expect(out).toContain('avery');
  });

  it('marks a module with no owner rather than leaving it blank (ADR-0010)', async () => {
    const profile = await loadProfile(fixturePath('profile-a.json'));
    const { corpus } = await loadCorpus(profile);
    const matrix = buildMatrix(corpus, profile);
    expect(renderMatrix(matrix, scoreMatrix(matrix), [])).toContain('NO OWNER');
  });

  it('renders a module with no trend baseline as "n/a", never as the "·" used for a genuine zero delta', async () => {
    const profile = await loadProfile(fixturePath('profile-a.json'));
    const { corpus } = await loadCorpus(profile);
    const matrix = buildMatrix(corpus, profile);
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
    const profile = await loadProfile(fixturePath('profile-a.json'));
    const { corpus } = await loadCorpus(profile);
    const out = renderFindings(runChecks(corpus, profile), profile.adapter.root);
    expect(out).toMatch(/\.md:\d+/);
    expect(out).toContain('split-identity');
    expect(out).toContain('[split-identity] beta/terms.md');
    expect(out).not.toContain('[split-identity] /');
  });

  it('renders each related origin on its own line, relative to the corpus root, with no absolute path anywhere', async () => {
    const profile = await loadProfile(fixturePath('profile-a.json'));
    const { corpus } = await loadCorpus(profile);
    const out = renderFindings(runChecks(corpus, profile), profile.adapter.root);

    const conflictLine = out
      .split('\n')
      .findIndex((line) => line.includes('[conflicting-definition]'));
    expect(conflictLine).toBeGreaterThan(-1);
    // The line after the message must carry the other definition's location,
    // relativised exactly like the primary origin.
    const relatedLine = out.split('\n')[conflictLine + 2];
    expect(relatedLine).toContain('beta/terms.md:9');
    expect(relatedLine).not.toContain(profile.adapter.root);

    expect(out).not.toContain(profile.adapter.root);
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
    const matrix = buildMatrix(buildCorpus(facts), inlineProfile);
    const out = renderMatrix(matrix, scoreMatrix(matrix), []);

    expect(out).toContain('Facets not yet approved:');
    expect(out).toContain('m1 / items');
    expect(out).toContain('missing: definition');
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
    const matrix = buildMatrix(buildCorpus(facts), inlineProfile);
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
    const matrix = buildMatrix(buildCorpus(facts), inlineProfile);
    const out = renderMatrix(matrix, scoreMatrix(matrix), []);

    expect(out).not.toContain('Facets not yet approved');
  });
});
