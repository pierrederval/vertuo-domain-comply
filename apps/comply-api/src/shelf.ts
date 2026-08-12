import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { CriteriaNotFollowed } from '@vertuo/comply-contract';
import { knowledgeCouldNotBeReadBack, shelfAt } from '@vertuo/comply-door';
import { lensDigest, loadLens, type Lens } from '@vertuo/comply-lens';
import { earlierReading, type RecordedReading } from '@vertuo/comply-readiness';
import { heldSeeds, readSeed, seedDigest, type Seed, type ShelvedSeed } from '@vertuo/comply-seed';

export interface ShelvedCorpus {
  lens: Lens;
  /** The knowledge as last written down, or nothing where the source is unread. */
  seed: Seed | null;
  /**
   * Why the knowledge last written down from this source could not be read back, or
   * nothing where it could.
   *
   * Beside the absent knowledge rather than in place of it, because a Corpus with
   * knowledge nothing can read and a Corpus nobody has read are different facts and
   * every surface here answers for both (spec §8). One value said which of the two
   * this is and gave every page the same wrong sentence for one of them.
   *
   * This Corpus keeps its id, its name and its pages. It has a Lens, so there is
   * somewhere for its reader to stand and something for them to press, and reading
   * its source again is the one thing to do about it (ADR-0034 §5). It was passed
   * over entirely until now, which put the action out of reach of the only Corpus
   * that needed it.
   */
  knowledgeCouldNotBeRead: string | null;
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
   * Files at the top of the shelf whose criteria could not be followed, each with the
   * sentence saying why and what to change.
   *
   * Reported rather than dropped, and reported to the reader rather than to a log.
   * A list quietly one Corpus short reads exactly like a shelf holding one Corpus
   * fewer, and would go on reading that way for as long as the file stayed unreadable
   * (LAW-006).
   *
   * These are not Corpus and are not among them. What says a Corpus has an id, a name
   * and a page is the file that could not be read, so one here would need all three
   * invented for it — and the file it is written in is the only name it has, which is
   * also the only thing to act on.
   *
   * It used to hold knowledge written down in an unreadable form too, which is why
   * `file` held a filename for one kind and a Lens id for the other. That Corpus has
   * a Lens and belongs above, with the pages that Lens earns it.
   */
  criteriaNotFollowed: CriteriaNotFollowed[];
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
export async function everyLensOn(
  dir: string,
): Promise<{ lenses: Lens[]; criteriaNotFollowed: CriteriaNotFollowed[] }> {
  const lenses: Lens[] = [];
  const criteriaNotFollowed: CriteriaNotFollowed[] = [];

  for (const entry of (await readdir(dir, { withFileTypes: true })).sort((a, b) =>
    a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
  )) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue;

    try {
      lenses.push(await loadLens(join(dir, entry.name)));
    } catch (cause) {
      // The whole sentence, written where the rules that refused it are, so the runner
      // and the Studio say one thing about one file (ADR-0034, spec §8). Nothing is
      // composed here: a reason worded at a surface is a reason worded twice.
      criteriaNotFollowed.push({
        where: entry.name,
        because: cause instanceof Error ? cause.message : String(cause),
      });
    }
  }
  return { lenses, criteriaNotFollowed };
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
  const { lenses, criteriaNotFollowed } = await everyLensOn(dir);

  for (const lens of lenses) {
    const writtenDown = await heldSeeds(kept.seeds, lens.id);
    const held = writtenDown.at(-1) ?? null;

    // A Corpus whose knowledge cannot be read back is a Corpus with no reading, and it
    // stays a Corpus. It has a Lens, so it has an id, a name, a page and an action on
    // that page — and reading its source again is the one thing to do about it, which
    // is a thing nobody could do while this passed it over entirely (ADR-0034 §5).
    //
    // Left to throw, one shelf holding knowledge written down in an older form would
    // take down the reading of every Corpus beside it (AC-4).
    let seed: Seed | null = null;
    let knowledgeCouldNotBeRead: string | null = null;
    if (held !== null) {
      try {
        seed = await readSeed(held.path);
      } catch {
        // The sentence and not the failure. What went wrong inside is about a file on a
        // shelf this product wrote and is free to write again (LAW-011); what a reader
        // is owed is that there is no reading and that a press makes one (LAW-010).
        knowledgeCouldNotBeRead = knowledgeCouldNotBeReadBack();
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
      knowledgeCouldNotBeRead,
      writtenDown,
      lastRecorded: await earlierReading(kept.readings, lens.id, inHand),
    });
  }

  corpus.sort((a, b) => (a.lens.id < b.lens.id ? -1 : a.lens.id > b.lens.id ? 1 : 0));
  return { corpus, criteriaNotFollowed };
}
