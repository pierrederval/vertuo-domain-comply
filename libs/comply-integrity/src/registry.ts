import type { Corpus } from '@vertuo/comply-core';
import type { FactId, SourceLocation } from '@vertuo/comply-core';
import type { Lens } from '@vertuo/comply-lens';

export interface TermEntry {
  canonical: string;
  definition: string;
  factId: FactId;
  moduleId: FactId | null;
  origin: SourceLocation;
}

/**
 * Which Facet settles what a word means, and which attributes hold a Term's name and
 * definition, are both Lens data (LAW-004).
 *
 * Selected by the Facet that says it defines the language and never by Fact Kind
 * (ADR-0021): a corpus routinely writes one word down under several Facets of Terms,
 * saying something different about it each time, and only one of them is a dictionary.
 * Read by Kind, a list of which thing owns the others arrives as a second meaning for a
 * word that has one, and the reading reports a contradiction the corpus does not have.
 *
 * The names come from that same Facet, for the same reason: taken from whichever Facet of
 * Terms happened to be written first, a dictionary sitting second in a Lens is looked up
 * under attribute names it does not use, and every word in it comes back as one nobody has
 * written down yet.
 */
function dictionary(lens: Lens): { facet: string; name: string; definition: string } | null {
  const facet = lens.facets.find((f) => f.definesTerms === true);
  if (facet === undefined) return null;
  // 'name' and 'definition' are core semantic slots: the defining facet is *required* to
  // map onto them (table extractor: a column targets each; otherwise: bodyAttribute names
  // the definition, and the heading extractor emits 'name' itself). comply-lens's schema
  // validates this at load time (see lens.ts), so by the time a Lens reaches here the
  // mapping is guaranteed, not assumed. No corpus vocabulary reaches this file.
  return { facet: facet.name, name: 'name', definition: facet.bodyAttribute ?? 'definition' };
}

export function buildTermRegistry(corpus: Corpus, lens: Lens): TermEntry[] {
  const keys = dictionary(lens);
  if (keys === null) return [];

  return corpus.facts.filter((fact) => fact.facet === keys.facet).flatMap((fact) => {
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
