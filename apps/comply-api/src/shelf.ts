import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { shelfAt } from '@vertuo/comply-door';
import { lensDigest, loadLens, type Lens } from '@vertuo/comply-lens';
import { earlierReading, type RecordedReading } from '@vertuo/comply-readiness';
import { heldSeeds, readSeed, seedDigest, type Seed, type ShelvedSeed } from '@vertuo/comply-seed';

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
   * The reading a fresh one is compared against: the most recent on record that was
   * not made of the knowledge in hand under the criteria in hand, or nothing where
   * there is none.
   *
   * Never the reading in hand itself. A reading goes on record wherever a Seed is
   * loaded — the runner, a build, or a person pressing the action on Corpus detail —
   * so the most recent one on any shelf is a reading of exactly what is in hand, and
   * handed back as a baseline it reports every figure as *held steady* on a Corpus
   * nobody has measured twice (see `earlierReading`, ADR-0034).
   *
   * Read here and never written. A recorded reading is a cache of a value derived
   * from the Seed and the Lens (ADR-0016), so reading one leaves the Corpus exactly
   * as it was and is not a write path around the Door (LAW-002).
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
 * Every set of criteria on a shelf, each one a Corpus, whatever state its knowledge
 * is in.
 *
 * Separate from reading the knowledge deliberately. A Corpus whose knowledge cannot be
 * read is passed over below and so cannot be reported on — but it can still be read
 * again from its source, and that is the one thing to do about it. Found here, the
 * action reaches exactly the Corpus that most needs it; found through a reading, it
 * would be missing from the only page that could offer it.
 */
export async function everyLensOn(dir: string): Promise<{ lenses: Lens[]; passedOver: Shelf['passedOver'] }> {
  const lenses: Lens[] = [];
  const passedOver: Shelf['passedOver'] = [];

  for (const entry of (await readdir(dir, { withFileTypes: true })).sort((a, b) =>
    a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
  )) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue;

    try {
      lenses.push(await loadLens(join(dir, entry.name)));
    } catch (cause) {
      passedOver.push({
        file: entry.name,
        reason: cause instanceof Error ? cause.message : String(cause),
      });
    }
  }
  return { lenses, passedOver };
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
  const kept = shelfAt(dir);
  const { lenses, passedOver } = await everyLensOn(dir);

  for (const lens of lenses) {
    const writtenDown = await heldSeeds(kept.seeds, lens.id);
    const held = writtenDown.at(-1) ?? null;

    // One Corpus whose knowledge cannot be read is one Corpus passed over, and the
    // reason travels with it. Left to throw, a single shelf holding knowledge written
    // down in an older form takes down the reading of every other Corpus beside it —
    // and the one thing to do about it goes unsaid, because nothing is left standing
    // to say it.
    //
    // Where a reason goes from here is the server's business, and today it goes only
    // to its own log. A reader is told a Corpus is on the shelf or is not, never why
    // one is missing, which is a gap this did not open and does not close. What it can
    // now do is act: the action that reads a source again finds its Lens without
    // coming through here, so the one thing to do about knowledge written down in an
    // older form is reachable on a Corpus this passes over.
    let seed: Seed | null = null;
    if (held !== null) {
      try {
        seed = await readSeed(held.path);
      } catch (cause) {
        passedOver.push({
          file: lens.id,
          reason: cause instanceof Error ? cause.message : String(cause),
        });
        continue;
      }
    }

    // Asked for by the two inputs in hand, so the reading in hand cannot come back
    // as its own baseline. A Corpus with nothing written down has no reading in hand
    // and nothing to compare, which the digests below stand in for.
    const inHand = {
      seedDigest: seed === null ? '' : seedDigest(seed),
      lensDigest: lensDigest(lens),
    };

    corpus.push({
      lens,
      seed,
      writtenDown,
      lastRecorded: await earlierReading(kept.readings, lens.id, inHand),
    });
  }

  corpus.sort((a, b) => (a.lens.id < b.lens.id ? -1 : a.lens.id > b.lens.id ? 1 : 0));
  return { corpus, passedOver };
}
