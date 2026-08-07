import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const CORPUS_ROOT = fileURLToPath(new URL('../corpus/', import.meta.url));

/** Absolute path to a fixture, e.g. fixturePath('profile-a.json'). */
export function fixturePath(relative: string): string {
  return join(CORPUS_ROOT, relative);
}
