# CLAUDE.md

Guidance for agents working in this repository.

## What this is

A domain-agnostic tool that measures whether a body of business knowledge is complete, consistent,
and reviewed enough to build software from. Read [`CONTEXT.md`](./CONTEXT.md) first, then
[`UBIQUITOUS_LANGUAGE.md`](./UBIQUITOUS_LANGUAGE.md).

Use the product's own words when you write code and interfaces: Corpus, Fact, Module, Term, Rule,
Message, Transition, Maturity, Source, Change Request, Door, Check, Finding, Profile, Seed Adapter.
They are defined in `UBIQUITOUS_LANGUAGE.md` and they are not interchangeable with synonyms.

## The laws are binding

[`CONSTITUTION.md`](./CONSTITUTION.md) is not advisory. A change that violates a law does not merge.
If a law is wrong, amend it in its own change with the reasoning recorded — never route around one.

The five most likely to be broken by accident:

1. **No business vocabulary in the core** (LAW-004). No business term, no natural-language string, no
   fixed list of document sections, no hardcoded review-status names. If you are about to write a
   domain word into core source, it belongs in a Profile instead. This includes test fixtures that
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

TypeScript, PostgreSQL, React, consuming the shared design system and API contract packages
(ADR-0011). The application is not yet scaffolded; this file gains its build, test, and lint commands
in the change that scaffolds it.
