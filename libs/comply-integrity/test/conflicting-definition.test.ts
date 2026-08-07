import { describe, expect, it } from 'vitest';
import type { Fact } from '@vertuo/comply-core';
import { buildCorpus } from '@vertuo/comply-core';
import type { Profile } from '@vertuo/comply-profile';
import { fixturePath } from '@vertuo/comply-fixtures';
import { loadCorpus } from '@vertuo/comply-ingestion';
import { loadProfile } from '@vertuo/comply-profile';
import { checkConflictingDefinition } from '@vertuo/comply-integrity';
import { buildTermRegistry } from '@vertuo/comply-integrity';

const inlineProfile: Profile = {
  id: 'inline',
  adapter: { kind: 'markdown-frontmatter', root: '.', moduleIdKey: 'area', facetKey: 'kind', statusKey: 'state' },
  facets: [
    { name: 'terms', factKind: 'Term', extractor: 'table', columns: { Word: 'name', Meaning: 'definition' } },
  ],
  maturity: { levels: ['draft', 'agreed'], approvedAtOrAbove: 'agreed' },
  statusMappings: [],
  criteria: {},
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
    const profile = await loadProfile(fixturePath('profile-a.json'));
    const { corpus } = await loadCorpus(profile);
    expect(buildTermRegistry(corpus, profile).map((t) => t.canonical).sort())
      .toEqual(['Cog', 'Sprocket', 'Widget', 'Widget']);
  });

  it('reports one Term defined two different ways, citing both places', async () => {
    const profile = await loadProfile(fixturePath('profile-a.json'));
    const { corpus } = await loadCorpus(profile);
    const findings = checkConflictingDefinition(corpus, profile);

    expect(findings).toHaveLength(1);
    expect(findings[0]!.code).toBe('conflicting-definition');
    expect(findings[0]!.message).toContain('Widget');
    expect(findings[0]!.message).toContain('beta/terms.md');
    expect(findings[0]!.origin.file).toContain('alpha/terms.md');
  });

  it('reports nothing when every Term is defined once', async () => {
    const profile = await loadProfile(fixturePath('profile-b.json'));
    const { corpus } = await loadCorpus(profile);
    expect(checkConflictingDefinition(corpus, profile)).toEqual([]);
  });

  it('does not treat a term left undocumented in one place as a conflict', () => {
    const corpus = buildCorpus([
      termFact({ id: 'alpha#0', moduleId: 'alpha', name: 'Gear', definition: 'A toothed wheel.', file: 'alpha/terms.md', line: 5 }),
      termFact({ id: 'beta#0', moduleId: 'beta', name: 'Gear', file: 'beta/terms.md', line: 5 }),
    ]);
    expect(checkConflictingDefinition(corpus, inlineProfile)).toEqual([]);
  });

  it('still reports a genuine two-way conflict once the undocumented entry is filtered out', () => {
    const corpus = buildCorpus([
      termFact({ id: 'alpha#0', moduleId: 'alpha', name: 'Gear', definition: 'A toothed wheel.', file: 'alpha/terms.md', line: 5 }),
      termFact({ id: 'beta#0', moduleId: 'beta', name: 'Gear', file: 'beta/terms.md', line: 5 }),
      termFact({ id: 'gamma#0', moduleId: 'gamma', name: 'Gear', definition: 'A piece of equipment.', file: 'gamma/terms.md', line: 5 }),
    ]);
    const findings = checkConflictingDefinition(corpus, inlineProfile);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.message).toContain('Gear');
    expect(findings[0]!.message).toContain('gamma/terms.md');
  });
});
