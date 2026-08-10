import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { seedDigest } from './digest.js';
import { seedSchema, type Seed } from './seed.js';

export interface HeldSeed {
  path: string;
  digest: string;
  /** True when a Seed of this digest was already held, so nothing was written. */
  alreadyHeld: boolean;
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Puts a Seed where it can be found, named by its digest.
 *
 * A Seed is never rewritten (ADR-0012). Extracting again from unchanged source
 * produces the same digest, finds the file already there, and leaves it exactly
 * as it was — so re-extracting is free and cannot damage a Seed some reading
 * already cites. Different source means a different digest and a new file
 * beside the old ones.
 */
export async function holdSeed(dir: string, seed: Seed): Promise<HeldSeed> {
  const digest = seedDigest(seed);
  const path = join(dir, `${seed.lensId}-${digest}.json`);

  await mkdir(dir, { recursive: true });
  if (await exists(path)) return { path, digest, alreadyHeld: true };

  // Written aside and moved into place, because a half-written file under a
  // digest-named path would be a permanently wrong artifact: nothing ever
  // overwrites it to put it right.
  const staging = join(dir, `.${digest}.${randomUUID()}.part`);
  await writeFile(staging, `${JSON.stringify(seed, null, 2)}\n`, 'utf8');
  await rename(staging, path);

  return { path, digest, alreadyHeld: false };
}

export async function readSeed(path: string): Promise<Seed> {
  const parsed = seedSchema.safeParse(JSON.parse(await readFile(path, 'utf8')));

  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('; ');
    throw new Error(`The Seed at ${path} cannot be read — ${detail}`);
  }
  return parsed.data;
}
