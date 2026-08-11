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

  it('rejects a facet that names the columns identifying its table but reads no tables', async () => {
    // Silently ignored, the declaration reads as though it were in force, and a reader
    // is looking at a count that includes everything it was written to leave out.
    const path = await writeLens({
      ...valid,
      facets: [{
        name: 'x', factKind: 'Rule', extractor: 'heading', bodyAttribute: 'statement',
        identifyingColumns: ['A'],
      }],
    });
    await expect(loadLens(path)).rejects.toThrow(/identifyingColumns/);
  });

  it('rejects a facet that describes which headings are its own but reads no headings', async () => {
    // Refused for the same reason as the rule above: ignored, the declaration
    // reads as though it were in force.
    const path = await writeLens({
      ...valid,
      facets: [{
        name: 'x', factKind: 'Rule', extractor: 'table', columns: { A: 'name' },
        itemPattern: '^R-',
      }],
    });
    await expect(loadLens(path)).rejects.toThrow(/itemPattern/);
  });

  it('rejects a description of its headings that this reading cannot follow', async () => {
    const path = await writeLens({
      ...valid,
      facets: [{
        name: 'x', factKind: 'Rule', extractor: 'heading', bodyAttribute: 'statement',
        itemPattern: '^R-[0-9',
      }],
    });
    await expect(loadLens(path)).rejects.toThrow(/x/);
  });

  it('rejects a facet that names the parts of its Facts but reads rows of a table', async () => {
    // Refused for the same reason as the two rules above: a row has no subheadings
    // under it, so the declaration would be ignored, and whoever wrote it is looking at
    // Facts they believe carry parts that were never read.
    const path = await writeLens({
      ...valid,
      facets: [{
        name: 'x', factKind: 'Rule', extractor: 'table', columns: { A: 'name' },
        parts: { Statement: 'statement' },
      }],
    });
    await expect(loadLens(path)).rejects.toThrow(/parts/);
  });

  it('rejects a facet that names no parts at all, which is not the same as naming none', async () => {
    // The dangerous one. It reads as "no parts named" and is not: the Facet reads by
    // parts, with no part to read, so every Fact under it keeps only what stands before
    // its first subheading — nothing at all, for a source that begins at one.
    const path = await writeLens({
      ...valid,
      facets: [{
        name: 'x', factKind: 'Rule', extractor: 'heading', bodyAttribute: 'statement',
        parts: {},
      }],
    });
    await expect(loadLens(path)).rejects.toThrow(/names no parts at all/);
  });

  it('accepts several spellings of one part mapping onto one attribute', async () => {
    // A corpus spells the same part several ways, and a Lens that could not say so
    // would force a corpus to be tidied before it could be read.
    const path = await writeLens({
      ...valid,
      facets: [{
        name: 'x', factKind: 'Rule', extractor: 'heading', bodyAttribute: 'statement',
        parts: { 'Why it exists': 'rationale', Rationale: 'rationale' },
      }],
    });
    await expect(loadLens(path)).resolves.toBeDefined();
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
