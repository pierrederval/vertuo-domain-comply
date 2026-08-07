import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { profileSchema, type Profile } from './profile.js';

export async function loadProfile(path: string): Promise<Profile> {
  const parsed = profileSchema.safeParse(JSON.parse(await readFile(path, 'utf8')));

  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('; ');
    throw new Error(`Profile at ${path} is invalid — ${detail}`);
  }

  const profile = parsed.data;
  return {
    ...profile,
    adapter: { ...profile.adapter, root: resolve(dirname(path), profile.adapter.root) },
  };
}
