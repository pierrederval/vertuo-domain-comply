import { join } from 'node:path';
import type { Fact, Finding } from '@vertuo/comply-core';
import { decomposeStatus, type Lens } from '@vertuo/comply-lens';
import type { Seed } from '@vertuo/comply-seed';

export interface Interpretation {
  facts: Fact[];
  findings: Finding[];
}

/**
 * The defects applying a Lens looks for, named for the same reason the Checks
 * against a whole Corpus are: a count of Findings is stated against what was
 * looked for, and reading the knowledge in is where four of those looks happen
 * (LAW-006).
 *
 * A test asserts that nothing {@link interpret} reports falls outside this set,
 * so the two cannot drift apart silently.
 */
export const INTERPRETATION_CHECKS: readonly string[] = [
  'unparsable-document',
  'missing-module-identity',
  'unknown-status',
  'empty-facet',
];

/**
 * Applies a Lens to a Seed: what the knowledge *means*, decided here and nowhere
 * earlier.
 *
 * Everything that is a judgment happens in this function — which rung of the
 * ladder a status denotes, which Fact Kind a facet carries, which documents could
 * not be made sense of and what to tell a reader about them. Extraction decided
 * none of it, so tightening a criterion, renaming a rung, or rewording a message
 * changes what a reader sees without re-extracting anything.
 *
 * Nothing here reads a file. A Seed carries paths relative to the adapter root so
 * that its digest does not depend on the machine that wrote it; the absolute path
 * a person can open is put back on here (LAW-009).
 *
 * Deliberately not markdown's business: a Seed from any adapter is interpreted by
 * this one function, so a second adapter cannot arrive with a second opinion about
 * what a status means.
 */
export function interpret(seed: Seed, lens: Lens): Interpretation {
  const { root, moduleIdKey, facetKey } = lens.adapter;
  const facts: Fact[] = [];
  const findings: Finding[] = [];

  for (const document of seed.documents) {
    const file = join(root, document.path);
    const origin = { file, line: 1 };

    if (!document.readable) {
      findings.push({
        code: 'unparsable-document', moduleId: null,
        message: `The document has no readable frontmatter and could not be interpreted`,
        origin,
      });
      continue;
    }

    const moduleId = document.moduleId;
    if (moduleId === null) {
      findings.push({
        code: 'missing-module-identity', moduleId: null,
        message: `Frontmatter key "${moduleIdKey}" is absent or empty`, origin,
      });
      continue;
    }

    const facet = lens.facets.find((f) => f.name === document.facet);
    if (facet === undefined) {
      findings.push({
        code: 'unparsable-document', moduleId,
        message: `Frontmatter key "${facetKey}" has value "${document.facet ?? ''}", which no facet declares`,
        origin,
      });
      continue;
    }

    let maturityLevel: string | null = null;
    let sources: string[] = [];
    if (document.status !== null) {
      const decomposed = decomposeStatus(lens, document.status);
      if (decomposed === null) {
        findings.push({
          code: 'unknown-status', moduleId,
          message: `Status "${document.status}" matches no mapping in lens "${lens.id}"`, origin,
        });
      } else {
        maturityLevel = decomposed.maturityLevel;
        sources = decomposed.sources;
      }
    }

    if (document.items.length === 0) {
      findings.push({
        code: 'empty-facet', moduleId,
        message: `Facet "${facet.name}" produced no content in this document`,
        origin: { file, line: document.bodyStartLine ?? 1 },
      });
      continue;
    }

    for (const [index, item] of document.items.entries()) {
      const attributes = { ...item.attributes };
      if (facet.factKind === 'Module') {
        attributes.name = moduleId;
        if (document.owner !== null) attributes.owner = document.owner;
      }
      facts.push({
        id: facet.factKind === 'Module' ? moduleId : `${document.path}#${index}`,
        kind: facet.factKind,
        moduleId: facet.factKind === 'Module' ? null : moduleId,
        facet: facet.name,
        containerId: document.containerId,
        attributes,
        relations: item.relations,
        maturityLevel,
        sources,
        origin: { file, line: item.line },
      });
    }
  }

  return { facts, findings };
}
