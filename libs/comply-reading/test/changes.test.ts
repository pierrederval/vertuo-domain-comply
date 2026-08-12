import { describe, expect, it } from 'vitest';
import { fixturePath } from '@vertuo/comply-fixtures';
import { extractSeed } from '@vertuo/comply-ingestion';
import { loadLens } from '@vertuo/comply-lens';
import { readSeededCorpus, whatChanged, type Reading } from '@vertuo/comply-reading';

/** Fixed, so nothing here is compared against the clock. */
const READ_AT = '2026-01-01T00:00:00.000Z';

/**
 * One reading of a fixture Corpus, optionally with some of its source left out.
 *
 * The same Lens both times, always. Two readings taken through different criteria
 * are not a comparison of knowledge at all, and the caller is the one that has to
 * establish that — so nothing here can accidentally test the case the caller is
 * required to refuse.
 */
async function read(lensFile: string, without: string[] = []): Promise<Reading> {
  const lens = await loadLens(fixturePath(lensFile));
  const seed = await extractSeed(lens);

  return readSeededCorpus(
    { ...seed, documents: seed.documents.filter((held) => !without.includes(held.path)) },
    lens,
    READ_AT,
    null,
  );
}

/**
 * A document in each fixture Corpus holding a Facet its own Lens counts as
 * approved, and one holding a Facet that has got as far as it has without being
 * approved.
 *
 * Named per Corpus because the two are deliberately unalike — different Facets,
 * different ladders, different words for a status (ADR-0001). What is asserted
 * about them is the same in both, which is the point: a rule that only held for one
 * shape would fail here.
 */
const IN_EACH = [
  {
    lensFile: 'lens-a.json',
    approved: { document: 'alpha/aggregates.md', moduleId: 'alpha', facet: 'aggregates' },
    shortOfApproved: 'alpha/invariants.md',
  },
  {
    lensFile: 'lens-b.json',
    approved: { document: 'one.md', moduleId: 'one', facet: 'definitions' },
    shortOfApproved: 'two.md',
  },
];

describe.each(IN_EACH)('what changed in $lensFile', ({ lensFile, approved, shortOfApproved }) => {
  it('reports nothing where the knowledge is the same knowledge', async () => {
    const changed = whatChanged(await read(lensFile), await read(lensFile));

    // Not one item, and not an item saying nothing moved. A feed that reported
    // its own emptiness would be reporting a run, which is the one thing this
    // list may never carry (ADR-0012).
    expect(changed).toEqual({ facets: [], findings: [] });
  });

  it('reports a Facet that fell off the rung this Corpus counts as approved', async () => {
    const before = await read(lensFile);
    const after = await read(lensFile, [approved.document]);

    expect(whatChanged(before, after).facets).toEqual([
      { moduleId: approved.moduleId, facet: approved.facet, approved: false },
    ]);
  });

  it('reports a Facet that reached it', async () => {
    const before = await read(lensFile, [approved.document]);
    const after = await read(lensFile);

    expect(whatChanged(before, after).facets).toEqual([
      { moduleId: approved.moduleId, facet: approved.facet, approved: true },
    ]);
  });

  it('says nothing about a Facet that moved without crossing that rung', async () => {
    const before = await read(lensFile);
    const after = await read(lensFile, [shortOfApproved]);

    // Real work, and this page is not where it is reported: the figures above the
    // feed count approved Facets, and an item that moves none of them would send a
    // reader looking for a number that did not move.
    expect(whatChanged(before, after).facets).toEqual([]);
  });

  it('reports no Finding as having moved where none did', async () => {
    // Run over both shapes, including the one with nothing to find in it: the
    // comparison is the same comparison, and a Corpus with no defects is where a
    // feed inventing one would show up (ADR-0001).
    expect(whatChanged(await read(lensFile), await read(lensFile)).findings).toEqual([]);
  });
});

/**
 * Findings are asserted against `corpus-a`, which is the fixture Corpus that has
 * any. `corpus-b` is deliberately clean, so what it can say about a Finding moving
 * is that none did — which is the assertion it carries above.
 */
describe('what changed about a Finding', () => {
  const lensFile = 'lens-a.json';

  it('reports one that is no longer found', async () => {
    const before = await read(lensFile);
    const after = await read(lensFile, ['beta/terms.md']);

    const { findings } = whatChanged(before, after);
    expect(findings.length).toBeGreaterThan(0);
    // Every one of them went with the knowledge that carried it: nothing arrived.
    for (const moved of findings) expect(moved.appeared).toBe(false);
    expect(findings.map((moved) => moved.finding.code)).toContain('split-identity');
  });

  it('reports one that has started being found', async () => {
    const before = await read(lensFile, ['beta/terms.md']);
    const after = await read(lensFile);

    const { findings } = whatChanged(before, after);
    expect(findings.length).toBeGreaterThan(0);
    for (const moved of findings) expect(moved.appeared).toBe(true);
    expect(findings.map((moved) => moved.finding.code)).toContain('split-identity');
  });

  it('carries the Finding whole, so the feed quotes what was found and never a summary of it', async () => {
    const { findings } = whatChanged(await read(lensFile, ['beta/terms.md']), await read(lensFile));
    const split = findings.find((moved) => moved.finding.code === 'split-identity')!;

    // The words and the place, exactly as the Check reported them. A feed that
    // reworded a Finding would be showing a reader a second-hand version of the
    // thing this product exists to detect.
    expect(split.finding.message).toContain('module identities');
    expect(split.finding.origin.line).toBeGreaterThan(0);
  });

  it('reports a Module arriving as its approved Facets having become approved', async () => {
    const alpha = ['alpha/aggregates.md', 'alpha/invariants.md', 'alpha/overview.md', 'alpha/rules.md', 'alpha/terms.md'];
    const before = await read(lensFile, alpha);
    const after = await read(lensFile);

    // A Module that was not in the last reading has nothing approved in it, so a
    // Facet approved in this one has become approved. Saying *nothing to compare
    // with* per Facet would leave the one thing that moved unreported.
    const { facets } = whatChanged(before, after);
    expect(facets.filter((crossed) => crossed.moduleId === 'alpha')).toEqual([
      { moduleId: 'alpha', facet: 'overview', approved: true },
      { moduleId: 'alpha', facet: 'aggregates', approved: true },
      { moduleId: 'alpha', facet: 'terms', approved: true },
    ]);
  });

  it('reports a Module leaving as its approved Facets having fallen back', async () => {
    const alpha = ['alpha/aggregates.md', 'alpha/invariants.md', 'alpha/overview.md', 'alpha/rules.md', 'alpha/terms.md'];
    const { facets } = whatChanged(await read(lensFile), await read(lensFile, alpha));

    expect(facets.every((crossed) => crossed.approved === false)).toBe(true);
    expect(facets.filter((crossed) => crossed.moduleId === 'alpha')).toHaveLength(3);
  });
});
