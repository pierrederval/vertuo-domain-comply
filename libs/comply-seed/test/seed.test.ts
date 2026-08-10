import { mkdtemp, readFile, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  holdSeed,
  latestHeldSeed,
  readSeed,
  seedDigest,
  seedSchema,
  SEED_VERSION,
  type Seed,
} from '../src/index.js';

function seed(overrides: Partial<Seed> = {}): Seed {
  return {
    version: SEED_VERSION,
    lensId: 'l1',
    documents: [
      {
        path: 'x/y.md',
        containerId: 'x',
        readable: true,
        bodyStartLine: 6,
        moduleId: 'm1',
        facet: 'f1',
        status: 's1',
        owner: null,
        items: [
          { line: 8, attributes: { a: 'one' }, relations: [], excerpt: '| one |', excerptCut: false },
        ],
      },
    ],
    ...overrides,
  };
}

/** A JSON reviver that rebuilds every object with its keys in the opposite order. */
function reverseKeys(_key: string, value: unknown): unknown {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).reverse());
}

describe('a Seed as an artifact', () => {
  it('digests the same content to the same value whatever order its keys are written in', () => {
    const asWritten = seed();
    // The same Seed with every object's keys inserted in reverse order. A digest that
    // depended on key order would make an unchanged corpus look changed, and a load
    // that should have been a no-op would replace state instead (ADR-0012).
    const reversed = JSON.parse(JSON.stringify(asWritten), reverseKeys) as Seed;

    expect(Object.keys(reversed)).not.toEqual(Object.keys(asWritten));
    expect(seedDigest(reversed)).toBe(seedDigest(asWritten));
  });

  it('gives different content a different digest', () => {
    expect(seedDigest(seed())).not.toBe(seedDigest(seed({ lensId: 'l2' })));
  });

  it('names the file by its digest and never rewrites it', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'comply-seed-'));

    const first = await holdSeed(dir, seed());
    expect(first.alreadyHeld).toBe(false);
    expect(first.path).toContain(first.digest);

    const before = await readFile(first.path, 'utf8');
    const again = await holdSeed(dir, seed());

    expect(again.alreadyHeld).toBe(true);
    expect(again.path).toBe(first.path);
    // Byte-identical: extracting again from unchanged source cannot damage a Seed
    // that some recorded reading already cites.
    expect(await readFile(first.path, 'utf8')).toBe(before);
  });

  it('leaves an earlier Seed untouched when the knowledge changes', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'comply-seed-'));
    const first = await holdSeed(dir, seed());
    const before = await readFile(first.path, 'utf8');

    const second = await holdSeed(dir, seed({ lensId: 'l1', documents: [] }));

    expect(second.path).not.toBe(first.path);
    expect(await readFile(first.path, 'utf8')).toBe(before);
  });

  it('reads back exactly what was written', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'comply-seed-'));
    const { path } = await holdSeed(dir, seed());
    expect(await readSeed(path)).toEqual(seed());
  });

  it('refuses a Seed carrying a reading rather than trusting it', async () => {
    // A maturity level or a source list in a Seed would mean extraction had judged.
    const parsed = seedSchema.safeParse({ version: 1, lensId: 'l1', documents: [{}] });
    expect(parsed.success).toBe(false);
  });

  it('says which Seed cannot be read, and why', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'comply-seed-'));
    const path = join(dir, 'broken.json');
    await writeFile(path, JSON.stringify({ version: 1, lensId: '' }), 'utf8');
    await expect(readSeed(path)).rejects.toThrow(/cannot be read/);
  });
});

describe('what the shelf holds for one Lens', () => {
  it('finds the most recently written down, and says when that was', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'comply-shelf-'));
    const older = await holdSeed(dir, seed());
    const newer = await holdSeed(dir, seed({ lensId: 'l1', documents: [] }));

    // Set the times explicitly: two files written in the same millisecond would
    // otherwise decide the order between them by luck.
    await utimes(older.path, new Date('2026-01-01T00:00:00Z'), new Date('2026-01-01T00:00:00Z'));
    await utimes(newer.path, new Date('2026-02-01T00:00:00Z'), new Date('2026-02-01T00:00:00Z'));

    const latest = await latestHeldSeed(dir, 'l1');

    expect(latest?.path).toBe(newer.path);
    expect(latest?.digest).toBe(newer.digest);
    // The only honest age a reading has before any reading is recorded: when the
    // knowledge it is made of was written down from source.
    expect(latest?.heldAt.toISOString()).toBe('2026-02-01T00:00:00.000Z');
  });

  it('holds each Lens apart, including one whose name begins with another', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'comply-shelf-'));
    const held = await holdSeed(dir, seed({ lensId: 'l1-extra' }));

    expect((await latestHeldSeed(dir, 'l1-extra'))?.path).toBe(held.path);
    // 'l1-extra-<digest>.json' begins with 'l1-', and belongs to neither Lens
    // but its own. Matching on the prefix alone would hand it to 'l1'.
    expect(await latestHeldSeed(dir, 'l1')).toBeNull();
  });

  it('says nothing rather than guessing when nothing has been written down yet', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'comply-shelf-'));
    expect(await latestHeldSeed(dir, 'l1')).toBeNull();
    expect(await latestHeldSeed(join(dir, 'nowhere'), 'l1')).toBeNull();
  });

  it('passes over anything on the shelf that is not a Seed it wrote', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'comply-shelf-'));
    await writeFile(join(dir, 'l1-notadigest.json'), '{}', 'utf8');
    await writeFile(join(dir, 'l1.json'), '{}', 'utf8');

    expect(await latestHeldSeed(dir, 'l1')).toBeNull();
  });
});
