import type { Fact, FactId, FactKind } from './fact.js';

/** A read-only view over imported Facts. This slice never mutates a Corpus (LAW-003). */
export interface Corpus {
  readonly facts: readonly Fact[];
  byKind(kind: FactKind): Fact[];
  byModule(moduleId: FactId): Fact[];
  byFacet(moduleId: FactId, facet: string): Fact[];
  moduleIds(): FactId[];
  find(id: FactId): Fact | undefined;
}

export function buildCorpus(facts: Fact[]): Corpus {
  const byId = new Map<FactId, Fact>(facts.map((f) => [f.id, f]));
  return {
    facts,
    byKind: (kind) => facts.filter((f) => f.kind === kind),
    byModule: (moduleId) => facts.filter((f) => f.moduleId === moduleId),
    byFacet: (moduleId, facet) =>
      facts.filter((f) => f.moduleId === moduleId && f.facet === facet),
    moduleIds: () => facts.filter((f) => f.kind === 'Module').map((f) => f.id),
    find: (id) => byId.get(id),
  };
}
