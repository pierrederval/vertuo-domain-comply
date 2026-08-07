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
      // Check anchors before the external heuristic, not after: `moduleId` (and therefore
      // fact.id for a Module fact) comes from unvalidated frontmatter, so a real in-corpus
      // anchor can legitimately contain a dot or slash (e.g. "v1.2"). If the heuristic ran
      // first, such an anchor would be misclassified as external and its reference silently
      // waved through, whether or not it actually resolves. Resolving against known anchors
      // first means a genuine match always wins, whatever characters it contains; the
      // heuristic only gets the final say once resolution has already failed.
      if (anchors.has(relation.targetRef)) continue;
      if (isExternal(relation.targetRef)) continue;
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
