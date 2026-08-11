import type { ReactNode } from 'react';

/**
 * The whole of the Studio's layout vocabulary.
 *
 * Thin on purpose. ADR-0013 commits this interface to the shared design system,
 * which is not reachable from this repository, so what stands in its place is a
 * handful of components over CSS custom properties and nothing else (spec §3.7).
 * Adopting the real one later is then a contained swap, where a third-party
 * component library would be a second deviation that also has to be undone.
 */

export function Page({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="page">
      <h1 className="page-title">{title}</h1>
      {children}
    </main>
  );
}

export function Stack({ children }: { children: ReactNode }) {
  return <div className="stack">{children}</div>;
}

export function Panel({ children }: { children: ReactNode }) {
  return <section className="panel">{children}</section>;
}

export function PanelHeading({ children }: { children: ReactNode }) {
  return <h2 className="panel-heading">{children}</h2>;
}

/** Text that qualifies something rather than saying it. */
export function Aside({ children }: { children: ReactNode }) {
  return <p className="aside">{children}</p>;
}

/**
 * What a surface says when it has nothing to show.
 *
 * A sentence, never a blank space. Which of the several reasons for having nothing
 * to show applies is the difference between a Corpus nobody has written down yet
 * and one that could not be read, and the two are never drawn the same.
 */
export function NothingToShow({ children }: { children: ReactNode }) {
  return <p className="nothing-to-show">{children}</p>;
}

/**
 * Marks something a person has to act on, conspicuously.
 *
 * LAW-007: a Module nobody owns is a defect and not a blank, so absence gets a
 * mark of its own rather than an empty cell.
 */
export function Conspicuous({ children }: { children: ReactNode }) {
  return (
    <span className="conspicuous" data-conspicuous="">
      {children}
    </span>
  );
}
