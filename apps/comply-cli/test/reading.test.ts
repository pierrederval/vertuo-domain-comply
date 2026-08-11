import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { buildCorpus } from '@vertuo/comply-core';
import { fixturePath } from '@vertuo/comply-fixtures';
import { extractSeed, interpret, loadCorpus } from '@vertuo/comply-ingestion';
import { loadLens } from '@vertuo/comply-lens';
import { holdSeed, readSeed, whatWasRead } from '@vertuo/comply-seed';
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
 *
 * One difference is legitimate: a fixture Corpus deliberately gaining or losing
 * knowledge. What tells the two cases apart is the *other* file. A change to one
 * Lens's own facets moves one baseline and leaves the other byte-identical; a
 * fault in the reading pipeline moves both. So a diff here is only ever accepted
 * after reading it line by line and confirming the sibling did not budge.
 *
 * A third case is legitimate and is rarer: the reading learning to say something
 * new. Both files then move by exactly the sentence it learned and by nothing
 * else, which is as strict a check as a stationary sibling and is read the same
 * way — line by line, before it is accepted.
 *
 * `corpus-a.txt` was last regenerated when lens A gained its Invariants Facet
 * (ADR-0019), and `corpus-b.txt` did not change by a byte. Both were regenerated
 * when the reading began saying how much it set aside (ADR-0025): two lines
 * appeared at the foot of each and not one existing line moved, so no knowledge
 * changed hands — corpus-a's own grid is unchanged even though `alpha/rules.md`
 * gained a section, because that section is furniture its Lens now says is none
 * of the Facet's.
 */
describe.each([
  ['lens-a.json', 'corpus-a.txt'],
  ['lens-b.json', 'corpus-b.txt'],
])('reading %s', (lensFile, baselineFile) => {
  it('says exactly what it said before', async () => {
    const lens = await loadLens(fixturePath(lensFile));
    const { corpus, findings, read } = await loadCorpus(lens);

    const { text } = readCorpus(corpus, lens, findings, READ_AT, null, read);

    expect(text).toBe(await readFile(baselinePath(baselineFile), 'utf8'));
  });

  it('says the same thing again reading a Seed off the shelf', async () => {
    const lens = await loadLens(fixturePath(lensFile));

    // The long way round, exactly as the server will take it: extract, put the
    // Seed on the shelf, read it back off disk, and only then apply the Lens.
    // Anything that cannot survive being written down and read again — a path
    // that was absolute, a value that was a number, an order that happened to
    // hold in memory — shows up here and nowhere else.
    const held = await holdSeed(await mkdtemp(join(tmpdir(), 'comply-shelf-')), await extractSeed(lens));
    const shelved = await readSeed(held.path);
    const { facts, findings } = interpret(shelved, lens);

    const { text } = readCorpus(
      buildCorpus(facts), lens, findings, READ_AT, null, whatWasRead(shelved),
    );

    expect(text).toBe(await readFile(baselinePath(baselineFile), 'utf8'));
  });
});
