import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { fixturePath } from '@vertuo/comply-fixtures';
import { discoverDocuments } from '@vertuo/comply-ingestion';
import { parseDocument } from '@vertuo/comply-ingestion';

describe('document discovery and parsing', () => {
  it('finds every markdown document under a root, sorted for determinism', async () => {
    const files = await discoverDocuments(fixturePath('corpus-a'));
    expect(files.map((f) => f.replace(/.*corpus-a\//, ''))).toEqual([
      'alpha/aggregates.md',
      'alpha/crew.md',
      'alpha/invariants.md',
      'alpha/orders.md',
      'alpha/overview.md',
      'alpha/rules.md',
      'alpha/terms.md',
      'beta/overview.md',
      'beta/terms.md',
    ]);
  });

  it('parses frontmatter and reports the line the body starts on', async () => {
    const doc = await parseDocument(fixturePath('corpus-a/alpha/terms.md'));
    expect(doc?.data.area).toBe('alpha');
    expect(doc?.data.kind).toBe('terms');
    expect(doc?.bodyStartLine).toBeGreaterThan(1);
    expect(doc?.body).toContain('Widget');
  });

  it('returns null for a document with no frontmatter', async () => {
    const doc = await parseDocument(fixturePath('lens-a.json'));
    expect(doc).toBeNull();
  });

  it('returns null for a document with malformed YAML frontmatter, rather than throwing', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'comply-ingestion-'));
    const path = join(dir, 'broken.md');
    await writeFile(path, '---\narea: [unterminated\n---\nbody\n', 'utf8');

    const doc = await parseDocument(path);
    expect(doc).toBeNull();
  });
});
