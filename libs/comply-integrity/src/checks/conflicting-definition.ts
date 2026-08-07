import type { Corpus } from '@vertuo/comply-core';
import type { Finding } from '@vertuo/comply-core';
import type { Profile } from '@vertuo/comply-profile';
import { buildTermRegistry, type TermEntry } from '../registry.js';

export function checkConflictingDefinition(corpus: Corpus, profile: Profile): Finding[] {
  const byCanonical = new Map<string, TermEntry[]>();
  for (const entry of buildTermRegistry(corpus, profile)) {
    const bucket = byCanonical.get(entry.canonical) ?? [];
    bucket.push(entry);
    byCanonical.set(entry.canonical, bucket);
  }

  const findings: Finding[] = [];
  for (const [canonical, entries] of [...byCanonical].sort(([a], [b]) => a.localeCompare(b))) {
    const distinct = new Set(entries.map((e) => e.definition));
    if (distinct.size < 2) continue;

    const [first, ...rest] = entries;
    findings.push({
      code: 'conflicting-definition',
      moduleId: first!.moduleId,
      message:
        `Term "${canonical}" is defined ${distinct.size} different ways; also defined at ` +
        rest.map((e) => `${e.origin.file}:${e.origin.line}`).join(', '),
      origin: first!.origin,
    });
  }
  return findings;
}
