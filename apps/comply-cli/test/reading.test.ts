import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { buildCorpus } from '@vertuo/comply-core';
import { fixturePath } from '@vertuo/comply-fixtures';
import { extractSeed, interpret, loadCorpus } from '@vertuo/comply-ingestion';
import { loadLens } from '@vertuo/comply-lens';
import { composeReading } from '@vertuo/comply-reading';
import { holdSeed, readSeed, whatWasRead } from '@vertuo/comply-seed';
import { sayWhereItStands } from '../src/reading.js';

/**
 * Fixed, and with nothing to be compared against, so the trend column reads the
 * same on every run. The knowledge digest is fixed for the same reason: it is on
 * record and never drawn, so nothing it says reaches the text below.
 */
const AS_READ = {
  takenAt: '2026-01-01T00:00:00.000Z',
  seedDigest: '0'.repeat(64),
  previous: null,
};

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
 *
 * `corpus-a.txt` moved again by exactly two lines when lens A began reading its
 * Facts as the parts they are written in (ADR-0026), and `corpus-b.txt` did not
 * budge. Beta's overview fell from well-formed to present, and its reason changed
 * from the maturity it has not reached to `missing: owns` — the first case of a
 * shortfall that names a part of a Fact rather than a whole one. Alpha's rules did
 * not move despite gaining three subheadings apiece, and the figure at the foot did
 * not move either, which together are the evidence that parts change what a Fact is
 * made of and neither how many Facts there are nor what was set aside.
 *
 * `corpus-a.txt` moved a third time when lens A gained a second Facet of Terms — a list
 * of which thing owns the others (ADR-0021, ADR-0027) — and `corpus-b.txt` did not budge.
 * Corpus A genuinely gained a document, so a column, a rung on both denominators and one
 * more Fact read is the whole of it. What must *not* be here is a third reading of the
 * word Widget: `alpha/aggregates.md` writes that word down and means something else by
 * it, and the Findings section still says it is defined two different ways. Read by Fact
 * Kind rather than by the Facet that says it defines the language, this file says three,
 * which is how that repair is held.
 *
 * `corpus-a.txt` moved a fourth time when a Fact began saying where it stands and what it
 * was checked against (ADR-0022), and `corpus-b.txt` did not budge — corpus B's review
 * genuinely happens a document at a time, and it is carried here so that grain cannot
 * leak into the reading. Corpus A gained one rule, so one more Fact read and one more
 * finding is the whole of it, and the finding cites `alpha/rules.md:47`, which is that
 * rule's own heading and not the top of a document 46 lines above it. What must *not* be
 * here is a grid that moved: alpha's first rule now stands at the approved rung on its own
 * word, and the cell is still `~~` because the two rules beside it do not, which is the
 * difference between a fact's claim and a document's.
 *
 * The fifth move is one sentence, in both files, and not a mark: the trend column can now
 * say a reading was taken against different criteria, and a legend that turns up only when
 * that happens is one a reader has to already know to look for (LAW-006). Every grid line
 * either side of it is identical, character for character, which is what makes it a
 * legitimate move rather than the loss this file exists to catch — recording a reading only
 * when its inputs change moved nothing anybody is shown about the knowledge (ADR-0016).
 *
 * The sixth move is the first to move **both** files by knowledge rather than by a sentence, and
 * it is the third legitimate case above with a fourth beside it: both Corpus genuinely gained a
 * Facet of requests and somewhere the roles those requests name are settled (ADR-0037), and the
 * reading genuinely learned to say something new about them. Corpus A gained two columns and four
 * Facts — two of a cast, two requests — so 3/5 became 5/7, 3/15 became 5/21, 14 found became 18,
 * and one Finding appeared: `alpha/orders.md:11` names a Fixer nobody has written down. Corpus B
 * gained one column and four Facts and **no Finding at all**, which is the half worth reading
 * twice: it writes two roles in one section, and a reading that could not be told how this corpus
 * divides them would report `Opérateur ou Inspecteur` as somebody nobody has written down, at a
 * Corpus that has written down both. What set aside says did not move in either file, because
 * neither new document carries any furniture.
 */
describe.each([
  ['lens-a.json', 'corpus-a.txt'],
  ['lens-b.json', 'corpus-b.txt'],
])('reading %s', (lensFile, baselineFile) => {
  it('says exactly what it said before', async () => {
    const lens = await loadLens(fixturePath(lensFile));
    const { corpus, findings, read } = await loadCorpus(lens);

    const reading = composeReading(corpus, lens, findings, AS_READ);
    const text = sayWhereItStands(reading, read, lens.adapter.root);

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

    const reading = composeReading(buildCorpus(facts), lens, findings, AS_READ);
    const text = sayWhereItStands(reading, whatWasRead(shelved), lens.adapter.root);

    expect(text).toBe(await readFile(baselinePath(baselineFile), 'utf8'));
  });
});
