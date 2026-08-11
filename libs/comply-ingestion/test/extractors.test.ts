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
    const items = extract(doc!, facet);
    expect(items).toHaveLength(1);
    expect(String(items[0]!.attributes.description)).toContain('first thing');
  });

  it('table extractor yields one item per row, mapping headers to attributes', async () => {
    const doc = await parseDocument(fixturePath('corpus-a/alpha/terms.md'));
    const facet: FacetSpec = {
      name: 'terms', factKind: 'Term', extractor: 'table', criteria: [],
      columns: { Word: 'name', Meaning: 'definition', 'Also called': 'aliases' },
    };
    const items = extract(doc!, facet);
    expect(items).toHaveLength(2);
    expect(items[0]!.attributes.name).toBe('Widget');
    expect(items[0]!.attributes.definition).toBe('A thing that is made.');
    expect(items[1]!.attributes.name).toBe('Sprocket');
    expect(items[1]!.line).toBeGreaterThan(items[0]!.line);
  });

  it('heading extractor yields one item per section and collects links as relations', async () => {
    const doc = await parseDocument(fixturePath('corpus-a/alpha/rules.md'));
    const facet: FacetSpec = {
      name: 'rules', factKind: 'Rule', extractor: 'heading', criteria: [], bodyAttribute: 'statement',
    };
    const items = extract(doc!, facet);
    expect(items).toHaveLength(2);
    expect(items[0]!.attributes.name).toBe('R-1 Widgets are made once');
    expect(items[0]!.relations.map((r) => r.targetRef))
      .toEqual(['r-2-a-sprocket-s-role-in-the-søcket']);
    expect(items[1]!.relations.map((r) => r.targetRef)).toEqual(['widget']);
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
    const items = extract(doc, facet);
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
    const items = extract(doc, facet);
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
    const items = extract(doc, facet);
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
    const items = extract(doc, facet);
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
    const items = extract(doc, facet);
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
    const items = extract(doc, facet);
    expect(items).toHaveLength(1);
    expect(items[0]!.attributes.name).toBe('A|B');
    expect(items[0]!.attributes.definition).toBe('Foo');
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
    const items = extract(doc, facet);
    expect(items).toHaveLength(1);
    expect(items[0]!.relations.map((r) => r.targetRef)).toEqual(['other-rule']);
  });
});
