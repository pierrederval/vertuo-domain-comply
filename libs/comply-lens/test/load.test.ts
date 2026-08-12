import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadLens } from '@vertuo/comply-lens';

async function writeLens(body: unknown): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'lens-'));
  const path = join(dir, 'lens.json');
  await writeFile(path, JSON.stringify(body), 'utf8');
  return path;
}

const valid = {
  id: 'p',
  adapter: { kind: 'markdown-frontmatter', root: './corpus', moduleIdKey: 'm', facetKey: 'f', statusKey: 's' },
  facets: [
    { name: 'anything', factKind: 'Term', extractor: 'table', criteria: [], definesTerms: true, columns: { A: 'name', B: 'definition' } },
  ],
  maturity: { levels: ['a', 'b'], approvedAtOrAbove: 'b' },
  statusMappings: [],
};

describe('loadLens', () => {
  it('loads a valid lens and resolves the adapter root against the lens file', async () => {
    const path = await writeLens(valid);
    const lens = await loadLens(path);
    expect(lens.id).toBe('p');
    expect(lens.adapter.root.endsWith('corpus')).toBe(true);
  });

  it('rejects a facet naming a Fact Kind outside the closed set (ADR-0005)', async () => {
    const path = await writeLens({
      ...valid,
      facets: [{ name: 'x', factKind: 'Invoice', extractor: 'table' }],
    });
    await expect(loadLens(path)).rejects.toThrow(/Invoice/);
  });

  it('rejects an approval threshold that is not on the ladder', async () => {
    const path = await writeLens({
      ...valid,
      maturity: { levels: ['a', 'b'], approvedAtOrAbove: 'zzz' },
    });
    await expect(loadLens(path)).rejects.toThrow(/zzz/);
  });

  it('rejects the defining facet whose table columns map to neither name nor definition', async () => {
    const path = await writeLens({
      ...valid,
      facets: [
        { name: 'glossary', factKind: 'Term', extractor: 'table', criteria: [], definesTerms: true, columns: { Word: 'term', Meaning: 'meaning' } },
      ],
    });
    await expect(loadLens(path)).rejects.toThrow(/glossary/);
  });

  it('rejects a non-table defining facet with no bodyAttribute', async () => {
    const path = await writeLens({
      ...valid,
      facets: [{ name: 'definitions', factKind: 'Term', extractor: 'heading', definesTerms: true }],
    });
    await expect(loadLens(path)).rejects.toThrow(/definitions/);
  });

  it('rejects a facet that names the columns identifying its table but reads no tables', async () => {
    // Silently ignored, the declaration reads as though it were in force, and a reader
    // is looking at a count that includes everything it was written to leave out.
    const path = await writeLens({
      ...valid,
      facets: [{
        name: 'x', factKind: 'Rule', extractor: 'heading', bodyAttribute: 'statement',
        identifyingColumns: ['A'],
      }],
    });
    await expect(loadLens(path)).rejects.toThrow(/identifyingColumns/);
  });

  it('rejects a facet that describes which headings are its own but reads no headings', async () => {
    // Refused for the same reason as the rule above: ignored, the declaration
    // reads as though it were in force.
    const path = await writeLens({
      ...valid,
      facets: [{
        name: 'x', factKind: 'Rule', extractor: 'table', columns: { A: 'name' },
        itemPattern: '^R-',
      }],
    });
    await expect(loadLens(path)).rejects.toThrow(/itemPattern/);
  });

  it('rejects a description of its headings that this reading cannot follow', async () => {
    const path = await writeLens({
      ...valid,
      facets: [{
        name: 'x', factKind: 'Rule', extractor: 'heading', bodyAttribute: 'statement',
        itemPattern: '^R-[0-9',
      }],
    });
    await expect(loadLens(path)).rejects.toThrow(/x/);
  });

  it('rejects a facet that names the parts of its Facts but reads rows of a table', async () => {
    // Refused for the same reason as the two rules above: a row has no subheadings
    // under it, so the declaration would be ignored, and whoever wrote it is looking at
    // Facts they believe carry parts that were never read.
    const path = await writeLens({
      ...valid,
      facets: [{
        name: 'x', factKind: 'Rule', extractor: 'table', columns: { A: 'name' },
        parts: { Statement: 'statement' },
      }],
    });
    await expect(loadLens(path)).rejects.toThrow(/parts/);
  });

  it('rejects a facet that names no parts at all, which is not the same as naming none', async () => {
    // The dangerous one. It reads as "no parts named" and is not: the Facet reads by
    // parts, with no part to read, so every Fact under it keeps only what stands before
    // its first subheading — nothing at all, for a source that begins at one.
    const path = await writeLens({
      ...valid,
      facets: [{
        name: 'x', factKind: 'Rule', extractor: 'heading', bodyAttribute: 'statement',
        parts: {},
      }],
    });
    await expect(loadLens(path)).rejects.toThrow(/names no parts at all/);
  });

  it('accepts several spellings of one part mapping onto one attribute', async () => {
    // A corpus spells the same part several ways, and a Lens that could not say so
    // would force a corpus to be tidied before it could be read.
    const path = await writeLens({
      ...valid,
      facets: [{
        name: 'x', factKind: 'Rule', extractor: 'heading', bodyAttribute: 'statement',
        parts: { 'Why it exists': 'rationale', Rationale: 'rationale' },
      }],
    });
    await expect(loadLens(path)).resolves.toBeDefined();
  });

  it('rejects a Term facet using the document extractor, which has no name to key a Term on', async () => {
    const path = await writeLens({
      ...valid,
      facets: [{ name: 'glossary-notes', factKind: 'Term', extractor: 'document', criteria: [], definesTerms: true, bodyAttribute: 'definition' }],
    });
    await expect(loadLens(path)).rejects.toThrow(/glossary-notes/);
    await expect(loadLens(path)).rejects.toThrow(/document/);
  });

  it('rejects a lens whose facets of Terms name none of themselves as the dictionary', async () => {
    // The whole of ADR-0021 in one case: two facets of Terms and nothing saying which
    // of them settles what a word means, so whichever happened to be written first
    // silently became the dictionary.
    const path = await writeLens({
      ...valid,
      facets: [
        { name: 'glossary', factKind: 'Term', extractor: 'table', criteria: [], columns: { Word: 'name', Meaning: 'definition' } },
        { name: 'aggregates', factKind: 'Term', extractor: 'heading', criteria: [] },
      ],
    });
    await expect(loadLens(path)).rejects.toThrow(/definesTerms/);
    await expect(loadLens(path)).rejects.toThrow(/glossary/);
    await expect(loadLens(path)).rejects.toThrow(/aggregates/);
  });

  it('rejects two facets both claiming to define the language', async () => {
    const path = await writeLens({
      ...valid,
      facets: [
        { name: 'glossary', factKind: 'Term', extractor: 'table', criteria: [], definesTerms: true, columns: { Word: 'name', Meaning: 'definition' } },
        { name: 'aggregates', factKind: 'Term', extractor: 'heading', criteria: [], definesTerms: true, bodyAttribute: 'definition' },
      ],
    });
    await expect(loadLens(path)).rejects.toThrow(/glossary/);
    await expect(loadLens(path)).rejects.toThrow(/aggregates/);
  });

  it('rejects a facet claiming to define the language whose facts are not words', async () => {
    // Ignored, the declaration reads as though it were in force, and a lens naming its
    // dictionary would have none.
    const path = await writeLens({
      ...valid,
      facets: [
        { name: 'x', factKind: 'Rule', extractor: 'heading', bodyAttribute: 'statement', definesTerms: true },
      ],
    });
    await expect(loadLens(path)).rejects.toThrow(/definesTerms/);
    await expect(loadLens(path)).rejects.toThrow(/Rule/);
  });

  it('accepts a second facet of Terms that defines nothing and names no body attribute', async () => {
    // The shape this exists for: a list of which thing owns the others carries the same
    // words as the dictionary and settles none of them. It is asked for no definition
    // because it holds none, and asking would force a lens to write down that its rows
    // mean something they do not.
    const path = await writeLens({
      ...valid,
      facets: [
        { name: 'aggregates', factKind: 'Term', extractor: 'heading', criteria: [] },
        { name: 'glossary', factKind: 'Term', extractor: 'table', criteria: [], definesTerms: true, columns: { Word: 'name', Meaning: 'definition' } },
      ],
    });
    await expect(loadLens(path)).resolves.toBeDefined();
  });

  it('still refuses the document extractor to a facet of Terms that defines nothing', async () => {
    // What makes a Term a Term is having a word; what makes it a dictionary entry is
    // having a meaning. Only the second is the defining facet's alone.
    const path = await writeLens({
      ...valid,
      facets: [
        { name: 'aggregates', factKind: 'Term', extractor: 'document', criteria: [], bodyAttribute: 'owns' },
        { name: 'glossary', factKind: 'Term', extractor: 'table', criteria: [], definesTerms: true, columns: { Word: 'name', Meaning: 'definition' } },
      ],
    });
    await expect(loadLens(path)).rejects.toThrow(/aggregates/);
  });

  it('accepts a lens with no facet of Terms at all, which has no language to define', async () => {
    const path = await writeLens({
      ...valid,
      facets: [{ name: 'x', factKind: 'Rule', extractor: 'heading', bodyAttribute: 'statement' }],
    });
    await expect(loadLens(path)).resolves.toBeDefined();
  });
});

describe('a fact saying where it stands and where it came from (ADR-0022)', () => {
  it('accepts a lens whose source writes no status on a document at all', async () => {
    // The whole point of the key being optional: a corpus that states its status on
    // each fact has nothing to put in a document's frontmatter, and requiring a key
    // there would make it declare one it does not have.
    const path = await writeLens({
      ...valid,
      adapter: { kind: 'markdown-frontmatter', root: './corpus', moduleIdKey: 'm', facetKey: 'f' },
      facets: [{
        name: 'x', factKind: 'Rule', extractor: 'heading', bodyAttribute: 'statement',
        parts: { Statement: 'statement', 'Where it stands': 'standing' },
        statusAttribute: 'standing',
      }],
    });
    const lens = await loadLens(path);
    expect(lens.adapter.statusKey).toBeUndefined();
  });

  it('accepts a facet naming the attribute it writes its status in and the one it writes its sources in', async () => {
    const path = await writeLens({
      ...valid,
      facets: [{
        name: 'x', factKind: 'Rule', extractor: 'heading', bodyAttribute: 'statement',
        parts: { 'Where it stands': 'standing', 'Checked against': 'checkedAgainst' },
        statusAttribute: 'standing',
        sourcesAttribute: 'checkedAgainst',
      }],
    });
    await expect(loadLens(path)).resolves.toBeDefined();
  });

  it('accepts a facet reading rows that names a column of its own as the status', async () => {
    // How the attribute got onto the fact is the extractor's business, so a corpus
    // keeping its knowledge in tables says this the same way as one keeping it in
    // sections.
    const path = await writeLens({
      ...valid,
      facets: [{
        name: 'x', factKind: 'Rule', extractor: 'table',
        columns: { Name: 'name', Standing: 'standing', Against: 'checkedAgainst' },
        statusAttribute: 'standing',
        sourcesAttribute: 'checkedAgainst',
      }],
    });
    await expect(loadLens(path)).resolves.toBeDefined();
  });

  it('rejects a facet whose status attribute is one nothing it reads could ever fill', async () => {
    // The hazard this whole family of refusals exists for. Nothing writes to
    // "standing", so every fact falls back to its document's status and the reading
    // is exactly what it was — while the lens says, in writing, that it is not.
    const path = await writeLens({
      ...valid,
      facets: [{
        name: 'x', factKind: 'Rule', extractor: 'heading', bodyAttribute: 'statement',
        parts: { Statement: 'statement' },
        statusAttribute: 'standing',
      }],
    });
    await expect(loadLens(path)).rejects.toThrow(/statusAttribute/);
    await expect(loadLens(path)).rejects.toThrow(/standing/);
  });

  it('rejects a facet whose sources attribute is one nothing it reads could ever fill', async () => {
    const path = await writeLens({
      ...valid,
      facets: [{
        name: 'x', factKind: 'Rule', extractor: 'table', columns: { Name: 'name' },
        sourcesAttribute: 'checkedAgainst',
      }],
    });
    await expect(loadLens(path)).rejects.toThrow(/sourcesAttribute/);
    await expect(loadLens(path)).rejects.toThrow(/checkedAgainst/);
  });

  it('accepts a status attribute that is the one the body lands in', async () => {
    // A facet naming no parts reads the whole body into one attribute, and a corpus
    // whose sections hold nothing but a status is entitled to say so.
    const path = await writeLens({
      ...valid,
      facets: [{
        name: 'x', factKind: 'Rule', extractor: 'heading', bodyAttribute: 'standing',
        statusAttribute: 'standing',
      }],
    });
    await expect(loadLens(path)).resolves.toBeDefined();
  });
});

describe('a fact saying who may make it, and where that is settled (ADR-0037)', () => {
  const crew = { name: 'crew', factKind: 'Term', extractor: 'heading', bodyAttribute: 'definition' };

  it('accepts a facet saying which attribute holds who may make it and which facet settles that', async () => {
    const path = await writeLens({
      ...valid,
      facets: [...valid.facets, crew, {
        name: 'orders', factKind: 'Message', extractor: 'table',
        columns: { Order: 'name', 'Who may place it': 'placedBy' },
        actor: { attribute: 'placedBy', settledBy: 'crew' },
      }],
    });
    const lens = await loadLens(path);
    expect(lens.facets[2]!.actor).toEqual({ attribute: 'placedBy', settledBy: 'crew' });
  });

  it('accepts a facet saying how this corpus writes more than one of them in one place', async () => {
    const path = await writeLens({
      ...valid,
      facets: [...valid.facets, crew, {
        name: 'orders', factKind: 'Message', extractor: 'heading',
        parts: { 'Who may place it': 'placedBy' },
        actor: { attribute: 'placedBy', settledBy: 'crew', separatedBy: [' or ', ','] },
      }],
    });
    await expect(loadLens(path)).resolves.toBeDefined();
  });

  it('rejects a facet whose attribute for who may make it is one nothing it reads could fill', async () => {
    // The same hazard as a status attribute nothing writes to: ignored, every fact
    // names nobody, nothing is ever reported, and the lens says in writing that it is.
    const path = await writeLens({
      ...valid,
      facets: [...valid.facets, crew, {
        name: 'orders', factKind: 'Message', extractor: 'table', columns: { Order: 'name' },
        actor: { attribute: 'placedBy', settledBy: 'crew' },
      }],
    });
    await expect(loadLens(path)).rejects.toThrow(/placedBy/);
    await expect(loadLens(path)).rejects.toThrow(/orders/);
  });

  it('rejects a facet settling who may make it against a facet this lens does not declare', async () => {
    // Nothing would ever settle, so every fact naming anybody at all is reported —
    // a queue of every request in the corpus, produced by one misspelled word here.
    const path = await writeLens({
      ...valid,
      facets: [...valid.facets, {
        name: 'orders', factKind: 'Message', extractor: 'table',
        columns: { Order: 'name', Who: 'placedBy' },
        actor: { attribute: 'placedBy', settledBy: 'crewe' },
      }],
    });
    await expect(loadLens(path)).rejects.toThrow(/crewe/);
    await expect(loadLens(path)).rejects.toThrow(/orders/);
  });

  it('rejects a facet settled by one whose facts have no name to be settled by', async () => {
    // A facet reading whole documents gives its facts no name, so nothing under it
    // could ever match what a request says, and the refusal above arrives one step
    // later as every request being reported.
    const path = await writeLens({
      ...valid,
      facets: [
        ...valid.facets,
        { name: 'notes', factKind: 'Rule', extractor: 'document', bodyAttribute: 'statement' },
        {
          name: 'orders', factKind: 'Message', extractor: 'table',
          columns: { Order: 'name', Who: 'placedBy' },
          actor: { attribute: 'placedBy', settledBy: 'notes' },
        },
      ],
    });
    await expect(loadLens(path)).rejects.toThrow(/notes/);
    await expect(loadLens(path)).rejects.toThrow(/orders/);
  });

  it('rejects a facet naming who may make its facts when its own facts have no name', async () => {
    // What a finding says is *this request names somebody nobody has written down*, and
    // a facet reading whole documents has no request to name in that sentence.
    const path = await writeLens({
      ...valid,
      facets: [...valid.facets, crew, {
        name: 'orders', factKind: 'Message', extractor: 'document', bodyAttribute: 'placedBy',
        actor: { attribute: 'placedBy', settledBy: 'crew' },
      }],
    });
    await expect(loadLens(path)).rejects.toThrow(/orders/);
  });

  it('accepts a lens where no facet says anything about who may make it', async () => {
    // Every corpus read so far, and the whole reason this is absent rather than false.
    await expect(loadLens(await writeLens(valid))).resolves.toBeDefined();
  });
});

/**
 * The sentence a refusal is said in — spec §8, and the error a person setting a
 * Corpus up is likeliest to meet.
 *
 * Asserted here rather than at either surface, so the runner and the Studio cannot
 * come to say different things about one file (ADR-0034).
 */
describe('what a refused Lens says to the person holding it', () => {
  async function why(body: unknown, fileName = 'the-shelved-one.json'): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), 'lens-'));
    const path = join(dir, fileName);
    await writeFile(path, typeof body === 'string' ? body : JSON.stringify(body), 'utf8');
    try {
      await loadLens(path);
    } catch (refused) {
      return (refused as Error).message;
    }
    throw new Error('the Lens loaded, so there is no refusal to read');
  }

  it('says nothing about this Corpus can be read, and names the file to put right', async () => {
    const said = await why({ ...valid, maturity: { levels: ['blank', 'agreed'], approvedAtOrAbove: 'signed-off' } });

    expect(said).toContain('Nothing about the Corpus described in the-shelved-one.json can be read yet');
    expect(said).toContain('Put that right in the-shelved-one.json');
  });

  it('names the file by the name it has, never by where the machine keeps it', async () => {
    // The old wrapper carried the absolute path, which differs on every checkout and
    // on CI, and names a directory the reader is already looking at.
    const said = await why({ ...valid, maturity: { levels: ['blank'], approvedAtOrAbove: 'nope' } });

    expect(said).not.toContain(tmpdir());
    expect(said).not.toMatch(/[/\\]/);
  });

  it('says what is wrong in terms of the Corpus and its ladder', async () => {
    const said = await why({
      ...valid,
      maturity: { levels: ['blank', 'guessed', 'agreed'], approvedAtOrAbove: 'signed-off' },
    });

    expect(said).toContain('"signed-off"');
    expect(said).toContain('blank, guessed, agreed');
  });

  it('says none of it in terms of what the reading does', async () => {
    // AC-3, and the reason the guard cannot be the whole of it: these words never
    // reach a component, so nothing but this test stands between them and a reader.
    for (const body of [
      { ...valid, maturity: { levels: ['blank'], approvedAtOrAbove: 'nope' } },
      { ...valid, facets: [{ name: 'x', factKind: 'Invoice', extractor: 'table' }] },
      { ...valid, facets: [{ name: 'x', factKind: 'Rule', extractor: 'heading', parts: {} }] },
      { ...valid, id: '' },
      { ...valid, maturity: undefined },
      'not a set of criteria at all',
    ]) {
      const said = await why(body);
      for (const engineering of [
        'invalid', 'valid', 'parse', 'schema', 'expected', 'received', 'undefined', 'null',
      ]) {
        expect(said.toLowerCase(), `said of ${JSON.stringify(body).slice(0, 60)}`).not.toContain(
          engineering,
        );
      }
    }
  });

  it('sends a reader looking at the name, where there is no file of that name at all', async () => {
    // Nothing is wrong inside a file here, so the sentence above would send somebody
    // to open one that does not exist. This is also the one place the path is said as
    // it was given: a name mistyped by one directory cannot be checked against a name
    // with the directory taken off.
    const dir = await mkdtemp(join(tmpdir(), 'lens-'));
    const missing = join(dir, 'never-was-here.json');

    await expect(loadLens(missing)).rejects.toThrow(
      `There is no file at ${missing} to read a Corpus's criteria from. Check the name, or put the file there.`,
    );
  });

  it('says a file that is not written as criteria at all cannot be read, and where', async () => {
    const said = await why('{ this is not it');

    expect(said).toContain('Nothing about the Corpus described in the-shelved-one.json can be read yet');
    expect(said).toContain('not written in a form this product can read');
  });

  it('says what a Corpus that says nothing about where it stands is missing', async () => {
    const said = await why({ ...valid, maturity: undefined });

    expect(said).toContain('maturity');
    expect(said).toContain('says nothing');
  });

  it('says which of them this product knows, where a word is one it does not', async () => {
    const said = await why({ ...valid, facets: [{ name: 'x', factKind: 'Invoice', extractor: 'table' }] });

    expect(said).toContain('"Invoice"');
    expect(said).toContain('Module');
  });

  it('says every reason at once, so a second load is not the only way to find the next', async () => {
    const said = await why({
      ...valid,
      maturity: { levels: ['blank'], approvedAtOrAbove: 'nope' },
      facets: [{ name: 'x', factKind: 'Rule', extractor: 'heading', parts: {} }],
    });

    expect(said).toContain('"nope"');
    expect(said).toContain('names no parts at all');
  });
});
