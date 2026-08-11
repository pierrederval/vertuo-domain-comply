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
 * figure to draw (spec §4).
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
    <div className="figure" data-figure="">
      <span className="figure-reading">{reading}</span>
      <span className="figure-counts">{counts}</span>
      <strong className="figure-value">{value}</strong>
      <span className="figure-out-of" title={detail}>
        {outOf}
      </span>
    </div>
  );
}
