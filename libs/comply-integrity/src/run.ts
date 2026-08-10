import type { Corpus } from '@vertuo/comply-core';
import type { Finding } from '@vertuo/comply-core';
import type { Lens } from '@vertuo/comply-lens';
import { resolveOwners } from '@vertuo/comply-readiness';
import { checkBrokenReference } from './checks/broken-reference.js';
import { checkConflictingDefinition } from './checks/conflicting-definition.js';
import { checkSplitIdentity } from './checks/split-identity.js';

export function runChecks(corpus: Corpus, lens: Lens): Finding[] {
  return [
    ...checkSplitIdentity(corpus),
    ...checkConflictingDefinition(corpus, lens),
    ...checkBrokenReference(corpus),
    ...resolveOwners(corpus, lens).findings,
  ];
}
