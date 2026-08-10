import type { Lens } from './lens.js';

export interface Decomposed {
  maturityLevel: string;
  sources: string[];
}

/** Exact match only. Guessing at unrecognised values would hide the defect. */
export function decomposeStatus(lens: Lens, raw: string): Decomposed | null {
  const mapping = lens.statusMappings.find((m) => m.match === raw);
  if (!mapping) return null;
  return { maturityLevel: mapping.maturity, sources: [...mapping.sources] };
}

export function isApproved(lens: Lens, level: string | null): boolean {
  if (level === null) return false;
  const { levels, approvedAtOrAbove } = lens.maturity;
  const threshold = levels.indexOf(approvedAtOrAbove);
  const actual = levels.indexOf(level);
  if (threshold < 0 || actual < 0) return false;
  return actual >= threshold;
}
