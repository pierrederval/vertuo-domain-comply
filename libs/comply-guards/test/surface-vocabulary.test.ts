import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  checkSurfaceVocabulary,
  REPO_ROOT,
  sayWhatWasScanned,
  surfaceRoots,
  type SurfaceReport,
} from '../src/index.js';

/**
 * LAW-010 names the first eight. *compliant* is the ninth deliberately: a Corpus
 * is fully approved against the Facets its Lens declares, and is never described
 * as compliant or complete (LAW-006).
 *
 * The last three are what spec §8 asks of the error a business user is likeliest
 * to meet: the reason a Corpus cannot be read names what is wrong with the Corpus
 * and its Lens, and never validation, parsing or structure. *parse* was already
 * here; the other two are added so the rule is enforced by this run and not by
 * whoever reads the wording next (issue #27, AC-5).
 *
 * *invalid* belongs in this list and cannot be added yet, for two reasons that are
 * both the over-catch this guard's own doc comment accepts. Three vendored
 * components carry `aria-invalid:` in a class string, which is a selector and not
 * text; and `libs/comply-lens/src/refusal.ts` compares against a validator's own
 * code names — `invalid_type`, `invalid_enum_value` — to turn each of them into a
 * sentence, which is the very work that keeps the word off a screen. *valid*
 * catches the form a reader would actually meet, because `\bvalid` does not match
 * *invalid*: what it will not catch is the exact phrase *is invalid*, which is what
 * `loadLens` said before this slice, so the test below stands in for it.
 */
const ENGINEERING_VOCABULARY = [
  'commit',
  'branch',
  'schema',
  'parse',
  'index',
  'repository',
  'migration',
  'null',
  'compliant',
  'valid',
  'structure',
  'exception',
];

/** The surfaces that carry text a reader meets today, before any interface exists. */
const SURFACES_TODAY = [
  'apps/comply-cli/src/render.ts',
  'libs/comply-ingestion/src/interpret.ts',
  // Where the sentence for a Corpus that cannot be read is written. Named because
  // these two are the error state a business user is likeliest to meet, and because
  // neither reaches a component: nothing but this guard and their own tests stands
  // between their words and a reader (spec §8).
  'libs/comply-lens/src/refusal.ts',
  'libs/comply-door/src/door.ts',
];

async function check(source: string, fileName = 'surface.ts'): Promise<SurfaceReport> {
  const dir = await mkdtemp(join(tmpdir(), 'comply-guards-'));
  try {
    await writeFile(join(dir, fileName), source, 'utf8');
    return await checkSurfaceVocabulary([relative(REPO_ROOT, dir)], ENGINEERING_VOCABULARY);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

describe('LAW-010: business language at the surface', () => {
  it('finds no engineering vocabulary in anything this workspace could show a reader', async () => {
    const { violations } = await checkSurfaceVocabulary(
      await surfaceRoots(),
      ENGINEERING_VOCABULARY,
    );
    expect(violations).toEqual([]);
  });

  it('says which files that verdict is about, and they include the surfaces there are', async () => {
    const { scanned } = await checkSurfaceVocabulary(await surfaceRoots(), ENGINEERING_VOCABULARY);

    // Without this the test above passes just as happily over nothing at all.
    for (const surface of SURFACES_TODAY) expect(scanned).toContain(surface);
    expect(scanned.length).toBeGreaterThan(SURFACES_TODAY.length);
  });

  it('catches the words a refused set of criteria used to be reported in', async () => {
    // What `loadLens` said before spec §8 was built, in the words it said it in. The
    // wrapper is gone; this stands in its place, because the phrasing that will be
    // reached for next is the one that was there before.
    const { violations } = await check(
      'export const said = "schema validation failed: bad structure";\n',
    );

    expect(violations.map((held) => held.term).sort()).toEqual(['schema', 'structure', 'valid']);
  });

  it('does not read a refusal of an unreadable thing as the thing itself', async () => {
    // `\bvalid` stops at a word start, so *invalid* is not caught — which is the
    // limitation the comment above the list names, kept honest by asserting it.
    const { violations } = await check('export const said = "it is invalid";\n');

    expect(violations).toEqual([]);
  });

  it('reports a term in a label, at a place someone can open', async () => {
    const { violations } = await check('export const LABEL = "Latest commit";\n');

    expect(violations).toHaveLength(1);
    expect(violations[0]!.term).toBe('commit');
    expect(violations[0]!.file).toMatch(/surface\.ts$/);
    expect(violations[0]!.line).toBe(1);
  });

  it('reports a term in the file kind an interface is actually written in', async () => {
    // Almost every string a reader meets will be written in a component file. A
    // guard that reads only .ts would pass over the entire interface in silence
    // from its first line, which is the failure this guard exists to prevent
    // arriving one file extension later.
    const { scanned, violations } = await check(
      'export const Row = () => <p>Nothing to commit</p>;\n',
      'row.tsx',
    );

    expect(scanned.map((f) => f.split('/').at(-1))).toEqual(['row.tsx']);
    expect(violations.map((v) => v.term)).toEqual(['commit']);
  });

  it('reports a term inside a template literal', async () => {
    const { violations } = await check(
      'export const empty = `No ${kind} in the repository yet`;\n',
    );

    expect(violations.map((v) => v.term)).toEqual(['repository']);
  });

  it('reports an inflection, because that is the shape a leak usually has', async () => {
    const { violations } = await check(
      [
        'export const a = "nothing was committed";',
        'export const b = "while parsing";',
        'export const c = "the indexed facets";',
        'export const d = "this value is nullable";',
        'export const e = "across both repositories";',
      ].join('\n'),
    );

    // A trailing e or y on the term is optional, or parsing and repositories —
    // the shapes these words actually take in a sentence — would both slip past.
    expect(violations.map((v) => v.term)).toEqual([
      'commit',
      'parse',
      'index',
      'null',
      'repository',
    ]);
  });

  it('reports a term in an attribute a reader hovers rather than reads', async () => {
    const { violations } = await check(
      'export const Hint = () => <abbr title="Nothing was committed">x</abbr>;\n',
      'hint.tsx',
    );

    expect(violations.map((v) => v.term)).toEqual(['commit']);
  });

  it('reports a term that a line break falls in the middle of', async () => {
    // Read with the language's own parser, so a sentence that wraps is one piece
    // of text. Matching quotes line by line could not see this, and a label long
    // enough to wrap is exactly the kind that carries a whole sentence.
    const { violations } = await check(
      ['export const empty = `Nothing has been', '  committed yet`;'].join('\n'),
    );

    expect(violations.map((v) => v.term)).toEqual(['commit']);
    expect(violations[0]!.line).toBe(1);
  });

  it('says nothing about a word that merely contains a term', async () => {
    // Matching starts at a word: a sparse corpus is not a corpus that will not parse.
    const { violations } = await check('export const fine = "a sparse corpus, annulled";\n');
    expect(violations).toEqual([]);
  });

  it('lets a term hidden behind a prefix through, which is the price of the line above', async () => {
    // Recorded rather than believed away: matching from the start of a word cannot
    // see *unparsable* or *reindexed*. Dropping that rule would catch both and
    // would also catch *sparse*, and would put every Finding code that carries a
    // prefixed term on the wrong side of a guard — a rename no vocabulary rule
    // gets to make on its own.
    const { violations } = await check('export const missed = "an unparsable, reindexed thing";\n');
    expect(violations).toEqual([]);
  });

  it('over-catches a business word built on a term, and does so knowingly', async () => {
    // The price of catching every inflection. A build failure a person resolves
    // by rewording, which is cheaper than a leak nobody ever finds.
    const { violations } = await check('export const known = "Your commitment";\n');
    expect(violations.map((v) => v.term)).toEqual(['commit']);
  });

  it('ignores what is written about the code rather than shown by it', async () => {
    const { violations } = await check(
      [
        '// The reader never sees the word "commit" here.',
        '/**',
        ' * Nor in `schema`, which describes the code.',
        ' */',
        'export const fine = "Nothing to see";',
      ].join('\n'),
    );

    expect(violations).toEqual([]);
  });

  it('ignores the path an import names, which nobody is shown', async () => {
    const { violations } = await check(
      ["import { thing } from './markdown/index.js';", 'export const fine = thing;'].join('\n'),
    );

    expect(violations).toEqual([]);
  });

  it('ignores an identifier that happens to sit inside a template literal', async () => {
    // `${index}` is code between backticks, not a word anybody reads.
    const { violations } = await check('export const id = `${document.path}#${index}`;\n');
    expect(violations).toEqual([]);
  });

  it('refuses to answer about a place it could not look', async () => {
    // A guard that reports nothing because it scanned nothing reads exactly like
    // a guard that found nothing wrong. The named root is one no package will
    // ever have — a package that has been built is a root that exists, and this
    // assertion would then quietly stop asserting anything.
    await expect(
      checkSurfaceVocabulary(['apps/nothing-is-here/src'], ENGINEERING_VOCABULARY),
    ).rejects.toThrow();
  });
});

describe('how much this verdict is about', () => {
  it('says the figure and every place it is made up of, and says it out loud', async () => {
    const report = await checkSurfaceVocabulary(await surfaceRoots(), ENGINEERING_VOCABULARY);
    const said = sayWhatWasScanned(report);

    // Printed here rather than anywhere else, because the figure printed and the
    // figure asserted are then the same call's answer and cannot drift apart. A
    // run that says "no engineering vocabulary found" without saying where it
    // looked is the guard's own version of the silence it exists to break, and
    // this task is never cached (turbo.json), so what a run prints is what that
    // run read.
    console.log(said);

    expect(said).toContain(String(report.scanned.length));
    for (const root of report.roots) expect(said).toContain(root);
    for (const surface of SURFACES_TODAY) {
      const place = surface.slice(0, surface.lastIndexOf('/'));
      expect(said).toContain(place);
    }
  });

  it('says a place it read nothing in, rather than leaving it out of the figure', async () => {
    // The shrinking denominator LAW-006 is about. A package whose source moved
    // elsewhere still has its src directory, so nothing raises and nothing is
    // reported — the guard simply stops covering it, and a list of only the
    // places with something in them makes that indistinguishable from a clean
    // pass over everything.
    const base = await mkdtemp(join(tmpdir(), 'comply-guards-'));
    try {
      await mkdir(join(base, 'read/src'), { recursive: true });
      await writeFile(join(base, 'read/src/label.ts'), 'export const a = "fine";\n', 'utf8');
      await mkdir(join(base, 'empty/src'), { recursive: true });

      const here = relative(REPO_ROOT, base);
      const report = await checkSurfaceVocabulary(
        [`${here}/read/src`, `${here}/empty/src`],
        ENGINEERING_VOCABULARY,
      );

      expect(sayWhatWasScanned(report)).toContain(`${here}/empty/src 0`);
    } finally {
      await rm(base, { recursive: true, force: true });
    }
  });
});

describe('what counts as a surface', () => {
  it('finds a package added later without it being registered anywhere', async () => {
    const base = await mkdtemp(join(tmpdir(), 'comply-workspace-'));
    try {
      await mkdir(join(base, 'apps/comply-studio/src'), { recursive: true });
      await writeFile(join(base, 'apps/comply-studio/package.json'), '{}\n', 'utf8');
      await mkdir(join(base, 'libs/comply-core/src'), { recursive: true });
      await writeFile(join(base, 'libs/comply-core/package.json'), '{}\n', 'utf8');

      expect(await surfaceRoots(base)).toEqual([
        'apps/comply-studio/src',
        'libs/comply-core/src',
      ]);
    } finally {
      await rm(base, { recursive: true, force: true });
    }
  });

  it('refuses a package whose source it would have to guess at', async () => {
    const base = await mkdtemp(join(tmpdir(), 'comply-workspace-'));
    try {
      await mkdir(join(base, 'apps/comply-studio/app'), { recursive: true });
      await writeFile(join(base, 'apps/comply-studio/package.json'), '{}\n', 'utf8');
      await mkdir(join(base, 'libs'), { recursive: true });

      await expect(surfaceRoots(base)).rejects.toThrow(/comply-studio/);
    } finally {
      await rm(base, { recursive: true, force: true });
    }
  });

  it('passes over a leftover directory that is not a package', async () => {
    const base = await mkdtemp(join(tmpdir(), 'comply-workspace-'));
    try {
      await mkdir(join(base, 'libs/comply-profile/.turbo'), { recursive: true });
      await mkdir(join(base, 'apps'), { recursive: true });

      expect(await surfaceRoots(base)).toEqual([]);
    } finally {
      await rm(base, { recursive: true, force: true });
    }
  });
});
