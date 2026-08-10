import type { Corpus, Finding } from '@vertuo/comply-core';
import type { Lens } from '@vertuo/comply-lens';
import { runChecks } from '@vertuo/comply-integrity';
import {
  buildMatrix, scoreMatrix, trend, type Snapshot,
} from '@vertuo/comply-readiness';
import { renderFindings, renderMatrix } from './render.js';

export interface Reading {
  /** The figures this reading produced, ready to become the next baseline. */
  snapshot: Snapshot;
  text: string;
}

/**
 * The whole of what the runner says about a Corpus, in one place.
 *
 * Composition lives here rather than in `main()` so a test can assert the exact
 * output without reproducing the order the pieces go in. That order is itself
 * behaviour: the two readings are printed as two separate blocks and are never
 * fused into one figure.
 *
 * Pure, given `takenAt` and `previous`. Reading and writing snapshots is the
 * caller's business, so this function is deterministic and testable.
 */
export function readCorpus(
  corpus: Corpus,
  lens: Lens,
  importFindings: Finding[],
  takenAt: string,
  previous: Snapshot | null,
): Reading {
  const matrix = buildMatrix(corpus, lens);
  const scores = scoreMatrix(matrix);
  const snapshot: Snapshot = { takenAt, lensId: lens.id, scores };

  const text = [
    renderMatrix(matrix, scores, trend(snapshot, previous)),
    '',
    renderFindings([...importFindings, ...runChecks(corpus, lens)], lens.adapter.root),
  ].join('\n');

  return { snapshot, text };
}
