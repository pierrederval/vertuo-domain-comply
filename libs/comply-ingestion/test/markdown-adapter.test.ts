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
    // Three Widgets: two words meaning different things in two areas, and one saying
    // which thing owns the others. All three are Terms — the Facet that defines the
    // language is what tells the third apart, and that is not this reading's business
    // (ADR-0021).
    expect(corpus.byKind('Term').map((f) => f.attributes.name).sort())
      .toEqual(['Cog', 'Sprocket', 'Widget', 'Widget', 'Widget']);
    expect(corpus.facts.every((f) => f.origin.line > 0)).toBe(true);
  });

  it('decomposes the corpus status into a level and sources (ADR-0006)', async () => {
    const lens = await loadLens(fixturePath('lens-a.json'));
    const { corpus } = await loadCorpus(lens);

    const agreed = corpus.facts.find((f) => f.origin.file.includes('alpha/terms.md'));
    expect(agreed?.maturityLevel).toBe('agreed');
    expect(agreed?.sources).toEqual(['system-x', 'review']);

    // The two grains, in one document (ADR-0022). The first rule says where it stands
    // and what it was checked against; the second says neither and is read by its
    // document, which is how every fact in this corpus was read before it could say so.
    const rules = corpus.facts.filter((f) => f.origin.file.includes('alpha/rules.md'));

    expect(rules[0]?.maturityLevel).toBe('agreed');
    expect(rules[0]?.sources).toEqual(['system-x', 'review', 'the crate ledger']);

    expect(rules[1]?.maturityLevel).toBe('guessed');
    expect(rules[1]?.sources).toEqual(['system-x', 'the crate ledger']);
  });

  it('reads a corpus whose documents say nothing about where they stand (ADR-0022)', async () => {
    // Nothing in the frontmatter to read, because every rule states its own. A Lens
    // forced to name a key here would have to invent one, and the reading would then
    // complain about a key the corpus never had.
    const root = await mkdtemp(join(tmpdir(), 'comply-corpus-'));
    await mkdir(join(root, 'zeta'), { recursive: true });
    await writeFile(
      join(root, 'zeta/rules.md'),
      [
        '---', 'area: zeta', 'kind: rules', '---', '',
        '## R-1 It holds', '', '### Statement', '', 'It holds.', '',
        '### Where it stands', '', 'Agreed', '',
        '### Checked against', '', '- one.php', '- two.php', '',
      ].join('\n'),
      'utf8',
    );

    const base = makeLens(root);
    const lens: Lens = {
      ...base,
      adapter: { ...base.adapter, statusKey: undefined },
      facets: [{
        name: 'rules', factKind: 'Rule', extractor: 'heading', criteria: [],
        bodyAttribute: 'statement',
        parts: { Statement: 'statement', 'Where it stands': 'standing', 'Checked against': 'checkedAgainst' },
        statusAttribute: 'standing',
        sourcesAttribute: 'checkedAgainst',
      }],
    };

    const { corpus, findings } = await loadCorpus(lens);

    expect(findings).toEqual([]);
    expect(corpus.facts).toHaveLength(1);
    expect(corpus.facts[0]?.maturityLevel).toBe('agreed');
    expect(corpus.facts[0]?.sources).toEqual(['review', 'one.php', 'two.php']);
  });

  it('reports a status only one fact stated, at that fact and not at its document', async () => {
    // The citation this buys before a corpus is rewritten. The document's own status
    // reads perfectly; one rule in it says something this Lens has no mapping for, and
    // the reader is sent to that rule's line (LAW-009).
    const lens = await loadLens(fixturePath('lens-a.json'));
    const { corpus, findings } = await loadCorpus(lens);

    const unknown = findings.filter((f) => f.code === 'unknown-status');
    expect(unknown).toHaveLength(1);
    expect(unknown[0]!.message).toContain('Half-agreed');
    expect(unknown[0]!.origin.file).toMatch(/alpha\/rules\.md$/);

    const stated = corpus.facts.find((f) => f.origin.line === unknown[0]!.origin.line);
    expect(stated?.attributes.name).toBe('R-3 A Crate carries one kind of thing');
    // Surfaced, not guessed at, and never quietly replaced by the document's.
    expect(stated?.maturityLevel).toBeNull();
    // What it was checked against does not depend on the rung it failed to reach.
    expect(stated?.sources).toEqual(['the crate ledger']);
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
