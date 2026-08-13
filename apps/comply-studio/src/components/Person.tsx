import { Conspicuous } from './layout.js';

/**
 * The letters a name is recognised by at a glance.
 *
 * Separated on anything that is not a letter or a digit, which is the only rule that
 * works for a name this product has never seen: an Owner is free text lifted from a
 * corpus, so it may be spelled with a dash, a dot, a space, or none of those, in any
 * script. Splitting on a space alone would give one letter to most of the corpora that
 * exist and two to the ones written in English (LAW-004).
 *
 * Two at most. Three initials in a circle this size is a shape a reader reads as a
 * word and fails to read as either.
 */
function recognisedBy(owner: string): string {
  const parts = owner.split(/[^\p{L}\p{N}]+/u).filter((part) => part !== '');
  // Nothing in the name is a letter or a digit, so there is nothing to take a first
  // letter of. The name itself still draws; only the circle beside it has nothing.
  if (parts.length === 0) return owner.slice(0, 2);
  return parts
    .slice(0, 2)
    .map((part) => [...part][0] ?? '')
    .join('');
}

/**
 * Who answers for something, or the fact that nobody does.
 *
 * Drawn beside every Finding rather than over a section of them, which is the whole
 * of why it exists. LAW-007's fact is that a defect belonging to nobody is how a
 * knowledge base quietly dies — and when the Owner was a heading above a hundred
 * rows, that fact was a property of a section a reader had already scrolled past.
 *
 * `data-answers-for` carries the name, or is empty where nobody does, so a test can
 * tell the two apart and count either. Empty is the one value no Owner can have:
 * every owner field in the agreement refuses an empty name, which is what makes it
 * free to mean this.
 */
export function Person({ owner }: { owner: string | null }) {
  if (owner === null) {
    return (
      <span data-answers-for="" className="inline-flex min-w-0 items-center gap-1.5">
        {/*
          Marked, not blank. A cell left empty where a name should be reads as a
          Finding that simply has no name beside it, and the whole point is that
          nothing will happen to this one until somebody is named.
        */}
        <span
          aria-hidden="true"
          className="grid size-5 shrink-0 place-items-center rounded-full bg-mark-quiet text-[0.625rem] font-bold text-mark"
        >
          !
        </span>
        <span className="truncate text-xs">
          <Conspicuous>nobody</Conspicuous>
        </span>
      </span>
    );
  }

  return (
    <span data-answers-for={owner} className="inline-flex min-w-0 items-center gap-1.5">
      {/* Where the reader is, borrowed for who a row belongs to: this blue is the one
          colour in the product that means *this one is yours*, and the mark is spent
          only on work that has landed on nobody. */}
      <span
        aria-hidden="true"
        className="grid size-5 shrink-0 place-items-center rounded-full bg-here-quiet text-[0.625rem] font-semibold text-here uppercase"
      >
        {recognisedBy(owner)}
      </span>
      <span className="truncate text-xs text-muted-foreground">{owner}</span>
    </span>
  );
}
