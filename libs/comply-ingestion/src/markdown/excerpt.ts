import type { ParsedDocument } from './document.js';

/**
 * How much source text an excerpt carries before it is cut.
 *
 * Chosen to be enough for a reader to recognise what they are looking at. Where a
 * span runs longer, the excerpt is cut and says so, and the reader follows the
 * origin for the rest. Cutting is the only alteration permitted: an excerpt is
 * never summarised, reworded, or assembled out of lines that are not adjacent,
 * because a reader shown altered evidence has been told a second-hand version of
 * the knowledge — which is the defect this product exists to detect.
 */
const LIMIT = 600;

export interface Excerpt {
  text: string;
  /** True when the excerpt stops short of the span, so a surface can say so. */
  cut: boolean;
}

/**
 * The source lines `line`..`endLine` of a document, exactly as written.
 *
 * Surrounding blank space is dropped and nothing else is: what is returned is a
 * verbatim run of lines, or a verbatim prefix of one.
 */
export function excerptOf(doc: ParsedDocument, line: number, endLine: number): Excerpt {
  const lines = doc.body.split('\n');
  const from = Math.max(0, line - doc.bodyStartLine);
  const span = lines.slice(from, endLine - doc.bodyStartLine + 1).join('\n').trim();

  if (span.length <= LIMIT) return { text: span, cut: false };

  // Cut at a line boundary, so what is shown is a whole number of source lines
  // rather than a line broken mid-way; a single line longer than the limit is cut
  // where the limit falls, there being no boundary to use.
  const head = span.slice(0, LIMIT);
  const boundary = head.lastIndexOf('\n');
  return { text: (boundary > 0 ? head.slice(0, boundary) : head).trimEnd(), cut: true };
}
