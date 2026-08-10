import type { Fact, FactKind } from '@vertuo/comply-core';
import type { Criterion, Lens } from '@vertuo/comply-lens';

export interface UnmetCriterion {
  criterion: Criterion['type'];
  detail: string;
}

function attributeIsPresent(fact: Fact, name: string): boolean {
  const value = fact.attributes[name];
  if (value === undefined) return false;
  return Array.isArray(value) ? value.length > 0 : value.trim() !== '';
}

/** Criteria evaluated against one Fact in isolation. */
export function evaluateFact(fact: Fact, lens: Lens): UnmetCriterion[] {
  const unmet: UnmetCriterion[] = [];
  for (const criterion of lens.criteria[fact.kind] ?? []) {
    switch (criterion.type) {
      case 'requiredAttributes': {
        const missing = criterion.attributes.filter((a) => !attributeIsPresent(fact, a));
        if (missing.length > 0) {
          unmet.push({ criterion: 'requiredAttributes', detail: `missing: ${missing.join(', ')}` });
        }
        break;
      }
      case 'minSources': {
        if (fact.sources.length < criterion.count) {
          unmet.push({
            criterion: 'minSources',
            detail: `has ${fact.sources.length}, needs ${criterion.count}`,
          });
        }
        break;
      }
      case 'minRelations': {
        const count = fact.relations.filter((r) => r.type === criterion.relation).length;
        if (count < criterion.count) {
          unmet.push({
            criterion: 'minRelations',
            detail: `has ${count} "${criterion.relation}", needs ${criterion.count}`,
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

/** Criteria that need every Fact in a facet at once. */
export function evaluateFacet(
  facts: Fact[],
  kind: FactKind,
  lens: Lens,
): UnmetCriterion[] {
  const unmet: UnmetCriterion[] = [];
  for (const criterion of lens.criteria[kind] ?? []) {
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
      unmet.push({
        criterion: 'allStatesReachable',
        detail: `unreachable: ${orphans.join(', ')}`,
      });
    }
  }
  return unmet;
}
