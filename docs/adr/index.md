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
| [0011](./0011-toolchain.md) | ~~TypeScript, PostgreSQL, React, shared design system~~ *(superseded by 0013)* |
| [0012](./0012-seed-is-transport-not-change.md) | A Seed is transport, not a change *(amends 0004)* |
| [0013](./0013-technical-stack.md) | Technical stack *(supersedes 0011; interface row superseded by 0018)* |
| [0014](./0014-run-snapshots-stand-in-for-the-ledger.md) | Run snapshots stand in for the ledger, and hold history LAW-011 would otherwise forbid *(amended by 0016)* |
| [0015](./0015-a-lens-not-a-profile.md) | The declaration of how a Corpus is read is a Lens, not a Profile *(amends LAW-004)* |
| [0016](./0016-a-reading-is-recorded-when-its-inputs-change.md) | A recorded reading is a cache, keyed by the Seed and Lens that produced it *(amends 0014)* |
| [0017](./0017-a-seed-quotes-its-source-and-says-nothing-about-it.md) | A Seed quotes its source exactly, cuts rather than summarises, and carries no message *(refines 0012)* |
| [0018](./0018-the-interface-vendors-the-house-design-system.md) | The interface vendors the house design system: Tailwind and shadcn primitives *(supersedes 0013's interface row)* |
| [0019](./0019-criteria-belong-to-a-facet.md) | Well-formedness criteria belong to a Facet, not to a Fact Kind *(refines 0005)* |
| [0020](./0020-criteria-judge-structure-never-content.md) | Criteria judge structure; only a review judges content *(refines 0019; its reference count corrected by 0023)* |
| [0021](./0021-one-facet-defines-the-language.md) | One Facet defines the language *(refines 0019)* |
| [0022](./0022-a-status-is-declared-per-fact.md) | A status is declared per Fact, and its provenance beside it *(refines 0006 and 0012)* |
| [0023](./0023-a-reference-resolves-the-way-its-source-resolves-it.md) | A reference resolves the way its source resolves it *(refines 0020 and corrects its count)* |
| [0024](./0024-a-facet-says-which-tables-are-its-own.md) | A Facet says which tables are its own *(refines 0019 and 0020)* |
