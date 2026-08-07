import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Resolved from this file, so the guard works from any working directory. */
export const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url));

export interface Violation {
  /** Repo-relative, so the report reads the same wherever it was run from. */
  file: string;
  /** 1-indexed. */
  line: number;
  term: string;
}

async function sourceFiles(root: string): Promise<string[]> {
  const found: string[] = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) found.push(...(await sourceFiles(path)));
    else if (entry.name.endsWith('.ts')) found.push(path);
  }
  return found;
}

/**
 * Reports any forbidden term appearing inside a string literal under `roots`.
 * Comments and identifiers are ignored: only literals can leak corpus vocabulary
 * into code. `roots` are repo-relative.
 */
export async function checkCoreVocabulary(
  roots: string[],
  forbidden: string[],
): Promise<Violation[]> {
  const violations: Violation[] = [];
  const lowered = forbidden.map((term) => term.toLowerCase());

  for (const root of roots) {
    for (const file of await sourceFiles(join(REPO_ROOT, root))) {
      const lines = (await readFile(file, 'utf8')).split('\n');
      for (const [index, line] of lines.entries()) {
        const trimmed = line.trimStart();
        if (trimmed.startsWith('*') || trimmed.startsWith('//')) continue;

        for (const literal of line.matchAll(/'([^']*)'|"([^"]*)"/g)) {
          const value = (literal[1] ?? literal[2] ?? '').toLowerCase();
          for (const [position, term] of lowered.entries()) {
            if (value.includes(term)) {
              violations.push({
                file: relative(REPO_ROOT, file),
                line: index + 1,
                term: forbidden[position]!,
              });
            }
          }
        }
      }
    }
  }
  return violations;
}
