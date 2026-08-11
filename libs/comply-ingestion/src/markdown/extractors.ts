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

/**
 * What one document yielded under one Facet.
 *
 * The count travels beside the items rather than being inferred later, because
 * nothing downstream can recover it: once a thing has been declined, the reading
 * that declined it is the only place that knows it was ever there. A reader who
 * is shown a figure has to be able to see what it is a figure of, and a reading
 * that quietly leaves things out cannot offer that (LAW-006).
 */
export interface Extraction {
  items: ExtractedItem[];
  /**
   * How many things this Facet declined, having said they were none of its own.
   *
   * Declined, not unreadable: something the Facet was never going to read anyway
   * is not counted here, or the total the items are stated against would include
   * things no reading of any Facet would have produced.
   */
  setAside: number;
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

/**
 * A subheading of the thing a Facet reading whole documents reads: the document
 * has been cut nowhere, so its own sections are the parts of it.
 */
const PART_OF_A_DOCUMENT = /^##\s+(.*)$/;
/**
 * A subheading of the thing a Facet reading headings reads: it cuts at one level,
 * so the parts of what it cut are written one below.
 */
const PART_OF_A_HEADING = /^###\s+(.*)$/;

/**
 * Adds one more reading of one attribute, keeping whatever is already there.
 *
 * A source that writes the same part twice — under two of the spellings a Facet
 * maps onto one attribute, or once before the first part and once under one — has
 * written both down, and a reading that kept only one would lose the other in
 * silence (LAW-006).
 *
 * Kept as two and never joined into one string: two passages that are not
 * adjacent in the source, handed to a reader as continuous prose, are not what
 * the source says (LAW-009, ADR-0017).
 */
function alsoRead(
  attributes: Record<string, AttributeValue>,
  name: string,
  text: string,
): void {
  const held = attributes[name];
  if (held === undefined) {
    attributes[name] = text;
    return;
  }
  attributes[name] = Array.isArray(held) ? [...held, text] : [held, text];
}

/**
 * One thing's body, read as the parts its source already writes it in (ADR-0020).
 *
 * A Facet that names no parts gets the whole body in one attribute, which is what
 * every Facet got before this could be said. A Facet that names them gets one
 * attribute per part, and whatever was written before the first part — a line
 * classifying the thing, a sentence of preamble — lands in the body attribute,
 * because it was written under no heading and so belongs to no part.
 *
 * A subheading this Facet names no part for contributes nothing and is not
 * counted as set aside. Set aside means declined: one of this Facet's own things,
 * refused (ADR-0025). A subheading was never going to be one of them, so nothing
 * was declined and the figure a reader is shown does not move.
 */
function readInParts(
  lines: string[],
  partHeading: RegExp,
  bodyAttribute: string,
  parts: Record<string, string> | undefined,
): Record<string, AttributeValue> {
  const attributes: Record<string, AttributeValue> = {};

  if (parts === undefined) {
    const whole = lines.join('\n').trim();
    if (whole !== '') attributes[bodyAttribute] = whole;
    return attributes;
  }

  const lead: string[] = [];
  const found: { attribute: string; text: string }[] = [];
  let current: { attribute: string | undefined; body: string[] } | null = null;

  const close = (): void => {
    if (current === null || current.attribute === undefined) return;
    const text = current.body.join('\n').trim();
    if (text !== '') found.push({ attribute: current.attribute, text });
  };

  for (const line of lines) {
    const heading = partHeading.exec(line);
    if (heading) {
      close();
      current = { attribute: parts[heading[1]!.trim()], body: [] };
    } else if (current === null) {
      lead.push(line);
    } else {
      current.body.push(line);
    }
  }
  close();

  // The preamble is written before every part, so it is recorded before every part:
  // an attribute two passages land in holds them in the order the source writes them.
  const preamble = lead.join('\n').trim();
  if (preamble !== '') attributes[bodyAttribute] = preamble;
  for (const { attribute, text } of found) alsoRead(attributes, attribute, text);

  return attributes;
}

function extractDocument(doc: ParsedDocument, facet: FacetSpec): Extraction {
  const attribute = facet.bodyAttribute ?? 'body';
  const text = doc.body.trim();
  // A whole document is one thing, and a Facet reading one has nothing to choose
  // between, so there is nothing it could set aside.
  if (text === '') return { items: [], setAside: 0 };
  return {
    items: [{
      attributes: readInParts(doc.body.split('\n'), PART_OF_A_DOCUMENT, attribute, facet.parts),
      // Every reference written anywhere in this document, whether or not the section
      // holding it is mapped to an attribute. A reference is written on the page this
      // Fact was read from, and reading only the mapped sections would let what a Lens
      // chooses to name decide which links a reader is told about.
      relations: relationsIn(text),
      line: doc.bodyStartLine,
      endLine: doc.bodyStartLine + doc.body.split('\n').length - 1,
    }],
    setAside: 0,
  };
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

function extractTable(doc: ParsedDocument, facet: FacetSpec): Extraction {
  const columns = facet.columns ?? {};
  const identifying = facet.identifyingColumns;
  const lines = doc.body.split('\n');
  const items: ExtractedItem[] = [];
  let setAside = 0;
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
    // Mapped before the table is asked about, so what is counted as set aside is
    // what this Facet would otherwise have read, and not every row of every table
    // it passed over. A row it maps nothing from was never going to be an item.
    if (Object.keys(attributes).length > 0) {
      if (!theFacetsOwn) {
        setAside += 1;
        continue;
      }
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
  return { items, setAside };
}

function extractHeading(doc: ParsedDocument, facet: FacetSpec): Extraction {
  const attribute = facet.bodyAttribute ?? 'body';
  /**
   * Which headings this Facet said are its own. A Facet that said nothing gets
   * every heading, exactly as it did before this could be said.
   */
  const theFacetsOwn = facet.itemPattern === undefined ? null : new RegExp(facet.itemPattern);
  const lines = doc.body.split('\n');
  const items: ExtractedItem[] = [];
  let setAside = 0;
  let current: { name: string; line: number; body: string[] } | null = null;

  const flush = (): void => {
    if (current === null) return;
    if (theFacetsOwn !== null && !theFacetsOwn.test(current.name)) {
      setAside += 1;
      return;
    }
    const text = current.body.join('\n').trim();
    items.push({
      attributes: {
        name: current.name,
        slug: slugify(current.name),
        ...readInParts(current.body, PART_OF_A_HEADING, attribute, facet.parts),
      },
      // Every reference written anywhere under this heading, for the reason given
      // where a whole document is read the same way.
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
  return { items, setAside };
}

export function extract(doc: ParsedDocument, facet: FacetSpec): Extraction {
  switch (facet.extractor) {
    case 'document': return extractDocument(doc, facet);
    case 'table': return extractTable(doc, facet);
    case 'heading': return extractHeading(doc, facet);
  }
}
