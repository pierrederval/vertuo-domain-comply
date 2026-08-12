import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { loadLens, type Lens } from '@vertuo/comply-lens';
import { lastRecordedReading, type RecordedReading } from '@vertuo/comply-readiness';
import { heldSeeds, readSeed, type Seed, type ShelvedSeed } from '@vertuo/comply-seed';

/** Where a shelf keeps the knowledge that has been written down from source. */
const SEEDS = 'seeds';

/** Where it keeps the readings put on record, which are what a trend is stated against. */
const READINGS = 'runs';

export interface ShelvedCorpus {
  lens: Lens;
  /** The knowledge as last written down, or nothing where the source is unread. */
  seed: Seed | null;
  /**
   * Every writing-down of this source the shelf still holds, oldest first, so the
   * last of them is the knowledge above and the moment it appeared is the age every
   * reading made from it inherits.
   *
   * Carried whole rather than as the latest alone, because each one is a time the
   * source was read and said something new — a Seed is never rewritten and holding
   * an unchanged one is a no-op (ADR-0012), so there is one of these per change at
   * source and none per run.
   */
  writtenDown: ShelvedSeed[];
  /**
   * The last reading put on record for this Corpus, which is what a fresh one is
   * compared against, or nothing where none has been.
   *
   * Read here and never written. A recorded reading is a cache of a value derived
   * from the Seed and the Lens (ADR-0016), so reading one leaves the Corpus exactly
   * as it was and is not a write path around the Door (LAW-002). Putting one on
   * record happens where a Seed is loaded, which is the runner.
   */
  lastRecorded: RecordedReading | null;
}

export interface Shelf {
  /** Every Corpus found, by Lens id, so the list reads the same on every boot. */
  corpus: ShelvedCorpus[];
  /**
   * Files at the top of the shelf that are not a Lens, with the reason each was
   * not read as one.
   *
   * Reported rather than dropped. A list that is quietly one Corpus short reads
   * exactly like a shelf that holds one Corpus fewer, and would go on reading that
   * way for as long as the file stayed unreadable (LAW-006). Saying why is #27's
   * work; not hiding that it happened is this slice's.
   */
  passedOver: { file: string; reason: string }[];
}

/**
 * Reads a shelf: every Lens on it is a Corpus, and the knowledge written down for
 * each sits beside it (spec §3.5).
 *
 * This is scaffolding and is named as such. When the ledger arrives the shelf
 * becomes a registry behind `libs/system-db` and nothing above here moves, because
 * the seam is the Reading and not the storage.
 */
export async function readShelf(dir: string): Promise<Shelf> {
  const corpus: ShelvedCorpus[] = [];
  const passedOver: Shelf['passedOver'] = [];

  for (const entry of (await readdir(dir, { withFileTypes: true })).sort((a, b) =>
    a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
  )) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue;

    let lens: Lens;
    try {
      lens = await loadLens(join(dir, entry.name));
    } catch (cause) {
      passedOver.push({ file: entry.name, reason: cause instanceof Error ? cause.message : String(cause) });
      continue;
    }

    const writtenDown = await heldSeeds(join(dir, SEEDS), lens.id);
    const held = writtenDown.at(-1) ?? null;

    // One Corpus whose knowledge cannot be read is one Corpus passed over, and the
    // reason travels with it. Left to throw, a single shelf holding knowledge written
    // down in an older form takes down the reading of every other Corpus beside it —
    // and the one thing to do about it goes unsaid, because nothing is left standing
    // to say it.
    //
    // Where a reason goes from here is the server's business, and today it goes only
    // to its own log. A reader is told a Corpus is on the shelf or is not, never why
    // one is missing, which is a gap this did not open and does not close.
    let seed: Seed | null = null;
    if (held !== null) {
      try {
        seed = await readSeed(held.path);
      } catch (cause) {
        passedOver.push({
          file: entry.name,
          reason: cause instanceof Error ? cause.message : String(cause),
        });
        continue;
      }
    }

    corpus.push({
      lens,
      seed,
      writtenDown,
      lastRecorded: await lastRecordedReading(join(dir, READINGS), lens.id),
    });
  }

  corpus.sort((a, b) => (a.lens.id < b.lens.id ? -1 : a.lens.id > b.lens.id ? 1 : 0));
  return { corpus, passedOver };
}
