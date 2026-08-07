import type { Corpus } from '@vertuo/comply-core';
import type { FactId, SourceLocation } from '@vertuo/comply-core';
import type { Profile } from '@vertuo/comply-profile';

export interface TermEntry {
  canonical: string;
  definition: string;
  factId: FactId;
  moduleId: FactId | null;
  origin: SourceLocation;
}

/** Which attribute holds a Term's name and definition is Profile data (LAW-004). */
function termAttributes(profile: Profile): { name: string; definition: string } | null {
  const facet = profile.facets.find((f) => f.factKind === 'Term');
  if (facet === undefined) return null;
  // 'name' and 'definition' are core semantic slots: every Term facet is *required* to map
  // onto them (table extractor: a column targets each; otherwise: bodyAttribute names the
  // definition, and the heading extractor emits 'name' itself). comply-profile's schema
  // validates this at load time (see profile.ts), so by the time a Profile reaches here the
  // mapping is guaranteed, not assumed. No corpus vocabulary reaches this file.
  return { name: 'name', definition: facet.bodyAttribute ?? 'definition' };
}

export function buildTermRegistry(corpus: Corpus, profile: Profile): TermEntry[] {
  const keys = termAttributes(profile);
  if (keys === null) return [];

  return corpus.byKind('Term').flatMap((fact) => {
    const canonical = fact.attributes[keys.name];
    const definition = fact.attributes[keys.definition];
    if (typeof canonical !== 'string' || canonical.trim() === '') return [];
    return [{
      canonical: canonical.trim(),
      definition: typeof definition === 'string' ? definition.trim() : '',
      factId: fact.id,
      moduleId: fact.moduleId,
      origin: fact.origin,
    }];
  });
}
