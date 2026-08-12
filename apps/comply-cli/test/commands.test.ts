import { appendFile, cp, mkdir, mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { fixturePath } from '@vertuo/comply-fixtures';
import { heldLenses } from '@vertuo/comply-lens';
import { readingsOnRecord } from '@vertuo/comply-readiness';
import { extractCommand, pruneCommand, reportCommand } from '../src/commands.js';
import { shelfAt, type Shelf } from '@vertuo/comply-door';

let dir: string;
let shelf: Shelf;

interface DeclaredLens {
  id: string;
  adapter: { root: string };
  facets: { name: string; criteria: unknown[] }[];
}

/**
 * Puts a fixture Lens on a shelf of its own, pointing at the source it already has,
 * with anything a test needs to declare differently folded in first.
 */
async function shelveLens(
  file: string,
  declaring: (lens: DeclaredLens) => void = () => {},
): Promise<string> {
  const declared = JSON.parse(await readFile(fixturePath(file), 'utf8')) as DeclaredLens;
  declared.adapter.root = resolve(dirname(fixturePath(file)), declared.adapter.root);
  declaring(declared);
  const path = join(dir, file);
  await writeFile(path, JSON.stringify(declared), 'utf8');
  return path;
}

/** Everything under one part of the shelf, by name and by content, so two runs can be compared. */
async function asItStands(where: string): Promise<Record<string, string>> {
  const held: Record<string, string> = {};
  for (const name of (await readdir(where)).sort()) {
    held[name] = await readFile(join(where, name), 'utf8');
  }
  return held;
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'comply-shelf-'));
  shelf = shelfAt(dir);
});

/**
 * The runner over both fixture Corpus, which are deliberately unalike (ADR-0001).
 * Nothing about when a reading is recorded depends on a Corpus's shape, so anything
 * that only holds for one of them fails here.
 */
describe.each(['lens-a.json', 'lens-b.json'])('reading %s twice over unchanged inputs', (file) => {
  it('leaves the readings on record exactly as the first run left them', async () => {
    const lensPath = await shelveLens(file);

    const first = await reportCommand(shelf, lensPath, undefined);
    const afterOne = await asItStands(shelf.readings);
    expect(Object.keys(afterOne)).toHaveLength(1);
    expect(first).toContain('On record');

    const second = await reportCommand(shelf, lensPath, undefined);

    // The whole of the issue in one assertion: nothing about the knowledge or the
    // criteria changed, so there is nothing new to say about where this Corpus
    // stands, and the shelf says exactly what it said before.
    expect(await asItStands(shelf.readings)).toEqual(afterOne);
    expect(second).toContain('Neither the knowledge nor the criteria have changed');
    expect(second).not.toContain('On record');
  });

  it('says where the reading already on record is kept, so it can be gone and looked at', async () => {
    const lensPath = await shelveLens(file);
    await reportCommand(shelf, lensPath, undefined);

    const [onRecord] = await readingsOnRecord(shelf.readings, JSON.parse(
      await readFile(lensPath, 'utf8'),
    ).id as string);
    expect(await reportCommand(shelf, lensPath, undefined)).toContain(onRecord!.path);
  });
});

describe('a reading is recorded when one of its inputs changes', () => {
  it('records again once the criteria change, with nothing written at source', async () => {
    const asDeclared = await shelveLens('lens-a.json');
    await reportCommand(shelf, asDeclared, undefined);

    // The same source, read through a Lens that asks for more than it did.
    const stricter = await shelveLens('lens-a.json', (lens) => {
      lens.facets[0]!.criteria = [
        { type: 'requiredAttributes', attributes: ['nothing-written-anywhere'] },
      ];
    });
    const said = await reportCommand(shelf, stricter, undefined);

    expect(said).toContain('On record');
    expect(await readingsOnRecord(shelf.readings, 'corpus-a')).toHaveLength(2);
    // One Seed, because the source was untouched: what changed is what was asked of it.
    expect(await readdir(shelf.seeds)).toHaveLength(1);
    // And the reading itself says nothing about a figure moving, because it cannot.
    expect(said).toContain('other');
  });

  it('records again once something is written at source, with the criteria untouched', async () => {
    // A copy of the source, so a document can be written in without touching the
    // fixture every other test reads.
    const source = join(dir, 'source');
    await cp(fixturePath('corpus-a'), source, { recursive: true });
    const lensPath = await shelveLens('lens-a.json', (lens) => {
      lens.adapter.root = source;
    });

    await reportCommand(shelf, lensPath, undefined);
    await appendFile(join(source, 'alpha', 'rules.md'), '\n## Something new\n\nA sentence.\n', 'utf8');
    const said = await reportCommand(shelf, lensPath, undefined);

    expect(said).toContain('On record');
    expect(await readingsOnRecord(shelf.readings, 'corpus-a')).toHaveLength(2);
    // Two writings-down of the knowledge, and one set of criteria: a Seed is never
    // rewritten, and the Lens said the same thing both times.
    expect(await readdir(shelf.seeds)).toHaveLength(2);
    expect(await heldLenses(shelf.criteria, 'corpus-a')).toHaveLength(1);
  });

  it('holds the criteria every recorded reading was taken through, so each stays reproducible', async () => {
    const asDeclared = await shelveLens('lens-a.json');
    await reportCommand(shelf, asDeclared, undefined);
    const stricter = await shelveLens('lens-a.json', (lens) => {
      lens.facets[0]!.criteria = [{ type: 'minSources', count: 9 }];
    });
    await reportCommand(shelf, stricter, undefined);

    const onRecord = await readingsOnRecord(shelf.readings, 'corpus-a');
    const held = new Set((await heldLenses(shelf.criteria, 'corpus-a')).map((one) => one.digest));

    expect(onRecord).toHaveLength(2);
    expect(held.size).toBe(2);
    // Not one reading on record cites criteria the shelf cannot produce.
    for (const { reading } of onRecord) expect(held.has(reading.lensDigest)).toBe(true);
  });

  it('records nothing at all where the source is only written down', async () => {
    const lensPath = await shelveLens('lens-a.json');
    expect(await extractCommand(shelf, lensPath)).toContain('Knowledge as found');

    // Writing down what is at source is not a reading of it, so there is nothing to
    // put on record and nothing to compare anything against yet.
    expect(await readingsOnRecord(shelf.readings, 'corpus-a')).toEqual([]);
    expect(await heldLenses(shelf.criteria, 'corpus-a')).toEqual([]);
  });
});

describe('pruning what can be worked out again', () => {
  /** Three readings on record for corpus-a, each under different criteria. */
  async function threeReadings(): Promise<void> {
    for (const count of [0, 1, 2]) {
      const lensPath = await shelveLens('lens-a.json', (lens) => {
        lens.facets[0]!.criteria = [{ type: 'minSources', count }];
      });
      await reportCommand(shelf, lensPath, undefined);
    }
  }

  it('drops the readings before the one a trend is stated against, and the criteria they cite', async () => {
    await threeReadings();
    expect(await readingsOnRecord(shelf.readings, 'corpus-a')).toHaveLength(3);
    expect(await heldLenses(shelf.criteria, 'corpus-a')).toHaveLength(3);

    const said = await pruneCommand(shelf, join(dir, 'lens-a.json'), undefined);

    expect(await readingsOnRecord(shelf.readings, 'corpus-a')).toHaveLength(1);
    expect(await heldLenses(shelf.criteria, 'corpus-a')).toHaveLength(1);
    expect(said).toContain('readings on record: 2');
    expect(said).toContain('criteria no reading still on record was taken through: 2');
  });

  it('keeps as many readings as it is asked to', async () => {
    await threeReadings();
    await pruneCommand(shelf, join(dir, 'lens-a.json'), '2');

    const left = await readingsOnRecord(shelf.readings, 'corpus-a');
    expect(left).toHaveLength(2);
    // Every reading still on record still names criteria that are still held.
    const held = new Set((await heldLenses(shelf.criteria, 'corpus-a')).map((one) => one.digest));
    for (const { reading } of left) expect(held.has(reading.lensDigest)).toBe(true);
  });

  it('costs no knowledge: what is at source is still written down, and says where', async () => {
    await threeReadings();
    const before = await readdir(shelf.seeds);

    const said = await pruneCommand(shelf, join(dir, 'lens-a.json'), '0');

    // Every reading is gone and the knowledge is not. The criteria changed three
    // times and the source never did, so there was one writing-down of it all along
    // and it is the one this Corpus is read from.
    expect(await readingsOnRecord(shelf.readings, 'corpus-a')).toEqual([]);
    expect(await readdir(shelf.seeds)).toEqual(before);
    expect(said).toContain('No knowledge was dropped');
    expect(said).toContain(join(shelf.seeds, before[0]!));
    // And it says what it did cost, rather than leaving a trend to come back empty
    // with no account of why.
    expect(said).toContain('nothing to be compared against');
  });

  it('drops a reading naming neither of its inputs, which nothing else can even see', async () => {
    const lensPath = await shelveLens('lens-a.json');
    // What every shelf in existence is full of: readings recorded before either
    // input was named. Two of these on one shelf were taken ten seconds apart.
    await mkdir(shelf.readings, { recursive: true });
    for (const at of ['2026-01-01T00-00-00-000Z', '2026-01-01T00-00-10-000Z']) {
      await writeFile(
        join(shelf.readings, `corpus-a-${at}.json`),
        JSON.stringify({ takenAt: at, lensId: 'corpus-a', scores: [] }),
        'utf8',
      );
    }
    await reportCommand(shelf, lensPath, undefined);

    // Invisible to a trend, which is right, and so invisible to a prune too until
    // it was asked about them by name — an artifact this product holds and could
    // not account for.
    expect(await readingsOnRecord(shelf.readings, 'corpus-a')).toHaveLength(1);

    const said = await pruneCommand(shelf, lensPath, undefined);

    expect(said).toContain('naming neither what they were read from nor what was asked of it: 2');
    expect(await readdir(shelf.readings)).toHaveLength(1);
    expect(said).toContain('No knowledge was dropped');
  });

  it('says what it cost even where it cost nothing', async () => {
    const lensPath = await shelveLens('lens-a.json');
    await reportCommand(shelf, lensPath, undefined);

    const said = await pruneCommand(shelf, lensPath, undefined);

    expect(said).toContain('readings on record: 0');
    expect(said).toContain('No knowledge was dropped');
    expect(await readingsOnRecord(shelf.readings, 'corpus-a')).toHaveLength(1);
  });

  it('refuses a number of readings to keep that is not one, rather than guessing', async () => {
    const lensPath = await shelveLens('lens-a.json');
    await expect(pruneCommand(shelf, lensPath, 'lots')).rejects.toThrow(/whole number/);
  });
});
