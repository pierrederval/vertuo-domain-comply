import { mkdir, mkdtemp, readFile, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { corpusDetailSchema, corpusModuleSchema, notHeldSchema } from '@vertuo/comply-contract';
import { fixturePath } from '@vertuo/comply-fixtures';
import { extractSeed } from '@vertuo/comply-ingestion';
import { loadLens } from '@vertuo/comply-lens';
import { holdSeed } from '@vertuo/comply-seed';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../src/server.js';

/** Fixed, so the age a reading reports is compared against a value and not the clock. */
const WRITTEN_DOWN_AT = new Date('2026-01-01T09:00:00.000Z');

let shelf: string;
let server: FastifyInstance;

interface DeclaredFacet {
  name: string;
  criteria: unknown[];
}

interface DeclaredLens {
  id: string;
  adapter: { root: string };
  facets: DeclaredFacet[];
}

/**
 * Puts a fixture Lens on a shelf of its own, pointing at the source it already
 * has, with anything a test needs to declare differently folded in first.
 */
async function shelveLens(
  file: string,
  declaring: (lens: DeclaredLens) => void = () => {},
): Promise<string> {
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

async function readGrid(id: string) {
  const response = await server.inject({ method: 'GET', url: `/corpus/${id}/reading` });
  const { reading } = corpusDetailSchema.parse(response.json());
  if (reading.outcome !== 'read') throw new Error('the source was written down');
  return reading;
}

/** One Module, read back through the same definition the Studio validates against. */
async function readModule(id: string, moduleId: string) {
  const response = await server.inject({ method: 'GET', url: `/corpus/${id}/modules/${moduleId}` });
  expect(response.statusCode).toBe(200);
  return corpusModuleSchema.parse(response.json());
}

/** The Module's reading, or a failure saying its source was written down. */
async function readModuleReading(id: string, moduleId: string) {
  const { reading } = await readModule(id, moduleId);
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

describe('one Module, whole', () => {
  it('answers for both fixture Corpus, which are differently shaped, through one path', async () => {
    for (const file of ['lens-a.json', 'lens-b.json']) {
      await shelveLens(file);
      await writeDownKnowledge(file);
    }

    // They differ in Facets, Maturity ladder, Modules and owner mechanism, and
    // nothing here knows that (ADR-0001).
    for (const id of ['corpus-a', 'corpus-b']) {
      const grid = await readGrid(id);
      for (const row of grid.modules) {
        const reading = await readModuleReading(id, row.id);

        // The page and the grid answer the same about the same Module, because
        // both are arrangements of one reading.
        expect(reading.facets.map((facet) => facet.facet)).toEqual(
          grid.facets.map((facet) => facet.name),
        );
        expect(reading.facets.map((facet) => facet.state)).toEqual(
          row.cells.map((cell) => cell.state),
        );
        expect(reading.approved).toBe(row.approved);
        expect(reading.declaredFacets).toBe(row.declaredFacets);
        expect(reading.owner).toEqual(row.owner);
      }
    }
  });

  it('lists what is missing from a Facet short on content', async () => {
    // Asked for here rather than taken from a fixture, because this answer has to
    // carry two kinds of shortfall against one Facet at once and no fixture has
    // that. Tightening what a Facet asks for is also what §6 means by a reading
    // moving because the criteria changed rather than because anything was
    // written — the knowledge under Terms is untouched.
    await shelveLens('lens-a.json', (lens) => {
      const terms = lens.facets.find((facet) => facet.name === 'terms')!;
      terms.criteria = [
        { type: 'requiredAttributes', attributes: ['name', 'definition', 'nobody-writes-this'] },
        { type: 'minSources', count: 4 },
      ];
    });
    await writeDownKnowledge('lens-a.json');

    const grid = await readGrid('corpus-a');
    const shortened = grid.modules.find((row) =>
      row.cells.some((cell) => cell.state === 'present'),
    )!;
    const reading = await readModuleReading('corpus-a', shortened.id);
    const short = reading.facets.find((facet) => facet.state === 'present')!;

    if (short.state !== 'present') throw new Error('a Facet fell short on content');
    // The parts of each reason, with what each is stated against. Nothing here
    // is a sentence: the words are the surface's to write (LAW-010).
    expect(short.shortOf).toContainEqual({
      criterion: 'requiredAttributes',
      missing: ['nobody-writes-this'],
    });
    expect(short.shortOf).toContainEqual({ criterion: 'minSources', has: 2, needs: 4 });
    // Knowledge that fell short is still knowledge, and the reader is shown it.
    expect(short.knowledge.length).toBeGreaterThan(0);
  });

  it('says a Facet is sufficient and unapproved without saying anything is missing from it', async () => {
    await shelveLens('lens-a.json');
    await writeDownKnowledge('lens-a.json');

    const grid = await readGrid('corpus-a');
    const row = grid.modules.find((module) =>
      module.cells.some((cell) => cell.state === 'well-formed'),
    )!;
    const reading = await readModuleReading('corpus-a', row.id);
    const unapproved = reading.facets.find((facet) => facet.state === 'well-formed')!;

    if (unapproved.state !== 'well-formed') throw new Error('a Facet was sufficient');
    // Different work, and often a different person: this one needs reviewing,
    // not writing. So it carries no unmet criteria at all, and how much of it is
    // unapproved is stated against how much there is.
    expect(unapproved).not.toHaveProperty('shortOf');
    expect(unapproved.notYetApproved).toBeGreaterThan(0);
    expect(unapproved.notYetApproved).toBeLessThanOrEqual(unapproved.knowledge.length);
    expect(reading.ladder.levels).toContain(reading.ladder.approvedAtOrAbove);
  });

  it('says nothing is written down under an absent Facet, and shows no knowledge for it', async () => {
    await shelveLens('lens-b.json');
    await writeDownKnowledge('lens-b.json');

    const grid = await readGrid('corpus-b');
    const row = grid.modules.find((module) => module.cells.some((cell) => cell.state === 'absent'))!;
    const reading = await readModuleReading('corpus-b', row.id);
    const unwritten = reading.facets.find((facet) => facet.state === 'absent')!;

    // A Facet nobody has written under falls short of nothing. It is unwritten,
    // and a shortfall against criteria it has no content to meet would send its
    // Owner to review knowledge that does not exist.
    expect(unwritten).not.toHaveProperty('shortOf');
    expect(unwritten).not.toHaveProperty('knowledge');
    expect(unwritten).not.toHaveProperty('notYetApproved');
  });

  it('shows where each piece of knowledge is written down, and what it is graded at', async () => {
    await shelveLens('lens-a.json');
    await writeDownKnowledge('lens-a.json');
    const root = (await loadLens(join(shelf, 'lens-a.json'))).adapter.root;

    const grid = await readGrid('corpus-a');
    const reading = await readModuleReading('corpus-a', grid.modules[0]!.id);
    const knowledge = reading.facets.flatMap((facet) =>
      facet.state === 'absent' ? [] : facet.knowledge,
    );

    expect(knowledge.length).toBeGreaterThan(0);
    for (const piece of knowledge) {
      // Somewhere a reader can open, and nowhere that names the machine that
      // read it (LAW-009).
      expect(piece.at.file).not.toContain(root);
      expect(piece.at.file.startsWith('/')).toBe(false);
      expect(piece.at.line).toBeGreaterThan(0);
      if (piece.maturity !== null) expect(reading.ladder.levels).toContain(piece.maturity);
    }
  });

  it('lists the Findings against this Module, each with the place it cites', async () => {
    await shelveLens('lens-a.json');
    await writeDownKnowledge('lens-a.json');
    const root = (await loadLens(join(shelf, 'lens-a.json'))).adapter.root;

    const grid = await readGrid('corpus-a');
    const found = await Promise.all(
      grid.modules.map(async (row) => (await readModuleReading('corpus-a', row.id)).findings),
    );
    const findings = found.flat();

    expect(findings.length).toBeGreaterThan(0);
    for (const finding of findings) {
      expect(finding.says.length).toBeGreaterThan(0);
      expect(finding.at.file).not.toContain(root);
      expect(finding.at.file).toMatch(/\.md$/);
    }
    // Fixture A holds a defect that concerns two places at once, and both reach
    // the reader: evidence is not summarised into the one place it fits (LAW-009).
    expect(findings.some((finding) => finding.alsoAt.length > 0)).toBe(true);
    // Every Finding this Corpus has cites a Module, and each reaches exactly the
    // one it cites — none is repeated across Modules and none is dropped.
    expect(findings).toHaveLength(grid.integrity.openFindings);
  });

  it('shows no Finding against a Module that the Finding does not belong to', async () => {
    // Neither fixture holds a defect that belongs to no Module, and a page that
    // showed one to every Owner in the Corpus would render both fixtures
    // perfectly. So one is made: a document nothing can be read from names no
    // Module, and the Finding about it belongs to nobody.
    const source = join(shelf, 'unlike-either-fixture');
    await mkdir(source, { recursive: true });
    await writeFile(
      join(source, 'readable.md'),
      '---\nm: mm\nf: ff\ns: now\n---\n\n## One\n\nSomething.\n',
      'utf8',
    );
    await writeFile(join(source, 'not-readable.md'), 'nothing a Lens can read\n', 'utf8');
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
        facets: [{ name: 'ff', factKind: 'Term', extractor: 'heading', criteria: [], definesTerms: true, bodyAttribute: 'definition' }],
        maturity: { levels: ['low', 'high'], approvedAtOrAbove: 'high' },
        statusMappings: [{ match: 'now', maturity: 'high', sources: ['x'] }],
        owners: { mm: 'someone' },
      }),
      'utf8',
    );
    await writeDownKnowledge('unlike-either-fixture.json');

    const grid = await readGrid('third-shape');
    const reading = await readModuleReading('third-shape', grid.modules[0]!.id);

    // The Corpus has the Finding; the only Module in it does not. A Finding that
    // routes to nobody reaches the Inbox instead, in the queue that reaches
    // nobody; showing it here would make it look answered for.
    expect(grid.integrity.openFindings).toBeGreaterThan(0);
    expect(reading.findings).toEqual([]);
    expect(reading.lookedFor.length).toBeGreaterThan(0);
  });

  it('says what was looked for even when it found nothing here', async () => {
    await shelveLens('lens-b.json');
    await writeDownKnowledge('lens-b.json');

    const grid = await readGrid('corpus-b');
    const reading = await readModuleReading('corpus-b', grid.modules[0]!.id);

    // Fixture B has no open Findings at all, so this is the empty answer. It is
    // still stated against what was looked for: no Findings can only ever mean
    // none that these Checks would have found (LAW-006).
    expect(reading.findings).toEqual([]);
    expect(reading.lookedFor).toEqual(grid.integrity.lookedFor);
    expect(reading.lookedFor.length).toBeGreaterThan(0);
  });

  it('keeps the two readings apart here too', async () => {
    await shelveLens('lens-a.json');
    await writeDownKnowledge('lens-a.json');

    const grid = await readGrid('corpus-a');
    const reading = await readModuleReading('corpus-a', grid.modules[0]!.id);

    // The Facets are Readiness, the Findings are Integrity, and nothing is
    // derived from the pair (spec §4).
    expect(Object.keys(reading).sort()).toEqual([
      'approved',
      'declaredFacets',
      'facets',
      'findings',
      'ladder',
      'lensId',
      'lookedFor',
      'outcome',
      'owner',
      'sourceReadAt',
    ]);
  });

  it('says a Module answers to nobody rather than sending an empty name', async () => {
    await shelveLens('lens-a.json');
    await writeDownKnowledge('lens-a.json');

    const grid = await readGrid('corpus-a');
    const unowned = grid.modules.find((module) => module.owner === null)!;
    const reading = await readModuleReading('corpus-a', unowned.id);

    // Every Finding against this Module routes to nobody, which is a defect and
    // not an empty space (LAW-007).
    expect(reading.owner).toBeNull();
  });

  it('says nothing has been written down yet rather than that the Module is missing', async () => {
    await shelveLens('lens-a.json');

    const { reading } = await readModule('corpus-a', 'anything');

    // No Seed, so there is no Module here to find — and telling a reader the
    // name is wrong would send them to check a name when the source is what
    // nobody has read.
    expect(reading.outcome).toBe('nothing-written-down-yet');
  });

  it('tells a Corpus it does not hold from a Module it does not have', async () => {
    await shelveLens('lens-b.json');
    await writeDownKnowledge('lens-b.json');

    const noModule = await server.inject({ method: 'GET', url: '/corpus/corpus-b/modules/nothing' });
    const noCorpus = await server.inject({ method: 'GET', url: '/corpus/nothing/modules/nothing' });

    // One is a name to go and check, the other is a Corpus to go and put on the
    // shelf. Which sentence a reader meets is the surface's to choose (LAW-010).
    expect(noModule.statusCode).toBe(404);
    expect(noCorpus.statusCode).toBe(404);
    expect(notHeldSchema.parse(noModule.json()).notHeld).toBe('module');
    expect(notHeldSchema.parse(noCorpus.json()).notHeld).toBe('corpus');
  });
});
