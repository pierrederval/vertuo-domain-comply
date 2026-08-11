import type { AttributeValue, Relation } from '@vertuo/comply-core';
import type { FacetSpec } from '@vertuo/comply-lens';
import type { ParsedDocument } from './document.js';

export interface ExtractedItem {
  attributes: Record<string, AttributeValue>;
  relations: Relation[];
  /** 1-indexed line in the original file. */
  line: number;
  /**
   * 1-indexed last line of the span this item was read from, inclusive. Reported
   * so the source text can be quoted back to a reader exactly as written, rather
   * than reconstructed from the attributes — a reconstruction is a paraphrase,
   * and paraphrased evidence is not evidence (LAW-009).
   */
  endLine: number;
}

const INLINE_LINK = /\[[^\]]*\]\(([^)]+)\)/g;
/** `[text][ref]` — the explicit reference form only; `ref` must be non-empty. Link definitions are not resolved. */
const REFERENCE_LINK = /\[[^\]]*\]\[([^\]]+)\]/g;

/** Collects markdown link targets. Inline targets are reduced to their fragment where one exists. */
function relationsIn(text: string): Relation[] {
  const out: Relation[] = [];
  for (const match of text.matchAll(INLINE_LINK)) {
    const target = match[1]!;
    const hash = target.indexOf('#');
    out.push({ type: 'reference', targetRef: hash >= 0 ? target.slice(hash + 1) : target });
  }
  for (const match of text.matchAll(REFERENCE_LINK)) {
    out.push({ type: 'reference', targetRef: match[1]! });
  }
  return out;
}

function extractDocument(doc: ParsedDocument, facet: FacetSpec): ExtractedItem[] {
  const attribute = facet.bodyAttribute ?? 'body';
  const text = doc.body.trim();
  if (text === '') return [];
  return [{
    attributes: { [attribute]: text },
    relations: relationsIn(text),
    line: doc.bodyStartLine,
    endLine: doc.bodyStartLine + doc.body.split('\n').length - 1,
  }];
}

/**
 * The anchor a name answers to, computed the way the pages a reader reads compute
 * one.
 *
 * An author writes a link by copying the address such a page gives, so this has to
 * agree with that page or every link written that way is reported broken — and a
 * defect the tool invented is worse than one it misses, because somebody believes
 * it and goes looking for a fault that is not there.
 *
 * Four rules, in this order:
 *
 * - Markup carried in place goes first, and takes whatever is written inside it
 *   along with it. The page addresses a heading by the words it shows, and an
 *   annotation's own attributes are not among them.
 * - Decompose, then drop the combining marks. An accented letter folds to the
 *   letter it is built on, which is why the decomposition comes first.
 * - A letter that decomposes into nothing is kept exactly as it stands. It is
 *   still a letter, and the address it appears in still works.
 * - Everything that is neither a letter nor a number separates, however many
 *   characters of it there are in a row. An apostrophe is one of those: it is a
 *   separator, not something to be deleted, so the words either side of one stay
 *   two words.
 *
 * A rule written against the Latin alphabet — `[^a-z0-9]` — breaks the last three
 * at once: it deletes an accented letter instead of folding it, deletes an
 * undecomposable one instead of keeping it, and closes the gap an apostrophe
 * should have opened (ADR-0023).
 */
function slugify(name: string): string {
  return name
    .replace(/<[^>]*>/g, '')
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-|-$/g, '');
}

/** Matches a GFM separator cell: optional leading/trailing colon around one or more dashes. */
function isSeparatorCell(cell: string): boolean {
  return /^:?-+:?$/.test(cell.replace(/\s/g, ''));
}

/** Splits a table row on unescaped `|`, unescaping `\|` to a literal `|` within each cell. */
function splitRowCells(row: string): string[] {
  const cells: string[] = [];
  let current = '';
  for (let i = 0; i < row.length; i += 1) {
    const ch = row[i];
    if (ch === '\\' && row[i + 1] === '|') {
      current += '|';
      i += 1;
      continue;
    }
    if (ch === '|') {
      cells.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  cells.push(current.trim());
  return cells;
}

function extractTable(doc: ParsedDocument, facet: FacetSpec): ExtractedItem[] {
  const columns = facet.columns ?? {};
  const identifying = facet.identifyingColumns;
  const lines = doc.body.split('\n');
  const items: ExtractedItem[] = [];
  let headers: string[] | null = null;
  /**
   * Whether the table now being read is one this Facet said is its own. Decided once,
   * at the header row, and never again from a row's own contents — so a row that
   * happens to be filled in cannot argue its way into a table that was set aside.
   */
  let theFacetsOwn = true;

  for (const [offset, line] of lines.entries()) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|')) { headers = null; continue; }

    const cells = splitRowCells(trimmed.slice(1, trimmed.endsWith('|') ? -1 : undefined));

    if (headers === null) {
      headers = cells;
      theFacetsOwn = identifying === undefined || identifying.every((header) => cells.includes(header));
      continue;
    }
    if (!theFacetsOwn) continue;
    if (cells.every(isSeparatorCell)) continue;

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
      // A row is reachable by name, the same way a heading is. Without this, nothing
      // a corpus writes down as a table can be referred to from anywhere — and a
      // corpus that keeps its Commands, its Events and its words in tables is then
      // one where no reference between two of them can be followed at all.
      //
      // A row whose Facet maps no column to a name is left alone: there is nothing to
      // derive an anchor from, and an invented one is a target no author could write.
      const name = attributes.name;
      if (typeof name === 'string') attributes.slug = slugify(name);

      // One row, one line: a row is quoted as itself. Pulling the header row in
      // beside it would read better and would be two non-adjacent lines presented
      // as one, which is not what the source says.
      const line = doc.bodyStartLine + offset;
      items.push({ attributes, relations, line, endLine: line });
    }
  }
  return items;
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
      // The heading line plus everything under it, up to the next heading.
      endLine: current.line + current.body.length,
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
