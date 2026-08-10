import type { Corpus, Fact } from '@vertuo/comply-core';
import type { FactId } from '@vertuo/comply-core';
import { isApproved } from '@vertuo/comply-lens';
import type { FacetSpec, Lens } from '@vertuo/comply-lens';
import { allModuleIds, resolveOwners } from './owner.js';
import { evaluateFacet, evaluateFact, type UnmetCriterion } from './wellformed.js';

export type FacetState = 'absent' | 'present' | 'well-formed' | 'approved';

export interface MatrixCell {
  moduleId: FactId;
  facet: string;
  state: FacetState;
  factCount: number;
  /**
   * Why this cell is not well-formed, as the parts of each reason. Empty for a
   * cell that is well-formed, and for one with nothing in it at all — an absent
   * cell falls short of nothing, it is simply unwritten.
   */
  unmet: UnmetCriterion[];
  /**
   * How many of the Facts here have not reached the step this Corpus counts as
   * approved. Stated against `factCount`, which is what it is out of (LAW-006).
   *
   * Computed here rather than left to a caller, because whether a Fact is
   * approved is a reading of what its Maturity means and every such reading
   * belongs on this side of the line (spec §3.2).
   */
  notYetApproved: number;
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

/**
 * The Facts one Module has written down under one Facet.
 *
 * One rule, exported, because more than the Matrix asks this question: a Module
 * shown on its own has to list the same knowledge the grid counted, and two
 * selections would be two answers to one question — the kind that disagree
 * quietly and only about the awkward cases. A Module's own Facet is the Module
 * Fact itself, which carries no `moduleId` of its own.
 */
/**
 * The distinct reasons a Facet falls short.
 *
 * Every Fact under a Facet is judged on its own, so two of them missing the same
 * thing produce the same reason twice. What a reader is owed is the work, and
 * that is one job rather than two: a reason names what is missing and never
 * which Fact is missing it, so a repeat says nothing a person could act on
 * differently. Reasons that differ — one short of two Sources, another short of
 * three — are different jobs and all survive.
 */
function distinct(unmet: UnmetCriterion[]): UnmetCriterion[] {
  const met = new Set<string>();
  return unmet.filter((reason) => {
    const said = JSON.stringify(reason);
    if (met.has(said)) return false;
    met.add(said);
    return true;
  });
}

export function factsUnder(corpus: Corpus, moduleId: FactId, facet: FacetSpec): Fact[] {
  return facet.factKind === 'Module'
    ? corpus.facts.filter((f) => f.id === moduleId && f.facet === facet.name)
    : corpus.byFacet(moduleId, facet.name);
}

export function buildMatrix(corpus: Corpus, lens: Lens): Matrix {
  const { owners } = resolveOwners(corpus, lens);
  const facets = lens.facets.map((f) => f.name);

  const rows: ModuleRow[] = allModuleIds(corpus).map((moduleId) => ({
    moduleId,
    owner: owners.get(moduleId) ?? null,
    cells: lens.facets.map((facet) => {
      const facts = factsUnder(corpus, moduleId, facet);

      if (facts.length === 0) {
        return {
          moduleId,
          facet: facet.name,
          state: 'absent' as const,
          factCount: 0,
          unmet: [],
          notYetApproved: 0,
        };
      }

      const unmet = distinct([
        ...facts.flatMap((f) => evaluateFact(f, lens)),
        ...evaluateFacet(facts, facet.factKind, lens),
      ]);

      const notYetApproved = facts.filter((f) => !isApproved(lens, f.maturityLevel)).length;
      const wellFormed = unmet.length === 0;
      const approved = wellFormed && notYetApproved === 0;

      return {
        moduleId,
        facet: facet.name,
        state: approved ? ('approved' as const) : wellFormed ? ('well-formed' as const) : ('present' as const),
        factCount: facts.length,
        unmet,
        notYetApproved,
      };
    }),
  }));

  return { lensId: lens.id, facets, rows };
}
