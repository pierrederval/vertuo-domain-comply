import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { fixturePath } from '@vertuo/comply-fixtures';
import { loadCorpus } from '@vertuo/comply-ingestion';
import { loadLens } from '@vertuo/comply-lens';
import { readCorpus } from '../src/reading.js';

/** Fixed, so no baseline exists and the trend column reads the same on every run. */
const READ_AT = '2026-01-01T00:00:00.000Z';

function baselinePath(name: string): string {
  return fileURLToPath(new URL(`./baseline/${name}`, import.meta.url));
}

/**
 * What the runner says about each fixture Corpus, captured character for character.
 *
 * These two files are the evidence that moving the line between extraction and
 * interpretation changed nothing a reader sees. They were recorded from the
 * judging-while-extracting runner, before that line moved, and are not to be
 * regenerated to make a change pass: a difference here means knowledge was lost
 * on the way through the Seed, which is a design fault and not a stale
 * expectation.
 */
describe.each([
  ['lens-a.json', 'corpus-a.txt'],
  ['lens-b.json', 'corpus-b.txt'],
])('reading %s', (lensFile, baselineFile) => {
  it('says exactly what it said before', async () => {
    const lens = await loadLens(fixturePath(lensFile));
    const { corpus, findings } = await loadCorpus(lens);

    const { text } = readCorpus(corpus, lens, findings, READ_AT, null);

    expect(text).toBe(await readFile(baselinePath(baselineFile), 'utf8'));
  });
});
