import type { ReactNode } from 'react';

/**
 * The few pieces of layout that carry meaning rather than appearance.
 *
 * Everything that was only appearance is gone: ADR-0018 makes the vendored
 * components this product's vocabulary, and a bespoke wrapper over one of them
 * would rebuild the layer that decision removes. What is left is here because
 * each piece says something a `Card` cannot.
 */

/** One surface's worth of content, and the rhythm every one of them is read at. */
export function Surface({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-6">{children}</div>;
}

/**
 * The two readings, side by side.
 *
 * Exactly two, which the type says rather than the layout hoping: Readiness and
 * Integrity answer different questions — how much is agreed, how much disagrees
 * — demand different work, and often different people. A third figure in this
 * position would read as the pair combined, and no such figure exists (LAW-006).
 * Neither is ever drawn larger than the other and nothing sits between them.
 */
export function Readings({ children }: { children: readonly [ReactNode, ReactNode] }) {
  return <div className="grid gap-6 sm:grid-cols-2">{children}</div>;
}

/** Text that qualifies something rather than saying it. */
export function Aside({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

/**
 * What a surface says when it has nothing to show.
 *
 * A sentence, never a blank space. Which of the several reasons for having
 * nothing to show applies is the difference between a Corpus nobody has written
 * down yet and one that could not be read, and the two are never drawn the same.
 */
export function NothingToShow({ children }: { children: ReactNode }) {
  return <p className="text-muted-foreground">{children}</p>;
}

/**
 * Marks something a person has to act on, conspicuously.
 *
 * LAW-007: a Module nobody owns is a defect and not a blank, so absence gets a
 * mark of its own rather than an empty cell.
 */
export function Conspicuous({ children }: { children: ReactNode }) {
  return (
    <span className="font-semibold text-mark" data-conspicuous="">
      {children}
    </span>
  );
}
