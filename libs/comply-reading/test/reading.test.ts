import { describe, expect, it } from 'vitest';
import { fixturePath } from '@vertuo/comply-fixtures';
import { extractSeed } from '@vertuo/comply-ingestion';
import { loadLens } from '@vertuo/comply-lens';
import { readSeededCorpus } from '@vertuo/comply-reading';
import type { Snapshot } from '@vertuo/comply-readiness';

/** Fixed, so a reading is compared against a baseline and never against the clock. */
const READ_AT = '2026-01-01T00:00:00.000Z';

async function read(lensFile: string, previous: Snapshot | null = null) {
  const lens = await loadLens(fixturePath(lensFile));
  return readSeededCorpus(await extractSeed(lens), lens, READ_AT, previous);
}

/**
 * Both fixture Corpus, through the same composition. They differ in Facets,
 * ladder, Modules, and owner mechanism (ADR-0001), so anything that only holds
 * for one shape fails here rather than in an audit.
 */
describe.each(['lens-a.json', 'lens-b.json'])('reading %s', (lensFile) => {
  it('gives both readings, and no figure that is neither', async () => {
    const reading = await read(lensFile);

    expect(reading.scores.length).toBeGreaterThan(0);
    // Readiness carries its denominator per Module.
    for (const score of reading.scores) expect(score.total).toBe(reading.matrix.facets.length);
    // Integrity carries the set it was looked for against.
    expect(reading.checks.length).toBeGreaterThan(0);

    // Nothing fused, averaged, or graded: the two readings never meet in a
    // third figure, because no such figure exists (LAW-006, spec §4).
    expect(Object.keys(reading).sort()).toEqual([
      'checks', 'findings', 'lensId', 'matrix', 'scores', 'snapshot', 'takenAt', 'trend',
    ]);
  });

  it('reports no Finding that nothing said it was looking for', async () => {
    const { findings, checks } = await read(lensFile);
    for (const finding of findings) expect(checks).toContain(finding.code);
  });

  it('says there is no baseline rather than saying nothing changed', async () => {
    const { trend } = await read(lensFile);
    // `—` and `0` are different facts and are never drawn the same way.
    expect(trend.every((row) => row.approvedDelta === null)).toBe(true);
  });

  it('compares against a baseline when there is one', async () => {
    const first = await read(lensFile);
    const again = await read(lensFile, first.snapshot);

    expect(again.trend.every((row) => row.approvedDelta === 0)).toBe(true);
  });

  it('names the Lens the knowledge was read through', async () => {
    const reading = await read(lensFile);
    expect(reading.lensId).toBe(reading.snapshot.lensId);
    expect(reading.matrix.lensId).toBe(reading.lensId);
  });
});

describe('the same knowledge read through a stricter Lens', () => {
  it('moves the reading with nothing re-extracted', async () => {
    const asDeclared = await loadLens(fixturePath('lens-a.json'));
    const seed = await extractSeed(asDeclared);

    // Somebody tightens what counts as approved. No document changed.
    const stricter = {
      ...asDeclared,
      statusMappings: asDeclared.statusMappings.map((mapping) =>
        mapping.maturity === 'agreed' ? { ...mapping, maturity: 'guessed', sources: ['system-x'] } : mapping,
      ),
    };

    const before = readSeededCorpus(seed, asDeclared, READ_AT, null);
    const after = readSeededCorpus(seed, stricter, READ_AT, null);

    const approved = (reading: typeof before) =>
      reading.scores.reduce((sum, score) => sum + score.approved, 0);

    expect(approved(before)).toBeGreaterThan(0);
    expect(approved(after)).toBe(0);
    // Same Modules, same denominator: only what the knowledge is taken to mean moved.
    expect(after.scores.map((s) => s.moduleId)).toEqual(before.scores.map((s) => s.moduleId));
  });
});
