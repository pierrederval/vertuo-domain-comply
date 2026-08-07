# Architecture Decision Records

Decisions that shape this product, with the reasoning that produced them. An ADR is amended by a new
ADR, never edited to match current practice.

The laws in [`../../CONSTITUTION.md`](../../CONSTITUTION.md) sit above these: an ADR may not
contradict a law, and a law is changed only in its own dedicated change.

| ADR | Decision |
| --- | --- |
| [0001](./0001-domain-agnostic-core.md) | The core is domain-agnostic; corpora arrive as Profile plus Seed Adapter |
| [0002](./0002-corpus-is-an-append-only-ledger.md) | The Corpus is an append-only ledger |
| [0003](./0003-git-is-not-the-change-control-substrate.md) | Git is not the change-control substrate |
| [0004](./0004-change-request-is-the-unit-of-change.md) | The Change Request is the unit of change, and there is one Door *(amended by 0012)* |
| [0005](./0005-five-fact-kinds.md) | Five Fact Kinds, and the set is closed |
| [0006](./0006-maturity-and-source-are-orthogonal.md) | Maturity and Source are separate dimensions |
| [0007](./0007-published-outputs-are-derived.md) | Published outputs are derived, read-only, and disposable |
| [0008](./0008-rename-classifies-before-it-applies.md) | Rename classifies every occurrence before applying any |
| [0009](./0009-no-code-generation-or-code-conformance.md) | No code generation and no application-code conformance |
| [0010](./0010-findings-route-to-a-named-owner.md) | Every Module has a named Owner and every Finding routes to one |
| [0011](./0011-toolchain.md) | TypeScript, PostgreSQL, React, shared design system |
| [0012](./0012-seed-is-transport-not-change.md) | A Seed is transport, not a change *(amends 0004)* |
