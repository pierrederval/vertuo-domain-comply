import { cp, mkdir, mkdtemp, readFile, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { corpusHomeSchema } from '@vertuo/comply-contract';
import { fixturePath } from '@vertuo/comply-fixtures';
import { extractSeed } from '@vertuo/comply-ingestion';
import { loadLens } from '@vertuo/comply-lens';
import { holdLens } from '@vertuo/comply-lens';
import { recordReading } from '@vertuo/comply-readiness';
import { readSeededCorpus } from '@vertuo/comply-reading';
import { heldSeeds, holdSeed, latestHeldSeed, readSeed } from '@vertuo/comply-seed';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../src/server.js';

let shelf: string;
let server: FastifyInstance;

interface DeclaredFacet {
  name: string;
  criteria: unknown[];
  [says: string]: unknown;
}

interface DeclaredLens {
  id: string;
  adapter: { root: string };
  maturity: { levels: string[]; approvedAtOrAbove: string };
  facets: DeclaredFacet[];
}

/**
 * Puts a fixture Lens on a shelf of its own, over a copy of the source it points
 * at, so a test can change what the source says.
 *
 * The copy is what makes a change feed testable at all: what changed is a statement
 * about two readings of one Corpus, and the fixture source is shared by every other
 * test in the workspace.
 */
async function shelveLens(
  file: string,
  declaring: (lens: DeclaredLens) => void = () => {},
): Promise<void> {
  const declared = JSON.parse(await readFile(fixturePath(file), 'utf8')) as DeclaredLens;
  const source = resolve(dirname(fixturePath(file)), declared.adapter.root);
  const copy = join(shelf, 'source', declared.id);

  await cp(source, copy, { recursive: true });
  declared.adapter.root = copy;
  declaring(declared);
  await writeFile(join(shelf, file), JSON.stringify(declared), 'utf8');
}

/**
 * Changes the criteria without touching the source, leaving the copy where it is.
 *
 * Rewriting the whole Lens would copy the source a second time, and the second copy
 * would have fresh timestamps — which is exactly the figure the feed reports.
 */
async function tighten(file: string, declaring: (lens: DeclaredLens) => void): Promise<void> {
  const declared = JSON.parse(await readFile(join(shelf, file), 'utf8')) as DeclaredLens;
  declaring(declared);
  await writeFile(join(shelf, file), JSON.stringify(declared), 'utf8');
}

/** Deletes one document from the copied source, so the knowledge genuinely moves. */
async function unwrite(lensId: string, document: string): Promise<void> {
  await rm(join(shelf, 'source', lensId, document));
}

/**
 * Adds a line of prose to a document at source, so what is written down changes and
 * not one figure or Finding does.
 *
 * The state a reader is in most of the time, and the only honest way to reach *the
 * knowledge has not moved*: two writings-down, both held, and every figure and every
 * Finding the same. A reading of the knowledge in hand cannot stand in for it, because
 * it is the reading in hand (ADR-0034).
 *
 * Prose under an existing heading, so nothing is added, removed, renamed or restated.
 * The Seed holds the words a claim was read out of, so its digest moves; what a Facet
 * asks of that claim is answered exactly as it was.
 */
async function addProse(lensId: string, document: string, saying: string): Promise<void> {
  const at = join(shelf, 'source', lensId, document);
  await writeFile(at, `${await readFile(at, 'utf8')}\n${saying}\n`, 'utf8');
}

/** Writes down what is at source, as the runner would, at a known moment. */
async function writeDownKnowledge(file: string, at: Date): Promise<void> {
  const lens = await loadLens(join(shelf, file));
  const held = await holdSeed(join(shelf, 'seeds'), await extractSeed(lens));
  await utimes(held.path, at, at);
}

/**
 * Puts a reading of what is currently written down on record, as the runner would,
 * holding the criteria first. Nothing on the server does this: every route is a GET
 * and a reading goes on record where a Seed is loaded (ADR-0016).
 */
async function putAReadingOnRecord(file: string, takenAt: string): Promise<void> {
  const lens = await loadLens(join(shelf, file));
  const held = (await latestHeldSeed(join(shelf, 'seeds'), lens.id))!;
  const reading = readSeededCorpus(await readSeed(held.path), lens, takenAt, null);

  await holdLens(join(shelf, 'lens-versions'), lens);
  await recordReading(join(shelf, 'runs'), reading.asRecorded);
}

async function readHome(id: string) {
  const response = await server.inject({ method: 'GET', url: `/corpus/${id}/home` });
  expect(response.statusCode).toBe(200);
  // Read back through the same definition the Studio validates against.
  return corpusHomeSchema.parse(response.json());
}

/** Home, or a failure saying the source was written down when it was not. */
async function readWork(id: string) {
  const { reading } = await readHome(id);
  if (reading.outcome !== 'read') throw new Error('the source was written down');
  return reading;
}

const FIRST = new Date('2026-01-01T09:00:00.000Z');
const SECOND = new Date('2026-01-03T09:00:00.000Z');

beforeEach(async () => {
  shelf = await mkdtemp(join(tmpdir(), 'comply-shelf-'));
  await mkdir(join(shelf, 'seeds'), { recursive: true });
  server = buildServer(shelf);
});

afterEach(async () => {
  await server.close();
  await rm(shelf, { recursive: true, force: true });
});

describe('what needs work in one Corpus', () => {
  it('answers for both fixture Corpus, which are differently shaped, through one path', async () => {
    for (const [file, id] of [
      ['lens-a.json', 'corpus-a'],
      ['lens-b.json', 'corpus-b'],
    ]) {
      await shelveLens(file!);
      await writeDownKnowledge(file!, FIRST);

      const reading = await readWork(id!);
      expect(reading.needsWork.length).toBeGreaterThan(0);
      expect(reading.declaredFacets).toBeGreaterThan(0);
      // Every figure carries what it is counted out of, on this page as on the grid.
      for (const module of reading.needsWork) {
        expect(module.declaredFacets).toBe(reading.declaredFacets);
        expect(module.approved).toBeLessThan(module.declaredFacets);
      }
    }
  });

  it('carries the two readings and no figure derived from the pair', async () => {
    await shelveLens('lens-a.json');
    await writeDownKnowledge('lens-a.json', FIRST);

    const reading = await readWork('corpus-a');
    expect(reading.readiness.modules).toBeGreaterThan(0);
    expect(reading.integrity.lookedFor.length).toBeGreaterThan(0);

    // The whole list, so a fused figure, a rate, or a grade cannot arrive quietly.
    expect(Object.keys(reading).sort()).toEqual([
      'declaredFacets',
      'integrity',
      'ladder',
      'lensId',
      'needsWork',
      'outcome',
      'readiness',
      'since',
      'sourceReadAt',
      'writtenDown',
    ]);
  });

  it('leaves out a Module that has everything its Lens declares approved', async () => {
    // Every criterion dropped and the lowest rung counting as approved, so a Facet
    // with anything written under it is approved — and the Module with something
    // under every Facet drops off the list.
    await shelveLens('lens-b.json', (lens) => {
      for (const facet of lens.facets) facet.criteria = [];
      lens.maturity.approvedAtOrAbove = lens.maturity.levels[0]!;
    });
    await writeDownKnowledge('lens-b.json', FIRST);

    const reading = await readWork('corpus-b');
    expect(reading.readiness.modulesFullyApproved).toBeGreaterThan(0);
    for (const module of reading.needsWork) {
      expect(module.approved).toBeLessThan(module.declaredFacets);
    }
    // What it holds is on the grid, Facet by Facet. A work list carrying a Module
    // short of nothing would be the grid again, in a shape nothing can be read down.
    expect(reading.needsWork.length).toBe(
      reading.readiness.modules - reading.readiness.modulesFullyApproved,
    );
  });

  it('marks a Module nobody answers for rather than leaving it blank', async () => {
    await shelveLens('lens-a.json');
    await writeDownKnowledge('lens-a.json', FIRST);

    const { needsWork } = await readWork('corpus-a');
    const unowned = needsWork.filter((module) => module.owner === null);
    // Sent as nothing, never as an empty name, so a surface has something to mark.
    expect(unowned.length).toBeGreaterThan(0);
    for (const module of unowned) expect(module.owner).toBeNull();
  });

  it('says the source has not been read rather than drawing an empty Corpus', async () => {
    await shelveLens('lens-a.json');

    const { reading } = await readHome('corpus-a');
    expect(reading).toEqual({ outcome: 'nothing-written-down-yet' });
  });

  it('says nothing of that name is held', async () => {
    const response = await server.inject({ method: 'GET', url: '/corpus/nowhere/home' });
    expect(response.statusCode).toBe(404);
  });
});

describe('when this source was read', () => {
  it('names every writing-down the shelf still holds, oldest first', async () => {
    await shelveLens('lens-a.json');
    await writeDownKnowledge('lens-a.json', FIRST);
    await unwrite('corpus-a', 'alpha/aggregates.md');
    await writeDownKnowledge('lens-a.json', SECOND);

    const { writtenDown } = await readWork('corpus-a');
    expect(writtenDown).toEqual([
      { at: FIRST.toISOString() },
      { at: SECOND.toISOString() },
    ]);
  });

  it('adds nothing where the source is read again and says the same thing', async () => {
    await shelveLens('lens-a.json');
    await writeDownKnowledge('lens-a.json', FIRST);
    // Read again with nothing changed at source. What is already held is found and
    // left alone, so there is nothing new to report — which is why this list can
    // never become a report of runs (ADR-0012).
    await writeDownKnowledge('lens-a.json', FIRST);

    expect((await readWork('corpus-a')).writtenDown).toHaveLength(1);
  });
});

describe('what changed since the last reading kept', () => {
  it('says there is no earlier reading rather than saying nothing changed', async () => {
    await shelveLens('lens-a.json');
    await writeDownKnowledge('lens-a.json', FIRST);

    expect((await readWork('corpus-a')).since).toEqual({ comparedWith: 'no-earlier-reading' });
  });

  it('says nothing has moved, which is not the same statement', async () => {
    await shelveLens('lens-a.json');
    await writeDownKnowledge('lens-a.json', FIRST);
    await putAReadingOnRecord('lens-a.json', '2026-01-02T00:00:00.000Z');

    // A line of prose under a heading that was already there. The knowledge was
    // written down a second time and not one figure or Finding moved, which is the
    // only state in which *nothing has moved* is a comparison at all: stated against
    // a reading of the knowledge in hand it would be a reading compared with itself,
    // and it would say this on a Corpus nobody had ever measured twice (ADR-0034).
    await addProse('corpus-a', 'alpha/invariants.md', 'It is never in three either.');
    await writeDownKnowledge('lens-a.json', SECOND);

    expect((await readWork('corpus-a')).since).toEqual({
      comparedWith: 'the-last-reading',
      takenAt: '2026-01-02T00:00:00.000Z',
      changed: [],
    });
  });

  it('says there is no earlier reading where the only one kept is of the knowledge in hand', async () => {
    await shelveLens('lens-a.json');
    await writeDownKnowledge('lens-a.json', FIRST);
    await putAReadingOnRecord('lens-a.json', '2026-01-02T00:00:00.000Z');

    // The state every shelf in this product was in. A reading goes on record the
    // moment either input changes, so the most recent one is a reading of what is in
    // hand — and reported as a comparison it says *nothing has moved* about a Corpus
    // no reading has ever been stated against. *No baseline* and *no change* are
    // different facts (LAW-006).
    expect((await readWork('corpus-a')).since).toEqual({ comparedWith: 'no-earlier-reading' });
  });

  it('reports a Facet that fell off the approved rung, naming it as the Lens does', async () => {
    await shelveLens('lens-a.json');
    await writeDownKnowledge('lens-a.json', FIRST);
    await putAReadingOnRecord('lens-a.json', '2026-01-02T00:00:00.000Z');

    await unwrite('corpus-a', 'alpha/aggregates.md');
    await writeDownKnowledge('lens-a.json', SECOND);

    const { since } = await readWork('corpus-a');
    if (since.comparedWith !== 'the-last-reading') throw new Error('a reading was kept');
    expect(since.changed).toContainEqual({
      changed: 'facet',
      moduleId: 'alpha',
      facet: 'aggregates',
      // What the Lens calls it, which is not what it is keyed on.
      label: 'Aggregates',
      approved: false,
    });
  });

  it('reports a Finding that has stopped being found, in the words it was found in', async () => {
    await shelveLens('lens-a.json');
    await writeDownKnowledge('lens-a.json', FIRST);
    await putAReadingOnRecord('lens-a.json', '2026-01-02T00:00:00.000Z');

    await unwrite('corpus-a', 'beta/terms.md');
    await writeDownKnowledge('lens-a.json', SECOND);

    const { since } = await readWork('corpus-a');
    if (since.comparedWith !== 'the-last-reading') throw new Error('a reading was kept');

    const gone = since.changed.filter(
      (item) => item.changed === 'finding' && !item.appeared,
    );
    expect(gone.length).toBeGreaterThan(0);
    // Quoted, never summarised: a reader shown a reworded Finding has been shown a
    // second-hand version of the thing this product exists to detect.
    expect(JSON.stringify(gone)).toContain('module identities');
  });

  it('says the criteria moved rather than reporting the knowledge as having changed', async () => {
    await shelveLens('lens-a.json');
    await writeDownKnowledge('lens-a.json', FIRST);
    await putAReadingOnRecord('lens-a.json', '2026-01-02T00:00:00.000Z');

    // The same knowledge, read through a Lens that now asks for something no Fact
    // under that Facet writes. Not one document changed.
    await tighten('lens-a.json', (lens) => {
      lens.facets[0]!.criteria = [
        { type: 'requiredAttributes', attributes: ['nothing-written-anywhere'] },
      ];
    });

    const { since, needsWork } = await readWork('corpus-a');
    expect(since).toEqual({ comparedWith: 'a-reading-under-other-criteria' });
    // And the same statement per Module, so the page cannot say one thing at the
    // top and another beside a figure.
    for (const module of needsWork) {
      expect(module.movement).toEqual({ comparedWith: 'a-reading-under-other-criteria' });
    }
    expect(JSON.stringify(since)).not.toContain('approvedDelta');
  });

  it('still states every figure when the knowledge the last reading was made of has gone', async () => {
    await shelveLens('lens-a.json');
    await writeDownKnowledge('lens-a.json', FIRST);
    await putAReadingOnRecord('lens-a.json', '2026-01-02T00:00:00.000Z');

    await unwrite('corpus-a', 'alpha/aggregates.md');
    await writeDownKnowledge('lens-a.json', SECOND);

    // What that reading was read from, dropped as a prune would drop it.
    const [earliest] = await heldSeeds(join(shelf, 'seeds'), 'corpus-a');
    await rm(earliest!.path);

    const { since, needsWork, readiness } = await readWork('corpus-a');
    expect(since).toEqual({ comparedWith: 'knowledge-no-longer-held' });

    // The figures that reading recorded are still on record, so a Module's
    // movement still compares. Only what a Facet or a Finding did is beyond
    // working out, because a recorded reading holds the figures and not the
    // Facets they were counted from.
    expect(readiness.modules).toBeGreaterThan(0);
    expect(needsWork.some((module) => module.movement.comparedWith === 'the-last-reading')).toBe(
      true,
    );
  });
});
