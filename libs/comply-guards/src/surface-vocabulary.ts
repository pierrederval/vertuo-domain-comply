import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { REPO_ROOT, scanLiterals, type Violation } from './scan.js';

export interface SurfaceReport {
  /**
   * The places it was asked about, repo-relative and as given. Kept beside the
   * files because a place with nothing in it reads identically to a place that
   * was never named, and only one of those two is a hole (LAW-006).
   */
  roots: string[];
  /**
   * The files the verdict was reached over, repo-relative. Named for the same
   * reason a coverage figure names its denominator (LAW-006): "nothing found"
   * means nothing at all until you know where it was looked for.
   */
  scanned: string[];
  violations: Violation[];
}

/**
 * The denominator of a clean verdict, in the words a run says it in: how many
 * files carried text a reader could meet, and how many of them each place held.
 *
 * A guard that finds nothing says nothing, and a guard that looked nowhere says
 * exactly the same nothing. Which of the two happened is decided entirely by
 * this figure, so it is stated on every run rather than kept as a number the
 * tests know and nobody is told. Per place, because that is the resolution the
 * shrinkage has: a package whose source moves out from under the guard keeps its
 * directory, raises nothing, and simply falls to none — visible here as a zero
 * and invisible in a total.
 */
export function sayWhatWasScanned(report: SurfaceReport): string {
  const width = Math.max(...report.roots.map((root) => root.length), 0);
  const held = (root: string): number =>
    report.scanned.filter((file) => file.startsWith(`${root}/`)).length;

  const lines = report.roots.map((root) => `  ${root.padEnd(width)} ${held(root)}`);
  return [
    `${report.scanned.length} files could carry text a reader meets, in ${report.roots.length} places:`,
    ...lines,
  ].join('\n');
}

/** Where a workspace package keeps the source that can carry a surface. */
const SOURCE_DIR = 'src';

const GROUPS = ['apps', 'libs'];

/**
 * Every place a surface could be written: the source directory of every package
 * in the workspace.
 *
 * Discovered rather than declared, so a package added later is guarded from its
 * first line without anybody remembering to register it — which is the whole
 * reason this guard lands before the first interface string. A package that
 * keeps its source somewhere else is refused rather than skipped, because being
 * quietly left out is indistinguishable from passing.
 *
 * `base` exists so the discovery rule itself can be tested; leave it alone
 * otherwise.
 */
export async function surfaceRoots(base: string = REPO_ROOT): Promise<string[]> {
  const roots: string[] = [];

  for (const group of GROUPS) {
    for (const entry of await readdir(join(base, group), { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;

      const contents = await readdir(join(base, group, entry.name));
      // No manifest means no package: a leftover directory, nothing to read.
      if (!contents.includes('package.json')) continue;
      if (!contents.includes(SOURCE_DIR)) {
        throw new Error(
          `${group}/${entry.name} has no ${SOURCE_DIR} directory, so the surface guard cannot see it. ` +
            `Move its source there, or take the package out of the workspace.`,
        );
      }
      roots.push(`${group}/${entry.name}/${SOURCE_DIR}`);
    }
  }
  return roots.sort();
}

/**
 * Reports engineering vocabulary reaching text a reader could meet — a label, an
 * error, an empty state, the words between two tags (LAW-010). `roots` are
 * repo-relative; `forbidden` are whole words.
 *
 * Two kinds of literal are left out, because neither is anything a reader is
 * shown: the path in an import or export, and whatever is written inside an
 * interpolation. `${index}` is an identifier that happens to sit between
 * backticks, and identifiers are the code's own business.
 *
 * A term matches at the start of a word and allows anything after it, and a
 * trailing *e* or *y* on the term is optional because English drops both before
 * a suffix. So every inflection is caught: *committed*, *parsing*, *unparsable*,
 * *indexed*, *nullable*, *schemas*, *repositories*. Requiring the end of the word
 * too would let all of those through, and a leak this guard misses is a leak
 * nobody ever finds — *parsing failed* is exactly the error state LAW-010 exists
 * to keep off a screen.
 *
 * The cost of the choice is over-catching: *commitment* reads as *commit*. That
 * is the right way round. An over-catch is one build failure a person reads and
 * resolves in a minute; an under-catch is silent for as long as the string lives.
 *
 * Known limitation, and the reason the rule stops at the start of a word: a term
 * behind a prefix is not seen — *unparsable*, *reindexed*. Matching anywhere in a
 * word would see both, and would also see *sparse*, and would rule against every
 * Finding code built on a prefixed term. Whether such a code is a surface at all
 * is a question for whoever names them, not for this guard to settle by failing a
 * build.
 */
export async function checkSurfaceVocabulary(
  roots: string[],
  forbidden: string[],
): Promise<SurfaceReport> {
  const patterns = forbidden.map(
    (term) => new RegExp(`\\b${term.toLowerCase().replace(/[ey]$/, (last) => `${last}?`)}`),
  );
  const { files, literals } = await scanLiterals(roots);
  const violations: Violation[] = [];

  for (const literal of literals) {
    if (literal.isModuleSpecifier) continue;
    const text = literal.text.replace(/\$\{[^}]*\}/g, ' ').toLowerCase();

    for (const [position, pattern] of patterns.entries()) {
      if (pattern.test(text)) {
        violations.push({ file: literal.file, line: literal.line, term: forbidden[position]! });
      }
    }
  }
  return { roots, scanned: files, violations };
}
