import { unlink } from 'node:fs/promises';
import { heldLenses } from '@vertuo/comply-lens';
import { readingsNamingNoInputs, readingsOnRecord } from '@vertuo/comply-readiness';
import { heldSeeds } from '@vertuo/comply-seed';
import type { Shelf } from './shelf.js';

export interface WhatAPruneCost {
  /** Readings dropped from the record. */
  readings: string[];
  /**
   * Readings dropped that named neither of their inputs, so nothing could be stated
   * about them in the first place. Counted apart from the rest, because what they
   * cost is nothing and saying so is the point.
   */
  readingsSayingNothing: string[];
  /** Earlier writings-down of the knowledge, dropped. */
  knowledge: string[];
  /** Criteria no reading still on record cites, dropped. */
  criteria: string[];
  /**
   * As far back as a trend can now reach: when the oldest reading still on record
   * was taken, or nothing where the shelf holds none.
   */
  reachesBackTo: string | null;
  /**
   * Where the knowledge this Corpus is read from is still written down, or nothing
   * where the source has never been read.
   *
   * Kept in the answer and not left implicit. What a prune costs is worth stating
   * only next to what it could not cost, and an artifact that vanishes with no
   * account of it is indistinguishable from one that was never there (LAW-006).
   */
  knowledgeStillHeldAt: string | null;
}

/**
 * Drops what a rebuild could produce again, and nothing else.
 *
 * A reading is a pure function of the knowledge it was read from and the criteria
 * it was read through, so a recorded reading holds nothing unique — it is a cache,
 * which is what LAW-011 permits and what ADR-0016 relies on. This drops the older
 * ones and every retained input no reading still on record cites.
 *
 * Two things it can never drop, and neither is a matter of care taken here:
 *
 * The knowledge as last written down is kept whether or not a reading cites it,
 * because that is what this Corpus *is* read from — the Facts a person is shown
 * come out of it. Dropping it would cost knowledge, which LAW-001 refuses: the
 * Corpus is the record.
 *
 * And nothing in this file can reach a Fact at all. A Fact lives in the Corpus and
 * arrives through the Door (LAW-002); a shelf holds artifacts made from Facts, and
 * that asymmetry is what makes *a prune cannot cost a piece of knowledge* a
 * property of where things live rather than a promise somebody keeps.
 *
 * What it does cost is stated rather than implied: readings taken before the oldest
 * one still on record have to be worked out again, and where their inputs went with
 * them they cannot be.
 */
export async function prune(
  shelf: Shelf,
  lensId: string,
  keep: number,
): Promise<WhatAPruneCost> {
  const onRecord = await readingsOnRecord(shelf.readings, lensId);
  const kept = keep <= 0 ? [] : onRecord.slice(-keep);
  const dropped = onRecord.slice(0, onRecord.length - kept.length);

  const stillCited = {
    knowledge: new Set(kept.map((held) => held.reading.seedDigest)),
    criteria: new Set(kept.map((held) => held.reading.lensDigest)),
  };

  // The knowledge as last written down is what this Corpus is read from today, so
  // it stays whether a reading cites it or not.
  const written = await heldSeeds(shelf.seeds, lensId);
  const readFrom = written.at(-1) ?? null;
  const knowledge = written.filter(
    (seed) => seed.path !== readFrom?.path && !stillCited.knowledge.has(seed.digest),
  );
  const criteria = (await heldLenses(shelf.criteria, lensId)).filter(
    (held) => !stillCited.criteria.has(held.digest),
  );

  const cost = {
    readings: dropped.map((held) => held.path),
    readingsSayingNothing: await readingsNamingNoInputs(shelf.readings, lensId),
    knowledge: knowledge.map((seed) => seed.path),
    criteria: criteria.map((held) => held.path),
  };
  for (const path of [
    ...cost.readings,
    ...cost.readingsSayingNothing,
    ...cost.knowledge,
    ...cost.criteria,
  ]) {
    await unlink(path);
  }

  return {
    ...cost,
    reachesBackTo: kept.at(0)?.reading.takenAt ?? null,
    knowledgeStillHeldAt: readFrom?.path ?? null,
  };
}
