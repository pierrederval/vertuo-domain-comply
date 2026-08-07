import type { AttributeValue, Relation } from '@vertuo/comply-core';
import type { FacetSpec } from '@vertuo/comply-profile';
import type { ParsedDocument } from './document.js';

export interface ExtractedItem {
  attributes: Record<string, AttributeValue>;
  relations: Relation[];
  /** 1-indexed line in the original file. */
  line: number;
}

const LINK = /\[[^\]]*\]\(([^)]+)\)/g;

/** Collects markdown link targets, reduced to their fragment where one exists. */
function relationsIn(text: string): Relation[] {
  const out: Relation[] = [];
  for (const match of text.matchAll(LINK)) {
    const target = match[1]!;
    const hash = target.indexOf('#');
    out.push({ type: 'reference', targetRef: hash >= 0 ? target.slice(hash + 1) : target });
  }
  return out;
}

function extractDocument(doc: ParsedDocument, facet: FacetSpec): ExtractedItem[] {
  const attribute = facet.bodyAttribute ?? 'body';
  const text = doc.body.trim();
  if (text === '') return [];
  return [{ attributes: { [attribute]: text }, relations: relationsIn(text), line: doc.bodyStartLine }];
}

function extractTable(doc: ParsedDocument, facet: FacetSpec): ExtractedItem[] {
  const columns = facet.columns ?? {};
  const lines = doc.body.split('\n');
  const items: ExtractedItem[] = [];
  let headers: string[] | null = null;

  for (const [offset, line] of lines.entries()) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|')) { headers = null; continue; }

    const cells = trimmed.slice(1, trimmed.endsWith('|') ? -1 : undefined)
      .split('|').map((c) => c.trim());

    if (headers === null) { headers = cells; continue; }
    if (cells.every((c) => /^-+$/.test(c.replace(/\s/g, '')))) continue;

    const attributes: Record<string, AttributeValue> = {};
    const relations: Relation[] = [];
    for (const [index, header] of headers.entries()) {
      const name = columns[header];
      const value = cells[index] ?? '';
      if (name === undefined || value === '') continue;
      attributes[name] = value.replace(/\*\*/g, '');
      relations.push(...relationsIn(value));
    }
    if (Object.keys(attributes).length > 0) {
      items.push({ attributes, relations, line: doc.bodyStartLine + offset });
    }
  }
  return items;
}

function slugify(heading: string): string {
  return heading.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function extractHeading(doc: ParsedDocument, facet: FacetSpec): ExtractedItem[] {
  const attribute = facet.bodyAttribute ?? 'body';
  const lines = doc.body.split('\n');
  const items: ExtractedItem[] = [];
  let current: { name: string; line: number; body: string[] } | null = null;

  const flush = (): void => {
    if (current === null) return;
    const text = current.body.join('\n').trim();
    items.push({
      attributes: { name: current.name, slug: slugify(current.name), [attribute]: text },
      relations: relationsIn(text),
      line: current.line,
    });
  };

  for (const [offset, line] of lines.entries()) {
    const heading = /^##\s+(.*)$/.exec(line);
    if (heading) {
      flush();
      current = { name: heading[1]!.trim(), line: doc.bodyStartLine + offset, body: [] };
    } else if (current !== null) {
      current.body.push(line);
    }
  }
  flush();
  return items;
}

export function extract(doc: ParsedDocument, facet: FacetSpec): ExtractedItem[] {
  switch (facet.extractor) {
    case 'document': return extractDocument(doc, facet);
    case 'table': return extractTable(doc, facet);
    case 'heading': return extractHeading(doc, facet);
  }
}
