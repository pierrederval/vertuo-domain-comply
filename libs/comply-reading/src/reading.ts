import { buildCorpus, type Corpus, type Finding } from '@vertuo/comply-core';
import { INTERPRETATION_CHECKS, interpret } from '@vertuo/comply-ingestion';
import { CHECKS, runChecks } from '@vertuo/comply-integrity';
import { lensDigest, type Lens } from '@vertuo/comply-lens';
import {
  buildMatrix,
  scoreMatrix,
  trend,
  type Matrix,
  type ModuleScore,
  type RecordedReading,
  type TrendRow,
} from '@vertuo/comply-readiness';
import { seedDigest, type Seed } from '@vertuo/comply-seed';

/**
 * When a reading was taken, what knowledge it was made of, and what it is stated
 * against.
 *
 * The knowledge arrives as a digest rather than as the Seed: what a reading needs
 * from the Seed to be comparable is its identity, and a Corpus built from it is
 * already the first argument. Named together so that two values of the same shape —
 * a moment and a digest — cannot be handed over the wrong way round in silence.
 */
export interface AsRead {
  takenAt: string;
  /** The knowledge this reading was made from, as the Seed's digest. */
  seedDigest: string;
  /** The last reading on record for this Lens, or nothing where there is none. */
  previous: RecordedReading | null;
}

export interface Reading {
  /** Which Lens the knowledge was read through. */
  lensId: string;
  /** When this reading was taken. */
  takenAt: string;
  /**
   * The knowledge this reading was made from.
   *
   * Carried rather than left behind. A figure invites the question *what is it
   * made of*, and every surface that answers it needs the Facts the figures were
   * counted over. The alternative is applying the Lens a second time to answer —
   * a second route from a Seed to knowledge, which is how two answers to one
   * question appear (ADR-0012).
   *
   * A view and never a copy: nothing downstream may write to a Corpus (LAW-002),
   * and `Corpus` has no operation that could.
   */
  corpus: Corpus;
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
  /**
   * Per Module, against `previous`. Three statements and never two: no baseline,
   * a baseline read through other criteria, and a delta.
   */
  trend: TrendRow[];
  /**
   * This reading in the form it goes on record in, naming both the inputs it is a
   * function of. Whether it *is* recorded is decided by whether either of them has
   * changed, and that is the caller's business (ADR-0016).
   */
  asRecorded: RecordedReading;
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
 * Pure, given what it was read from and what it is stated against: holding
 * readings and putting them on record is the caller's business.
 */
export function composeReading(
  corpus: Corpus,
  lens: Lens,
  interpretationFindings: Finding[],
  { takenAt, seedDigest: knowledge, previous }: AsRead,
): Reading {
  const matrix = buildMatrix(corpus, lens);
  const scores = scoreMatrix(matrix);
  const asRecorded: RecordedReading = {
    takenAt,
    lensId: lens.id,
    seedDigest: knowledge,
    // Taken over what the Lens says and not over where it points, so a checkout
    // that moved is not a change of criteria (see `lensDigest`).
    lensDigest: lensDigest(lens),
    scores,
  };

  return {
    lensId: lens.id,
    takenAt,
    corpus,
    matrix,
    scores,
    findings: [...interpretationFindings, ...runChecks(corpus, lens)],
    checks: [...INTERPRETATION_CHECKS, ...CHECKS.map((check) => check.name)],
    trend: trend(asRecorded, previous),
    asRecorded,
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
  previous: RecordedReading | null,
): Reading {
  const { facts, findings } = interpret(seed, lens);
  return composeReading(buildCorpus(facts), lens, findings, {
    takenAt,
    seedDigest: seedDigest(seed),
    previous,
  });
}
