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
Vite and the shared design system, Vitest for tests, Docker to deploy (ADR-0013).

Two rules that are easy to break:

- **Only `libs/system-db` may import Kysely or open a connection.** Any other package touching the
  database directly is a defect.
- **Ledger tables reject `UPDATE` and `DELETE` at the database** — the application role has no such
  grant, and a trigger backs it up. Do not attempt to work around this; it is LAW-003 made
  structural.

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

`pnpm dev` is the usual way in: the Studio is unreadable without the API behind it, and starting one
of a pair by hand is how a person ends up reading a page that is answering from yesterday's process.
The two run under Turborepo as persistent tasks, so nothing new orchestrates them. Either can still
be run alone when that is what you want.

Neither port moves if it is taken — both refuse to start and say so. A development server that
quietly took the next port leaves two of itself running, and the one being read is then the one that
was not just changed, which reads as a change that did nothing. `COMPLY_PORT` moves the API
deliberately.

The **shelf** is one directory holding a Lens per Corpus, the source those Lenses point at, and the
Seeds written down from it. It is `.comply` unless `COMPLY_SHELF` says otherwise; the scripts above
point it at `libs/comply-fixtures/corpus` so the interface runs against both fixture Corpus in
development, which is where shape-leakage shows up (ADR-0001).

There is no lint step and no CI workflow yet. Both guards run under `pnpm test`, so on a laptop
LAW-004 and LAW-010 are enforced; nothing enforces them on a pull request until #32 lands.
