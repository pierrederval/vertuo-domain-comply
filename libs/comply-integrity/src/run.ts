import type { Corpus } from '@vertuo/comply-core';
import type { Finding } from '@vertuo/comply-core';
import type { Lens } from '@vertuo/comply-lens';
import { resolveOwners } from '@vertuo/comply-readiness';
import { checkBrokenReference } from './checks/broken-reference.js';
import { checkConflictingDefinition } from './checks/conflicting-definition.js';
import { checkSplitIdentity } from './checks/split-identity.js';

export interface Check {
  /**
   * The defect this Check looks for — the same word the Findings it produces
   * cite, so a reader who is shown a Finding can find what looked for it. A
   * Check names a kind of defect and never a business word (LAW-004).
   */
  name: string;
  run(corpus: Corpus, lens: Lens): Finding[];
}

/**
 * Every Check that runs against a whole Corpus, and the order they run in.
 *
 * Named rather than merely called, because a count of open Findings is
 * meaningless until a reader can see what was looked for: "14 open Findings"
 * reads as *these are the problems* when it can only ever mean *these are the
 * problems these four Checks would have found* (LAW-006). The set is the
 * denominator that figure is stated against.
 *
 * A Check added here runs and is named in the same act, so the two cannot drift.
 */
export const CHECKS: readonly Check[] = [
  { name: 'split-identity', run: (corpus) => checkSplitIdentity(corpus) },
  { name: 'conflicting-definition', run: (corpus, lens) => checkConflictingDefinition(corpus, lens) },
  { name: 'broken-reference', run: (corpus) => checkBrokenReference(corpus) },
  // Owner resolution is Readiness's, and what it finds is a Finding like any
  // other: a Module belonging to nobody is the defect LAW-007 is about.
  { name: 'missing-owner', run: (corpus, lens) => resolveOwners(corpus, lens).findings },
];

export function runChecks(corpus: Corpus, lens: Lens): Finding[] {
  return CHECKS.flatMap((check) => check.run(corpus, lens));
}
