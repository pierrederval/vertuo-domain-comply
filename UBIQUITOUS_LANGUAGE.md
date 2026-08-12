# Ubiquitous Language

The canonical terms of this product. These words mean exactly this here, in code, in the interface,
and in conversation. Where a term has a tempting synonym, the synonym is named and rejected.

## The knowledge

### Corpus

One body of business knowledge under management, and the only authoritative record of it. A Corpus
holds Facts and their complete history. Everything derived from it is disposable.

Corpus is the word at every surface, including business-facing ones. It is not translated into a
friendlier synonym, because each candidate synonym names something this product deliberately is not.

**The plural of Corpus is Corpus.** Never "corpora" — a Latin plural nobody says out loud, in a
product whose first duty is to be readable by the people who hold the knowledge. Five products being
brought under management are five Corpus, and one organisation routinely has several: one per product,
per business line, or per area being transitioned.

Not a "repository" and not a "database" — those name storage, and the Corpus is a record.

Not an **"application"**. What is measured is the knowledge about a business, not the software that
business runs. A Corpus may be partly *inferred from* an application's code, and once complete it may
be the input from which *another* application is built — but it is never the application itself. Name
it "application" and every reading becomes nonsense: a Corpus scoring 40% invites "why is my
application only 40% when it has been in production for three years?" The answer — *we are measuring
what you have written down, not what you have shipped* — is the whole product, and the word destroys
it. See ADR-0009: this tool neither generates application code nor checks it.

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

### Module

One area of the business, named and owned. A Fact in its own right, and the unit everything else is
reported against: Readiness is measured per Module, and every Finding routes to a Module's Owner.

Not a "domain" and not a "subdomain". Those are modelling words for the same idea, and a product that
detects one thing known by two names cannot itself carry two names for its central concept.

### Facet

A view of one Fact Kind within one Module — for example, that Module's Terms. Which Facets a Corpus
has is declared by its Lens, never fixed by the core.

### Part

One named piece of a single Fact, read from the sub-structure the source already has. A Rule written
with its statement, its rationale, and its outcome under separate subheadings has three Parts, and the
Facet declares which subheading lands in which attribute — exactly as it declares which table column
does.

Parts are what let a Facet ask for *why this Rule exists* without any judgment about prose: the question
becomes whether a Part is there (ADR-0020). Which Parts exist is a Lens declaration and never a fixed
list in the core, because a fixed list of document sections is what LAW-004 forbids by name.

One Part may be spelled several ways, because a corpus drifts: the same Part of a Rule is written under
one heading by one person and another heading by the next, and both spellings name the one Part. Where a
source turns out to have written two of them, the Part holds both — a Part is what the source wrote
there, and dropping one of two passages somebody wrote would be a silent loss (LAW-006, ADR-0026).

A subheading no Part names is not a Part and is not [Set Aside](#set-aside) either. Set aside counts
one of a Facet's own things, declined; a subheading was never going to be one of them.

Not a "section" — in a corpus a section is commonly the whole document, and one word for both a document
and a piece of one Fact is the split identity this product detects.

### Defining Facet

The one Facet whose Facts settle what a word means. A Corpus may carry several Term Facets — a glossary,
a list of aggregates, a cast of actors — and only one of them is the dictionary; the rest are Terms that
define nothing (ADR-0021).

Without this, every Term Facet is a rival dictionary, and a word that appears in two of them is reported
as defined two ways when the two are not making the same claim at all.

A Facet says this about itself, in its Lens, and exactly one in a Lens may. A Lens declaring Term Facets
and naming no Defining Facet does not load — being chosen by whichever Facet happened to be written first
is the thing this exists to stop.

**A word is what makes a Term a Term; a meaning is what makes it a dictionary entry.** So every Term Facet
must say where a Term's name is written, and only the Defining Facet must say where its definition is. A
list of aggregates holds no definitions, and requiring one would make a Lens claim its rows mean something
they do not (ADR-0027).

### Module Owner

The named person accountable for one Module's knowledge. Every Module has one. A Module without an
Owner is a defect, because findings that route to nobody are ignored (LAW-007).

## The quality dimensions

### Maturity

How far a Fact has travelled from guess to agreement. An ordered ladder whose steps are declared by
the Lens. The core defines only the ordering, never the names.

The three questions behind the ladder are always: is it **present**, is it **well-formed**, is it
**approved**.

A Fact states its own rung. Reading one from the document a Fact happens to live in spreads a single
sign-off across everything beneath it, and leaves a reader unable to tell a stated claim from an
inherited one (ADR-0022).

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

### Integrity

Whether the language of a Corpus holds together: no Term defined two ways, no Module known by two
identities, no citation pointing nowhere. Read as a count of open Findings against a named set of
Checks.

**Readiness and Integrity are two independent readings and are never fused into one.** A Corpus can be
fully approved and have no Integrity — every Facet signed off, while two Modules quietly share an
identity. It can also be sound and nearly empty. Each reading is shown on its own, because they
demand different work: a Readiness gap means *write something down*, a Finding means *reconcile two
things that disagree*, and often those are different people.

Neither reading is ever labelled "compliant" or "complete". A Corpus is *fully approved against the
Facets its Lens declares* — a sentence that carries its own denominator (LAW-006).

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

### Lens

The declaration of how one Corpus is to be read: its Facets, its Maturity ladder, its locale and
word-formation rules, its well-formedness criteria. Everything business-specific lives here, so that
none of it lives in the core (LAW-004). One Corpus, one Lens.

Not a "profile". A Lens tells you what it does — the same Corpus read through a different Lens yields
different Facets and a different ladder — where "profile" says only "configuration lives here". The
word is also already spoken for: the Studio has users, and a user's profile is their account. Naming
two unrelated things "profile" would be a split identity in the vocabulary of the product that
detects split identities. Renamed by ADR-0015; documents written before that decision say Profile.

**A Lens has an identity, and it is what the Lens says and not where it points.** Its digest covers every
declaration except the root its documents are found under, because that root is a path on whichever
machine read the file and changes when a checkout moves. Two people reading the same source through the
same Lens are reading it through the same criteria, and the identity says so (ADR-0032).

### Recorded Reading

A reading of a Corpus kept so a later one has something to be compared with. It names when it was taken,
the Corpus, the figures per Module, and **both inputs it is a function of** — the Seed's digest and the
Lens's.

A reading itself is free and unrecorded: it is computed on request, and there is no *take a reading*
action because there is nothing for a person to decide. One is **recorded when, and only when, one of
those two inputs changes** (ADR-0016). Reading the same knowledge through the same criteria a second time
records nothing, which is the same idempotence a Seed load has.

A Recorded Reading holds nothing a rebuild from its two inputs could not produce again, which is what
lets LAW-011 apply to it: it is a cache, and deleting every one of them loses nothing. So they are
prunable — pruning costs the ability to work out where a Corpus stood before the oldest one kept, and can
never cost a Fact.

A trend is stated against the last Recorded Reading, and it can say three things and not two: there is
none to compare with, the figure moved by so much, or **the last one was taken against other criteria**.
The third exists because a Facet asking for more than it did drops a figure with nothing written down: a
stricter Lens is not a regression in the Corpus, and no shape can carry that fall as a loss (ADR-0032).

Because it holds the figures and not the Facets they were counted from, **anything finer than a figure is
worked out again** from the Seed it cites, by applying the Lens to that knowledge a second time — which is
what *any past reading can be recomputed exactly* meant, first exercised by what changed in a Corpus
(ADR-0033). It follows that a Recorded Reading whose Seed has been pruned away still compares as figures
and can say nothing about which Facet or which Finding moved. Those are two different silences and are
never drawn the same.

### Seed

A portable serialisation of a whole Corpus. Loading one establishes or replaces Corpus state;
exporting one writes that state back out. Seeds bootstrap an environment, move a Corpus between
environments, back it up, and set up tests — the same mechanism in every case.

**A Seed is immutable.** Once written it is never edited, appended to, or overwritten. Re-reading the
source produces a *new* Seed with a new digest, and the old one stays exactly as it was. A Seed whose
content could change would make its digest meaningless, and the digest is what makes a load idempotent
and gives Genesis something to cite (ADR-0012, LAW-009).

A Seed carries Facts as they were extracted — raw status values, raw facet names, attributes, origins.
It carries no readings: no Maturity decomposition, no scores, no Findings. What a Fact *means* is
decided by the Lens when the Seed is read, never by whatever wrote it.

A Seed is a technical artifact, never a business-facing surface. It is not a Change Request and does
not represent anyone's decision (ADR-0012).

### Set Aside

Something a Facet declined, having said it was none of its own: a table headed differently from the
Facet's, a heading that is the page's furniture rather than its knowledge. What a Facet's own things
look like is a sentence the Lens says (ADR-0024, ADR-0025).

**Set aside is not the same as absent, and not the same as unreadable.** Absent means the business has
not written it down. Unreadable means the reading failed. Set aside means it is written down, it was
read, and it is not this Facet's — it is a payload beside the Domain Event it belongs to, a word the
business retired beside the ones it still uses.

**Nothing is set aside in silence.** A reading states how many things it set aside against how many it
found, whether or not the figure is zero (LAW-006). A count and never the things themselves: what was
declined is not this Corpus's knowledge, and recording it would be recording knowledge the Corpus does
not claim.

**Whether something is set aside is decided before any criterion is applied**, so tightening what counts
as enough can never change how many things there are and two readings of one Corpus stay comparable
(ADR-0016).

### Excerpt

The source text a Fact was read from, travelling with it so a reader can check the claim without
opening anything. A `{file, line}` pair is evidence for an engineer at a terminal and nothing at all
for the person this product is built for.

**An excerpt is the source, exactly as written.** Never summarised, never reworded, never assembled
out of lines that are not adjacent in the source. Where the text runs long it is **cut, and says it
was cut**, and the reader follows the origin for the rest.

Cutting is the only alteration permitted, and it differs from a summary in kind: it changes none of
the text it keeps, and it announces itself. A paraphrase does neither, so a reader has no way to tell
that what they are looking at is not what the corpus says — which is the very defect this product
exists to find, manufactured by the surface meant to reveal it (ADR-0017).

Labels are not the excerpt's job. A Fact's attributes carry those already; the excerpt stays
untouched, and the two are shown beside each other rather than fused.

### Seed Adapter

A bidirectional translator between one external shape and a Seed. It imports and it exports. One
Adapter per shape. No Adapter is privileged; the first is not the model for the rest.

### Genesis

The single record written when a Seed is loaded, carrying the Seed's digest, the Fact count, the
actor, and the time. One Genesis per load — never one event per Fact, which would drown the audit
trail in noise the tooling generated about itself.

### Studio

The interface through which people read a Corpus and work on it. It is the product's primary surface,
not a viewer bolted onto a command-line tool: the command-line runner and the Studio are two callers
of the same libraries, and the runner is the lesser of the two.

The Studio's purpose is to carry a Corpus up the Maturity ladder. Facts arrive machine-inferred — from
existing code, from an imported document set — and a Module Owner or product manager refines them,
corroborates them, and approves them **inside the Studio**, without editing source files by hand.

Every Studio edit is a Change Request through the Door (LAW-002). The Studio has no privileged write
path, no "quick fix", and no direct edit, however small the change looks on screen.

A read-only Studio is a phase, never the destination.

### Published Output

A read-only artifact derived from the Corpus for consumption elsewhere — a document snapshot, a
machine-readable index, a live query interface for agents. Regenerable by definition. Deleting all of
them loses nothing (LAW-011).
