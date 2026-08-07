import { describe, expect, it } from 'vitest';
import type { Fact } from '@vertuo/comply-core';
import { buildCorpus } from '@vertuo/comply-core';
import { fixturePath } from '@vertuo/comply-fixtures';
import { loadCorpus } from '@vertuo/comply-ingestion';
import { loadProfile } from '@vertuo/comply-profile';
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
    const profile = await loadProfile(fixturePath('profile-a.json'));
    const { corpus } = await loadCorpus(profile);
    const findings = checkBrokenReference(corpus);

    expect(findings).toHaveLength(1);
    expect(findings[0]!.code).toBe('broken-reference');
    expect(findings[0]!.message).toContain('r-9-missing');
    expect(findings[0]!.origin.file).toContain('beta/terms.md');
  });

  it('accepts a reference resolving to another fact by slug', async () => {
    const profile = await loadProfile(fixturePath('profile-a.json'));
    const { corpus } = await loadCorpus(profile);
    const resolved = corpus.facts
      .flatMap((f) => f.relations)
      .filter((r) => r.targetRef === 'r-2-sprockets-turn');
    expect(resolved).toHaveLength(1);
    expect(checkBrokenReference(corpus).map((f) => f.message).join())
      .not.toContain('r-2-sprockets-turn');
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
