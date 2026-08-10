import type { Fact } from '@vertuo/comply-core';
import type { Finding } from '@vertuo/comply-core';
import type { Profile } from '@vertuo/comply-profile';

/**
 * The payload a Seed Adapter produces: a whole Corpus state, not a set of changes.
 * In this slice it is consumed read-only. Step 3 will submit this same shape through
 * the Door's Load operation, recorded as one Genesis entry (ADR-0012) — never as a
 * Change Request, and never as one event per Fact.
 */
export interface SeedResult {
  facts: Fact[];
  findings: Finding[];
}

export interface SeedAdapter {
  load(profile: Profile): Promise<SeedResult>;
}
