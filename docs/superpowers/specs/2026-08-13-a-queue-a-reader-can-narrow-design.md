# A queue a reader can narrow, and a reading they can act from

Date: 2026-08-13

## What is wrong

Two surfaces do not survive their own data.

**The Inbox at 125 Findings.** The queue is drawn as one card per Owner. The real Corpus has
two: one holding 103 Findings and one holding 22. So the grouping buys a reader nothing — it
divides the page into a very long section and a short one — while costing them the two things
a queue of that size needs. There is no way to narrow it, and there is no way to see that one
kind of defect accounts for most of it. A reader scrolling 103 rows of *Facet "…" produced no
content in this document* cannot tell whether they are looking at eight defects or eighty.

Where the Owner is drawn is the second half of it. It is in a card heading, so a row does not
carry who answers for it — which means the one fact LAW-007 exists to keep visible is a
property of a section a reader has scrolled past.

**Home's two readings.** Each is a card with a grey capitalised band above a label above a
figure. The band reads as a table heading, nothing says which of the two demands what, and
neither is a route to the work it measures. A reader who has met the product once cannot tell
Readiness from Integrity by looking, and cannot get from either to the surface that would
tell them more.

## What stays fixed

Vanta's cards are rings and percentages, and every one of them is a figure with its
denominator removed — which is the reading LAW-006 refuses and `Figure.tsx` has no drawing
for. Nothing below adds a ring, a bar, a percentage, a rate, a grade or a score, and no
figure here is derived from another. What is borrowed is the *legibility*: an icon that gives
a tile an identity, one clear hierarchy per surface, a row that is one row high, and a
toolbar that narrows a list.

## 1. A Finding says which Check found it

`inboxFindingSchema` gains `foundBy` — the Check's code, as the Check itself already records
it (`libs/comply-integrity/src/checks/*.ts`). One line in `inboxOf` passes `finding.code`.

The contract said a Finding never reaches a reader as the Check's name, and the reason given
was LAW-010: several of those names are words no business surface may show, and arriving as
data is how such a word gets past a guard. That reason does not hold, and has not since
ADR-0028: every code is *already* on this page, in the denominator line that names the ten
Checks that ran, and the surface guard's list is applied to codes for exactly that reason
(CLAUDE.md, ADR-0035). The code was withheld from the row and shown in the summary, which is
the worst of both — a reader is told the vocabulary exists and never told which row is which.

What it buys: a quiet identifier per row, the way a Control ID identifies a control, and a
filter by kind. On the real Corpus the ten Checks are `unreadable-document`, `unknown-facet`,
`missing-module-identity`, `unknown-status`, `empty-facet`, `split-identity`,
`conflicting-definition`, `broken-reference`, `unsettled-actor`, `missing-owner`. None
contains a word on the guard's list, so this adds no new exposure to it — but the guard
covers it either way.

## 2. The Inbox is one list, narrowed from a toolbar

**The queues go.** Every Finding becomes a row in one list, in the order the payload already
guarantees: what routes to nobody first, then each person in the Corpus's own order. Nothing
about that order is decided here, so the contract's two refinements keep their force.

**Every row carries its Owner.** An initials chip and the name, or an amber chip reading
*nobody*. This is stronger than the heading it replaces: LAW-007's fact travels with each
Finding instead of with a section.

**Four filters, all in the address.** `owner`, `kind`, `module`, `says`. Nothing is
remembered anywhere else, so a narrowed queue is a link somebody can send, and there is no
state a rebuild could not reproduce (LAW-011). `owner`'s existing meaning is kept exactly —
a name, or the empty value for the queue reaching nobody — so every link already made to
somebody's queue still arrives at it.

Options come from the reading and never from this file: Owners from the queues, kinds from
`lookedFor`, Modules from the Findings. A kind that found nothing is still offered, because
*this Check ran and found nothing* is worth being able to ask.

**LAW-006 in the toolbar.** The Corpus's whole figure and the Checks it is stated against are
always drawn, narrowed or not. Where a filter is on, the page says `Showing 40 of 125` and
offers the way back. A narrowed page reporting its own slice as the total is how a queue comes
to look finished, and that is the whole reason the figure is not recomputed per view.

**LAW-007 stays the loudest thing.** What routes to nobody keeps three marks rather than one:
it sorts first, every such row carries an amber left edge and an amber Owner chip, and a band
above the list states how many there are and links to them — drawn on every view except the
one already showing only them.

**The disclosure is untouched.** A row is one row high, `details` is still the whole
mechanism, and the evidence is still one disclosure away on the same surface (ADR-0039 §2).

## 3. The guard on the Inbox narrows to the row

`inbox.test.tsx` asserts the page contains no `<button>` and no `<input>` at all. A filter
toolbar needs both, so the assertion is rewritten to say what it means:

- no control of any kind inside a Finding row,
- no checkbox anywhere on the page,
- none of *dismiss*, *snooze*, *acknowledge*, *mark as read*, *resolve*,
- every filter readable back out of the address.

The law is that nothing may be remembered about a Finding between two draws of the page.
A `<select>` that puts its value in the URL remembers nothing. Recorded as an ADR amending
ADR-0039 §2.

## 4. A reading is a tile a reader can act from

`Figure` gains three things, all declared beside the reading rather than looked up where it is
drawn — the same reason `Destination.icon` is declared beside `Destination.label`:

- `icon` — the destination's own figure, so the two readings are told apart before they are
  read.
- `to` — where the work is. The whole tile is the link, so Readiness reaches the grid and
  Integrity reaches the queue.
- `answers` — what the surface behind it would tell them, which is the destination's own
  `describes`.

The band above the figure becomes a heading with the icon beside it. `counts` and the figure
keep their arrangement exactly: the value and its `outOf` on one baseline, one phrase, so the
denominator cannot be lost (LAW-006). `outOf` stays required and nothing gains a variant
without one.

`TwoReadings` takes the Corpus's id, because a tile that links needs to know which Corpus it
is about. It is drawn on three surfaces — the shelf, the grid and Home — and on the shelf it
is drawn once per Corpus, so the id is in reach at every call site.

## Testing

- Contract: `foundBy` required, rejected empty.
- Inbox: rows in one list, nobody's first; every row states its Owner; each filter narrows and
  is read from the address; the whole figure survives narrowing; the guard above, narrowed.
- Home and the shelf: two `data-figure` and never three; each tile links to its destination;
  the denominator still reads as one phrase.
- Both vocabulary guards, and both fixture Corpus (ADR-0001) — the Inbox is exercised against
  a shape whose Findings route to a named person and one whose route nowhere.
