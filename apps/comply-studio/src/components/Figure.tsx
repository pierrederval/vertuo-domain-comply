import { ChevronRight, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router';

export interface FigureProps {
  /** Which of the two readings this is. */
  reading: string;
  /**
   * The figure a reader tells this reading from the other one by.
   *
   * Declared beside the reading rather than looked up where the tile is drawn, which
   * is the reason `Destination.icon` is declared beside `Destination.label`: a third
   * reading, if one ever existed, would be one entry here and not one entry plus a
   * lookup somebody finds out about when it draws with nothing beside it.
   */
  icon: LucideIcon;
  /** What is being counted. */
  counts: string;
  value: number;
  /**
   * What the value is counted against, in words. Required, and deliberately so:
   * a figure without one reads as a verdict on the whole Corpus, and this
   * component is the only way the Studio draws a number (LAW-006).
   */
  outOf: string;
  /** The whole of what `outOf` summarises, where it is a set worth naming. */
  detail?: string;
  /**
   * Where the work this figure measures is.
   *
   * The whole tile is the link. A figure a reader cannot get from to the thing it
   * counts is a dashboard, which is the shape LAW-007 names: Readiness reaches the
   * grid, where a column can be read down, and Integrity reaches the queue, where
   * each Finding has a person.
   */
  to: string;
  /**
   * What the surface behind it will tell them, in one line.
   *
   * The destination's own words. Two bare readings could only be told apart by
   * clicking both, which is the same fault `Destination.describes` exists to fix and
   * the same fix.
   */
  answers: string;
}

/**
 * One reading, as a count with what it is counted against, and a way in to the work.
 *
 * There is no variant that fuses two of these, averages them, or turns one into a
 * rate, a grade, or a badge. Such a figure would stand for a Corpus's worth, route
 * to nobody, and imply nothing is missing — which is why the product has no such
 * figure to draw.
 *
 * This is also why nothing here is a tile with a ring in it, a bar, or a chip. Those
 * shapes have room for a number and no room for its denominator, so reaching for one
 * is how a figure loses the half of it that means anything. What is borrowed from
 * them is only the legibility: an icon so the two readings are told apart before
 * either is read, a heading at the weight of a heading, and a chevron because the
 * whole thing goes somewhere.
 */
export function Figure({
  reading,
  icon: Mark,
  counts,
  value,
  outOf,
  detail,
  to,
  answers,
}: FigureProps) {
  return (
    /*
     * `data-figure` is what asserts there are exactly two of these and never a
     * third. It is an attribute rather than the class, because a test that
     * counted the class would be deleted by whoever next restyled the page, and
     * a guard that disappears with a stylesheet is worse than no guard: nothing
     * reports its absence.
     */
    <Link
      to={to}
      data-figure=""
      className="group/figure flex flex-col gap-4 rounded-lg border border-border bg-panel px-5 py-4 shadow-xs transition-colors hover:border-line-strong focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      {/*
        Which reading this is, and what the surface behind it will tell them. The two
        readings answer different questions and demand different work, so which one a
        reader is looking at is the first thing the shape says — it was one line of
        small grey capitals with nothing to separate it from the figure, and the two
        cards read as one field of four grey lines. Small capitals are what a column
        heading is set in on the grid, so as a title they said *this is a table* and not
        *this is a reading*.

        The three parts sit on one ground and not in three banded strips. Banded, a tile
        holding one number read as a table with a heading and a footer, and the number
        was the emptiest thing on it.
      */}
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="grid size-8 shrink-0 place-items-center rounded-md bg-here-quiet text-here"
        >
          <Mark className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[0.9375rem] leading-5 font-semibold">{reading}</p>
          <p className="mt-0.5 text-xs leading-4 text-muted-foreground">{answers}</p>
        </div>
        {/* The tile goes somewhere, said in the one glyph that says it. It moves under
            the pointer rather than appearing, because a control that arrives on hover
            cannot be seen by somebody deciding whether to reach for it. */}
        <ChevronRight
          aria-hidden="true"
          className="mt-1 size-4 shrink-0 text-ink-faint transition-transform group-hover/figure:translate-x-0.5 group-hover/figure:text-foreground"
        />
      </div>

      {/* `mt-auto` so two tiles of unequal prose still put their figures on one line —
          a pair whose numbers sit at different heights reads as one being the more
          important of the two. */}
      <div className="mt-auto">
        <p className="text-xs font-medium tracking-wide text-ink-faint uppercase">{counts}</p>
        {/*
          The count and what it is counted against, on one line and on one baseline.
          They were stacked, which left the denominator as the fourth line of four and
          the first thing to go when a reader skims or a screen narrows — and a figure
          whose denominator can be lost is the bare number LAW-006 refuses. Read as one
          phrase, "0 of 28 Modules", it cannot be halved.
        */}
        <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
          <strong className="text-[2.5rem] leading-none font-semibold tracking-tight">
            {value}
          </strong>
          {/* Never smaller than the figure needs to stay legible: it is half of what
              the figure means, not a footnote to it. */}
          <span className="text-sm font-medium text-muted-foreground" title={detail}>
            {outOf}
          </span>
        </p>
      </div>
    </Link>
  );
}
