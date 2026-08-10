# The Studio — read-only phase — Design

**Date:** 2026-08-10
**Status:** Approved design, ready for implementation planning
**Extends:** `2026-08-07-ddd-comply-design.md` §10 (Interface) and §11 steps 1–2

This document is normative. It designs the first phase of the **Studio**: the surface through which a
person reads a Corpus, sees where its knowledge is thin, and sees what disagrees with itself.

Terms are used exactly as `UBIQUITOUS_LANGUAGE.md` defines them. Where this document and an earlier one
disagree on a word, this one is current — see ADR-0015.

---

## 1. Why this exists now

Steps 0–2 of the build sequence are implemented in `libs/`: a Corpus is imported, a Readiness Matrix is
computed, three integrity Checks run, and a command-line runner prints the result. That runner is a
compiler. It answers the product's two questions for whoever is holding a terminal, which is not the
person who holds the knowledge.

LAW-007 states that a finding which belongs to nobody is a dashboard, and that a score decays until it
is ignored unless a named person is accountable for it. A report only an engineer can run is that
failure with extra steps: the Module Owner never sees the Finding routed to them.

The Studio closes that gap. Its purpose is to carry a Corpus up the Maturity ladder — Facts arrive
machine-inferred, and a Module Owner or product manager refines, corroborates, and approves them
**inside the Studio**. This phase delivers the reading half of that. **A read-only Studio is a phase,
never the destination.**

## 2. Goals and non-goals

**Goals**

- Put the Readiness Matrix and the Findings in front of the people accountable for them, in a browser.
- Show Readiness and Integrity as two independent readings, neither ever fused into one figure.
- Read any Corpus, of any shape, without the Studio containing one business word (LAW-004).
- Make every claim verifiable in place, without leaving the Studio (LAW-009).
- Move every judgment out of the command-line runner and into the product.

**Non-goals for this phase**, recorded so they are not reintroduced silently:

| Non-goal | Why deferred |
| --- | --- |
| Fact editing, Change Requests, the Door's write path | Step 3 of the build sequence, and the largest step. This phase must exist first to know what editing should feel like |
| Rename | Step 4. Needs the Occurrence index |
| Authentication and per-user identity | A Module Owner is free text lifted from a corpus, not an account. Reconciling owner strings with real identities is its own project (§7) |
| PostgreSQL and `libs/system-db` | Arrives with the write path. Nothing in this design moves when it does (§3.5) |
| Lens editing in the Studio | Needs the write path and a review step: a Lens change moves every figure in the product |
| Gap logging, published document snapshots | Step 5 |
| A single "compliance" score, grade, or badge | Forbidden. LAW-006, and §5.1 |

## 3. Architecture

### 3.1 Three processes

```
apps/comply-studio          apps/comply-api                    apps/comply-cli
React 19 + Vite +      ┌──  Fastify + Zod  ──┐                 Seed Adapter runner
React Router           │                     │                        │
      │                │  interpret Seed     │ reads                  │ writes
      │  REST (JSON)   │  through the Lens,  │                        ▼
      └───────────────►│  compute Readiness  │◄────  SHELF: Lens (JSON, retained)
                       │  + Integrity        │              Seed (JSON, immutable,
                       └─────────────────────┘                    digest-named)
                                  │                                   ▲
                       "re-read the source" ──────────────────────────┘
                       calls the Adapter library in-process, writes a
                       new Seed, then loads it. One path, always.
```

### 3.2 The line between extraction and interpretation

The command-line runner extracts and **judges nothing**. It takes source documents and writes them out
in the shape the server understands. Every decision about what a Fact *means* — which rung of the
ladder its status denotes, which Fact Kind its facet carries, whether it is well-formed, whether it is
approved — happens server-side.

This is not a purity argument. It is what makes the product the product: a person tightening a
well-formedness criterion, or renaming a rung, sees the reading change **without an engineer re-running
anything**. Bake interpretation into the extract and every criteria change becomes a re-extraction.

| Half | Declares | Runs in |
| --- | --- | --- |
| `adapter` | which root, which frontmatter keys carry module id, facet, status, owner | the runner |
| `facets`, `maturity`, `statusMappings`, `criteria`, `owners` | facet → Fact Kind, the ladder, what counts as approved, what counts as well-formed | the server |

Both halves remain in the **Ingestion** context, which already *"owns Lenses and Seed Adapters"*
(`docs/domain-model.md`). No bounded context moves.

### 3.3 Two Fact shapes

`libs/comply-core`'s `Fact` is unchanged. A second, rawer shape is introduced for transport:

| Shape | Where | Carries |
| --- | --- | --- |
| `SeedFact` | `libs/comply-seed` | raw status string as written in the source, raw facet name, attributes, relations, container, origin, **excerpt** |
| `Fact` | `libs/comply-core` | as today, including `maturityLevel` and `sources` — produced by applying a Lens |

`libs/comply-ingestion` keeps `decomposeStatus` but no longer calls it while extracting. It gains
`interpret(seed, lens) → { facts, findings }`.

**`excerpt`** is the short span of source text a Fact was extracted from. It exists for LAW-009: a
`{file, line}` pair is verifiable evidence for an engineer at a terminal and useless to a product
manager in a browser, who cannot open it. With the excerpt travelling in the Seed, the Studio shows the
cited text in place and the server never needs access to the original documents. The cost is a
materially larger Seed, accepted deliberately; dropping it later is contained.

### 3.4 The artifacts

| Artifact | Written by | Mutable | Contents |
| --- | --- | --- | --- |
| **Lens** | a person | edited freely; each version that a reading cites is retained | Facets, ladder, status mappings, criteria, owners, optional `note` fields |
| **Seed** | the Adapter | **never** | `SeedFact`s exactly as extracted. No readings, no scores, no Findings |
| **Recorded reading** | the server | a cache, regenerable | per-Module figures and their denominator, keyed by `(seedDigest, lensDigest)` |

Both artifacts are JSON. One format end to end: no conversion step, stable digests, and one Zod idiom.
The single thing YAML would add is comments in the hand-authored Lens, solved instead with optional
`note` fields — a value the Studio can one day display, where a comment is destroyed the first time
anything writes the file programmatically.

A Seed is immutable. Re-reading the source produces a *new* Seed with a new digest and leaves the old
one untouched, because the digest is what makes a load idempotent and gives Genesis something to cite
(ADR-0012).

A Lens, by contrast, is a working file a person edits. Retention is therefore mechanical rather than
disciplinary: **when a reading is recorded, the Lens content as it stood is copied to the shelf under
its digest.** Nobody has to remember to version anything, and any recorded reading stays reproducible
from artifacts still held — which is what withdraws ADR-0014's exemption and keeps LAW-011 true now
rather than eventually (ADR-0016).

### 3.5 Storage, and what changes when the ledger arrives

The **shelf** is a directory. Each Lens found there is a Corpus in the system; Seeds sit beside them.
The server loads Seeds at boot, holds each Corpus in memory, and holds Genesis in memory.

This is scaffolding and is named as such. ADR-0013 already anticipates the replacement — *"a corpus
registry, Lenses, actors, Module Owner assignments … run snapshots"* as ordinary tables behind
`libs/system-db`. When it lands, the shelf becomes a registry and nothing above the API moves, because
**the seam is the Reading, not the storage**.

Constraint accepted: the server needs filesystem access to the source documents to serve the re-read
button. When source lives elsewhere, either the runner runs where the source is and ships the Seed, or
the server grows a fetch. The Seed is the boundary that keeps both options open.

### 3.6 Packages

| Package | Purpose |
| --- | --- |
| `libs/comply-lens` | the rename of `comply-profile` (ADR-0015) |
| `libs/comply-seed` | the Seed's Zod schema — the contract between runner and server |
| `libs/comply-reading` | assembles a Reading from `(Seed, Lens)`: interpret → matrix → checks → trend |
| `libs/comply-contract` | Zod request and response schemas shared by API and Studio |
| `apps/comply-api` | Fastify, read-only |
| `apps/comply-studio` | React, thin local components over CSS custom properties |

`libs/comply-reading` is an application service, not a bounded context. It composes Readiness and
Language Integrity and owns no rules of its own; it exists because both apps need the same composition
and duplicating it would produce two answers to one question.

`apps/comply-cli` becomes two commands: **`extract`** (source → Seed, no judgment) and **`report`**
(calls `comply-reading`, prints for CI). `report` duplicates no judgment — it renders what the server
computes, so a build can still fail when readiness falls.

### 3.7 The design system

ADR-0013 commits the interface to the shared design-system package. It is not reachable from this
repository: there is no `.npmrc`, no registry, and no such dependency in the workspace. The Studio
therefore ships a thin local component layer — roughly a dozen components over CSS custom properties,
no third-party UI library — so adopting the design system later is a contained swap. Introducing
Tailwind or Radix instead would be a deviation from ADR-0013 that also has to be undone. Recorded as a
deviation forced by availability, not preference.

## 4. The two readings

**Readiness** and **Integrity** are independent and are never fused (`UBIQUITOUS_LANGUAGE.md`).

| Reading | Computed by | Shown as |
| --- | --- | --- |
| Readiness | `libs/comply-readiness` | Modules fully approved, out of Modules; per Module, approved out of **declared Facets** |
| Integrity | `libs/comply-integrity` | open Findings, as a count against a named set of Checks |

A Corpus can be fully approved and have no Integrity: every Facet signed off while two Modules quietly
share an identity. Appendix A of the earlier design found exactly that shape in a real Corpus. The two
readings demand different work — *write something down* versus *reconcile two things that disagree* —
and often different people, so a surface that fuses them hides which is failing.

Neither is ever labelled *compliant*, *complete*, or graded. A Corpus is *fully approved against the
Facets its Lens declares*: a sentence that carries its own denominator.

**Why "3 of 20 Modules fully approved" is permitted where "15%" is not.** The forbidden thing is a
single figure standing for a Corpus's worth — a rate, a grade, or a badge, which routes to nobody and
implies nothing is missing. A count names the unit it counts and what it is out of, stays attached to
the Modules it is made of, and is never fused with the other reading. Two counts side by side answer
*how much is agreed* and *how much disagrees* separately, which is the point. A percentage, a letter,
or an average across corpora is out — including on Home, and including in any API response.

## 5. Surfaces

Navigation is three items: **Home · Inbox · Corpus**. The plural of Corpus is Corpus.

Every label the Studio draws for a Facet, a Maturity rung, or a Module comes from the Lens in the
payload. The Studio ships no business word of its own, so LAW-004 cannot be broken in the interface
even by accident — a viewer that *knows* a Facet is called "Terms" is a defect; one that draws a column
per declared Facet is immune.

### 5.1 Home

A work surface, per Corpus. No global figure exists anywhere in the product.

```
┌─ Corpus: Field Service ─────────── read 4 hours ago ─┐
│  Readiness   Modules fully approved  3 of 20         │
│  Integrity   Open Findings           14              │
│                                                      │
│  Needs work            approved / declared           │
│  Dispatching  ▸ Marie L.      2 / 5      ▼ 1         │
│  Invoicing    ▸ no owner ⚠    0 / 5       —          │
│  Scheduling   ▸ Tom V.        4 / 5      ▲ 2         │
└──────────────────────────────────────────────────────┘

What changed
  · Scheduling — Rules became approved            2 days ago
  · Finding appeared — one Term defined twice     2 days ago
  · Corpus read from source                       4 hours ago
```

Rules that hold everywhere on this page:

- Every figure carries the phrase naming what it is out of (LAW-006).
- `—` means **no baseline**, never zero. A first-ever reading and a figure that held steady are
  different facts and are never drawn the same (`trend()`).
- The age of the reading is always visible. A surface that cannot say how old its reading is invites
  false confidence.
- A Module with no Owner is marked conspicuously. LAW-007 makes that a defect, not a blank.

**The "What changed" feed reports what changed in the Corpus, never what the tooling did.** Three item
kinds: a Corpus was read from source; a Module's Facet became approved or fell back; a Finding appeared
or stopped appearing. *"A run completed"* never appears — it is noise the tooling generated about
itself, which is what ADR-0012 exists to keep out of the record.

### 5.2 Inbox

`/inbox?owner=…`, deep-linkable, so a person can bookmark their queue and be sent it.

**The first bucket is always "Routes to nobody".** `missing-owner` is already a Finding code, and
LAW-007's thesis is that a violation belonging to nobody is how a knowledge base quietly dies. Mixed
into a flat list, unowned Findings reproduce that death; first on the page, a law becomes a screen.

Then one group per Owner. Each Finding shows its message, its Module, and **the source text it cites**,
inline (§3.3).

### 5.3 Corpus list, and Corpus detail

The list shows each Corpus with its two headline figures and the age of its reading.

Corpus detail **is** the Readiness Matrix:

```
Field Service · 20 Modules · read through Lens "field-service" v3   [ Re-read the source ]

                Overview   Terms   Rules   Messages   Transitions
Dispatching        ✓        ◑       ◔        ·           ·
Invoicing          ◔        ·       ·        ·           ·
Scheduling         ✓        ✓       ◑        ·           ·
                                             ▲
                          no Module has this yet — declared by the Lens

✓ approved   ◑ well-formed   ◔ present   · absent
Denominator: the 5 Facets this Corpus's Lens declares. Knowledge nobody has
written down anywhere is not counted here, and cannot be.
```

The grid is primary rather than decorative because it is the only view readable in two directions, and
the two readings mean different things:

- **Along a row** — this Module is thin. Routes to its Owner. Ordinary work.
- **Down a column** — this Facet is absent across *every* Module. That is usually not twenty people
  failing to write something. Either nobody has started that Facet, or **the Lens declares a Facet this
  business does not have** — a defect in the *denominator*, which is silently deflating every figure in
  the product. No per-Module list can show this; an empty column shows it at a glance.

So an all-absent column is called out explicitly, with the Lens named as the thing that declared it,
and the denominator is stated in words on the page. The grid is also where LAW-006's **unknown band**
can be said without being ignored, because the reader is already looking at the boundary of what is
measured.

Accepted risk: the grid is harder to make responsive and degrades past roughly forty Modules. Revisit
with a list-primary layout if a real Corpus proves it — this choice is to be tested against real
corpora, not assumed correct.

### 5.4 Module detail, Facet, Fact

- **Module** — its Owner or a conspicuous absence; each Facet's state with its **unmet criteria spelled
  out** (`MatrixCell.unmet` already carries them); that Module's Findings; its Facts grouped by Facet.
- **Fact** — attributes, its Sources **as a set**, its Maturity rung, where it came from, its excerpt.
  Maturity and Sources are drawn as two separate things, always: conflating them is what made coverage
  uncomputable in the first place (LAW-005).

### 5.5 Re-read the source

One action, on Corpus detail. It calls the Seed Adapter library **in-process** — the server does not
spawn the runner — writes a new immutable Seed, then loads it. One path from source to Corpus whether
the trigger is the runner, this button, or CI; two paths would be the second entrance LAW-002 exists to
refuse, and its failure mode is quiet disagreement about which reading is true.

A load whose digest matches the current Genesis is a no-op (ADR-0012). No reading is recorded unless an
input changed (§6).

Note for the phase that follows: once Change Requests exist, this button inherits ADR-0012's divergence
guard — a load into a diverged Corpus is refused unless forced, after a preview naming what would be
discarded, and is never permitted on a timer. In this phase nothing can diverge, because nothing writes.

## 6. When a reading is recorded

A reading is a pure function of `(Seed, Lens)`. It is recorded when, and only when, one of those
changes, and it names both digests (ADR-0016).

Reading is free and unrecorded: the server computes one per request. There is no "take a reading"
action, because there is nothing for a person to decide.

This exists because the button will be pressed several times a morning. Recording on every load would
make "the previous reading" mean *twenty minutes ago*, every delta read zero, and the trend column —
the mechanism by which a figure routes to a person and moves (ADR-0010) — decorative, while last week's
useful baseline sat buried under a hundred files. Deduplicating by input digest makes the trend
statement precise instead: **what changed since the last time either the knowledge or the criteria
changed.**

One consequence must be visible in the interface: a reading changes when criteria are tightened, not
only when knowledge is written. A drop caused by a stricter Lens is not a regression in the Corpus, and
a surface that cannot tell the two apart will be read as though it were.

## 7. Identity

There is no login in this phase. A Module Owner is free text lifted from a corpus — an `ownerKey` in
frontmatter, or the Lens's `owners` map — not an account. The Inbox is every Finding, grouped by Owner,
with the Owner in the URL. Read access is unrestricted; the corpora in scope hold no commercially
sensitive knowledge.

The deferred work is named so it is not mistaken for a detail: reconciling free-text owner strings with
real identities is a project. Two corpora will spell the same person differently, which is itself a
split identity, and an actor registry is where that gets resolved.

## 8. Failure

Failure splits in two, and the split matters more than either half.

- **A document that will not parse is a Finding.** `unparsable-document` is already a code. Anything
  that does not parse cleanly is surfaced, not suppressed: irregular sections and unrecognised status
  values are exactly the defects worth showing. It reaches the Inbox like any other Finding.
- **A Lens that will not load is not a Finding** — nothing about that Corpus can be read at all. It
  appears in the list as unreadable, with the reason **in business language**: not *"schema validation
  failed"* but *"this Corpus can't be read yet — its Lens names a maturity step that isn't on its
  ladder."* LAW-010 governs error states, and this is the error a business user is most likely to meet.

## 9. Build sequence

| # | Slice | Done when |
| --- | --- | --- |
| 0 | `comply-profile` → `comply-lens` | Mechanical rename in its own commit; tests unchanged and green |
| 1 | `libs/comply-seed`, CLI `extract` | Both fixture corpora produce immutable, digest-named Seeds |
| 2 | `interpret(seed, lens)`, `libs/comply-reading` | CLI `report` reads a **Seed** and reproduces today's output exactly; `render.test.ts` still passes |
| 3 | `apps/comply-api` | Both fixtures served through contract-validated read-only endpoints |
| 4 | `checkSurfaceVocabulary`, then Corpus list and Corpus detail | The Matrix on screen for two dissimilar corpora. The guard lands **before the first UI string** |
| 5 | Module detail, Fact detail | The drill path works end to end |
| 6 | Inbox | Routes-to-nobody bucket first; owner filter in the URL |
| 7 | Recorded readings, Home | Figures and "What changed", deduplicated by `(seedDigest, lensDigest)` |
| 8 | Re-read the source | Extract → write Seed → load, in-process, one path |

**Slice 2 is the risk and is deliberately early.** If `report`-from-Seed does not reproduce
`report`-from-source exactly, the extraction/interpretation line is in the wrong place, and that is
cheapest to discover before any interface exists.

## 10. Endpoints

Fastify with `fastify-type-provider-zod`; schemas from `libs/comply-contract`.

```
GET  /corpus                        list: id, name, reading age, the two headline figures
GET  /corpus/:id/reading            facets, ladder, matrix, per-Module figures + total, trend
GET  /corpus/:id/modules/:moduleId  owner, cells with unmet criteria, findings, facts
GET  /corpus/:id/facts/:factId      attributes, sources, maturity, origin, excerpt
GET  /corpus/:id/findings?owner=    grouped, unowned first
POST /corpus/:id/reads              re-read the source
```

Every response carries its denominators. No endpoint returns a fused readiness-and-integrity figure,
because no such figure exists.

## 11. Verification

- **Two-corpus rule.** Every endpoint and every screen exercised against both fixture corpora, which
  differ in Facets, ladder (numeric versus prose), Module set, and owner mechanism. The Studio runs
  against both in development, so shape-leakage shows up while building rather than in an audit.
- **Both vocabulary guards in CI.** `checkCoreVocabulary` as today, plus `checkSurfaceVocabulary` —
  failing the build when *commit, branch, schema, parse, index, repository, migration, null*, or
  *compliant* appears in a business-facing string. LAW-010 is testable and is tested.
- **Recording is idempotent.** A second load of an unchanged Seed records no new reading.
- **Absence is preserved.** No baseline stays distinct from no change, at every layer that carries a
  trend.
- **A Seed is never rewritten.** Re-extraction produces a new digest-named file and leaves prior Seeds
  byte-identical.

## 12. Risks

| Risk | Mitigation |
| --- | --- |
| The grid does not survive a real Corpus's size | Named as untested (§5.3). List-primary layout is the fallback and costs only the column reading |
| Seeds grow large because they carry excerpts | Contained: `excerpt` is one field, droppable without touching the extraction/interpretation line |
| The read-only Studio is treated as finished | Recorded in the glossary: a read-only Studio is a phase, never the destination |
| Advisory Inbox is ignored because nothing can be fixed in place | Accepted for this phase. It is the evidence that decides what editing should do, which is why step 3 follows rather than precedes |
| Interpretation drifts between `report` and the API | Both call `libs/comply-reading`; slice 2 asserts byte-equality against the current output |
| Trend is meaningless because readings are recorded too often | ADR-0016: recorded only when an input digest changes |
| A stricter Lens reads as a regression in the Corpus | §6: the interface must distinguish a criteria change from a knowledge change |

## 13. Open questions

1. Does the grid hold up against a real Corpus with more than forty Modules?
2. What retention do Seeds and Lens versions get before pruning, given that pruning costs recomputable
   history and can never cost a Fact?
3. Is `excerpt` a fixed number of lines, the extracted span, or the whole containing block?
4. When the shared design system becomes reachable, is the thin component layer swapped wholesale or
   left in place behind it?
