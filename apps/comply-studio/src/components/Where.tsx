import type { Place } from '@vertuo/comply-contract';

/**
 * Somewhere a person can go and check the claim for themselves (LAW-009).
 *
 * Shared, because it is also the only name every Corpus gives a piece of
 * knowledge: nothing in a Lens promises one another, so where a thing is written
 * down is what a reader is shown, what they follow, and what the three surfaces
 * that draw it have to agree about.
 */
export function Where({ at }: { at: Place }) {
  return <span className="font-mono text-sm">{`${at.file}, line ${at.line}`}</span>;
}

/**
 * Where one piece of knowledge is opened.
 *
 * Beside `Where` because they are two halves of one thing: a place is what a reader
 * is shown and also where following it takes them, and two files disagreeing about
 * how a place becomes an address would be two answers to one question.
 *
 * The Module in the address is the Module that *writes* at the place, which is not
 * always the Module that led the reader here — a Finding routes to the Module it is
 * about and cites the place the words are written. Its two halves travel named
 * rather than folded in: a document's path holds separators of its own, and one
 * carrying them encoded is an address that works here and is taken apart by the
 * first thing that tidies a path on its way through (ADR-0030).
 */
export function opensAt(corpusId: string, moduleId: string, at: Place): string {
  const held = `/corpus/${encodeURIComponent(corpusId)}/modules/${encodeURIComponent(moduleId)}`;
  return `${held}/knowledge?in=${encodeURIComponent(at.file)}&line=${at.line}`;
}
