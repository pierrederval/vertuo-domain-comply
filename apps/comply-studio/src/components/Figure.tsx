export interface FigureProps {
  /** Which of the two readings this is. */
  reading: string;
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
}

/**
 * One reading, as a count with what it is counted against.
 *
 * There is no variant that fuses two of these, averages them, or turns one into a
 * rate, a grade, or a badge. Such a figure would stand for a Corpus's worth, route
 * to nobody, and imply nothing is missing — which is why the product has no such
 * figure to draw.
 *
 * This is also why nothing here is a tile, a ring, or a chip. Those shapes have
 * room for a number and no room for its denominator, so reaching for one is how a
 * figure loses the half of it that means anything.
 */
export function Figure({ reading, counts, value, outOf, detail }: FigureProps) {
  return (
    /*
     * `data-figure` is what asserts there are exactly two of these and never a
     * third. It is an attribute rather than the class, because a test that
     * counted the class would be deleted by whoever next restyled the page, and
     * a guard that disappears with a stylesheet is worse than no guard: nothing
     * reports its absence.
     */
    <div
      className="flex flex-col overflow-hidden rounded-lg border border-border bg-panel shadow-xs"
      data-figure=""
    >
      {/*
        Which reading this is, in a band of its own. The two readings answer different
        questions and demand different work, so which one a reader is looking at is
        the first thing the shape says — it was one line of small grey capitals with
        nothing to separate it from the figure, and the two cards read as one field of
        four grey lines.
      */}
      <p className="border-b border-border bg-sunken px-5 py-2 text-xs font-semibold tracking-wide text-ink-faint uppercase">
        {reading}
      </p>
      <div className="px-5 py-4">
        <p className="text-sm text-muted-foreground">{counts}</p>
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
    </div>
  );
}
