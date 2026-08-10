import { describe, expect, it } from 'vitest';
import { buildCorpus } from '@vertuo/comply-core';
import type { Fact } from '@vertuo/comply-core';

function fact(over: Partial<Fact> & Pick<Fact, 'id' | 'kind'>): Fact {
  return {
    moduleId: 'm1',
    facet: 'facet-one',
    containerId: 'c1',
    attributes: {},
    relations: [],
    maturityLevel: null,
    sources: [],
    origin: { file: 'x.md', line: 1 },
    ...over,
  };
}

describe('Corpus projection', () => {
  const corpus = buildCorpus([
    fact({ id: 'm1', kind: 'Module', moduleId: null, facet: 'facet-zero' }),
    fact({ id: 't1', kind: 'Term' }),
    fact({ id: 't2', kind: 'Term' }),
    fact({ id: 'r1', kind: 'Rule', facet: 'facet-two' }),
    fact({ id: 'x1', kind: 'Term', moduleId: 'm2' }),
  ]);

  it('lists module ids from Module facts only', () => {
    expect(corpus.moduleIds()).toEqual(['m1']);
  });

  it('finds facts by kind', () => {
    expect(corpus.byKind('Term').map((f) => f.id)).toEqual(['t1', 't2', 'x1']);
  });

  it('finds facts by module and facet', () => {
    expect(corpus.byFacet('m1', 'facet-one').map((f) => f.id)).toEqual(['t1', 't2']);
    expect(corpus.byFacet('m1', 'facet-two').map((f) => f.id)).toEqual(['r1']);
    expect(corpus.byFacet('m1', 'absent-facet')).toEqual([]);
  });

  it('resolves a fact by id and returns undefined for an unknown one', () => {
    expect(corpus.find('r1')?.kind).toBe('Rule');
    expect(corpus.find('nope')).toBeUndefined();
  });
});
