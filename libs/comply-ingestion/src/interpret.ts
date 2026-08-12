import { join } from 'node:path';
import type { AttributeValue, Fact, Finding } from '@vertuo/comply-core';
import { decomposeStatus, sourcesWritten, type Lens } from '@vertuo/comply-lens';
import type { Seed } from '@vertuo/comply-seed';

export interface Interpretation {
  facts: Fact[];
  findings: Finding[];
}

/** A rung and what corroborates it, together, because one is read from the other. */
interface WhereItStands {
  maturityLevel: string | null;
  sources: string[];
}

const NOTHING_SAID: WhereItStands = { maturityLevel: null, sources: [] };

/**
 * The one passage an attribute holds, or nothing.
 *
 * An attribute holds two passages when a source wrote the same part twice
 * (ADR-0026). Two of them here are two statements about where one thing stands,
 * and this returns neither: picking one would be a silent choice between two
 * things the source says, and nothing in either of them makes it the answer
 * (LAW-008). What was found is handed back so the reader can be told what it was.
 */
function statedOnce(value: AttributeValue | undefined): { one: string } | { several: string[] } | null {
  if (value === undefined) return null;
  const written = (Array.isArray(value) ? value : [value]).map((p) => p.trim()).filter((p) => p !== '');
  if (written.length === 0) return null;
  return written.length === 1 ? { one: written[0]! } : { several: written };
}

/** Both paths' sources as the one set they are, in the order they were read (LAW-005). */
function bothPaths(fromTheMapping: string[], theFactNames: string[]): string[] {
  const set = [...fromTheMapping];
  for (const place of theFactNames) if (!set.includes(place)) set.push(place);
  return set;
}

/**
 * Where one Fact says it stands, if it says so at all (ADR-0022).
 *
 * `null` for a Fact that says nothing, which is not the same as a Fact whose
 * standing could not be read: the first is answered by its document and the second
 * is answered by nobody. A reason is reported against the Fact's own line, which is
 * the citation this buys before a single status is transcribed anywhere — somewhere
 * a person can open onto the thing that is wrong, rather than the top of the
 * document it happens to be written in (LAW-009).
 */
function whatThisFactSays(
  lens: Lens,
  facet: Lens['facets'][number],
  attributes: Record<string, AttributeValue>,
  here: Fact['origin'],
): { stands: WhereItStands | null; findings: Omit<Finding, 'moduleId'>[] } {
  if (facet.statusAttribute === undefined) return { stands: null, findings: [] };

  const stated = statedOnce(attributes[facet.statusAttribute]);
  if (stated === null) return { stands: null, findings: [] };

  if ('several' in stated) {
    return {
      stands: NOTHING_SAID,
      findings: [{
        code: 'unknown-status',
        message:
          `Where this stands is written more than once ("${stated.several.join('", "')}"), ` +
          `so neither is read`,
        origin: here,
      }],
    };
  }

  const decomposed = decomposeStatus(lens, stated.one);
  if (decomposed !== null) return { stands: decomposed, findings: [] };

  return {
    stands: NOTHING_SAID,
    findings: [{
      code: 'unknown-status',
      message: `Status "${stated.one}" matches no mapping in lens "${lens.id}"`,
      origin: here,
    }],
  };
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
  'unreadable-document',
  'unknown-facet',
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

    // None of these says *frontmatter*. A Seed from any adapter arrives here, and only
    // one adapter has such a thing; the Lens names the two keys a document says these
    // under, whatever the source calls the place they are written. What each of them
    // says instead is what the document would have to say to be read, because a Finding
    // reporting only an absence is one nobody can act on (LAW-004, LAW-007).
    if (!document.readable) {
      findings.push({
        code: 'unreadable-document', moduleId: null,
        message:
          `This document says nothing about itself, so nothing in it could be read. ` +
          `A document says which Module it belongs to under "${moduleIdKey}" and which ` +
          `Facet it holds under "${facetKey}"`,
        origin,
      });
      continue;
    }

    const moduleId = document.moduleId;
    if (moduleId === null) {
      findings.push({
        code: 'missing-module-identity', moduleId: null,
        message:
          `This document does not say which Module it belongs to, which is written ` +
          `under "${moduleIdKey}"`,
        origin,
      });
      continue;
    }

    // A separate code from the document above it, because the two remedies have
    // nothing in common: that one needs two lines written at the top of a page, and
    // this one is a word spelled one way in the document and another in the Lens. The
    // declared names are said back for exactly that reason — the DDD Corpus's whole
    // three of these are `state-machine` where its Lens declares `state-machines`, and
    // nothing but the two side by side makes that visible.
    const facet = lens.facets.find((f) => f.name === document.facet);
    if (facet === undefined) {
      const declared = lens.facets.map((f) => `"${f.name}"`).join(', ');
      findings.push({
        code: 'unknown-facet', moduleId,
        message:
          `This document says it holds "${document.facet ?? ''}" under "${facetKey}", and ` +
          `this Corpus's criteria declare no Facet of that name. They declare ${declared}`,
        origin,
      });
      continue;
    }

    // What the document says, read once and reported once. A document whose one
    // status cannot be read is one thing wrong in one place, and saying it again for
    // every Fact beneath it would count one defect as many (LAW-006).
    let asTheDocumentStands: WhereItStands = NOTHING_SAID;
    if (document.status !== null) {
      const decomposed = decomposeStatus(lens, document.status);
      if (decomposed === null) {
        findings.push({
          code: 'unknown-status', moduleId,
          message: `Status "${document.status}" matches no mapping in lens "${lens.id}"`, origin,
        });
      } else {
        asTheDocumentStands = decomposed;
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

      // Where this Fact itself says it stands, over what its document says. The
      // document remains the fallback, so a corpus part-way through stating its own is
      // read as it stands rather than refused, and a corpus whose review genuinely
      // happens a document at a time is read exactly as it was (ADR-0001).
      const here = { file, line: item.line };
      const own = whatThisFactSays(lens, facet, attributes, here);
      for (const finding of own.findings) findings.push({ ...finding, moduleId });
      const stands = own.stands ?? asTheDocumentStands;

      // Both paths, always: what a Fact was checked against does not depend on which
      // rung it reached, and survives a status this Lens could not read. Maturity and
      // Source are independent and are never carried inward as one thing (LAW-005).
      const sources = bothPaths(
        stands.sources,
        facet.sourcesAttribute === undefined
          ? []
          : sourcesWritten(attributes[facet.sourcesAttribute]),
      );

      facts.push({
        id: facet.factKind === 'Module' ? moduleId : `${document.path}#${index}`,
        kind: facet.factKind,
        moduleId: facet.factKind === 'Module' ? null : moduleId,
        facet: facet.name,
        containerId: document.containerId,
        attributes,
        relations: item.relations,
        maturityLevel: stands.maturityLevel,
        sources,
        origin: here,
      });
    }
  }

  return { facts, findings };
}
