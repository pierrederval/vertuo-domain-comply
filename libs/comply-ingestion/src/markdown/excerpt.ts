import type { ParsedDocument } from './document.js';

/**
 * How much source text an excerpt carries before it is cut.
 *
 * Chosen so a reader can check the claim they are shown against the source it was
 * read out of, which is a different job from recognising what you are looking at
 * (LAW-009, ADR-0036). Where a span runs longer, the excerpt is cut and says so,
 * and the reader follows the origin for the rest. Cutting is the only alteration
 * permitted: an excerpt is never summarised, reworded, or assembled out of lines
 * that are not adjacent, because a reader shown altered evidence has been told a
 * second-hand version of the knowledge — which is the defect this product exists
 * to detect.
 *
 * One number and not one per Facet. Every Facet read a row at a time is carried
 * whole by any number above 700, so the number is only ever about prose read a
 * heading at a time — and a Facet read a whole document at a time is cut whatever
 * number anybody picks, its longest span in the DDD Corpus being 26,676
 * characters. What a Lens declares is what a Corpus means; how much source text
 * travels for a reader to check it against is this product's own business, which
 * is where ADR-0017 already put it.
 */
export const EXCERPT_LIMIT = 4000;

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

  if (span.length <= EXCERPT_LIMIT) return { text: span, cut: false };

  // Cut where the source last breaks between words, so nothing a reader is shown is
  // half of a word the source wrote whole.
  //
  // This used to cut at the last line boundary instead, to keep whole source lines.
  // What that keeps is bounded by the longest line the source happens to write, and
  // nothing bounds that: a document whose next line was a long paragraph kept only
  // what came before it, which on the DDD Corpus threw away 502 characters of a
  // 600-character budget and left a reader four headings and no knowledge (ADR-0036).
  // A break between words is bounded by the longest word instead, which a language
  // bounds — 79 characters at its worst across the same corpus.
  //
  // One character past the budget is looked at, so a budget ending exactly where the
  // source ends a word keeps that word rather than dropping it for nothing.
  const head = span.slice(0, EXCERPT_LIMIT + 1);
  const breaks = head.search(/\s+\S*$/);
  const kept = breaks > 0 ? head.slice(0, breaks) : span.slice(0, EXCERPT_LIMIT);
  return { text: kept.trimEnd(), cut: true };
}
