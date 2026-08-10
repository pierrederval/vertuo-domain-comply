import type { Corpus } from '@vertuo/comply-core';
import type { Fact } from '@vertuo/comply-core';
import type { Finding } from '@vertuo/comply-core';

/** The adapter's marker for "no structural grouping"; such containers prove nothing. */
const UNGROUPED = '.';

function identityOf(fact: Fact): string | null {
  return fact.kind === 'Module' ? fact.id : fact.moduleId;
}

function lastSegment(containerId: string): string {
  const segments = containerId.split('/');
  return segments[segments.length - 1] ?? containerId;
}

/**
 * The identity that best claims the container: the one matching the container's last
 * path segment, if any does; otherwise the one carried by the most facts, with ties
 * broken lexicographically so the result never depends on fact order.
 */
function primaryIdentity(containerId: string, facts: Fact[]): string {
  const counts = new Map<string, number>();
  for (const fact of facts) {
    const identity = identityOf(fact);
    if (identity === null) continue;
    counts.set(identity, (counts.get(identity) ?? 0) + 1);
  }

  const segment = lastSegment(containerId);
  if (counts.has(segment)) return segment;

  let best: string | undefined;
  let bestCount = -1;
  for (const [identity, count] of [...counts].sort(([a], [b]) => a.localeCompare(b))) {
    if (count > bestCount) {
      best = identity;
      bestCount = count;
    }
  }
  // Reachable only if `counts` is empty, which cannot happen: callers only invoke this
  // once at least two distinct identities have been found among `facts`.
  return best!;
}

export function checkSplitIdentity(corpus: Corpus): Finding[] {
  const byContainer = new Map<string, Fact[]>();
  for (const fact of corpus.facts) {
    if (fact.containerId === UNGROUPED) continue;
    const bucket = byContainer.get(fact.containerId) ?? [];
    bucket.push(fact);
    byContainer.set(fact.containerId, bucket);
  }

  const findings: Finding[] = [];
  for (const [containerId, facts] of [...byContainer].sort(([a], [b]) => a.localeCompare(b))) {
    const identities = [...new Set(facts.map(identityOf).filter((i): i is string => i !== null))].sort();
    if (identities.length < 2) continue;

    const primary = primaryIdentity(containerId, facts);
    const anomalies = identities.filter((identity) => identity !== primary);
    const firstAnomaly = anomalies[0]!;
    // An anomaly always exists here: identities.length >= 2 and primary is one of them.
    const offender = facts.find((f) => identityOf(f) === firstAnomaly)!;

    findings.push({
      code: 'split-identity',
      moduleId: primary,
      message:
        `"${containerId}" carries ${identities.length} module identities (${identities.join(', ')}); ` +
        `primary identity is "${primary}", anomalous ${anomalies.length === 1 ? 'identity is' : 'identities are'} ` +
        `${anomalies.map((identity) => `"${identity}"`).join(', ')}; ` +
        `a change to the identity reached some documents and not others`,
      origin: offender.origin,
    });
  }
  return findings;
}
