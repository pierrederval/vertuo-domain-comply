# Read-Only Readiness Slice — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import a Corpus through a Profile-driven Seed Adapter and report its Readiness Matrix and integrity Findings, without ever writing to a Corpus.

**Architecture:** A domain-agnostic core (Fact, Corpus projection, criteria engine) plus a Profile that carries every corpus-specific name. A Seed Adapter reads documents and produces a read-only in-memory projection plus a list of Findings. Readiness and Language Integrity read that projection and produce a matrix and more Findings. A CLI renders both.

**Tech Stack:** TypeScript (strict), Node 22+, pnpm, vitest, `gray-matter` for frontmatter. No database, no UI, no HTTP.

## Global Constraints

- **LAW-004 — the core knows no business.** No business term, natural-language string, facet name, or maturity-level name may appear in `src/core/`, `src/readiness/`, or `src/integrity/`. All such values arrive as Profile data. Enforced by Task 16.
- **LAW-003 — append-only.** No code in this slice writes to a Corpus at all. The projection is in-memory and discarded.
- **LAW-009 — evidence, not assertion.** Every `Fact` and every `Finding` carries an `origin: SourceLocation` (`file` + 1-indexed `line`) that a human can open.
- **LAW-006 — never claim completeness.** Every reported score carries its denominator.
- **ADR-0001 — two-corpus rule.** Two deliberately dissimilar fixture corpora exist from Task 7 onward. Every subsequent feature is tested against both.
- **ADR-0005 — five Fact Kinds,** a closed set: `Module`, `Term`, `Rule`, `Message`, `Transition`.
- **ADR-0006 — Maturity and Sources are separate fields,** never one composite value.
- Node `>=22`, `pnpm@10`, `"type": "module"`, TypeScript `strict: true`.
- Test command: `pnpm test`. Typecheck: `pnpm typecheck`.

## Scope decisions made by this plan

Recorded because they depart from a literal reading of the spec, and a reviewer should be able to reject them:

1. **No PostgreSQL.** ADR-0011 mandates it for the ledger; this slice has no ledger. Runs emit disposable JSON snapshots, which LAW-011 explicitly permits. Postgres arrives with the Door in step 3.
2. **The Seed Adapter produces a read-only Corpus projection.** Per ADR-0012 a Seed is transport, not a change: loading one is the Door's `Load` operation and is recorded as a single Genesis entry, never as one Fact Version per Fact. `SeedResult` is therefore shaped as the future `Load` payload — a whole Corpus state plus its Findings — and step 3 wires it to the Door without reshaping. It is never a Change Request.
3. **CLI only.** The spec's Studio surfaces are step 3+. This slice renders to a terminal and to JSON.

## Open questions carried, not resolved

- **Second fixture corpus shape.** Task 7 chooses one (flat layout, different frontmatter keys, numeric maturity, three facets). It is a guess at "dissimilar enough" and should be reviewed. If real second corpora differ along other axes, the fixture must change.
- **Module Owner capture.** Task 9 supports two mechanisms — an adapter-declared frontmatter key, or an explicit `owners` map in the Profile. Which one real corpora use is unknown. ADR-0010 makes an owner mandatory, so a missing owner is a Finding, not a silent null.
- **LAW-011 vs gap logging.** Gap logs (spec §7) cannot be recomputed from the Corpus, yet live in Publication, which LAW-011 requires to be disposable. This affects step 5, not this slice. It needs either a first-class store for gap logs or an amendment to LAW-011.

## File Structure

| File | Responsibility |
| --- | --- |
| `src/core/fact.ts` | `Fact`, `FactKind`, `Relation`, `SourceLocation` types. No behaviour. |
| `src/core/finding.ts` | `Finding`, `FindingCode`. No behaviour. |
| `src/core/corpus.ts` | Read-only projection over facts with lookups. |
| `src/profile/profile.ts` | `Profile` and its sub-types. |
| `src/profile/load.ts` | Read and validate a Profile from JSON. |
| `src/profile/maturity.ts` | Ladder ordering and status decomposition. |
| `src/ingestion/adapter.ts` | `SeedAdapter` port, `SeedResult`. |
| `src/ingestion/markdown/discover.ts` | Find candidate documents under a root. |
| `src/ingestion/markdown/document.ts` | Parse one document's frontmatter and body. |
| `src/ingestion/markdown/extractors.ts` | `document`, `table`, `heading` body extractors. |
| `src/ingestion/markdown/index.ts` | Assemble the adapter. |
| `src/readiness/wellformed.ts` | Criteria evaluation engine. |
| `src/readiness/owner.ts` | Module Owner resolution. |
| `src/readiness/matrix.ts` | Module × Facet matrix. |
| `src/readiness/score.ts` | Rollup with denominators. |
| `src/readiness/snapshot.ts` | Disposable run snapshots and trend. |
| `src/integrity/registry.ts` | Term registry. |
| `src/integrity/checks/conflicting-definition.ts` | One Term defined two ways. |
| `src/integrity/checks/split-identity.ts` | One container, two Module identities. |
| `src/integrity/checks/broken-reference.ts` | Relation pointing nowhere. |
| `src/integrity/run.ts` | Run all checks. |
| `src/cli/render.ts` | Text rendering of matrix and findings. |
| `src/cli/main.ts` | Entry point. |
| `fixtures/corpus-a/`, `fixtures/profile-a.json` | First fixture corpus. |
| `fixtures/corpus-b/`, `fixtures/profile-b.json` | Deliberately dissimilar second corpus. |
| `scripts/check-core-vocabulary.mjs` | LAW-004 guard. |

---

### Task 1: Scaffold and core types

**Files:**
- Create: `package.json`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`
- Create: `src/core/fact.ts`, `src/core/finding.ts`
- Test: `tests/core/fact.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `FactKind`, `FactId`, `SourceLocation`, `Relation`, `Fact`, `Finding`, `FindingCode`, `FACT_KINDS`.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "vertuo-domain-comply",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "engines": { "node": ">=22" },
  "packageManager": "pnpm@10.33.0",
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "comply": "tsx src/cli/main.ts"
  },
  "dependencies": {
    "gray-matter": "^4.0.3",
    "tsx": "^4.19.2"
  },
  "devDependencies": {
    "@types/node": "^22.10.0",
    "typescript": "^5.7.2",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`, `vitest.config.ts`, `.gitignore`**

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2023",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "noEmit": true,
    "types": ["node"]
  },
  "include": ["src", "tests", "scripts"]
}
```

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['tests/**/*.test.ts'] },
});
```

`.gitignore`:
```
node_modules/
.comply/
dist/
```

- [ ] **Step 3: Install**

Run: `pnpm install`
Expected: lockfile created, no errors.

- [ ] **Step 4: Write the failing test**

`tests/core/fact.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { FACT_KINDS, type Fact } from '../../src/core/fact.js';
import type { Finding } from '../../src/core/finding.js';

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
```

- [ ] **Step 5: Run test to verify it fails**

Run: `pnpm test`
Expected: FAIL — cannot resolve `../../src/core/fact.js`.

- [ ] **Step 6: Write `src/core/fact.ts`**

```ts
export const FACT_KINDS = ['Module', 'Term', 'Rule', 'Message', 'Transition'] as const;

export type FactKind = (typeof FACT_KINDS)[number];

export type FactId = string;

/** A place a human can open to verify a claim (LAW-009). `line` is 1-indexed. */
export interface SourceLocation {
  file: string;
  line: number;
}

/** A typed edge to another Fact. `targetRef` is resolved against Fact ids. */
export interface Relation {
  type: string;
  targetRef: string;
}

export type AttributeValue = string | string[];

export interface Fact {
  id: FactId;
  kind: FactKind;
  /** null for Facts of kind 'Module'. */
  moduleId: FactId | null;
  /** Profile-declared facet name. The core never inspects its value. */
  facet: string;
  /** Adapter-reported grouping (e.g. a directory). Used by split-identity. */
  containerId: string;
  attributes: Record<string, AttributeValue>;
  relations: Relation[];
  /** A level name from the Profile's ladder. null when the corpus said nothing. */
  maturityLevel: string | null;
  /** Provenance. A set, never merged with maturityLevel (ADR-0006). */
  sources: string[];
  origin: SourceLocation;
}
```

- [ ] **Step 7: Write `src/core/finding.ts`**

```ts
import type { FactId, SourceLocation } from './fact.js';

export type FindingCode =
  | 'unparsable-document'
  | 'unknown-status'
  | 'missing-module-identity'
  | 'missing-owner'
  | 'split-identity'
  | 'broken-reference'
  | 'conflicting-definition';

export interface Finding {
  code: FindingCode;
  message: string;
  moduleId: FactId | null;
  origin: SourceLocation;
}
```

- [ ] **Step 8: Run tests and typecheck**

Run: `pnpm test && pnpm typecheck`
Expected: 3 tests PASS, no type errors.

- [ ] **Step 9: Commit**

```bash
git add package.json pnpm-lock.yaml tsconfig.json vitest.config.ts .gitignore src/core tests/core
git commit -m "feat: scaffold project and core Fact and Finding types"
```

---

### Task 2: Profile model, loader, and maturity decomposition

**Files:**
- Create: `src/profile/profile.ts`, `src/profile/load.ts`, `src/profile/maturity.ts`
- Test: `tests/profile/load.test.ts`, `tests/profile/maturity.test.ts`

**Interfaces:**
- Consumes: `FactKind` from `src/core/fact.ts`.
- Produces: `Profile`, `FacetSpec`, `ExtractorName`, `MaturityLadder`, `StatusMapping`, `Criterion`, `AdapterSpec`, `loadProfile(path): Promise<Profile>`, `decomposeStatus(profile, raw): { maturityLevel, sources } | null`, `isApproved(profile, level): boolean`.

- [ ] **Step 1: Write the failing test for maturity decomposition**

`tests/profile/maturity.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { decomposeStatus, isApproved } from '../../src/profile/maturity.js';
import type { Profile } from '../../src/profile/profile.js';

const profile = {
  id: 'p',
  adapter: { kind: 'markdown-frontmatter', root: '.', moduleIdKey: 'm', facetKey: 'f', statusKey: 's' },
  facets: [],
  maturity: { levels: ['blank', 'guessed', 'agreed'], approvedAtOrAbove: 'agreed' },
  statusMappings: [
    { match: 'Guess - From System X', maturity: 'guessed', sources: ['system-x'] },
    { match: 'Agreed', maturity: 'agreed', sources: ['review'] },
  ],
  criteria: {},
} satisfies Profile;

describe('maturity decomposition (ADR-0006)', () => {
  it('splits one composite status into a level and a source set', () => {
    expect(decomposeStatus(profile, 'Guess - From System X')).toEqual({
      maturityLevel: 'guessed',
      sources: ['system-x'],
    });
  });

  it('returns null for an unrecognised status so the caller can raise a Finding', () => {
    expect(decomposeStatus(profile, 'Something Else')).toBeNull();
  });

  it('treats the top of the ladder and above as approved', () => {
    expect(isApproved(profile, 'agreed')).toBe(true);
    expect(isApproved(profile, 'guessed')).toBe(false);
    expect(isApproved(profile, null)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/profile/maturity.test.ts`
Expected: FAIL — cannot resolve `src/profile/maturity.js`.

- [ ] **Step 3: Write `src/profile/profile.ts`**

```ts
import type { FactKind } from '../core/fact.js';

export type ExtractorName = 'document' | 'table' | 'heading';

export interface FacetSpec {
  /** Corpus-specific facet name. Never interpreted by the core. */
  name: string;
  factKind: FactKind;
  extractor: ExtractorName;
  /** For 'table': column header -> attribute name. For 'heading': body attribute name. */
  columns?: Record<string, string>;
  bodyAttribute?: string;
}

export interface MaturityLadder {
  /** Ordered lowest to highest. Names are corpus-specific. */
  levels: string[];
  approvedAtOrAbove: string;
}

/** Decomposes one composite corpus status into a level plus provenance (ADR-0006). */
export interface StatusMapping {
  match: string;
  maturity: string;
  sources: string[];
}

export type Criterion =
  | { type: 'requiredAttributes'; attributes: string[] }
  | { type: 'minSources'; count: number }
  | { type: 'minRelations'; relation: string; count: number }
  | { type: 'allStatesReachable'; fromAttribute: string; toAttribute: string };

export interface AdapterSpec {
  kind: 'markdown-frontmatter';
  root: string;
  moduleIdKey: string;
  facetKey: string;
  statusKey: string;
  ownerKey?: string;
}

export interface Profile {
  id: string;
  adapter: AdapterSpec;
  facets: FacetSpec[];
  maturity: MaturityLadder;
  statusMappings: StatusMapping[];
  criteria: Partial<Record<FactKind, Criterion[]>>;
  /** Fallback owner map when the corpus carries no owner key. */
  owners?: Record<string, string>;
}
```

- [ ] **Step 4: Write `src/profile/maturity.ts`**

```ts
import type { Profile } from './profile.js';

export interface Decomposed {
  maturityLevel: string;
  sources: string[];
}

/** Exact match only. Guessing at unrecognised values would hide the defect. */
export function decomposeStatus(profile: Profile, raw: string): Decomposed | null {
  const mapping = profile.statusMappings.find((m) => m.match === raw);
  if (!mapping) return null;
  return { maturityLevel: mapping.maturity, sources: [...mapping.sources] };
}

export function isApproved(profile: Profile, level: string | null): boolean {
  if (level === null) return false;
  const { levels, approvedAtOrAbove } = profile.maturity;
  const threshold = levels.indexOf(approvedAtOrAbove);
  const actual = levels.indexOf(level);
  if (threshold < 0 || actual < 0) return false;
  return actual >= threshold;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test tests/profile/maturity.test.ts`
Expected: 3 tests PASS.

- [ ] **Step 6: Write the failing test for the loader**

`tests/profile/load.test.ts`:
```ts
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadProfile } from '../../src/profile/load.js';

async function writeProfile(body: unknown): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'profile-'));
  const path = join(dir, 'profile.json');
  await writeFile(path, JSON.stringify(body), 'utf8');
  return path;
}

const valid = {
  id: 'p',
  adapter: { kind: 'markdown-frontmatter', root: './corpus', moduleIdKey: 'm', facetKey: 'f', statusKey: 's' },
  facets: [{ name: 'anything', factKind: 'Term', extractor: 'table' }],
  maturity: { levels: ['a', 'b'], approvedAtOrAbove: 'b' },
  statusMappings: [],
  criteria: {},
};

describe('loadProfile', () => {
  it('loads a valid profile and resolves the adapter root against the profile file', async () => {
    const path = await writeProfile(valid);
    const profile = await loadProfile(path);
    expect(profile.id).toBe('p');
    expect(profile.adapter.root.endsWith('corpus')).toBe(true);
  });

  it('rejects a facet naming a Fact Kind outside the closed set (ADR-0005)', async () => {
    const path = await writeProfile({
      ...valid,
      facets: [{ name: 'x', factKind: 'Invoice', extractor: 'table' }],
    });
    await expect(loadProfile(path)).rejects.toThrow(/Invoice/);
  });

  it('rejects an approval threshold that is not on the ladder', async () => {
    const path = await writeProfile({
      ...valid,
      maturity: { levels: ['a', 'b'], approvedAtOrAbove: 'zzz' },
    });
    await expect(loadProfile(path)).rejects.toThrow(/zzz/);
  });
});
```

- [ ] **Step 7: Run test to verify it fails**

Run: `pnpm test tests/profile/load.test.ts`
Expected: FAIL — cannot resolve `src/profile/load.js`.

- [ ] **Step 8: Write `src/profile/load.ts`**

```ts
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { FACT_KINDS, type FactKind } from '../core/fact.js';
import type { Profile } from './profile.js';

export async function loadProfile(path: string): Promise<Profile> {
  const raw = JSON.parse(await readFile(path, 'utf8')) as Profile;

  for (const facet of raw.facets) {
    if (!FACT_KINDS.includes(facet.factKind as FactKind)) {
      throw new Error(
        `Profile "${raw.id}": facet "${facet.name}" names Fact Kind "${facet.factKind}", which is not one of ${FACT_KINDS.join(', ')}`,
      );
    }
  }

  const { levels, approvedAtOrAbove } = raw.maturity;
  if (!levels.includes(approvedAtOrAbove)) {
    throw new Error(
      `Profile "${raw.id}": approvedAtOrAbove "${approvedAtOrAbove}" is not on the ladder [${levels.join(', ')}]`,
    );
  }

  for (const mapping of raw.statusMappings) {
    if (!levels.includes(mapping.maturity)) {
      throw new Error(
        `Profile "${raw.id}": status mapping "${mapping.match}" targets level "${mapping.maturity}", which is not on the ladder`,
      );
    }
  }

  return { ...raw, adapter: { ...raw.adapter, root: resolve(dirname(path), raw.adapter.root) } };
}
```

- [ ] **Step 9: Run tests and typecheck**

Run: `pnpm test && pnpm typecheck`
Expected: all PASS.

- [ ] **Step 10: Commit**

```bash
git add src/profile tests/profile
git commit -m "feat: Profile model, loader, and maturity/source decomposition"
```

---

### Task 3: Corpus projection

**Files:**
- Create: `src/core/corpus.ts`
- Test: `tests/core/corpus.test.ts`

**Interfaces:**
- Consumes: `Fact`, `FactId`, `FactKind`.
- Produces: `Corpus` interface with `facts`, `byKind`, `byModule`, `byFacet`, `moduleIds`, `find`; `buildCorpus(facts: Fact[]): Corpus`.

- [ ] **Step 1: Write the failing test**

`tests/core/corpus.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { buildCorpus } from '../../src/core/corpus.js';
import type { Fact } from '../../src/core/fact.js';

function fact(over: Partial<Fact> & Pick<Fact, 'id' | 'kind'>): Fact {
  return {
    moduleId: 'm1',
    facet: 'facet-one',
    containerId: 'c1',
    attributes: {},
    relations: [],
    maturityLevel: null,
    sources: [],
    origin: { file: 'x.md', line: 1 },
    ...over,
  };
}

describe('Corpus projection', () => {
  const corpus = buildCorpus([
    fact({ id: 'm1', kind: 'Module', moduleId: null, facet: 'facet-zero' }),
    fact({ id: 't1', kind: 'Term' }),
    fact({ id: 't2', kind: 'Term' }),
    fact({ id: 'r1', kind: 'Rule', facet: 'facet-two' }),
    fact({ id: 'x1', kind: 'Term', moduleId: 'm2' }),
  ]);

  it('lists module ids from Module facts only', () => {
    expect(corpus.moduleIds()).toEqual(['m1']);
  });

  it('finds facts by kind', () => {
    expect(corpus.byKind('Term').map((f) => f.id)).toEqual(['t1', 't2', 'x1']);
  });

  it('finds facts by module and facet', () => {
    expect(corpus.byFacet('m1', 'facet-one').map((f) => f.id)).toEqual(['t1', 't2']);
    expect(corpus.byFacet('m1', 'facet-two').map((f) => f.id)).toEqual(['r1']);
    expect(corpus.byFacet('m1', 'absent-facet')).toEqual([]);
  });

  it('resolves a fact by id and returns undefined for an unknown one', () => {
    expect(corpus.find('r1')?.kind).toBe('Rule');
    expect(corpus.find('nope')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/core/corpus.test.ts`
Expected: FAIL — cannot resolve `src/core/corpus.js`.

- [ ] **Step 3: Write `src/core/corpus.ts`**

```ts
import type { Fact, FactId, FactKind } from './fact.js';

/** A read-only view over imported Facts. This slice never mutates a Corpus (LAW-003). */
export interface Corpus {
  readonly facts: readonly Fact[];
  byKind(kind: FactKind): Fact[];
  byModule(moduleId: FactId): Fact[];
  byFacet(moduleId: FactId, facet: string): Fact[];
  moduleIds(): FactId[];
  find(id: FactId): Fact | undefined;
}

export function buildCorpus(facts: Fact[]): Corpus {
  const byId = new Map<FactId, Fact>(facts.map((f) => [f.id, f]));
  return {
    facts,
    byKind: (kind) => facts.filter((f) => f.kind === kind),
    byModule: (moduleId) => facts.filter((f) => f.moduleId === moduleId),
    byFacet: (moduleId, facet) =>
      facts.filter((f) => f.moduleId === moduleId && f.facet === facet),
    moduleIds: () => facts.filter((f) => f.kind === 'Module').map((f) => f.id),
    find: (id) => byId.get(id),
  };
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm test tests/core/corpus.test.ts`
Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/corpus.ts tests/core/corpus.test.ts
git commit -m "feat: read-only Corpus projection with lookups"
```

---

### Task 4: Fixture corpus A and Profile A

**Files:**
- Create: `fixtures/corpus-a/alpha/overview.md`, `fixtures/corpus-a/alpha/terms.md`, `fixtures/corpus-a/alpha/rules.md`, `fixtures/corpus-a/beta/overview.md`, `fixtures/corpus-a/beta/terms.md`
- Create: `fixtures/profile-a.json`
- Test: `tests/fixtures/profile-a.test.ts`

**Interfaces:**
- Consumes: `loadProfile`.
- Produces: fixture paths used by every later task. Deliberate defects: `beta` has a split identity, a broken reference, and a conflicting definition.

- [ ] **Step 1: Create the fixture documents**

`fixtures/corpus-a/alpha/overview.md`:
```markdown
---
area: alpha
kind: overview
state: Agreed
stewart: avery
---

# Alpha

Alpha handles the first thing.
```

`fixtures/corpus-a/alpha/terms.md`:
```markdown
---
area: alpha
kind: terms
state: Agreed
stewart: avery
---

| Word | Meaning | Also called |
| --- | --- | --- |
| Widget | A thing that is made. | Gadget |
| Sprocket | A thing that turns. | |
```

`fixtures/corpus-a/alpha/rules.md`:
```markdown
---
area: alpha
kind: rules
state: Guess - From System X
stewart: avery
---

## R-1 Widgets are made once

*Invariant.*

A Widget may not be made twice. See [R-2](rules.md#r-2-sprockets-turn).

## R-2 Sprockets turn

*Invariant.*

A Sprocket turns when asked.
```

`fixtures/corpus-a/beta/overview.md`:
```markdown
---
area: beta
kind: overview
state: Guess - From System X
---

# Beta

Beta handles the second thing.
```

`fixtures/corpus-a/beta/terms.md`:
```markdown
---
area: bravo
kind: terms
state: Guess - From System X
---

| Word | Meaning | Also called |
| --- | --- | --- |
| Widget | A thing that is bought. | |
| Cog | A thing that meshes. See [R-9](../alpha/rules.md#r-9-missing). | |
```

Note the deliberate defects: `beta/terms.md` declares `area: bravo` (split identity), redefines `Widget` differently (conflicting definition), and links to a non-existent `R-9` (broken reference). `beta` has no `stewart` (missing owner).

- [ ] **Step 2: Create `fixtures/profile-a.json`**

```json
{
  "id": "corpus-a",
  "adapter": {
    "kind": "markdown-frontmatter",
    "root": "./corpus-a",
    "moduleIdKey": "area",
    "facetKey": "kind",
    "statusKey": "state",
    "ownerKey": "stewart"
  },
  "facets": [
    { "name": "overview", "factKind": "Module", "extractor": "document", "bodyAttribute": "description" },
    { "name": "terms", "factKind": "Term", "extractor": "table",
      "columns": { "Word": "name", "Meaning": "definition", "Also called": "aliases" } },
    { "name": "rules", "factKind": "Rule", "extractor": "heading", "bodyAttribute": "statement" }
  ],
  "maturity": { "levels": ["blank", "guessed", "agreed"], "approvedAtOrAbove": "agreed" },
  "statusMappings": [
    { "match": "Guess - From System X", "maturity": "guessed", "sources": ["system-x"] },
    { "match": "Agreed", "maturity": "agreed", "sources": ["system-x", "review"] }
  ],
  "criteria": {
    "Module": [{ "type": "requiredAttributes", "attributes": ["description"] }],
    "Term": [{ "type": "requiredAttributes", "attributes": ["name", "definition"] }],
    "Rule": [
      { "type": "requiredAttributes", "attributes": ["name", "statement"] },
      { "type": "minSources", "count": 1 }
    ]
  }
}
```

- [ ] **Step 3: Write the test**

`tests/fixtures/profile-a.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { loadProfile } from '../../src/profile/load.js';

describe('fixture profile A', () => {
  it('loads and declares three facets across three Fact Kinds', async () => {
    const profile = await loadProfile('fixtures/profile-a.json');
    expect(profile.facets.map((f) => f.factKind)).toEqual(['Module', 'Term', 'Rule']);
    expect(profile.adapter.moduleIdKey).toBe('area');
  });
});
```

- [ ] **Step 4: Run test**

Run: `pnpm test tests/fixtures/profile-a.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add fixtures/corpus-a fixtures/profile-a.json tests/fixtures/profile-a.test.ts
git commit -m "test: fixture corpus A with deliberate integrity defects"
```

---

### Task 5: Markdown adapter — discovery, frontmatter, facet routing

**Files:**
- Create: `src/ingestion/adapter.ts`, `src/ingestion/markdown/discover.ts`, `src/ingestion/markdown/document.ts`
- Test: `tests/ingestion/document.test.ts`

**Interfaces:**
- Consumes: `Profile`, `Fact`, `Finding`, `decomposeStatus`.
- Produces: `SeedResult { facts, findings }`, `SeedAdapter`, `discoverDocuments(root): Promise<string[]>`, `ParsedDocument { file, data, body, bodyStartLine }`, `parseDocument(file): Promise<ParsedDocument | null>`.

- [ ] **Step 1: Write the failing test**

`tests/ingestion/document.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { discoverDocuments } from '../../src/ingestion/markdown/discover.js';
import { parseDocument } from '../../src/ingestion/markdown/document.js';

describe('document discovery and parsing', () => {
  it('finds every markdown document under a root, sorted for determinism', async () => {
    const files = await discoverDocuments('fixtures/corpus-a');
    expect(files.map((f) => f.replace(/.*corpus-a\//, ''))).toEqual([
      'alpha/overview.md',
      'alpha/rules.md',
      'alpha/terms.md',
      'beta/overview.md',
      'beta/terms.md',
    ]);
  });

  it('parses frontmatter and reports the line the body starts on', async () => {
    const doc = await parseDocument('fixtures/corpus-a/alpha/terms.md');
    expect(doc?.data.area).toBe('alpha');
    expect(doc?.data.kind).toBe('terms');
    expect(doc?.bodyStartLine).toBeGreaterThan(1);
    expect(doc?.body).toContain('Widget');
  });

  it('returns null for a document with no frontmatter', async () => {
    const doc = await parseDocument('fixtures/profile-a.json');
    expect(doc).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/ingestion/document.test.ts`
Expected: FAIL — cannot resolve the modules.

- [ ] **Step 3: Write `src/ingestion/adapter.ts`**

```ts
import type { Fact } from '../core/fact.js';
import type { Finding } from '../core/finding.js';
import type { Profile } from '../profile/profile.js';

/**
 * The payload a Seed Adapter produces: a whole Corpus state, not a set of changes.
 * In this slice it is consumed read-only. Step 3 will submit this same shape through
 * the Door's Load operation, recorded as one Genesis entry (ADR-0012) — never as a
 * Change Request, and never as one event per Fact.
 */
export interface SeedResult {
  facts: Fact[];
  findings: Finding[];
}

export interface SeedAdapter {
  load(profile: Profile): Promise<SeedResult>;
}
```

- [ ] **Step 4: Write `src/ingestion/markdown/discover.ts`**

```ts
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

/** Every `.md` document under `root`, depth-first, sorted for deterministic output. */
export async function discoverDocuments(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const found: string[] = [];
  for (const entry of [...entries].sort((a, b) => a.name.localeCompare(b.name))) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) found.push(...(await discoverDocuments(path)));
    else if (entry.name.endsWith('.md')) found.push(path);
  }
  return found;
}
```

- [ ] **Step 5: Write `src/ingestion/markdown/document.ts`**

```ts
import { readFile } from 'node:fs/promises';
import matter from 'gray-matter';

export interface ParsedDocument {
  file: string;
  data: Record<string, unknown>;
  body: string;
  /** 1-indexed line in the original file where the body begins. */
  bodyStartLine: number;
}

export async function parseDocument(file: string): Promise<ParsedDocument | null> {
  const text = await readFile(file, 'utf8');
  if (!text.startsWith('---')) return null;

  const parsed = matter(text);
  if (Object.keys(parsed.data).length === 0) return null;

  const consumed = text.slice(0, text.length - parsed.content.length);
  const bodyStartLine = consumed.split('\n').length;

  return {
    file,
    data: parsed.data as Record<string, unknown>,
    body: parsed.content,
    bodyStartLine,
  };
}
```

- [ ] **Step 6: Run tests**

Run: `pnpm test tests/ingestion/document.test.ts`
Expected: 3 tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/ingestion tests/ingestion
git commit -m "feat: markdown document discovery and frontmatter parsing"
```

---

### Task 6: Body extractors

**Files:**
- Create: `src/ingestion/markdown/extractors.ts`
- Test: `tests/ingestion/extractors.test.ts`

**Interfaces:**
- Consumes: `FacetSpec`, `ParsedDocument`.
- Produces: `ExtractedItem { attributes, relations, line }`, `extract(doc, facet): ExtractedItem[]`.

- [ ] **Step 1: Write the failing test**

`tests/ingestion/extractors.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { parseDocument } from '../../src/ingestion/markdown/document.js';
import { extract } from '../../src/ingestion/markdown/extractors.js';
import type { FacetSpec } from '../../src/profile/profile.js';

describe('extractors', () => {
  it('document extractor yields exactly one item carrying the whole body', async () => {
    const doc = await parseDocument('fixtures/corpus-a/alpha/overview.md');
    const facet: FacetSpec = {
      name: 'overview', factKind: 'Module', extractor: 'document', bodyAttribute: 'description',
    };
    const items = extract(doc!, facet);
    expect(items).toHaveLength(1);
    expect(String(items[0]!.attributes.description)).toContain('first thing');
  });

  it('table extractor yields one item per row, mapping headers to attributes', async () => {
    const doc = await parseDocument('fixtures/corpus-a/alpha/terms.md');
    const facet: FacetSpec = {
      name: 'terms', factKind: 'Term', extractor: 'table',
      columns: { Word: 'name', Meaning: 'definition', 'Also called': 'aliases' },
    };
    const items = extract(doc!, facet);
    expect(items).toHaveLength(2);
    expect(items[0]!.attributes.name).toBe('Widget');
    expect(items[0]!.attributes.definition).toBe('A thing that is made.');
    expect(items[1]!.attributes.name).toBe('Sprocket');
    expect(items[1]!.line).toBeGreaterThan(items[0]!.line);
  });

  it('heading extractor yields one item per section and collects links as relations', async () => {
    const doc = await parseDocument('fixtures/corpus-a/alpha/rules.md');
    const facet: FacetSpec = {
      name: 'rules', factKind: 'Rule', extractor: 'heading', bodyAttribute: 'statement',
    };
    const items = extract(doc!, facet);
    expect(items).toHaveLength(2);
    expect(items[0]!.attributes.name).toBe('R-1 Widgets are made once');
    expect(items[0]!.relations.map((r) => r.targetRef)).toEqual(['r-2-sprockets-turn']);
    expect(items[1]!.relations).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/ingestion/extractors.test.ts`
Expected: FAIL — cannot resolve `extractors.js`.

- [ ] **Step 3: Write `src/ingestion/markdown/extractors.ts`**

```ts
import type { AttributeValue, Relation } from '../../core/fact.js';
import type { FacetSpec } from '../../profile/profile.js';
import type { ParsedDocument } from './document.js';

export interface ExtractedItem {
  attributes: Record<string, AttributeValue>;
  relations: Relation[];
  /** 1-indexed line in the original file. */
  line: number;
}

const LINK = /\[[^\]]*\]\(([^)]+)\)/g;

/** Collects markdown link targets, reduced to their fragment where one exists. */
function relationsIn(text: string): Relation[] {
  const out: Relation[] = [];
  for (const match of text.matchAll(LINK)) {
    const target = match[1]!;
    const hash = target.indexOf('#');
    out.push({ type: 'reference', targetRef: hash >= 0 ? target.slice(hash + 1) : target });
  }
  return out;
}

function extractDocument(doc: ParsedDocument, facet: FacetSpec): ExtractedItem[] {
  const attribute = facet.bodyAttribute ?? 'body';
  const text = doc.body.trim();
  if (text === '') return [];
  return [{ attributes: { [attribute]: text }, relations: relationsIn(text), line: doc.bodyStartLine }];
}

function extractTable(doc: ParsedDocument, facet: FacetSpec): ExtractedItem[] {
  const columns = facet.columns ?? {};
  const lines = doc.body.split('\n');
  const items: ExtractedItem[] = [];
  let headers: string[] | null = null;

  for (const [offset, line] of lines.entries()) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|')) { headers = null; continue; }

    const cells = trimmed.slice(1, trimmed.endsWith('|') ? -1 : undefined)
      .split('|').map((c) => c.trim());

    if (headers === null) { headers = cells; continue; }
    if (cells.every((c) => /^-+$/.test(c.replace(/\s/g, '')))) continue;

    const attributes: Record<string, AttributeValue> = {};
    const relations: Relation[] = [];
    for (const [index, header] of headers.entries()) {
      const name = columns[header];
      const value = cells[index] ?? '';
      if (name === undefined || value === '') continue;
      attributes[name] = value.replace(/\*\*/g, '');
      relations.push(...relationsIn(value));
    }
    if (Object.keys(attributes).length > 0) {
      items.push({ attributes, relations, line: doc.bodyStartLine + offset });
    }
  }
  return items;
}

function slugify(heading: string): string {
  return heading.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function extractHeading(doc: ParsedDocument, facet: FacetSpec): ExtractedItem[] {
  const attribute = facet.bodyAttribute ?? 'body';
  const lines = doc.body.split('\n');
  const items: ExtractedItem[] = [];
  let current: { name: string; line: number; body: string[] } | null = null;

  const flush = (): void => {
    if (current === null) return;
    const text = current.body.join('\n').trim();
    items.push({
      attributes: { name: current.name, slug: slugify(current.name), [attribute]: text },
      relations: relationsIn(text),
      line: current.line,
    });
  };

  for (const [offset, line] of lines.entries()) {
    const heading = /^##\s+(.*)$/.exec(line);
    if (heading) {
      flush();
      current = { name: heading[1]!.trim(), line: doc.bodyStartLine + offset, body: [] };
    } else if (current !== null) {
      current.body.push(line);
    }
  }
  flush();
  return items;
}

export function extract(doc: ParsedDocument, facet: FacetSpec): ExtractedItem[] {
  switch (facet.extractor) {
    case 'document': return extractDocument(doc, facet);
    case 'table': return extractTable(doc, facet);
    case 'heading': return extractHeading(doc, facet);
  }
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm test tests/ingestion/extractors.test.ts`
Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ingestion/markdown/extractors.ts tests/ingestion/extractors.test.ts
git commit -m "feat: document, table, and heading body extractors"
```

---

### Task 7: Assemble the adapter and emit the parse-failure report

**Files:**
- Create: `src/ingestion/markdown/index.ts`
- Test: `tests/ingestion/markdown-adapter.test.ts`

**Interfaces:**
- Consumes: `discoverDocuments`, `parseDocument`, `extract`, `decomposeStatus`, `SeedResult`.
- Produces: `markdownAdapter: SeedAdapter`, and `loadCorpus(profile): Promise<{ corpus: Corpus; findings: Finding[] }>`.

- [ ] **Step 1: Write the failing test**

`tests/ingestion/markdown-adapter.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { loadCorpus } from '../../src/ingestion/markdown/index.js';
import { loadProfile } from '../../src/profile/load.js';

describe('markdown adapter', () => {
  it('imports every facet into typed Facts with origins', async () => {
    const profile = await loadProfile('fixtures/profile-a.json');
    const { corpus } = await loadCorpus(profile);

    // moduleIds() lists Module facts only. 'bravo' is declared by a Term document,
    // so it does not appear here — Task 10's allModuleIds() is what surfaces it.
    expect(corpus.moduleIds().sort()).toEqual(['alpha', 'beta']);
    expect(corpus.byKind('Term').map((f) => f.attributes.name).sort())
      .toEqual(['Cog', 'Sprocket', 'Widget', 'Widget']);
    expect(corpus.facts.every((f) => f.origin.line > 0)).toBe(true);
  });

  it('decomposes the corpus status into a level and sources (ADR-0006)', async () => {
    const profile = await loadProfile('fixtures/profile-a.json');
    const { corpus } = await loadCorpus(profile);

    const agreed = corpus.facts.find((f) => f.origin.file.includes('alpha/terms.md'));
    expect(agreed?.maturityLevel).toBe('agreed');
    expect(agreed?.sources).toEqual(['system-x', 'review']);

    const guessed = corpus.facts.find((f) => f.origin.file.includes('alpha/rules.md'));
    expect(guessed?.maturityLevel).toBe('guessed');
    expect(guessed?.sources).toEqual(['system-x']);
  });

  it('reports an unrecognised status as a Finding rather than swallowing it', async () => {
    const profile = await loadProfile('fixtures/profile-a.json');
    const mangled = {
      ...profile,
      statusMappings: profile.statusMappings.filter((m) => m.match === 'Agreed'),
    };
    const { findings } = await loadCorpus(mangled);
    const unknown = findings.filter((f) => f.code === 'unknown-status');
    expect(unknown.length).toBeGreaterThan(0);
    expect(unknown[0]!.message).toContain('Guess - From System X');
    expect(unknown[0]!.origin.file).toMatch(/\.md$/);
  });
});
```

Note: `beta/terms.md` declares `area: bravo`, so a third module identity now exists in the corpus even though no Module fact carries it. `moduleIds()` cannot see it; `allModuleIds()` (Task 10) can, and Task 14 turns it into a `split-identity` Finding.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/ingestion/markdown-adapter.test.ts`
Expected: FAIL — cannot resolve `src/ingestion/markdown/index.js`.

- [ ] **Step 3: Write `src/ingestion/markdown/index.ts`**

```ts
import { relative } from 'node:path';
import { buildCorpus, type Corpus } from '../../core/corpus.js';
import type { Fact } from '../../core/fact.js';
import type { Finding } from '../../core/finding.js';
import { decomposeStatus } from '../../profile/maturity.js';
import type { Profile } from '../../profile/profile.js';
import type { SeedResult } from '../adapter.js';
import { discoverDocuments } from './discover.js';
import { parseDocument } from './document.js';
import { extract } from './extractors.js';

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

export async function loadSeed(profile: Profile): Promise<SeedResult> {
  const { root, moduleIdKey, facetKey, statusKey, ownerKey } = profile.adapter;
  const facts: Fact[] = [];
  const findings: Finding[] = [];

  for (const file of await discoverDocuments(root)) {
    const containerId = relative(root, file).split('/').slice(0, -1).join('/') || '.';
    const doc = await parseDocument(file);

    if (doc === null) {
      findings.push({
        code: 'unparsable-document', moduleId: null,
        message: `No frontmatter found; the document could not be interpreted`,
        origin: { file, line: 1 },
      });
      continue;
    }

    const moduleId = text(doc.data[moduleIdKey]);
    const facetName = text(doc.data[facetKey]);
    const origin = { file, line: 1 };

    if (moduleId === null) {
      findings.push({
        code: 'missing-module-identity', moduleId: null,
        message: `Frontmatter key "${moduleIdKey}" is absent or empty`, origin,
      });
      continue;
    }

    const facet = profile.facets.find((f) => f.name === facetName);
    if (facet === undefined) {
      findings.push({
        code: 'unparsable-document', moduleId,
        message: `Frontmatter key "${facetKey}" has value "${facetName ?? ''}", which no facet declares`,
        origin,
      });
      continue;
    }

    const rawStatus = text(doc.data[statusKey]);
    let maturityLevel: string | null = null;
    let sources: string[] = [];
    if (rawStatus !== null) {
      const decomposed = decomposeStatus(profile, rawStatus);
      if (decomposed === null) {
        findings.push({
          code: 'unknown-status', moduleId,
          message: `Status "${rawStatus}" matches no mapping in profile "${profile.id}"`, origin,
        });
      } else {
        maturityLevel = decomposed.maturityLevel;
        sources = decomposed.sources;
      }
    }

    const owner = ownerKey === undefined ? null : text(doc.data[ownerKey]);

    for (const [index, item] of extract(doc, facet).entries()) {
      const attributes = { ...item.attributes };
      if (facet.factKind === 'Module') {
        attributes.name = moduleId;
        if (owner !== null) attributes.owner = owner;
      }
      facts.push({
        id: facet.factKind === 'Module' ? moduleId : `${moduleId}/${facet.name}/${index}`,
        kind: facet.factKind,
        moduleId: facet.factKind === 'Module' ? null : moduleId,
        facet: facet.name,
        containerId,
        attributes,
        relations: item.relations,
        maturityLevel,
        sources,
        origin: { file, line: item.line },
      });
    }
  }

  return { facts, findings };
}

export const markdownAdapter = { load: loadSeed };

export async function loadCorpus(
  profile: Profile,
): Promise<{ corpus: Corpus; findings: Finding[] }> {
  const { facts, findings } = await loadSeed(profile);
  return { corpus: buildCorpus(facts), findings };
}
```

- [ ] **Step 4: Run tests and typecheck**

Run: `pnpm test && pnpm typecheck`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ingestion/markdown/index.ts tests/ingestion/markdown-adapter.test.ts
git commit -m "feat: assemble markdown adapter with parse-failure findings"
```

---

### Task 8: Fixture corpus B — the two-corpus rule

**Files:**
- Create: `fixtures/corpus-b/one.md`, `fixtures/corpus-b/two.md`, `fixtures/corpus-b/three.md`
- Create: `fixtures/profile-b.json`
- Test: `tests/fixtures/two-corpus.test.ts`

**Interfaces:**
- Consumes: `loadProfile`, `loadCorpus`.
- Produces: the second fixture every later task must also pass against (ADR-0001).

Corpus B is deliberately dissimilar to A on five axes: flat layout instead of nested; different frontmatter keys; numeric maturity levels instead of prose; two facets instead of three; owners supplied by the Profile rather than the documents.

- [ ] **Step 1: Create the fixture documents**

`fixtures/corpus-b/one.md`:
```markdown
---
zone: one
part: definitions
level: 2
---

## Lever

A bar that pivots.

## Fulcrum

The point a Lever pivots on.
```

`fixtures/corpus-b/two.md`:
```markdown
---
zone: one
part: constraints
level: 1
---

## C1

A Lever must have exactly one Fulcrum.
```

`fixtures/corpus-b/three.md`:
```markdown
---
zone: two
part: definitions
level: 0
---

## Pulley

A wheel that redirects force.
```

- [ ] **Step 2: Create `fixtures/profile-b.json`**

```json
{
  "id": "corpus-b",
  "adapter": {
    "kind": "markdown-frontmatter",
    "root": "./corpus-b",
    "moduleIdKey": "zone",
    "facetKey": "part",
    "statusKey": "level"
  },
  "facets": [
    { "name": "definitions", "factKind": "Term", "extractor": "heading", "bodyAttribute": "definition" },
    { "name": "constraints", "factKind": "Rule", "extractor": "heading", "bodyAttribute": "statement" }
  ],
  "maturity": { "levels": ["0", "1", "2"], "approvedAtOrAbove": "2" },
  "statusMappings": [
    { "match": "0", "maturity": "0", "sources": [] },
    { "match": "1", "maturity": "1", "sources": ["import"] },
    { "match": "2", "maturity": "2", "sources": ["import", "signoff"] }
  ],
  "criteria": {
    "Term": [{ "type": "requiredAttributes", "attributes": ["name", "definition"] }],
    "Rule": [{ "type": "requiredAttributes", "attributes": ["name", "statement"] }]
  },
  "owners": { "one": "quinn", "two": "quinn" }
}
```

Note: corpus B has no `Module` facet at all, so `moduleIds()` will be empty. Task 10 must derive rows from facts, not from `Module` facts alone — this fixture is what forces that.

- [ ] **Step 3: Write the test**

`tests/fixtures/two-corpus.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { loadCorpus } from '../../src/ingestion/markdown/index.js';
import { loadProfile } from '../../src/profile/load.js';

describe('two-corpus rule (ADR-0001)', () => {
  it('imports a corpus with a different layout, keys, and maturity vocabulary', async () => {
    const profile = await loadProfile('fixtures/profile-b.json');
    const { corpus, findings } = await loadCorpus(profile);

    expect(findings.filter((f) => f.code === 'unknown-status')).toEqual([]);
    expect(corpus.byKind('Term').map((f) => f.attributes.name).sort())
      .toEqual(['Fulcrum', 'Lever', 'Pulley']);
    expect(corpus.byKind('Rule')).toHaveLength(1);
  });

  it('handles numeric maturity levels coerced to strings', async () => {
    const profile = await loadProfile('fixtures/profile-b.json');
    const { corpus } = await loadCorpus(profile);
    const lever = corpus.byKind('Term').find((f) => f.attributes.name === 'Lever');
    expect(lever?.maturityLevel).toBe('2');
    expect(lever?.sources).toEqual(['import', 'signoff']);
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `pnpm test tests/fixtures/two-corpus.test.ts`
Expected: FAIL — `level: 2` parses as a number, so `text()` returns null and the status is never decomposed.

- [ ] **Step 5: Fix the leak in `src/ingestion/markdown/index.ts`**

Replace the `text` helper so scalar frontmatter values coerce:

```ts
function text(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() === '' ? null : value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return null;
}
```

- [ ] **Step 6: Run all tests**

Run: `pnpm test`
Expected: all PASS, both corpora.

- [ ] **Step 7: Commit**

```bash
git add fixtures/corpus-b fixtures/profile-b.json tests/fixtures/two-corpus.test.ts src/ingestion/markdown/index.ts
git commit -m "test: dissimilar fixture corpus B, enforcing the two-corpus rule"
```

---

### Task 9: Well-formedness criteria engine

**Files:**
- Create: `src/readiness/wellformed.ts`
- Test: `tests/readiness/wellformed.test.ts`

**Interfaces:**
- Consumes: `Fact`, `Corpus`, `Profile`, `Criterion`.
- Produces: `UnmetCriterion { criterion: string; detail: string }`, `evaluateFact(fact, profile): UnmetCriterion[]`, `evaluateFacet(facts, kind, profile): UnmetCriterion[]`.

- [ ] **Step 1: Write the failing test**

`tests/readiness/wellformed.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import type { Fact } from '../../src/core/fact.js';
import { evaluateFacet, evaluateFact } from '../../src/readiness/wellformed.js';
import type { Profile } from '../../src/profile/profile.js';

const base: Profile = {
  id: 'p',
  adapter: { kind: 'markdown-frontmatter', root: '.', moduleIdKey: 'm', facetKey: 'f', statusKey: 's' },
  facets: [],
  maturity: { levels: ['a'], approvedAtOrAbove: 'a' },
  statusMappings: [],
  criteria: {
    Rule: [
      { type: 'requiredAttributes', attributes: ['name', 'statement'] },
      { type: 'minSources', count: 1 },
    ],
    Transition: [{ type: 'allStatesReachable', fromAttribute: 'from', toAttribute: 'to' }],
  },
};

function fact(over: Partial<Fact>): Fact {
  return {
    id: 'f', kind: 'Rule', moduleId: 'm', facet: 'x', containerId: 'c',
    attributes: {}, relations: [], maturityLevel: null, sources: [],
    origin: { file: 'a.md', line: 1 }, ...over,
  };
}

describe('well-formedness engine', () => {
  it('passes a fact meeting every criterion', () => {
    expect(evaluateFact(fact({ attributes: { name: 'n', statement: 's' }, sources: ['x'] }), base))
      .toEqual([]);
  });

  it('names each missing attribute', () => {
    const unmet = evaluateFact(fact({ attributes: { name: 'n' }, sources: ['x'] }), base);
    expect(unmet).toHaveLength(1);
    expect(unmet[0]!.detail).toContain('statement');
  });

  it('reports too few sources', () => {
    const unmet = evaluateFact(fact({ attributes: { name: 'n', statement: 's' } }), base);
    expect(unmet.map((u) => u.criterion)).toEqual(['minSources']);
  });

  it('applies no criteria to a Fact Kind the profile does not constrain', () => {
    expect(evaluateFact(fact({ kind: 'Term', attributes: {} }), base)).toEqual([]);
  });

  it('flags an unreachable state across a facet', () => {
    const facts = [
      fact({ id: 't1', kind: 'Transition', attributes: { from: 'draft', to: 'sent' } }),
      fact({ id: 't2', kind: 'Transition', attributes: { from: 'lost', to: 'lost' } }),
    ];
    const unmet = evaluateFacet(facts, 'Transition', base);
    expect(unmet).toHaveLength(1);
    expect(unmet[0]!.detail).toContain('lost');
  });

  it('accepts a fully reachable transition graph', () => {
    const facts = [
      fact({ id: 't1', kind: 'Transition', attributes: { from: 'draft', to: 'sent' } }),
      fact({ id: 't2', kind: 'Transition', attributes: { from: 'sent', to: 'done' } }),
    ];
    expect(evaluateFacet(facts, 'Transition', base)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/readiness/wellformed.test.ts`
Expected: FAIL — cannot resolve `src/readiness/wellformed.js`.

- [ ] **Step 3: Write `src/readiness/wellformed.ts`**

```ts
import type { Fact, FactKind } from '../core/fact.js';
import type { Criterion, Profile } from '../profile/profile.js';

export interface UnmetCriterion {
  criterion: Criterion['type'];
  detail: string;
}

function attributeIsPresent(fact: Fact, name: string): boolean {
  const value = fact.attributes[name];
  if (value === undefined) return false;
  return Array.isArray(value) ? value.length > 0 : value.trim() !== '';
}

/** Criteria evaluated against one Fact in isolation. */
export function evaluateFact(fact: Fact, profile: Profile): UnmetCriterion[] {
  const unmet: UnmetCriterion[] = [];
  for (const criterion of profile.criteria[fact.kind] ?? []) {
    switch (criterion.type) {
      case 'requiredAttributes': {
        const missing = criterion.attributes.filter((a) => !attributeIsPresent(fact, a));
        if (missing.length > 0) {
          unmet.push({ criterion: 'requiredAttributes', detail: `missing: ${missing.join(', ')}` });
        }
        break;
      }
      case 'minSources': {
        if (fact.sources.length < criterion.count) {
          unmet.push({
            criterion: 'minSources',
            detail: `has ${fact.sources.length}, needs ${criterion.count}`,
          });
        }
        break;
      }
      case 'minRelations': {
        const count = fact.relations.filter((r) => r.type === criterion.relation).length;
        if (count < criterion.count) {
          unmet.push({
            criterion: 'minRelations',
            detail: `has ${count} "${criterion.relation}", needs ${criterion.count}`,
          });
        }
        break;
      }
      case 'allStatesReachable':
        break; // evaluated across a facet, not per fact
    }
  }
  return unmet;
}

/** Criteria that need every Fact in a facet at once. */
export function evaluateFacet(
  facts: Fact[],
  kind: FactKind,
  profile: Profile,
): UnmetCriterion[] {
  const unmet: UnmetCriterion[] = [];
  for (const criterion of profile.criteria[kind] ?? []) {
    if (criterion.type !== 'allStatesReachable') continue;
    if (facts.length === 0) continue;

    const edges = facts.flatMap((f) => {
      const from = f.attributes[criterion.fromAttribute];
      const to = f.attributes[criterion.toAttribute];
      return typeof from === 'string' && typeof to === 'string' ? [[from, to] as const] : [];
    });

    const states = new Set(edges.flat());
    const targets = new Set(edges.map(([, to]) => to));
    const roots = [...states].filter((s) => !targets.has(s));

    const reached = new Set(roots);
    const queue = [...roots];
    while (queue.length > 0) {
      const state = queue.shift()!;
      for (const [from, to] of edges) {
        if (from === state && !reached.has(to)) { reached.add(to); queue.push(to); }
      }
    }

    const orphans = [...states].filter((s) => !reached.has(s)).sort();
    if (orphans.length > 0) {
      unmet.push({
        criterion: 'allStatesReachable',
        detail: `unreachable: ${orphans.join(', ')}`,
      });
    }
  }
  return unmet;
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm test tests/readiness/wellformed.test.ts`
Expected: 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/readiness/wellformed.ts tests/readiness/wellformed.test.ts
git commit -m "feat: profile-driven well-formedness criteria engine"
```

---

### Task 10: Module Owner resolution

**Files:**
- Create: `src/readiness/owner.ts`
- Test: `tests/readiness/owner.test.ts`

**Interfaces:**
- Consumes: `Corpus`, `Profile`, `Finding`.
- Produces: `resolveOwners(corpus, profile): { owners: Map<string, string>; findings: Finding[] }`.

ADR-0010 makes an owner mandatory, so a module without one produces a `missing-owner` Finding. Two mechanisms are supported because which one real corpora use is an open question.

- [ ] **Step 1: Write the failing test**

`tests/readiness/owner.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { loadCorpus } from '../../src/ingestion/markdown/index.js';
import { loadProfile } from '../../src/profile/load.js';
import { resolveOwners } from '../../src/readiness/owner.js';

describe('Module Owner resolution (ADR-0010)', () => {
  it('reads an owner from the document when the adapter declares a key', async () => {
    const profile = await loadProfile('fixtures/profile-a.json');
    const { corpus } = await loadCorpus(profile);
    const { owners } = resolveOwners(corpus, profile);
    expect(owners.get('alpha')).toBe('avery');
  });

  it('raises a Finding for a module with no resolvable owner', async () => {
    const profile = await loadProfile('fixtures/profile-a.json');
    const { corpus } = await loadCorpus(profile);
    const { findings } = resolveOwners(corpus, profile);
    const missing = findings.filter((f) => f.code === 'missing-owner').map((f) => f.moduleId);
    expect(missing).toContain('beta');
  });

  it('falls back to the profile owner map when the corpus carries none', async () => {
    const profile = await loadProfile('fixtures/profile-b.json');
    const { corpus } = await loadCorpus(profile);
    const { owners, findings } = resolveOwners(corpus, profile);
    expect(owners.get('one')).toBe('quinn');
    expect(findings.filter((f) => f.code === 'missing-owner')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/readiness/owner.test.ts`
Expected: FAIL — cannot resolve `src/readiness/owner.js`.

- [ ] **Step 3: Write `src/readiness/owner.ts`**

```ts
import type { Corpus } from '../core/corpus.js';
import type { Finding } from '../core/finding.js';
import type { Profile } from '../profile/profile.js';

export interface OwnerResolution {
  owners: Map<string, string>;
  findings: Finding[];
}

/** Every module id appearing anywhere in the corpus, whether or not it has a Module fact. */
export function allModuleIds(corpus: Corpus): string[] {
  const ids = new Set<string>(corpus.moduleIds());
  for (const fact of corpus.facts) {
    if (fact.moduleId !== null) ids.add(fact.moduleId);
  }
  return [...ids].sort();
}

export function resolveOwners(corpus: Corpus, profile: Profile): OwnerResolution {
  const owners = new Map<string, string>();
  const findings: Finding[] = [];

  for (const moduleId of allModuleIds(corpus)) {
    const fromCorpus = corpus.find(moduleId)?.attributes.owner;
    const owner =
      typeof fromCorpus === 'string' && fromCorpus.trim() !== ''
        ? fromCorpus.trim()
        : profile.owners?.[moduleId];

    if (owner === undefined) {
      const anyFact = corpus.byModule(moduleId)[0] ?? corpus.find(moduleId);
      findings.push({
        code: 'missing-owner',
        moduleId,
        message: `Module "${moduleId}" has no owner; findings for it route to nobody`,
        origin: anyFact?.origin ?? { file: profile.adapter.root, line: 1 },
      });
      continue;
    }
    owners.set(moduleId, owner);
  }

  return { owners, findings };
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm test tests/readiness/owner.test.ts`
Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/readiness/owner.ts tests/readiness/owner.test.ts
git commit -m "feat: Module Owner resolution with missing-owner findings"
```

---

### Task 11: Readiness Matrix and scoring

**Files:**
- Create: `src/readiness/matrix.ts`, `src/readiness/score.ts`
- Test: `tests/readiness/matrix.test.ts`

**Interfaces:**
- Consumes: `Corpus`, `Profile`, `evaluateFact`, `evaluateFacet`, `isApproved`, `allModuleIds`, `resolveOwners`.
- Produces: `FacetState = 'absent' | 'present' | 'well-formed' | 'approved'`, `MatrixCell`, `ModuleRow`, `Matrix`, `buildMatrix(corpus, profile)`, `ModuleScore`, `scoreMatrix(matrix): ModuleScore[]`.

- [ ] **Step 1: Write the failing test**

`tests/readiness/matrix.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { loadCorpus } from '../../src/ingestion/markdown/index.js';
import { loadProfile } from '../../src/profile/load.js';
import { buildMatrix } from '../../src/readiness/matrix.js';
import { scoreMatrix } from '../../src/readiness/score.js';

describe('Readiness Matrix', () => {
  it('grades every module against every declared facet', async () => {
    const profile = await loadProfile('fixtures/profile-a.json');
    const { corpus } = await loadCorpus(profile);
    const matrix = buildMatrix(corpus, profile);

    expect(matrix.facets).toEqual(['overview', 'terms', 'rules']);
    const alpha = matrix.rows.find((r) => r.moduleId === 'alpha')!;
    expect(alpha.cells.map((c) => c.state)).toEqual(['approved', 'approved', 'well-formed']);
    expect(alpha.owner).toBe('avery');
  });

  it('marks a facet absent when the module has no facts for it', async () => {
    const profile = await loadProfile('fixtures/profile-a.json');
    const { corpus } = await loadCorpus(profile);
    const matrix = buildMatrix(corpus, profile);

    const beta = matrix.rows.find((r) => r.moduleId === 'beta')!;
    expect(beta.cells.find((c) => c.facet === 'rules')!.state).toBe('absent');
    expect(beta.owner).toBeNull();
  });

  it('reports each score with its denominator (LAW-006)', async () => {
    const profile = await loadProfile('fixtures/profile-a.json');
    const { corpus } = await loadCorpus(profile);
    const scores = scoreMatrix(buildMatrix(corpus, profile));

    const alpha = scores.find((s) => s.moduleId === 'alpha')!;
    expect(alpha.total).toBe(3);
    expect(alpha.present).toBe(3);
    expect(alpha.approved).toBe(2);
  });

  it('builds rows for a corpus with no Module facet at all', async () => {
    const profile = await loadProfile('fixtures/profile-b.json');
    const { corpus } = await loadCorpus(profile);
    const matrix = buildMatrix(corpus, profile);

    expect(matrix.rows.map((r) => r.moduleId)).toEqual(['one', 'two']);
    expect(matrix.rows[1]!.cells.find((c) => c.facet === 'constraints')!.state).toBe('absent');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/readiness/matrix.test.ts`
Expected: FAIL — cannot resolve `src/readiness/matrix.js`.

- [ ] **Step 3: Write `src/readiness/matrix.ts`**

```ts
import type { Corpus } from '../core/corpus.js';
import type { FactId } from '../core/fact.js';
import { isApproved } from '../profile/maturity.js';
import type { Profile } from '../profile/profile.js';
import { allModuleIds, resolveOwners } from './owner.js';
import { evaluateFacet, evaluateFact } from './wellformed.js';

export type FacetState = 'absent' | 'present' | 'well-formed' | 'approved';

export interface MatrixCell {
  moduleId: FactId;
  facet: string;
  state: FacetState;
  factCount: number;
  unmet: string[];
}

export interface ModuleRow {
  moduleId: FactId;
  owner: string | null;
  cells: MatrixCell[];
}

export interface Matrix {
  profileId: string;
  facets: string[];
  rows: ModuleRow[];
}

export function buildMatrix(corpus: Corpus, profile: Profile): Matrix {
  const { owners } = resolveOwners(corpus, profile);
  const facets = profile.facets.map((f) => f.name);

  const rows: ModuleRow[] = allModuleIds(corpus).map((moduleId) => ({
    moduleId,
    owner: owners.get(moduleId) ?? null,
    cells: profile.facets.map((facet) => {
      const facts =
        facet.factKind === 'Module'
          ? corpus.facts.filter((f) => f.id === moduleId && f.facet === facet.name)
          : corpus.byFacet(moduleId, facet.name);

      if (facts.length === 0) {
        return { moduleId, facet: facet.name, state: 'absent' as const, factCount: 0, unmet: [] };
      }

      const unmet = [
        ...facts.flatMap((f) => evaluateFact(f, profile).map((u) => `${u.criterion}: ${u.detail}`)),
        ...evaluateFacet(facts, facet.factKind, profile).map((u) => `${u.criterion}: ${u.detail}`),
      ];

      const wellFormed = unmet.length === 0;
      const approved = wellFormed && facts.every((f) => isApproved(profile, f.maturityLevel));

      return {
        moduleId,
        facet: facet.name,
        state: approved ? ('approved' as const) : wellFormed ? ('well-formed' as const) : ('present' as const),
        factCount: facts.length,
        unmet,
      };
    }),
  }));

  return { profileId: profile.id, facets, rows };
}
```

- [ ] **Step 4: Write `src/readiness/score.ts`**

```ts
import type { FactId } from '../core/fact.js';
import type { Matrix } from './matrix.js';

export interface ModuleScore {
  moduleId: FactId;
  owner: string | null;
  /** Denominator: the number of facets the Profile declares (LAW-006). */
  total: number;
  present: number;
  wellFormed: number;
  approved: number;
}

const AT_LEAST_PRESENT = new Set(['present', 'well-formed', 'approved']);
const AT_LEAST_WELL_FORMED = new Set(['well-formed', 'approved']);

export function scoreMatrix(matrix: Matrix): ModuleScore[] {
  return matrix.rows.map((row) => ({
    moduleId: row.moduleId,
    owner: row.owner,
    total: row.cells.length,
    present: row.cells.filter((c) => AT_LEAST_PRESENT.has(c.state)).length,
    wellFormed: row.cells.filter((c) => AT_LEAST_WELL_FORMED.has(c.state)).length,
    approved: row.cells.filter((c) => c.state === 'approved').length,
  }));
}
```

- [ ] **Step 5: Run tests and typecheck**

Run: `pnpm test && pnpm typecheck`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add src/readiness/matrix.ts src/readiness/score.ts tests/readiness/matrix.test.ts
git commit -m "feat: Readiness Matrix and per-module scoring with denominators"
```

---

### Task 12: Run snapshots and trend

**Files:**
- Create: `src/readiness/snapshot.ts`
- Test: `tests/readiness/snapshot.test.ts`

**Interfaces:**
- Consumes: `ModuleScore`.
- Produces: `Snapshot { takenAt, profileId, scores }`, `writeSnapshot(dir, snapshot): Promise<string>`, `readPreviousSnapshot(dir, profileId, excludeAt): Promise<Snapshot | null>`, `TrendRow { moduleId, approvedDelta }`, `trend(current, previous): TrendRow[]`.

Snapshots are disposable derived artifacts written under `.comply/runs/` (gitignored). Deleting them loses nothing but trend history, which LAW-011 permits.

- [ ] **Step 1: Write the failing test**

`tests/readiness/snapshot.test.ts`:
```ts
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  readPreviousSnapshot, trend, writeSnapshot, type Snapshot,
} from '../../src/readiness/snapshot.js';

function snapshot(takenAt: string, approved: number): Snapshot {
  return {
    takenAt, profileId: 'p',
    scores: [{ moduleId: 'alpha', owner: 'avery', total: 3, present: 3, wellFormed: 3, approved }],
  };
}

describe('run snapshots', () => {
  it('writes a snapshot and reads back the most recent earlier one', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'runs-'));
    await writeSnapshot(dir, snapshot('2026-01-01T00:00:00.000Z', 1));
    await writeSnapshot(dir, snapshot('2026-01-02T00:00:00.000Z', 2));

    const previous = await readPreviousSnapshot(dir, 'p', '2026-01-02T00:00:00.000Z');
    expect(previous?.takenAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('returns null when no earlier snapshot exists', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'runs-'));
    await writeSnapshot(dir, snapshot('2026-01-01T00:00:00.000Z', 1));
    expect(await readPreviousSnapshot(dir, 'p', '2026-01-01T00:00:00.000Z')).toBeNull();
  });

  it('computes the approved delta per module', () => {
    const rows = trend(snapshot('b', 3), snapshot('a', 1));
    expect(rows).toEqual([{ moduleId: 'alpha', approvedDelta: 2 }]);
  });

  it('treats a first run as a zero delta rather than a jump', () => {
    expect(trend(snapshot('a', 2), null)).toEqual([{ moduleId: 'alpha', approvedDelta: 0 }]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/readiness/snapshot.test.ts`
Expected: FAIL — cannot resolve `src/readiness/snapshot.js`.

- [ ] **Step 3: Write `src/readiness/snapshot.ts`**

```ts
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { FactId } from '../core/fact.js';
import type { ModuleScore } from './score.js';

export interface Snapshot {
  takenAt: string;
  profileId: string;
  scores: ModuleScore[];
}

export interface TrendRow {
  moduleId: FactId;
  approvedDelta: number;
}

export async function writeSnapshot(dir: string, snapshot: Snapshot): Promise<string> {
  await mkdir(dir, { recursive: true });
  const name = `${snapshot.profileId}-${snapshot.takenAt.replace(/[:.]/g, '-')}.json`;
  const path = join(dir, name);
  await writeFile(path, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
  return path;
}

export async function readPreviousSnapshot(
  dir: string,
  profileId: string,
  excludeAt: string,
): Promise<Snapshot | null> {
  let names: string[];
  try {
    names = await readdir(dir);
  } catch {
    return null;
  }

  const candidates: Snapshot[] = [];
  for (const name of names) {
    if (!name.endsWith('.json')) continue;
    const snapshot = JSON.parse(await readFile(join(dir, name), 'utf8')) as Snapshot;
    if (snapshot.profileId === profileId && snapshot.takenAt < excludeAt) candidates.push(snapshot);
  }

  candidates.sort((a, b) => a.takenAt.localeCompare(b.takenAt));
  return candidates.at(-1) ?? null;
}

export function trend(current: Snapshot, previous: Snapshot | null): TrendRow[] {
  return current.scores.map((score) => {
    const before = previous?.scores.find((s) => s.moduleId === score.moduleId);
    return {
      moduleId: score.moduleId,
      approvedDelta: before === undefined ? 0 : score.approved - before.approved,
    };
  });
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm test tests/readiness/snapshot.test.ts`
Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/readiness/snapshot.ts tests/readiness/snapshot.test.ts
git commit -m "feat: disposable run snapshots and per-module trend"
```

---

### Task 13: Term registry and the conflicting-definition check

**Files:**
- Create: `src/integrity/registry.ts`, `src/integrity/checks/conflicting-definition.ts`
- Test: `tests/integrity/conflicting-definition.test.ts`

**Interfaces:**
- Consumes: `Corpus`, `Profile`, `Finding`.
- Produces: `TermEntry { canonical, definition, factId, moduleId, origin }`, `buildTermRegistry(corpus, profile): TermEntry[]`, `checkConflictingDefinition(corpus, profile): Finding[]`.

The attribute names carrying a term's name and definition are Profile data. The registry reads them from the `Term` facet's `columns`/`bodyAttribute`, never from a constant.

- [ ] **Step 1: Write the failing test**

`tests/integrity/conflicting-definition.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { loadCorpus } from '../../src/ingestion/markdown/index.js';
import { loadProfile } from '../../src/profile/load.js';
import { checkConflictingDefinition } from '../../src/integrity/checks/conflicting-definition.js';
import { buildTermRegistry } from '../../src/integrity/registry.js';

describe('conflicting definition check', () => {
  it('collects every Term across the corpus', async () => {
    const profile = await loadProfile('fixtures/profile-a.json');
    const { corpus } = await loadCorpus(profile);
    expect(buildTermRegistry(corpus, profile).map((t) => t.canonical).sort())
      .toEqual(['Cog', 'Sprocket', 'Widget', 'Widget']);
  });

  it('reports one Term defined two different ways, citing both places', async () => {
    const profile = await loadProfile('fixtures/profile-a.json');
    const { corpus } = await loadCorpus(profile);
    const findings = checkConflictingDefinition(corpus, profile);

    expect(findings).toHaveLength(1);
    expect(findings[0]!.code).toBe('conflicting-definition');
    expect(findings[0]!.message).toContain('Widget');
    expect(findings[0]!.message).toContain('beta/terms.md');
    expect(findings[0]!.origin.file).toContain('alpha/terms.md');
  });

  it('reports nothing when every Term is defined once', async () => {
    const profile = await loadProfile('fixtures/profile-b.json');
    const { corpus } = await loadCorpus(profile);
    expect(checkConflictingDefinition(corpus, profile)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/integrity/conflicting-definition.test.ts`
Expected: FAIL — cannot resolve the modules.

- [ ] **Step 3: Write `src/integrity/registry.ts`**

```ts
import type { Corpus } from '../core/corpus.js';
import type { FactId, SourceLocation } from '../core/fact.js';
import type { Profile } from '../profile/profile.js';

export interface TermEntry {
  canonical: string;
  definition: string;
  factId: FactId;
  moduleId: FactId | null;
  origin: SourceLocation;
}

/** Which attribute holds a Term's name and definition is Profile data (LAW-004). */
function termAttributes(profile: Profile): { name: string; definition: string } | null {
  const facet = profile.facets.find((f) => f.factKind === 'Term');
  if (facet === undefined) return null;
  // 'name' and 'definition' are the core's internal attribute names. A Profile maps its
  // own column headings onto them (table extractor) or names the body attribute directly
  // (heading extractor). No corpus vocabulary reaches this file.
  return { name: 'name', definition: facet.bodyAttribute ?? 'definition' };
}

export function buildTermRegistry(corpus: Corpus, profile: Profile): TermEntry[] {
  const keys = termAttributes(profile);
  if (keys === null) return [];

  return corpus.byKind('Term').flatMap((fact) => {
    const canonical = fact.attributes[keys.name];
    const definition = fact.attributes[keys.definition];
    if (typeof canonical !== 'string' || canonical.trim() === '') return [];
    return [{
      canonical: canonical.trim(),
      definition: typeof definition === 'string' ? definition.trim() : '',
      factId: fact.id,
      moduleId: fact.moduleId,
      origin: fact.origin,
    }];
  });
}
```

- [ ] **Step 4: Write `src/integrity/checks/conflicting-definition.ts`**

```ts
import type { Corpus } from '../../core/corpus.js';
import type { Finding } from '../../core/finding.js';
import type { Profile } from '../../profile/profile.js';
import { buildTermRegistry, type TermEntry } from '../registry.js';

export function checkConflictingDefinition(corpus: Corpus, profile: Profile): Finding[] {
  const byCanonical = new Map<string, TermEntry[]>();
  for (const entry of buildTermRegistry(corpus, profile)) {
    const bucket = byCanonical.get(entry.canonical) ?? [];
    bucket.push(entry);
    byCanonical.set(entry.canonical, bucket);
  }

  const findings: Finding[] = [];
  for (const [canonical, entries] of [...byCanonical].sort(([a], [b]) => a.localeCompare(b))) {
    const distinct = new Set(entries.map((e) => e.definition));
    if (distinct.size < 2) continue;

    const [first, ...rest] = entries;
    findings.push({
      code: 'conflicting-definition',
      moduleId: first!.moduleId,
      message:
        `Term "${canonical}" is defined ${distinct.size} different ways; also defined at ` +
        rest.map((e) => `${e.origin.file}:${e.origin.line}`).join(', '),
      origin: first!.origin,
    });
  }
  return findings;
}
```

- [ ] **Step 5: Run tests**

Run: `pnpm test tests/integrity/conflicting-definition.test.ts`
Expected: 3 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/integrity/registry.ts src/integrity/checks/conflicting-definition.ts tests/integrity
git commit -m "feat: term registry and conflicting-definition check"
```

---

### Task 14: Split-identity check

**Files:**
- Create: `src/integrity/checks/split-identity.ts`
- Test: `tests/integrity/split-identity.test.ts`

**Interfaces:**
- Consumes: `Corpus`, `Finding`.
- Produces: `checkSplitIdentity(corpus): Finding[]`.

Detection is generic: facts sharing a `containerId` but declaring different module identities. This catches a rename applied to some documents and not others, without knowing anything about the business.

- [ ] **Step 1: Write the failing test**

`tests/integrity/split-identity.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { loadCorpus } from '../../src/ingestion/markdown/index.js';
import { loadProfile } from '../../src/profile/load.js';
import { checkSplitIdentity } from '../../src/integrity/checks/split-identity.js';

describe('split identity check', () => {
  it('reports one container carrying two module identities', async () => {
    const profile = await loadProfile('fixtures/profile-a.json');
    const { corpus } = await loadCorpus(profile);
    const findings = checkSplitIdentity(corpus);

    expect(findings).toHaveLength(1);
    expect(findings[0]!.code).toBe('split-identity');
    expect(findings[0]!.message).toContain('beta');
    expect(findings[0]!.message).toContain('bravo');
    expect(findings[0]!.origin.file).toContain('beta/');
  });

  it('reports nothing for a corpus whose containers are internally consistent', async () => {
    const profile = await loadProfile('fixtures/profile-b.json');
    const { corpus } = await loadCorpus(profile);
    expect(checkSplitIdentity(corpus)).toEqual([]);
  });
});
```

Note: corpus B is flat, so every document shares one container while declaring `zone: one` and `zone: two`. This test will fail until the check ignores containers that carry no structural grouping. Step 3 handles that by skipping the root container.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/integrity/split-identity.test.ts`
Expected: FAIL — cannot resolve `split-identity.js`.

- [ ] **Step 3: Write `src/integrity/checks/split-identity.ts`**

```ts
import type { Corpus } from '../../core/corpus.js';
import type { Fact } from '../../core/fact.js';
import type { Finding } from '../../core/finding.js';

/** The adapter's marker for "no structural grouping"; such containers prove nothing. */
const UNGROUPED = '.';

function identityOf(fact: Fact): string | null {
  return fact.kind === 'Module' ? fact.id : fact.moduleId;
}

export function checkSplitIdentity(corpus: Corpus): Finding[] {
  const byContainer = new Map<string, Fact[]>();
  for (const fact of corpus.facts) {
    if (fact.containerId === UNGROUPED) continue;
    const bucket = byContainer.get(fact.containerId) ?? [];
    bucket.push(fact);
    byContainer.set(fact.containerId, bucket);
  }

  const findings: Finding[] = [];
  for (const [containerId, facts] of [...byContainer].sort(([a], [b]) => a.localeCompare(b))) {
    const identities = [...new Set(facts.map(identityOf).filter((i): i is string => i !== null))].sort();
    if (identities.length < 2) continue;

    const offender = facts.find((f) => identityOf(f) === identities[1]) ?? facts[0]!;
    findings.push({
      code: 'split-identity',
      moduleId: identities[0]!,
      message:
        `"${containerId}" carries ${identities.length} module identities (${identities.join(', ')}); ` +
        `a change to the identity reached some documents and not others`,
      origin: offender.origin,
    });
  }
  return findings;
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm test tests/integrity/split-identity.test.ts`
Expected: 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/integrity/checks/split-identity.ts tests/integrity/split-identity.test.ts
git commit -m "feat: split-identity check over adapter-reported containers"
```

---

### Task 15: Broken-reference check and check runner

**Files:**
- Create: `src/integrity/checks/broken-reference.ts`, `src/integrity/run.ts`
- Test: `tests/integrity/broken-reference.test.ts`, `tests/integrity/run.test.ts`

**Interfaces:**
- Consumes: `Corpus`, `Profile`, `Finding`, the three checks, `resolveOwners`.
- Produces: `checkBrokenReference(corpus): Finding[]`, `runChecks(corpus, profile): Finding[]`.

A relation resolves if its `targetRef` matches a Fact id or any Fact's `slug` attribute. Relations to external targets (no fragment, contains a dot) are ignored — they are outside the Corpus and unverifiable here.

- [ ] **Step 1: Write the failing test**

`tests/integrity/broken-reference.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { loadCorpus } from '../../src/ingestion/markdown/index.js';
import { loadProfile } from '../../src/profile/load.js';
import { checkBrokenReference } from '../../src/integrity/checks/broken-reference.js';

describe('broken reference check', () => {
  it('reports a reference whose target exists nowhere in the corpus', async () => {
    const profile = await loadProfile('fixtures/profile-a.json');
    const { corpus } = await loadCorpus(profile);
    const findings = checkBrokenReference(corpus);

    expect(findings).toHaveLength(1);
    expect(findings[0]!.code).toBe('broken-reference');
    expect(findings[0]!.message).toContain('r-9-missing');
    expect(findings[0]!.origin.file).toContain('beta/terms.md');
  });

  it('accepts a reference resolving to another fact by slug', async () => {
    const profile = await loadProfile('fixtures/profile-a.json');
    const { corpus } = await loadCorpus(profile);
    const resolved = corpus.facts
      .flatMap((f) => f.relations)
      .filter((r) => r.targetRef === 'r-2-sprockets-turn');
    expect(resolved).toHaveLength(1);
    expect(checkBrokenReference(corpus).map((f) => f.message).join())
      .not.toContain('r-2-sprockets-turn');
  });
});
```

`tests/integrity/run.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { loadCorpus } from '../../src/ingestion/markdown/index.js';
import { loadProfile } from '../../src/profile/load.js';
import { runChecks } from '../../src/integrity/run.js';

describe('check runner', () => {
  it('finds all four defect kinds planted in fixture A', async () => {
    const profile = await loadProfile('fixtures/profile-a.json');
    const { corpus } = await loadCorpus(profile);
    const codes = [...new Set(runChecks(corpus, profile).map((f) => f.code))].sort();
    expect(codes).toEqual([
      'broken-reference', 'conflicting-definition', 'missing-owner', 'split-identity',
    ]);
  });

  it('finds nothing in the clean fixture B', async () => {
    const profile = await loadProfile('fixtures/profile-b.json');
    const { corpus } = await loadCorpus(profile);
    expect(runChecks(corpus, profile)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test tests/integrity/broken-reference.test.ts tests/integrity/run.test.ts`
Expected: FAIL — cannot resolve the modules.

- [ ] **Step 3: Write `src/integrity/checks/broken-reference.ts`**

```ts
import type { Corpus } from '../../core/corpus.js';
import type { Finding } from '../../core/finding.js';

/** A target naming a file rather than an in-corpus anchor cannot be resolved here. */
function isExternal(targetRef: string): boolean {
  return targetRef.includes('/') || targetRef.includes('.');
}

export function checkBrokenReference(corpus: Corpus): Finding[] {
  const anchors = new Set<string>();
  for (const fact of corpus.facts) {
    anchors.add(fact.id);
    const slug = fact.attributes.slug;
    if (typeof slug === 'string') anchors.add(slug);
  }

  const findings: Finding[] = [];
  for (const fact of corpus.facts) {
    for (const relation of fact.relations) {
      if (isExternal(relation.targetRef) || anchors.has(relation.targetRef)) continue;
      findings.push({
        code: 'broken-reference',
        moduleId: fact.moduleId,
        message: `Reference to "${relation.targetRef}" resolves to nothing in the corpus`,
        origin: fact.origin,
      });
    }
  }
  return findings;
}
```

- [ ] **Step 4: Write `src/integrity/run.ts`**

```ts
import type { Corpus } from '../core/corpus.js';
import type { Finding } from '../core/finding.js';
import type { Profile } from '../profile/profile.js';
import { resolveOwners } from '../readiness/owner.js';
import { checkBrokenReference } from './checks/broken-reference.js';
import { checkConflictingDefinition } from './checks/conflicting-definition.js';
import { checkSplitIdentity } from './checks/split-identity.js';

export function runChecks(corpus: Corpus, profile: Profile): Finding[] {
  return [
    ...checkSplitIdentity(corpus),
    ...checkConflictingDefinition(corpus, profile),
    ...checkBrokenReference(corpus),
    ...resolveOwners(corpus, profile).findings,
  ];
}
```

- [ ] **Step 5: Run tests and typecheck**

Run: `pnpm test && pnpm typecheck`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add src/integrity/checks/broken-reference.ts src/integrity/run.ts tests/integrity
git commit -m "feat: broken-reference check and integrity check runner"
```

---

### Task 16: CLI

**Files:**
- Create: `src/cli/render.ts`, `src/cli/main.ts`
- Test: `tests/cli/render.test.ts`

**Interfaces:**
- Consumes: `Matrix`, `ModuleScore`, `TrendRow`, `Finding`.
- Produces: `renderMatrix(matrix, scores, trendRows): string`, `renderFindings(findings): string`; CLI entry `pnpm comply <profile.json>`.

- [ ] **Step 1: Write the failing test**

`tests/cli/render.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { renderFindings, renderMatrix } from '../../src/cli/render.js';
import { loadCorpus } from '../../src/ingestion/markdown/index.js';
import { loadProfile } from '../../src/profile/load.js';
import { runChecks } from '../../src/integrity/run.js';
import { buildMatrix } from '../../src/readiness/matrix.js';
import { scoreMatrix } from '../../src/readiness/score.js';

describe('rendering', () => {
  it('shows every score against its denominator (LAW-006)', async () => {
    const profile = await loadProfile('fixtures/profile-a.json');
    const { corpus } = await loadCorpus(profile);
    const matrix = buildMatrix(corpus, profile);
    const out = renderMatrix(matrix, scoreMatrix(matrix), []);

    expect(out).toContain('alpha');
    expect(out).toMatch(/2\/3/);
    expect(out).toContain('avery');
  });

  it('marks a module with no owner rather than leaving it blank (ADR-0010)', async () => {
    const profile = await loadProfile('fixtures/profile-a.json');
    const { corpus } = await loadCorpus(profile);
    const matrix = buildMatrix(corpus, profile);
    expect(renderMatrix(matrix, scoreMatrix(matrix), [])).toContain('NO OWNER');
  });

  it('renders each finding with a file and line a human can open', async () => {
    const profile = await loadProfile('fixtures/profile-a.json');
    const { corpus } = await loadCorpus(profile);
    const out = renderFindings(runChecks(corpus, profile));
    expect(out).toMatch(/\.md:\d+/);
    expect(out).toContain('split-identity');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/cli/render.test.ts`
Expected: FAIL — cannot resolve `src/cli/render.js`.

- [ ] **Step 3: Write `src/cli/render.ts`**

```ts
import type { Finding } from '../core/finding.js';
import type { FacetState, Matrix } from '../readiness/matrix.js';
import type { ModuleScore } from '../readiness/score.js';
import type { TrendRow } from '../readiness/snapshot.js';

const MARK: Record<FacetState, string> = {
  absent: '--',
  present: '..',
  'well-formed': '~~',
  approved: 'OK',
};

function pad(value: string, width: number): string {
  return value.length >= width ? value : value + ' '.repeat(width - value.length);
}

export function renderMatrix(
  matrix: Matrix,
  scores: ModuleScore[],
  trendRows: TrendRow[],
): string {
  const nameWidth = Math.max(8, ...matrix.rows.map((r) => r.moduleId.length));
  const facetWidth = Math.max(6, ...matrix.facets.map((f) => f.length + 1));

  const header =
    pad('MODULE', nameWidth) + '  ' +
    matrix.facets.map((f) => pad(f, facetWidth)).join('') +
    pad('APPROVED', 10) + pad('TREND', 7) + 'OWNER';

  const lines = matrix.rows.map((row) => {
    const score = scores.find((s) => s.moduleId === row.moduleId)!;
    const delta = trendRows.find((t) => t.moduleId === row.moduleId)?.approvedDelta ?? 0;
    const deltaText = delta === 0 ? '·' : delta > 0 ? `+${delta}` : String(delta);
    return (
      pad(row.moduleId, nameWidth) + '  ' +
      row.cells.map((c) => pad(MARK[c.state], facetWidth)).join('') +
      pad(`${score.approved}/${score.total}`, 10) +
      pad(deltaText, 7) +
      (row.owner ?? 'NO OWNER')
    );
  });

  const totalCells = scores.reduce((sum, s) => sum + s.total, 0);
  const approvedCells = scores.reduce((sum, s) => sum + s.approved, 0);

  return [
    header,
    '-'.repeat(header.length),
    ...lines,
    '-'.repeat(header.length),
    `Approved facets: ${approvedCells}/${totalCells} across ${scores.length} modules.`,
    'Denominator is the facets this Profile declares. Knowledge absent from the corpus entirely is not counted.',
    `Legend: ${MARK.approved} approved  ${MARK['well-formed']} well-formed  ${MARK.present} present  ${MARK.absent} absent`,
  ].join('\n');
}

export function renderFindings(findings: Finding[]): string {
  if (findings.length === 0) return 'No findings.';
  const lines = findings.map(
    (f) => `  [${f.code}] ${f.origin.file}:${f.origin.line}\n      ${f.message}`,
  );
  return [`Findings (${findings.length}):`, ...lines].join('\n');
}
```

- [ ] **Step 4: Write `src/cli/main.ts`**

```ts
import { runChecks } from '../integrity/run.js';
import { loadCorpus } from '../ingestion/markdown/index.js';
import { loadProfile } from '../profile/load.js';
import { buildMatrix } from '../readiness/matrix.js';
import { scoreMatrix } from '../readiness/score.js';
import {
  readPreviousSnapshot, trend, writeSnapshot, type Snapshot,
} from '../readiness/snapshot.js';
import { renderFindings, renderMatrix } from './render.js';

const RUNS_DIR = '.comply/runs';

async function main(): Promise<void> {
  const profilePath = process.argv[2];
  if (profilePath === undefined) {
    console.error('Usage: pnpm comply <profile.json>');
    process.exitCode = 2;
    return;
  }

  const profile = await loadProfile(profilePath);
  const { corpus, findings: importFindings } = await loadCorpus(profile);

  const matrix = buildMatrix(corpus, profile);
  const scores = scoreMatrix(matrix);

  const snapshot: Snapshot = {
    takenAt: new Date().toISOString(),
    profileId: profile.id,
    scores,
  };
  const previous = await readPreviousSnapshot(RUNS_DIR, profile.id, snapshot.takenAt);
  await writeSnapshot(RUNS_DIR, snapshot);

  console.log(renderMatrix(matrix, scores, trend(snapshot, previous)));
  console.log();
  console.log(renderFindings([...importFindings, ...runChecks(corpus, profile)]));
}

await main();
```

- [ ] **Step 5: Run tests, then the CLI against both fixtures**

Run: `pnpm test && pnpm typecheck`
Expected: all PASS.

Run: `pnpm comply fixtures/profile-a.json`
Expected: a matrix with `alpha` at `2/3` owned by `avery`, `beta` marked `NO OWNER`, and findings for split-identity, conflicting-definition, broken-reference, and missing-owner.

Run: `pnpm comply fixtures/profile-b.json`
Expected: a two-row matrix and `No findings.`

- [ ] **Step 6: Commit**

```bash
git add src/cli tests/cli
git commit -m "feat: CLI rendering the Readiness Matrix and findings"
```

---

### Task 17: LAW-004 guard

**Files:**
- Create: `scripts/check-core-vocabulary.mjs`
- Modify: `package.json` (add `lint:law004` script, add it to `test`)
- Test: `tests/law/core-vocabulary.test.ts`

**Interfaces:**
- Consumes: nothing at runtime.
- Produces: `checkCoreVocabulary(roots, forbidden): Violation[]` exported from the script for direct testing.

This is what turns "the core knows no business" from an intention into something that fails. It scans core directories for any string literal drawn from a fixture corpus's vocabulary.

- [ ] **Step 1: Write the failing test**

`tests/law/core-vocabulary.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { checkCoreVocabulary } from '../../scripts/check-core-vocabulary.mjs';

const CORE_ROOTS = ['src/core', 'src/readiness', 'src/integrity'];

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
    const violations = await checkCoreVocabulary(['src/profile'], ['markdown-frontmatter']);
    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0]!.term).toBe('markdown-frontmatter');
  });
});
```

The second test uses `src/profile` deliberately: adapter-kind names legitimately live there, which proves the scanner detects real matches rather than always returning empty.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/law/core-vocabulary.test.ts`
Expected: FAIL — cannot resolve the script.

- [ ] **Step 3: Write `scripts/check-core-vocabulary.mjs`**

```js
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

async function sourceFiles(root) {
  const found = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) found.push(...(await sourceFiles(path)));
    else if (entry.name.endsWith('.ts')) found.push(path);
  }
  return found;
}

/**
 * Reports any forbidden term appearing in a string literal in core source.
 * Comments and identifiers are ignored; only literals can leak corpus vocabulary.
 */
export async function checkCoreVocabulary(roots, forbidden) {
  const violations = [];
  const lowered = forbidden.map((t) => t.toLowerCase());

  for (const root of roots) {
    for (const file of await sourceFiles(root)) {
      const lines = (await readFile(file, 'utf8')).split('\n');
      for (const [index, line] of lines.entries()) {
        if (line.trimStart().startsWith('*') || line.trimStart().startsWith('//')) continue;
        for (const literal of line.matchAll(/'([^']*)'|"([^"]*)"/g)) {
          const value = (literal[1] ?? literal[2] ?? '').toLowerCase();
          for (const [position, term] of lowered.entries()) {
            if (value.includes(term)) {
              violations.push({ file, line: index + 1, term: forbidden[position] });
            }
          }
        }
      }
    }
  }
  return violations;
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm test tests/law/core-vocabulary.test.ts`
Expected: 2 tests PASS. If the first fails, core source has leaked corpus vocabulary — fix the source, not the test.

- [ ] **Step 5: Wire it into the default test run**

In `package.json`, leave `test` as `vitest run` — the guard is already a vitest test and runs with everything else. Add a standalone script for CI convenience:

```json
"lint:law004": "node --input-type=module -e \"import {checkCoreVocabulary} from './scripts/check-core-vocabulary.mjs'; const v = await checkCoreVocabulary(['src/core','src/readiness','src/integrity'], ['alpha','beta','widget','lever','overview','terms','rules','agreed']); if (v.length) { console.error(v); process.exit(1); } console.log('LAW-004 clean');\""
```

- [ ] **Step 6: Run everything**

Run: `pnpm test && pnpm typecheck && pnpm lint:law004`
Expected: all PASS, `LAW-004 clean`.

- [ ] **Step 7: Commit**

```bash
git add scripts/check-core-vocabulary.mjs tests/law package.json
git commit -m "test: LAW-004 guard rejecting corpus vocabulary in core source"
```

---

## Spec coverage

| Spec section | Covered by |
| --- | --- |
| §3 Five Fact Kinds | Task 1 |
| §3 Maturity / Sources / orthogonality | Tasks 1, 2 |
| §4 Present / well-formed / approved | Tasks 9, 11 |
| §4 Per-module, never global | Task 11, 16 |
| §4 Stated limit, denominator (LAW-006) | Tasks 11, 16 |
| §5 Split identity | Task 14 |
| §5 Broken reference | Task 15 |
| §5 Conflicting definition | Task 13 |
| §5 Orphan / unknown Term | **Deferred** — needs word-formation rules; see below |
| §8 Profile | Task 2 |
| §8 Seed Adapter | Tasks 5, 6, 7 |
| §8 Parse-failure report | Task 7 |
| §8 Two-corpus rule | Tasks 8, 17 |
| §9 Well-formedness criteria as Profile data | Task 9 |
| §11 Module Owner as prerequisite of step 1 | Task 10 |
| §11 Trend | Task 12 |

**Deferred with reason:** the orphan/unknown-Term check is listed in spec §5 as v1, but it is the one v1 check requiring word-formation rules, which the spec itself assigns to the Profile and does not specify. Implementing it against exact matching alone would produce false positives on every inflected mention and train users to ignore Findings. It should be planned once a real corpus's locale rules are known. This is a genuine scope reduction against the spec and needs sign-off.
