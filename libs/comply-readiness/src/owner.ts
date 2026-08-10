import type { Corpus } from '@vertuo/comply-core';
import type { Finding } from '@vertuo/comply-core';
import type { Profile } from '@vertuo/comply-profile';

export interface OwnerResolution {
  owners: Map<string, string>;
  findings: Finding[];
}

/** Every module id appearing anywhere in the corpus, whether or not it has a Module fact. */
export function allModuleIds(corpus: Corpus): string[] {
  const ids = new Set<string>(corpus.moduleIds());
  for (const fact of corpus.facts) {
    if (fact.moduleId !== null) ids.add(fact.moduleId);
  }
  return [...ids].sort();
}

export function resolveOwners(corpus: Corpus, profile: Profile): OwnerResolution {
  const owners = new Map<string, string>();
  const findings: Finding[] = [];

  for (const moduleId of allModuleIds(corpus)) {
    const fromCorpus = corpus.find(moduleId)?.attributes.owner;
    const owner =
      typeof fromCorpus === 'string' && fromCorpus.trim() !== ''
        ? fromCorpus.trim()
        : profile.owners?.[moduleId];

    if (owner === undefined) {
      const anyFact = corpus.byModule(moduleId)[0] ?? corpus.find(moduleId);
      findings.push({
        code: 'missing-owner',
        moduleId,
        message: `Module "${moduleId}" has no owner; findings for it route to nobody`,
        origin: anyFact?.origin ?? { file: profile.adapter.root, line: 1 },
      });
      continue;
    }
    owners.set(moduleId, owner);
  }

  return { owners, findings };
}
