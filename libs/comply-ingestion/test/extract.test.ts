import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { fixturePath } from '@vertuo/comply-fixtures';
import { EXCERPT_LIMIT, extractSeed } from '@vertuo/comply-ingestion';
import { loadLens, type Lens } from '@vertuo/comply-lens';
import { seedDigest } from '@vertuo/comply-seed';

/** A Lens over a temporary corpus, for cases the shared fixtures do not carry. */
function makeLens(root: string): Lens {
  return {
    id: 'temp-corpus',
    adapter: { kind: 'markdown-frontmatter', root, moduleIdKey: 'area', facetKey: 'kind', statusKey: 'state' },
    facets: [{ name: 'notes', factKind: 'Rule', extractor: 'heading', criteria: [], bodyAttribute: 'statement' }],
    maturity: { levels: ['low', 'high'], approvedAtOrAbove: 'high' },
    statusMappings: [{ match: 'high', maturity: 'high', sources: [] }],
  };
}

async function corpusWith(document: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'comply-extract-'));
  await mkdir(join(root, 'm'), { recursive: true });
  await writeFile(join(root, 'm', 'doc.md'), document, 'utf8');
  return root;
}

/**
 * Every key a Seed's own structure uses. Attribute names are not descended into:
 * those are a corpus's own words and may be anything at all.
 */
function* keysIn(value: unknown): Generator<string> {
  if (Array.isArray(value)) {
    for (const each of value) yield* keysIn(each);
    return;
  }
  if (value === null || typeof value !== 'object') return;

  for (const [key, nested] of Object.entries(value)) {
    yield key;
    if (key !== 'attributes') yield* keysIn(nested);
  }
}

describe('extraction judges nothing', () => {
  it('records the status as written and never what it denotes', async () => {
    const lens = await loadLens(fixturePath('lens-a.json'));
    const seed = await extractSeed(lens);

    const rules = seed.documents.find((d) => d.path.endsWith('rules.md'));
    expect(rules?.status).toBe('Guess - From System X');

    // Nowhere in a Seed is there a rung, a provenance list, or a verdict. If any
    // appeared, a criteria change would mean re-extracting every corpus. Checked
    // against the structure rather than the text, because an attribute lifted from
    // a corpus may be called anything at all.
    //
    // `setAside` is a count of what this reading declined and is none of the three:
    // it says how much was left out, not that anything was wrong with it.
    expect([...new Set(keysIn(seed))].sort()).toEqual([
      'attributes', 'bodyStartLine', 'containerId', 'documents', 'excerpt', 'excerptCut',
      'facet', 'items', 'lensId', 'line', 'moduleId', 'owner', 'path', 'readable',
      'relations', 'setAside', 'status', 'targetRef', 'type', 'version',
    ]);
  });

  it('produces the same Seed however the Lens says to read what it finds', async () => {
    const lens = await loadLens(fixturePath('lens-a.json'));

    // Every part of the Lens that is a judgment, changed: a different ladder, no
    // status mappings at all, different criteria, a different owner, and a facet
    // reassigned to another Fact Kind. Extraction reads none of it, so the Seed is
    // identical — which is the whole point of moving the line.
    const readDifferently: Lens = {
      ...lens,
      facets: lens.facets.map((f) => (f.factKind === 'Rule' ? { ...f, factKind: 'Message' as const } : f)),
      maturity: { levels: ['x', 'y'], approvedAtOrAbove: 'y' },
      statusMappings: [],
        owners: { alpha: 'someone-else' },
    };

    expect(seedDigest(await extractSeed(readDifferently))).toBe(seedDigest(await extractSeed(lens)));
  });

  it('records a facet no Lens declares without calling it a defect', async () => {
    const root = await corpusWith('---\narea: m\nkind: nonesuch\nstate: high\n---\n\n## A\n\nSomething.\n');
    const [document] = (await extractSeed(makeLens(root))).documents;

    expect(document?.readable).toBe(true);
    expect(document?.facet).toBe('nonesuch');
    // Nothing could be read from it, because no extractor was named for it. Whether
    // that is a defect, and what to call it, is decided when a Lens is applied.
    expect(document?.items).toEqual([]);
  });

  it('records a document nothing could be read from, rather than dropping it', async () => {
    const root = await corpusWith('no frontmatter here at all\n');
    const [document] = (await extractSeed(makeLens(root))).documents;

    expect(document?.readable).toBe(false);
    expect(document?.path).toBe(join('m', 'doc.md'));
    expect(document?.bodyStartLine).toBeNull();
  });
});

describe('the source text an excerpt carries', () => {
  it('quotes the source exactly as written', async () => {
    const body = '## A\n\nOne line. Then another.\n';
    const root = await corpusWith(`---\narea: m\nkind: notes\nstate: high\n---\n\n${body}`);
    const [document] = (await extractSeed(makeLens(root))).documents;

    expect(document?.items[0]?.excerpt).toBe('## A\n\nOne line. Then another.');
    expect(document?.items[0]?.excerptCut).toBe(false);
  });

  it('cuts a long span and says so, rather than shortening what the source says', async () => {
    // Built from the budget rather than from a count of lines, so a change to how
    // much a quotation carries cannot leave this passing over a span it no longer
    // cuts — which is a test that has quietly stopped testing anything.
    const sentence = (i: number) => `Sentence number ${i} of a long passage.`;
    const long = Array.from({ length: Math.ceil(EXCERPT_LIMIT / sentence(0).length) + 10 }, (_, i) => sentence(i)).join('\n');
    const root = await corpusWith(`---\narea: m\nkind: notes\nstate: high\n---\n\n## A\n\n${long}\n`);
    const [document] = (await extractSeed(makeLens(root))).documents;
    const item = document?.items[0];

    expect(item?.excerptCut).toBe(true);
    // What is shown is the beginning of the source, unaltered — never a summary of
    // it. The reader follows the origin for the rest.
    expect(`## A\n\n${long}`.startsWith(item?.excerpt ?? '')).toBe(true);
    expect(item?.excerpt.length).toBeLessThan(long.length);
  });
});

describe('two-corpus rule (ADR-0001)', () => {
  it('extracts a corpus with different keys, layout, and a numeric status', async () => {
    const lens = await loadLens(fixturePath('lens-b.json'));
    const seed = await extractSeed(lens);

    expect(seed.lensId).toBe('corpus-b');
    expect(seed.documents.map((d) => d.path).sort())
      .toEqual(['four.md', 'one.md', 'three.md', 'two.md']);

    // Written as a number at source and carried as the string it will be matched
    // against. Coercion is not interpretation: nothing here says what "2" denotes.
    const one = seed.documents.find((d) => d.path === 'one.md');
    expect(one?.status).toBe('2');
    expect(one?.moduleId).toBe('one');
    // This corpus names no owner key, and the Lens's fallback map is interpretation's.
    expect(one?.owner).toBeNull();
  });
});
