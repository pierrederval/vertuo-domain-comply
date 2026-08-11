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

/**
 * A Lens whose facts state where they stand and what they were checked against
 * (ADR-0022). The two attributes are named, and how they came to be on a fact is
 * the extractor's business and none of this function's.
 */
function statedPerFact(): Lens {
  const base = lens();
  return {
    ...base,
    statusMappings: [
      { match: 'settled', maturity: 'high', sources: ['review'] },
      { match: 'rough', maturity: 'low', sources: ['system-x'] },
    ],
    facets: [{
      ...base.facets[0]!,
      parts: { Statement: 'statement', Standing: 'standing', Against: 'checkedAgainst' },
      statusAttribute: 'standing',
      sourcesAttribute: 'checkedAgainst',
    }],
  };
}

/** One document whose single fact carries whatever attributes a case needs. */
function factSaying(attributes: Record<string, string | string[]>, status: string | null = 'settled'): Seed {
  return seedOf({
    status,
    items: [{ line: 12, attributes: { name: 'A', ...attributes }, relations: [], excerpt: '## A', excerptCut: false }],
  });
}

describe('a fact saying where it stands and where it came from (ADR-0022)', () => {
  it('takes the fact its own word for where it stands, over its document', () => {
    // The whole of the issue: one line of frontmatter marked 47 terms reviewed at
    // once, and nobody reviewed 47 definitions.
    const { facts } = interpret(factSaying({ standing: 'rough' }, 'settled'), statedPerFact());

    expect(facts[0]?.maturityLevel).toBe('low');
  });

  it('falls back to the document where the fact says nothing', () => {
    // A corpus part-way through stating its own is read as it stands, not refused.
    const { facts } = interpret(factSaying({}, 'settled'), statedPerFact());

    expect(facts[0]?.maturityLevel).toBe('high');
  });

  it('unions what the mapping says the status corroborates with what the fact names', () => {
    // Sources are a set, and a fact confirmed by more is stronger than the same
    // fact confirmed by fewer (LAW-005).
    const { facts } = interpret(
      factSaying({ standing: 'rough', checkedAgainst: '- a.php\n- b.php' }),
      statedPerFact(),
    );

    expect(facts[0]?.sources).toEqual(['system-x', 'a.php', 'b.php']);
  });

  it('unions against the document status where the fact states only its sources', () => {
    const { facts } = interpret(factSaying({ checkedAgainst: '- a.php' }, 'settled'), statedPerFact());

    expect(facts[0]?.maturityLevel).toBe('high');
    expect(facts[0]?.sources).toEqual(['review', 'a.php']);
  });

  it('names one place once, wherever the two paths both name it', () => {
    const { facts } = interpret(factSaying({ checkedAgainst: '- review' }, 'settled'), statedPerFact());

    expect(facts[0]?.sources).toEqual(['review']);
  });

  it('reports a status it cannot read against the fact that stated it', () => {
    // The citation this buys before any corpus is rewritten: a line somebody can
    // open onto the thing that is wrong, rather than the top of the document
    // (LAW-009).
    const { facts, findings } = interpret(factSaying({ standing: 'half-settled' }), statedPerFact());

    expect(findings).toHaveLength(1);
    expect(findings[0]?.code).toBe('unknown-status');
    expect(findings[0]?.message).toContain('half-settled');
    expect(findings[0]?.origin.line).toBe(12);
    // Surfaced, not guessed at, and never quietly replaced by the document's.
    expect(facts).toHaveLength(1);
    expect(facts[0]?.maturityLevel).toBeNull();
    expect(facts[0]?.sources).toEqual([]);
  });

  it('reports the document once, however many facts inherit its unreadable status', () => {
    // Reported where it was written. A document whose one status is unreadable is
    // one thing wrong in one place, and saying it per fact would count one defect
    // as many (LAW-006).
    const seed = seedOf({
      status: 'half-settled',
      items: [
        { line: 12, attributes: { name: 'A' }, relations: [], excerpt: '## A', excerptCut: false },
        { line: 20, attributes: { name: 'B' }, relations: [], excerpt: '## B', excerptCut: false },
      ],
    });
    const { facts, findings } = interpret(seed, statedPerFact());

    expect(findings).toHaveLength(1);
    expect(findings[0]?.origin.line).toBe(1);
    expect(facts.map((fact) => fact.maturityLevel)).toEqual([null, null]);
  });

  it('takes neither of two standings a source wrote for one fact', () => {
    // Picking one would be a silent choice between two things the source says, and
    // there is nothing here that makes either of them the answer (LAW-008).
    const { facts, findings } = interpret(
      factSaying({ standing: ['settled', 'rough'] }),
      statedPerFact(),
    );

    expect(facts[0]?.maturityLevel).toBeNull();
    expect(findings[0]?.code).toBe('unknown-status');
    expect(findings[0]?.message).toContain('settled');
    expect(findings[0]?.message).toContain('rough');
    expect(findings[0]?.origin.line).toBe(12);
  });

  it('reads a document that carries no status of its own at all', () => {
    // A lens naming no status key: the fallback is nothing, and a fact that states
    // its own is read exactly as it stands.
    const declared = statedPerFact();
    const withoutTheKey: Lens = {
      ...declared,
      adapter: { ...declared.adapter, statusKey: undefined },
    };
    const { facts, findings } = interpret(factSaying({ standing: 'settled' }, null), withoutTheKey);

    expect(findings).toEqual([]);
    expect(facts[0]?.maturityLevel).toBe('high');
  });

  it('says nothing about a status where the facet names no attribute for one', () => {
    // Every corpus read before this could be said, and corpus-b after it: review
    // happens a document at a time and the reading is unchanged (ADR-0001).
    const { facts } = interpret(factSaying({ standing: 'rough' }), lens());

    expect(facts[0]?.maturityLevel).toBe('high');
    expect(facts[0]?.sources).toEqual(['review']);
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
