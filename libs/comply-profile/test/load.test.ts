import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadProfile } from '@vertuo/comply-profile';

async function writeProfile(body: unknown): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'profile-'));
  const path = join(dir, 'profile.json');
  await writeFile(path, JSON.stringify(body), 'utf8');
  return path;
}

const valid = {
  id: 'p',
  adapter: { kind: 'markdown-frontmatter', root: './corpus', moduleIdKey: 'm', facetKey: 'f', statusKey: 's' },
  facets: [{ name: 'anything', factKind: 'Term', extractor: 'table' }],
  maturity: { levels: ['a', 'b'], approvedAtOrAbove: 'b' },
  statusMappings: [],
  criteria: {},
};

describe('loadProfile', () => {
  it('loads a valid profile and resolves the adapter root against the profile file', async () => {
    const path = await writeProfile(valid);
    const profile = await loadProfile(path);
    expect(profile.id).toBe('p');
    expect(profile.adapter.root.endsWith('corpus')).toBe(true);
  });

  it('rejects a facet naming a Fact Kind outside the closed set (ADR-0005)', async () => {
    const path = await writeProfile({
      ...valid,
      facets: [{ name: 'x', factKind: 'Invoice', extractor: 'table' }],
    });
    await expect(loadProfile(path)).rejects.toThrow(/Invoice/);
  });

  it('rejects an approval threshold that is not on the ladder', async () => {
    const path = await writeProfile({
      ...valid,
      maturity: { levels: ['a', 'b'], approvedAtOrAbove: 'zzz' },
    });
    await expect(loadProfile(path)).rejects.toThrow(/zzz/);
  });
});
