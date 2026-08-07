import type { Corpus } from '@vertuo/comply-core';
import type { Finding } from '@vertuo/comply-core';

/** A target naming a file rather than an in-corpus anchor cannot be resolved here. */
function isExternal(targetRef: string): boolean {
  return targetRef.includes('/') || targetRef.includes('.');
}

export function checkBrokenReference(corpus: Corpus): Finding[] {
  const anchors = new Set<string>();
  for (const fact of corpus.facts) {
    anchors.add(fact.id);
    const slug = fact.attributes.slug;
    if (typeof slug === 'string') anchors.add(slug);
  }

  const findings: Finding[] = [];
  for (const fact of corpus.facts) {
    for (const relation of fact.relations) {
      if (isExternal(relation.targetRef) || anchors.has(relation.targetRef)) continue;
      findings.push({
        code: 'broken-reference',
        moduleId: fact.moduleId,
        message: `Reference to "${relation.targetRef}" resolves to nothing in the corpus`,
        origin: fact.origin,
      });
    }
  }
  return findings;
}
