import { describe, expect, it } from 'vitest';
import { fixturePath } from '@vertuo/comply-fixtures';
import { parseDocument } from '@vertuo/comply-ingestion';
import { extract } from '@vertuo/comply-ingestion';
import type { ParsedDocument } from '@vertuo/comply-ingestion';
import type { FacetSpec } from '@vertuo/comply-lens';

describe('extractors', () => {
  it('document extractor yields exactly one item carrying the whole body', async () => {
    const doc = await parseDocument(fixturePath('corpus-a/alpha/overview.md'));
    const facet: FacetSpec = {
      name: 'overview', factKind: 'Module', extractor: 'document', criteria: [], bodyAttribute: 'description',
    };
    const { items } = extract(doc!, facet);
    expect(items).toHaveLength(1);
    expect(String(items[0]!.attributes.description)).toContain('first thing');
  });

  it('table extractor yields one item per row, mapping headers to attributes', async () => {
    const doc = await parseDocument(fixturePath('corpus-a/alpha/terms.md'));
    const facet: FacetSpec = {
      name: 'terms', factKind: 'Term', extractor: 'table', criteria: [],
      columns: { Word: 'name', Meaning: 'definition', 'Also called': 'aliases' },
    };
    const { items } = extract(doc!, facet);
    expect(items[0]!.attributes.name).toBe('Widget');
    expect(items[0]!.attributes.definition).toBe('A thing that is made.');
    expect(items[1]!.attributes.name).toBe('Sprocket');
    expect(items[1]!.line).toBeGreaterThan(items[0]!.line);
  });

  it('table extractor reads every table when a Facet says nothing about which are its own', async () => {
    // The document holds a second table of words nobody uses any more, headed
    // differently and sharing only its first column. A Facet that has not said which
    // tables are its own gets all of them, exactly as it did before it could say.
    const doc = await parseDocument(fixturePath('corpus-a/alpha/terms.md'));
    const facet: FacetSpec = {
      name: 'terms', factKind: 'Term', extractor: 'table', criteria: [],
      columns: { Word: 'name', Meaning: 'definition', 'Also called': 'aliases' },
    };
    expect(extract(doc!, facet).items.map((i) => i.attributes.name))
      .toEqual(['Widget', 'Sprocket', 'Grommet']);
  });

  it('table extractor reads only the tables a Facet says are its own', async () => {
    // `Grommet` is a word the business retired, written down beside what it used to
    // mean and why it went. Read as a definition it is a Term with a name and nothing
    // else — one that fails a criterion it was never meant to be held to, in a queue
    // where nobody can act on it. Said aloud, the table is simply not this Facet's.
    const doc = await parseDocument(fixturePath('corpus-a/alpha/terms.md'));
    const facet: FacetSpec = {
      name: 'terms', factKind: 'Term', extractor: 'table', criteria: [],
      columns: { Word: 'name', Meaning: 'definition', 'Also called': 'aliases' },
      identifyingColumns: ['Word', 'Meaning'],
    };
    expect(extract(doc!, facet).items.map((i) => i.attributes.name)).toEqual(['Widget', 'Sprocket']);
  });

  it('table extractor asks only for the columns that identify a table, not for every one', () => {
    // A corpus spells the same column several ways, so what identifies its table is the
    // handful of headers that never move. Requiring the whole header row would refuse
    // every table the moment one of them was spelled differently.
    const doc: ParsedDocument = {
      file: 'inline://spelled-differently.md',
      data: {},
      body: [
        '',
        '| Word | Meaning | Also known as |',
        '| --- | --- | --- |',
        '| Widget | A thing that is made. | Gadget |',
      ].join('\n'),
      bodyStartLine: 1,
    };
    const facet: FacetSpec = {
      name: 'terms', factKind: 'Term', extractor: 'table', criteria: [],
      columns: { Word: 'name', Meaning: 'definition', 'Also called': 'aliases', 'Also known as': 'aliases' },
      identifyingColumns: ['Word', 'Meaning'],
    };
    const { items } = extract(doc, facet);
    expect(items).toHaveLength(1);
    expect(items[0]!.attributes.aliases).toBe('Gadget');
  });

  it('heading extractor yields one item per section and collects links as relations', async () => {
    const doc = await parseDocument(fixturePath('corpus-a/alpha/rules.md'));
    const facet: FacetSpec = {
      name: 'rules', factKind: 'Rule', extractor: 'heading', criteria: [], bodyAttribute: 'statement',
    };
    const { items } = extract(doc!, facet);
    // Three, because the document carries a section of terminology beside its two
    // rules and this Facet has not said which headings are its own.
    expect(items).toHaveLength(3);
    expect(items[0]!.attributes.name).toBe('R-1 Widgets are made once');
    expect(items[0]!.relations.map((r) => r.targetRef))
      .toEqual(['r-2-a-sprocket-s-role-in-the-søcket']);
    expect(items[1]!.relations.map((r) => r.targetRef)).toEqual(['widget']);
  });

  it('reads a fixture document both ways, by what its Facet said (ADR-0001)', async () => {
    // Both directions against a corpus that is not the DDD one, in one document: the
    // Facet that says which headings are its own reads two, and the Facet that says
    // nothing reads all three. A shape held only against the corpus this was built
    // for is a shape that has leaked into the reading.
    const doc = await parseDocument(fixturePath('corpus-a/alpha/rules.md'));
    const base = {
      name: 'rules', factKind: 'Rule' as const, extractor: 'heading' as const,
      criteria: [], bodyAttribute: 'statement',
    };

    const declared = extract(doc!, { ...base, itemPattern: '^R-[0-9]+' });
    expect(declared.items.map((i) => i.attributes.name))
      .toEqual(['R-1 Widgets are made once', "R-2 A Sprocket's Rôle in the Søcket"]);
    expect(declared.setAside).toBe(1);

    const silent = extract(doc!, base);
    expect(silent.items).toHaveLength(3);
    expect(silent.setAside).toBe(0);
  });

  it('heading extractor gives a heading the anchor its own source would give it', () => {
    // A reader writes the link by copying what the published page puts in the address
    // bar. An accented letter is folded to its base there, an apostrophe becomes a
    // separator, and a letter that decomposes into nothing is kept as it stands. Compute
    // any of the three differently and every link to such a heading is reported broken —
    // which is the tool inventing a defect the corpus does not have.
    const doc: ParsedDocument = {
      file: 'inline://folded.md',
      data: {},
      body: ['', "## R-2 A Sprocket's Rôle in the Søcket", '', 'A Sprocket turns.'].join('\n'),
      bodyStartLine: 1,
    };
    const facet: FacetSpec = {
      name: 'rules', factKind: 'Rule', extractor: 'heading', criteria: [], bodyAttribute: 'statement',
    };
    const { items } = extract(doc, facet);
    expect(items[0]!.attributes.slug).toBe('r-2-a-sprocket-s-role-in-the-søcket');
  });

  it('heading extractor reads through markup a heading carries but a reader never sees', () => {
    // A heading is often annotated in place, and the published page addresses it by the
    // words it shows, not by the annotation's own text. Fourteen references in the DDD
    // Corpus are written that way and every one of them works where it is read.
    const doc: ParsedDocument = {
      file: 'inline://annotated.md',
      data: {},
      body: ['', '## R-3 Widgets Ship <Note kind="later" say="Not yet" />', '', 'Later.'].join('\n'),
      bodyStartLine: 1,
    };
    const facet: FacetSpec = {
      name: 'rules', factKind: 'Rule', extractor: 'heading', criteria: [], bodyAttribute: 'statement',
    };
    const { items } = extract(doc, facet);
    expect(items[0]!.attributes.slug).toBe('r-3-widgets-ship');
  });

  it('table extractor gives a row an anchor, so a row can be referred to', () => {
    const doc: ParsedDocument = {
      file: 'inline://anchored-row.md',
      data: {},
      body: [
        '',
        '| Word | Meaning |',
        '| --- | --- |',
        "| Sprocket's Rôle | What a Sprocket is for. |",
      ].join('\n'),
      bodyStartLine: 1,
    };
    const facet: FacetSpec = {
      name: 'terms', factKind: 'Term', extractor: 'table', criteria: [],
      columns: { Word: 'name', Meaning: 'definition' },
    };
    const { items } = extract(doc, facet);
    expect(items).toHaveLength(1);
    expect(items[0]!.attributes.slug).toBe('sprocket-s-role');
  });

  it('table extractor leaves a row nobody could name without an anchor', () => {
    // An anchor is derived from what the row is called. A row whose Facet maps no
    // column to a name has nothing to derive one from, and inventing one would put a
    // target in reach that no author could have written down.
    const doc: ParsedDocument = {
      file: 'inline://unnamed-row.md',
      data: {},
      body: ['', '| Word | Meaning |', '| --- | --- |', '| Widget | A thing. |'].join('\n'),
      bodyStartLine: 1,
    };
    const facet: FacetSpec = {
      name: 'terms', factKind: 'Term', extractor: 'table', criteria: [],
      columns: { Meaning: 'definition' },
    };
    const { items } = extract(doc, facet);
    expect(items).toHaveLength(1);
    expect(items[0]!.attributes.slug).toBeUndefined();
  });

  it('table extractor skips GFM alignment separator rows (:---, ---:, :---:)', () => {
    const doc: ParsedDocument = {
      file: 'inline://alignment.md',
      data: {},
      body: [
        '',
        '| Word | Meaning | Extra |',
        '| :--- | ---: | :---: |',
        '| Widget | A thing that is made. | Foo |',
      ].join('\n'),
      bodyStartLine: 1,
    };
    const facet: FacetSpec = {
      name: 'terms', factKind: 'Term', extractor: 'table', criteria: [],
      columns: { Word: 'name', Meaning: 'definition' },
    };
    const { items } = extract(doc, facet);
    expect(items).toHaveLength(1);
    expect(items[0]!.attributes.name).toBe('Widget');
    expect(items[0]!.attributes.definition).toBe('A thing that is made.');
  });

  it('table extractor honours the `\\|` escape so a later column does not shift', () => {
    const doc: ParsedDocument = {
      file: 'inline://escaped-pipe.md',
      data: {},
      body: [
        '',
        '| Word | Meaning |',
        '| --- | --- |',
        '| A\\|B | Foo |',
      ].join('\n'),
      bodyStartLine: 1,
    };
    const facet: FacetSpec = {
      name: 'terms', factKind: 'Term', extractor: 'table', criteria: [],
      columns: { Word: 'name', Meaning: 'definition' },
    };
    const { items } = extract(doc, facet);
    expect(items).toHaveLength(1);
    expect(items[0]!.attributes.name).toBe('A|B');
    expect(items[0]!.attributes.definition).toBe('Foo');
  });

  it('heading extractor reads only the headings a Facet says are its own', () => {
    // A page carries its own furniture beside the knowledge: a section of
    // terminology, a note about who last looked the page over. Read as knowledge,
    // each one is a rule with a name and a paragraph — padding a denominator
    // LAW-006 requires be honest, and giving nobody anything to act on.
    const doc: ParsedDocument = {
      file: 'inline://furniture.md',
      data: {},
      body: [
        '',
        '## R-1 Widgets are made once',
        '',
        'Once.',
        '',
        '## Terminology',
        '',
        'A Widget is a thing that is made.',
      ].join('\n'),
      bodyStartLine: 1,
    };
    const facet: FacetSpec = {
      name: 'rules', factKind: 'Rule', extractor: 'heading', criteria: [], bodyAttribute: 'statement',
      itemPattern: '^R-[0-9]+',
    };
    expect(extract(doc, facet).items.map((i) => i.attributes.name))
      .toEqual(['R-1 Widgets are made once']);
  });

  it('heading extractor reads every heading when a Facet says nothing about which are its own', () => {
    const doc: ParsedDocument = {
      file: 'inline://furniture.md',
      data: {},
      body: ['', '## R-1 Widgets are made once', '', 'Once.', '', '## Terminology', '', 'A Widget.'].join('\n'),
      bodyStartLine: 1,
    };
    const facet: FacetSpec = {
      name: 'rules', factKind: 'Rule', extractor: 'heading', criteria: [], bodyAttribute: 'statement',
    };
    expect(extract(doc, facet).items.map((i) => i.attributes.name))
      .toEqual(['R-1 Widgets are made once', 'Terminology']);
  });

  it('heading extractor matches a heading as the document writes it, markup and all', () => {
    // Somebody writing a Lens is looking at the source, so what they describe is
    // what the source says. An annotation carried in place is part of that, and a
    // heading annotated as provisional is not thereby something else.
    const doc: ParsedDocument = {
      file: 'inline://annotated.md',
      data: {},
      body: ['', '## R-4 Widgets Ship <Note kind="later" />', '', 'Later.'].join('\n'),
      bodyStartLine: 1,
    };
    const facet: FacetSpec = {
      name: 'rules', factKind: 'Rule', extractor: 'heading', criteria: [], bodyAttribute: 'statement',
      itemPattern: '^R-[0-9]+',
    };
    expect(extract(doc, facet).items).toHaveLength(1);
  });

  it('says how many headings it set aside, so nothing is left out in silence (LAW-006)', () => {
    const doc: ParsedDocument = {
      file: 'inline://furniture.md',
      data: {},
      body: [
        '', '## R-1 Once', '', 'Once.',
        '', '## Terminology', '', 'A Widget.',
        '', '## Where This Came From', '', 'Somebody said so.',
      ].join('\n'),
      bodyStartLine: 1,
    };
    const facet: FacetSpec = {
      name: 'rules', factKind: 'Rule', extractor: 'heading', criteria: [], bodyAttribute: 'statement',
      itemPattern: '^R-[0-9]+',
    };
    const read = extract(doc, facet);
    expect(read.items).toHaveLength(1);
    expect(read.setAside).toBe(2);
  });

  it('says how many rows it set aside, so nothing is left out in silence (LAW-006)', () => {
    const doc: ParsedDocument = {
      file: 'inline://two-tables.md',
      data: {},
      body: [
        '',
        '| Word | Meaning |',
        '| --- | --- |',
        '| Widget | A thing that is made. |',
        '',
        '| Word | What it used to mean |',
        '| --- | --- |',
        '| Grommet | A thing nobody makes any more. |',
        '| Cog | A thing that was replaced. |',
      ].join('\n'),
      bodyStartLine: 1,
    };
    const facet: FacetSpec = {
      name: 'terms', factKind: 'Term', extractor: 'table', criteria: [],
      columns: { Word: 'name', Meaning: 'definition' },
      identifyingColumns: ['Word', 'Meaning'],
    };
    const read = extract(doc, facet);
    expect(read.items).toHaveLength(1);
    expect(read.setAside).toBe(2);
  });

  it('sets nothing aside when a Facet says nothing about what is its own', () => {
    const doc: ParsedDocument = {
      file: 'inline://plain.md',
      data: {},
      body: ['', '| Word | Meaning |', '| --- | --- |', '| Widget | A thing. |'].join('\n'),
      bodyStartLine: 1,
    };
    const facet: FacetSpec = {
      name: 'terms', factKind: 'Term', extractor: 'table', criteria: [],
      columns: { Word: 'name', Meaning: 'definition' },
    };
    expect(extract(doc, facet).setAside).toBe(0);
  });

  it('does not count as set aside a row it could never have read anyway', () => {
    // Set aside means declined, not unreadable. A row in a table this Facet says is
    // none of its own, whose columns this Facet maps nothing from, was never going
    // to be one of its items — counting it would inflate the total the figure above
    // is stated against, which is the arithmetic LAW-006 exists to protect.
    const doc: ParsedDocument = {
      file: 'inline://nothing-mapped.md',
      data: {},
      body: [
        '',
        '| Word | Meaning |',
        '| --- | --- |',
        '| Widget | A thing. |',
        '',
        '| Shape | Colour |',
        '| --- | --- |',
        '| Round | Red |',
      ].join('\n'),
      bodyStartLine: 1,
    };
    const facet: FacetSpec = {
      name: 'terms', factKind: 'Term', extractor: 'table', criteria: [],
      columns: { Word: 'name', Meaning: 'definition' },
      identifyingColumns: ['Word', 'Meaning'],
    };
    const read = extract(doc, facet);
    expect(read.items).toHaveLength(1);
    expect(read.setAside).toBe(0);
  });

  it('reads the same number of things however much its Facet asks of them (ADR-0016)', () => {
    // Item-hood is decided by what the document holds and what the Facet says is its
    // own — never by what counts as enough. Were it otherwise, tightening a criterion
    // would move a Fact count, and two readings of one Corpus could not be compared.
    const doc: ParsedDocument = {
      file: 'inline://criteria.md',
      data: {},
      body: ['', '## R-1 Once', '', 'Once.', '', '## R-2 Twice', '', 'Twice.'].join('\n'),
      bodyStartLine: 1,
    };
    const lenient: FacetSpec = {
      name: 'rules', factKind: 'Rule', extractor: 'heading', criteria: [], bodyAttribute: 'statement',
      itemPattern: '^R-[0-9]+',
    };
    const strict: FacetSpec = {
      ...lenient,
      criteria: [
        { type: 'requiredAttributes', attributes: ['name', 'statement', 'somethingAbsent'] },
        { type: 'minSources', count: 9 },
      ],
    };
    expect(extract(doc, strict)).toEqual(extract(doc, lenient));
  });

  it('heading extractor collects reference-style links as relations', () => {
    const doc: ParsedDocument = {
      file: 'inline://reference-link.md',
      data: {},
      body: [
        '',
        '## Some Rule',
        '',
        'See [Other Rule][other-rule] for details.',
      ].join('\n'),
      bodyStartLine: 1,
    };
    const facet: FacetSpec = {
      name: 'rules', factKind: 'Rule', extractor: 'heading', criteria: [], bodyAttribute: 'statement',
    };
    const { items } = extract(doc, facet);
    expect(items).toHaveLength(1);
    expect(items[0]!.relations.map((r) => r.targetRef)).toEqual(['other-rule']);
  });
});
