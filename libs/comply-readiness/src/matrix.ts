import type { Corpus } from '@vertuo/comply-core';
import type { FactId } from '@vertuo/comply-core';
import { isApproved } from '@vertuo/comply-profile';
import type { Profile } from '@vertuo/comply-profile';
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
  profileId: string;
  facets: string[];
  rows: ModuleRow[];
}

export function buildMatrix(corpus: Corpus, profile: Profile): Matrix {
  const { owners } = resolveOwners(corpus, profile);
  const facets = profile.facets.map((f) => f.name);

  const rows: ModuleRow[] = allModuleIds(corpus).map((moduleId) => ({
    moduleId,
    owner: owners.get(moduleId) ?? null,
    cells: profile.facets.map((facet) => {
      const facts =
        facet.factKind === 'Module'
          ? corpus.facts.filter((f) => f.id === moduleId && f.facet === facet.name)
          : corpus.byFacet(moduleId, facet.name);

      if (facts.length === 0) {
        return { moduleId, facet: facet.name, state: 'absent' as const, factCount: 0, unmet: [] };
      }

      const unmet = [
        ...facts.flatMap((f) => evaluateFact(f, profile).map((u) => `${u.criterion}: ${u.detail}`)),
        ...evaluateFacet(facts, facet.factKind, profile).map((u) => `${u.criterion}: ${u.detail}`),
      ];

      const wellFormed = unmet.length === 0;
      const approved = wellFormed && facts.every((f) => isApproved(profile, f.maturityLevel));

      return {
        moduleId,
        facet: facet.name,
        state: approved ? ('approved' as const) : wellFormed ? ('well-formed' as const) : ('present' as const),
        factCount: facts.length,
        unmet,
      };
    }),
  }));

  return { profileId: profile.id, facets, rows };
}
