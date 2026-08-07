import { describe, expect, it } from 'vitest';
import type { Fact } from '@vertuo/comply-core';
import { buildCorpus } from '@vertuo/comply-core';
import { fixturePath } from '@vertuo/comply-fixtures';
import { loadCorpus } from '@vertuo/comply-ingestion';
import { loadProfile } from '@vertuo/comply-profile';
import { checkSplitIdentity } from '@vertuo/comply-integrity';

function fact(partial: { id: string; moduleId: string; containerId: string; file: string; line: number }): Fact {
  return {
    id: partial.id,
    kind: 'Term',
    moduleId: partial.moduleId,
    facet: 'terms',
    containerId: partial.containerId,
    attributes: {},
    relations: [],
    maturityLevel: null,
    sources: [],
    origin: { file: partial.file, line: partial.line },
  };
}

describe('split identity check', () => {
  it('reports one container carrying two module identities', async () => {
    const profile = await loadProfile(fixturePath('profile-a.json'));
    const { corpus } = await loadCorpus(profile);
    const findings = checkSplitIdentity(corpus);

    expect(findings).toHaveLength(1);
    expect(findings[0]!.code).toBe('split-identity');
    expect(findings[0]!.message).toContain('beta');
    expect(findings[0]!.message).toContain('bravo');
    expect(findings[0]!.origin.file).toContain('beta/');
  });

  it('reports nothing for a corpus whose containers are internally consistent', async () => {
    const profile = await loadProfile(fixturePath('profile-b.json'));
    const { corpus } = await loadCorpus(profile);
    expect(checkSplitIdentity(corpus)).toEqual([]);
  });

  it('picks the majority identity as primary and points evidence at an anomaly, not the consensus', () => {
    const corpus = buildCorpus([
      fact({ id: 'r1', moduleId: 'north', containerId: 'roster', file: 'roster/a.md', line: 1 }),
      fact({ id: 'r2', moduleId: 'north', containerId: 'roster', file: 'roster/b.md', line: 2 }),
      fact({ id: 'r3', moduleId: 'north', containerId: 'roster', file: 'roster/c.md', line: 3 }),
      fact({ id: 'r4', moduleId: 'east', containerId: 'roster', file: 'roster/d.md', line: 4 }),
      fact({ id: 'r5', moduleId: 'south', containerId: 'roster', file: 'roster/e.md', line: 5 }),
    ]);
    const findings = checkSplitIdentity(corpus);

    expect(findings).toHaveLength(1);
    expect(findings[0]!.moduleId).toBe('north');
    expect(findings[0]!.origin.file).toBe('roster/d.md');
    expect(findings[0]!.message).toContain('north');
    expect(findings[0]!.message).toContain('east');
    expect(findings[0]!.message).toContain('south');
  });

  it('falls back to the identity carried by the most facts when none matches the container name', () => {
    const corpus = buildCorpus([
      fact({ id: 'l1', moduleId: 'zebra', containerId: 'ledger', file: 'ledger/x.md', line: 1 }),
      fact({ id: 'l2', moduleId: 'zebra', containerId: 'ledger', file: 'ledger/y.md', line: 2 }),
      fact({ id: 'l3', moduleId: 'zebra', containerId: 'ledger', file: 'ledger/z.md', line: 3 }),
      fact({ id: 'l4', moduleId: 'aardvark', containerId: 'ledger', file: 'ledger/w.md', line: 4 }),
    ]);
    const findings = checkSplitIdentity(corpus);

    expect(findings).toHaveLength(1);
    expect(findings[0]!.moduleId).toBe('zebra');
    expect(findings[0]!.origin.file).toBe('ledger/w.md');
  });

  it('breaks a count tie lexicographically, deterministically regardless of fact order', () => {
    const facts = [
      fact({ id: 'n1', moduleId: 'kappa', containerId: 'nexus', file: 'nexus/a.md', line: 1 }),
      fact({ id: 'n2', moduleId: 'kappa', containerId: 'nexus', file: 'nexus/b.md', line: 2 }),
      fact({ id: 'n3', moduleId: 'omega', containerId: 'nexus', file: 'nexus/c.md', line: 3 }),
      fact({ id: 'n4', moduleId: 'omega', containerId: 'nexus', file: 'nexus/d.md', line: 4 }),
      fact({ id: 'n5', moduleId: 'beta', containerId: 'nexus', file: 'nexus/e.md', line: 5 }),
    ];

    const forward = checkSplitIdentity(buildCorpus(facts));
    const shuffled = checkSplitIdentity(buildCorpus([...facts].reverse()));

    expect(forward).toHaveLength(1);
    expect(forward[0]!.moduleId).toBe('kappa');
    expect(forward[0]!.origin.file).toBe('nexus/e.md');
    expect(forward[0]!.message).toContain('kappa');
    expect(forward[0]!.message).toContain('omega');
    expect(forward[0]!.message).toContain('beta');
    expect(shuffled).toEqual(forward);
  });
});
