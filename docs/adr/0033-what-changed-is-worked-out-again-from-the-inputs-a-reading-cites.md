# ADR-0033: What changed is worked out again from the inputs a reading cites, and each half of the feed states its own horizon

Status: Accepted. Builds §5.1 of `docs/superpowers/specs/2026-08-10-studio-readonly-design.md` into a
surface, and is the first thing to use what ADR-0032 retained. Neither the spec nor ADR-0016 nor ADR-0032
is modified. ADR-0012 decides what may never appear in this feed.

ADR-0016 said a reading is a pure function of `(Seed, Lens)` and that any past reading can be recomputed
exactly from the two. ADR-0032 made both inputs retained artifacts and left that claim unexercised, because
nothing in the product needed a past reading for anything but its figures — and the figures are on the
recorded reading. Home needs more than the figures. This is the three decisions that took.

## 1. A past reading is recomputed, not stored

`whatMoved` reads the Seed the last recorded reading cites, applies the Lens to it again, and compares the
result with the reading in hand. Nothing is added to `RecordedReading`.

Both were legal. LAW-011 permits a cache of anything derivable, and a Facet's state and a Finding are both
derivable from the pair — so growing the recorded reading to hold cells and Findings would have broken no
law, and would have made the comparison a lookup.

It is rejected because that cache cannot be invalidated. A stored cell is a statement about what the
criteria said on the day it was written, and nothing on the recorded reading distinguishes *the knowledge
changed* from *how a Facet's state is decided changed*. The first change to `evaluateFacet` after such a
cache landed would show up on this page as knowledge moving — a defect whose symptom is the product
reporting a change in its own code as a change in a business's knowledge, which is the exact failure
LAW-006 and ADR-0012 are both pointed at.

Recomputing has one cost and it is bounded: **one extra application of the Lens per request.** Measured on
the DDD Corpus — 20 documents, 1506 Facts, 8 Facets — `/corpus/:id/reading` answers in about 30ms and
`/corpus/:id/home` in about 55ms. The cost does not grow with the shelf, because exactly one past reading
is ever recomputed (see §3).

### The retained criteria are not read, and that is not an oversight

There is no `readHeldLens`, and this needs none. A comparison is only stated where the two Lens digests
agree, and a Lens digest is taken over everything a Lens says (ADR-0032 §1) — so agreeing digests mean the
criteria on the shelf say exactly what the criteria in hand say. The one field they differ in is
`adapter.root`, which is where the documents are, and which moves no figure and no Finding's words.

So the criteria to rebuild against are always the ones already loaded. What `lens-versions/` holds is what
ADR-0032 said it holds: the answer to *what was in force last Tuesday*, cited by digest, for a person
asking whether the bar moved. It is not a rebuild input for this surface and would only become one if a
feed ever spanned an interval across which the criteria changed — which §2 refuses.

## 2. The criteria are checked before the knowledge, and there are four statements, not three

`since` is a discriminated union of four:

| Statement | What it means |
| --- | --- |
| `no-earlier-reading` | Nothing has been kept to compare with. Not *nothing changed* |
| `a-reading-under-other-criteria` | The bar moved. Nothing about the knowledge can be stated across the two |
| `knowledge-no-longer-held` | The bar held, and what the last reading was read from is gone |
| `the-last-reading` | Both inputs are in hand, and `changed` is what moved — empty where nothing did |

The first two are `trend`'s own first two, checked in `trend`'s own order and on the same two values, so
the sentence at the top of the page and the movement beside each figure cannot say different things.

**The fourth statement is new and belongs only here.** A recorded reading holds the figures, so a Module's
movement still compares when the Seed it was read from has been pruned away or was written down in a form
`readSeed` refuses. What cannot be worked out then is which Facet crossed and which Finding moved. Said as
an empty list, that would read as *nothing moved*; said as a statement, it reads as what it is, and the
page adds that reading the source again is all it takes. `Movement` does not gain a fourth shape, because
at that layer nothing is missing.

**Only crossings of the approved rung are reported.** A Facet that went from nothing written to something
written is real work, and it is on the grid, Facet by Facet. Here it would be an item that moves neither
figure above it, which sends a reader looking for a number that did not move.

## 3. Two horizons, both stated, and the wider one is not cut back

The feed's two halves reach back different distances, and the page says so rather than truncating the one
it knows well to match the one it does not.

- **Every writing-down of the source the shelf still holds** is named, however long ago. A Seed is
  retained whole and never rewritten, so each one can still be accounted for exactly.
- **What a Facet or a Finding did** is stated only since the last reading kept. That is as far back as
  anything held can work it out from: every reading recorded before ADR-0032 names neither input, and a
  Seed an older reading cites may have been pruned.

A single window was the alternative, and it makes the feed empty on every Corpus that exists. `report`
writes the Seed and then records the reading, so the current knowledge was written down *before* the
reading on record — and a window opening at that reading contains no writing-down at all. Measured: the
fixture shelf holds 4 writings-down for `corpus-a` and 2 for `corpus-b`, and the DDD shelf 1 for
`vertuo-domain-fr`; a single window would have shown none of the seven.

The knowledge half deliberately spans **one** interval and not every consecutive pair on record. The
movement column states exactly that interval, and two different *since when*s on one page is what makes a
page unreadable; it is also §6's own phrase for what a trend means — *what changed since the last time
either the knowledge or the criteria changed*. It is what keeps §1's cost at one recomputation rather than
one per reading ever kept.

**A run can never appear in this feed, and not because a rule forbids it.** Reading unchanged source finds
the Seed already held and writes nothing (ADR-0012), so there is nothing left behind to report. An item
exists per *change* at source. There is likewise no shape in `corpusChangeSchema` for a request, a reading
being taken, or a page being drawn.

## 4. A Corpus still opens at the grid

`OPENS_AT` stays `readiness`, though Home is the work surface and stands first in the destination row.

The grid carries a reading nothing else in the product can give. Read down a column, a Facet absent in
*every* Module is as often a Lens declaring something this business does not have as it is work nobody has
begun — a defect in the *denominator*, quietly deflating every figure Home draws. Opening at Home would put
those figures in front of the only view that can tell a reader they are counted out of one too many.

The state of every Corpus there is says the same thing today: **0 of 3, 0 of 2 and 0 of 28 Modules are
fully approved**, so Home's work list is every Module in the Corpus — the grid without its cells. This
moves when that list is meaningfully shorter than the Corpus. Both destinations are one click apart either
way, which is what the redirect on `/corpus/:id` is for.

## Consequences

- **A route was added that §10 of the spec does not list.** `GET /corpus/:id/home`. Still a GET, and still
  nothing written: recomputing a past reading produces a value and leaves the shelf exactly as it was
  (LAW-002). The grid's payload was left alone rather than grown — a change list on it would be computed on
  every request to a page that never draws one.
- **`whatChanged` is pure and lives in `libs/comply-reading`.** It takes two Readings and requires the
  caller to have established that both were taken through the same criteria; there is nothing it could
  check, because a Reading carries what it found and not what was asked of it. No new package, and no new
  edge in the graph.
- **A Finding's identity is what it says and where.** Its code, its Module, its place, and its message. The
  message is in because a Finding carries its own count — *defined 2 different ways* — so a Finding that
  now says something different about the same place is a different statement, and a reader is owed both
  halves of the change.
- **`ShelvedCorpus.sourceReadAt` became `writtenDown`.** The shelf carries every writing-down rather than
  the latest alone, and the age of a reading is the last of them. One value derived in one place, instead
  of a field beside the array it is derivable from.
- **Three surfaces now draw the two figures from one component, and two draw movement from one.**
  `TwoReadings` and `Moved`. Both were duplicated at the second surface and would have been triplicated at
  the third, which is three chances for one of them to lose a denominator.
- **The unbuilt-destination mechanism is gone.** `beingBuilt` existed for exactly this destination, and a
  facility with nothing behind it is worse than none: the next unbuilt surface says so in whatever way
  suits it.
- **A Module short of nothing is not listed.** So `needsWork` claims nothing about completeness: the page
  states what every figure is counted out of, and that knowledge nobody has written down anywhere is not
  counted and cannot be.
