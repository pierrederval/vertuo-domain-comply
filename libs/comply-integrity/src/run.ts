import type { Corpus } from '@vertuo/comply-core';
import type { Finding } from '@vertuo/comply-core';
import type { Profile } from '@vertuo/comply-profile';
import { resolveOwners } from '@vertuo/comply-readiness';
import { checkBrokenReference } from './checks/broken-reference.js';
import { checkConflictingDefinition } from './checks/conflicting-definition.js';
import { checkSplitIdentity } from './checks/split-identity.js';

export function runChecks(corpus: Corpus, profile: Profile): Finding[] {
  return [
    ...checkSplitIdentity(corpus),
    ...checkConflictingDefinition(corpus, profile),
    ...checkBrokenReference(corpus),
    ...resolveOwners(corpus, profile).findings,
  ];
}
