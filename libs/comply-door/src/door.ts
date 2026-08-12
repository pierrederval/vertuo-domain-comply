import { extractSeed } from '@vertuo/comply-ingestion';
import { holdLens, type Lens } from '@vertuo/comply-lens';
import { earlierReading, recordReading } from '@vertuo/comply-readiness';
import { readSeededCorpus, type Reading } from '@vertuo/comply-reading';
import { holdSeed, readSeed, seedDigest, type Seed } from '@vertuo/comply-seed';
import type { Shelf } from './shelf.js';

export interface KnowledgeWasRead {
  reading: Reading;
  /**
   * The knowledge this reading was made of, as it is written down.
   *
   * Carried because a reading says what it was counted over and not how much of the
   * source it was read from — how many documents there were, and how much of them a
   * Facet said was none of its business. Both are a denominator (LAW-006), and
   * neither survives interpretation.
   */
  knowledge: Seed;
  /** Where the knowledge this reading was made of is written down. */
  writtenDownAt: string;
  /** Where the reading now on record for these two inputs is kept. */
  onRecordAt: string;
  /**
   * True where a reading of this knowledge through these criteria was already on
   * record, so nothing was written down.
   */
  alreadyOnRecord: boolean;
}

export interface SourceWasReadAgain extends KnowledgeWasRead {
  /**
   * True where what is at source said nothing that was not already written down.
   *
   * About the source and never about the run. A reading was taken either way — that
   * is free and happens on every request — and what this reports is whether the
   * business's own knowledge has moved, which is the only half of it a person has
   * anything to do about (ADR-0012).
   */
  unchangedAtSource: boolean;
}

/**
 * Where a Lens says the documents are, when they are not there.
 *
 * The failure this action has, and the one a person is most likely to meet: the
 * source is a separate checkout and a shelf outlives it. Said as the place it looked
 * and what that means, rather than as the call that failed, because the thing to do
 * about it is to go and look at that place (LAW-010).
 */
function saidWhereItLooked(root: string, cause: unknown): Error {
  const missing =
    typeof cause === 'object' &&
    cause !== null &&
    'code' in cause &&
    (cause.code === 'ENOENT' || cause.code === 'ENOTDIR');

  return new Error(
    missing
      ? `The documents this Corpus is read from are not where its Lens says they are. ` +
        `Nothing is at ${root}. Put the source there, or point the Lens at where it is.`
      : `The documents this Corpus is read from could not be read at ${root}.`,
    { cause },
  );
}

/**
 * The shelf itself would not take what was read.
 *
 * A disk that is full, a place that is not writable, a shelf somebody moved while this
 * was running. Nothing a reader can do about the knowledge, and everything they can do
 * about the machine — so it says which of the two happened and that nothing changed,
 * rather than handing over the words a call inside this failed with (LAW-010).
 */
function couldNotKeepIt(cause: unknown): Error {
  return new Error(
    'The source was read, but what it says could not be written down where this product ' +
      'keeps it. Nothing has changed, and reading it again is safe once that is put right.',
    { cause },
  );
}

/**
 * What is kept for this Corpus on the shelf cannot be read back, so the press cannot
 * get past it.
 *
 * The one failure here whose remedy is not another press, because a press is what has
 * just met it: unchanged source finds the Seed already held and reads that, so a
 * damaged file under that name stops every read of that source until it is gone.
 *
 * So the sentence says the way out instead, which is LAW-011 said to a person. What
 * this product keeps for itself is derived from the source and can always be thrown
 * away and worked out again; the knowledge is at source and none of it is at risk.
 */
function whatIsKeptCannotBeRead(cause: unknown): Error {
  return new Error(
    'The source was read, and what is kept for this Corpus on the shelf cannot be read ' +
      'back, so reading again cannot get past it. Nothing about the knowledge has ' +
      'changed, and none of it is at risk: what this product keeps for itself is worked ' +
      'out from the source and can be dropped and worked out again, which is the way out.',
    { cause },
  );
}

/**
 * What was written down from a source cannot be read back.
 *
 * The Corpus has knowledge and no reading of it, which is not the same fact as a
 * Corpus nobody has read — and *nothing has been written down from this source yet*
 * is what every surface said about it until spec §8 was built. That sentence is not a
 * blank space but the wrong true-sounding one: it sends a reader to read a source that
 * has already been read, and never mentions what happened.
 *
 * Written here rather than at either surface, for the reason the two failures above
 * it are: the runner and the Studio both meet this, and two wordings of one fact is
 * how they come to say different things about one shelf (ADR-0034).
 *
 * It names no file. Where a Corpus's knowledge is written down is a derived artifact
 * this product is free to throw away and make again (LAW-011), so the remedy is a
 * press and not something to open — which is exactly the other way round from a set
 * of criteria that could not be followed, where the file *is* the remedy.
 */
export function knowledgeCouldNotBeReadBack(): string {
  return (
    'The knowledge last written down from this source cannot be read back, so there is ' +
    'no reading of it. Reading the source again writes down what is there now, and this ' +
    'Corpus is read from that.'
  );
}

/**
 * A reading of knowledge already written down, kept where either input has changed.
 *
 * The order is the decision and there is one copy of it. The criteria are held
 * **before** the reading is recorded, always, so a reading on record can never cite
 * criteria the shelf does not have — and working out where a Corpus stood last
 * Tuesday depends on exactly that (ADR-0032). Holding them is idempotent by digest,
 * as holding knowledge is, so doing it on every read costs one check for a file.
 *
 * What the reading is stated against is the last reading on record that is not this
 * one. A reading goes on record the moment either input changes, so the most recent
 * one is a reading of the knowledge in hand: handed that as a baseline, every figure
 * reports *held steady* on a Corpus nobody has measured twice (see `earlierReading`).
 */
async function readAndKeep(
  shelf: Shelf,
  lens: Lens,
  seed: Seed,
  writtenDownAt: string,
  takenAt: string,
): Promise<KnowledgeWasRead> {
  // First, and on its own line because the order is the decision. Idempotent by
  // digest, as holding knowledge is, so doing it on every read costs one file check.
  const criteria = await holdLens(shelf.criteria, lens);

  const previous = await earlierReading(shelf.readings, lens.id, {
    seedDigest: seedDigest(seed),
    lensDigest: criteria.digest,
  });

  const reading = readSeededCorpus(seed, lens, takenAt, previous);
  const kept = await recordReading(shelf.readings, reading.asRecorded);

  return {
    reading,
    knowledge: seed,
    writtenDownAt,
    onRecordAt: kept.path,
    alreadyOnRecord: kept.alreadyRecorded,
  };
}

/**
 * Writes down what is at source, takes it in, and reads it. LAW-002's second
 * operation, and the only way knowledge arrives.
 *
 * **One path from source to knowledge**, whether the trigger is the runner, a person
 * pressing a button, or a build. Two paths would be the second entrance LAW-002
 * exists to refuse, and its failure mode is quiet: the button's answer and the
 * runner's disagree, and no reader can tell which of them is true.
 *
 * The knowledge is always read back from what was written down, never carried
 * forward in memory from the extraction. A Seed is the one artifact that says what
 * the source said, so a reading made of anything else is a reading of a Corpus
 * nobody can go and check (LAW-009, spec §5.5).
 *
 * Idempotent, because both writes are. Unchanged source produces the same digest,
 * finds the Seed already held, and reads that; the reading of it is already on record
 * and nothing is written. So this may be pressed four times in a morning and leave
 * what one press left.
 */
export async function readTheSourceAgain(
  shelf: Shelf,
  lens: Lens,
  takenAt: string,
): Promise<SourceWasReadAgain> {
  let asFound: Seed;
  try {
    asFound = await extractSeed(lens);
  } catch (cause) {
    // Nothing has been written at this point, so the previous reading stands. A
    // failed read leaves a reader exactly where they were, with a sentence.
    throw saidWhereItLooked(lens.adapter.root, cause);
  }

  // Three phases, three sentences, because a reader does something different about
  // each of them. One `try` around all of it said *what it says could not be written
  // down* whatever went wrong — including where what was written down months ago is
  // what cannot be read, which is knowledge this press never touched. Every way out of
  // this function carries a sentence somebody wrote for a person to read; a surface
  // passing a failure's own words through would show the error state a business reader
  // meets most often, in the words of whichever call happened to fail (LAW-010).
  let held: Awaited<ReturnType<typeof holdSeed>>;
  try {
    held = await holdSeed(shelf.seeds, asFound);
  } catch (cause) {
    throw couldNotKeepIt(cause);
  }

  // Read back from what was written down, always. Taking it off the shelf is what makes
  // the figures a reading of an artifact somebody else can go and check (LAW-009).
  //
  // Unchanged source finds a Seed already held and reads that, so this is not always
  // reading something this function just wrote: where the shelf holds something damaged
  // under that name, the press cannot get past it and says so.
  let asHeld: Seed;
  try {
    asHeld = await readSeed(held.path);
  } catch (cause) {
    throw whatIsKeptCannotBeRead(cause);
  }

  try {
    const read = await readAndKeep(shelf, lens, asHeld, held.path, takenAt);
    return { ...read, unchangedAtSource: held.alreadyHeld };
  } catch (cause) {
    throw couldNotKeepIt(cause);
  }
}

/**
 * Reads knowledge already written down at a place, and keeps the reading where
 * either input has changed.
 *
 * Not a way in. Nothing arrives here that was not already on the shelf, so this
 * writes no knowledge — it is the same reading the server takes on every request,
 * with the one difference that this one may go on record.
 */
export async function readKnowledgeHeldAt(
  shelf: Shelf,
  lens: Lens,
  takenAt: string,
  at: string,
): Promise<KnowledgeWasRead> {
  return readAndKeep(shelf, lens, await readSeed(at), at, takenAt);
}
