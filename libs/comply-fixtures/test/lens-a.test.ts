import { describe, expect, it } from 'vitest';
import { fixturePath } from '@vertuo/comply-fixtures';
import { loadLens } from '@vertuo/comply-lens';

describe('fixture lens A', () => {
  it('loads and declares seven Facets across four Fact Kinds', async () => {
    const lens = await loadLens(fixturePath('lens-a.json'));
    expect(lens.facets.map((f) => f.factKind))
      .toEqual(['Module', 'Term', 'Term', 'Rule', 'Rule', 'Term', 'Message']);
    expect(lens.adapter.moduleIdKey).toBe('area');
  });

  it('names one of its three Facets of Terms as the one that defines the language', async () => {
    // ADR-0021. Three Facets of Terms with the same word written under more than one of
    // them, and the dictionary neither first nor last — so a reading that took the first,
    // or took all of them, is wrong here rather than in a case somebody has to remember
    // to construct.
    const lens = await loadLens(fixturePath('lens-a.json'));
    const words = lens.facets.filter((facet) => facet.factKind === 'Term');

    expect(words.map((facet) => facet.name)).toEqual(['aggregates', 'terms', 'crew']);
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

  it('settles who may make a request in two different ways (ADR-0037)', async () => {
    // Corpus A keeps a cast of its own beside its dictionary and writes one name in a
    // column; corpus B settles a role in the very place it settles a word, reads it from
    // a section rather than a column, and writes two roles there at once. Both halves are
    // then exercised by ordinary use of the fixtures rather than by a case somebody has
    // to remember to construct.
    const facet = async (lensFile: string, name: string) =>
      (await loadLens(fixturePath(lensFile))).facets.find((f) => f.name === name);

    expect((await facet('lens-a.json', 'orders'))?.actor)
      .toEqual({ attribute: 'placedBy', settledBy: 'crew' });
    expect((await facet('lens-b.json', 'demandes'))?.actor)
      .toEqual({ attribute: 'acteur', settledBy: 'definitions', separatedBy: [' ou '] });
  });
});
