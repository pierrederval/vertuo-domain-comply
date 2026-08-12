import { mkdir, mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { heldLenses, holdLens, lensDigest, loadLens } from '@vertuo/comply-lens';

const declared = {
  id: 'p',
  adapter: {
    kind: 'markdown-frontmatter',
    root: './corpus',
    moduleIdKey: 'm',
    facetKey: 'f',
    statusKey: 's',
  },
  facets: [
    {
      name: 'terms',
      factKind: 'Term',
      extractor: 'table',
      criteria: [],
      definesTerms: true,
      columns: { A: 'name', B: 'definition' },
    },
  ],
  maturity: { levels: ['a', 'b'], approvedAtOrAbove: 'b' },
  statusMappings: [],
};

async function lensAt(where: string, body: unknown = declared) {
  const dir = join(await mkdtemp(join(tmpdir(), 'lens-')), where);
  await mkdir(dir, { recursive: true });
  const path = join(dir, 'lens.json');
  await writeFile(path, JSON.stringify(body), 'utf8');
  return loadLens(path);
}

async function shelf(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'lens-versions-'));
}

describe('holding the criteria a reading was taken against', () => {
  it('names the file by the digest, and never writes it twice', async () => {
    const dir = await shelf();
    const lens = await lensAt('one');

    const first = await holdLens(dir, lens);
    expect(first.alreadyHeld).toBe(false);
    expect(first.path).toContain(first.digest);
    expect(first.digest).toBe(lensDigest(lens));

    const again = await holdLens(dir, lens);
    expect(again.alreadyHeld).toBe(true);
    expect(again.path).toBe(first.path);
    expect(await readdir(dir)).toHaveLength(1);
  });

  it('holds the same thing from two different roots, byte for byte', async () => {
    const one = await shelf();
    const other = await shelf();

    const here = await holdLens(one, await lensAt('one'));
    const there = await holdLens(other, await lensAt('somewhere/else/entirely'));

    expect(there.digest).toBe(here.digest);
    expect(await readFile(there.path, 'utf8')).toBe(await readFile(here.path, 'utf8'));
  });

  it('holds what a criterion is stated in terms of, so the reading can be worked out again', async () => {
    const dir = await shelf();
    const held = await holdLens(dir, await lensAt('one'));
    const retained = JSON.parse(await readFile(held.path, 'utf8')) as {
      facets: { name: string; columns: Record<string, string> }[];
      maturity: { approvedAtOrAbove: string };
      adapter: Record<string, string>;
    };

    expect(retained.facets.map((facet) => facet.name)).toEqual(['terms']);
    expect(retained.maturity.approvedAtOrAbove).toBe('b');
    // Where it pointed is not part of what it said, so no machine's path is here.
    expect(Object.keys(retained.adapter)).not.toContain('root');
  });

  it('tells one Lens’s held criteria from another’s whose name it begins with', async () => {
    const dir = await shelf();
    await holdLens(dir, await lensAt('one'));
    await holdLens(dir, await lensAt('one', { ...declared, id: 'p-extra' }));

    expect(await heldLenses(dir, 'p')).toHaveLength(1);
    expect(await heldLenses(dir, 'p-extra')).toHaveLength(1);
  });

  it('holds nothing for a Lens nothing has been held for, and says so plainly', async () => {
    const dir = await shelf();
    expect(await heldLenses(dir, 'p')).toEqual([]);
    expect(await heldLenses(join(dir, 'elsewhere'), 'p')).toEqual([]);
  });
});
