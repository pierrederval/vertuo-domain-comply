import { relative } from 'node:path';
import { buildCorpus, type Corpus } from '@vertuo/comply-core';
import type { Fact } from '@vertuo/comply-core';
import type { Finding } from '@vertuo/comply-core';
import { decomposeStatus } from '@vertuo/comply-profile';
import type { Profile } from '@vertuo/comply-profile';
import type { SeedResult } from '../adapter.js';
import { discoverDocuments } from './discover.js';
import { parseDocument } from './document.js';
import { extract } from './extractors.js';

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

export async function loadSeed(profile: Profile): Promise<SeedResult> {
  const { root, moduleIdKey, facetKey, statusKey, ownerKey } = profile.adapter;
  const facts: Fact[] = [];
  const findings: Finding[] = [];

  for (const file of await discoverDocuments(root)) {
    const containerId = relative(root, file).split('/').slice(0, -1).join('/') || '.';
    const doc = await parseDocument(file);

    if (doc === null) {
      findings.push({
        code: 'unparsable-document', moduleId: null,
        message: `The document has no readable frontmatter and could not be interpreted`,
        origin: { file, line: 1 },
      });
      continue;
    }

    const moduleId = text(doc.data[moduleIdKey]);
    const facetName = text(doc.data[facetKey]);
    const origin = { file, line: 1 };

    if (moduleId === null) {
      findings.push({
        code: 'missing-module-identity', moduleId: null,
        message: `Frontmatter key "${moduleIdKey}" is absent or empty`, origin,
      });
      continue;
    }

    const facet = profile.facets.find((f) => f.name === facetName);
    if (facet === undefined) {
      findings.push({
        code: 'unparsable-document', moduleId,
        message: `Frontmatter key "${facetKey}" has value "${facetName ?? ''}", which no facet declares`,
        origin,
      });
      continue;
    }

    const rawStatus = text(doc.data[statusKey]);
    let maturityLevel: string | null = null;
    let sources: string[] = [];
    if (rawStatus !== null) {
      const decomposed = decomposeStatus(profile, rawStatus);
      if (decomposed === null) {
        findings.push({
          code: 'unknown-status', moduleId,
          message: `Status "${rawStatus}" matches no mapping in profile "${profile.id}"`, origin,
        });
      } else {
        maturityLevel = decomposed.maturityLevel;
        sources = decomposed.sources;
      }
    }

    const owner = ownerKey === undefined ? null : text(doc.data[ownerKey]);

    for (const [index, item] of extract(doc, facet).entries()) {
      const attributes = { ...item.attributes };
      if (facet.factKind === 'Module') {
        attributes.name = moduleId;
        if (owner !== null) attributes.owner = owner;
      }
      facts.push({
        id: facet.factKind === 'Module' ? moduleId : `${moduleId}/${facet.name}/${index}`,
        kind: facet.factKind,
        moduleId: facet.factKind === 'Module' ? null : moduleId,
        facet: facet.name,
        containerId,
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

export const markdownAdapter = { load: loadSeed };

export async function loadCorpus(
  profile: Profile,
): Promise<{ corpus: Corpus; findings: Finding[] }> {
  const { facts, findings } = await loadSeed(profile);
  return { corpus: buildCorpus(facts), findings };
}
