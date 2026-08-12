import { mkdir, readFile, readdir, rename, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { FactId } from '@vertuo/comply-core';
import type { ModuleScore } from './score.js';

/**
 * A reading of a Corpus, kept so a later one has something to be compared with.
 *
 * A reading is a pure function of two inputs — the knowledge that was read and the
 * criteria it was read through — so this holds nothing a rebuild from those two
 * could not produce again (LAW-011). It names both, because a figure compared
 * against one taken under different criteria is not a comparison of knowledge at
 * all (ADR-0016).
 */
export interface RecordedReading {
  takenAt: string;
  lensId: string;
  /** The knowledge this was read from, as the Seed's digest. */
  seedDigest: string;
  /** The criteria this was read through, as the Lens's digest. */
  lensDigest: string;
  scores: ModuleScore[];
}

/**
 * What one Module's figure has done since the last reading kept to compare it
 * against.
 *
 * Three statements, and the difference between them is structural rather than a
 * value anybody has to remember to check. *Nothing to compare with* cannot be sent
 * as a delta of nothing, which is LAW-006 at this layer. And a reading taken
 * against other criteria cannot be sent as a delta either: a Facet asking for more
 * than it did last week drops the figure without a word of the knowledge changing,
 * and a shape carrying that fall as a loss would report the Corpus getting worse
 * when what happened is somebody raising the bar (§6).
 */
export type TrendRow =
  | { moduleId: FactId; comparedWith: 'no-earlier-reading' }
  | { moduleId: FactId; comparedWith: 'a-reading-under-other-criteria' }
  | { moduleId: FactId; comparedWith: 'the-last-reading'; approvedDelta: number };

export interface WhatWasRecorded {
  /** Where the reading now on record for these inputs is kept. */
  path: string;
  /**
   * True when a reading of this knowledge under these criteria was already on
   * record, so nothing was written.
   */
  alreadyRecorded: boolean;
}

/** One reading on record, with where it is kept. */
export interface ShelvedReading {
  path: string;
  reading: RecordedReading;
}

/**
 * A recorded reading as found where they are kept.
 *
 * Two kinds of file are tolerated on the way in, and only one of them survives the
 * reading.
 *
 * A reading from before ADR-0015 renamed the Lens carries its identity under the
 * old key, and those files are exactly the baselines a trend needs; refusing them
 * would discard every comparison point the rename inherited. Tolerated on read
 * only — nothing writes the old key, so the set of files needing it can only
 * shrink.
 *
 * A reading that names neither of its inputs is a different matter and is passed
 * over. It is what every recorded reading looked like before ADR-0016 was
 * implemented, and nothing true can be said about it: compared against, it puts a
 * delta on a page whose criteria nobody can check. What that costs is one
 * comparison point, which is recomputable from the two inputs, and it costs no
 * knowledge (LAW-001).
 */
interface AsRecorded extends Omit<RecordedReading, 'lensId' | 'seedDigest' | 'lensDigest'> {
  lensId?: string;
  profileId?: string;
  seedDigest?: string;
  lensDigest?: string;
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

/** Every file kept for one Lens that could be read at all, in no particular order. */
async function keptFor(dir: string, lensId: string): Promise<{ path: string; asRecorded: AsRecorded }[]> {
  let names: string[];
  try {
    names = await readdir(dir);
  } catch {
    return [];
  }

  const found: { path: string; asRecorded: AsRecorded }[] = [];
  for (const name of names) {
    if (!name.endsWith('.json')) continue;

    const path = join(dir, name);
    let asRecorded: AsRecorded;
    try {
      asRecorded = JSON.parse(await readFile(path, 'utf8')) as AsRecorded;
    } catch {
      // A single file left half-written costs one comparison point, not every
      // comparison point this Corpus has.
      continue;
    }

    if ((asRecorded.lensId ?? asRecorded.profileId) !== lensId) continue;
    found.push({ path, asRecorded });
  }
  return found;
}

/**
 * Every reading on record for one Lens, oldest first.
 *
 * Nothing is a real answer: a Corpus nobody has read yet has none of these, and so
 * does one whose shelf has been pruned back to its most recent reading.
 */
export async function readingsOnRecord(dir: string, lensId: string): Promise<ShelvedReading[]> {
  const found: ShelvedReading[] = [];

  for (const { path, asRecorded } of await keptFor(dir, lensId)) {
    const { seedDigest, lensDigest } = asRecorded;
    if (seedDigest === undefined || lensDigest === undefined) continue;

    // Normalised on the way out, so one transitional key never reaches a caller.
    const named = asRecorded.lensId ?? asRecorded.profileId!;
    found.push({ path, reading: { ...asRecorded, lensId: named, seedDigest, lensDigest } });
  }

  return found.sort((a, b) => a.reading.takenAt.localeCompare(b.reading.takenAt));
}

/**
 * Readings kept for one Lens that name neither of their inputs.
 *
 * Every reading recorded before ADR-0016 was implemented is one of these, and there
 * is nothing true to say about any of them: not what knowledge they were read from,
 * and not what was asked of it. So nothing reads one as a baseline — and that alone
 * would leave them sitting where no figure and no prune could see them, which is an
 * artifact this product holds and cannot account for (LAW-006).
 *
 * Named here so a prune can drop them and say it did. They are caches like any other
 * recorded reading, so dropping them costs the ability to work out where a Corpus
 * stood — which for these was never available in the first place.
 */
export async function readingsNamingNoInputs(dir: string, lensId: string): Promise<string[]> {
  return (await keptFor(dir, lensId))
    .filter(({ asRecorded }) => asRecorded.seedDigest === undefined || asRecorded.lensDigest === undefined)
    .map(({ path }) => path)
    .sort();
}

/**
 * The reading a fresh one is compared against: the most recent on record that is
 * not the fresh one, or nothing.
 *
 * **A reading is never compared against itself.** A reading goes on record the
 * moment either of its inputs changes, so the most recent one on any shelf is a
 * reading of exactly the knowledge in hand under exactly the criteria in hand. Handed
 * back as a baseline it reports every figure as *held steady* — on a Corpus nobody has
 * ever measured twice, on a Corpus whose source was rewritten this morning, on every
 * Corpus there is. *No baseline* and *no change* are different facts a reader acts on
 * differently, and this is the one place they were fused (LAW-006).
 *
 * So what a trend is stated against is the reading before the one in hand, which is
 * what §6 means by *since the last time either the knowledge or the criteria changed*.
 * Reading the source again therefore leaves a statement that holds however many times
 * the page is asked afterwards, rather than one that is true for as long as the
 * request takes.
 *
 * Both inputs have to match for a reading to be the one in hand. Passing over every
 * reading of this *knowledge* would reach past criteria that moved over unchanged
 * documents, which is the one thing worth saying on the morning somebody raises the
 * bar.
 */
export async function earlierReading(
  dir: string,
  lensId: string,
  inHand: { seedDigest: string; lensDigest: string },
): Promise<RecordedReading | null> {
  const earlier = (await readingsOnRecord(dir, lensId)).filter(
    ({ reading }) =>
      reading.seedDigest !== inHand.seedDigest || reading.lensDigest !== inHand.lensDigest,
  );

  return earlier.at(-1)?.reading ?? null;
}

/**
 * Puts a reading on record, if and only if one of its inputs has changed since the
 * last one.
 *
 * This is the only way a reading is written down, deliberately. The Studio has a
 * button that re-reads the source and somebody will press it four times in a
 * morning; recording each press would make *the last reading* mean twenty minutes
 * ago, every delta read as nothing, and last week's useful baseline sit under a
 * hundred files (ADR-0016). Deduplicating on the inputs rather than on the figures
 * makes the trend statement exact: what changed since the last time either the
 * knowledge or the criteria did.
 *
 * The same idempotence a load already has, by the same means: a digest over what an
 * artifact says (ADR-0012).
 */
export async function recordReading(
  dir: string,
  reading: RecordedReading,
): Promise<WhatWasRecorded> {
  const onRecord = (await readingsOnRecord(dir, reading.lensId)).at(-1);
  if (
    onRecord !== undefined &&
    onRecord.reading.seedDigest === reading.seedDigest &&
    onRecord.reading.lensDigest === reading.lensDigest
  ) {
    return { path: onRecord.path, alreadyRecorded: true };
  }

  await mkdir(dir, { recursive: true });
  const base = `${reading.lensId}-${reading.takenAt.replace(/[:.]/g, '-')}`;

  let name = `${base}.json`;
  let suffix = 1;
  while (await pathExists(join(dir, name))) {
    name = `${base}-${suffix}.json`;
    suffix += 1;
  }
  const path = join(dir, name);

  // Written aside, then renamed into place. Rename within a directory is atomic, so
  // a concurrent reader sees either the old contents or the whole new file, never
  // half of one.
  const staging = join(dir, `.${name}.${randomUUID()}.part`);
  await writeFile(staging, `${JSON.stringify(reading, null, 2)}\n`, 'utf8');
  await rename(staging, path);

  return { path, alreadyRecorded: false };
}

/**
 * What each Module's figure has done since the last recorded reading.
 *
 * The criteria are checked before the figures, and that order is the decision.
 * Where they moved, nothing in this reading is a comparison of knowledge with the
 * last one — including which Modules are in it, because a Facet arriving or leaving
 * changes which documents are read at all. Answering per Module first would say
 * *nothing to compare with* about a Module whose absence last week was the
 * criteria's doing, which is a second, quieter way of blaming the Corpus for a
 * change to the Lens.
 */
export function trend(
  current: RecordedReading,
  previous: RecordedReading | null,
): TrendRow[] {
  return current.scores.map(({ moduleId, approved }) => {
    if (previous === null) return { moduleId, comparedWith: 'no-earlier-reading' };
    if (previous.lensDigest !== current.lensDigest) {
      return { moduleId, comparedWith: 'a-reading-under-other-criteria' };
    }

    const before = previous.scores.find((score) => score.moduleId === moduleId);
    if (before === undefined) return { moduleId, comparedWith: 'no-earlier-reading' };
    return { moduleId, comparedWith: 'the-last-reading', approvedDelta: approved - before.approved };
  });
}
