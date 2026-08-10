import { describe, expect, it } from 'vitest';
import { FACT_KINDS, type Fact, type Finding } from '../src/index.js';

describe('core types', () => {
  it('closes the Fact Kind set at five (ADR-0005)', () => {
    expect([...FACT_KINDS].sort()).toEqual(
      ['Message', 'Module', 'Rule', 'Term', 'Transition'],
    );
  });

  it('keeps maturity and sources as separate fields (ADR-0006)', () => {
    const fact: Fact = {
      id: 'f1',
      kind: 'Rule',
      moduleId: 'm1',
      facet: 'anything',
      containerId: 'c1',
      attributes: { statement: 'x' },
      relations: [],
      maturityLevel: 'level-2',
      sources: ['src-a', 'src-b'],
      origin: { file: 'a.md', line: 3 },
    };
    expect(fact.maturityLevel).toBe('level-2');
    expect(fact.sources).toHaveLength(2);
  });

  it('requires every Finding to carry a verifiable origin (LAW-009)', () => {
    const finding: Finding = {
      code: 'broken-reference',
      message: 'points nowhere',
      moduleId: 'm1',
      origin: { file: 'a.md', line: 9 },
    };
    expect(finding.origin.line).toBeGreaterThan(0);
  });
});
