import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { lensDigest, loadLens, whatTheLensSays } from '@vertuo/comply-lens';

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
      criteria: [{ type: 'requiredAttributes', attributes: ['definition'] }],
      definesTerms: true,
      columns: { A: 'name', B: 'definition' },
    },
  ],
  maturity: { levels: ['a', 'b'], approvedAtOrAbove: 'b' },
  statusMappings: [],
};

/**
 * A Lens as a machine has it: written down somewhere, then loaded, so its root is
 * an absolute path on whichever machine read it — which is the whole hazard this
 * digest exists to be indifferent to.
 */
async function lensAt(where: string, body: unknown = declared) {
  const dir = join(await mkdtemp(join(tmpdir(), 'lens-')), where);
  await mkdir(dir, { recursive: true });
  const path = join(dir, 'lens.json');
  await writeFile(path, JSON.stringify(body), 'utf8');
  return loadLens(path);
}

describe('a Lens’s identity is what it says, not where it points', () => {
  it('digests to one value from two different roots', async () => {
    const here = await lensAt('one');
    const there = await lensAt('somewhere/else/entirely');

    // The two roots really are different, or this test would pass over nothing.
    expect(here.adapter.root).not.toBe(there.adapter.root);
    expect(lensDigest(here)).toBe(lensDigest(there));
  });

  it('says nothing about where it points, so a retained copy names no machine', async () => {
    const lens = await lensAt('one');
    const said = whatTheLensSays(lens);

    expect(JSON.stringify(said)).not.toContain(lens.adapter.root);
    // Everything a criterion is stated in terms of is still there.
    expect(said.facets[0]!.criteria).toEqual(lens.facets[0]!.criteria);
    expect(said.maturity).toEqual(lens.maturity);
    expect(said.adapter.moduleIdKey).toBe('m');
  });

  it('digests to one value whatever order the file writes its keys in', async () => {
    const reversed = (value: unknown): unknown => {
      if (value === null || typeof value !== 'object') return value;
      if (Array.isArray(value)) return value.map(reversed);
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>)
          .reverse()
          .map(([key, v]) => [key, reversed(v)]),
      );
    };

    const asWritten = await lensAt('one');
    const rewritten = await lensAt('one', reversed(declared));
    expect(lensDigest(rewritten)).toBe(lensDigest(asWritten));
  });

  it('digests differently once a criterion is tightened', async () => {
    const before = await lensAt('one');
    const after = await lensAt('one', {
      ...declared,
      facets: [
        {
          ...declared.facets[0]!,
          criteria: [{ type: 'requiredAttributes', attributes: ['definition', 'example'] }],
        },
      ],
    });

    expect(lensDigest(after)).not.toBe(lensDigest(before));
  });

  it('digests differently once the approved rung moves', async () => {
    const before = await lensAt('one');
    const after = await lensAt('one', {
      ...declared,
      maturity: { levels: ['a', 'b'], approvedAtOrAbove: 'a' },
    });

    expect(lensDigest(after)).not.toBe(lensDigest(before));
  });

  it('digests differently once a Facet arrives, because the denominator moved', async () => {
    const before = await lensAt('one');
    const after = await lensAt('one', {
      ...declared,
      facets: [
        declared.facets[0]!,
        { name: 'rules', factKind: 'Rule', extractor: 'heading', criteria: [] },
      ],
    });

    expect(lensDigest(after)).not.toBe(lensDigest(before));
  });
});
