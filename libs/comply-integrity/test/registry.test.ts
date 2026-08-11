import { describe, expect, it } from 'vitest';
import type { Fact } from '@vertuo/comply-core';
import { buildCorpus } from '@vertuo/comply-core';
import type { Lens } from '@vertuo/comply-lens';
import { fixturePath } from '@vertuo/comply-fixtures';
import { loadCorpus } from '@vertuo/comply-ingestion';
import { loadLens } from '@vertuo/comply-lens';
import { buildTermRegistry } from '@vertuo/comply-integrity';

const adapter = {
  kind: 'markdown-frontmatter',
  root: '.',
  moduleIdKey: 'area',
  facetKey: 'kind',
  statusKey: 'state',
} as const;

const maturity = { levels: ['draft', 'agreed'], approvedAtOrAbove: 'agreed' };

/**
 * Two facets of Terms whose attribute names differ, with the dictionary written
 * second. Reading the first facet's names — which is what selecting by Fact Kind
 * came to — looks for a meaning under a name the dictionary never uses, and every
 * entry comes back with none.
 */
const lensWithTwoWordFacets: Lens = {
  id: 'inline',
  adapter,
  facets: [
    { name: 'aggregates', factKind: 'Term', extractor: 'heading', criteria: [], bodyAttribute: 'owns' },
    {
      name: 'glossary', factKind: 'Term', extractor: 'table', criteria: [], definesTerms: true,
      columns: { Word: 'name', Meaning: 'definition' },
    },
  ],
  maturity,
  statusMappings: [],
};

function termFact(partial: {
  facet: string;
  name: string;
  attribute: string;
  value: string;
}): Fact {
  return {
    id: `alpha#${partial.facet}#${partial.name}`,
    kind: 'Term',
    moduleId: 'alpha',
    facet: partial.facet,
    containerId: 'alpha',
    attributes: { name: partial.name, [partial.attribute]: partial.value },
    relations: [],
    maturityLevel: null,
    sources: [],
    origin: { file: `alpha/${partial.facet}.md`, line: 5 },
  };
}

describe('the facet that defines the language (ADR-0021)', () => {
  it('reads the defining facet\'s own attribute names, not the first facet of Terms\'', () => {
    const corpus = buildCorpus([
      termFact({ facet: 'aggregates', name: 'Widget', attribute: 'owns', value: 'A Sprocket.' }),
      termFact({ facet: 'glossary', name: 'Widget', attribute: 'definition', value: 'A thing that is made.' }),
    ]);

    const registry = buildTermRegistry(corpus, lensWithTwoWordFacets);

    expect(registry).toHaveLength(1);
    // Not merely present: read through the wrong facet's names it would be here with
    // nothing in it, and an entry with no meaning is skipped as one not yet written down
    // rather than reported. So the defect this repairs is silent unless the meaning is
    // what the assertion is about.
    expect(registry[0]!.definition).toBe('A thing that is made.');
    expect(registry[0]!.origin.file).toBe('alpha/glossary.md');
  });

  it('leaves out a facet that defines nothing even when it names its body attribute "definition"', () => {
    // The accident ADR-0021 refused to keep resting on. One word in a Lens, and a list of
    // which thing owns the others became seventeen word definitions judged against a
    // dictionary they were never meant to enter.
    const lens: Lens = {
      ...lensWithTwoWordFacets,
      facets: [
        { name: 'aggregates', factKind: 'Term', extractor: 'heading', criteria: [], bodyAttribute: 'definition' },
        lensWithTwoWordFacets.facets[1]!,
      ],
    };
    const corpus = buildCorpus([
      termFact({ facet: 'aggregates', name: 'Widget', attribute: 'definition', value: 'The root of everything here.' }),
      termFact({ facet: 'glossary', name: 'Widget', attribute: 'definition', value: 'A thing that is made.' }),
    ]);

    expect(buildTermRegistry(corpus, lens).map((entry) => entry.definition))
      .toEqual(['A thing that is made.']);
  });

  it('holds no words at all for a lens that declares no facet of Terms', () => {
    const lens: Lens = {
      ...lensWithTwoWordFacets,
      facets: [{ name: 'rules', factKind: 'Rule', extractor: 'heading', criteria: [], bodyAttribute: 'statement' }],
    };
    const corpus = buildCorpus([
      termFact({ facet: 'glossary', name: 'Widget', attribute: 'definition', value: 'A thing that is made.' }),
    ]);

    expect(buildTermRegistry(corpus, lens)).toEqual([]);
  });

  it('holds the dictionary and not the second facet of Terms beside it, in a real corpus', async () => {
    // ADR-0001: the same reading against a Corpus on disk, whose second facet of Terms
    // writes down one of the dictionary's own words and means something else by it.
    const lens = await loadLens(fixturePath('lens-a.json'));
    const { corpus } = await loadCorpus(lens);

    expect(corpus.byKind('Term')).toHaveLength(5);
    expect(buildTermRegistry(corpus, lens).map((entry) => entry.canonical).sort())
      .toEqual(['Cog', 'Sprocket', 'Widget', 'Widget']);
  });
});
