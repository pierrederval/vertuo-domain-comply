import type { Fact } from '@vertuo/comply-core';
import type { FacetSpec } from '@vertuo/comply-lens';

/**
 * Why one criterion was not met, as the parts of the reason and never as a
 * sentence.
 *
 * A reason reaches a person as words, and the words belong to whatever surface
 * is speaking to them: a terminal, a page, and one day a Change Request each
 * phrase the same shortfall differently. What none of them may say is
 * `requiredAttributes: missing: description` — a shortfall stated in the
 * vocabulary of the thing that computed it, which is exactly what this type
 * produced when it carried a flattened `detail` string, and it reached readers
 * through the runner.
 *
 * Carrying the parts has a second effect worth having. A guard can only read
 * text that is written down as text, so a sentence assembled from data at
 * runtime is invisible to it. With the parts as data, every sentence a reader
 * can meet is a literal in some surface's source, where LAW-010 is enforceable
 * rather than merely intended.
 *
 * The tags are the Lens's own criterion type names (`Criterion['type']`), so a
 * person reading a Lens and a person reading a shortfall are told about the same
 * thing in the same word.
 */
export type UnmetCriterion =
  | { criterion: 'requiredAttributes'; missing: string[] }
  | { criterion: 'minSources'; has: number; needs: number }
  | { criterion: 'minRelations'; relation: string; has: number; needs: number }
  | { criterion: 'allStatesReachable'; unreachable: string[] };

function attributeIsPresent(fact: Fact, name: string): boolean {
  const value = fact.attributes[name];
  if (value === undefined) return false;
  return Array.isArray(value) ? value.length > 0 : value.trim() !== '';
}

/**
 * Criteria evaluated against one Fact in isolation.
 *
 * Judged against the Facet it was written under rather than against its Fact
 * Kind (ADR-0019), so two Facets that share a Kind can ask for different things.
 * Takes the Facet and not the whole Lens: what counts as enough here is the
 * Facet's own business, and a unit handed the entire Lens invites reaching for
 * the rest of it.
 */
export function evaluateFact(fact: Fact, facet: FacetSpec): UnmetCriterion[] {
  const unmet: UnmetCriterion[] = [];
  for (const criterion of facet.criteria) {
    switch (criterion.type) {
      case 'requiredAttributes': {
        const missing = criterion.attributes.filter((a) => !attributeIsPresent(fact, a));
        if (missing.length > 0) {
          unmet.push({ criterion: 'requiredAttributes', missing });
        }
        break;
      }
      case 'minSources': {
        if (fact.sources.length < criterion.count) {
          unmet.push({
            criterion: 'minSources',
            has: fact.sources.length,
            needs: criterion.count,
          });
        }
        break;
      }
      case 'minRelations': {
        const has = fact.relations.filter((r) => r.type === criterion.relation).length;
        if (has < criterion.count) {
          unmet.push({
            criterion: 'minRelations',
            relation: criterion.relation,
            has,
            needs: criterion.count,
          });
        }
        break;
      }
      case 'allStatesReachable':
        break; // evaluated across a facet, not per fact
    }
  }
  return unmet;
}

/** Criteria that need every Fact under a Facet at once. */
export function evaluateFacet(facts: Fact[], facet: FacetSpec): UnmetCriterion[] {
  const unmet: UnmetCriterion[] = [];
  for (const criterion of facet.criteria) {
    if (criterion.type !== 'allStatesReachable') continue;
    if (facts.length === 0) continue;

    const edges = facts.flatMap((f) => {
      const from = f.attributes[criterion.fromAttribute];
      const to = f.attributes[criterion.toAttribute];
      return typeof from === 'string' && typeof to === 'string' ? [[from, to] as const] : [];
    });

    const states = new Set(edges.flat());
    const targets = new Set(edges.map(([, to]) => to));
    const roots = [...states].filter((s) => !targets.has(s));

    const reached = new Set(roots);
    const queue = [...roots];
    while (queue.length > 0) {
      const state = queue.shift()!;
      for (const [from, to] of edges) {
        if (from === state && !reached.has(to)) { reached.add(to); queue.push(to); }
      }
    }

    const orphans = [...states].filter((s) => !reached.has(s)).sort();
    if (orphans.length > 0) {
      unmet.push({ criterion: 'allStatesReachable', unreachable: orphans });
    }
  }
  return unmet;
}
