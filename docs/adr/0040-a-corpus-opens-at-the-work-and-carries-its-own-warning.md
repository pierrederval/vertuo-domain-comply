# ADR-0040: A Corpus opens at the work, and the denominator's warning goes with it

**Status:** Accepted
**Date:** 2026-08-13
**Reverses:** ADR-0033 §4 (*A Corpus still opens at the grid*), and the same reasoning restated in
ADR-0038
**Bears on:** ADR-0035 (a set of criteria that could not be followed has no page of its own), LAW-004,
LAW-006

## 1. A shelf holding one Corpus asks a reader to choose nothing

Arriving at the product landed on the shelf: a list of every Corpus, with one entry on it. That is a
decision put to somebody who has none to make, and a page they have to click through every time.

`theOneCorpusToOpen` sends an arriving reader into the one Corpus where the shelf holds exactly one.
Three things it refuses, and each is the reason it is a function rather than three lines in a route:

- **It says nothing until the shelf has been read.** Sending somebody into a Corpus on the strength of
  an empty array sends them to a page with nothing on it. The wait is one answer long.
- **It stays put where anything on the shelf could not be read at all.** A set of criteria that could
  not be followed has no id and no page — the shelf is the only surface that names it (ADR-0035), and
  a reader sent past it never learns there is a file to put right. One Corpus *and* one refused Lens
  is exactly the shelf where skipping the list hides the only thing on it that needs a person.
- **It only applies to the bare address.** `/corpus` keeps its own meaning, so *Every Corpus on the
  shelf* in the switcher still goes there instead of bouncing straight back to the Corpus a reader
  just left it for. "Select the one Corpus by default" is a statement about arriving, not about making
  a page unreachable.

## 2. A Corpus opens at Home, and the reading that stopped it moved with it

`OPENS_AT` becomes `home`. A reader arriving is asking what to do, and Home is the surface that
answers it: what needs a person in this Corpus, and what moved in it.

**The reason it was the grid was real, and it was not a preference.** ADR-0033 §4 put it plainly: read
down a column, a Facet absent in *every* Module is as often a Lens declaring something this business
does not have as it is work nobody has begun. That is a defect in the **denominator** — every figure
Home draws is counted out of the Facets the Lens declares, so one the business does not have deflates
all of them, out of one too many, silently. Read along a row it cannot be seen at all, and a work list
is nothing but rows. Opening at the grid put a reader in front of the one view that could show it
before they met any figure.

So the fix is not to drop that reading. It is to stop spending a landing page on it.

`homeReadingSchema` gains **`facetsNobodyHasBegun`**: the Facets no Module has anything under, by the
name a reader is shown. Home states each of them beneath the figures they qualify, in the same words
the grid uses, and points at the grid as the place that column can actually be read.

| | Before | After |
| --- | --- | --- |
| Where a Corpus opens | the grid | Home |
| Surfaces stating a Facet nobody has begun | 1 (the grid) | 2 |
| What guarded the denominator on Home | the reader having come via the grid | the payload |

**A list of names, not a count.** `facetsNobodyHasBegun` says *which* Facets the denominator may be
wrong by. A number — *2 Facets unbegun* — would be a figure derived from the two readings' own
denominator, which is the shape LAW-006 exists to refuse, and it would name nothing a reader could act
on. The API test that pins the whole key set of this payload is what stops a third derived figure
arriving beside it, and it now carries this key with the reason written next to it.

**Empty where the Corpus holds no Module at all.** *No Module has anything under this Facet* is then
true of every declared Facet, and the thing worth saying is that the source has produced no Module —
which the surface already says for itself. Without the guard, a Corpus read for the first time would
open on one warning per Facet, all of them technically true and none of them the point.

**Worked out from the same reading the grid uses.** `homeOf` already has `reading.matrix` in scope, so
both surfaces derive the empty column from one reading of one Seed. The API test asserts the two agree
by computing it from the grid's own payload — two surfaces that decided this separately would
eventually disagree about which column is empty, and there would be no way to tell which was right.

## 3. What this does not do

- **No count, no bar, no share.** See above; and `Figure` still has no drawing without an `outOf`.
- **Nothing moves on the grid.** It keeps its per-column mark and its per-column sentence. Home does
  not become a second grid; it names the columns and says where to read them.
- **`/corpus` is not redirected.** Only arriving is.
- **Nothing is remembered about which Corpus a reader last had open.** That would be state a rebuild
  could not reproduce (LAW-011), and it is not what "select the one Corpus by default" asks for — one
  Corpus is selected because there is one, not because somebody picked it.

## Measured

| | Before | After |
| --- | --- | --- |
| Clicks from arriving to the work, one-Corpus shelf | 2 | 0 |
| Home stating a defect in its own denominator | no | yes |
| Keys in the home reading | 10 | 11 (a list of names) |
| Figures derived from the pair of readings | 0 | 0 |
| Studio tests | 139 | 141 |
| Whole suite | 24 tasks | 24 tasks |

Both fixture Corpus exercise it and they differ, which is what ADR-0001 asks: one has a Facet standing
empty across every Module and one has none, so the surface is covered saying it and saying nothing.

## Consequences

- **The API must be restarted after this change, and `pnpm dev` will not do it for you.** `tsx` runs
  the server without watching, so an API process started before this commit answers without
  `facetsNobodyHasBegun` and the Studio refuses the payload — correctly, and with *the Studio was sent
  something it could not read*. That sentence is the contract doing its job; it is also exactly what a
  stale process looks like, so it is worth knowing which one you are looking at.
- `theOneCorpusToOpen` lives in `shell/where.ts` beside `whereTheReaderIs`, so both navigation
  decisions are pure functions that can be checked without rendering a shell.
- ADR-0033 §4's condition for moving — *when Home's work list is meaningfully shorter than the Corpus*
  — is **not** met and was not the reason for moving. 28 of 28 Modules still need work, so Home's list
  is still the grid without its cells. What changed is that Home no longer needs the grid to have been
  seen first.
