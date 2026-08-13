# ADR-0038: The frame names the surface a reader is on, and carries the one action

**Status:** Accepted
**Date:** 2026-08-13
**Bears on:** ADR-0013 (the token layer), ADR-0018 (the vendored components are ours), ADR-0019 (a
Facet says what it is), ADR-0035 (reading a source again is the remedy for a Corpus that cannot be
read), LAW-006, LAW-007, LAW-009, LAW-010

## What a reader gets

Before, on the real Corpus: a white rail on white paper holding one word, a 48-pixel strip with the
Corpus's name set at the same size as everything else, three words in a tinted box that read as a
filter, and then figures. Nothing on the screen said which of the three surfaces a reader was on
except which of the three words was shaded, and nothing said what any of the three would tell them.

After: the rail is a ground with a lockup on it and the Corpus a reader is in marked on it; the strip
carries the trail and the age of the reading; the surface is named in a heading with the question it
answers under it; and the destinations sit on the rule the content hangs from.

```
Before                                  After
Comply                                  ▣ Comply           ← rail, its own ground
  Corpus                                  CORPUS
  Vertuoza                                ▸ Vertuoza       ← marked where the reader is
────────────────────────────────        ─────────────────────────────────────────────
□  Vertuoza      Read from source 2h    □  Vertuoza          Read from source 2 hours ago
                                        ─────────────────────────────────────────────
 [Home|Readiness|Inbox]                 Readiness              [Read the source again]
                                        Every Module against every Facet its Lens declares.
 [Read the source again]
                                        Home  Readiness  Inbox
 READINESS                              ─────────────────────────────────────────────
 Modules fully approved                 ┌───────────────────┐ ┌───────────────────┐
 0                                      │ READINESS         │ │ INTEGRITY         │
 of 28 Modules                          │ Modules fully…    │ │ Open Findings     │
                                        │ 0  of 28 Modules  │ │ 125 from 10 Checks│
                                        └───────────────────┘ └───────────────────┘
```

## The decisions

### 1. The heading names the surface, not the Corpus

The Corpus is named in the trail. The heading names *where in it* the reader is, which was said only
by which of three words was shaded — and shading is not a name.

The Corpus could not take the heading: it is already in the trail, and a Corpus named twice on one
screen reads as two things, the second of which is what somebody forgets to change. That reasoning
was already written into the shell and into three of the surfaces; this keeps it and fills the
position it left empty.

A Module page is headed by the Module, because a Module is not a destination and is the thing a
reader came to read. Headed by the destination it was reached through, its page would be titled by
the surface a reader passed *through* rather than the thing they arrived at.

### 2. A destination says what it answers, and it is required

`Destination` gains `describes: string`, not optional. This is ADR-0019's decision — a Facet says
what it is, from the Lens — applied to the product's own surfaces rather than to a corpus's Facets,
and for the same reason: three bare words cannot be told apart by a reader who has not met this
product, so the row of destinations was learned by clicking all of it.

Required rather than optional, so a fourth cannot arrive as a bare word in a row of bare words. These
are the product's own words and never a business's, which is the only reason they can be written in
source at all (LAW-004).

A Module has no declaration to be described from, so its sentence is written in the shell beside the
title it belongs to. It is written and not left out: the block would otherwise be one line shorter on
a Module page, and a row of destinations that shifts up as a reader steps into a Module reads as the
page having reloaded into something else.

### 3. The one action that writes moves into the frame

`ReadAgain` was drawn by the Readiness surface, because that is where a Corpus opens. It is now drawn
by the shell, in the heading's action slot, on every surface of a Corpus.

The doc comment it carried asked for one of it — *two buttons doing one thing on two pages is two
things to keep in step, and a reader who pressed the other one has no way to know which of the two
answers they are looking at.* One in the frame satisfies that better than one on a page: there is
still exactly one, and it is now beside the age of the reading, which is the fact it changes.

What it bought: a reader working a queue or reading what moved had to walk back to the grid to bring
new knowledge in. That walk is the thing the action exists to save. Measured on the real Corpus — a
press from Home now reads the source and every figure on the page below is asked for again, which is
what `Answering`'s `since` was already built to do.

It is offered wherever `corpusId` is not null, which includes a Corpus with nothing written down yet
and a Corpus whose knowledge can no longer be read — the two states ADR-0035 says this action is the
whole remedy for, and the two it would be worst to hide it from.

The button leads and whatever it has to say follows underneath it. The button is the same size in all
four of its states and the sentence is not, so a row that grew sideways as it reported would move the
control a reader was about to press.

### 4. The accent is the focus ring, promoted

`--here` is `#2f5fd0`, which is the blue `--focus` already carried. Promoted rather than invented:
that blue was already the one colour in the product standing for *this is the thing you are on*, and
a second accent beside it would be two answers to one question. `data-here` was already the attribute
for it, so the value and the handle now say one thing.

It is deliberately not the mark. Amber means work landing on somebody (LAW-007), and spending it on
navigation is how a page full of marks stops meaning anything.

### 5. Four grounds, three weights of ink, two rules

| Token | For | Why it was not enough before |
| --- | --- | --- |
| `--rail` | the shelf | It was `--panel`, the same white as the cards standing on it, so the rail and the things on the rail were one undivided field |
| `--sunken` | a hover, a quotation's ground | `--accent` was `--paper`, so no button and no table row answered the pointer at all |
| `--ink-faint` | a column heading, meta | A heading and the knowledge under it were one grey, so every table read as one flat block |
| `--line-strong` | the rule destinations sit on, under a table heading | One line weight cannot say which boundaries carry meaning |
| `--mark-quiet` | the ground under a phrase that is a mark | Amber text at 13px on white is quiet enough to scan past, and *nobody answers for this* is the one thing on the grid that must not be |

## Where a figure was at risk, and was not taken

LAW-006 is the law this change had the most room to break, because every shape a design system offers
for a number has room for the number and none for its denominator.

- **No ring, no tile with a bare number, no trend chip, no percentage.** `Figure` gains a border and a
  ground and nothing else. It still has no drawing without an `outOf`, and `Readings` still takes
  exactly two children and says so in its type.
- **The count and its denominator moved onto one baseline.** `0 of 28 Modules` reads as one phrase. It
  was stacked, which made the denominator the fourth line of four — the first thing to go when a
  reader skims or a screen narrows, and a figure whose denominator can be lost is the bare number the
  law refuses.
- **A badge arrived, and carries a state's name.** A Facet's state on Module detail is a `Badge`,
  which the law leaves room for: *a badge may carry a state's name; never a count.* There is nothing in
  the shape for a denominator to fall out of, because there is no number in it.
- **`data-figure` still appears exactly twice per reading**, which is LAW-006 made testable and is
  what the two-readings tests count.

## Two mistakes this made and fixed, both measured

Both were introduced by this change and caught by looking at the real Corpus rather than by a test,
which is worth recording as the reason to look.

- **Uppercase column headings pushed the grid off its own edge.** A heading decides a column's width.
  Set at the body's size in capitals with wide tracking, the DDD Corpus's eight Facet columns grew
  enough to push `Approved` and `Movement` past the right edge at 1440px — the two columns a row is
  read for. At 11px and `px-2` the grid measures 1281 against 1281 of room: it fits exactly, with
  every column visible and no page-level overflow.
- **`overflow-x` on the destinations gave them a vertical scrollbar.** One axis set to `auto`
  promotes the other from `visible` to `auto`, so the one pixel each mark hangs below the rule
  produced a 13-pixel scrollbar stub beside the destinations on every screen in the product. Three
  short words never needed a scrolling box; it is gone.

## What this deliberately does not do

- **No full-width top bar over the rail**, which is what the reference this was drawn against has.
  That bar exists to hold a workspace switcher and an account, and this product has neither — a
  Module Owner is free text lifted from a corpus, not somebody who signs in. The shell test asserts
  the frame offers nothing to sign in to, and an affordance for something that does not exist is a
  lie the interface tells. The vendored sidebar also positions its container `fixed inset-y-0`, so a
  bar above it would have to fight the component ADR-0018 makes ours to use rather than to rewrite.
- **No typeface is vendored.** The scale, the tracking and tabular numerals are set; the face is
  still the system's. A webfont is a file to hold and a decision about licensing, and it is worth
  taking on its own rather than inside a change about layout.
- **No count on any chip or badge**, and no filter chips of the kind the reference puts under its
  page title — every one of those in the reference carries a number, which is exactly the shape
  LAW-006 refuses.
- **Nothing changed about what any surface says.** No sentence, no figure, no Finding, no criterion.
  Every payload and every route is untouched, which is why the whole suite passes unchanged apart from
  the shell's own tests.

## Measured

| | Before | After |
| --- | --- | --- |
| Surfaces naming what a reader is looking at | 0 of 3 | 3 of 3, each with the question it answers |
| Destinations from which the source can be read again | 1 of 3 | 3 of 3, and from a Module |
| Buttons that read the source again | 1 | 1 |
| Grid width against the room for it, DDD Corpus at 1440px | 1322 / 1281 | 1281 / 1281 |
| Stray scrollbars on every screen | 1 | 0 |
| `data-figure` per reading | 2 | 2 |
| Percentages, rates, grades, scores anywhere | 0 | 0 |
| Whole suite | 24 tasks | 24 tasks |

The two vocabulary guards are the check that matters most here, because a design change is where a
business word or an engineering one is most easily written into a label. Both pass over 100 files in
14 places, including the vendored components, which this change edits three of.

## Consequences

- `AppShell` takes a second prop. It is a narrower interface than what the App holds — the frame
  offers the action and says what it is doing, and knows nothing about how many times knowledge has
  arrived, which is what tells every *surface* to ask again.
- `data-surface` is a new handle, carrying `shelf`, `module`, or a destination's name. It is what a
  test asks which surface is named, rather than reaching for a heading's styling.
- Three vendored components changed: `table.tsx` (heading treatment, row hover, cell padding),
  `card.tsx` (a title is one step up from its content), and nothing in `badge.tsx`, which was already
  right. ADR-0018 makes these ours; both guards scan them like any other source.
- A `th` with `scope="row"` now has to say at its call site that it is a row's name and not a
  column's heading. Two call sites do, each with a comment saying why. The alternative — putting the
  heading treatment on the `thead` — was tried and rejected: a descendant rule on the parent outranks
  a class on the child, so the marked heading of a Facet no Module has anything under would have
  silently lost its mark, and that mark is the whole reason the grid is drawn as a grid.
