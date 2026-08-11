import { mkdir, mkdtemp, readFile, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  corpusDetailSchema,
  corpusFactSchema,
  corpusModuleSchema,
  notHeldSchema,
  type Place,
} from '@vertuo/comply-contract';
import { fixturePath } from '@vertuo/comply-fixtures';
import { extractSeed } from '@vertuo/comply-ingestion';
import { loadLens } from '@vertuo/comply-lens';
import { holdSeed } from '@vertuo/comply-seed';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../src/server.js';

const WRITTEN_DOWN_AT = new Date('2026-01-01T09:00:00.000Z');

let shelf: string;
let server: FastifyInstance;

interface DeclaredLens {
  id: string;
  adapter: { root: string };
}

async function shelveLens(file: string): Promise<void> {
  const declared = JSON.parse(await readFile(fixturePath(file), 'utf8')) as DeclaredLens;
  declared.adapter.root = resolve(dirname(fixturePath(file)), declared.adapter.root);
  await writeFile(join(shelf, file), JSON.stringify(declared), 'utf8');
}

async function writeDownKnowledge(file: string): Promise<void> {
  const lens = await loadLens(join(shelf, file));
  const held = await holdSeed(join(shelf, 'seeds'), await extractSeed(lens));
  await utimes(held.path, WRITTEN_DOWN_AT, WRITTEN_DOWN_AT);
}

/** The address one piece of knowledge is asked for at: a Module, and a place in it. */
function addressOf(id: string, moduleId: string, at: Place): string {
  const held = `/corpus/${encodeURIComponent(id)}/modules/${encodeURIComponent(moduleId)}`;
  return `${held}/knowledge?in=${encodeURIComponent(at.file)}&line=${at.line}`;
}

async function readFact(id: string, moduleId: string, at: Place) {
  const response = await server.inject({ method: 'GET', url: addressOf(id, moduleId, at) });
  expect(response.statusCode).toBe(200);
  return corpusFactSchema.parse(response.json());
}

/** The reading of one piece of knowledge, or a failure saying its source was read. */
async function readFactReading(id: string, moduleId: string, at: Place) {
  const { reading } = await readFact(id, moduleId, at);
  if (reading.outcome !== 'read') throw new Error('the source was written down');
  return reading;
}

/** Every place one Corpus writes knowledge down, with the Module and Facet it is under. */
async function everyPlace(id: string) {
  const grid = await server.inject({ method: 'GET', url: `/corpus/${id}/reading` });
  const { reading } = corpusDetailSchema.parse(grid.json());
  if (reading.outcome !== 'read') throw new Error('the source was written down');

  const places: { moduleId: string; facet: string; at: Place; maturity: string | null }[] = [];
  for (const row of reading.modules) {
    const answer = await server.inject({ method: 'GET', url: `/corpus/${id}/modules/${row.id}` });
    const module = corpusModuleSchema.parse(answer.json());
    if (module.reading.outcome !== 'read') throw new Error('the source was written down');

    for (const facet of module.reading.facets) {
      if (facet.state === 'absent') continue;
      for (const piece of facet.knowledge) {
        places.push({ moduleId: row.id, facet: facet.facet, at: piece.at, maturity: piece.maturity });
      }
    }
  }
  return places;
}

beforeEach(async () => {
  shelf = await mkdtemp(join(tmpdir(), 'comply-shelf-'));
  await mkdir(join(shelf, 'seeds'), { recursive: true });
  server = buildServer(shelf);
});

afterEach(async () => {
  await server.close();
});

describe('one piece of knowledge, whole', () => {
  it('answers for every place both fixture Corpus write knowledge down, through one path', async () => {
    for (const file of ['lens-a.json', 'lens-b.json']) {
      await shelveLens(file);
      await writeDownKnowledge(file);
    }

    // Two Corpus that share no Facet, no rung and no Module, answered by one
    // route that knows none of it (ADR-0001). Fixture B's ladder is numeric,
    // which is the shape a page most easily mistakes for a count.
    for (const id of ['corpus-a', 'corpus-b']) {
      const places = await everyPlace(id);
      expect(places.length).toBeGreaterThan(0);

      for (const found of places) {
        const reading = await readFactReading(id, found.moduleId, found.at);

        // The Module page and this answer are two arrangements of one reading, so
        // they cannot come to disagree about the same piece of knowledge.
        expect(reading.at).toEqual(found.at);
        expect(reading.moduleId).toBe(found.moduleId);
        expect(reading.facet).toBe(found.facet);
        expect(reading.maturity).toEqual(found.maturity);
        expect(reading.written.length).toBeGreaterThan(0);
      }
    }
  });

  it('quotes the source text it was read out of, exactly as written', async () => {
    await shelveLens('lens-a.json');
    await writeDownKnowledge('lens-a.json');
    const { root } = (await loadLens(join(shelf, 'lens-a.json'))).adapter;

    for (const found of await everyPlace('corpus-a')) {
      const reading = await readFactReading('corpus-a', found.moduleId, found.at);
      if (reading.quoted === null) throw new Error('the source text travelled with it');

      // Not a paraphrase, not a summary, and not lines stitched together: the
      // run of text is in the document as one piece, byte for byte (LAW-009).
      const source = await readFile(join(root, found.at.file), 'utf8');
      expect(source).toContain(reading.quoted.says);
      expect(reading.quoted.cut).toBe(false);
    }
  });

  it('keeps two passages as two where a source wrote one part twice', async () => {
    await shelveLens('lens-a.json');
    await writeDownKnowledge('lens-a.json');

    // R-1 writes a line before its first subheading and then the subheading the
    // Lens maps onto the same attribute, so the attribute holds both passages
    // (ADR-0026). They are not next to each other in the document.
    const reading = await readFactReading('corpus-a', 'alpha', {
      file: 'alpha/rules.md',
      line: 8,
    });
    const twice = reading.written.find((part) => part.says.length > 1);

    expect(twice).toBeDefined();
    expect(twice!.says).toEqual([
      '*Invariant.*',
      'A Widget may not be made twice. See [R-2](rules.md#r-2-a-sprocket-s-role-in-the-søcket).',
    ]);
    // Every part the reading holds reaches the reader, including the ones an
    // extractor made: a Facet may state a criterion against any of them, and a
    // reader shown fewer cannot check the shortfall they were told about.
    expect(reading.written.map((part) => part.named)).toEqual([
      'name',
      'slug',
      'statement',
      'rationale',
      'standing',
      'checkedAgainst',
    ]);
  });

  it('names every place this Corpus says the knowledge came from, and tells several from one', async () => {
    await shelveLens('lens-a.json');
    await writeDownKnowledge('lens-a.json');

    const three = await readFactReading('corpus-a', 'alpha', { file: 'alpha/rules.md', line: 8 });
    const two = await readFactReading('corpus-a', 'alpha', { file: 'alpha/rules.md', line: 33 });
    const one = await readFactReading('corpus-a', 'alpha', { file: 'alpha/rules.md', line: 47 });

    // Three rules under one Facet of one document, corroborated three, two and
    // one time. Both paths reach the set: what its document's status stands for,
    // and what the rule itself names (ADR-0029). Quoted as the Corpus writes
    // them, and never tidied.
    expect(three.sources).toEqual(['system-x', 'review', 'the crate ledger']);
    expect(two.sources).toEqual(['system-x', 'the crate ledger']);
    expect(one.sources).toEqual(['the crate ledger']);
    // A rung and a set are never each other: the rule backed by one place is the
    // one this Corpus graded at nothing, and the rung is no part of the set.
    expect(one.maturity).toBeNull();
    expect(three.maturity).toBe('agreed');
    expect(three.sources).not.toContain(three.maturity);
  });

  it('draws a rung whose name is a number apart from a set that is empty', async () => {
    await shelveLens('lens-b.json');
    await writeDownKnowledge('lens-b.json');

    const reading = await readFactReading('corpus-b', 'two', { file: 'three.md', line: 7 });

    // Two zeros about one piece of knowledge, and only one of them is a count:
    // "0" is the name of a rung this Corpus deliberately grades it at, and
    // nothing at all says where it came from (LAW-005, LAW-006).
    expect(reading.maturity).toBe('0');
    expect(reading.ladder.levels).toEqual(['0', '1', '2']);
    expect(reading.sources).toEqual([]);
  });

  it('says a quotation stops short of what the source says', async () => {
    // Neither fixture writes a piece of knowledge long enough to be cut, and a
    // page that never said so would render both perfectly. So one is written: a
    // rule whose body runs past what an excerpt carries.
    const source = join(shelf, 'unlike-either-fixture');
    await mkdir(source, { recursive: true });
    await writeFile(
      join(source, 'long.md'),
      `---\nm: mm\nf: ff\ns: now\n---\n\n## One\n\n${'A sentence that goes on. '.repeat(40)}\n`,
      'utf8',
    );
    await writeFile(
      join(shelf, 'unlike-either-fixture.json'),
      JSON.stringify({
        id: 'third-shape',
        adapter: {
          kind: 'markdown-frontmatter',
          root: source,
          moduleIdKey: 'm',
          facetKey: 'f',
          statusKey: 's',
        },
        facets: [
          {
            name: 'ff',
            factKind: 'Term',
            extractor: 'heading',
            definesTerms: true,
            bodyAttribute: 'definition',
            criteria: [],
          },
        ],
        maturity: { levels: ['low', 'high'], approvedAtOrAbove: 'high' },
        statusMappings: [{ match: 'now', maturity: 'high', sources: ['x'] }],
      }),
      'utf8',
    );
    await writeDownKnowledge('unlike-either-fixture.json');

    const reading = await readFactReading('third-shape', 'mm', { file: 'long.md', line: 7 });
    if (reading.quoted === null) throw new Error('the source text travelled with it');

    // Said rather than left to be noticed. What the reader is shown is a verbatim
    // prefix of what is there, and the place above it is where the rest is.
    expect(reading.quoted.cut).toBe(true);
    expect(reading.quoted.says.length).toBeLessThan(
      (reading.written.find((part) => part.named === 'definition')?.says[0] ?? '').length,
    );
  });

  it('tells a Corpus it does not hold from a Module it has not from a place it writes nothing at', async () => {
    await shelveLens('lens-a.json');
    await writeDownKnowledge('lens-a.json');

    const noCorpus = await server.inject({
      method: 'GET',
      url: addressOf('nothing', 'alpha', { file: 'alpha/rules.md', line: 8 }),
    });
    const noModule = await server.inject({
      method: 'GET',
      url: addressOf('corpus-a', 'nothing', { file: 'alpha/rules.md', line: 8 }),
    });
    const nothingThere = await server.inject({
      method: 'GET',
      url: addressOf('corpus-a', 'alpha', { file: 'alpha/rules.md', line: 9 }),
    });
    // A place another Module writes at, asked for under this one. The place alone
    // would answer, and answering would put one Module's knowledge on another
    // Module's page.
    const elsewhere = await server.inject({
      method: 'GET',
      url: addressOf('corpus-a', 'beta', { file: 'alpha/rules.md', line: 8 }),
    });

    for (const missing of [noCorpus, noModule, nothingThere, elsewhere]) {
      expect(missing.statusCode).toBe(404);
    }
    // Three things to go and do: put a Corpus on the shelf, check a Module's
    // name, check a place. Which sentence a reader meets is the surface's
    // (LAW-010).
    expect(notHeldSchema.parse(noCorpus.json()).notHeld).toBe('corpus');
    expect(notHeldSchema.parse(noModule.json()).notHeld).toBe('module');
    expect(notHeldSchema.parse(nothingThere.json()).notHeld).toBe('knowledge');
    expect(notHeldSchema.parse(elsewhere.json()).notHeld).toBe('knowledge');
  });

  it('says nothing has been written down yet rather than that the place is empty', async () => {
    await shelveLens('lens-a.json');

    const { reading } = await readFact('corpus-a', 'alpha', { file: 'alpha/rules.md', line: 8 });

    // No Seed, so there is nothing written down anywhere to be at that place —
    // and telling a reader the place is wrong would send them to check a place
    // when the source is what nobody has read.
    expect(reading.outcome).toBe('nothing-written-down-yet');
  });

  it('refuses a place nobody could open rather than answering about one', async () => {
    await shelveLens('lens-a.json');
    await writeDownKnowledge('lens-a.json');

    const noLine = await server.inject({
      method: 'GET',
      url: '/corpus/corpus-a/modules/alpha/knowledge?in=alpha%2Frules.md',
    });
    const nowhere = await server.inject({
      method: 'GET',
      url: addressOf('corpus-a', 'alpha', { file: 'alpha/rules.md', line: 0 }),
    });

    expect(noLine.statusCode).toBe(400);
    expect(nowhere.statusCode).toBe(400);
  });
});
