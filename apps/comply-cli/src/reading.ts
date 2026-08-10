import type { Corpus, Finding } from '@vertuo/comply-core';
import type { Lens } from '@vertuo/comply-lens';
import { composeReading } from '@vertuo/comply-reading';
import type { Snapshot } from '@vertuo/comply-readiness';
import { renderFindings, renderMatrix } from './render.js';

export interface Reading {
  /** The figures this reading produced, ready to become the next baseline. */
  snapshot: Snapshot;
  text: string;
}

/**
 * What the runner says about a Corpus: the reading, put into words.
 *
 * The reading itself is `libs/comply-reading`'s, so the runner and the server
 * cannot disagree about what a Corpus's figures are — only about how to draw
 * them. All that is left here is drawing: the two readings are printed as two
 * separate blocks and are never fused into one figure.
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
  const reading = composeReading(corpus, lens, importFindings, takenAt, previous);

  const text = [
    renderMatrix(reading.matrix, reading.scores, reading.trend),
    '',
    renderFindings(reading.findings, lens.adapter.root),
  ].join('\n');

  return { snapshot: reading.snapshot, text };
}
