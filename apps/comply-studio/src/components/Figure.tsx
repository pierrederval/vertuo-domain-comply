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
    <div className="grid gap-0.5" data-figure="">
      <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {reading}
      </span>
      <span className="text-sm text-muted-foreground">{counts}</span>
      <strong className="text-3xl leading-tight font-semibold">{value}</strong>
      {/* Never smaller than the figure needs to stay legible: it is half of what
          the figure means, not a footnote to it. */}
      <span className="text-sm text-muted-foreground" title={detail}>
        {outOf}
      </span>
    </div>
  );
}
