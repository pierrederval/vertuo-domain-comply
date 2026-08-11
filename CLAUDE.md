# CLAUDE.md

Guidance for agents working in this repository.

## What this is

A domain-agnostic tool that measures whether a body of business knowledge is complete, consistent,
and reviewed enough to build software from. Read [`CONTEXT.md`](./CONTEXT.md) first, then
[`UBIQUITOUS_LANGUAGE.md`](./UBIQUITOUS_LANGUAGE.md).

Use the product's own words when you write code and interfaces: Corpus, Fact, Module, Term, Rule,
Message, Transition, Maturity, Source, Change Request, Door, Check, Finding, Lens, Seed Adapter.
They are defined in `UBIQUITOUS_LANGUAGE.md` and they are not interchangeable with synonyms.

## The laws are binding

[`CONSTITUTION.md`](./CONSTITUTION.md) is not advisory. A change that violates a law does not merge.
If a law is wrong, amend it in its own change with the reasoning recorded — never route around one.

The five most likely to be broken by accident:

1. **No business vocabulary in the core** (LAW-004). No business term, no natural-language string, no
   fixed list of document sections, no hardcoded review-status names. If you are about to write a
   domain word into core source, it belongs in a Lens instead. This includes test fixtures that
   quietly assume one corpus's shape.
2. **One Door** (LAW-002). Never write to the Corpus outside the Door. The Door has exactly two
   operations: proposing a Change Request, and loading a Seed. Migrations and quick fixes are neither
   — express them as one of the two or not at all. A Seed load records one Genesis entry, never one
   event per Fact (ADR-0012).
3. **Append-only** (LAW-003). No `UPDATE`, no `DELETE` against Fact versions. Corrections append.
4. **Business language at the surface** (LAW-010). Never let *commit*, *branch*, *schema*, *parse*,
   *index*, *repository*, *migration*, or *null* reach a business-facing label, error, or empty state.
5. **Ambiguity escalates** (LAW-008). No write path applies a change to a site it could not classify
   as certain.

## Working here

- Architecture decisions live in [`docs/adr/`](./docs/adr/). Read the relevant one before changing
  something it covers. Add a new ADR rather than editing an accepted one.
- The design this repository implements is in
  [`docs/superpowers/specs/`](./docs/superpowers/specs/).
- Bounded contexts and their relationships: [`docs/domain-model.md`](./docs/domain-model.md).
  Respect the boundaries — Readiness and Language Integrity read the Corpus and never write to it.

## Two-corpus rule

Per ADR-0001, a feature is not done until it works against two differently-shaped corpora. The test
suite carries a deliberately dissimilar fixture corpus for this purpose. If your change only passes
against one shape, the shape has leaked into the core.

## Toolchain

TypeScript on Node 24 with `tsx`, a pnpm workspace over `apps/*` and `libs/*` orchestrated by
Turborepo, PostgreSQL via Kysely, Zod for validation and contracts, Fastify for HTTP, React 19 with
Vite, Tailwind and vendored shadcn primitives, Vitest for tests, Docker to deploy (ADR-0013 and
ADR-0018).

Three rules that are easy to break:

- **Only `libs/system-db` may import Kysely or open a connection.** Any other package touching the
  database directly is a defect.
- **Ledger tables reject `UPDATE` and `DELETE` at the database** — the application role has no such
  grant, and a trigger backs it up. Do not attempt to work around this; it is LAW-003 made
  structural.
- **Never assert about a class name.** Interface tests use `data-*` handles — `data-figure`,
  `data-cell`, `data-movement`, `data-conspicuous` — because several of them are laws made testable,
  and a guard tied to styling is deleted by whoever next changes the styling. `data-figure` appearing
  exactly twice is LAW-006: two readings, never a third fused one.

The interface's components are vendored into `apps/comply-studio/src/components/ui` and are ours to
maintain (ADR-0018). Both vocabulary guards scan them like any other source, so LAW-004 and LAW-010
apply to a vendored component as much as to one written here.

shadcn's blocks bring KPI tiles, progress rings, trend chips and count badges. Every one of them is a
figure with its denominator removed, which is LAW-006. A badge may carry a state's name; never a count.
No percentage, no rate, no grade, no score. `—` means *no baseline* and never becomes `0%`.

One library per bounded context, so the domain model's boundaries are enforced by the package graph.

## Commands

Run all of these from the repository root.

| Command | What it does |
| --- | --- |
| `pnpm test` | Every package's tests, including both vocabulary guards |
| `pnpm typecheck` | Every package |
| `pnpm comply extract <lens.json>` | Write down what is at source, as a Seed |
| `pnpm comply report <lens.json>` | Read a Corpus and print where it stands |
| `pnpm shelf:fixtures` | Put both fixture Corpus on the development shelf |
| `pnpm dev` | Both processes below at once; one Ctrl-C stops both |
| `pnpm api` | Serve that shelf, read-only, on port 4301 |
| `pnpm studio` | The Studio, on port 4302, answering from the API |
| `pnpm shelf:domain` | Write down what is at source in `vertuo-domain`, onto the `lenses` shelf |
| `pnpm dev:domain` | The same two processes, serving that shelf instead of the fixtures |

`pnpm dev` is the usual way in: the Studio is unreadable without the API behind it, and starting one
of a pair by hand is how a person ends up reading a page that is answering from yesterday's process.
The two run under Turborepo as persistent tasks, so nothing new orchestrates them. Either can still
be run alone when that is what you want.

Neither port moves if it is taken. A development server that quietly took the next port leaves two of
itself running, and the one being read is then the one that was not just changed, which reads as a
change that did nothing. `COMPLY_PORT` moves the API deliberately.

`pnpm dev` checks both ports before Turborepo starts anything, because refusing is only half of it.
Left to Vite, the refusal is an unhandled error with a stack trace through its own internals, and
Turborepo kills the API beside it — so the last thing on screen is two failures and no hint that the
cause is a pair somebody left running in another terminal. `scripts/check-ports.mjs` names it instead,
and says how to find what is holding them.

## The DDD Corpus

`lenses/vertuo-domain-fr.json` reads the real `vertuo-domain-fr` repository: 20 documented Modules under
three tiers, and eight Facets — Overview, Glossary, Business Rules, Commands, Domain Events, Workflows,
State Machines, Experience. Its `root` is relative, so the two repositories have to be checked out as
siblings.

**The corpus is French, and there is no other one.** A `lenses/vertuo-domain.json` used to sit beside it
reading a sibling of the same name; that repository's final commit marks it superseded by
`vertuo-domain-fr`, and the Lens was deleted rather than left where somebody would run it and measure a
corpse. If a Lens over a second corpus is added, check what its source says about itself first.

It lives on a shelf of its own and is never added to the fixtures shelf. Tests run against the
fixtures, and a test that needs a sibling checkout is a test that fails on a machine without one.

Seven things about it are worth knowing before changing it:

- **Commands and Domain Events are both Messages, judged differently** (ADR-0019). A Command needs an
  actor; an Event needs the Rule it came from. This Lens is why criteria stopped being keyed by Fact Kind.
- **Business Rules is read heading by heading, not as a document.** Read as a document, every
  `business-rules.md#br-004-…` link in the Commands, Events and Workflows tables resolves to nothing, and
  the reading manufactures hundreds of broken-reference Findings that are the Lens's fault and not the
  corpus's. A tool that invents defects is worse than one that misses them.
- **Two Facets share the Term Kind** — Glossary and Experience — and only one of them is the dictionary
  (ADR-0021). Today nothing enforces that: Experience stays out of the dictionary only because it names
  its body attribute `description`. Rename it to `definition` and 17 screen descriptions silently become
  word definitions.
- **A reference resolves the way the pages a reader reads resolve it** (ADR-0023). `slugify` folds
  accents, keeps a letter that decomposes into nothing, drops markup a heading carries, and separates on
  everything else. It once reduced a heading with `[^a-z0-9]+`, which is how 747 of the 772 broken
  references it reported about a French corpus came to be its own defect. The 24 that remain are the
  reading's defect too, for the reasons ADR-0023 and ADR-0025 name — so the reference count is still not a
  corpus reading, and the genuine figure is zero.
- **A document holds several tables and only some of them are the Facet's** (ADR-0024). Four Facets name
  the columns that identify theirs, which is how 107 rows — payloads, retired words, a note about what the
  backend does — stopped being read as Domain Events, Commands and Terms. Two traps if you touch those
  declarations: `opportunite/workflows.md` heads its step column `Opération` where every other document
  heads it `Étape`, so its four rows are set aside rather than read; and `state-machines` names nothing
  on purpose, because its own tables already separate — what is wrong there is 18 guards spelled `Gardien`,
  which is a column mapping and not a table.
- **A page's furniture is written at the same level as its knowledge** (ADR-0025). Business Rules names
  `itemPattern`, which is how 39 headings — `Terminologie`, `Statut de Revue PM`, `Liens vers d'Autres
  Connaissances` — stopped being read as rules; 183 remain and the grid does not move by a mark, because
  what those 39 were padding is a denominator and not a shortfall. Three traps: `experience` carries the
  same furniture and names nothing on purpose, because no description separates its other 13 headings
  without becoming a list of them; `Statut de Revue PM` is where this corpus writes its review status, so
  #45 will be looking for exactly what is set aside here; and the reading now states what it set aside,
  which is why the Seed is at version 2 and an older shelf has to be written down again.
- **A Fact is read as the parts its source writes it in, and the level follows from the extractor**
  (ADR-0026). A Facet reading headings has its Parts one level below; a Facet reading whole documents has
  the document's own sections. `parts` maps a subheading onto an attribute the way `columns` maps a
  header, and several spellings may name one Part — which is how `Conditions Dérivées des Sources` and
  `…de la Source` became one thing. Three traps. **All 20 `index.md` begin at their first section**, so
  `bodyAttribute` catches nothing there and a Facet asking for it would fail all 20 — which is why
  `Objectif` is mapped onto `description` and `bodyAttribute` points at `title`; any Facet asking for its
  `bodyAttribute` needs a Part for its opening section. **`Justification Métier` and `Justification
  Dérivée du Source` are two Parts, not two spellings** — 27 rules write both, one saying why the
  business wants the rule and the other what the code was found to do, and the test that tells a drift
  from a second Part is whether one source ever writes both. And **`columns` still lets the last of two
  colliding headers win** where `parts` keeps both; no table in either corpus collides, so it is latent.

The **shelf** is one directory holding a Lens per Corpus, the source those Lenses point at, and the
Seeds written down from it. It is `.comply` unless `COMPLY_SHELF` says otherwise; the scripts above
point it at `libs/comply-fixtures/corpus` so the interface runs against both fixture Corpus in
development, which is where shape-leakage shows up (ADR-0001).

There is no lint step and no CI workflow yet. Both guards run under `pnpm test`, so on a laptop
LAW-004 and LAW-010 are enforced; nothing enforces them on a pull request until #32 lands.
