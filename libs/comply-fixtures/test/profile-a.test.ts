import { describe, expect, it } from 'vitest';
import { fixturePath } from '@vertuo/comply-fixtures';
import { loadProfile } from '@vertuo/comply-profile';

describe('fixture profile A', () => {
  it('loads and declares three facets across three Fact Kinds', async () => {
    const profile = await loadProfile(fixturePath('profile-a.json'));
    expect(profile.facets.map((f) => f.factKind)).toEqual(['Module', 'Term', 'Rule']);
    expect(profile.adapter.moduleIdKey).toBe('area');
  });
});
