import type { FactId } from '@vertuo/comply-core';
import type { Matrix } from './matrix.js';

export interface ModuleScore {
  moduleId: FactId;
  owner: string | null;
  /** Denominator: the number of facets the Profile declares (LAW-006). */
  total: number;
  present: number;
  wellFormed: number;
  approved: number;
}

const AT_LEAST_PRESENT = new Set(['present', 'well-formed', 'approved']);
const AT_LEAST_WELL_FORMED = new Set(['well-formed', 'approved']);

export function scoreMatrix(matrix: Matrix): ModuleScore[] {
  return matrix.rows.map((row) => ({
    moduleId: row.moduleId,
    owner: row.owner,
    total: row.cells.length,
    present: row.cells.filter((c) => AT_LEAST_PRESENT.has(c.state)).length,
    wellFormed: row.cells.filter((c) => AT_LEAST_WELL_FORMED.has(c.state)).length,
    approved: row.cells.filter((c) => c.state === 'approved').length,
  }));
}
