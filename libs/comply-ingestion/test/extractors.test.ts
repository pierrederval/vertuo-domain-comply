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
    expect(items[0]!.relations.map((r) => r.targetRef)).toEqual(['r-2-sprockets-turn']);
    expect(items[1]!.relations).toEqual([]);
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
