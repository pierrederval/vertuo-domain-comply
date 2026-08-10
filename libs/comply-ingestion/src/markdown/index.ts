import { relative } from 'node:path';
import { buildCorpus, type Corpus } from '@vertuo/comply-core';
import type { Finding } from '@vertuo/comply-core';
import type { Lens } from '@vertuo/comply-lens';
import { SEED_VERSION, type Seed, type SeedDocument } from '@vertuo/comply-seed';
import type { SeedAdapter } from '../adapter.js';
import { interpret } from '../interpret.js';
import { discoverDocuments } from './discover.js';
import { parseDocument } from './document.js';
import { excerptOf } from './excerpt.js';
import { extract } from './extractors.js';

function text(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() === '' ? null : value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return null;
}

/**
 * Source documents in, Seed out. Judges nothing.
 *
 * What this reads of the Lens is its adapter half — the root and the four
 * frontmatter keys — plus each facet's extraction shape, which is how a document
 * is read rather than what it means. It never asks what Fact Kind a facet carries,
 * which rung a status denotes, or whether anything is well-formed; those are
 * interpretation's and are decided every time a Seed is read, not once when it is
 * written.
 *
 * A document is therefore recorded whatever state it is in, including one nothing
 * could be read from. Nothing is dropped here and nothing is diagnosed here: a
 * Seed says what was found, and interpretation says what that means.
 */
export async function extractSeed(lens: Lens): Promise<Seed> {
  const { root, moduleIdKey, facetKey, statusKey, ownerKey } = lens.adapter;
  const documents: SeedDocument[] = [];

  for (const file of await discoverDocuments(root)) {
    // Relative, so two machines extracting the same source agree on the digest.
    const path = relative(root, file);
    const containerId = path.split('/').slice(0, -1).join('/') || '.';
    const parsed = await parseDocument(file);

    if (parsed === null) {
      documents.push({
        path, containerId, readable: false, bodyStartLine: null,
        moduleId: null, facet: null, status: null, owner: null, items: [],
      });
      continue;
    }

    // A facet is looked up here only for the extractor it names. A facet name that
    // matches nothing declared yields no items and no complaint: whether that is a
    // defect is interpretation's judgment, and its wording belongs where it can be
    // changed without re-extracting a corpus.
    const facetName = text(parsed.data[facetKey]);
    const facet = lens.facets.find((f) => f.name === facetName);

    documents.push({
      path,
      containerId,
      readable: true,
      bodyStartLine: parsed.bodyStartLine,
      moduleId: text(parsed.data[moduleIdKey]),
      facet: facetName,
      status: text(parsed.data[statusKey]),
      owner: ownerKey === undefined ? null : text(parsed.data[ownerKey]),
      items: facet === undefined ? [] : extract(parsed, facet).map((item) => {
        const excerpt = excerptOf(parsed, item.line, item.endLine);
        return {
          line: item.line,
          attributes: item.attributes,
          relations: item.relations,
          excerpt: excerpt.text,
          excerptCut: excerpt.cut,
        };
      }),
    });
  }

  return { version: SEED_VERSION, lensId: lens.id, documents };
}

export const markdownAdapter: SeedAdapter = { extract: extractSeed };

/**
 * Source documents to an interpreted Corpus, in one step, through the Seed.
 *
 * The Seed here is held in memory rather than written down — the runner's
 * `extract` command is what puts one on the shelf. Either way the knowledge takes
 * the same route, so there is no second path that could form a second opinion.
 */
export async function loadCorpus(
  lens: Lens,
): Promise<{ corpus: Corpus; findings: Finding[] }> {
  const { facts, findings } = interpret(await extractSeed(lens), lens);
  return { corpus: buildCorpus(facts), findings };
}
