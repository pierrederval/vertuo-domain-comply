import { isAbsolute, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { fixturePath } from '@vertuo/comply-fixtures';
import { extractSeed, interpret, INTERPRETATION_CHECKS } from '@vertuo/comply-ingestion';
import { loadLens, type Lens } from '@vertuo/comply-lens';
import { SEED_VERSION, type Seed, type SeedDocument } from '@vertuo/comply-seed';

const ROOT = '/somewhere/corpus';

function lens(): Lens {
  return {
    id: 'temp-corpus',
    adapter: {
      kind: 'markdown-frontmatter', root: ROOT,
      moduleIdKey: 'area', facetKey: 'kind', statusKey: 'state', ownerKey: 'stewart',
    },
    facets: [{ name: 'notes', factKind: 'Rule', extractor: 'heading', criteria: [], bodyAttribute: 'statement' }],
    maturity: { levels: ['low', 'high'], approvedAtOrAbove: 'high' },
    statusMappings: [{ match: 'settled', maturity: 'high', sources: ['review'] }],
  };
}

function seedOf(...documents: Partial<SeedDocument>[]): Seed {
  return {
    version: SEED_VERSION,
    lensId: 'temp-corpus',
    documents: documents.map((document) => ({
      path: 'm/doc.md', containerId: 'm', readable: true, bodyStartLine: 6,
      moduleId: 'm', facet: 'notes', status: 'settled', owner: null, setAside: 0,
      items: [{ line: 8, attributes: { name: 'A' }, relations: [], excerpt: '## A', excerptCut: false }],
      ...document,
    })),
  };
}

describe('what applying a Lens looks for', () => {
  it('names it, so the Findings it reports have something to be counted against', () => {
    expect(INTERPRETATION_CHECKS).toEqual([
      'unparsable-document',
      'missing-module-identity',
      'unknown-status',
      'empty-facet',
    ]);
  });

  it('reports nothing it did not say it was looking for', async () => {
    // A defect kind added without being named shrinks the stated denominator
    // below what actually ran, which reads as a smaller problem than there is.
    for (const lensFile of ['lens-a.json', 'lens-b.json']) {
      const loaded = await loadLens(fixturePath(lensFile));
      const { findings } = interpret(await extractSeed(loaded), loaded);
      for (const finding of findings) expect(INTERPRETATION_CHECKS).toContain(finding.code);
    }
  });
});

describe('what a Lens makes of a Seed', () => {
  it('reports a document nothing could be read from, in the words of the moment', async () => {
    const { facts, findings } = interpret(
      seedOf({ readable: false, bodyStartLine: null, moduleId: null, facet: null, status: null, items: [] }),
      lens(),
    );

    expect(facts).toEqual([]);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.code).toBe('unparsable-document');
    // The wording lives here and not in the Seed, so improving it costs nothing.
    expect(findings[0]?.message).not.toBe('');
    expect(findings[0]?.origin).toEqual({ file: join(ROOT, 'm/doc.md'), line: 1 });
  });

  it('reports an absent identity, naming the key the Lens told it to look in', async () => {
    const { findings } = interpret(seedOf({ moduleId: null }), lens());

    expect(findings[0]?.code).toBe('missing-module-identity');
    expect(findings[0]?.message).toContain('area');
  });

  it('reports a facet no Lens declares, quoting what was found there', async () => {
    const { facts, findings } = interpret(seedOf({ facet: 'nonesuch', items: [] }), lens());

    expect(facts).toEqual([]);
    expect(findings[0]?.code).toBe('unparsable-document');
    expect(findings[0]?.message).toContain('nonesuch');
    expect(findings[0]?.message).toContain('kind');
  });

  it('reports a facet that yielded nothing at the line its content should have begun', async () => {
    const { findings } = interpret(seedOf({ items: [], bodyStartLine: 6 }), lens());

    expect(findings[0]?.code).toBe('empty-facet');
    expect(findings[0]?.origin.line).toBe(6);
  });

  it('gives back a path a person can open, from a Seed that holds none', async () => {
    const seed = seedOf({});
    expect(isAbsolute(seed.documents[0]!.path)).toBe(false);

    const { facts } = interpret(seed, lens());
    // The Seed stays portable and the evidence stays openable (LAW-009).
    expect(facts[0]?.origin.file).toBe(join(ROOT, 'm/doc.md'));
  });

  it('says nothing about a status when the Lens has nothing to say about it', async () => {
    const { facts, findings } = interpret(seedOf({ status: 'something-else' }), lens());

    expect(findings[0]?.code).toBe('unknown-status');
    // Surfaced, not guessed at, and the Fact is still there to be seen.
    expect(facts).toHaveLength(1);
    expect(facts[0]?.maturityLevel).toBeNull();
    expect(facts[0]?.sources).toEqual([]);
  });
});

describe('the reason the line moved', () => {
  it('reads one Seed differently through a stricter Lens, with nothing re-extracted', async () => {
    const asDeclared = await loadLens(fixturePath('lens-a.json'));
    const seed = await extractSeed(asDeclared);

    // Somebody decides the corroboration this status stood for is no longer enough.
    // No document changed and nothing was extracted again.
    const stricter: Lens = {
      ...asDeclared,
      statusMappings: asDeclared.statusMappings.map((mapping) =>
        mapping.maturity === 'agreed' ? { ...mapping, maturity: 'guessed', sources: ['system-x'] } : mapping,
      ),
    };

    const before = interpret(seed, asDeclared).facts;
    const after = interpret(seed, stricter).facts;

    expect(before.some((fact) => fact.maturityLevel === 'agreed')).toBe(true);
    expect(after.some((fact) => fact.maturityLevel === 'agreed')).toBe(false);
    // The knowledge is the same knowledge; only what it is taken to mean moved.
    expect(after.map((fact) => fact.id)).toEqual(before.map((fact) => fact.id));
  });
});
