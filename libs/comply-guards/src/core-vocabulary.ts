import { scanLiterals, type Violation } from './scan.js';

/**
 * Reports any forbidden term appearing inside a string or template literal under
 * `roots`. Comments and identifiers are ignored: only literals can leak corpus
 * vocabulary into code. `roots` are repo-relative.
 *
 * Matching is substring and case-insensitive, because a corpus word leaks in
 * whatever shape it was written — a Lens that declares `Terms` is hardcoded just
 * as badly by the word `terms`, and by any longer word built around it.
 *
 * The line-based limitation of {@link scanLiterals} applies.
 */
export async function checkCoreVocabulary(
  roots: string[],
  forbidden: string[],
): Promise<Violation[]> {
  const violations: Violation[] = [];
  const lowered = forbidden.map((term) => term.toLowerCase());

  for (const literal of (await scanLiterals(roots)).literals) {
    const text = literal.text.toLowerCase();
    for (const [position, term] of lowered.entries()) {
      if (text.includes(term)) {
        violations.push({ file: literal.file, line: literal.line, term: forbidden[position]! });
      }
    }
  }
  return violations;
}
