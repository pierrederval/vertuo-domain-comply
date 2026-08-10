import { createHash } from 'node:crypto';
import type { Seed } from './seed.js';

/**
 * JSON with every object's keys in a fixed order, so a digest is a property of
 * what a Seed says and not of the order it happened to be written in. Two
 * extractions of unchanged source therefore agree, which is what lets a load be
 * a no-op (ADR-0012).
 */
function canonical(value: unknown): string {
  // `value ?? null` rather than a literal fallback: an absent value encodes the
  // same way a null one does, and the four characters that says are JSON's to
  // write, not ours to spell out in a string (LAW-010).
  if (value === null || typeof value !== 'object') return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, v]) => `${JSON.stringify(key)}:${canonical(v)}`);
  return `{${entries.join(',')}}`;
}

/** The Seed's content digest: its identity, and what a Genesis entry cites. */
export function seedDigest(seed: Seed): string {
  return createHash('sha256').update(canonical(seed)).digest('hex');
}
