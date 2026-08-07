import { describe, expect, it } from 'vitest';
import { fixturePath } from '@vertuo/comply-fixtures';
import { renderFindings, renderMatrix } from '../src/render.js';
import { loadCorpus } from '@vertuo/comply-ingestion';
import { loadProfile } from '@vertuo/comply-profile';
import { runChecks } from '@vertuo/comply-integrity';
import { buildMatrix } from '@vertuo/comply-readiness';
import { scoreMatrix } from '@vertuo/comply-readiness';

describe('rendering', () => {
  it('shows every score against its denominator (LAW-006)', async () => {
    const profile = await loadProfile(fixturePath('profile-a.json'));
    const { corpus } = await loadCorpus(profile);
    const matrix = buildMatrix(corpus, profile);
    const out = renderMatrix(matrix, scoreMatrix(matrix), []);

    expect(out).toContain('alpha');
    expect(out).toMatch(/2\/3/);
    expect(out).toContain('avery');
  });

  it('marks a module with no owner rather than leaving it blank (ADR-0010)', async () => {
    const profile = await loadProfile(fixturePath('profile-a.json'));
    const { corpus } = await loadCorpus(profile);
    const matrix = buildMatrix(corpus, profile);
    expect(renderMatrix(matrix, scoreMatrix(matrix), [])).toContain('NO OWNER');
  });

  it('renders each finding with a file and line a human can open, as a path relative to the corpus root', async () => {
    const profile = await loadProfile(fixturePath('profile-a.json'));
    const { corpus } = await loadCorpus(profile);
    const out = renderFindings(runChecks(corpus, profile), profile.adapter.root);
    expect(out).toMatch(/\.md:\d+/);
    expect(out).toContain('split-identity');
    expect(out).toContain('[split-identity] beta/terms.md');
    expect(out).not.toContain('[split-identity] /');
  });
});
