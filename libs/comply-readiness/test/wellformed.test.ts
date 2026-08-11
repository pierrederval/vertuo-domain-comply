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
    // The parts of the reason, not a sentence about it: which attributes are
    // missing is what a surface needs to write its own words about them.
    expect(unmet).toEqual([{ criterion: 'requiredAttributes', missing: ['statement'] }]);
  });

  it('reports too few sources against how many are asked for', () => {
    const unmet = evaluateFact(fact({ attributes: { name: 'n', statement: 's' } }), base);
    // Both numbers, because a shortfall is stated against what was asked for
    // (LAW-006), and because no surface can phrase it from one of them.
    expect(unmet).toEqual([{ criterion: 'minSources', has: 0, needs: 1 }]);
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
    expect(unmet).toEqual([{ criterion: 'allStatesReachable', unreachable: ['lost'] }]);
  });

  it('names every shortfall with the criterion the Lens itself declared', () => {
    const unmet = [
      ...evaluateFact(fact({ attributes: {} }), base),
      ...evaluateFacet(
        [fact({ id: 't1', kind: 'Transition', attributes: { from: 'lost', to: 'lost' } })],
        'Transition',
        base,
      ),
    ];
    const declared = Object.values(base.criteria).flat().map((c) => c.type);

    // One vocabulary for a criterion, whether it is being declared or reported
    // as unmet. A shortfall that named itself differently would leave a reader
    // shown one to hunt for the other in the Lens.
    expect(unmet.length).toBeGreaterThan(2);
    for (const reason of unmet) expect(declared).toContain(reason.criterion);
  });

  it('accepts a fully reachable transition graph', () => {
    const facts = [
      fact({ id: 't1', kind: 'Transition', attributes: { from: 'draft', to: 'sent' } }),
      fact({ id: 't2', kind: 'Transition', attributes: { from: 'sent', to: 'done' } }),
    ];
    expect(evaluateFacet(facts, 'Transition', base)).toEqual([]);
  });
});
