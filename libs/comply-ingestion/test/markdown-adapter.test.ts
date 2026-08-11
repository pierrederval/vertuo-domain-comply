import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { fixturePath } from '@vertuo/comply-fixtures';
import { loadCorpus } from '@vertuo/comply-ingestion';
import { loadLens } from '@vertuo/comply-lens';
import type { Lens } from '@vertuo/comply-lens';

/** A minimal Lens for tests that need their own temporary corpus rather than the shared fixture. */
function makeLens(root: string): Lens {
  return {
    id: 'temp-corpus',
    adapter: { kind: 'markdown-frontmatter', root, moduleIdKey: 'area', facetKey: 'kind', statusKey: 'state' },
    facets: [
      { name: 'overview', factKind: 'Module', extractor: 'document', criteria: [], bodyAttribute: 'description' },
      { name: 'terms', factKind: 'Term', extractor: 'table', criteria: [], columns: { Word: 'name', Meaning: 'definition' } },
    ],
    maturity: { levels: ['guessed', 'agreed'], approvedAtOrAbove: 'agreed' },
    statusMappings: [{ match: 'Agreed', maturity: 'agreed', sources: ['review'] }],
  };
}

describe('markdown adapter', () => {
  it('imports every facet into typed Facts with origins', async () => {
    const lens = await loadLens(fixturePath('lens-a.json'));
    const { corpus } = await loadCorpus(lens);

    // moduleIds() lists Module facts only. 'bravo' is declared by a Term document,
    // so it does not appear here — Task 10's allModuleIds() is what surfaces it.
    expect(corpus.moduleIds().sort()).toEqual(['alpha', 'beta']);
    expect(corpus.byKind('Term').map((f) => f.attributes.name).sort())
      .toEqual(['Cog', 'Sprocket', 'Widget', 'Widget']);
    expect(corpus.facts.every((f) => f.origin.line > 0)).toBe(true);
  });

  it('decomposes the corpus status into a level and sources (ADR-0006)', async () => {
    const lens = await loadLens(fixturePath('lens-a.json'));
    const { corpus } = await loadCorpus(lens);

    const agreed = corpus.facts.find((f) => f.origin.file.includes('alpha/terms.md'));
    expect(agreed?.maturityLevel).toBe('agreed');
    expect(agreed?.sources).toEqual(['system-x', 'review']);

    const guessed = corpus.facts.find((f) => f.origin.file.includes('alpha/rules.md'));
    expect(guessed?.maturityLevel).toBe('guessed');
    expect(guessed?.sources).toEqual(['system-x']);
  });

  it('reports an unrecognised status as a Finding rather than swallowing it', async () => {
    const lens = await loadLens(fixturePath('lens-a.json'));
    const mangled = {
      ...lens,
      statusMappings: lens.statusMappings.filter((m) => m.match === 'Agreed'),
    };
    const { findings } = await loadCorpus(mangled);
    const unknown = findings.filter((f) => f.code === 'unknown-status');
    expect(unknown.length).toBeGreaterThan(0);
    expect(unknown[0]!.message).toContain('Guess - From System X');
    expect(unknown[0]!.origin.file).toMatch(/\.md$/);
  });

  it('reports a document that passes every gate but yields no items as an empty-facet Finding', async () => {
    const root = await mkdtemp(join(tmpdir(), 'comply-ingestion-empty-'));
    await mkdir(join(root, 'gamma'), { recursive: true });
    // Frontmatter only, no body content at all — the document extractor yields zero items.
    await writeFile(
      join(root, 'gamma', 'overview.md'),
      '---\narea: gamma\nkind: overview\nstate: Agreed\n---\n',
      'utf8',
    );

    const { corpus, findings } = await loadCorpus(makeLens(root));

    const emptyFacet = findings.filter((f) => f.code === 'empty-facet');
    expect(emptyFacet).toHaveLength(1);
    expect(emptyFacet[0]!.moduleId).toBe('gamma');
    expect(emptyFacet[0]!.message).toContain('overview');
    expect(emptyFacet[0]!.origin.file).toMatch(/overview\.md$/);
    expect(emptyFacet[0]!.origin.line).toBeGreaterThan(0);

    // No Module fact was produced, so the module is invisible to moduleIds() — but it is
    // NOT silently absent: the Finding above names it, which is the whole point of this fix.
    expect(corpus.moduleIds()).not.toContain('gamma');
  });

  it('gives distinct Fact ids to two documents mapping to the same (moduleId, facet) pair', async () => {
    const root = await mkdtemp(join(tmpdir(), 'comply-ingestion-collide-'));
    await mkdir(join(root, 'alpha'), { recursive: true });
    await writeFile(
      join(root, 'alpha', 'terms-1.md'),
      '---\narea: alpha\nkind: terms\nstate: Agreed\n---\n\n| Word | Meaning |\n| --- | --- |\n| First | One term. |\n',
      'utf8',
    );
    await writeFile(
      join(root, 'alpha', 'terms-2.md'),
      '---\narea: alpha\nkind: terms\nstate: Agreed\n---\n\n| Word | Meaning |\n| --- | --- |\n| Second | Another term. |\n',
      'utf8',
    );

    const { corpus, findings } = await loadCorpus(makeLens(root));

    expect(findings.filter((f) => f.code === 'empty-facet')).toHaveLength(0);

    const terms = corpus.byKind('Term');
    expect(terms).toHaveLength(2);
    const ids = terms.map((f) => f.id);
    expect(new Set(ids).size).toBe(2);

    for (const fact of terms) {
      expect(corpus.find(fact.id)).toBe(fact);
    }

    const first = corpus.facts.find((f) => f.attributes.name === 'First');
    const second = corpus.facts.find((f) => f.attributes.name === 'Second');
    expect(first?.id).not.toBe(second?.id);
    expect(corpus.find(first!.id)?.attributes.name).toBe('First');
    expect(corpus.find(second!.id)?.attributes.name).toBe('Second');
  });
});
