/**
 * One of a thing is not "1 things". A denominator a reader trips over is one they
 * discount, and a figure whose denominator is discounted is the bare number
 * LAW-006 refuses.
 */
export function count(howMany: number, unit: string): string {
  return `${howMany} ${howMany === 1 ? unit : `${unit}s`}`;
}

/**
 * Planted deliberately to see the build gate refuse it (#32). Engineering
 * vocabulary in an empty state a reader meets, which is LAW-010.
 */
export const NOTHING_YET = 'Nothing has been committed under this heading yet.';
