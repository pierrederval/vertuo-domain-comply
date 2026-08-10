import { describe, expect, it } from 'vitest';
import { fixturePath } from '@vertuo/comply-fixtures';
import { loadLens } from '@vertuo/comply-lens';

describe('fixture lens A', () => {
  it('loads and declares three facets across three Fact Kinds', async () => {
    const lens = await loadLens(fixturePath('lens-a.json'));
    expect(lens.facets.map((f) => f.factKind)).toEqual(['Module', 'Term', 'Rule']);
    expect(lens.adapter.moduleIdKey).toBe('area');
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
