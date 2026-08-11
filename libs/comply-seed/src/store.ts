import { mkdir, readdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { seedDigest } from './digest.js';
import { seedSchema, SEED_VERSION, type Seed } from './seed.js';

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

export interface ShelvedSeed {
  path: string;
  digest: string;
  /**
   * When this knowledge was written down from source. A Seed is written once and
   * never rewritten (ADR-0012), so the moment its file appeared is the moment the
   * source was last read — which is the age every reading made from it inherits.
   */
  heldAt: Date;
}

/** A digest is 64 hex characters, so `<lensId>-<digest>.json` parses without ambiguity. */
const HELD_SEED = /^(.+)-([0-9a-f]{64})\.json$/;

/**
 * The most recently written down Seed held for one Lens, or nothing.
 *
 * Nothing is a real answer and not a failure: a Lens whose source has never been
 * read is a Corpus with no knowledge written down yet, which a reader is entitled
 * to be told plainly rather than shown an empty reading of.
 *
 * The Lens's name is matched in full rather than as a prefix. `l1-extra`'s Seeds
 * begin with `l1-`, and handing them to `l1` would attribute one Corpus's
 * knowledge to another — the worst thing a shelf could do.
 */
export async function latestHeldSeed(dir: string, lensId: string): Promise<ShelvedSeed | null> {
  let names: string[];
  try {
    names = await readdir(dir);
  } catch {
    return null;
  }

  let latest: ShelvedSeed | null = null;
  for (const name of names) {
    const parsed = HELD_SEED.exec(name);
    if (parsed === null || parsed[1] !== lensId) continue;

    const path = join(dir, name);
    const heldAt = (await stat(path)).mtime;
    if (latest === null || heldAt > latest.heldAt) latest = { path, digest: parsed[2]!, heldAt };
  }
  return latest;
}

export async function readSeed(path: string): Promise<Seed> {
  const body: unknown = JSON.parse(await readFile(path, 'utf8'));

  // Said in a sentence before anything else is checked. Knowledge written down in
  // another form fails every rule that has changed since, so the reader would meet
  // a list of complaints about fields they have never heard of — when what happened
  // is one thing, and there is one thing to do about it.
  //
  // Which one thing depends on which way round it is, so the two are not conflated.
  // Older is the common case and is put right here; newer means this is the older
  // of two things reading one shelf, and re-reading the source would write the
  // knowledge down as this understands it and lose what the other recorded. What is
  // on the shelf is left exactly as it is either way: a Seed is never rewritten
  // (ADR-0012, ADR-0017).
  const held = (body as { version?: unknown } | null)?.version;
  if (typeof held === 'number' && held !== SEED_VERSION) {
    throw new Error(
      held < SEED_VERSION
        ? `The knowledge held at ${path} was written down before this reading learned to ` +
          `say everything it now says (it was written down as ${held}, and this reads ` +
          `${SEED_VERSION}). Write it down from source again, and this will read it.`
        : `The knowledge held at ${path} says more than this reading knows how to read ` +
          `(it was written down as ${held}, and this reads ${SEED_VERSION}). Something ` +
          `newer than this wrote it down. Read this shelf with that instead, rather ` +
          `than writing the knowledge down again from here.`,
    );
  }

  const parsed = seedSchema.safeParse(body);

  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('; ');
    throw new Error(`The Seed at ${path} cannot be read — ${detail}`);
  }
  return parsed.data;
}
