import { describe, expect, it } from 'vitest';
import type { Fact } from '@vertuo/comply-core';
import { evaluateFacet, evaluateFact } from '@vertuo/comply-readiness';
import type { FacetSpec } from '@vertuo/comply-lens';

/** A Facet asking for a name, a statement, and somewhere it came from. */
const RULES: FacetSpec = {
  name: 'rules',
  factKind: 'Rule',
  extractor: 'heading',
  bodyAttribute: 'statement',
  criteria: [
    { type: 'requiredAttributes', attributes: ['name', 'statement'] },
    { type: 'minSources', count: 1 },
  ],
};

/**
 * A second Facet of the same Fact Kind, asking for more corroboration.
 *
 * The reason criteria belong to a Facet rather than a Fact Kind (ADR-0019): a
 * corpus splits one Kind into Facets that are not the same thing, and keyed by
 * Kind these two would have to be judged identically.
 */
const INVARIANTS: FacetSpec = {
  name: 'invariants',
  factKind: 'Rule',
  extractor: 'heading',
  bodyAttribute: 'statement',
  criteria: [
    { type: 'requiredAttributes', attributes: ['name', 'statement'] },
    { type: 'minSources', count: 2 },
  ],
};

const LIFECYCLE: FacetSpec = {
  name: 'lifecycle',
  factKind: 'Transition',
  extractor: 'heading',
  criteria: [{ type: 'allStatesReachable', fromAttribute: 'from', toAttribute: 'to' }],
};

/** A Facet asking for nothing, so anything written under it is enough. */
const ANYTHING: FacetSpec = {
  name: 'anything',
  factKind: 'Term',
  extractor: 'heading',
  bodyAttribute: 'definition',
  criteria: [],
};

function fact(over: Partial<Fact>): Fact {
  return {
    id: 'f', kind: 'Rule', moduleId: 'm', facet: 'rules', containerId: 'c',
    attributes: {}, relations: [], maturityLevel: null, sources: [],
    origin: { file: 'a.md', line: 1 }, ...over,
  };
}

describe('well-formedness engine', () => {
  it('passes a fact meeting every criterion', () => {
    expect(evaluateFact(fact({ attributes: { name: 'n', statement: 's' }, sources: ['x'] }), RULES))
      .toEqual([]);
  });

  it('names each missing attribute', () => {
    const unmet = evaluateFact(fact({ attributes: { name: 'n' }, sources: ['x'] }), RULES);
    // The parts of the reason, not a sentence about it: which attributes are
    // missing is what a surface needs to write its own words about them.
    expect(unmet).toEqual([{ criterion: 'requiredAttributes', missing: ['statement'] }]);
  });

  it('reports too few sources against how many are asked for', () => {
    const unmet = evaluateFact(fact({ attributes: { name: 'n', statement: 's' } }), RULES);
    // Both numbers, because a shortfall is stated against what was asked for
    // (LAW-006), and because no surface can phrase it from one of them.
    expect(unmet).toEqual([{ criterion: 'minSources', has: 0, needs: 1 }]);
  });

  it('judges two Facets of one Fact Kind by what each of them asks for', () => {
    // The same Fact, written the same way, corroborated once. Enough under a
    // Facet that asks for one Source and not under one that asks for two. Keyed
    // by Fact Kind this could not be said at all: both are Rules (ADR-0019).
    const corroboratedOnce = fact({ attributes: { name: 'n', statement: 's' }, sources: ['x'] });

    expect(evaluateFact(corroboratedOnce, RULES)).toEqual([]);
    expect(evaluateFact(corroboratedOnce, INVARIANTS)).toEqual([
      { criterion: 'minSources', has: 1, needs: 2 },
    ]);
  });

  it('asks nothing of a Facet that declares no criteria', () => {
    expect(evaluateFact(fact({ kind: 'Term', attributes: {} }), ANYTHING)).toEqual([]);
  });

  it('flags an unreachable state across a facet', () => {
    const facts = [
      fact({ id: 't1', kind: 'Transition', attributes: { from: 'draft', to: 'sent' } }),
      fact({ id: 't2', kind: 'Transition', attributes: { from: 'lost', to: 'lost' } }),
    ];
    expect(evaluateFacet(facts, LIFECYCLE)).toEqual([
      { criterion: 'allStatesReachable', unreachable: ['lost'] },
    ]);
  });

  it('names every shortfall with the criterion the Facet itself declared', () => {
    const unmet = [
      ...evaluateFact(fact({ attributes: {} }), RULES),
      ...evaluateFacet(
        [fact({ id: 't1', kind: 'Transition', attributes: { from: 'lost', to: 'lost' } })],
        LIFECYCLE,
      ),
    ];
    const declared = [...RULES.criteria, ...LIFECYCLE.criteria].map((c) => c.type);

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
    expect(evaluateFacet(facts, LIFECYCLE)).toEqual([]);
  });

  it('asks a fact to state where it stands only where a Facet says so (ADR-0022)', () => {
    // Requiredness is a sentence a Lens says and never one this engine says. A corpus
    // whose review genuinely happens a document at a time is read by a Facet that asks
    // for nothing here, and nothing in the core has an opinion about that (ADR-0001).
    const asked: FacetSpec = {
      ...RULES,
      statusAttribute: 'standing',
      criteria: [{ type: 'requiredAttributes', attributes: ['name', 'statement', 'standing'] }],
    };
    const silent: FacetSpec = { ...RULES, statusAttribute: 'standing', criteria: [] };
    const saysNothing = fact({ attributes: { name: 'R-1', statement: 'It holds.' } });

    expect(evaluateFact(saysNothing, asked)).toEqual([
      { criterion: 'requiredAttributes', missing: ['standing'] },
    ]);
    expect(evaluateFact(saysNothing, silent)).toEqual([]);
    expect(evaluateFact(
      fact({ attributes: { ...saysNothing.attributes, standing: 'Agreed' } }),
      asked,
    )).toEqual([]);
  });
});
