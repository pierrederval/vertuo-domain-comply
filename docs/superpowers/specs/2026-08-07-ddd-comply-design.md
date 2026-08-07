# Vertuo Domain Comply — Design

**Date:** 2026-08-07
**Status:** Approved design, ready for implementation planning

This document is normative except for Appendix A, which is illustrative evidence from a pilot and
must not be treated as a requirement or reflected in any schema.

---

## 1. Problem

A body of business knowledge — a **Corpus** — is normally assembled from several sources: inference
from an existing system, imported documents, interviews, prior attempts. It is then used by people
and, increasingly, by agents that build software from it.

A human filling a knowledge gap asks a colleague. An agent has no such protocol: it invents a term or
a rule and writes code against the invention. So the knowledge must be materialised — and once
materialised, measured, because unmeasured knowledge rots without anyone noticing.

Two questions are unanswerable today and hurt continuously:

1. **Is the Corpus good enough to use?** Per Module, is each Facet present, internally well-formed,
   and approved by a named owner — or merely machine-inferred and never checked?
2. **Does a change to the language reach every occurrence?** A Term appears across rules, messages,
   transitions, and cross-cutting documents. A rename that half-lands fragments the Corpus into
   synonyms that disagree, and nothing detects it.

A common root cause makes the first question unanswerable in practice: source and review state are
frequently recorded in a single field, so neither can be grouped independently and coverage cannot be
computed at all.

## 2. Goals and non-goals

**Goals**

- Measure and raise the readiness of a Corpus, per Module, with a named owner for each.
- Guarantee referential integrity of the ubiquitous language across the Corpus.
- Let business users do both from a business-facing interface, never from developer tooling.
- Keep the Corpus protected: no direct edits; every change is a checked, reviewed proposal.
- Remain **domain-agnostic**: no corpus, language, or organisation is privileged (ADR-0001).

**Non-goals** — rejected during design, recorded so they are not silently reintroduced:

| Non-goal | Why rejected |
| --- | --- |
| Generating application code from the Corpus | Reinstates the completeness trap: to generate, the model must describe everything, including the majority that carries no business meaning. Generation is also now the cheap step. (ADR-0009) |
| Verifying application code against the Corpus | Different product, different buyer, different failure modes. Deliberately out of bounds. (ADR-0009) |
| Git as the change-control substrate | Keeps the tool in engineering territory; business users will not adopt it. (ADR-0003) |
| A generated documentation site as the primary output | That is the failure state this product exists to escape. |
| Privileging the first Corpus imported | Every corpus is a pilot. Shape leaking into the core is a defect. (ADR-0001, LAW-004) |

## 3. Domain model

Five **Fact Kinds**, a closed set (ADR-0005):

| Kind | Answers |
| --- | --- |
| **Module** | What area of the business is this, what is it called, who owns it? |
| **Term** | What does this word mean, and what else is it called? |
| **Rule** | What must always be true, or hold before something may happen? |
| **Message** | What can be asked of the business, and what does the business announce? |
| **Transition** | What states exist, and what moves between them? |

Every Fact carries three dimensions:

```
MATURITY   (ordered ladder)   present → well-formed → approved
SOURCES    (a set)            provenance; several is meaningful
TRUST      (derived)          f(maturity, corroboration, source independence)
```

**Sources are a set, not a rung** (ADR-0006). A Fact inferred from a system, confirmed in an
interview, and stated in a document is materially stronger than the same Fact from one unreviewed
inference. Corroboration is first-class signal, as evidence is in an audit — and it makes conflict
representable: two Sources asserting incompatible things is a Finding, not a silent overwrite.

The **ladder's step names are Profile data**; the core defines only the ordering and the three
questions behind it. Provenance is recorded per Fact, never per document.

## 4. Component A — Readiness Matrix

Answers *"is the Corpus good enough?"* by separating three questions that are commonly conflated:

1. **Present** — does the Facet exist at all?
2. **Well-formed** — is it internally sufficient (§8)?
3. **Approved** — has the named Module Owner signed it off?

A Fact can be approved and still nearly empty, which is why presence and well-formedness are measured
separately from approval.

Reported **per Module with a trend**, never as one global figure (ADR-0010). A global percentage
routes to nobody and motivates no one; a per-Module delta routes to a person and moves.

**Stated limit.** The Matrix measures whether declared knowledge is complete and reviewed. Knowledge
that exists in the business but was never written down anywhere is not measurable. It is estimated —
from demand signals (§7) and expert sampling — and displayed as an explicit unknown band. Coverage is
never presented without its denominator (LAW-006).

## 5. Component B — Language Integrity

Answers *"does a change to the language reach every occurrence?"* Built on a Term registry and an
Occurrence index over the whole Corpus.

| Check | Catches | Requires | Phase |
| --- | --- | --- | --- |
| Split identity | one Module known by two identifiers | exact match | v1 |
| Broken reference | a citation pointing nowhere | exact match | v1 |
| Conflicting definition | one Term defined differently in two places | exact match | v1 |
| Orphan / unknown Term | defined-never-used; used-never-defined | word-formation rules | v1 |
| Rename propagation | changing a Term everywhere it appears | word-formation rules | v2 |

**Rename is classify → preview → apply** (ADR-0008). Each Occurrence is marked certain or ambiguous;
ambiguous sites are never applied automatically. Word-formation rules — inflection, elision,
agreement, casing, terms nested inside other terms — are **locale-specific and supplied by the
Profile**. Supporting another language means supplying rules, not changing the engine.

The three exact-match checks need no linguistic knowledge and ship first.

## 6. Architecture

The Corpus is an append-only ledger behind a single write interface.

```
   Studio (business users)      THE DOOR              LEDGER              PUBLISHED OUTPUTS
   ┌──────────────┐          ┌──────────┐      ┌──────────────┐        ┌───────────────────┐
   │ edit a Fact  │─────────►│  write   │─────►│ fact_version │───────►│ document snapshot │
   └──────────────┘          │  API     │      │ (append-only)│        │ machine index     │
                             └──────────┘      └──────────────┘        │ agent query iface │
                                  ▲                    │               └───────────────────┘
                                  │                    ▼                    read-only,
                        Propose: Checks +         audit trail =              regenerable
                        human review              the ledger
                        Load: one Genesis
                        record (ADR-0012)
```

- A user edit never mutates the Corpus; it opens a **Change Request** — a set of proposed Fact
  Versions.
- **Checks run against the Change Request**: integrity, well-formedness, readiness delta.
- **Approval commits.** **Rollback appends a reversal.** Nothing is deleted (ADR-0002).
- **Concurrency** is optimistic locking per Fact — strictly better than textual merge conflicts, and
  users never meet the word "conflict".
- **Diffs are Fact-level and readable by a non-engineer** — *"this Rule's statement changed; two
  aliases added"* — never textual.

**Store:** PostgreSQL (ADR-0011).

### Costs this architecture accepts

Delegating change control to git would have supplied versioning, diffing, review, rollback, and a
tamper-evident audit trail at no cost. ADR-0003 gives that up deliberately, in exchange for adoption
by non-engineers. The resulting work must be budgeted, not discovered:

| Owed | Must be built |
| --- | --- |
| History and attribution | Fact-version history interface |
| Rollback | Reversal-append operation and its interface |
| Durability | Backup and recovery for the ledger, with stated objectives. Seed export (§8) is the portable half of this. |
| Engineer and agent access | The published-output pipeline (§7) |

## 7. Published outputs

Derived, regenerable, read-only. Deleting all of them loses nothing (ADR-0007, LAW-011).

- **Document snapshot** — the Corpus in readable form, for people and existing tooling.
- **Machine-readable index** — the five Fact Kinds with Maturity, Sources, and Trust.
- **Agent query interface** — every response carries Maturity and Sources, so a consumer can
  distinguish agreed knowledge from a guess.

**Gap logging.** Every query that returns nothing, or returns only low-Trust Facts, is recorded. That
log is the backlog of what to capture next, ranked by real demand rather than intuition about what
ought to be documented. It is the only part of the system that improves the longer it runs, and it is
therefore architecturally load-bearing despite shipping late.

## 8. Ingestion: Profile and Seed Adapter

All business-specific assumptions are confined here (ADR-0001).

A **Profile** declares how one Corpus is interpreted:

- which Facets exist and which Fact Kind each carries;
- the Maturity ladder's step names and their order;
- the locale and its word-formation rules;
- the well-formedness criteria (§9);
- how any composite imported field decomposes into Maturity and Sources.

A **Seed** is a portable serialisation of a whole Corpus, and a **Seed Adapter** translates
bidirectionally between one external shape and a Seed. Seeds bootstrap an environment, move a Corpus
between environments, back it up, and set up tests — one mechanism for testing and production alike.

Loading a Seed passes through the Door but is **not** a Change Request. The Door accepts two
operations: **Propose**, which records one Fact Version per changed Fact, and **Load**, which records
exactly one **Genesis** entry carrying the Seed's digest and Fact count. Recording a load as one event
per Fact would bury every real decision under noise the tooling generated about itself (ADR-0012).

Loading is atomic and idempotent by digest. Loading into a Corpus that has diverged since its last
Genesis is refused unless explicitly forced, after a preview naming what would be discarded. Scheduled
loading into a diverged Corpus is never permitted — a machine may not discard human decisions on a
timer.

Every Adapter emits a **parse-failure report**. Anything that does not parse cleanly is a Finding,
not an error to suppress: irregular sections, inconsistent identifiers, and unrecognised status values
are exactly the defects worth surfacing.

**Two-corpus rule.** No ingestion feature is complete until it works against two differently-shaped
corpora. A deliberately dissimilar fixture corpus is part of the test suite.

## 9. Well-formedness criteria

Criteria are **Profile data, not core logic**. The core supplies the evaluation engine and a starter
set that a Profile may override:

| Kind | Well-formed when |
| --- | --- |
| **Module** | has a name, a canonical Term, a description, and a named Owner |
| **Term** | has a definition; aliases declared structurally rather than buried in prose |
| **Rule** | has an identifier, a rule type, a statement, and at least one Source |
| **Message** | has an actor and at least one governing Rule |
| **Transition** | every state reachable; every transition has a guard |

Criteria must be confirmed with the owners of a given Corpus before its score is published. A score
whose criteria nobody agreed to is gamed or ignored.

## 10. Interface

A business-facing studio, consuming the shared design system and API contract packages (ADR-0011).
No compiler, schema, or repository vocabulary reaches any surface (LAW-010).

| Surface | Purpose |
| --- | --- |
| **Modules** | The Readiness Matrix, per Module and Facet, with trend |
| **Inbox** | Findings as a work queue, routed to the Module Owner |
| **Fact editor** | Edit a Fact; produces a Change Request |
| **Review** | Check results with a before/after consequence preview |
| **History** | Fact-version timeline with Sources |

## 11. Build sequence

| Step | Ships | Rationale |
| --- | --- | --- |
| **0** | Profile model, first Seed Adapter, parse-failure report | Nothing works without an indexed Corpus; the failure report is itself a finding |
| **1** | Readiness Matrix: present / well-formed / approved, per Module | First real number. Read-only, zero risk |
| **2** | The three exact-match integrity Checks → Inbox | Read-only, no linguistic knowledge required |
| **3** | Change Requests: edit → Checks → review → commit | The largest step; needs 1 and 2 to have something worth reviewing |
| **4** | Rename propagation with certain/ambiguous classification | Needs the Occurrence index proven by step 2 |
| **5** | Published outputs and gap logging | Cheap once the index exists; starts the compounding loop |

Steps 0–2 are read-only and can run against a real Corpus early. **Step 3 is where this stops being a
report and becomes a product.**

Module Owner capture is a prerequisite of step 1, not a later refinement (ADR-0010).

## 12. Risks

| Risk | Mitigation |
| --- | --- |
| Everything scores red at first and users disengage | Report trend and per-Module deltas, not absolutes |
| Nobody owns raising the score and it decays | Named Owner per Module; Inbox is per-Owner; ownership blocks step 1 |
| Rename corrupts prose | Certain/ambiguous classification; ambiguous never auto-applies |
| Rebuilding version control badly | Append-only only; no in-place mutation; explicit backup and recovery work item |
| Well-formedness criteria are arbitrary and get gamed | Profile-declared and confirmed with owners before publishing a score |
| Business users still find it too technical | LAW-010 is testable; business-facing strings are linted against a forbidden-vocabulary list |
| The first Corpus's shape leaks into the core | Two-corpus rule enforced in the test suite (ADR-0001) |
| It becomes another dead knowledge base | The Corpus is the only writable store; outputs are read-only and regenerated |

## 13. Open questions

1. Do the starter well-formedness criteria (§9) match what business owners consider sufficient?
2. Who is the named Owner of each Module in the first Corpus?
3. Backup and recovery objectives for the ledger.
4. Does the published document snapshot replace the source it was seeded from, or coexist during a
   transition period?
5. What is the second fixture corpus, and how dissimilar must it be to make the two-corpus rule real?

---

## Appendix A — Pilot evidence (non-normative)

Illustrative only. These figures come from one candidate Corpus examined during design. **Nothing
here is a requirement, and no schema, vocabulary, or default may be derived from it.** It is recorded
because it demonstrates that the two problems in §1 are real and measurable, not hypothetical.

Measured across that Corpus's Module × Facet grid:

| State | Share |
| --- | ---: |
| Reviewed and approved | 7% |
| Machine-inferred, never reviewed | 43% |
| Empty placeholder | 18% |
| Facet absent entirely | 32% |

Two of twenty Modules were complete; the remainder scored zero on approval.

The same scan found eight Modules carrying **two identifiers at once** — a rename applied to each
Module's overview document and to none of its other facets. Twenty Modules presented as twenty-eight
identities, so any consumer querying by Module identifier received half a Module.

Both findings were produced by a single read-only scan, which is the basis for sequencing steps 0–2
ahead of any write path.
