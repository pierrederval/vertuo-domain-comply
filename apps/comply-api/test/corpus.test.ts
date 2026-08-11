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
    expect(await listCorpus()).toEqual({ corpus: [] });
  });

  it('passes over a file that is not a Lens rather than refusing the whole shelf', async () => {
    await shelveLens('lens-a.json');
    await writeFile(join(shelf, 'notes.json'), '{"something": "else"}', 'utf8');

    expect((await listCorpus()).corpus.map((entry) => entry.id)).toEqual(['corpus-a']);
  });

  it('passes over knowledge written down in an older form rather than refusing the whole shelf', async () => {
    // One shelf holds several Corpus, and one of them having been written down
    // before the reading changed shape is not a reason to answer about none of them.
    // The one thing to do about it is said in the reason, and nothing can say it if
    // nothing is left standing.
    await shelveLens('lens-a.json');
    await shelveLens('lens-b.json');
    await writeDownKnowledge('lens-a.json');
    await writeDownKnowledge('lens-b.json');

    const older = join(shelf, 'seeds', (await readdir(join(shelf, 'seeds')))
      .find((name) => name.startsWith('corpus-b-'))!);
    const held = JSON.parse(await readFile(older, 'utf8')) as { version: number };
    await writeFile(older, JSON.stringify({ ...held, version: held.version - 1 }), 'utf8');

    expect((await listCorpus()).corpus.map((entry) => entry.id)).toEqual(['corpus-a']);
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
