import { describe, expect, it } from 'vitest';
import { fixturePath } from '@vertuo/comply-fixtures';
import { loadCorpus } from '@vertuo/comply-ingestion';
import { loadLens } from '@vertuo/comply-lens';
import { CHECKS, runChecks } from '@vertuo/comply-integrity';

describe('the named set of Checks', () => {
  it('says which Checks it runs, so a count of Findings has something to be out of', () => {
    // A bare "14 open Findings" claims a completeness nobody granted it: it reads
    // as "these are the problems" when it can only ever mean "these are the
    // problems the things we looked for would have found" (LAW-006).
    expect(CHECKS.map((check) => check.name)).toEqual([
      'split-identity',
      'conflicting-definition',
      'broken-reference',
      'unsettled-actor',
      'missing-owner',
    ]);
  });

  it('reports no Finding that no named Check looked for', async () => {
    const lens = await loadLens(fixturePath('lens-a.json'));
    const { corpus } = await loadCorpus(lens);
    const named = CHECKS.map((check) => check.name);

    // Without this, a Check added without being named shrinks the stated
    // denominator below what actually ran, which is the same lie inverted.
    for (const finding of runChecks(corpus, lens)) expect(named).toContain(finding.code);
  });
});

describe('check runner', () => {
  it('finds all five defect kinds planted in fixture A', async () => {
    const lens = await loadLens(fixturePath('lens-a.json'));
    const { corpus } = await loadCorpus(lens);
    const codes = [...new Set(runChecks(corpus, lens).map((f) => f.code))].sort();
    expect(codes).toEqual([
      'broken-reference', 'conflicting-definition', 'missing-owner', 'split-identity',
      'unsettled-actor',
    ]);
  });

  it('finds nothing in the clean fixture B', async () => {
    const lens = await loadLens(fixturePath('lens-b.json'));
    const { corpus } = await loadCorpus(lens);
    expect(runChecks(corpus, lens)).toEqual([]);
  });
});
