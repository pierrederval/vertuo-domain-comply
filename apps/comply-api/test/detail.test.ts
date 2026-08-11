import { mkdir, mkdtemp, readFile, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { corpusDetailSchema } from '@vertuo/comply-contract';
import { fixturePath } from '@vertuo/comply-fixtures';
import { extractSeed } from '@vertuo/comply-ingestion';
import { loadLens } from '@vertuo/comply-lens';
import { holdSeed } from '@vertuo/comply-seed';
import type { FastifyInstance } from 'fastify';
import { buildServer, movementOf } from '../src/server.js';

/** Fixed, so the age a reading reports is compared against a value and not the clock. */
const WRITTEN_DOWN_AT = new Date('2026-01-01T09:00:00.000Z');

let shelf: string;
let server: FastifyInstance;

interface DeclaredLens {
  id: string;
  adapter: { root: string };
  facets: unknown[];
}

/**
 * Puts a fixture Lens on a shelf of its own, pointing at the source it already
 * has, with anything a test needs to declare differently folded in first.
 */
async function shelveLens(file: string, declaring: (lens: DeclaredLens) => void = () => {}): Promise<string> {
  const declared = JSON.parse(await readFile(fixturePath(file), 'utf8')) as DeclaredLens;
  declared.adapter.root = resolve(dirname(fixturePath(file)), declared.adapter.root);
  declaring(declared);
  await writeFile(join(shelf, file), JSON.stringify(declared), 'utf8');
  return declared.id;
}

/** Writes down what is at source, as the runner would, at a known moment. */
async function writeDownKnowledge(file: string): Promise<void> {
  const lens = await loadLens(join(shelf, file));
  const held = await holdSeed(join(shelf, 'seeds'), await extractSeed(lens));
  await utimes(held.path, WRITTEN_DOWN_AT, WRITTEN_DOWN_AT);
}

async function readCorpus(id: string) {
  const response = await server.inject({ method: 'GET', url: `/corpus/${id}/reading` });
  expect(response.statusCode).toBe(200);
  // Read back through the same definition the Studio validates against.
  return corpusDetailSchema.parse(response.json());
}

/** The reading, or a failure saying the source was written down when it was not. */
async function readGrid(id: string) {
  const { reading } = await readCorpus(id);
  if (reading.outcome !== 'read') throw new Error('the source was written down');
  return reading;
}

beforeEach(async () => {
  shelf = await mkdtemp(join(tmpdir(), 'comply-shelf-'));
  await mkdir(join(shelf, 'seeds'), { recursive: true });
  server = buildServer(shelf);
});

afterEach(async () => {
  await server.close();
});

describe('the whole reading of one Corpus', () => {
  it('answers for both fixture Corpus, which are differently shaped, through one path', async () => {
    for (const file of ['lens-a.json', 'lens-b.json']) {
      await shelveLens(file);
      await writeDownKnowledge(file);
    }

    // They differ in Facets, Maturity ladder, Modules and owner mechanism, and
    // nothing here knows that (ADR-0001).
    for (const id of ['corpus-a', 'corpus-b']) {
      const reading = await readGrid(id);

      expect(reading.facets.length).toBeGreaterThan(0);
      expect(reading.modules.length).toBeGreaterThan(0);
      expect(reading.ladder.levels).toContain(reading.ladder.approvedAtOrAbove);
      expect(reading.sourceReadAt).toBe(WRITTEN_DOWN_AT.toISOString());
    }

    const [a, b] = [await readGrid('corpus-a'), await readGrid('corpus-b')];
    expect(a.facets).not.toEqual(b.facets);
    expect(a.ladder.levels).not.toEqual(b.ladder.levels);
  });

  it('gives every Module a cell under every declared Facet', async () => {
    // A Facet no Module has filled, so an all-absent column is a real answer here
    // and not a shape that has to be imagined (spec §5.3).
    await shelveLens('lens-a.json', (lens) => {
      lens.facets.push({
        name: 'unfilled',
        factKind: 'Rule',
        extractor: 'heading', criteria: [],
        bodyAttribute: 'statement',
      });
    });
    await writeDownKnowledge('lens-a.json');

    const reading = await readGrid('corpus-a');

    expect(reading.facets).toContain('unfilled');
    for (const module of reading.modules) {
      expect(module.cells.map((cell) => cell.facet)).toEqual(reading.facets);
      expect(module.declaredFacets).toBe(reading.facets.length);
    }
    // Nobody has written anything under it, in any Module, which is the finding.
    const unfilled = reading.modules.map((module) => module.cells.at(-1)!.state);
    expect(new Set(unfilled)).toEqual(new Set(['absent']));
  });

  it('names the Lens the Facets were declared by', async () => {
    await shelveLens('lens-a.json');
    await writeDownKnowledge('lens-a.json');

    // An all-absent column is as often a defect in the denominator as it is work
    // nobody has started, and a reader has to know what to go and change.
    expect((await readGrid('corpus-a')).lensId).toBe('corpus-a');
  });

  it('says a Module answers to nobody rather than sending an empty name', async () => {
    await shelveLens('lens-a.json');
    await writeDownKnowledge('lens-a.json');

    const owners = (await readGrid('corpus-a')).modules.map((module) => module.owner);

    // Fixture A leaves one Module unowned on purpose. Nothing is the answer, and
    // a surface can mark it (LAW-007).
    expect(owners).toContain(null);
    expect(owners.some((owner) => typeof owner === 'string')).toBe(true);
  });

  it('says there is nothing yet to compare a Module against, for every Module', async () => {
    await shelveLens('lens-b.json');
    await writeDownKnowledge('lens-b.json');

    const reading = await readGrid('corpus-b');

    // Readings are not recorded yet — that is #24 — so no baseline exists and
    // every Module says so. A first-ever reading drawn as zero movement would be
    // the reassurance LAW-006 refuses.
    for (const module of reading.modules) {
      expect(module.movement).toEqual({ comparedWith: 'no-earlier-reading' });
    }
  });

  it('carries a figure that moved, on the day there is one to carry', async () => {
    // The server has no baseline to pass yet (#24), so the shape that says a
    // Module gained or lost ground has no way to arrive from a shelf. It is
    // proven here instead of assumed, because the day baselines exist is not the
    // day to discover the wire could not say so.
    expect(movementOf(2)).toEqual({ comparedWith: 'the-last-reading', approvedDelta: 2 });
    expect(movementOf(-1)).toEqual({ comparedWith: 'the-last-reading', approvedDelta: -1 });
    expect(movementOf(0)).toEqual({ comparedWith: 'the-last-reading', approvedDelta: 0 });
    expect(movementOf(null)).toEqual({ comparedWith: 'no-earlier-reading' });
  });

  it('shows the two readings here too, each with what it counts out of', async () => {
    await shelveLens('lens-a.json');
    await writeDownKnowledge('lens-a.json');

    const reading = await readGrid('corpus-a');

    expect(reading.readiness.modules).toBe(reading.modules.length);
    expect(reading.integrity.lookedFor).toContain('split-identity');
    // The grid is Readiness. Integrity is not folded into a cell, a row, or a
    // column of it, and no third figure is derived from the pair (spec §4).
    expect(Object.keys(reading).sort()).toEqual([
      'facets',
      'integrity',
      'ladder',
      'lensId',
      'modules',
      'outcome',
      'readiness',
      'sourceReadAt',
    ]);
  });

  it('agrees with the list about the same Corpus', async () => {
    await shelveLens('lens-a.json');
    await writeDownKnowledge('lens-a.json');

    const listed = (await server.inject({ method: 'GET', url: '/corpus' })).json() as {
      corpus: { id: string; name: string; reading: Record<string, unknown> }[];
    };
    const detail = await readCorpus('corpus-a');
    const summary = listed.corpus[0]!;

    // Two routes to one Corpus's figures is how two answers to one question
    // appear. Both compose the same reading.
    expect({ id: detail.id, name: detail.name }).toEqual({ id: summary.id, name: summary.name });
    if (detail.reading.outcome !== 'read') throw new Error('the source was written down');
    expect(detail.reading.readiness).toEqual(summary.reading['readiness']);
    expect(detail.reading.integrity).toEqual(summary.reading['integrity']);
  });

  it('says a Corpus has nothing written down rather than drawing an empty grid', async () => {
    await shelveLens('lens-a.json');

    expect((await readCorpus('corpus-a')).reading).toEqual({ outcome: 'nothing-written-down-yet' });
  });

  it('refuses to answer about a Corpus that is not on the shelf', async () => {
    await shelveLens('lens-a.json');

    const response = await server.inject({ method: 'GET', url: '/corpus/nothing-here/reading' });
    expect(response.statusCode).toBe(404);
  });

  it('has no way to change one Corpus either, whatever is asked of it', async () => {
    await shelveLens('lens-a.json');

    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE'] as const) {
      const response = await server.inject({ method, url: '/corpus/corpus-a/reading' });
      expect(response.statusCode).toBe(404);
    }
  });
});
