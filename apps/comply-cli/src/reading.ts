import type { Reading } from '@vertuo/comply-reading';
import type { WhatWasRead } from '@vertuo/comply-seed';
import { renderFindings, renderMatrix } from './render.js';

/**
 * What the runner says about a Corpus: a reading, put into words.
 *
 * The reading itself is `libs/comply-reading`'s and arrives already taken, so the
 * runner and the server cannot disagree about what a Corpus's figures are — only
 * about how to draw them. All that is left here is drawing: the two readings are
 * printed as two separate blocks and are never fused into one figure.
 */
export function sayWhereItStands(reading: Reading, read: WhatWasRead, root: string): string {
  return [
    renderMatrix(reading.matrix, reading.scores, reading.trend, read),
    '',
    renderFindings(reading.findings, root),
  ].join('\n');
}
