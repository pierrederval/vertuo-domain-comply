import { describe, expect, it } from 'vitest';
import type { Fact } from '@vertuo/comply-core';
import { evaluateFacet, evaluateFact } from '@vertuo/comply-readiness';
import type { Lens } from '@vertuo/comply-lens';

const base: Lens = {
  id: 'p',
  adapter: { kind: 'markdown-frontmatter', root: '.', moduleIdKey: 'm', facetKey: 'f', statusKey: 's' },
  facets: [],
  maturity: { levels: ['a'], approvedAtOrAbove: 'a' },
  statusMappings: [],
  criteria: {
    Rule: [
      { type: 'requiredAttributes', attributes: ['name', 'statement'] },
      { type: 'minSources', count: 1 },
    ],
    Transition: [{ type: 'allStatesReachable', fromAttribute: 'from', toAttribute: 'to' }],
  },
};

function fact(over: Partial<Fact>): Fact {
  return {
    id: 'f', kind: 'Rule', moduleId: 'm', facet: 'x', containerId: 'c',
    attributes: {}, relations: [], maturityLevel: null, sources: [],
    origin: { file: 'a.md', line: 1 }, ...over,
  };
}

describe('well-formedness engine', () => {
  it('passes a fact meeting every criterion', () => {
    expect(evaluateFact(fact({ attributes: { name: 'n', statement: 's' }, sources: ['x'] }), base))
      .toEqual([]);
  });

  it('names each missing attribute', () => {
    const unmet = evaluateFact(fact({ attributes: { name: 'n' }, sources: ['x'] }), base);
    expect(unmet).toHaveLength(1);
    expect(unmet[0]!.detail).toContain('statement');
  });

  it('reports too few sources', () => {
    const unmet = evaluateFact(fact({ attributes: { name: 'n', statement: 's' } }), base);
    expect(unmet.map((u) => u.criterion)).toEqual(['minSources']);
  });

  it('applies no criteria to a Fact Kind the lens does not constrain', () => {
    expect(evaluateFact(fact({ kind: 'Term', attributes: {} }), base)).toEqual([]);
  });

  it('flags an unreachable state across a facet', () => {
    const facts = [
      fact({ id: 't1', kind: 'Transition', attributes: { from: 'draft', to: 'sent' } }),
      fact({ id: 't2', kind: 'Transition', attributes: { from: 'lost', to: 'lost' } }),
    ];
    const unmet = evaluateFacet(facts, 'Transition', base);
    expect(unmet).toHaveLength(1);
    expect(unmet[0]!.detail).toContain('lost');
  });

  it('accepts a fully reachable transition graph', () => {
    const facts = [
      fact({ id: 't1', kind: 'Transition', attributes: { from: 'draft', to: 'sent' } }),
      fact({ id: 't2', kind: 'Transition', attributes: { from: 'sent', to: 'done' } }),
    ];
    expect(evaluateFacet(facts, 'Transition', base)).toEqual([]);
  });
});
