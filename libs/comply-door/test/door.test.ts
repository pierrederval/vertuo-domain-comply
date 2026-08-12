import { cp, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { fixturePath } from '@vertuo/comply-fixtures';
import { loadLens, type Lens } from '@vertuo/comply-lens';
import { readingsOnRecord } from '@vertuo/comply-readiness';
import { readTheSourceAgain, readKnowledgeHeldAt, shelfAt, type Shelf } from '../src/index.js';

/** Fixed, so nothing here is compared against the clock. */
const READ_AT = '2026-01-01T00:00:00.000Z';

/** A later moment, for the second read in a test that takes two. */
const READ_AGAIN_AT = '2026-01-02T00:00:00.000Z';

let dir: string;
let shelf: Shelf;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'door-'));
  shelf = shelfAt(dir);
});

/**
 * A fixture Corpus copied whole — its Lens and the documents it points at — so the
 * source can be altered without touching what the rest of the suite reads.
 *
 * The Lens is rewritten to point at the copy. `root` is the one thing a Lens digest
 * leaves out (ADR-0032), so moving it changes no criteria and every digest here is
 * the digest the same source produces anywhere else.
 */
async function shelveSource(lensFile: string): Promise<Lens> {
  const lens = await loadLens(fixturePath(lensFile));
  const source = join(dir, 'source');
  await cp(lens.adapter.root, source, { recursive: true });

  return { ...lens, adapter: { ...lens.adapter, root: source } };
}

/** Everything on the shelf, file by file, so a write can be told from a no-op on bytes. */
async function onTheShelf(): Promise<Record<string, string>> {
  const held: Record<string, string> = {};

  for (const kept of [shelf.seeds, shelf.readings, shelf.criteria]) {
    for (const name of await readdir(kept).catch(() => [])) {
      held[join(kept, name)] = await readFile(join(kept, name), 'utf8');
    }
  }
  return held;
}

/**
 * Both fixture Corpus, because a Corpus with defects in it and one with none take
 * different routes through a reading and only one of them is the interesting case
 * (ADR-0001).
 */
const IN_EACH = [{ lensFile: 'lens-a.json' }, { lensFile: 'lens-b.json' }];

describe.each(IN_EACH)('reading the source again, on $lensFile', ({ lensFile }) => {
  it('writes the knowledge down, and the reading is made of what was written', async () => {
    const lens = await shelveSource(lensFile);
    const read = await readTheSourceAgain(shelf, lens, READ_AT);

    // The Seed is on the shelf, named by the digest the reading cites — so the
    // knowledge the figures were counted over is the knowledge anybody can go and
    // read back. There is no shorter path that skips it (LAW-002, ADR-0012).
    expect(await readdir(shelf.seeds)).toHaveLength(1);
    expect(read.writtenDownAt).toContain(read.reading.asRecorded.seedDigest);
    expect(read.unchangedAtSource).toBe(false);
  });

  it('puts a reading on record citing criteria the shelf holds', async () => {
    const lens = await shelveSource(lensFile);
    const read = await readTheSourceAgain(shelf, lens, READ_AT);

    // The property the ordering exists to protect: the criteria are held before the
    // reading is, always, so no reading on record can cite criteria that were never
    // kept (ADR-0032). Asserted as the property rather than as a call order, because
    // the property is what a person reading a moved figure next Tuesday depends on.
    expect(read.alreadyOnRecord).toBe(false);
    const onRecord = await readingsOnRecord(shelf.readings, lens.id);
    expect(onRecord).toHaveLength(1);
    expect(await readdir(shelf.criteria)).toContain(
      `${lens.id}-${onRecord[0]!.reading.lensDigest}.json`,
    );
  });

  it('writes nothing at all the second time, over unchanged source', async () => {
    const lens = await shelveSource(lensFile);
    await readTheSourceAgain(shelf, lens, READ_AT);
    const before = await onTheShelf();

    const again = await readTheSourceAgain(shelf, lens, READ_AGAIN_AT);

    // Byte for byte, name for name. A Seed is never rewritten and a reading goes on
    // record only where an input changed, so pressing this four times in a morning
    // leaves what one press left (ADR-0012, ADR-0016).
    expect(await onTheShelf()).toEqual(before);
    expect(again.unchangedAtSource).toBe(true);
    expect(again.alreadyOnRecord).toBe(true);
  });

  it('states no baseline where the only reading on record is the one it just took', async () => {
    const lens = await shelveSource(lensFile);
    const read = await readTheSourceAgain(shelf, lens, READ_AT);

    // Nobody has measured this Corpus twice, and that is what it says. Compared
    // against the reading it has just recorded — which is itself — every figure
    // would report *held steady*, which is *no change* standing in for *no
    // baseline* (LAW-006).
    for (const row of read.reading.trend) expect(row.comparedWith).toBe('no-earlier-reading');
  });

  it('states what moved once the source has changed, and goes on stating it', async () => {
    const lens = await shelveSource(lensFile);
    await readTheSourceAgain(shelf, lens, READ_AT);

    const documents = await readdir(lens.adapter.root, { recursive: true });
    const document = documents.find((name) => String(name).endsWith('.md'))!;
    await rm(join(lens.adapter.root, String(document)));

    const moved = await readTheSourceAgain(shelf, lens, READ_AGAIN_AT);
    expect(moved.unchangedAtSource).toBe(false);
    expect(moved.reading.trend.some((row) => row.comparedWith === 'the-last-reading')).toBe(true);

    // And again, with nothing further changed. The statement is about the last time
    // the knowledge changed, so it survives being asked twice — where a comparison
    // against the most recent reading on record would have evaporated the moment
    // this one was written.
    const asked = await readTheSourceAgain(shelf, lens, '2026-01-03T00:00:00.000Z');
    expect(asked.unchangedAtSource).toBe(true);
    expect(asked.reading.trend).toEqual(moved.reading.trend);
  });

  it('leaves what is already on record exactly as it was', async () => {
    const lens = await shelveSource(lensFile);
    await readTheSourceAgain(shelf, lens, READ_AT);
    const before = await onTheShelf();

    const documents = await readdir(lens.adapter.root, { recursive: true });
    await rm(join(lens.adapter.root, String(documents.find((name) => String(name).endsWith('.md')))));
    await readTheSourceAgain(shelf, lens, READ_AGAIN_AT);

    // Every file that was there is still there, saying what it said. Corrections
    // append and nothing is rewritten or dropped (LAW-003), asserted on the bytes
    // rather than on the code that was supposed to leave them alone.
    const after = await onTheShelf();
    for (const [path, said] of Object.entries(before)) expect(after[path]).toBe(said);
    expect(Object.keys(after).length).toBeGreaterThan(Object.keys(before).length);
  });

  it('reads knowledge already written down without writing any', async () => {
    const lens = await shelveSource(lensFile);
    const first = await readTheSourceAgain(shelf, lens, READ_AT);
    const before = await onTheShelf();

    const held = await readKnowledgeHeldAt(shelf, lens, READ_AGAIN_AT, first.writtenDownAt);

    expect(held.reading.asRecorded.seedDigest).toBe(first.reading.asRecorded.seedDigest);
    expect(await onTheShelf()).toEqual(before);
  });
});

describe('reading the source again when the source cannot be read', () => {
  it('says where it looked, and leaves the shelf as it was', async () => {
    const lens = await shelveSource('lens-a.json');
    await readTheSourceAgain(shelf, lens, READ_AT);
    const before = await onTheShelf();

    await rm(lens.adapter.root, { recursive: true });

    // What a person meets when the documents are not checked out beside the shelf,
    // which is the failure this action has. It names the place rather than the call
    // that failed, and the previous reading is untouched.
    await expect(readTheSourceAgain(shelf, lens, READ_AGAIN_AT)).rejects.toThrow(
      /are not where its Lens says they are/,
    );
    expect(await onTheShelf()).toEqual(before);
  });

  it('says so where the place holds no documents at all', async () => {
    const lens = await shelveSource('lens-a.json');
    await rm(lens.adapter.root, { recursive: true });
    await expect(readTheSourceAgain(shelf, lens, READ_AT)).rejects.toThrow(lens.adapter.root);
  });

  it('says so where the source was read and the shelf would not take it', async () => {
    const lens = await shelveSource('lens-a.json');
    // Something in the way of where the knowledge goes, so the read succeeds and
    // keeping it cannot. Nothing about the business's knowledge is wrong here.
    await writeFile(shelf.seeds, 'not a place knowledge can go', 'utf8');

    await expect(readTheSourceAgain(shelf, lens, READ_AT)).rejects.toThrow(
      /could not be written down where this product keeps it/,
    );
  });

  it('refuses knowledge written down in a form it cannot read, and writes nothing', async () => {
    const lens = await shelveSource('lens-a.json');
    const at = join(dir, 'older.json');
    await writeFile(at, JSON.stringify({ version: 1, lensId: lens.id, documents: [] }), 'utf8');

    await expect(readKnowledgeHeldAt(shelf, lens, READ_AT, at)).rejects.toThrow(/written down/);
    expect(await onTheShelf()).toEqual({});
  });
});
