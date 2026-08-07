import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

/** Every `.md` document under `root`, depth-first, sorted for deterministic output. */
export async function discoverDocuments(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const found: string[] = [];
  for (const entry of [...entries].sort((a, b) => a.name.localeCompare(b.name))) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) found.push(...(await discoverDocuments(path)));
    else if (entry.name.endsWith('.md')) found.push(path);
  }
  return found;
}
