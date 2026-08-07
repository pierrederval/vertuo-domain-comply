import type { Corpus } from '@vertuo/comply-core';
import type { Fact } from '@vertuo/comply-core';
import type { Finding } from '@vertuo/comply-core';

/** The adapter's marker for "no structural grouping"; such containers prove nothing. */
const UNGROUPED = '.';

function identityOf(fact: Fact): string | null {
  return fact.kind === 'Module' ? fact.id : fact.moduleId;
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

    const offender = facts.find((f) => identityOf(f) === identities[1]) ?? facts[0]!;
    findings.push({
      code: 'split-identity',
      moduleId: identities[0]!,
      message:
        `"${containerId}" carries ${identities.length} module identities (${identities.join(', ')}); ` +
        `a change to the identity reached some documents and not others`,
      origin: offender.origin,
    });
  }
  return findings;
}
