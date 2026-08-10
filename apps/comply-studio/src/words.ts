/**
 * One of a thing is not "1 things". A denominator a reader trips over is one they
 * discount, and a figure whose denominator is discounted is the bare number
 * LAW-006 refuses.
 */
export function count(howMany: number, unit: string): string {
  return `${howMany} ${howMany === 1 ? unit : `${unit}s`}`;
}
