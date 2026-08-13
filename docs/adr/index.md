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
| [0016](./0016-a-reading-is-recorded-when-its-inputs-change.md) | A recorded reading is a cache, keyed by the Seed and Lens that produced it *(amends 0014; implemented by 0032)* |
| [0017](./0017-a-seed-quotes-its-source-and-says-nothing-about-it.md) | A Seed quotes its source exactly, cuts rather than summarises, and carries no message *(refines 0012)* |
| [0018](./0018-the-interface-vendors-the-house-design-system.md) | The interface vendors the house design system: Tailwind and shadcn primitives *(supersedes 0013's interface row)* |
| [0019](./0019-criteria-belong-to-a-facet.md) | Well-formedness criteria belong to a Facet, not to a Fact Kind *(refines 0005)* |
| [0020](./0020-criteria-judge-structure-never-content.md) | Criteria judge structure; only a review judges content *(refines 0019; its reference count corrected by 0023; its `parts` built by 0026)* |
| [0021](./0021-one-facet-defines-the-language.md) | One Facet defines the language *(refines 0019; built by 0027, which corrects one figure)* |
| [0022](./0022-a-status-is-declared-per-fact.md) | A status is declared per Fact, and its provenance beside it *(refines 0006 and 0012; built by 0029, which corrects four figures)* |
| [0023](./0023-a-reference-resolves-the-way-its-source-resolves-it.md) | A reference resolves the way its source resolves it *(refines 0020 and corrects its count)* |
| [0024](./0024-a-facet-says-which-tables-are-its-own.md) | A Facet says which tables are its own *(refines 0019 and 0020; its unbuilt channel built by 0025)* |
| [0025](./0025-a-facet-says-which-headings-are-its-own-and-the-reading-says-what-it-set-aside.md) | A Facet says which headings are its own, and the reading says what it set aside *(refines 0020 and 0024; Seed format 2; three figures corrected by 0026)* |
| [0026](./0026-a-fact-is-read-as-the-parts-its-source-already-has.md) | A Fact is read as the parts its source already has *(refines 0020; corrects three figures in 0025)* |
| [0027](./0027-only-the-dictionary-is-held-to-the-dictionarys-shape.md) | Only the dictionary is held to the dictionary's shape *(implements 0021; corrects one figure in it)* |
| [0028](./0028-the-build-gate-runs-uncached-and-its-name-is-the-gate.md) | The build gate runs the whole suite uncached, and the job's name is what blocks a merge *(bears on 0013)* |
| [0029](./0029-a-fact-states-where-it-stands-and-what-it-was-checked-against.md) | A Fact states where it stands and what it was checked against *(implements 0022 and corrects four figures in it; refines 0006 and 0026)* |
| [0030](./0030-knowledge-is-opened-where-it-is-written-down.md) | A piece of knowledge is opened where it is written down, and quoted from the Seed *(builds 0017's excerpt and 0029's Sources into a surface; bears on 0026)* |
| [0031](./0031-a-finding-is-worked-in-somebodys-queue-and-nobodys-queue-is-first.md) | A Finding is worked in somebody’s queue, nobody’s queue is first, and the place it cites is opened under whoever writes there *(implements LAW-007 and 0010; builds 0030’s quotation into a second surface)* |
| [0032](./0032-a-lens-has-an-identity-and-a-reading-goes-on-record-against-it.md) | A Lens has an identity, held versions are cited not carried, and a reading taken against other criteria is a third statement *(implements 0016 and §6; uses 0012's idempotence; what it retained is first used by 0033)* |
| [0033](./0033-what-changed-is-worked-out-again-from-the-inputs-a-reading-cites.md) | What changed is worked out again from the inputs a reading cites, and each half of the feed states its own horizon *(exercises 0016's recomputation and uses what 0032 retained; bound by 0012 on what may never appear; one figure corrected by 0034)* |
| [0034](./0034-a-reading-is-never-compared-against-itself-and-the-door-is-one-function.md) | A reading is never compared against itself, and the Door's second operation is one function both callers call *(refines 0016 on which reading a trend is stated against; implements LAW-002's second operation; corrects one figure in 0033)* |
| [0035](./0035-why-a-corpus-cannot-be-read-is-said-to-its-reader.md) | Why a Corpus cannot be read is said to its reader, and a Finding code is a surface *(builds §8; applies LAW-010 where a reason reached `noop`; answers the surface guard's open question; uses 0034 on where a sentence is written)* |
| [0036](./0036-a-quotation-is-long-enough-to-check-a-claim-against-and-cuts-at-a-word.md) | A quotation is long enough to check a claim against, and cuts where the source breaks a word *(takes the decision 0030 declined; refines 0017 on the size of a cut and where it falls; corrects what 0012's idempotence is reported as on the change feed)* |
| [0037](./0037-a-request-that-says-who-may-make-it-is-checked-against-a-cast.md) | A request that says who may make it is checked against a cast, and a corpus says how it writes more than one *(implements 0020's across-Facts half; follows 0019 on a Facet's own criteria and 0021 on a Facet saying something about itself; declines the alias folding 0021's registry could have carried)* |
| [0038](./0038-the-frame-names-the-surface-and-carries-the-one-action.md) | The frame names the surface a reader is on, and carries the one action that writes *(applies 0019's “say what you are” to the product's own surfaces; keeps 0013's token layer and 0018's vendored components; puts 0035's remedy within reach of every surface)* |
| [0039](./0039-a-corpus-is-the-workspace-and-a-finding-is-a-row.md) | A Corpus is the workspace, and a Finding is a row you open *(reverses 0038 on where the destinations are drawn; makes 0031's queue scannable at a hundred Findings; reads LAW-009 as “on this surface, no navigation” and says why)* |
| [0040](./0040-a-corpus-opens-at-the-work-and-carries-its-own-warning.md) | A Corpus opens at the work, and the denominator's warning goes with it *(reverses 0033 §4 and the same reasoning in 0038; keeps LAW-006's denominator sayable on the surface that draws the figures; respects 0035 on a shelf a reader must not be sent past)* |
