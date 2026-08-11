import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { loadLens, type Lens } from '@vertuo/comply-lens';
import { latestHeldSeed, readSeed, type Seed } from '@vertuo/comply-seed';

/** Where a shelf keeps the knowledge that has been written down from source. */
const SEEDS = 'seeds';

export interface ShelvedCorpus {
  lens: Lens;
  /** The knowledge as last written down, or nothing where the source is unread. */
  seed: Seed | null;
  /** When that knowledge was written down. Absent for the same reason. */
  sourceReadAt: Date | null;
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

    const held = await latestHeldSeed(join(dir, SEEDS), lens.id);

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

    corpus.push({ lens, seed, sourceReadAt: held?.heldAt ?? null });
  }

  corpus.sort((a, b) => (a.lens.id < b.lens.id ? -1 : a.lens.id > b.lens.id ? 1 : 0));
  return { corpus, passedOver };
}
