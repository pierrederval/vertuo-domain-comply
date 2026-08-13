# ADR-0041: A queue is one list a reader narrows, and a reading is a way in to its work

**Status:** Accepted
**Date:** 2026-08-13
**Reverses:** ADR-0031 on one card per Owner; the contract's rule that a Finding never reaches a
reader as the Check's name; ADR-0039 §2's guard on the Inbox holding no `<button>` and no `<input>`
**Bears on:** ADR-0038 and ADR-0039 (the frame and its surfaces), ADR-0035 (a Finding's code is a
surface), LAW-004, LAW-006, LAW-007, LAW-009, LAW-011

## 1. One card per Owner divided the page without making either half readable

ADR-0031 drew the Inbox as one card per Owner, with the queue reaching nobody first. On the real
Corpus that is a card of 103 Findings and a card of 22. The grouping bought a reader nothing — it
split the page into a very long section and a short one — and cost them the two things a queue of
that size needs.

**Nothing narrowed it.** The only way to see less than everything was `?owner=`, one queue at a
time, reached by a link inside the card it was already showing.

**Nothing said what kind of defect a row was.** 103 rows opening on *Facet "…" produced no content
in this document* cannot be told from 103 different defects. A reader could not see that one Check
accounted for most of the queue, and could not set it aside to look at the rest.

**And the Owner was in a heading.** LAW-007 exists to keep visible the fact that a defect belongs to
somebody, or to nobody. Drawn once above a hundred rows, that fact was a property of a section a
reader had scrolled past four screens ago.

The Inbox is now one list. The order is the one the payload already guarantees and nothing here
decides: what routes to nobody first, then each person in the order they first answer for a Module in
this Corpus. Every row carries its own Owner — an initials chip, or an amber one reading *nobody* —
so the sections have nothing left to say.

## 2. A Finding says which Check found it

`inboxFindingSchema` gains `foundBy`, the Check's own code. One line in `inboxOf` passes
`finding.code`, which the Check has always recorded.

The contract said a Finding never reaches a reader as the Check's name, and gave a reason: those
names are how the product talks to itself, several are words no business surface may show, and
arriving as data is exactly how such a word gets past a guard (LAW-010). Both halves of that were
already untrue when it was written.

- **Every code was already on this surface.** The sentence naming what was looked for — this figure's
  denominator, which LAW-006 requires — lists all ten of them at the top of the page.
- **The guard already covers codes.** ADR-0035 settled that a Finding's code is a surface like any
  label, precisely because every code is drawn beside the Integrity figure and in the runner's
  report. The surface guard's list applies to one wherever it is written.

So the vocabulary was on the page and only the row-by-row use of it was missing — which is the one
place it tells a reader anything. Withholding it from the row while printing it in the summary was
the worst of the two: a reader was shown that the vocabulary exists and never told which row was
which.

The contract now also refuses a Finding filed under a Check that is not in `lookedFor`. What was
looked for is the denominator; a row counted against a Check that did not run is a row no filter can
reach and a kind no reader can rule out, and one vocabulary or the two halves of the figure stop
describing each other.

## 3. Four filters, and all of them in the address

`owner`, `kind`, `module` and `says`. Nothing is remembered anywhere else, which is what makes them
compatible with §4 below: a narrowed queue is a link somebody can send, and there is no state a
rebuild could not reproduce (LAW-011).

`owner` keeps exactly the meaning it has always had — a name, the empty value for the queue reaching
nobody, or absent for everybody's — so every link already made to somebody's queue still arrives at
it.

Three things this got wrong first, each worth recording because none of them is visible in markup:

- **The empty value is a narrowing, not the absence of one.** Every other filter takes empty to mean
  *unnarrowed* and drops itself out of the address. For `owner`, empty is nobody's queue. Treated like
  the others, choosing that queue took the query straight back out of the address and showed the
  reader everybody's — so the loudest thing in the product was the one thing that could not be asked
  for (LAW-007).
- **A menu cannot carry an Owner's name as an option's value.** *Nobody* is the empty string and
  *everybody* has to be a value too; as two strings those are one string, and the menu could neither
  show that nobody's queue was chosen nor let a reader choose it. What a reader picks is carried as
  the option's **position**, which no name a corpus writes can collide with — and no reserved word can
  promise that, because an Owner is free text lifted from a corpus (LAW-004).
- **What may be chosen comes from the reading and never from the file.** Owners from the queues in
  the payload's order, Checks from `lookedFor`, Modules from the Findings. A Check that ran and found
  nothing is still offered: *nothing here* is a different answer from *never looked for*, and worth
  being able to ask.

**The whole Corpus's figure is drawn narrowed or not**, against the Checks that ran, and a narrowed
page says `Showing 40 of 125` beside it rather than in place of it. Nothing on the page is recomputed
per view, because a narrowed page reporting its own slice as the total is how a queue comes to look
finished (LAW-006).

**What routes to nobody keeps three marks and not one**: it sorts first, every such row carries the
mark on its own edge, and a band above the list states how many there are and links to them — drawn
on every view except the one already showing exactly those. A filter is a bookmark somebody made for
themselves, and a bookmark is how the loudest thing on a page stops being seen.

## 4. The guard on the Inbox narrows to the row

ADR-0039 §2 recorded a test asserting the Inbox contains no `<button>` and no `<input>` at all, so
that a control for dismissing a Finding could never arrive: nothing in this product may hold what a
rebuild could not reproduce (LAW-011), and such a control is how such a thing arrives.

A filter toolbar needs both. The assertion is rewritten to say what the law actually requires:

- no control of any kind inside a Finding row,
- no checkbox anywhere on the page,
- none of *dismiss*, *snooze*, *acknowledge*, *mark as read*, *resolve*,
- and every filter readable back out of the address.

A `select` whose value is in the address remembers nothing about a Finding. The disclosure is
untouched: a row is one row high, `details` is still the whole mechanism, and the evidence is still
one disclosure away on the same surface with no navigation (ADR-0039 §2, LAW-009).

## 5. A reading is a way in to the work it measures

`Figure` gains an `icon`, a `to` and an `answers`, each declared beside the reading for the reason
`Destination.icon` is declared beside `Destination.label`: a third reading, if one existed, would be
one entry and not one entry plus a lookup somebody finds out about when it draws with nothing beside
it. `destinationAt` is where a surface asks the rail what a destination is, so a tile cannot come to
disagree with the rail about what Readiness is for.

The whole tile is the link. A figure a reader cannot get from to the thing it counts is the dashboard
LAW-007 names — and on the shelf, where this pair is drawn once per Corpus, it was a figure with
nowhere to go at all. Readiness reaches the grid; Integrity reaches the queue; a Module's Integrity
reaches the queue narrowed to that Module, which §3 is what made possible.

Nothing is a ring, a bar, a percentage, a rate, a grade or a score, and no figure here is derived
from another. The tile's three banded strips are gone — banded, a tile holding one number read as a
table with a heading and a footer, and the number was the emptiest thing on it. `counts` and the
figure keep their arrangement exactly: the value and its `outOf` on one baseline, one phrase, so the
denominator cannot be lost (LAW-006).

## 6. Two things this cost, recorded because they will be met again

- **The figure and its denominator became two elements in one phrase**, so `4 Findings in this
  Corpus` is no longer in the markup. The Inbox's test carries the `words()` helper the grid's and
  Home's already do — strips tags, inserts nothing. The alternative is writing markup into the
  assertion, which is the class-name assertion this repository refuses by another route.
- **The row's columns are sized against a 1440 window and the place arrives at `2xl`.** A breakpoint
  is on the window and a row's width is the window less the rail and two gutters, so six fixed
  columns at a 1280 window leave the sentence 264px — narrower than the five-column arrangement gives
  it at the same width. The sentence is `minmax(10rem,1fr)` and not a bare `1fr`: fixed columns
  cannot shrink, and squeezed hard enough a bare `1fr` resolves to nothing, leaving a row with its
  Module, its Owner and its place and none of what was found.

## Consequences

Both fixture Corpus exercise the list (ADR-0001): one whose Findings route to a named person, one
whose route nowhere. The API's payload gained a field, so the pair has to be restarted before a
screen means anything — `tsx` does not watch (ADR-0040). No shelf needs writing down again: a Seed's
digest is over its content, and nothing about how a source is read changed.
