import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  corpusDetailSchema,
  corpusHomeSchema,
  sourceWasReadSchema,
} from '@vertuo/comply-contract';
import { shelfAt } from '@vertuo/comply-door';
import { fixturePath } from '@vertuo/comply-fixtures';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../src/server.js';

let shelf: string;
let server: FastifyInstance;

interface DeclaredLens {
  id: string;
  adapter: { root: string };
}

/**
 * Puts a fixture Lens on a shelf of its own, over a copy of the source it points at,
 * so a test can change what the source says — or take it away.
 *
 * The copy is what makes this action testable at all: what it does is write down what
 * is at source, and the fixture source is shared by every other test in the workspace.
 */
async function shelveLens(file: string): Promise<string> {
  const declared = JSON.parse(await readFile(fixturePath(file), 'utf8')) as DeclaredLens;
  const source = resolve(dirname(fixturePath(file)), declared.adapter.root);
  const copy = join(shelf, 'source', declared.id);

  await cp(source, copy, { recursive: true });
  declared.adapter.root = copy;
  await writeFile(join(shelf, file), JSON.stringify(declared), 'utf8');
  return declared.id;
}

/** Everything on the shelf, file by file, so a write can be told from a no-op on bytes. */
async function onTheShelf(): Promise<Record<string, string>> {
  const kept = shelfAt(shelf);
  const held: Record<string, string> = {};

  for (const where of [kept.seeds, kept.readings, kept.criteria]) {
    for (const name of await readdir(where).catch(() => [])) {
      held[join(where, name)] = await readFile(join(where, name), 'utf8');
    }
  }
  return held;
}

async function readTheSourceAgain(id: string) {
  const response = await server.inject({ method: 'POST', url: `/corpus/${id}/reads` });
  expect(response.statusCode).toBe(200);
  // Read back through the same definition the Studio validates against.
  return sourceWasReadSchema.parse(response.json());
}

async function readHome(id: string) {
  const response = await server.inject({ method: 'GET', url: `/corpus/${id}/home` });
  const { reading } = corpusHomeSchema.parse(response.json());
  if (reading.outcome !== 'read') throw new Error('the source was read');
  return reading;
}

async function readGrid(id: string) {
  const response = await server.inject({ method: 'GET', url: `/corpus/${id}/reading` });
  const { reading } = corpusDetailSchema.parse(response.json());
  if (reading.outcome !== 'read') throw new Error('the source was read');
  return reading;
}

beforeEach(async () => {
  shelf = await mkdtemp(join(tmpdir(), 'comply-shelf-'));
  await mkdir(join(shelf, 'seeds'), { recursive: true });
  server = buildServer(shelf);
});

afterEach(async () => {
  await server.close();
  await rm(shelf, { recursive: true, force: true });
});

/**
 * Both fixture Corpus, which are differently shaped and differently defective, and
 * nothing on this route knows which of the two it is reading (ADR-0001).
 */
const IN_EACH = [
  { lensFile: 'lens-a.json', id: 'corpus-a' },
  { lensFile: 'lens-b.json', id: 'corpus-b' },
];

describe.each(IN_EACH)('reading $id from its source', ({ lensFile, id }) => {
  it('turns a Corpus with nothing written down into one that can be read', async () => {
    await shelveLens(lensFile);

    // The state a Corpus arrives on the shelf in: a Lens, a source, and no
    // knowledge. Before this action there was no way out of it from the Studio.
    const home = corpusHomeSchema.parse(
      (await server.inject({ method: 'GET', url: `/corpus/${id}/home` })).json(),
    );
    expect(home.reading.outcome).toBe('nothing-written-down-yet');

    expect(await readTheSourceAgain(id)).toEqual({ outcome: 'read', unchangedAtSource: false });
    expect((await readHome(id)).writtenDown).toHaveLength(1);
  });

  it('writes the knowledge down, so what was read can be gone and read back', async () => {
    await shelveLens(lensFile);
    await readTheSourceAgain(id);

    const kept = shelfAt(shelf);
    expect(await readdir(kept.seeds)).toHaveLength(1);
    // And the criteria it was read through, so a figure that moves next Tuesday can
    // be checked against what was asked of it then (ADR-0032).
    expect(await readdir(kept.criteria)).toHaveLength(1);
    expect(await readdir(kept.readings)).toHaveLength(1);
  });

  it('writes nothing at all the second time, and says the source has not changed', async () => {
    await shelveLens(lensFile);
    await readTheSourceAgain(id);
    const before = await onTheShelf();

    expect(await readTheSourceAgain(id)).toEqual({ outcome: 'read', unchangedAtSource: true });

    // Byte for byte, name for name. Pressed four times in a morning it leaves what
    // one press left (ADR-0012, ADR-0016).
    expect(await onTheShelf()).toEqual(before);
  });

  it('leaves everything already on record exactly as it was', async () => {
    const lensId = await shelveLens(lensFile);
    await readTheSourceAgain(id);
    const before = await onTheShelf();

    await writeFile(
      join(shelf, 'source', lensId, 'note.md'),
      '---\narea: nowhere\nkind: nothing-declared\n---\n\nSomething new.\n',
      'utf8',
    );
    await readTheSourceAgain(id);

    // Corrections append. Every file that was there says what it said, and the new
    // knowledge sits beside the old rather than over it (LAW-003), asserted on the
    // bytes and not on the code that was meant to leave them alone.
    const after = await onTheShelf();
    for (const [path, said] of Object.entries(before)) expect(after[path]).toBe(said);
    expect(Object.keys(after).length).toBeGreaterThan(Object.keys(before).length);
  });
});

describe('what a reader can see afterwards', () => {
  it('shows the new writing-down, and says what moved', async () => {
    const lensId = await shelveLens('lens-a.json');
    await readTheSourceAgain('corpus-a');

    // Every Facet of one Module unwritten, so a figure this Corpus counts as
    // approved genuinely falls.
    await rm(join(shelf, 'source', lensId, 'alpha', 'aggregates.md'));
    await readTheSourceAgain('corpus-a');

    const home = await readHome('corpus-a');
    expect(home.writtenDown).toHaveLength(2);
    if (home.since.comparedWith !== 'the-last-reading') throw new Error('a reading was kept');
    expect(home.since.changed).toContainEqual({
      changed: 'facet',
      moduleId: 'alpha',
      facet: 'aggregates',
      label: 'Aggregates',
      approved: false,
    });

    // And the grid beside it moved too, from the same derivation: a figure that fell
    // and a Module that says so.
    const moved = (await readGrid('corpus-a')).modules.find((module) => module.id === 'alpha')!;
    expect(moved.movement).toEqual({ comparedWith: 'the-last-reading', approvedDelta: -1 });
  });

  it('goes on saying what moved however many times it is asked', async () => {
    const lensId = await shelveLens('lens-a.json');
    await readTheSourceAgain('corpus-a');
    await rm(join(shelf, 'source', lensId, 'alpha', 'aggregates.md'));
    await readTheSourceAgain('corpus-a');

    const said = await readHome('corpus-a');
    // Pressed again with nothing further changed, and asked again after that. What
    // moved is stated since the last time the knowledge moved, so it survives being
    // read twice — where a comparison against the most recent reading on record
    // would have evaporated the moment this one was written (ADR-0034).
    expect(await readTheSourceAgain('corpus-a')).toEqual({
      outcome: 'read',
      unchangedAtSource: true,
    });
    expect((await readHome('corpus-a')).since).toEqual(said.since);
  });
});

describe('two people reading one source at once', () => {
  it('leaves one writing-down and one reading on record', async () => {
    const id = await shelveLens('lens-a.json');

    // Extraction is 2–4ms on this Corpus and 84–266ms on the real one, so a second
    // press landing mid-read is a thing that happens rather than a thing to imagine.
    // Both would find nothing on record and both would write, which is the artifact
    // ADR-0016 exists to prevent, arriving by a route deduplication cannot see.
    const both = await Promise.all([readTheSourceAgain(id), readTheSourceAgain(id)]);

    const kept = shelfAt(shelf);
    expect(await readdir(kept.seeds)).toHaveLength(1);
    expect(await readdir(kept.readings)).toHaveLength(1);
    expect(await readdir(kept.criteria)).toHaveLength(1);

    // One of the two found something to bring in and the other found it already
    // there. Which is which is not a thing to promise, and both are true answers.
    expect(both.map((read) => read.outcome)).toEqual(['read', 'read']);
    expect(both.filter((read) => read.outcome === 'read' && !read.unchangedAtSource)).toHaveLength(
      1,
    );
  });

  it('reads one Corpus while another is being read', async () => {
    await shelveLens('lens-a.json');
    await shelveLens('lens-b.json');

    // Waiting is per Corpus. One shelf holding twenty of them would otherwise read
    // them one after another, and the twentieth person would be told nothing is
    // happening for as long as the nineteen ahead of them took.
    const both = await Promise.all([
      readTheSourceAgain('corpus-a'),
      readTheSourceAgain('corpus-b'),
    ]);

    expect(both).toEqual([
      { outcome: 'read', unchangedAtSource: false },
      { outcome: 'read', unchangedAtSource: false },
    ]);
  });
});

describe('when the source cannot be read', () => {
  it('says what went wrong and leaves the reading that was already there', async () => {
    const lensId = await shelveLens('lens-a.json');
    await readTheSourceAgain('corpus-a');
    const before = await onTheShelf();
    const standing = await readGrid('corpus-a');

    await rm(join(shelf, 'source', lensId), { recursive: true });

    const said = await readTheSourceAgain('corpus-a');
    if (said.outcome !== 'could-not-read') throw new Error('the source was read');
    // Where it looked and what to do about it, in a sentence — not a fault code and
    // not a screen with nothing on it (LAW-010, spec §8).
    expect(said.because).toMatch(/are not where its Lens says they are/);

    expect(await onTheShelf()).toEqual(before);
    expect(await readGrid('corpus-a')).toEqual(standing);
  });

  it('reads a Corpus whose knowledge is written down in a form nothing can read', async () => {
    const lensId = await shelveLens('lens-a.json');
    const kept = shelfAt(shelf);

    // What a shelf written down by an older version of this holds. It is listed, with
    // no reading and the reason it has none, and reading its source again is the one
    // thing to do about it — which is why it keeps the page that offers it (spec §8).
    // Every reading used to pass the whole Corpus over, so the action was out of reach
    // of the only Corpus that needed it.
    await writeFile(
      join(kept.seeds, `${lensId}-${'a'.repeat(64)}.json`),
      JSON.stringify({ version: 1, lensId, documents: [] }),
      'utf8',
    );
    const listed = (await server.inject({ method: 'GET', url: '/corpus' })).json() as {
      corpus: { id: string; reading: { outcome: string } }[];
    };
    expect(listed.corpus).toHaveLength(1);
    expect(listed.corpus[0]?.reading.outcome).toBe('could-not-be-read');

    expect(await readTheSourceAgain(lensId)).toEqual({ outcome: 'read', unchangedAtSource: false });

    // And now it draws. What could not be read is still on the shelf, untouched: a
    // Seed is never rewritten, and nothing here discards one (LAW-003, ADR-0012).
    expect((await readHome(lensId)).writtenDown).toHaveLength(2);
    expect(await readdir(kept.seeds)).toHaveLength(2);
  });

  it('refuses to read a Corpus that is not on the shelf', async () => {
    await shelveLens('lens-a.json');

    const response = await server.inject({ method: 'POST', url: '/corpus/nothing-here/reads' });
    expect(response.statusCode).toBe(404);
  });

  it('cannot be asked for as a reading, because it is not one', async () => {
    await shelveLens('lens-a.json');

    // The one route that writes says so in what it is asked with. A read that could
    // be reached by following a link is a write a browser may repeat.
    for (const method of ['GET', 'PUT', 'PATCH', 'DELETE'] as const) {
      const response = await server.inject({ method, url: '/corpus/corpus-a/reads' });
      expect(response.statusCode).toBe(404);
    }
  });
});
