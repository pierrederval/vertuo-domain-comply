import { describe, expect, it } from 'vitest';
import type { Fact } from '@vertuo/comply-core';
import { buildCorpus } from '@vertuo/comply-core';
import { fixturePath } from '@vertuo/comply-fixtures';
import { loadCorpus } from '@vertuo/comply-ingestion';
import { loadLens } from '@vertuo/comply-lens';
import { checkBrokenReference } from '@vertuo/comply-integrity';

function fact(partial: {
  id: string;
  kind: Fact['kind'];
  moduleId: string | null;
  relations?: Fact['relations'];
  file: string;
  line: number;
}): Fact {
  return {
    id: partial.id,
    kind: partial.kind,
    moduleId: partial.moduleId,
    facet: 'terms',
    containerId: '.',
    attributes: {},
    relations: partial.relations ?? [],
    maturityLevel: null,
    sources: [],
    origin: { file: partial.file, line: partial.line },
  };
}

describe('broken reference check', () => {
  it('reports a reference whose target exists nowhere in the corpus', async () => {
    const lens = await loadLens(fixturePath('lens-a.json'));
    const { corpus } = await loadCorpus(lens);
    const findings = checkBrokenReference(corpus);

    expect(findings).toHaveLength(1);
    expect(findings[0]!.code).toBe('broken-reference');
    expect(findings[0]!.message).toContain('r-9-missing');
    expect(findings[0]!.origin.file).toContain('beta/terms.md');
  });

  it('accepts a reference resolving to another fact by slug', async () => {
    const lens = await loadLens(fixturePath('lens-a.json'));
    const { corpus } = await loadCorpus(lens);
    const resolved = corpus.facts
      .flatMap((f) => f.relations)
      .filter((r) => r.targetRef === 'r-2-a-sprocket-s-role-in-the-søcket');
    expect(resolved).toHaveLength(1);
    expect(checkBrokenReference(corpus).map((f) => f.message).join())
      .not.toContain('r-2-a-sprocket-s-role-in-the-søcket');
  });

  it('resolves a reference to a heading carrying an accent and an apostrophe', async () => {
    // Written the way the published page addresses that heading. Reported broken, the
    // author has nothing to fix: the link already works where a reader clicks it.
    const lens = await loadLens(fixturePath('lens-a.json'));
    const { corpus } = await loadCorpus(lens);

    expect(checkBrokenReference(corpus).map((f) => f.message).join())
      .not.toContain('role');
  });

  it('resolves a reference to a fact written down as a row of a table', async () => {
    const lens = await loadLens(fixturePath('lens-a.json'));
    const { corpus } = await loadCorpus(lens);
    const resolved = corpus.facts.flatMap((f) => f.relations).filter((r) => r.targetRef === 'widget');
    expect(resolved).toHaveLength(1);

    expect(checkBrokenReference(corpus).map((f) => f.message).join()).not.toContain('widget');
  });

  it('folds an accent and an apostrophe the same way in a corpus laid out differently (ADR-0001)', async () => {
    const lens = await loadLens(fixturePath('lens-b.json'));
    const { corpus } = await loadCorpus(lens);

    expect(checkBrokenReference(corpus)).toEqual([]);
  });

  it('resolves a reference to an anchor whose id contains a dot, rather than skipping it as external', () => {
    const corpus = buildCorpus([
      fact({ id: 'v1.2', kind: 'Module', moduleId: null, file: 'modules/v1.2.md', line: 1 }),
      fact({
        id: 'a1',
        kind: 'Term',
        moduleId: 'v1.2',
        relations: [{ type: 'references', targetRef: 'v1.2' }],
        file: 'modules/a.md',
        line: 1,
      }),
    ]);

    expect(checkBrokenReference(corpus)).toEqual([]);
  });

  it('still treats a dotted target that matches no anchor as external, not as a broken reference', () => {
    const corpus = buildCorpus([
      fact({
        id: 'a1',
        kind: 'Term',
        moduleId: 'north',
        relations: [{ type: 'references', targetRef: 'unrelated-file.md' }],
        file: 'modules/a.md',
        line: 1,
      }),
    ]);

    expect(checkBrokenReference(corpus)).toEqual([]);
  });
});
