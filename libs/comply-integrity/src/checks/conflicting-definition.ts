import type { Corpus } from '@vertuo/comply-core';
import type { Finding } from '@vertuo/comply-core';
import type { Lens } from '@vertuo/comply-lens';
import { buildTermRegistry, type TermEntry } from '../registry.js';

export function checkConflictingDefinition(corpus: Corpus, lens: Lens): Finding[] {
  const byCanonical = new Map<string, TermEntry[]>();
  for (const entry of buildTermRegistry(corpus, lens)) {
    // An empty definition means "not yet documented here", not "documented as nothing".
    // That is a well-formedness concern (requiredAttributes), not a language-integrity one —
    // comparing it against a real definition elsewhere would report absence as contradiction.
    if (entry.definition === '') continue;
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
      message: `Term "${canonical}" is defined ${distinct.size} different ways`,
      origin: first!.origin,
      relatedOrigins: rest.map((e) => e.origin),
    });
  }
  return findings;
}
