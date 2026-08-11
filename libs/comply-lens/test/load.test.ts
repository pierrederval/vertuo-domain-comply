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
    { name: 'anything', factKind: 'Term', extractor: 'table', criteria: [], definesTerms: true, columns: { A: 'name', B: 'definition' } },
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

  it('rejects the defining facet whose table columns map to neither name nor definition', async () => {
    const path = await writeLens({
      ...valid,
      facets: [
        { name: 'glossary', factKind: 'Term', extractor: 'table', criteria: [], definesTerms: true, columns: { Word: 'term', Meaning: 'meaning' } },
      ],
    });
    await expect(loadLens(path)).rejects.toThrow(/glossary/);
  });

  it('rejects a non-table defining facet with no bodyAttribute', async () => {
    const path = await writeLens({
      ...valid,
      facets: [{ name: 'definitions', factKind: 'Term', extractor: 'heading', definesTerms: true }],
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
      facets: [{ name: 'glossary-notes', factKind: 'Term', extractor: 'document', criteria: [], definesTerms: true, bodyAttribute: 'definition' }],
    });
    await expect(loadLens(path)).rejects.toThrow(/glossary-notes/);
    await expect(loadLens(path)).rejects.toThrow(/document/);
  });

  it('rejects a lens whose facets of Terms name none of themselves as the dictionary', async () => {
    // The whole of ADR-0021 in one case: two facets of Terms and nothing saying which
    // of them settles what a word means, so whichever happened to be written first
    // silently became the dictionary.
    const path = await writeLens({
      ...valid,
      facets: [
        { name: 'glossary', factKind: 'Term', extractor: 'table', criteria: [], columns: { Word: 'name', Meaning: 'definition' } },
        { name: 'aggregates', factKind: 'Term', extractor: 'heading', criteria: [] },
      ],
    });
    await expect(loadLens(path)).rejects.toThrow(/definesTerms/);
    await expect(loadLens(path)).rejects.toThrow(/glossary/);
    await expect(loadLens(path)).rejects.toThrow(/aggregates/);
  });

  it('rejects two facets both claiming to define the language', async () => {
    const path = await writeLens({
      ...valid,
      facets: [
        { name: 'glossary', factKind: 'Term', extractor: 'table', criteria: [], definesTerms: true, columns: { Word: 'name', Meaning: 'definition' } },
        { name: 'aggregates', factKind: 'Term', extractor: 'heading', criteria: [], definesTerms: true, bodyAttribute: 'definition' },
      ],
    });
    await expect(loadLens(path)).rejects.toThrow(/glossary/);
    await expect(loadLens(path)).rejects.toThrow(/aggregates/);
  });

  it('rejects a facet claiming to define the language whose facts are not words', async () => {
    // Ignored, the declaration reads as though it were in force, and a lens naming its
    // dictionary would have none.
    const path = await writeLens({
      ...valid,
      facets: [
        { name: 'x', factKind: 'Rule', extractor: 'heading', bodyAttribute: 'statement', definesTerms: true },
      ],
    });
    await expect(loadLens(path)).rejects.toThrow(/definesTerms/);
    await expect(loadLens(path)).rejects.toThrow(/Rule/);
  });

  it('accepts a second facet of Terms that defines nothing and names no body attribute', async () => {
    // The shape this exists for: a list of which thing owns the others carries the same
    // words as the dictionary and settles none of them. It is asked for no definition
    // because it holds none, and asking would force a lens to write down that its rows
    // mean something they do not.
    const path = await writeLens({
      ...valid,
      facets: [
        { name: 'aggregates', factKind: 'Term', extractor: 'heading', criteria: [] },
        { name: 'glossary', factKind: 'Term', extractor: 'table', criteria: [], definesTerms: true, columns: { Word: 'name', Meaning: 'definition' } },
      ],
    });
    await expect(loadLens(path)).resolves.toBeDefined();
  });

  it('still refuses the document extractor to a facet of Terms that defines nothing', async () => {
    // What makes a Term a Term is having a word; what makes it a dictionary entry is
    // having a meaning. Only the second is the defining facet's alone.
    const path = await writeLens({
      ...valid,
      facets: [
        { name: 'aggregates', factKind: 'Term', extractor: 'document', criteria: [], bodyAttribute: 'owns' },
        { name: 'glossary', factKind: 'Term', extractor: 'table', criteria: [], definesTerms: true, columns: { Word: 'name', Meaning: 'definition' } },
      ],
    });
    await expect(loadLens(path)).rejects.toThrow(/aggregates/);
  });

  it('accepts a lens with no facet of Terms at all, which has no language to define', async () => {
    const path = await writeLens({
      ...valid,
      facets: [{ name: 'x', factKind: 'Rule', extractor: 'heading', bodyAttribute: 'statement' }],
    });
    await expect(loadLens(path)).resolves.toBeDefined();
  });
});
