# A Facet says what it is — Design

**Date:** 2026-08-11
**Status:** Approved design, ready for implementation
**Extends:** `2026-08-10-studio-readonly-design.md` §5.4, and ADR-0005's account of what a Lens absorbs

This document is normative. It makes each Facet of a Module say **what it is**, lets two Facets of one
Fact Kind be judged differently, and puts a real DDD Corpus on the shelf to prove both.

Terms are used exactly as `UBIQUITOUS_LANGUAGE.md` defines them.

---

## 1. Why this exists now

The Studio draws a column headed `events` and never says what an event is, what belongs under one, or
what would make it complete. Facet names arrive from the source — they are whatever word the corpus
happened to use in its frontmatter — so a reader meets a grid of slugs and has to already know the
answer to read it. The product's whole claim is that it shows a person what to write down next, and it
currently shows them a word.

That is the reported gap. Reaching for it exposed a second one that blocks it.

**Criteria are keyed by Fact Kind.** `criteria: { Module: [...], Term: [...], Rule: [...] }`. Both
Commands and Events are Messages (ADR-0005), so today they must be judged by identical criteria. There
is no way to say *an Event needs a meaning and the Rule it came from* while *a Command needs an actor
and an effect* — and that difference is most of what makes them different things. So the interesting
half of a DDD reading cannot be expressed at all.

ADR-0005 anticipated this. Pressure to add Fact Kinds "is absorbed in the Profile — through facets,
attributes, and well-formedness criteria". Criteria that cannot vary per Facet only half-absorb it.

## 2. Goals and non-goals

**Goals**

- Each Facet can say what it is called and what belongs under it, in business language, from the Lens.
- Two Facets of one Fact Kind can be judged by different criteria.
- A real DDD Corpus reads on the shelf: `vertuo-domain`, 13 Modules, 7 Facets.

**Non-goals**

| Non-goal | Why |
| --- | --- |
| A sixth Fact Kind | ADR-0005 stands. Everything DDD needs maps onto the five |
| Committing the DDD corpus into this repository | It is another repository and another team's record. The Lens points at a checkout; the two in-repo fixtures remain what tests run against (ADR-0001) |
| Product modules as Modules | A Module is one domain, a Corpus is all of them. The ~30 French product modules in `module-domain-mapping.md` map many-to-one onto the 13 and are not the unit here |
| Rewriting `vertuo-domain` to score better | The tool reports what is written down. Changing the corpus to move a figure is the failure it exists to detect |
| Criteria inheritance from a Fact Kind | See §3.1. Add it when a corpus has enough Facets of one Kind to need it |

## 3. What a Lens can say

### 3.1 Criteria belong to a Facet

`criteria` moves from a Fact-Kind-keyed map at the top of the Lens onto the Facet that declares them,
and the map is removed rather than kept as a default.

```json
{ "name": "events", "label": "Events", "factKind": "Message", "extractor": "table",
  "columns": { "Event": "name", "Meaning": "definition", "Related Rule": "rule" },
  "describes": "Business facts that have already happened, which other Modules react to.",
  "criteria": [{ "type": "requiredAttributes", "attributes": ["name", "definition", "rule"] }] }
```

Removed rather than kept, because two ways to say one thing means a precedence rule to explain
forever, and a hand-authored file is where that cost lands hardest. The DDD Lens has seven Facets over
five Kinds, so the duplication this costs is negligible. When a corpus arrives with ten Rule Facets,
inheritance can be added knowing what it is for.

Consequences, both contained:

- `evaluateFact(fact, lens)` looks up by `fact.facet` rather than `fact.kind`. A `Fact` already
  carries its Facet, so nothing new has to be threaded through.
- `evaluateFacet(facts, kind, lens)` takes the Facet name instead of the Kind.
- Both fixture Lenses are migrated. Two files.

Recorded as **ADR-0019**, because a Lens is an artifact people hand-author and its shape is a decision,
not an implementation detail.

### 3.2 A Facet says what it is called, and what belongs under it

Two optional fields on a Facet, both **drawn and never interpreted** — the same standing every other
business word in a Lens has (LAW-004):

| Field | For |
| --- | --- |
| `label` | What to call the Facet where a person reads it. Facet names come from the source, so they are often slugs: `business-rules` is a worse column heading than `Business Rules`. Defaults to the name |
| `describes` | A sentence or two saying what belongs under this Facet |

`label` is on the Lens rather than lifted from the source because the Studio has to name a Facet that
**no document exists for**. An all-absent column is the reading §5.3 of the read-only design exists to
make visible, and it cannot be labelled from documents that are not there.

A Facet that declares no `describes` says nothing extra. No placeholder, and no empty space where a
sentence would go.

## 4. Where they are drawn

| Surface | Draws |
| --- | --- |
| Readiness Matrix | `label` as the column heading, with `describes` reachable on the heading |
| Module detail | `describes` in full on the Facet's card, above what stands between it and approval |

The matrix answers *which of these are done*, and seven paragraphs stacked under the grid would bury
the denominator sentences already there. Module detail answers *and then what*, which is where somebody
deciding what to write is looking — so that is where the description belongs in full.

The matrix heading is the weaker half of this: text reachable only by hovering is not reachable by
everyone. It is accepted for this change because the same words are one click away in full, on the page
that exists to be acted on. Revisit if a reader reports the grid still reads as slugs.

## 5. The contract

Two payload shapes carry a Facet by name today and must carry its label and description instead:

- `corpusDetailSchema.reading.facets` is `string[]`. It becomes a list of `{ name, label, describes? }`.
  The cross-check that each Module's cells line up with the Lens's declared Facets compares `name`.
- `moduleFacetSchema` gains `label` and optional `describes` beside the `facet` it already carries.

`name` remains what everything is keyed on; `label` is only ever drawn. Keeping them apart is what
stops a renamed label from silently becoming a different Facet.

## 6. The DDD Corpus

A Lens over `vertuo-domain`, committed at `lenses/vertuo-domain.json`.

The corpus is uniformly shaped, which is what makes this a Lens and not an extraction project. Every
one of its ~100 documents carries the same frontmatter keys:

```yaml
domain: field-service        # the Module
section: events              # the Facet
status: Candidate - Derived From Current Backend Behavior
```

So the adapter is `moduleIdKey: "domain"`, `facetKey: "section"`, `statusKey: "status"`, and **no owner
key, because the corpus has none.**

| Facet | Fact Kind | Extractor |
| --- | --- | --- |
| `overview` (from `index`) | Module | document |
| `glossary` | Term | heading |
| `business-rules` | Rule | heading |
| `commands` | Message | table |
| `events` | Message | table |
| `workflows` | Rule | heading |
| `state-machines` | Transition | heading |

`commands` and `events` are both Messages and are judged differently, which is §3.1 earning its place
in the change that needed it.

### 6.1 What it will say, and why that is the point

Every document in the corpus carries the same status, `Candidate - Derived From Current Backend
Behavior`, and none names an owner. So the ladder is `candidate → reviewed → agreed` with
`approvedAtOrAbove: agreed`, and the first reading is:

**0 of 13 Modules fully approved. No Module has an Owner.**

That is not a disappointing result to be tuned away. It is the true sentence — *this knowledge is
written down and has never been reviewed by the people accountable for it* — and producing it is what
the product is for. LAW-007 says a Module without an Owner is a defect rather than a blank, and
thirteen conspicuous marks is that law doing its job on a real corpus.

### 6.2 Reaching the source

A Lens's `root` resolves relative to the Lens file, so `lenses/vertuo-domain.json` points at
`../../vertuo-domain/domains` and needs the two repositories checked out as siblings.

Two scripts, and the fixtures shelf is untouched:

| Command | Does |
| --- | --- |
| `pnpm shelf:domain` | Writes down what is at source in `vertuo-domain`, as a Seed, onto the `lenses` shelf |
| `pnpm dev:domain` | Serves that shelf — the API and the Studio, against the DDD Corpus |

Kept on a shelf of its own rather than added to the fixtures shelf, because tests run against the
fixtures and a test that needs a sibling checkout is a test that fails on a machine that does not have
one.

If the sibling is missing, `extract` fails saying which directory it could not read — a person's own
checkout, in words they can act on (LAW-010).

## 7. Verification

- **Two-corpus rule (ADR-0001).** Both fixture Lenses gain labels, descriptions and per-Facet criteria,
  so both exercise the change. Neither is a DDD corpus, which is the point: if the DDD shape has leaked
  into the core, one of them stops passing.
- **Two Facets of one Fact Kind, judged differently, in a fixture.** This is the whole reason §3.1
  exists and it must be covered in-repo rather than only by a sibling corpus. One fixture gains a
  second Facet of a Kind it already has, with different criteria, and a test asserts one is well-formed
  where the other is not.
- **A Facet with no `describes` draws nothing extra**, and a Facet with no `label` is drawn by its name.
- **An all-absent column still carries its label**, because that column is the reading §5.3 exists for.
- **Both vocabulary guards green.** Every DDD word — event, command, glossary, aggregate — lives in a
  Lens or a corpus, never in this repository's source. `checkCoreVocabulary` is what proves it.
- **The DDD Corpus reads end to end**: `pnpm shelf:domain` then `pnpm comply report`, 13 Modules and 7
  Facets, and the same reading in the Studio.

## 8. Risks

| Risk | Mitigation |
| --- | --- |
| A DDD word leaks into the core because a real DDD corpus was in front of us while writing it | `checkCoreVocabulary`, and the two deliberately non-DDD fixtures that tests still run against |
| Duplicated criteria across Facets of one Kind | Accepted at this size (§3.1); inheritance is addable later without changing a Facet's shape |
| `describes` is written once and rots as criteria change | It sits directly above the criteria on Module detail, which is the one place a reader would notice them disagreeing |
| The grid at 13 Modules × 7 Facets | This is the first real test of §5.3's untested risk, and 13 is well inside its ~40 estimate. It is a test, not a proof |
| The DDD Lens breaks when `vertuo-domain` is reorganised | It is a Lens: one file, and the failure is a Finding or an unreadable Corpus rather than a broken build |

## 9. Build sequence

| # | Slice | Done when |
| --- | --- | --- |
| 0 | ADR-0019 | The decision that criteria belong to a Facet is recorded before code moves |
| 1 | Criteria onto the Facet | Both fixtures migrated, `wellformed.ts` keys off the Facet, all tests green |
| 2 | Two Facets of one Kind in a fixture | A test asserts they are judged differently |
| 3 | `label` and `describes` through Lens, contract and API | Both fixtures carry them; contract cross-checks still key on `name` |
| 4 | The Studio draws them | Matrix headings labelled, Module detail carries the description |
| 5 | `lenses/vertuo-domain.json` and the two scripts | 13 Modules × 7 Facets read end to end, in the Studio |

Slice 1 comes before anything a reader sees, because it is the one that changes a file people
hand-author; discovering it is wrong after two surfaces depend on it is the expensive order.

## 10. Open questions

1. Does the matrix still read as slugs to somebody who does not hover? §4 accepts the risk and names
   the fallback as writing the descriptions out somewhere on that page.
2. `workflows` is mapped to Rule. A workflow is arguably a Transition with prose, and which it is
   affects what `allStatesReachable` could ever say about it. Decided by looking at what the documents
   actually contain, in the slice that writes the Lens.
3. When `vertuo-domain` gains owners, does the Lens's `owners` map carry them, or does the corpus grow
   an owner key? The second is better and is that repository's decision, not this one's.
