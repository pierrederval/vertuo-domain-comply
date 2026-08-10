import type { Corpus } from '@vertuo/comply-core';
import type { FactId } from '@vertuo/comply-core';
import { isApproved } from '@vertuo/comply-lens';
import type { Lens } from '@vertuo/comply-lens';
import { allModuleIds, resolveOwners } from './owner.js';
import { evaluateFacet, evaluateFact } from './wellformed.js';

export type FacetState = 'absent' | 'present' | 'well-formed' | 'approved';

export interface MatrixCell {
  moduleId: FactId;
  facet: string;
  state: FacetState;
  factCount: number;
  unmet: string[];
}

export interface ModuleRow {
  moduleId: FactId;
  owner: string | null;
  cells: MatrixCell[];
}

export interface Matrix {
  lensId: string;
  facets: string[];
  rows: ModuleRow[];
}

export function buildMatrix(corpus: Corpus, lens: Lens): Matrix {
  const { owners } = resolveOwners(corpus, lens);
  const facets = lens.facets.map((f) => f.name);

  const rows: ModuleRow[] = allModuleIds(corpus).map((moduleId) => ({
    moduleId,
    owner: owners.get(moduleId) ?? null,
    cells: lens.facets.map((facet) => {
      const facts =
        facet.factKind === 'Module'
          ? corpus.facts.filter((f) => f.id === moduleId && f.facet === facet.name)
          : corpus.byFacet(moduleId, facet.name);

      if (facts.length === 0) {
        return { moduleId, facet: facet.name, state: 'absent' as const, factCount: 0, unmet: [] };
      }

      const unmet = [
        ...facts.flatMap((f) => evaluateFact(f, lens).map((u) => `${u.criterion}: ${u.detail}`)),
        ...evaluateFacet(facts, facet.factKind, lens).map((u) => `${u.criterion}: ${u.detail}`),
      ];

      const wellFormed = unmet.length === 0;
      const approved = wellFormed && facts.every((f) => isApproved(lens, f.maturityLevel));

      return {
        moduleId,
        facet: facet.name,
        state: approved ? ('approved' as const) : wellFormed ? ('well-formed' as const) : ('present' as const),
        factCount: facts.length,
        unmet,
      };
    }),
  }));

  return { lensId: lens.id, facets, rows };
}
