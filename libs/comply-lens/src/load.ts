import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { lensSchema, type Lens } from './lens.js';

export async function loadLens(path: string): Promise<Lens> {
  const parsed = lensSchema.safeParse(JSON.parse(await readFile(path, 'utf8')));

  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('; ');
    throw new Error(`Lens at ${path} is invalid — ${detail}`);
  }

  const lens = parsed.data;
  return {
    ...lens,
    adapter: { ...lens.adapter, root: resolve(dirname(path), lens.adapter.root) },
  };
}
