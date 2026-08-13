# ADR-0039: A Corpus is the workspace, and a Finding is a row you open

**Status:** Accepted
**Date:** 2026-08-13
**Reverses part of:** ADR-0038 (the destinations were drawn above the content; they are in the rail)
**Bears on:** ADR-0018 (the vendored components are ours), ADR-0031 (a Finding is worked in a queue),
LAW-006, LAW-007, LAW-009, LAW-011

## 1. The navigation was two lists that did not say which contained the other

ADR-0038 put the destinations on a rule above the content and left the shelf in the rail. Both were
lists of links at the same weight, in two different parts of the frame, and nothing said that
Readiness belongs to Vertuoza while Vertuoza does not belong to Readiness. Everything in this
product is scoped to one Corpus — every figure, every queue, every Finding, every Module — and the
frame was the one place that never said so.

A Corpus is now the workspace: the thing at the top of the rail that a reader switches, with
everywhere they can go inside it listed beneath. The row of destinations above the content is gone.

```
Before (ADR-0038)                       After
┌────────────┬─────────────────┐        ┌────────────┬─────────────────┐
│ Comply     │ Vertuoza        │        │ ▣ Comply   │ Vertuoza        │
│ CORPUS     ├─────────────────┤        ├────────────┼─────────────────┤
│ ▸ Vertuoza │ Readiness   [↻] │        │[▣ Vertuoza⌄]│ Readiness  [↻] │
│            │ Home Readiness  │        ├────────────┤ Every Module…   │
│            │ ─────Inbox───── │        │ ⌂ Home     ├─────────────────┤
│            │                 │        │ ▦ Readiness│                 │
│            │  … content …    │        │ ✉ Inbox    │  … content …    │
└────────────┴─────────────────┘        └────────────┴─────────────────┘
   two lists, equal weight                 one contains the other
```

**The switcher is a native disclosure, not a floating menu.** Two reasons that happen to agree. A
menu in a portal is not in the document until it opens, so nothing that draws the frame once and
reads it — a test, a reader without a pointer — can see that a second Corpus exists at all;
`renderToStaticMarkup` renders no portal, so the shell's own test could not have asserted the shelf.
And the shelf is a handful of entries: a control that needs a portal to hold three names is machinery
bought for a problem this product does not have. Closing on Escape and on a press outside is the half
a disclosure does not bring, and is the only script in it.

**A test that had quietly stopped testing was found by this.** `it('names the Corpus being read, and
marks it on the shelf')` asserted `data-active="true"` appeared somewhere in the frame. Once the
Corpus list moved into the switcher, that attribute came from the *destination* the reader stands at
— so the test passed on a frame that had stopped marking the Corpus entirely. It now reads the mark
off the Corpus's own entry, and asserts the other Corpus does not carry it.

## 2. A Finding is a row, and the evidence is one disclosure away

103 Findings routing to nobody were 103 blocks of five lines apiece: what was found, which Module,
the place, the quotation, and a note. The surface was honest and unusable — which is its own kind of
dishonest, because evidence nobody can find is not verifiable either.

Each Finding is now one row at one height: what was found, the Module, the place. Opening it discloses
every place it cites with the text at each, in place.

| | Before | After |
| --- | --- | --- |
| Findings visible at 1440×860, nobody's queue | 3 | 13 |
| Lines per Finding, closed | 4–5 | 1 |
| Row heights in one queue | one per Finding | one |

Consistent row height is the whole of it: a list whose rows differ in height cannot be scanned, and
the measured cost of variable rows is about 2.3× longer to find a given item. Progressive disclosure
past roughly five visible attributes is the same finding from the other side.

**This is a reading of LAW-009, and it is deliberate.** *Verifiable in place* means the evidence is
on this surface with no navigation, not that every word of it is painted before anybody asks. What
stays visible unasked is the **place** — the citation itself, which is the claim's address — and the
disclosure is on the same row. The alternative was measured and is worse on the law's own terms: a
wall of 500 lines is where a reader stops reading, and evidence that is present but unfindable is not
evidence.

**Nothing is remembered, and `details` is why.** There is no state to persist because there is nowhere
to persist it: a Finding is resolved by the knowledge changing and the Finding no longer being found
(LAW-011). This is also why the row is not a `button` — the Inbox's own test asserts the surface
contains no `<button>`, no `<input>`, and none of *dismiss*, *snooze*, *acknowledge*, *mark as read*,
*resolve*. A native disclosure is none of those.

**The one action is a link, because a Finding has no other kind.** *Open where it is written* goes to
the Fact at the cited place. It is drawn only for the row under the pointer, which is what stops a
hundred rows reading as a hundred controls, and it is `opacity-0` rather than absent so the keyboard
still reaches it. It sits outside the `summary`: a link inside it is a second thing to click in one
place, and whichever a reader hits is the one they did not mean. A row whose cited place no Module
writes at gets no action, because there is no page to open.

**The mark moved off the rows.** Nobody's queue was tinted amber throughout, which put the ground
within a shade of the tint a row takes under the pointer — so the loudest surface on the page was the
only one where a reader could not tell which row they were about to open. The mark is now the queue's
left edge and its heading (LAW-007 satisfied more loudly, not less), and the rows sit on white.

## 3. Flatness was hierarchy, not spacing

*Needs work* and the grid were flat because nothing on a row mattered more than anything else: `0 of
8` and `held steady` were one grey at one size, 28 times.

- **The count carries the weight; its denominator stays beside it.** `**0** of 8`. Never a bar and
  never a share: the denominator is a count of Facets a Lens declares, and a figure drawn as a
  proportion of it is exactly the reading LAW-006 refuses.
- **`held steady` is the quietest of the four movements**, because it is the one that asks nothing of
  anybody. A figure that moved is the only thing in that column worth catching an eye, so it is the
  only one drawn to — and which way it went is said by the mark and by the title, never by colour
  alone.
- **Both tables run flush to their card's edges**, the shape a queue has, because both are lists of
  work. What the figures are counted out of, and what the marks mean, sit on their own ground beneath
  — run together on the same white they read as more rows of the table.
- **The two readings gained a banded header.** Which reading a reader is looking at is the first thing
  the shape says; it was one line of small grey capitals with nothing separating it from the figure,
  so the two cards read as one field of four grey lines.

**What was not done to the figure cards, and why.** They are still mostly white space, and the fix for
that would be a second number, a share, or a spark of trend. There is no third figure to draw: this
product has exactly two readings per Corpus and refuses to derive anything from the pair (LAW-006).
Exposing Integrity's ten Check names in its card was tried and reverted — only one of the two has such
a set, so it made one card taller than the other, and *neither is ever drawn larger than the other* is
the rule those two cards exist under.

## 4. The grid reads down a column now

Reading down a column is the one thing the grid does that no list of Modules can, and it was the
hardest reading on the page: an all-absent column was 28 cells of the faintest mark in the palette
with one tinted word at the top.

- **A Facet no Module has anything under is marked down the whole of its column** — as a ground, never
  as a colour on the mark. What state a cell is in is the mark's to say, and tinting the mark would
  make one column's cells mean something different from the same cells anywhere else.
- **Both headings are frozen.** The Module column was already pinned; the column headings now are
  too, which needed the grid bounded in height so it scrolls in both directions inside its own edges.
  Unbounded, a `sticky` heading resolves against a box that never scrolls and sits exactly where it
  already was — the freeze looked done and did nothing.
- **The rule under the headings is an inset shadow, not a border.** A collapsed table gives its
  borders to the row below, so a pinned heading has none and floats over the rows with nothing between
  them.
- **The two figures at the end of a row are separated from the marks by a rule.** They are a different
  kind of thing — one is how far along a Facet is, these are the row read as a whole — and run
  together a row was eleven cells of equal standing.

## Measured

| | Before | After |
| --- | --- | --- |
| Frame elements saying a destination is inside a Corpus | 0 | 1 (the rail's order, asserted) |
| Findings visible in one screen, nobody's queue | 3 | 13 |
| `<button>` or `<input>` in the Inbox | 0 | 0 |
| Grid headings frozen | 1 of 2 (column only) | 2 of 2 |
| Tests that pass without testing what they say | 1 (found) | 0 |
| Percentages, rates, grades, scores, count badges | 0 | 0 |
| Whole suite | 24 tasks | 24 tasks |
| Studio tests | 134 | 135 |

Nothing any surface *says* changed: no sentence, no figure, no Finding, no criterion, no payload, no
route. Both vocabulary guards pass, including over the three vendored components this and ADR-0038
edit between them.

## Consequences

- `Destination` gains `icon`, declared beside the name rather than mapped where the list is drawn — so
  a fourth destination is one entry and not one entry plus a lookup somebody discovers when it draws
  with nothing beside it.
- `Switcher` is a new file in `shell/`, and `data-switcher` is the handle for the frame's ordering
  test. The old `Shelf` menu in `AppShell` is gone.
- `radix-ui` already exports `DropdownMenu` and `Popover`; neither is used, and no dependency was
  added for this.
- Two test files gained a `words()` helper that strips tags **without** inserting a space, because a
  figure and its denominator are now two elements and one phrase. Asserted against the markup, `1 of
  2` would have to be written as the markup between them — which is the class-name assertion this
  repository refuses by another route.
