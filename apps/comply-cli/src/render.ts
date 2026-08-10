import { relative } from 'node:path';
import type { Finding } from '@vertuo/comply-core';
import type { FacetState, Matrix } from '@vertuo/comply-readiness';
import type { ModuleScore } from '@vertuo/comply-readiness';
import type { TrendRow } from '@vertuo/comply-readiness';

const MARK: Record<FacetState, string> = {
  absent: '--',
  present: '..',
  'well-formed': '~~',
  approved: 'OK',
};

function pad(value: string, width: number): string {
  return value.length >= width ? value : value + ' '.repeat(width - value.length);
}

export function renderMatrix(
  matrix: Matrix,
  scores: ModuleScore[],
  trendRows: TrendRow[],
): string {
  const nameWidth = Math.max(8, ...matrix.rows.map((r) => r.moduleId.length));
  const facetWidth = Math.max(6, ...matrix.facets.map((f) => f.length + 1));

  const header =
    pad('MODULE', nameWidth) + '  ' +
    matrix.facets.map((f) => pad(f, facetWidth)).join('') +
    pad('APPROVED', 10) + pad('TREND', 7) + 'OWNER';

  const lines = matrix.rows.map((row) => {
    const score = scores.find((s) => s.moduleId === row.moduleId)!;
    // No trend row for this module means the same thing as an explicit null: no
    // prior figure to compare against. Never render that as "no change" (LAW-006).
    const delta = trendRows.find((t) => t.moduleId === row.moduleId)?.approvedDelta ?? null;
    const deltaText = delta === null ? 'n/a' : delta === 0 ? '·' : delta > 0 ? `+${delta}` : String(delta);
    return (
      pad(row.moduleId, nameWidth) + '  ' +
      row.cells.map((c) => pad(MARK[c.state], facetWidth)).join('') +
      pad(`${score.approved}/${score.total}`, 10) +
      pad(deltaText, 7) +
      (row.owner ?? 'NO OWNER')
    );
  });

  const totalCells = scores.reduce((sum, s) => sum + s.total, 0);
  const approvedCells = scores.reduce((sum, s) => sum + s.approved, 0);

  return [
    header,
    '-'.repeat(header.length),
    ...lines,
    '-'.repeat(header.length),
    `Approved facets: ${approvedCells}/${totalCells} across ${scores.length} modules.`,
    'Denominator is the facets this Profile declares. Knowledge absent from the corpus entirely is not counted.',
    `Legend: ${MARK.approved} approved  ${MARK['well-formed']} well-formed  ${MARK.present} present  ${MARK.absent} absent`,
  ].join('\n');
}

/**
 * `corpusRoot` is the Profile's resolved adapter root (`profile.adapter.root`).
 * Origins are stored as absolute paths internally (LAW-009 needs a path a human
 * can open), but displaying that absolute path bakes the machine it ran on into
 * the output — it can't be shared, diffed across machines, or pasted into a
 * ticket. Rendering relativises against the corpus root; nothing upstream changes.
 */
export function renderFindings(findings: Finding[], corpusRoot: string): string {
  if (findings.length === 0) return 'No findings.';
  const lines = findings.map((f) => {
    const related = (f.relatedOrigins ?? [])
      .map((o) => `        also: ${relative(corpusRoot, o.file)}:${o.line}`)
      .join('\n');
    return (
      `  [${f.code}] ${relative(corpusRoot, f.origin.file)}:${f.origin.line}\n      ${f.message}` +
      (related === '' ? '' : `\n${related}`)
    );
  });
  return [`Findings (${findings.length}):`, ...lines].join('\n');
}
