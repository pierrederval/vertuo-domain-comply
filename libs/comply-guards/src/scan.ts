import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Resolved from this file, so a guard works from any working directory. */
export const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url));

export interface Violation {
  /** Repo-relative, so the report reads the same wherever it was run from. */
  file: string;
  /** 1-indexed. */
  line: number;
  term: string;
}

/** One string or template literal, found at one place in the source. */
export interface Literal {
  /** Repo-relative. */
  file: string;
  /** 1-indexed. */
  line: number;
  /** Between the quotes, exactly as written — interpolations included. */
  text: string;
  /**
   * True when this literal names a module rather than saying anything: the
   * quoted part of an import or export. A path is never text anybody reads, so
   * a guard about what a reader meets skips it, and a guard about what the code
   * hardcodes does not.
   */
  isModuleSpecifier: boolean;
}

export interface Scan {
  /**
   * Every file the literals were taken from, repo-relative and in a stable
   * order. A verdict is only as good as what it was reached over, so the set is
   * reported rather than left implicit (LAW-006).
   */
  files: string[];
  literals: Literal[];
}

/** An import or export naming a module: `from '…'`, or a bare side-effect import. */
const MODULE_SPECIFIER = /^\s*(?:import|export)\b[^=]*\bfrom\s*['"]|^\s*import\s*['"]/;

const LITERAL = /`([^`]*)`|'([^']*)'|"([^"]*)"/g;

async function sourceFiles(root: string): Promise<string[]> {
  const found: string[] = [];
  const entries = (await readdir(root, { withFileTypes: true })).sort((a, b) =>
    a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
  );
  for (const entry of entries) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) found.push(...(await sourceFiles(path)));
    else if (entry.name.endsWith('.ts')) found.push(path);
  }
  return found;
}

/**
 * Every literal written under `roots`, which are repo-relative. Comments are
 * left out: a word in prose about the code is not a word in the code.
 *
 * A root that does not exist is an error and not an empty result. A guard that
 * reports nothing because it looked nowhere reads exactly like a guard that
 * found nothing wrong, and would go on reading that way for as long as the
 * directory stayed missing.
 *
 * Known limitation: scanning is line-based, so a term split across the lines of
 * a multi-line template literal is not seen.
 */
export async function scanLiterals(roots: string[]): Promise<Scan> {
  const files: string[] = [];
  const literals: Literal[] = [];

  for (const root of roots) {
    for (const path of await sourceFiles(join(REPO_ROOT, root))) {
      const file = relative(REPO_ROOT, path);
      files.push(file);

      for (const [index, line] of (await readFile(path, 'utf8')).split('\n').entries()) {
        const trimmed = line.trimStart();
        if (trimmed.startsWith('*') || trimmed.startsWith('//')) continue;

        const isModuleSpecifier = MODULE_SPECIFIER.test(line);
        for (const found of line.matchAll(LITERAL)) {
          literals.push({
            file,
            line: index + 1,
            text: found[1] ?? found[2] ?? found[3] ?? '',
            isModuleSpecifier,
          });
        }
      }
    }
  }
  return { files, literals };
}
