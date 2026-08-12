import { describe, expect, it } from 'vitest';
import type { Fact } from '@vertuo/comply-core';
import { buildCorpus } from '@vertuo/comply-core';
import type { Lens } from '@vertuo/comply-lens';
import { fixturePath } from '@vertuo/comply-fixtures';
import { loadCorpus } from '@vertuo/comply-ingestion';
import { loadLens } from '@vertuo/comply-lens';
import { checkUnsettledActor } from '@vertuo/comply-integrity';

/**
 * A corpus that keeps its requests in one Facet and who may make them in another,
 * which is the only shape this Check is about. Written inline rather than read from a
 * fixture so that one case is one Lens: what is under test is a sentence a Lens says,
 * and the interesting cases are the ones where it says it differently.
 */
function lensAsking(
  actor: { attribute: string; settledBy: string; separatedBy?: string[] } | undefined,
): Lens {
  return {
    id: 'inline',
    adapter: { kind: 'markdown-frontmatter', root: '.', moduleIdKey: 'area', facetKey: 'kind' },
    facets: [
      { name: 'crew', label: 'Crew', factKind: 'Term', extractor: 'heading', bodyAttribute: 'definition', criteria: [] },
      {
        name: 'orders', label: 'Orders', factKind: 'Message', extractor: 'table', criteria: [],
        columns: { Order: 'name', Who: 'placedBy' },
        ...(actor === undefined ? {} : { actor }),
      },
    ],
    maturity: { levels: ['draft', 'agreed'], approvedAtOrAbove: 'agreed' },
    statusMappings: [],
  };
}

function fact(partial: {
  facet: string;
  kind: Fact['kind'];
  name: string;
  placedBy?: string | string[];
  moduleId?: string | null;
  line?: number;
}): Fact {
  const attributes: Record<string, string | string[]> = { name: partial.name };
  if (partial.placedBy !== undefined) attributes.placedBy = partial.placedBy;
  return {
    id: `${partial.facet}#${partial.name}`,
    kind: partial.kind,
    moduleId: partial.moduleId === undefined ? 'alpha' : partial.moduleId,
    facet: partial.facet,
    containerId: 'alpha',
    attributes,
    relations: [],
    maturityLevel: null,
    sources: [],
    origin: { file: `alpha/${partial.facet}.md`, line: partial.line ?? 7 },
  };
}

const maker = fact({ facet: 'crew', kind: 'Term', name: 'Maker' });
const packer = fact({ facet: 'crew', kind: 'Term', name: 'Packer' });

const ASKING = { attribute: 'placedBy', settledBy: 'crew' };

describe('a request whose actor nothing settles', () => {
  it('reports one, at the request itself, routed to the Module the request belongs to', () => {
    const corpus = buildCorpus([
      maker,
      fact({ facet: 'orders', kind: 'Message', name: 'Fill a Crate', placedBy: 'Filler', line: 9 }),
    ]);
    const findings = checkUnsettledActor(corpus, lensAsking(ASKING));

    expect(findings).toHaveLength(1);
    expect(findings[0]!.code).toBe('unsettled-actor');
    expect(findings[0]!.moduleId).toBe('alpha');
    // Cited where a person can open it and read the row for themselves (LAW-009).
    expect(findings[0]!.origin).toEqual({ file: 'alpha/orders.md', line: 9 });
  });

  it('says what the request is, who it names, and where that would have been settled', () => {
    const corpus = buildCorpus([
      maker,
      fact({ facet: 'orders', kind: 'Message', name: 'Fill a Crate', placedBy: 'Filler' }),
    ]);
    const said = checkUnsettledActor(corpus, lensAsking(ASKING))[0]!.message;

    expect(said).toContain('Fill a Crate');
    expect(said).toContain('Filler');
    // The Facet as a reader is told it, which is the word the Lens says to call it by.
    expect(said).toContain('Crew');
    // A location is data a renderer decides how to draw, never prose a Check writes.
    expect(said).not.toContain('/');
  });

  it('reports nothing where every request names somebody the corpus settles', () => {
    const corpus = buildCorpus([
      maker,
      packer,
      fact({ facet: 'orders', kind: 'Message', name: 'Make a Widget', placedBy: 'Maker' }),
      fact({ facet: 'orders', kind: 'Message', name: 'Fill a Crate', placedBy: 'Packer' }),
    ]);
    expect(checkUnsettledActor(corpus, lensAsking(ASKING))).toEqual([]);
  });

  it('says nothing at all about a Corpus whose criteria ask nothing about who may make a request', () => {
    // Every corpus read so far. The Check runs against all of them and is named among
    // what was looked for either way, so a reader knows the silence was looked for
    // (LAW-006).
    const corpus = buildCorpus([
      fact({ facet: 'orders', kind: 'Message', name: 'Fill a Crate', placedBy: 'Nobody at all' }),
    ]);
    expect(checkUnsettledActor(corpus, lensAsking(undefined))).toEqual([]);
  });

  it('settles a name written anywhere in the Corpus, not only in the request\'s own Module', () => {
    // Integrity reads one Corpus as one language: a role written down under another
    // Module is written down (ADR-0021's premise, applied to a cast rather than a
    // dictionary).
    const corpus = buildCorpus([
      { ...maker, moduleId: 'beta', containerId: 'beta' },
      fact({ facet: 'orders', kind: 'Message', name: 'Make a Widget', placedBy: 'Maker' }),
    ]);
    expect(checkUnsettledActor(corpus, lensAsking(ASKING))).toEqual([]);
  });
});

describe('a request that says nothing about who may make it', () => {
  it('is left to the criteria and never reported here (ADR-0020)', () => {
    // A missing attribute in one Fact is a shortfall — *write something down* — and it
    // reaches a different person from *these two do not agree*. Reported here it would
    // be both at once, and the Readiness figure would go on saying the Fact is thin.
    const corpus = buildCorpus([
      maker,
      fact({ facet: 'orders', kind: 'Message', name: 'Fill a Crate' }),
      fact({ facet: 'orders', kind: 'Message', name: 'Make a Widget', placedBy: '   ' }),
    ]);
    expect(checkUnsettledActor(corpus, lensAsking(ASKING))).toEqual([]);
  });
});

describe('a corpus writing more than one of them in one place', () => {
  const dividing = { ...ASKING, separatedBy: [' or ', ','] };

  it('reads each as its own, so the one the corpus settles is not reported', () => {
    // The measured failure this exists for: read whole, "Maker or Filler" is a role
    // nobody has written down, reported at a corpus that has written down the Maker.
    const corpus = buildCorpus([
      maker,
      fact({ facet: 'orders', kind: 'Message', name: 'Fill a Crate', placedBy: 'Maker or Filler' }),
    ]);
    const findings = checkUnsettledActor(corpus, lensAsking(dividing));

    expect(findings).toHaveLength(1);
    expect(findings[0]!.message).toContain('Filler');
    expect(findings[0]!.message).not.toContain('Maker');
  });

  it('reads one written whole as one, where the corpus settles the whole of it', () => {
    const corpus = buildCorpus([
      fact({ facet: 'crew', kind: 'Term', name: 'Maker or Filler' }),
      fact({ facet: 'orders', kind: 'Message', name: 'Fill a Crate', placedBy: 'Maker or Filler' }),
    ]);
    // What is written down is what is matched: a corpus that settles the phrase has
    // settled it, and dividing it is not an interpretation this Check may make alone.
    expect(checkUnsettledActor(corpus, lensAsking(dividing))).toHaveLength(2);
    expect(checkUnsettledActor(corpus, lensAsking(ASKING))).toEqual([]);
  });

  it('reports each unsettled one it finds, and one of them once', () => {
    const corpus = buildCorpus([
      maker,
      fact({ facet: 'orders', kind: 'Message', name: 'Fill a Crate', placedBy: 'Filler, Loader or Filler' }),
    ]);
    const findings = checkUnsettledActor(corpus, lensAsking(dividing));

    expect(findings.map((f) => f.message.match(/"([^"]+)" may/)?.[1])).toEqual(['Filler', 'Loader']);
  });

  it('reads several written as a list of their own without being told how they divide', () => {
    // A part written as a list arrives as a list, and a corpus that writes one has
    // already said where each begins (ADR-0029, on Sources read one per line).
    const corpus = buildCorpus([
      maker,
      fact({ facet: 'orders', kind: 'Message', name: 'Fill a Crate', placedBy: ['Maker', 'Filler'] }),
    ]);
    const findings = checkUnsettledActor(corpus, lensAsking(ASKING));

    expect(findings).toHaveLength(1);
    expect(findings[0]!.message).toContain('Filler');
  });
});

describe('both fixture Corpus (ADR-0001)', () => {
  it('reports the one request in corpus A that names somebody its crew does not', async () => {
    const lens = await loadLens(fixturePath('lens-a.json'));
    const { corpus } = await loadCorpus(lens);
    const findings = checkUnsettledActor(corpus, lens);

    expect(findings).toHaveLength(1);
    expect(findings[0]!.message).toContain('Fixer');
    expect(findings[0]!.origin.file).toContain('alpha/orders.md');
  });

  it('reports nothing in corpus B, which writes two of them in one place and settles both', async () => {
    // The other half of the same decision, and the stronger half: without a Lens able
    // to say how this corpus divides two roles, this reads as one role nobody wrote
    // down and reports a defect corpus B does not have.
    const lens = await loadLens(fixturePath('lens-b.json'));
    const { corpus } = await loadCorpus(lens);

    expect(checkUnsettledActor(corpus, lens)).toEqual([]);
  });
});
