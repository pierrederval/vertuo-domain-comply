import { relative } from 'node:path';
import type { Finding } from '@vertuo/comply-core';
import type { FacetState, Matrix } from '@vertuo/comply-readiness';
import type { ModuleScore } from '@vertuo/comply-readiness';
import type { TrendRow } from '@vertuo/comply-readiness';
import type { UnmetCriterion } from '@vertuo/comply-readiness';
import type { WhatWasRead } from '@vertuo/comply-seed';

const MARK: Record<FacetState, string> = {
  absent: '--',
  present: '..',
  'well-formed': '~~',
  approved: 'OK',
};

function pad(value: string, width: number): string {
  return value.length >= width ? value : value + ' '.repeat(width - value.length);
}

/**
 * One unmet criterion, in words.
 *
 * Written here, one sentence per kind of shortfall, rather than taken as a
 * sentence from what computed it. A reason arrives as its parts — what is
 * missing, how many there are against how many are asked for — and every
 * surface phrases them for the person in front of it. This one writes for a
 * terminal; the criterion's own name is not something a person needs to read.
 */
function reasonFor(unmet: UnmetCriterion): string {
  switch (unmet.criterion) {
    case 'requiredAttributes':
      return `missing: ${unmet.missing.join(', ')}`;
    case 'minSources':
      return `backed by ${unmet.has} of the ${unmet.needs} sources this Lens asks for`;
    case 'minRelations':
      return `${unmet.has} of the ${unmet.needs} "${unmet.relation}" links this Lens asks for`;
    case 'allStatesReachable':
      return `nothing leads to: ${unmet.unreachable.join(', ')}`;
  }
}

/**
 * Every facet that exists but is not approved, with the reason it fell short.
 *
 * A grid of marks tells an owner that something is unfinished and never what to
 * do about it, so the owner has to go and work that out for themselves — which
 * is how a finding that technically reached someone still gets ignored
 * (LAW-007). A cell short on content carries its unmet criteria; a cell whose
 * content is sufficient and is simply unapproved says exactly that, and the two
 * are never conflated because they are different work.
 *
 * The approved rung is not named here: the ladder's step names are corpus data
 * and this renderer is not given the ladder (LAW-004).
 */
function renderShortfalls(matrix: Matrix): string[] {
  const entries = matrix.rows.flatMap((row) =>
    row.cells
      .filter((cell) => cell.state === 'present' || cell.state === 'well-formed')
      .map((cell) => {
        const reasons =
          cell.unmet.length > 0
            ? cell.unmet.map(reasonFor)
            : ['not at the approved maturity level'];
        return [`  ${row.moduleId} / ${cell.facet}`, ...reasons.map((r) => `      ${r}`)].join('\n');
      }),
  );

  return entries.length === 0 ? [] : ['', 'Facets not yet approved:', ...entries];
}

export function renderMatrix(
  matrix: Matrix,
  scores: ModuleScore[],
  trendRows: TrendRow[],
  read: WhatWasRead,
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
    'Denominator is the facets this Lens declares. Knowledge absent from the corpus entirely is not counted.',
    // Stated whether or not anything was set aside. A figure that appears only when
    // it is not zero is one a reader has to already know to look for, and its
    // absence then reads as nothing having been left out (LAW-006).
    `Knowledge as found: ${read.read} of ${read.found} read, ${read.setAside} set aside.`,
    'Set aside is what a facet said was none of its own. It is judged by nothing, and left out of nothing silently.',
    `Legend: ${MARK.approved} approved  ${MARK['well-formed']} well-formed  ${MARK.present} present  ${MARK.absent} absent`,
    ...renderShortfalls(matrix),
  ].join('\n');
}

/**
 * `corpusRoot` is the Lens's resolved adapter root (`lens.adapter.root`).
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
