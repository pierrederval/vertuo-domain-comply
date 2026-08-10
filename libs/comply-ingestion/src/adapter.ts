import type { Lens } from '@vertuo/comply-lens';
import type { Seed } from '@vertuo/comply-seed';

/**
 * The port every Seed Adapter implements: source documents in, a Seed out.
 *
 * An adapter reads whatever a business already has and writes down what it found.
 * It never says what any of it means, so a new adapter cannot arrive with a second
 * opinion about what a status denotes — there is exactly one place that decides,
 * and it is `interpret`.
 *
 * Loading a Seed through the Door is one Genesis entry, never one event per Fact
 * (ADR-0012), and never a Change Request.
 */
export interface SeedAdapter {
  extract(lens: Lens): Promise<Seed>;
}
