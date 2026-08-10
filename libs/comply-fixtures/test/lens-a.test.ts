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
