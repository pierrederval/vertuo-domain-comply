import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { holdSeed, readSeed, seedDigest, seedSchema, SEED_VERSION, type Seed } from '../src/index.js';

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
