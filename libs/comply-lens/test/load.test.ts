import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadLens } from '@vertuo/comply-lens';

async function writeLens(body: unknown): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'lens-'));
  const path = join(dir, 'lens.json');
  await writeFile(path, JSON.stringify(body), 'utf8');
  return path;
}

const valid = {
  id: 'p',
  adapter: { kind: 'markdown-frontmatter', root: './corpus', moduleIdKey: 'm', facetKey: 'f', statusKey: 's' },
  facets: [
    { name: 'anything', factKind: 'Term', extractor: 'table', criteria: [], columns: { A: 'name', B: 'definition' } },
  ],
  maturity: { levels: ['a', 'b'], approvedAtOrAbove: 'b' },
  statusMappings: [],
};

describe('loadLens', () => {
  it('loads a valid lens and resolves the adapter root against the lens file', async () => {
    const path = await writeLens(valid);
    const lens = await loadLens(path);
    expect(lens.id).toBe('p');
    expect(lens.adapter.root.endsWith('corpus')).toBe(true);
  });

  it('rejects a facet naming a Fact Kind outside the closed set (ADR-0005)', async () => {
    const path = await writeLens({
      ...valid,
      facets: [{ name: 'x', factKind: 'Invoice', extractor: 'table' }],
    });
    await expect(loadLens(path)).rejects.toThrow(/Invoice/);
  });

  it('rejects an approval threshold that is not on the ladder', async () => {
    const path = await writeLens({
      ...valid,
      maturity: { levels: ['a', 'b'], approvedAtOrAbove: 'zzz' },
    });
    await expect(loadLens(path)).rejects.toThrow(/zzz/);
  });

  it('rejects a Term facet whose table columns map to neither name nor definition', async () => {
    const path = await writeLens({
      ...valid,
      facets: [
        { name: 'glossary', factKind: 'Term', extractor: 'table', criteria: [], columns: { Word: 'term', Meaning: 'meaning' } },
      ],
    });
    await expect(loadLens(path)).rejects.toThrow(/glossary/);
  });

  it('rejects a non-table Term facet with no bodyAttribute', async () => {
    const path = await writeLens({
      ...valid,
      facets: [{ name: 'definitions', factKind: 'Term', extractor: 'heading' }],
    });
    await expect(loadLens(path)).rejects.toThrow(/definitions/);
  });

  it('rejects a Term facet using the document extractor, which has no name to key a Term on', async () => {
    const path = await writeLens({
      ...valid,
      facets: [{ name: 'glossary-notes', factKind: 'Term', extractor: 'document', criteria: [], bodyAttribute: 'definition' }],
    });
    await expect(loadLens(path)).rejects.toThrow(/glossary-notes/);
    await expect(loadLens(path)).rejects.toThrow(/document/);
  });
});
