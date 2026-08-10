---
id: PRD-0001
title: A Studio for reading a Corpus
author: pierre.derval@vertuoza.com
agent: vertuo-grill-with-docs
created: 2026-08-10
workflow: vertuo-grill-with-docs@0.1.0
skills:
  - vertuo-grill-with-docs@0.1.0
model: claude-opus-5
schema: prd/v1
lifecycle: active
---

# PRD-0001: A Studio for reading a Corpus

## Problem

A body of business knowledge — a **Corpus** — can now be measured. Every **Module** is scored on
whether its knowledge is present, well-formed, and approved, and a set of automated **Checks** reports
where the language contradicts itself: one Term defined two ways, one Module known by two names, a
citation pointing nowhere.

Nobody who owns that knowledge can see any of it.

The measurement is delivered as a developer tool. Getting a reading out of it takes a developer's setup
and knowing what to type — so the only people who ever see a **Finding** are engineers, and the Finding
is almost never theirs to fix. The person accountable for a Module's knowledge learns nothing, is asked
for nothing, and changes nothing.

What that costs, concretely:

- A **Module Owner** cannot answer "is my area good enough to hand to someone building software from
  it?" without asking an engineer to run a report and interpret it.
- Findings that belong to nobody are invisible. A Module with no named Owner looks identical to a
  healthy one, so the gap that matters most is the one nothing surfaces.
- Knowledge that has been machine-inferred and never checked by a human is indistinguishable, to the
  people who could check it, from knowledge that was agreed in a room.
- Nothing improves, because improving requires knowing which specific Facet of which specific Module
  fell short and why — and that detail currently reaches no one who can act on it.

## Why now

The measurement exists and is trustworthy: a Corpus can be read, scored per Module, and checked, and
the results have already been validated against two deliberately dissimilar bodies of knowledge. The
only missing piece between a working measurement and a working practice is a surface the accountable
people can open.

The trigger is that the next thing to build is *editing* — letting a product manager refine and approve
knowledge directly. Building editing before anyone has read a single reading would mean guessing what
the editing should do. Reading first turns that guess into evidence.

## Target user

- **The Module Owner** — the named person accountable for one area of the business. They need to know
  what is missing from their area, what contradicts itself, and what changed since they last looked.
- **The product manager refining a Corpus** — working through knowledge that was inferred from an
  existing system or imported from documents, deciding what is true, and steering it toward agreement.
- **The person accountable for the whole Corpus** — needing to see which Modules have no Owner at all,
  because those are the ones that decay silently.

[ASSUMPTION: the pilot Corpus's Module Owners accept being named in a shared tool, and being the
destination for Findings about their area.]

### Non-users (v1)

- **Anyone who needs to change knowledge.** This release only reads. Editing, proposing, and approving
  arrive next, and this release exists partly to determine what they should feel like.
- **Agents and downstream systems** consuming knowledge programmatically. Served later by published
  outputs.
- **People outside the organisation.** No access control exists in this release, so it is used only
  where unrestricted internal reading is acceptable.

[ASSUMPTION: unrestricted internal read access is acceptable for the Corpus in scope, i.e. none of them
hold commercially sensitive or personal knowledge.]

## User journeys

### UJ-1: An Owner finds out what is missing from their area

Marie owns Dispatching. She opens the Studio and sees her Corpus: three Modules of twenty are fully
approved, and fourteen Findings are open. Dispatching shows **2 of 5** Facets approved, down one since
the last time anything changed.

She opens Dispatching. Each Facet is listed with its state, and for each one that fell short, the
reason in plain words: this Facet's Terms have no definitions; this one is complete but nobody has
approved it. She now has a list of specific work, phrased as knowledge rather than as a score.

*Edge case:* she is not the Owner of anything, and opens the Studio out of curiosity. She sees the
Corpus and its Modules exactly as anyone else does; nothing is hidden and nothing is personalised.

### UJ-2: An Owner works a queue of Findings

Tom opens the Inbox. Above everything else is a group headed **Routes to nobody** — four Findings on
Modules with no named Owner. Below it, his own group: one Term defined differently in two places.

He opens it. The Finding names both places and **shows the two conflicting definitions as they are
written**, so he can tell which one is right without leaving the Studio or opening any document. He
decides that one of them is stale. He cannot fix it here — this release only reads — so he notes the
decision and takes it to whoever maintains that source.

*Edge case:* a Finding is on a Module nobody owns. It appears in the "routes to nobody" group, which is
deliberately the first thing anyone sees, because a problem belonging to nobody is the one that never
gets fixed.

### UJ-3: Someone asks whether a Corpus is good enough to build from

A delivery lead needs to know whether the Field Service knowledge is ready to hand to a team. They open
the Corpus and see two separate readings: how much is approved, and how much disagrees with itself.

The grid shows every Module against every Facet. Reading down a column, they notice **no Module has
Transitions at all** — flagged on the page as a Facet nobody has started. That reframes the question:
this is not twenty people behind on their work, it is a whole kind of knowledge missing, or a Facet this
business does not actually have.

Beside the figures is a plain statement of what they are measured against, and that knowledge nobody
has written down anywhere is not counted and cannot be. They leave able to say what is ready, what is
not, and what is unknown — three different answers, not one number.

### UJ-4: A Corpus is re-read after its source changes

Someone has spent a week filling in Dispatching's Rules in the source documents. They open the Corpus
and choose **Re-read the source**. The reading updates: Dispatching gains two approved Facets, and the
"what changed" list records it.

*Edge case:* they press it again ten minutes later having changed nothing. The reading is unchanged, and
no new comparison point is created — so "what changed since last time" keeps meaning something.

## Glossary

**Studio**: the surface where a person reads a Corpus and, in later releases, works on it. A read-only
Studio is a phase, never the destination.

**Corpus**: one body of business knowledge under management. An organisation typically has several —
one per product or business line. The plural of Corpus is Corpus.

**Module**: one area of the business, named and owned. Everything is reported per Module.

**Module Owner**: the named person accountable for one Module's knowledge. A Module without one is a
defect, not a blank.

**Facet**: one kind of knowledge within one Module — for example that Module's Terms, or its Rules.
Which Facets a Corpus has is declared per Corpus and differs between them.

**Maturity**: how far a piece of knowledge has travelled from guess to agreement. An ordered ladder
whose steps are named per Corpus.

**Readiness**: how much of the declared knowledge is present, well-formed, and approved. Reported per
Module, never as one figure for a whole Corpus.

**Integrity**: whether the language holds together — no Term defined twice, no Module known by two
names, no citation pointing nowhere. Reported as open Findings.

**Finding**: one located, evidenced problem, citing the exact place that produced it and reaching its
Module Owner.

## Requirements

### FR-1: Read a Corpus's Readiness per Module and Facet

A reader can see every Module of a Corpus against every Facet the Corpus declares, with each Facet's
state shown as present, well-formed, approved, or absent. Realizes UJ-1, UJ-3.

**Consequences (testable):**
- Every Module the Corpus contains appears, including Modules with nothing in them.
- Every Facet the Corpus declares appears, including Facets no Module has filled.
- A Facet that is absent everywhere is called out as one nobody has started.
- Each figure appears next to a statement of what it is measured against.
- A reading works unchanged on two Corpus with different Facets, different Maturity ladders, and
  different Modules, with no per-Corpus adjustment.

### FR-2: Read Readiness and Integrity as two separate answers

A reader sees how much knowledge is approved and how much disagrees with itself as two independent
figures, never combined. Realizes UJ-3.

**Consequences (testable):**
- No surface presents a single combined score, percentage, grade, or pass/fail badge for a Corpus.
- A Corpus with everything approved and open Findings reads as *approved, with disagreements* — never
  as finished.
- Each figure states what it counts and what it counts out of.

**Out of scope:** ranking or averaging across several Corpus.

### FR-3: Be told why a Facet fell short

For any Facet that is not approved, a reader sees the reason in the language of the knowledge: what is
missing from it, or that its content is sufficient and nobody has approved it. Realizes UJ-1.

**Consequences (testable):**
- A Facet short on content lists what is missing.
- A Facet that is complete but unapproved says so, and is not conflated with the previous case.
- No reason contains engineering vocabulary.

### FR-4: Work Findings as a queue, unowned ones first

A reader can work through a Corpus's Findings grouped by Module Owner, with Findings that reach nobody
shown first. Realizes UJ-2.

**Consequences (testable):**
- Findings on Modules with no Owner appear in their own group, above all others.
- A Module with no Owner is marked as such wherever it appears, never left blank.
- One Owner's queue can be linked to and shared.

### FR-5: Verify any claim without leaving the Studio

Every Finding and every piece of knowledge shows the source text it came from, in place. Realizes UJ-2.

**Consequences (testable):**
- A Finding displays the text it cites, not only a reference to where that text lives.
- A Finding about two conflicting statements shows both.
- No claim is displayed that a reader cannot check on the same screen.

[ASSUMPTION: seeing the cited source text inside the Studio is enough for an Owner to judge a Finding,
without opening the original documents.]

### FR-6: See where knowledge came from, separately from how agreed it is

Any piece of knowledge shows how far up the Maturity ladder it is, and separately, which sources
attest to it — several sources being meaningfully stronger than one. Realizes UJ-1.

**Consequences (testable):**
- Maturity and sources are always shown as two distinct things.
- Knowledge attested by several sources is distinguishable from the same knowledge from one.

### FR-7: Re-read the source on demand

A reader can re-read a Corpus from its source and see the updated reading, without help from an
engineer. Realizes UJ-4.

**Consequences (testable):**
- The age of the current reading is always visible.
- Re-reading with nothing changed at source produces no new point of comparison.
- Re-reading never alters, discards, or reorders anything already recorded.

### FR-8: See what changed since knowledge or criteria last changed

A reader sees which Facets became approved or fell back, and which Findings appeared or stopped
appearing, since the last time anything changed. Realizes UJ-1, UJ-4.

**Consequences (testable):**
- No baseline reads differently from no change; a first-ever reading never displays as zero movement.
- Nothing the tool did about itself appears in the list — only what changed in the Corpus.
- A change caused by stricter criteria is distinguishable from a change in the knowledge itself.

### FR-9: Read any Corpus, of any shape

The Studio serves a Corpus whose Facets, Maturity ladder, and Modules it has never seen, with no
change to the Studio. Realizes UJ-3.

**Consequences (testable):**
- Every Facet name, ladder step, and Module name displayed comes from the Corpus being read.
- Two dissimilar Corpus are served by identical screens.
- Adding a Corpus requires no change to the Studio.

### FR-10: Be told, in business language, when a Corpus cannot be read

When something prevents a Corpus being read, the reader is told what is wrong in terms they can act on.
Realizes UJ-3.

**Consequences (testable):**
- A source document that cannot be understood becomes a Finding, not a hidden failure.
- A Corpus that cannot be read at all appears in the list as unreadable, with the reason stated.
- No message, label, or empty state anywhere uses engineering vocabulary. This is enforced
  automatically, not reviewed by eye.

## Non-goals

- **Changing knowledge.** No editing, proposing, or approving. Nothing in this release writes. The
  Inbox is therefore advisory: a Finding is resolved by changing knowledge at its source and re-reading.
  [ASSUMPTION: an advisory Inbox — where the only resolution is changing knowledge elsewhere and
  re-reading — is still used rather than abandoned, for the weeks before editing exists.]
- **A single readiness score, grade, or compliance badge**, for a Corpus or across Corpus. Permanently
  out, not deferred: a figure standing for a whole Corpus routes to nobody and implies that a full
  score means nothing is missing.
- **Judging application code.** What is measured is knowledge about a business, never the software that
  business runs.
- **Access control and per-person identity.** Deferred; reading is unrestricted.
- **Renaming a Term across a Corpus.** A later release.
- **Serving knowledge to other systems or agents.** A later release.
- **Changing what counts as approved from inside the Studio.** Editing the criteria moves every figure
  in the product and needs a review step that does not exist yet.

## MVP scope

### In scope

- The Corpus list, and per Corpus: Readiness per Module and Facet, and open Findings, as two readings
- Drilling from a Corpus to a Module, to a Facet, to one piece of knowledge and its evidence
- The Inbox, grouped by Owner, unowned first
- Re-reading a Corpus's source on demand
- A home surface: per Corpus, the Modules needing work and what changed
- Serving at least two dissimilar Corpus from the same screens

### Deferred

| Deferred | Reason |
| --- | --- |
| Editing and approving knowledge | The largest piece of work, and this release is how we learn what it should do |
| Authentication and per-person queues | An Owner is a name written in a Corpus, not an account. Reconciling names with accounts is its own project |
| Editing what counts as approved | Moves every figure in the product; needs a review path |
| Renaming a Term everywhere | Needs the index that this release's Checks prove out |
| Serving knowledge to agents | Cheap once reading exists; nothing depends on it yet |
| Estimating knowledge nobody has written down | Stated as unknown for now, rather than estimated badly |

## Success metrics

**SM-1 (primary):** every Module in the pilot Corpus has a named Owner within 30 days of release.
Validates FR-1, FR-4. Today unowned Modules exist and nothing makes them visible.

**SM-2 (primary):** open Findings on the pilot Corpus fall in at least four consecutive weeks.
Validates FR-3, FR-4, FR-5.

**SM-3 (secondary):** Module Owners open the Studio without being prompted — at least half of named
Owners read it in a given fortnight. Validates FR-1, FR-8.

**SM-4 (secondary):** the number of Facets approved in the pilot Corpus rises month over month.
Validates FR-1, FR-7.

**SM-C1 (counter-metric, do not optimize):** Facets that fall back from approved having previously been
approved stay under 5% of approvals. Counterbalances SM-4 — the cheapest way to make the grid greener is
to approve knowledge nobody checked, and premature approval shows up as fallbacks.

**SM-C2 (counter-metric, do not optimize):** the age of the oldest unresolved Finding must not grow
while SM-2 improves. Counterbalances SM-2 — clearing easy Findings while hard ones rot would otherwise
read as progress.

## Alternatives considered

**Keep reporting through the command line, and send the report to Owners.** Cheapest by far, and
rejected: a report someone else runs and forwards cannot be explored, so an Owner cannot get from a
score to the specific missing thing. It also leaves the engineer as the permanent intermediary, which is
the situation this product exists to end.

**Generate a documentation website from the Corpus.** Familiar and immediately readable — and it is the
failure state this product exists to escape. A site is a second place knowledge appears to live, it
cannot show what is *missing*, and it invites editing the copy instead of the record.

**Build editing first and skip read-only.** The valuable release, and it is a guess: nobody has yet
worked a queue of Findings or read a grid in anger, so what an edit should do, and what has to be true
before one is allowed, is unknown. Reading first is deliberately sequenced to answer that.

**Show one readiness score per Corpus.** Immediately graspable, and it is a lie in one number: it
belongs to nobody, so nobody acts on it, and at any value above zero it implies the rest is merely
unfinished rather than possibly unmeasured.

## Assumptions

- [ASSUMPTION: the pilot Corpus's Module Owners accept being named in a shared tool, and being the
  destination for Findings about their area.]
- [ASSUMPTION: seeing the cited source text inside the Studio is enough for an Owner to judge a Finding,
  without opening the original documents.]
- [ASSUMPTION: an advisory Inbox — where the only resolution is changing knowledge elsewhere and
  re-reading — is still used rather than abandoned, for the weeks before editing exists.]
- [ASSUMPTION: unrestricted internal read access is acceptable for the Corpus in scope, i.e. none of
  them hold commercially sensitive or personal knowledge.]

## Open questions

Decisions taken during discovery, recorded so they are not relitigated:

| Question | Decision |
| --- | --- |
| Is the thing being measured an "application"? | No. It is a Corpus — knowledge about a business, never the software it runs. A Corpus may be inferred from an application and may later be the input to building one; it is never the application |
| Are the areas within it "domains"? | No. Module, everywhere |
| Does a Corpus get a "compliant" badge? | No. Readiness and Integrity, always separate, never fused, never graded |
| What does "good enough" mean? | Fully approved against the Facets that Corpus declares, *and* free of open Findings. Two gates |
| Whose Inbox is it? | Everyone's, for now. No accounts in v1 |
| Can a reader change knowledge? | Not in v1. Read-only is a phase, never the destination |

Genuinely unresolved:

| Question | Owner | Revisit condition |
| --- | --- | --- |
| Does a grid of every Module against every Facet stay readable for a Corpus with more than forty Modules? | pierre.derval@vertuoza.com | On first real Corpus of that size. Fallback is a Module list with the grid one click away; it costs the ability to spot a Facet nobody has started |
| How much source text must be shown for a Finding to be judged without opening the document — the sentence, the paragraph, or the whole section? | pierre.derval@vertuoza.com | After the first week of real Inbox use |
| Are the criteria for "well-formed" the ones this Corpus's owners would agree to? | pierre.derval@vertuoza.com | Before any figure is published beyond the pilot. A score whose criteria nobody agreed to is gamed or ignored |
