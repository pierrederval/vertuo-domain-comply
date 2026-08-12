/**
 * JSON with every object's keys in a fixed order, so a digest taken over it is a
 * property of what a thing *says* and not of the order it happened to be written
 * in.
 *
 * There is one of these on purpose. A Seed's identity and a Lens's identity are
 * the same question asked about two artifacts, and two canonicalisers would be
 * two answers to it — which would drift, in the direction of one of them
 * tolerating a shape the other does not, and the drift would show up as a
 * baseline that stops matching for no reason anybody could name (ADR-0016).
 */
export function canonicalJson(value: unknown): string {
  // `value ?? null` rather than a literal fallback: an absent value encodes the
  // same way a null one does, and the four characters that says are JSON's to
  // write, not ours to spell out in a string (LAW-010).
  if (value === null || typeof value !== 'object') return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, v]) => `${JSON.stringify(key)}:${canonicalJson(v)}`);
  return `{${entries.join(',')}}`;
}
