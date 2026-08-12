import { buildCorpus } from '@vertuo/comply-core';
import { extractSeed, interpret } from '@vertuo/comply-ingestion';
import { holdLens, loadLens } from '@vertuo/comply-lens';
import { lastRecordedReading, recordReading } from '@vertuo/comply-readiness';
import { holdSeed, readSeed, seedDigest, whatWasRead, type Seed } from '@vertuo/comply-seed';
import { prune, type WhatAPruneCost } from './prune.js';
import { readCorpus } from './reading.js';
import type { Shelf } from './shelf.js';

/**
 * Writes down what a business already has, and says nothing about it.
 *
 * The same content lands on the same file every time, so running this twice over
 * unchanged source is free and leaves what is already held exactly as it is.
 */
export async function extractCommand(shelf: Shelf, lensPath: string): Promise<string> {
  const lens = await loadLens(lensPath);
  const held = await holdSeed(shelf.seeds, await extractSeed(lens));

  return held.alreadyHeld
    ? `Nothing has changed at source. Already held: ${held.path}`
    : `Knowledge as found: ${held.path}`;
}

/**
 * Reads knowledge through a Lens and says where the Corpus stands.
 *
 * Given no Seed it takes the whole route — write down what is at source, then read
 * that back and apply the Lens — so what a build reports is what the server would
 * report from the same shelf. There is no shorter path that skips the Seed, because
 * a second route to knowledge is how two answers to one question appear.
 *
 * Reading is free. What is written down is a *reading on record*, and only where the
 * knowledge or the criteria have changed since the last one (ADR-0016) — so running
 * this four times in a morning leaves one reading to be compared against and not
 * four, and last week's baseline stays where a person can still see past it.
 *
 * The criteria are held before the reading is, always, so a reading on record can
 * never cite criteria the shelf does not have. Holding them is idempotent by digest,
 * exactly as holding the knowledge is, so doing it on every run costs a file check.
 */
export async function reportCommand(
  shelf: Shelf,
  lensPath: string,
  seedPath: string | undefined,
): Promise<string> {
  const lens = await loadLens(lensPath);

  let seed: Seed;
  if (seedPath === undefined) {
    const held = await holdSeed(shelf.seeds, await extractSeed(lens));
    seed = await readSeed(held.path);
  } else {
    seed = await readSeed(seedPath);
  }

  const { facts, findings } = interpret(seed, lens);

  const takenAt = new Date().toISOString();
  const previous = await lastRecordedReading(shelf.readings, lens.id);
  const reading = readCorpus(
    buildCorpus(facts),
    lens,
    findings,
    { takenAt, seedDigest: seedDigest(seed), previous },
    whatWasRead(seed),
  );

  await holdLens(shelf.criteria, lens);
  const kept = await recordReading(shelf.readings, reading.asRecorded);

  return [
    reading.text,
    '',
    kept.alreadyRecorded
      ? `Neither the knowledge nor the criteria have changed since the last reading on record, so nothing was written down. That reading is still the one this is compared against: ${kept.path}`
      : `On record, so a later reading has this to be compared against: ${kept.path}`,
  ].join('\n');
}

/** How many readings a prune keeps where nobody says. The one a trend is stated against. */
const KEEPS = 1;

/**
 * Drops the readings and retained inputs a rebuild could produce again, and says
 * what that cost.
 *
 * Stated in full every time, including the nothing it cost. An artifact that
 * vanishes with no account of it is indistinguishable from one that was never there
 * (LAW-006), and *no knowledge was dropped* is the half of the answer somebody is
 * actually looking for.
 */
export async function pruneCommand(
  shelf: Shelf,
  lensPath: string,
  keeping: string | undefined,
): Promise<string> {
  const keep = keeping === undefined ? KEEPS : Number(keeping);
  if (!Number.isInteger(keep) || keep < 0) {
    throw new Error(
      `“${keeping}” is not a number of readings to keep. Give a whole number, or leave it out to keep the ${KEEPS} a trend is stated against.`,
    );
  }

  const lens = await loadLens(lensPath);
  return sayWhatItCost(lens.id, await prune(shelf, lens.id, keep));
}

function sayWhatItCost(lensId: string, cost: WhatAPruneCost): string {
  const dropped = [
    `  readings on record: ${cost.readings.length}`,
    `  readings naming neither what they were read from nor what was asked of it: ${cost.readingsSayingNothing.length}`,
    `  earlier knowledge as written down: ${cost.knowledge.length}`,
    `  criteria no reading still on record was taken through: ${cost.criteria.length}`,
  ];

  return [
    `Pruned “${lensId}”. Dropped:`,
    ...dropped,
    cost.reachesBackTo === null
      ? 'No reading is on record for this Corpus now, so the next one taken has nothing to be compared against and will say so.'
      : `A trend now reaches back no further than ${cost.reachesBackTo}. Where this Corpus stood before then has to be worked out again from what is still held, and where an input went with the reading it cannot be.`,
    cost.knowledgeStillHeldAt === null
      ? 'No knowledge was dropped. Nothing has been written down from this source yet, and a prune could not have reached it: what is written down is the record, and this reaches only what was made from it.'
      : `No knowledge was dropped. What is at source is still written down at ${cost.knowledgeStillHeldAt}, and a prune reaches only what was made from it.`,
  ].join('\n');
}
