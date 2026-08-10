import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkCoreVocabulary, REPO_ROOT } from '../src/index.js';

const CORE_ROOTS = [
  'libs/comply-core/src',
  'libs/comply-readiness/src',
  'libs/comply-integrity/src',
  'libs/comply-ingestion/src',
  'libs/comply-seed/src',
  'libs/comply-reading/src',
  'libs/comply-contract/src',
  'apps/comply-api/src',
  'apps/comply-studio/src',
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
      ['libs/comply-lens/src'],
      ['markdown-frontmatter'],
    );
    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0]!.term).toBe('markdown-frontmatter');
  });

  it('reports the offending location so a human can open it', async () => {
    const violations = await checkCoreVocabulary(
      ['libs/comply-lens/src'],
      ['markdown-frontmatter'],
    );
    expect(violations[0]!.file).toMatch(/^libs\/comply-lens\/src\//);
    expect(violations[0]!.line).toBeGreaterThan(0);
  });

  it('detects a forbidden term inside a template literal', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'comply-guards-'));
    try {
      await writeFile(
        join(dir, 'leak.ts'),
        'export const message = `no ${kind} for sprocket`;\n',
        'utf8',
      );
      const violations = await checkCoreVocabulary([relative(REPO_ROOT, dir)], ['sprocket']);
      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0]!.term).toBe('sprocket');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('detects a forbidden term in a component file', async () => {
    // The interface is where one corpus's shape is most tempting to hardcode —
    // a column named after a Facet reads perfectly and is a defect. Component
    // files are covered on the same terms as everything else.
    const dir = await mkdtemp(join(tmpdir(), 'comply-guards-'));
    try {
      await writeFile(
        join(dir, 'leak.tsx'),
        'export const Head = () => <th>sprocket</th>;\n',
        'utf8',
      );
      const violations = await checkCoreVocabulary([relative(REPO_ROOT, dir)], ['sprocket']);
      expect(violations.map((v) => v.term)).toEqual(['sprocket']);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('genuinely scans libs/comply-ingestion/src, not merely lists it', async () => {
    const violations = await checkCoreVocabulary(
      ['libs/comply-ingestion/src'],
      ['unknown-status'],
    );
    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0]!.term).toBe('unknown-status');
  });
});
