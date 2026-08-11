# ADR-0020: Criteria judge structure; only a review judges content

Status: Accepted. Refines ADR-0019.

A well-formedness criterion may ask whether something is **there**, and whether a reference
**resolves**. It may never assess the quality of what is written. No minimum word count, no regular
expression over a definition, no forbidden-phrase list.

Whether a Rule is *correctly stated* is a judgment, and a judgment produces a Finding — cited at its
origin, routed to the Module Owner — never a well-formedness shortfall.

## Why, when the numbers argued the other way

Measured against the DDD Corpus — `vertuo-domain-fr` read through `lenses/vertuo-domain-fr.json`:
20 documented Modules, 153 documents, 1652 Facts.

| Predicate | Facts it would have failed |
| --- | --- |
| Every criterion the Lens already declares | 125 of 1652 (7.6%) — and 81 of those are one extraction artefact, leaving about 44 real |
| Eight-word floor on prose | 153 — 46 Command intents, 25 Event meanings, 62 Glossary definitions, 20 Workflow steps |

So the corpus is very nearly structurally complete and substantively thin in places, and a word count
is the mechanical predicate with the most bite. It is still refused, for three reasons.

A word count is wrong in both directions: it passes twenty words of waffle and fails a precise
six-word definition. It is a proxy standing in for a judgment, and it will be read as the judgment.

Worse, it is a proxy people write to. A corpus measured by length acquires length, and the measure
then degrades the thing it was built to measure — while the reading it produces looks better than
before.

And a shortfall a reader cannot act on is not work. *This definition is under eight words* tells a
Module Owner nothing they can do except pad it. *This rationale restates the rule instead of saying
why it exists* is a job. Only the second is worth a person's queue (LAW-007).

## Where structure is checked, and the line between the two places

Structural checking splits in two, and the split is not negotiable because Readiness and Integrity are
two independent readings that are never fused.

- **Self-contained in one Fact → a criterion.** `evaluateFact(fact, facet)` is handed the Fact and its
  Facet and nothing else, deliberately. A shortfall here means *write something down*.
- **Across Facts → a Check.** Reference resolution, an actor naming a role nobody declared, a Message
  belonging to no declared aggregate. A Finding here means *reconcile two things that disagree*.

A predicate that needs a second Fact is in the wrong half. That is why `referenceResolves` is not a
criterion: `broken-reference` already resolves every reference across the whole Corpus.

## What this admits instead

Two Facet declarations, because both turn a content question into a structural one:

- **`parts`** — a Facet declares the sub-structure one Fact is read from, mapping the source's own
  subheadings onto named attributes the way `columns` maps table headers. *A Rule must say why it
  exists* stops being a judgment about prose and becomes a presence question about a Part.
- **`itemPattern`** — which headings under a Facet are Facts at all. Not cosmetic: **39 of the DDD
  Corpus's 222 "Business Rules" are document furniture** — `Terminologie`, `Statut de Revue PM`, `Liens
  vers d'Autres Connaissances`, `Policies Candidates` — read as Rules, judged for well-formedness, and
  counted in the denominator LAW-006 requires be honest. The remaining 183 all match `^BR-\d{3}`, with
  no near-misses, so the pattern separates them exactly.

  The same question exists for tables and is not yet answered. `events` declares three columns, and a
  second table in the same document headed `Domain Event | Payload (attribut : signification)` shares only
  the first — so **81 of 279 Events (29%) are payload rows carrying a name and nothing else**, each one
  failing two criteria it was never meant to be judged against. A table needs a way to say which header
  row makes it this Facet's table.

`itemPattern` decides item-hood independently of `criteria`, so tightening what counts as enough never
moves the denominator and successive readings stay comparable (ADR-0016).

## A mechanical check that is wrong is worse than a judgment that is vague

The DDD Corpus produces 873 Findings. **772 are `broken-reference`, and 763 of those — 98.8% — are
manufactured by `slugify`.**

The corpus is French. `slugify` reduces a heading with `[^a-z0-9]+`, so every accented letter and every
apostrophe is treated as punctuation and deleted:

| Heading | The link that works at source | What `slugify` computes |
| --- | --- | --- |
| `## BR-006 Modifiabilité du Devis Accepté` | `br-006-modifiabilite-du-devis-accepte` | `br-006-modifiabilit-du-devis-accept` |
| `## BR-004 Configuration du Statut d'Opportunité` | `br-004-configuration-du-statut-d-opportunite` | `br-004-configuration-du-statut-d-opportunit` |

Exactly **three** of the 772 are real, and all three are the same defect: `opportunite/index.md` links
`[Commercial](#commercial)`, `[Client](#client)` and `[Administrateur](#administrateur)` — the corpus
reaching for actor definitions that were never written.

So 87% of everything this tool says about that corpus is its own defect, stated with the full confidence
a mechanical check trades on. A reader who checks two of those findings and finds nothing wrong has no
reason to check the third, and the 30 genuine conflicting definitions and 8 genuine split identities go
with them.

Reference resolution must therefore fold diacritics and map punctuation the way the source's own anchor
rules do. And a Fact extracted as a table row must be referenceable at all: `extractHeading` emits a
`slug` and `extractTable` does not, so no Command, Event, Actor or Aggregate can currently be cited by
anything.

## Consequences

- `criterionSchema` gains no content predicate. A proposal for one is answered by this ADR.
- `facetSpecSchema` gains `parts` and `itemPattern`. Unmapped subheadings are dropped; prose before the
  first Part still lands in `bodyAttribute`.
- Table rows gain a `slug`, and slug computation matches the source's anchor rules. Both are defect
  repairs, not features.
- A reviewer that reads with a model emits Findings and nothing else. It never writes a status, never
  adds a Source, and never moves a Fact up the ladder — so it cannot inflate Trust. An AI reading the
  document a human wrote is the same evidence read twice, not an independent Source (LAW-005).

**Revisit when** a mechanical predicate is proposed that a Module Owner could act on without reading
the Fact. None has been found yet; the test is whether the shortfall names work rather than a shortfall.
