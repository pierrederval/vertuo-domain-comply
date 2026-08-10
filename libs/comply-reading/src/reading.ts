import { buildCorpus, type Corpus, type Finding } from '@vertuo/comply-core';
import { INTERPRETATION_CHECKS, interpret } from '@vertuo/comply-ingestion';
import { CHECKS, runChecks } from '@vertuo/comply-integrity';
import type { Lens } from '@vertuo/comply-lens';
import {
  buildMatrix,
  scoreMatrix,
  trend,
  type Matrix,
  type ModuleScore,
  type Snapshot,
  type TrendRow,
} from '@vertuo/comply-readiness';
import type { Seed } from '@vertuo/comply-seed';

export interface Reading {
  /** Which Lens the knowledge was read through. */
  lensId: string;
  /** When this reading was taken. */
  takenAt: string;
  matrix: Matrix;
  /** Per Module, approved out of the Facets the Lens declares. */
  scores: ModuleScore[];
  /**
   * Every open Finding, in the order it was found: what reading the knowledge in
   * reported first, then what the Checks against the whole Corpus reported.
   */
  findings: Finding[];
  /**
   * What was looked for, and so what the Findings count is stated against
   * (LAW-006). Never a total of anything — a set of names.
   */
  checks: string[];
  /** Per Module, against `previous`. Null entries mean no baseline, never no change. */
  trend: TrendRow[];
  /** These figures, ready to become the next baseline. */
  snapshot: Snapshot;
}

/**
 * The two readings of a Corpus, assembled in one place.
 *
 * Readiness and Integrity are computed independently and returned side by side.
 * Nothing here fuses them, averages them, or derives a third figure from them:
 * they answer different questions, demand different work, and often different
 * people, so a surface that combines them hides which one is failing (LAW-006,
 * and `UBIQUITOUS_LANGUAGE.md` on both terms).
 *
 * This is an application service and owns no rules of its own. It exists because
 * the runner and the server both need this composition, and two copies of it
 * would be two answers to one question.
 *
 * Pure, given `takenAt` and `previous`: holding and reading baselines is the
 * caller's business.
 */
export function composeReading(
  corpus: Corpus,
  lens: Lens,
  interpretationFindings: Finding[],
  takenAt: string,
  previous: Snapshot | null,
): Reading {
  const matrix = buildMatrix(corpus, lens);
  const scores = scoreMatrix(matrix);
  const snapshot: Snapshot = { takenAt, lensId: lens.id, scores };

  return {
    lensId: lens.id,
    takenAt,
    matrix,
    scores,
    findings: [...interpretationFindings, ...runChecks(corpus, lens)],
    checks: [...INTERPRETATION_CHECKS, ...CHECKS.map((check) => check.name)],
    trend: trend(snapshot, previous),
    snapshot,
  };
}

/**
 * The whole route from knowledge as found to a reading of it: apply the Lens,
 * then compose.
 *
 * The route the server takes, and the one the runner takes when it has no Seed
 * to hand. There is no shorter path that skips the Seed, because a second route
 * to knowledge is how two answers to one question appear (ADR-0012).
 */
export function readSeededCorpus(
  seed: Seed,
  lens: Lens,
  takenAt: string,
  previous: Snapshot | null,
): Reading {
  const { facts, findings } = interpret(seed, lens);
  return composeReading(buildCorpus(facts), lens, findings, takenAt, previous);
}
