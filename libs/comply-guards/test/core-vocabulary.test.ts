import { describe, expect, it } from 'vitest';
import { checkCoreVocabulary } from '../src/index.js';

const CORE_ROOTS = [
  'libs/comply-core/src',
  'libs/comply-readiness/src',
  'libs/comply-integrity/src',
];

describe('LAW-004: the core knows no business', () => {
  it('finds no fixture vocabulary in core source', async () => {
    const violations = await checkCoreVocabulary(CORE_ROOTS, [
      'alpha', 'beta', 'bravo', 'widget', 'sprocket', 'cog',
      'lever', 'fulcrum', 'pulley', 'avery', 'quinn',
      'overview', 'terms', 'rules', 'definitions', 'constraints',
      'agreed', 'guessed',
    ]);
    expect(violations).toEqual([]);
  });

  it('detects a planted violation', async () => {
    const violations = await checkCoreVocabulary(
      ['libs/comply-profile/src'],
      ['markdown-frontmatter'],
    );
    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0]!.term).toBe('markdown-frontmatter');
  });

  it('reports the offending location so a human can open it', async () => {
    const violations = await checkCoreVocabulary(
      ['libs/comply-profile/src'],
      ['markdown-frontmatter'],
    );
    expect(violations[0]!.file).toMatch(/^libs\/comply-profile\/src\//);
    expect(violations[0]!.line).toBeGreaterThan(0);
  });
});
