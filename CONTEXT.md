# Context

This repository answers one question about any body of business knowledge:

> Is this knowledge complete enough, consistent enough, and reviewed enough to be handed to a person
> or an agent that will build software from it?

It does not generate software. It does not check application code. It measures a **Corpus**,
protects it behind reviewed proposals, and keeps the language inside it internally consistent.

## Why this exists

Business knowledge is normally scattered across documents, tickets, schemas, and people's heads. A
human filling a gap asks a colleague. An agent cannot — so it invents a term or a rule and writes
code against the invention. The knowledge an agent needs must therefore be materialised, and once
materialised it must be measured, because unmeasured knowledge silently rots.

Two questions drive the product:

1. **Is the knowledge good enough to use?** Per module: is each facet present, internally
   well-formed, and reviewed by a named owner — or merely inferred by a machine and never checked?
2. **Does a change to the language reach every occurrence?** Renaming a term must propagate
   everywhere it appears, or the corpus fragments into synonyms that disagree.

## What this is not

It is not a documentation site generator, not a code generator, and not a conformance checker against
application code. Those boundaries are deliberate and recorded in [`docs/adr/`](./docs/adr/).

## Domain-agnostic by law

The core knows nothing about any particular business. A body of knowledge arrives through a **Seed
Adapter** and is interpreted through a **Profile** that declares its facets, maturity vocabulary,
locale, and well-formedness rules. Every corpus is a pilot; none is privileged. See **LAW-004** in
[`CONSTITUTION.md`](./CONSTITUTION.md).

## Where to look

- [`CONSTITUTION.md`](./CONSTITUTION.md) — the laws. Start here; they constrain every decision below.
- [`UBIQUITOUS_LANGUAGE.md`](./UBIQUITOUS_LANGUAGE.md) — the canonical terms of this product.
- [`docs/domain-model.md`](./docs/domain-model.md) — bounded contexts and their relationships.
- [`docs/adr/`](./docs/adr/) — architecture decisions and the reasoning behind them.
- [`docs/superpowers/specs/`](./docs/superpowers/specs/) — the design this repository implements.
