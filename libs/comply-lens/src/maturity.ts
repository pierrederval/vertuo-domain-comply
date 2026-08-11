import type { AttributeValue } from '@vertuo/comply-core';
import type { Lens } from './lens.js';

export interface Decomposed {
  maturityLevel: string;
  sources: string[];
}

/** A line's mark saying it is one item of a list, which is not part of what it names. */
const ONE_OF_A_LIST = /^[-*+]\s*/;

/**
 * The places one passage names, as the set they are (LAW-005).
 *
 * A part maps onto one attribute, so a source that wrote its provenance as a list
 * of three places handed it over as one string with three lines in it. Left that
 * way, a Fact naming five places has a set of one element, and asking for two of
 * them is unmeetable by the best-corroborated Fact in the corpus — which is worse
 * than asking for nothing.
 *
 * One line, one place. Taken exactly as written apart from the mark saying it is
 * one item of a list, because a place a reader is sent to is quoted and never
 * tidied (LAW-009). The temptation is to fold what looks like decoration — a path
 * written between backticks — and it is refused: the corpus that prompted this
 * writes 468 of its 646 lines as a bare path and the other 178 as a path followed
 * by a note narrowing which part of it, so a rule that folded the first would
 * leave the second untouched and the set would be half one thing and half
 * another.
 *
 * Named once however often it is written, because a set holds a place once.
 */
export function sourcesWritten(value: AttributeValue | undefined): string[] {
  if (value === undefined) return [];
  const named: string[] = [];
  for (const passage of Array.isArray(value) ? value : [value]) {
    for (const line of passage.split('\n')) {
      const place = line.trim().replace(ONE_OF_A_LIST, '').trim();
      if (place !== '' && !named.includes(place)) named.push(place);
    }
  }
  return named;
}

/** Exact match only. Guessing at unrecognised values would hide the defect. */
export function decomposeStatus(lens: Lens, raw: string): Decomposed | null {
  const mapping = lens.statusMappings.find((m) => m.match === raw);
  if (!mapping) return null;
  return { maturityLevel: mapping.maturity, sources: [...mapping.sources] };
}

export function isApproved(lens: Lens, level: string | null): boolean {
  if (level === null) return false;
  const { levels, approvedAtOrAbove } = lens.maturity;
  const threshold = levels.indexOf(approvedAtOrAbove);
  const actual = levels.indexOf(level);
  if (threshold < 0 || actual < 0) return false;
  return actual >= threshold;
}
