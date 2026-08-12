import { mkdir, mkdtemp, readdir, readFile, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { corpusListSchema } from '@vertuo/comply-contract';
import { fixturePath } from '@vertuo/comply-fixtures';
import { extractSeed } from '@vertuo/comply-ingestion';
import { loadLens } from '@vertuo/comply-lens';
import { holdSeed } from '@vertuo/comply-seed';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../src/server.js';

/** Fixed, so the age a reading reports is compared against a value and not the clock. */
const WRITTEN_DOWN_AT = new Date('2026-01-01T09:00:00.000Z');

let shelf: string;
let server: FastifyInstance;

/**
 * Puts a fixture Lens on a shelf of its own, pointing at the source it already
 * has. The Lens file moves and the corpus does not, so the adapter root is
 * written out in full — nothing is copied and no fixture is written to.
 */
async function shelveLens(file: string): Promise<void> {
  const declared = JSON.parse(await readFile(fixturePath(file), 'utf8')) as {
    adapter: { root: string };
  };
  declared.adapter.root = resolve(dirname(fixturePath(file)), declared.adapter.root);
  await writeFile(join(shelf, file), JSON.stringify(declared), 'utf8');
}

/** Writes down what is at source, as the runner would, at a known moment. */
async function writeDownKnowledge(file: string): Promise<void> {
  const lens = await loadLens(join(shelf, file));
  const held = await holdSeed(join(shelf, 'seeds'), await extractSeed(lens));
  await utimes(held.path, WRITTEN_DOWN_AT, WRITTEN_DOWN_AT);
}

async function listCorpus() {
  const response = await server.inject({ method: 'GET', url: '/corpus' });
  expect(response.statusCode).toBe(200);
  // Read back through the same definition the Studio validates against: a payload
  // only one side agrees with is the drift this package exists to prevent.
  return corpusListSchema.parse(response.json());
}

beforeEach(async () => {
  shelf = await mkdtemp(join(tmpdir(), 'comply-shelf-'));
  await mkdir(join(shelf, 'seeds'), { recursive: true });
  server = buildServer(shelf);
});

afterEach(async () => {
  await server.close();
});

describe('every Corpus on the shelf', () => {
  it('lists both fixture Corpus, which are differently shaped, through one path', async () => {
    for (const file of ['lens-a.json', 'lens-b.json']) {
      await shelveLens(file);
      await writeDownKnowledge(file);
    }

    const { corpus } = await listCorpus();

    // They differ in Facets, Maturity ladder, Modules and owner mechanism, and
    // nothing here knows that (ADR-0001).
    expect(corpus.map((entry) => entry.id)).toEqual(['corpus-a', 'corpus-b']);
    for (const entry of corpus) expect(entry.reading.outcome).toBe('read');
  });

  it('calls a Corpus what its Lens calls it, or by its id where it declares none', async () => {
    await shelveLens('lens-a.json');
    await shelveLens('lens-b.json');

    expect((await listCorpus()).corpus.map((entry) => entry.name)).toEqual(['Alpha', 'corpus-b']);
  });

  it('shows the two readings as two figures, each with what it counts out of', async () => {
    await shelveLens('lens-a.json');
    await writeDownKnowledge('lens-a.json');

    const [entry] = (await listCorpus()).corpus;
    if (entry?.reading.outcome !== 'read') throw new Error('the source was written down');
    const { readiness, integrity } = entry.reading;

    expect(readiness.modules).toBeGreaterThan(0);
    expect(readiness.modulesFullyApproved).toBeLessThanOrEqual(readiness.modules);
    // Fixture A has planted defects, and what was looked for is named.
    expect(integrity.openFindings).toBeGreaterThan(0);
    expect(integrity.lookedFor).toContain('split-identity');

    // Nothing fuses them. No key here stands for a Corpus's worth (spec §4).
    expect(Object.keys(entry.reading).sort()).toEqual([
      'integrity', 'outcome', 'readiness', 'sourceReadAt',
    ]);
  });

  it('says how old the reading is, from when the knowledge was written down', async () => {
    await shelveLens('lens-b.json');
    await writeDownKnowledge('lens-b.json');

    const [entry] = (await listCorpus()).corpus;
    if (entry?.reading.outcome !== 'read') throw new Error('the source was written down');

    // Not the moment the figures were computed, which is always now and would
    // claim the source had just been looked at.
    expect(entry.reading.sourceReadAt).toBe(WRITTEN_DOWN_AT.toISOString());
  });

  it('lists a Corpus whose source has never been read, and shows no figures for it', async () => {
    await shelveLens('lens-a.json');

    const { corpus } = await listCorpus();

    expect(corpus).toHaveLength(1);
    expect(corpus[0]?.reading).toEqual({ outcome: 'nothing-written-down-yet' });
  });

  it('answers about a shelf holding nothing without inventing anything', async () => {
    expect(await listCorpus()).toEqual({ corpus: [], criteriaNotFollowed: [] });
  });
});

/**
 * Spec §8, the half that is not a Finding: a Corpus that cannot be read at all, and
 * the reason said where its reader is.
 *
 * Both kinds were computed and handed to `server.log.warn`, which on a Fastify built
 * with no logger is literally `function noop () { }`. So the reason had never once
 * reached anybody, under comments saying it went to a log.
 */
describe('a Corpus that cannot be read', () => {
  /** A Lens naming a rung that is not on its own ladder — spec §8's own example. */
  async function shelveALensNamingARungOffItsLadder(file: string): Promise<void> {
    const declared = JSON.parse(await readFile(fixturePath(file), 'utf8')) as {
      adapter: { root: string };
      maturity: { approvedAtOrAbove: string };
    };
    declared.adapter.root = resolve(dirname(fixturePath(file)), declared.adapter.root);
    declared.maturity.approvedAtOrAbove = 'signed-off';
    await writeFile(join(shelf, file), JSON.stringify(declared), 'utf8');
  }

  /** Writes down knowledge and then leaves it in a form nothing here can read back. */
  async function leaveTheKnowledgeUnreadable(id: string): Promise<void> {
    const at = join(shelf, 'seeds', (await readdir(join(shelf, 'seeds')))
      .find((name) => name.startsWith(`${id}-`))!);
    const held = JSON.parse(await readFile(at, 'utf8')) as { version: number };
    await writeFile(at, JSON.stringify({ ...held, version: held.version - 1 }), 'utf8');
  }

  it('says which file to put right, where its criteria could not be followed', async () => {
    await shelveLens('lens-a.json');
    await shelveALensNamingARungOffItsLadder('lens-b.json');

    const { criteriaNotFollowed } = await listCorpus();

    expect(criteriaNotFollowed).toHaveLength(1);
    expect(criteriaNotFollowed[0]?.where).toBe('lens-b.json');
    expect(criteriaNotFollowed[0]?.because).toContain('"signed-off"');
    expect(criteriaNotFollowed[0]?.because).toContain('Put that right in lens-b.json');
  });

  it('names the file and never where the machine keeps it', async () => {
    await shelveALensNamingARungOffItsLadder('lens-b.json');

    const { criteriaNotFollowed } = await listCorpus();

    // The shelf is a temporary directory here and somebody's checkout in the product.
    // A reason carrying one reads differently to two people looking at one shelf.
    expect(criteriaNotFollowed[0]?.because).not.toContain(shelf);
    expect(criteriaNotFollowed[0]?.where).not.toContain('/');
  });

  it('lets every other Corpus be read and listed exactly as before', async () => {
    // AC-4, asserted against the payload a good shelf answers with rather than
    // against a shape written out here, so a change to either is a change to both.
    await shelveLens('lens-a.json');
    await writeDownKnowledge('lens-a.json');
    const alone = await listCorpus();

    await shelveALensNamingARungOffItsLadder('lens-b.json');
    const beside = await listCorpus();

    expect(beside.corpus).toEqual(alone.corpus);
    expect(alone.criteriaNotFollowed).toEqual([]);
    expect(beside.criteriaNotFollowed).toHaveLength(1);
  });

  it('says a Corpus whose knowledge could not be read back has none, and why', async () => {
    // This one has a Lens, so it keeps its id, its name and its page — which is where
    // the action that puts it right is drawn (ADR-0034 §5).
    await shelveLens('lens-b.json');
    await writeDownKnowledge('lens-b.json');
    await leaveTheKnowledgeUnreadable('corpus-b');

    const { corpus } = await listCorpus();

    expect(corpus).toHaveLength(1);
    expect(corpus[0]?.id).toBe('corpus-b');
    expect(corpus[0]?.reading.outcome).toBe('could-not-be-read');
  });

  it('never says nothing has been written down about a Corpus that has', async () => {
    // The sentence all six surfaces drew for this until now. It is not a blank space,
    // it is the wrong true-sounding one: it sends a reader to read a source that has
    // already been read, and says nothing about what actually happened.
    await shelveLens('lens-b.json');
    await writeDownKnowledge('lens-b.json');
    await leaveTheKnowledgeUnreadable('corpus-b');

    const [entry] = (await listCorpus()).corpus;
    if (entry?.reading.outcome !== 'could-not-be-read') throw new Error('the knowledge is unreadable');

    expect(entry.reading.because).not.toContain('has been written down');
    expect(entry.reading.because).toContain('cannot be read back');
    // Says what to do, which for this one is a press and not a file (LAW-007).
    expect(entry.reading.because).toContain('Reading the source again');
  });

  it('gives it no figure rather than a figure of nothing', async () => {
    await shelveLens('lens-b.json');
    await writeDownKnowledge('lens-b.json');
    await leaveTheKnowledgeUnreadable('corpus-b');

    const [entry] = (await listCorpus()).corpus;

    expect(Object.keys(entry?.reading ?? {}).sort()).toEqual(['because', 'outcome']);
  });

  it('passes over a file that is not a set of criteria at all, and says which', async () => {
    await shelveLens('lens-a.json');
    await writeFile(join(shelf, 'notes.json'), '{"something": "else"}', 'utf8');

    const { corpus, criteriaNotFollowed } = await listCorpus();

    expect(corpus.map((entry) => entry.id)).toEqual(['corpus-a']);
    expect(criteriaNotFollowed.map((held) => held.where)).toEqual(['notes.json']);
  });

  it('reaches every page of a Corpus whose knowledge could not be read, and none 404s', async () => {
    // Every one of these answered 404 or *nothing written down yet* before. The first
    // is a Corpus the product does not hold, which this one is not; the second is a
    // Corpus nobody has read, which this one is not either.
    await shelveLens('lens-b.json');
    await writeDownKnowledge('lens-b.json');
    await leaveTheKnowledgeUnreadable('corpus-b');

    for (const url of [
      '/corpus/corpus-b/reading',
      '/corpus/corpus-b/home',
      '/corpus/corpus-b/inbox',
      '/corpus/corpus-b/modules/one',
      '/corpus/corpus-b/modules/one/knowledge?in=one.md&line=1',
    ]) {
      const response = await server.inject({ method: 'GET', url });
      expect(response.statusCode, url).toBe(200);
      expect(response.json().reading.outcome, url).toBe('could-not-be-read');
    }
  });

  it('still 404s a Corpus the shelf does not hold at all', async () => {
    // A different fact, and it stays a different one: nothing of that name is here.
    await shelveLens('lens-a.json');

    const response = await server.inject({ method: 'GET', url: '/corpus/never-was-here/reading' });
    expect(response.statusCode).toBe(404);
  });
});

describe('what the HTTP surface will not do', () => {
  it('has no way to change anything, whatever is asked of it', async () => {
    await shelveLens('lens-a.json');

    // Re-reading the source is the one write this design has, and it is #26.
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE'] as const) {
      const response = await server.inject({ method, url: '/corpus' });
      expect(response.statusCode).toBe(404);
    }
  });
});
