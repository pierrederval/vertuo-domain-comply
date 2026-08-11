import { mkdir, mkdtemp, readFile, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { corpusDetailSchema, corpusInboxSchema, type CitedPlace } from '@vertuo/comply-contract';
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

async function readInbox(id: string) {
  const response = await server.inject({ method: 'GET', url: `/corpus/${id}/inbox` });
  expect(response.statusCode).toBe(200);
  return corpusInboxSchema.parse(response.json());
}

/** The queues of one Corpus, or a failure saying its source was written down. */
async function readQueues(id: string) {
  const { reading } = await readInbox(id);
  if (reading.outcome !== 'read') throw new Error('the source was written down');
  return reading;
}

async function readGrid(id: string) {
  const response = await server.inject({ method: 'GET', url: `/corpus/${id}/reading` });
  const { reading } = corpusDetailSchema.parse(response.json());
  if (reading.outcome !== 'read') throw new Error('the source was written down');
  return reading;
}

/**
 * A Corpus unlike either fixture, because neither holds what a case needs.
 *
 * Nothing can be read from one of its two documents, which is how a Finding comes
 * to belong to no Module at all — and how it comes to cite a place no piece of
 * knowledge is written at.
 */
async function shelveAThirdShape(): Promise<void> {
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
      owners: { mm: 'someone' },
    }),
    'utf8',
  );
  await writeDownKnowledge('unlike-either-fixture.json');
}

beforeEach(async () => {
  shelf = await mkdtemp(join(tmpdir(), 'comply-shelf-'));
  await mkdir(join(shelf, 'seeds'), { recursive: true });
  server = buildServer(shelf);
});

afterEach(async () => {
  await server.close();
});

describe('one Corpus’s Findings, as a queue apiece', () => {
  it('answers for both fixture Corpus, which are differently shaped, through one path', async () => {
    for (const file of ['lens-a.json', 'lens-b.json']) {
      await shelveLens(file);
      await writeDownKnowledge(file);
    }

    // One Corpus has Modules nobody answers for and Findings against them; the
    // other has none of either. Both are answered by one route that knows nothing
    // about either (ADR-0001), and the empty one is the harder case.
    const busy = await readQueues('corpus-a');
    const quiet = await readQueues('corpus-b');

    expect(busy.routesTo.length).toBeGreaterThan(1);
    expect(quiet.routesTo).toEqual([]);
    // Nothing was found is never a bare claim: it can only ever mean nothing
    // these Checks would have found, so what ran is sent either way (LAW-006).
    expect(quiet.lookedFor).toEqual((await readGrid('corpus-b')).integrity.lookedFor);
    expect(quiet.lookedFor.length).toBeGreaterThan(0);
  });

  it('puts the Findings reaching nobody first, and gives everybody else a queue of their own', async () => {
    await shelveLens('lens-a.json');
    await writeDownKnowledge('lens-a.json');

    const { routesTo } = await readQueues('corpus-a');
    const grid = await readGrid('corpus-a');

    // A violation belonging to nobody is how a knowledge base quietly dies, so
    // the queue reaching nobody is first and loudest (LAW-007). In this Corpus it
    // is also the longest, which is the ordinary case and not a coincidence:
    // Modules nobody answers for are the ones nobody is writing.
    expect(routesTo[0]!.owner).toBeNull();
    expect(routesTo.map((queue) => queue.owner)).toEqual([null, 'avery']);
    expect(routesTo[0]!.findings).toHaveLength(4);
    expect(routesTo[1]!.findings).toHaveLength(2);
    // Every Finding routes to whoever answers for the Module it belongs to, and
    // the Owner comes from the reading rather than from the Finding — so this
    // page and the grid cannot come to disagree about who answers for a Module.
    for (const queue of routesTo) {
      for (const finding of queue.findings) {
        const row = grid.modules.find((module) => module.id === finding.moduleId);
        expect(row?.owner ?? null).toEqual(queue.owner);
      }
    }
  });

  it('reaches every Finding in the Corpus exactly once, dropping none', async () => {
    await shelveLens('lens-a.json');
    await writeDownKnowledge('lens-a.json');

    const { routesTo, lookedFor } = await readQueues('corpus-a');
    const grid = await readGrid('corpus-a');
    const all = routesTo.flatMap((queue) => queue.findings);

    // The one surface in the product where every Finding is accounted for. A
    // Module's page shows only its own, and a Finding belonging to no Module
    // appears on no Module's page at all — so if this dropped one, nothing would.
    expect(all).toHaveLength(grid.integrity.openFindings);
    expect(lookedFor).toEqual(grid.integrity.lookedFor);
    for (const finding of all) expect(finding.says.length).toBeGreaterThan(0);
  });

  it('quotes the source text at every place a Finding cites, exactly as written', async () => {
    await shelveLens('lens-a.json');
    await writeDownKnowledge('lens-a.json');
    const { root } = (await loadLens(join(shelf, 'lens-a.json'))).adapter;

    const { routesTo } = await readQueues('corpus-a');
    const cited: CitedPlace[] = routesTo.flatMap((queue) =>
      queue.findings.flatMap((finding) => [finding.cites, ...finding.alsoCites]),
    );

    expect(cited.length).toBeGreaterThan(0);
    for (const place of cited) {
      // Somewhere a reader can open, and nowhere that names the machine that read
      // it (LAW-009).
      expect(place.at.file).not.toContain(root);
      expect(place.at.file.startsWith('/')).toBe(false);
      if (place.quoted === null) continue;
      // Not a paraphrase and not lines stitched together: the run of text is in
      // the document as one piece, byte for byte.
      const source = await readFile(join(root, place.at.file), 'utf8');
      expect(source).toContain(place.quoted.says);
    }
  });

  it('names the Module that writes at a cited place, which is not the one the Finding routes to', async () => {
    await shelveLens('lens-a.json');
    await writeDownKnowledge('lens-a.json');

    const { routesTo } = await readQueues('corpus-a');
    const all = routesTo.flatMap((queue) => queue.findings);
    // Fixture A holds the case at full size, and holds it where it matters most:
    // one of its documents sits in one Module's folder and says in its own
    // frontmatter that it belongs to another. The Finding about exactly that
    // routes to the first name and cites a place written under the second.
    const elsewhere = all.find(
      (finding) => finding.moduleId !== null && finding.cites.writtenUnder !== finding.moduleId,
    );

    expect(elsewhere).toBeDefined();
    expect(elsewhere!.moduleId).toBe('beta');
    expect(elsewhere!.cites.writtenUnder).toBe('bravo');
    // The point of resolving it from the place: the address built out of it opens
    // the knowledge that is actually there. Built out of the Finding's own Module
    // it would be refused, correctly, because that Module writes nothing there.
    const opened = await server.inject({
      method: 'GET',
      url: `/corpus/corpus-a/modules/${elsewhere!.cites.writtenUnder}/knowledge?in=${encodeURIComponent(elsewhere!.cites.at.file)}&line=${elsewhere!.cites.at.line}`,
    });
    const refused = await server.inject({
      method: 'GET',
      url: `/corpus/corpus-a/modules/${elsewhere!.moduleId}/knowledge?in=${encodeURIComponent(elsewhere!.cites.at.file)}&line=${elsewhere!.cites.at.line}`,
    });

    expect(opened.statusCode).toBe(200);
    expect(refused.statusCode).toBe(404);
  });

  it('carries every further place one Finding concerns, each with its own text', async () => {
    await shelveLens('lens-a.json');
    await writeDownKnowledge('lens-a.json');

    const { routesTo } = await readQueues('corpus-a');
    const contradiction = routesTo
      .flatMap((queue) => queue.findings)
      .find((finding) => finding.alsoCites.length > 0);

    // A defect about two statements that disagree is about both of them, and each
    // is shown where it is written with the text that is there: evidence is not
    // summarised into the one place it fits (LAW-009).
    expect(contradiction).toBeDefined();
    expect(contradiction!.cites.quoted).not.toBeNull();
    expect(contradiction!.alsoCites[0]!.quoted).not.toBeNull();
    // The second statement of a contradiction is written under another Module as
    // a matter of course — that is what makes the two disagree.
    expect(contradiction!.alsoCites[0]!.writtenUnder).not.toEqual(contradiction!.moduleId);
  });

  it('reaches the first queue with a Finding belonging to no Module, citing a place nothing is written at', async () => {
    // Neither fixture holds one, and an Inbox that dropped it would render both
    // perfectly — while the Finding would appear nowhere in the product at all,
    // since no Module's page can show it either.
    await shelveAThirdShape();

    const { routesTo } = await readQueues('third-shape');
    const grid = await readGrid('third-shape');
    const unattached = routesTo[0]!.findings.find((finding) => finding.moduleId === null);

    expect(routesTo[0]!.owner).toBeNull();
    expect(unattached).toBeDefined();
    // Nothing is written at the place it cites, which is the whole of what it
    // says: a document nothing can be read from has no knowledge in it to quote.
    // The place is still where a reader goes, and it is not a fault here.
    expect(unattached!.cites.quoted).toBeNull();
    expect(unattached!.cites.writtenUnder).toBeNull();
    expect(unattached!.cites.at.file).toBe('not-readable.md');
    // The only Module in this Corpus is answered for, so without this queue the
    // Corpus's Findings figure and its Inbox would disagree by one.
    expect(routesTo.flatMap((queue) => queue.findings)).toHaveLength(grid.integrity.openFindings);
  });

  it('says nothing has been written down yet rather than that nothing was found', async () => {
    await shelveLens('lens-a.json');

    const { reading } = await readInbox('corpus-a');

    // No Seed, so there is nothing to have found anything in — and an empty queue
    // would tell a reader their Corpus is clean when nobody has read it.
    expect(reading.outcome).toBe('nothing-written-down-yet');
  });

  it('tells a Corpus it does not hold from a Corpus nothing was found in', async () => {
    await shelveLens('lens-b.json');
    await writeDownKnowledge('lens-b.json');

    const missing = await server.inject({ method: 'GET', url: '/corpus/nothing/inbox' });

    // One is a Corpus to go and put on the shelf; the other is a page with an
    // empty queue on it. Which sentence a reader meets is the surface's (LAW-010).
    expect(missing.statusCode).toBe(404);
    expect(missing.json()).toEqual({ id: 'nothing' });
  });
});
