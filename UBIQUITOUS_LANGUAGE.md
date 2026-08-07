# Ubiquitous Language

The canonical terms of this product. These words mean exactly this here, in code, in the interface,
and in conversation. Where a term has a tempting synonym, the synonym is named and rejected.

## The knowledge

### Corpus

One body of business knowledge under management, and the only authoritative record of it. A Corpus
holds Facts and their complete history. Everything derived from it is disposable.

Not a "repository" and not a "database" — those name storage, and the Corpus is a record.

### Fact

One atomic piece of business knowledge under review. A Fact has an identity, a current version, a
Maturity, and a set of Sources. Facts are one of five Kinds.

### Fact Version

One immutable state of a Fact at a point in time, with its author, its Sources, and the Change
Request that committed it. Facts are never edited; a new version is appended.

### Fact Kind

The five kinds of Fact. This list is closed — it is the whole model, and it is deliberately small.

| Kind | Answers |
| --- | --- |
| **Module** | What area of the business is this, what is it called, who owns it? |
| **Term** | What does this word mean, and what else is it called? |
| **Rule** | What must always be true, or must hold before something may happen? |
| **Message** | What can be asked of the business, and what does the business announce? |
| **Transition** | What states exist, and what moves between them? |

### Facet

A view of one Fact Kind within one Module — for example, that Module's Terms. Which Facets a Corpus
has is declared by its Profile, never fixed by the core.

### Module Owner

The named person accountable for one Module's knowledge. Every Module has one. A Module without an
Owner is a defect, because findings that route to nobody are ignored (LAW-007).

## The quality dimensions

### Maturity

How far a Fact has travelled from guess to agreement. An ordered ladder whose steps are declared by
the Profile. The core defines only the ordering, never the names.

The three questions behind the ladder are always: is it **present**, is it **well-formed**, is it
**approved**.

### Source

Where a Fact came from — inference from code, a document import, an interview, a prior corpus. A set,
never a single value: a Fact confirmed by several independent Sources is stronger than the same Fact
from one. Corroboration is meaningful and is displayed.

Distinct from Maturity, always. Conflating them makes both unmeasurable (LAW-005).

### Trust

A derived reading of how much weight a Fact carries, computed from its Maturity, its corroboration,
and the independence of its Sources. Never stored, always recomputed.

### Well-formedness

Whether a Fact is internally sufficient — a Rule with a statement and a kind, a Message with an
actor, a Term with a definition. Distinct from being approved: a Fact can be signed off and still be
nearly empty.

### Readiness Matrix

The coverage picture: every Module against every Facet, showing presence, well-formedness, and
approval. Reported per Module and as a trend. Never as a single global number, which routes to nobody
and motivates no one.

### Gap

Knowledge that was needed and not found. Gaps are discovered from real demand — a query that returned
nothing or returned only low-Trust Facts — not from someone's intuition about what ought to be
written down.

## Change and integrity

### Change Request

A proposed set of Fact Versions, not yet part of the record. Checks run against it and a human
approves it before it is committed. The only way knowledge enters the Corpus.

Not a "pull request", not a "commit", not a "branch" — those are engineering words and this is a
business surface (LAW-010).

### Door

The single write interface through which every Change Request is committed. There is no second path
(LAW-002).

### Check

An automated test run against a Change Request or the whole Corpus. A Check that fails produces
Findings.

### Finding

One located, evidenced problem — a broken reference, a term used but never defined, two definitions
that disagree, a Module known by two identities. Every Finding cites the exact place that produced it
and reaches its Module Owner.

### Occurrence

One place where a Term appears in the Corpus. The Occurrence index is what makes a Rename complete
rather than hopeful.

### Rename

Changing a Term's canonical name everywhere it appears. Always three steps: **classify** each
Occurrence as certain or ambiguous, **preview** the consequence, then **apply**. Ambiguous
Occurrences are never applied automatically (LAW-008).

## Configuration and boundaries

### Profile

The declaration of how one Corpus is to be interpreted: its Facets, its Maturity ladder, its locale
and word-formation rules, its well-formedness criteria. Everything business-specific lives here, so
that none of it lives in the core (LAW-004).

### Seed

A portable serialisation of a whole Corpus. Loading one establishes or replaces Corpus state;
exporting one writes that state back out. Seeds bootstrap an environment, move a Corpus between
environments, back it up, and set up tests — the same mechanism in every case.

A Seed is a technical artifact, never a business-facing surface. It is not a Change Request and does
not represent anyone's decision (ADR-0012).

### Seed Adapter

A bidirectional translator between one external shape and a Seed. It imports and it exports. One
Adapter per shape. No Adapter is privileged; the first is not the model for the rest.

### Genesis

The single record written when a Seed is loaded, carrying the Seed's digest, the Fact count, the
actor, and the time. One Genesis per load — never one event per Fact, which would drown the audit
trail in noise the tooling generated about itself.

### Published Output

A read-only artifact derived from the Corpus for consumption elsewhere — a document snapshot, a
machine-readable index, a live query interface for agents. Regenerable by definition. Deleting all of
them loses nothing (LAW-011).
