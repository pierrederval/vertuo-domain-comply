import { describe, expect, it } from 'vitest';
import { fixturePath } from '@vertuo/comply-fixtures';
import { loadLens } from '@vertuo/comply-lens';

describe('fixture lens A', () => {
  it('loads and declares five Facets across three Fact Kinds', async () => {
    const lens = await loadLens(fixturePath('lens-a.json'));
    expect(lens.facets.map((f) => f.factKind)).toEqual(['Module', 'Term', 'Term', 'Rule', 'Rule']);
    expect(lens.adapter.moduleIdKey).toBe('area');
  });

  it('names one of its two Facets of Terms as the one that defines the language', async () => {
    // ADR-0021. Two Facets of Terms with the same word written under both, and the
    // second of them the dictionary — so a reading that took the first, or took both,
    // is wrong here rather than in a case somebody has to remember to construct.
    const lens = await loadLens(fixturePath('lens-a.json'));
    const words = lens.facets.filter((facet) => facet.factKind === 'Term');

    expect(words.map((facet) => facet.name)).toEqual(['aggregates', 'terms']);
    expect(words.filter((facet) => facet.definesTerms === true).map((facet) => facet.name))
      .toEqual(['terms']);
    // And it names its body attribute exactly as the dictionary names its column, which
    // is the one word that used to be all that kept it out.
    expect(words[0]!.bodyAttribute).toBe('definition');
  });

  it('asks different things of its two Facets of one Fact Kind', async () => {
    // Why criteria belong to a Facet (ADR-0019). Rules and Invariants are both
    // Rules, and an Invariant is held to a higher bar; keyed by Fact Kind the two
    // would have to be judged identically. Exercised by ordinary use of the
    // fixture rather than by a case somebody has to remember to construct.
    const lens = await loadLens(fixturePath('lens-a.json'));
    const asked = (name: string) =>
      lens.facets.find((facet) => facet.name === name)?.criteria.map((c) => c.type);

    expect(asked('rules')).toEqual(['requiredAttributes', 'minSources']);
    expect(asked('invariants')).toEqual(['requiredAttributes', 'minSources']);

    const sourcesFor = (name: string) =>
      lens.facets
        .find((facet) => facet.name === name)
        ?.criteria.find((c) => c.type === 'minSources');

    expect(sourcesFor('rules')).toEqual({ type: 'minSources', count: 1 });
    expect(sourcesFor('invariants')).toEqual({ type: 'minSources', count: 2 });
  });
});

describe('the two fixtures differ in what they declare', () => {
  it('names one Corpus and leaves the other to be called by its id', async () => {
    // Both paths through the surface are then exercised by ordinary use, rather
    // than by a case somebody has to remember to construct (ADR-0001).
    expect((await loadLens(fixturePath('lens-a.json'))).name).toBe('Alpha');
    expect((await loadLens(fixturePath('lens-b.json'))).name).toBeUndefined();
  });
});
