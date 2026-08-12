import { mkdir, readdir, rename, stat, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { lensDigest, whatTheLensSays } from './digest.js';
import type { Lens } from './lens.js';

/** One set of criteria on the shelf: where it is, and what it says, as a digest. */
export interface ShelvedLens {
  path: string;
  digest: string;
}

export interface HeldLens extends ShelvedLens {
  /** True when a Lens saying this was already held, so nothing was written. */
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
 * Puts the criteria a reading was taken against where they can be found again,
 * named by their digest.
 *
 * A Lens is hand-authored and changes in place, so *which criteria were in force
 * last Tuesday* is unanswerable from the file itself. Holding what it said,
 * whenever a reading was recorded against it, is what closes that (ADR-0016) —
 * and it is the same discipline a Seed is already held under, deliberately: one
 * rule for retained inputs, one shape on the shelf, one thing a prune has to
 * understand.
 *
 * A recorded reading cites this by digest rather than carrying the content, so the
 * criteria are an artifact in their own right. Carried inside the recorded reading
 * instead, the only copy of last Tuesday's criteria would live inside a cache —
 * and deleting every derived artifact would then lose something, which is exactly
 * what LAW-011 forbids.
 *
 * Written aside and moved into place, because a half-written file under a
 * digest-named path would be a permanently wrong artifact: nothing ever overwrites
 * it to put it right.
 */
export async function holdLens(dir: string, lens: Lens): Promise<HeldLens> {
  const digest = lensDigest(lens);
  const path = join(dir, `${lens.id}-${digest}.json`);

  await mkdir(dir, { recursive: true });
  if (await exists(path)) return { path, digest, alreadyHeld: true };

  const staging = join(dir, `.${digest}.${randomUUID()}.part`);
  await writeFile(staging, `${JSON.stringify(whatTheLensSays(lens), null, 2)}\n`, 'utf8');
  await rename(staging, path);

  return { path, digest, alreadyHeld: false };
}

/** A digest is 64 hex characters, so `<lensId>-<digest>.json` comes apart without ambiguity. */
const HELD_LENS = /^(.+)-([0-9a-f]{64})\.json$/;

/**
 * Every set of criteria held for one Lens, oldest first.
 *
 * The Lens's name is matched in full rather than as a prefix, for the reason
 * `latestHeldSeed` matches it in full: `p-extra`'s files begin with `p-`, and
 * handing them to `p` would attribute one Corpus's criteria to another.
 *
 * Nothing is a real answer and not a failure: a Lens no reading has ever been
 * recorded against has none of these, and so does a shelf that has been pruned
 * back to its most recent reading.
 */
export async function heldLenses(dir: string, lensId: string): Promise<ShelvedLens[]> {
  let names: string[];
  try {
    names = await readdir(dir);
  } catch {
    return [];
  }

  return names
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    .flatMap((name) => {
      const held = HELD_LENS.exec(name);
      if (held === null || held[1] !== lensId) return [];
      return [{ path: join(dir, name), digest: held[2]! }];
    });
}
