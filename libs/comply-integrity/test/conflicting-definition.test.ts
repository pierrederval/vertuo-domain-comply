import { describe, expect, it } from 'vitest';
import type { Fact } from '@vertuo/comply-core';
import { buildCorpus } from '@vertuo/comply-core';
import type { Lens } from '@vertuo/comply-lens';
import { fixturePath } from '@vertuo/comply-fixtures';
import { loadCorpus } from '@vertuo/comply-ingestion';
import { loadLens } from '@vertuo/comply-lens';
import { checkConflictingDefinition } from '@vertuo/comply-integrity';
import { buildTermRegistry } from '@vertuo/comply-integrity';

const inlineLens: Lens = {
  id: 'inline',
  adapter: { kind: 'markdown-frontmatter', root: '.', moduleIdKey: 'area', facetKey: 'kind', statusKey: 'state' },
  facets: [
    { name: 'terms', factKind: 'Term', extractor: 'table', criteria: [], definesTerms: true, columns: { Word: 'name', Meaning: 'definition' } },
  ],
  maturity: { levels: ['draft', 'agreed'], approvedAtOrAbove: 'agreed' },
  statusMappings: [],
};

function termFact(partial: {
  id: string;
  moduleId: string;
  name: string;
  definition?: string;
  file: string;
  line: number;
}): Fact {
  const attributes: Record<string, string> = { name: partial.name };
  if (partial.definition !== undefined) attributes.definition = partial.definition;
  return {
    id: partial.id,
    kind: 'Term',
    moduleId: partial.moduleId,
    facet: 'terms',
    containerId: partial.moduleId,
    attributes,
    relations: [],
    maturityLevel: null,
    sources: [],
    origin: { file: partial.file, line: partial.line },
  };
}

describe('conflicting definition check', () => {
  it('collects every Term across the corpus', async () => {
    const lens = await loadLens(fixturePath('lens-a.json'));
    const { corpus } = await loadCorpus(lens);
    expect(buildTermRegistry(corpus, lens).map((t) => t.canonical).sort())
      .toEqual(['Cog', 'Sprocket', 'Widget', 'Widget']);
  });

  it('reports one Term defined two different ways, carrying the other location as data, not prose', async () => {
    const lens = await loadLens(fixturePath('lens-a.json'));
    const { corpus } = await loadCorpus(lens);
    const findings = checkConflictingDefinition(corpus, lens);

    expect(findings).toHaveLength(1);
    expect(findings[0]!.code).toBe('conflicting-definition');
    expect(findings[0]!.message).toContain('Widget');
    // The check states the claim only — it must not format a path into the message.
    // Rendering a location is the renderer's decision (see apps/comply-cli/src/render.ts).
    expect(findings[0]!.message).not.toContain('/');
    expect(findings[0]!.origin.file).toContain('alpha/terms.md');
    expect(findings[0]!.relatedOrigins).toBeDefined();
    expect(findings[0]!.relatedOrigins).toHaveLength(1);
    expect(findings[0]!.relatedOrigins![0]!.file).toContain('beta/terms.md');
    expect(findings[0]!.relatedOrigins![0]!.line).toBe(9);
  });

  it('reports nothing when every Term is defined once', async () => {
    const lens = await loadLens(fixturePath('lens-b.json'));
    const { corpus } = await loadCorpus(lens);
    expect(checkConflictingDefinition(corpus, lens)).toEqual([]);
  });

  it('does not treat a term left undocumented in one place as a conflict', () => {
    const corpus = buildCorpus([
      termFact({ id: 'alpha#0', moduleId: 'alpha', name: 'Gear', definition: 'A toothed wheel.', file: 'alpha/terms.md', line: 5 }),
      termFact({ id: 'beta#0', moduleId: 'beta', name: 'Gear', file: 'beta/terms.md', line: 5 }),
    ]);
    expect(checkConflictingDefinition(corpus, inlineLens)).toEqual([]);
  });

  it('still reports a genuine two-way conflict once the undocumented entry is filtered out', () => {
    const corpus = buildCorpus([
      termFact({ id: 'alpha#0', moduleId: 'alpha', name: 'Gear', definition: 'A toothed wheel.', file: 'alpha/terms.md', line: 5 }),
      termFact({ id: 'beta#0', moduleId: 'beta', name: 'Gear', file: 'beta/terms.md', line: 5 }),
      termFact({ id: 'gamma#0', moduleId: 'gamma', name: 'Gear', definition: 'A piece of equipment.', file: 'gamma/terms.md', line: 5 }),
    ]);
    const findings = checkConflictingDefinition(corpus, inlineLens);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.message).toContain('Gear');
    expect(findings[0]!.relatedOrigins).toHaveLength(1);
    expect(findings[0]!.relatedOrigins![0]!.file).toBe('gamma/terms.md');
  });
});
