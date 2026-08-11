import type { Place } from '@vertuo/comply-contract';

/**
 * Somewhere a person can go and check the claim for themselves (LAW-009).
 *
 * Shared, because it is also the only name every Corpus gives a piece of
 * knowledge: nothing in a Lens promises one another, so where a thing is written
 * down is what a reader is shown, what they follow, and what the two surfaces that
 * draw it have to agree about.
 */
export function Where({ at }: { at: Place }) {
  return <span className="font-mono text-sm">{`${at.file}, line ${at.line}`}</span>;
}
