import { join } from 'node:path';
import { buildCorpus } from '@vertuo/comply-core';
import { extractSeed, interpret } from '@vertuo/comply-ingestion';
import { loadLens } from '@vertuo/comply-lens';
import { readPreviousSnapshot, writeSnapshot } from '@vertuo/comply-readiness';
import { holdSeed, readSeed, type Seed } from '@vertuo/comply-seed';
import { readCorpus } from './reading.js';

/**
 * The shelf this runner writes to, which is the one the server reads. Both take
 * it from the same place so that what a build reports and what a person is shown
 * are readings of the same knowledge.
 */
const SHELF = process.env['COMPLY_SHELF'] ?? '.comply';
const SEEDS_DIR = join(SHELF, 'seeds');
const RUNS_DIR = join(SHELF, 'runs');

const USAGE = [
  'Usage:',
  '  pnpm comply extract <lens.json>              write down the knowledge as found',
  '  pnpm comply report  <lens.json> [seed.json]  read it and say where it stands',
  '',
  `Both work on the shelf at ${SHELF}. Set COMPLY_SHELF to work on another.`,
].join('\n');

/**
 * Writes down what a business already has, and says nothing about it.
 *
 * The same content lands on the same file every time, so running this twice over
 * unchanged source is free and leaves what is already held exactly as it is.
 */
async function extractCommand(lensPath: string): Promise<void> {
  const lens = await loadLens(lensPath);
  const held = await holdSeed(SEEDS_DIR, await extractSeed(lens));

  console.log(
    held.alreadyHeld
      ? `Nothing has changed at source. Already held: ${held.path}`
      : `Knowledge as found: ${held.path}`,
  );
}

/**
 * Reads knowledge through a Lens and says where the Corpus stands.
 *
 * Given no Seed it takes the whole route — write down what is at source, then read
 * that back and apply the Lens — so what a build reports is what the server would
 * report from the same shelf. There is no shorter path that skips the Seed, because
 * a second route to knowledge is how two answers to one question appear.
 */
async function reportCommand(lensPath: string, seedPath: string | undefined): Promise<void> {
  const lens = await loadLens(lensPath);

  let seed: Seed;
  if (seedPath === undefined) {
    const held = await holdSeed(SEEDS_DIR, await extractSeed(lens));
    seed = await readSeed(held.path);
  } else {
    seed = await readSeed(seedPath);
  }

  const { facts, findings } = interpret(seed, lens);

  const takenAt = new Date().toISOString();
  const previous = await readPreviousSnapshot(RUNS_DIR, lens.id, takenAt);
  const reading = readCorpus(buildCorpus(facts), lens, findings, takenAt, previous);
  await writeSnapshot(RUNS_DIR, reading.snapshot);

  console.log(reading.text);
}

async function main(): Promise<void> {
  const [command, lensPath, seedPath] = process.argv.slice(2);

  if (lensPath === undefined || (command !== 'extract' && command !== 'report')) {
    console.error(USAGE);
    process.exitCode = 2;
    return;
  }

  if (command === 'extract') await extractCommand(lensPath);
  else await reportCommand(lensPath, seedPath);
}

await main();
