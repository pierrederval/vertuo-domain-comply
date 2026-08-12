import { describe, expect, it } from 'vitest';
import { fixturePath } from '@vertuo/comply-fixtures';
import { loadCorpus } from '@vertuo/comply-ingestion';
import { loadLens } from '@vertuo/comply-lens';

describe('two-corpus rule (ADR-0001)', () => {
  it('imports a corpus with a different layout, keys, and maturity vocabulary', async () => {
    const lens = await loadLens(fixturePath('lens-b.json'));
    const { corpus, findings } = await loadCorpus(lens);

    expect(findings.filter((f) => f.code === 'unknown-status')).toEqual([]);
    expect(corpus.byKind('Term').map((f) => f.attributes.name).sort())
      .toEqual(['Fulcrum', 'Inspecteur', 'Lever', 'Opérateur', "Pulley d'Étage"]);
    expect(corpus.byKind('Rule')).toHaveLength(1);
    // Requests, read from sections rather than rows, each naming who may make it
    // (ADR-0037).
    expect(corpus.byKind('Message').map((f) => f.attributes.acteur))
      .toEqual(['Opérateur ou Inspecteur', 'Opérateur']);
  });

  it('handles numeric maturity levels coerced to strings', async () => {
    const lens = await loadLens(fixturePath('lens-b.json'));
    const { corpus } = await loadCorpus(lens);
    const lever = corpus.byKind('Term').find((f) => f.attributes.name === 'Lever');
    expect(lever?.maturityLevel).toBe('2');
    expect(lever?.sources).toEqual(['import', 'signoff']);
  });
});
