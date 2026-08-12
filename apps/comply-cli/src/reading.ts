import type { Corpus, Finding } from '@vertuo/comply-core';
import type { Lens } from '@vertuo/comply-lens';
import { composeReading, type AsRead } from '@vertuo/comply-reading';
import type { RecordedReading } from '@vertuo/comply-readiness';
import type { WhatWasRead } from '@vertuo/comply-seed';
import { renderFindings, renderMatrix } from './render.js';

export interface Reading {
  /** This reading in the form it goes on record in, if either input has changed. */
  asRecorded: RecordedReading;
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
 * Pure, given what it was read from and what it is stated against. Putting a reading
 * on record is the caller's business, so this function is deterministic and testable.
 */
export function readCorpus(
  corpus: Corpus,
  lens: Lens,
  importFindings: Finding[],
  asRead: AsRead,
  read: WhatWasRead,
): Reading {
  const reading = composeReading(corpus, lens, importFindings, asRead);

  const text = [
    renderMatrix(reading.matrix, reading.scores, reading.trend, read),
    '',
    renderFindings(reading.findings, lens.adapter.root),
  ].join('\n');

  return { asRecorded: reading.asRecorded, text };
}
