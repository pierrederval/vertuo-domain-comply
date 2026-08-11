# The Studio's app shell — Design

**Date:** 2026-08-11
**Status:** Approved design, ready for implementation planning
**Extends:** `2026-08-10-studio-readonly-design.md` §3.7 (the design system) and §5 (Surfaces)

This document is normative. It designs the Studio's **app shell** — the frame that holds every surface —
and replaces the thin hand-rolled component layer with Tailwind and vendored shadcn primitives.

Terms are used exactly as `UBIQUITOUS_LANGUAGE.md` defines them. Where this document and an earlier one
disagree, this one is current.

---

## 1. Why this exists now

The Studio has three destinations and one of them works. Navigation is a row of three text links over a
centred column: once a person is inside a Corpus, nothing persistent says which one, there is no way to
reach another without walking back to the list, and there is nowhere to put the reading's age, the
re-read action, or the Corpus-scoped destinations that Change Requests and the Lens will need.

That is not a styling complaint. The read-only phase's remaining slices — Home (#25), the Inbox (#23),
re-reading the source (#26) — each need a place to *be*, and the current layout has no vocabulary for
"inside a Corpus". Adding them one at a time to a flex row of links invents a different answer each
time.

The second reason is `2026-08-10-studio-readonly-design.md` §3.7, which is built on a premise that turns
out to be false. It records the thin CSS-custom-property layer as a deviation *forced by availability*:
the shared design-system package "is not reachable from this repository". There is no such package to
reach. `vertuo-front` vendors shadcn under `src/components/ui` behind a `components.json`;
`vertuo-playground-ai`'s `libs/system-ui` describes itself as mirrored from it. The Vertuoza design
system is a **convention that each repository vendors**, and the convention is Tailwind plus shadcn
primitives. §3.7 forbids, as "a second deviation that also has to be undone", exactly what the house
standard is.

## 2. Goals and non-goals

**Goals**

- A shell that holds a Corpus: the shelf on the left, the Corpus's destinations across the top, the
  reading's age always visible.
- Somewhere for #23, #25 and #26 to land without inventing a fourth navigation idea.
- The three surfaces that exist today — Corpus list, Readiness Matrix, Module detail — drawn on the
  house standard rather than on bespoke CSS.
- Every law that the current markup enforces still enforced, and still tested, afterwards.

**Non-goals for this change**, recorded so they are not smuggled in:

| Non-goal | Why deferred |
| --- | --- |
| Home's content (#25) | Needs recorded readings (#24) to have any trend to show. The shell gives it a tab and an honest empty state |
| The Inbox's content (#23) | Its own slice. Same treatment |
| Re-reading the source (#26) | Its own slice. The shell leaves its place in the top bar and draws no control |
| Authentication, an account menu | There is no identity in this phase (`2026-08-10` §7). An affordance for something that does not exist is a lie |
| Dark mode | The token layer makes it a later change of values, not of markup |
| Testing the grid at real scale | Named as still open in §11. A prettier grid is not a tested one |
| Promoting the components to `libs/` | One consumer. `libs/` is one package per bounded context, and a design system is not one |

## 3. The decision, and what records it

**Tailwind v4 and vendored shadcn primitives are the Studio's interface layer.**

This contradicts ADR-0013's *Interface* row ("the shared design-system package") and retires
`2026-08-10` §3.7. A law is never routed around and neither is an accepted ADR, so the change carries
**ADR-0018**, superseding that row, with the reasoning in §1 recorded there and the entry added to
`docs/adr/index.md`. Implementation does not begin before the ADR exists.

What the ADR does *not* change: React 19, Vite, React Router, Zod, Vitest, and every other row of
ADR-0013 stand.

## 4. Where it lives, and what it is made of

Everything lands in `apps/comply-studio`. Vendored components go in `src/components/ui/` behind a
`components.json`, which is shadcn's convention and both neighbouring repositories' layout.

| Added | For |
| --- | --- |
| `tailwindcss` v4, `@tailwindcss/vite` | the token layer and every utility |
| `clsx`, `tailwind-merge`, `class-variance-authority` | what the vendored components are written against |
| `lucide-react` | icons |
| the Radix packages the vendored components require | whatever `sidebar`, `tabs`, `tooltip`, `separator`, `dropdown-menu` and `sheet` pull in, and nothing beyond |

The set is bounded by what is actually vendored. A primitive nobody renders is not added.

### 4.1 Tokens

`src/studio.css` becomes Tailwind's `@theme`. Its existing custom properties map onto shadcn's names —
`--background`, `--foreground`, `--muted-foreground`, `--border`, `--ring` — which is what the layer was
built for: §3.7's own reasoning was that tokens could be "dropped in behind these names without touching
a component", and this is that swap.

Two families have no shadcn name and keep their own, as **named** tokens rather than inline colours:

- the four cell states — approved, well-formed, present, absent;
- the conspicuous mark, which is what a Module with no Owner is drawn with (LAW-007).

A cell state is semantic. Writing `text-gray-400` at the call site would move the meaning back into the
markup, where the next person to adjust a shade would not know they were adjusting *absence*.

### 4.2 The vocabulary guards still see everything

`checkSurfaceVocabulary` discovers its roots as the `src` directory of every workspace package, so
vendored source is scanned like ours: a shadcn component shipping the word *index* or *null* in a string
literal would fail the build. The full primitive set in `vertuo-playground-ai/libs/system-ui` was checked
against all nine forbidden terms and carries none of them, so the vendoring does not fight LAW-010. Any
component vendored later is checked by the guard itself, not by remembering to look.

## 5. The shell

`src/shell/AppShell.tsx` — a collapsible sidebar (icon rail, ⌘/Ctrl-B), a top bar, and the outlet.

```
┌──────────────────┬──────────────────────────────┐
│ ◆ Comply         │ Alpha         read 4h ago    │
│                  │ ┌──────────────────────────┐ │
│ CORPUS           │ │ Home │Readiness│ Inbox   │ │
│  ▸ Alpha       ● │ └──────────────────────────┘ │
│  ▸ corpus-b      │                              │
│                  │ READINESS      INTEGRITY     │
│                  │ 3 of 20        14            │
│                  │ Modules fully  Open Findings │
│                  │ approved       from 8 Checks │
│                  │                              │
│                  │ ┌─ Readiness Matrix ───────┐ │
│                  │ │ Module   Terms  Rules …  │ │
│                  │ └──────────────────────────┘ │
└──────────────────┴──────────────────────────────┘
```

**The sidebar is the shelf.** One item per Corpus, from `GET /corpus`, the current one marked. Every
label in it comes from the payload, so LAW-004 holds by construction rather than by review: a sidebar
that draws one item per Corpus it was told about cannot learn a business word.

**No account footer, no settings.** Neither exists (`2026-08-10` §7).

**The top bar** carries the Corpus's name and **the age of its reading, always visible** — a surface that
cannot say how old its reading is invites false confidence (`2026-08-10` §5.1). The re-read control's
place is here and it is drawn when #26 lands; until then there is no control, because a button that does
nothing is worse than no button.

**The tab row** is the Corpus's destinations: Home, Readiness, Inbox. Home and Inbox render the honest
placeholders that exist today, restyled as proper empty states — each says what it will hold rather than
standing empty, because an empty surface reads as a broken one.

### 5.1 Why the shelf is in the sidebar

Three shapes were weighed: a Corpus switcher in the sidebar header, a shelf section plus a per-Corpus
section, and the shelf as the sidebar's whole content with the destinations as tabs. The third was
chosen: every Corpus is one click away and always visible, and the product has exactly one primary
object, so spending the sidebar on it is spending it on the thing a person navigates.

Its cost is recorded rather than discovered: it does not scale past roughly fifteen Corpus. The fallback
is the header switcher, which costs only the sidebar group.

### 5.2 Failure

The sidebar needs the Corpus list. If that read fails, **the sidebar degrades and the page does not**:
one line in business language where the list would be, and the content area keeps its own error state.
A shell that goes blank because a list did not arrive turns one failure into total failure, and the
person then cannot tell which of the two happened.

## 6. Routes

| Route | Surface |
| --- | --- |
| `/` | to `/corpus` |
| `/corpus` | the shelf's landing page: each Corpus with its two headline figures and its reading age |
| `/corpus/:id` | to `/corpus/:id/readiness` |
| `/corpus/:id/readiness` | the Readiness Matrix |
| `/corpus/:id/home` | placeholder, until #25 |
| `/corpus/:id/inbox` | placeholder, until #23 |
| `/corpus/:id/modules/:moduleId` | Module detail, under the tabs, with the trail in the top bar |

`/corpus` survives the sidebar because the sidebar cannot carry a figure: the list is where each Corpus
states its two readings and how old they are, and that is a surface (`2026-08-10` §5.3), not a menu.

The shelf-wide `/home` and `/inbox` are removed. Home is per Corpus by `2026-08-10` §5.1. The Inbox
becomes per Corpus, which is a **departure from `2026-08-10` §5.2** and is recorded as one: that section
specifies a shelf-wide `/inbox?owner=`, grouped by Owner. But §7 of the same document records that an
Owner is free text lifted from a corpus and that "two corpora will spell the same person differently,
which is itself a split identity". A shelf-wide Inbox merges people the product cannot yet prove are the
same person. Scoping the Inbox to a Corpus compares owner strings only against others written by the
same source, so the split identity never reaches a screen as a fact. The deep link becomes
`/corpus/:id/inbox?owner=…` and remains bookmarkable, which is what §5.2 was for. Revisit when an actor
registry exists.

## 7. The three surfaces

**Corpus list** — a card per Corpus: name, reading age, and the two figures. The rule the current CSS
carries in a comment carries over unchanged: the two readings sit side by side, equally weighted, and
nothing is ever placed between them, because a figure in that position reads as the pair combined and no
such figure exists.

**Readiness Matrix** — a table inside a card. Three properties survive because they are the reason the
grid is drawn as a grid at all:

- the Module column stays sticky — it is the column every other one is read against;
- the horizontal overflow belongs to the table's own wrapper and never to the page, so the Module column
  never slides away with the rest;
- an all-absent column is called out in its own header, with the Lens named as what declared it, because
  that is a defect in the denominator and no per-Module list can show it.

The legend and the three denominator sentences beneath it are kept word for word.

**Module detail** — a card per Facet: the Facet's state, its unmet criteria spelled out, that Module's
Findings, and its Facts. Maturity and Sources stay drawn as two separate things, always (LAW-005).

### 7.1 What the restyle refuses

shadcn's blocks arrive with KPI tiles, progress rings, trend chips and count badges. Every one of those
is a figure with its denominator removed, which is what LAW-006 forbids and what this product exists to
be the opposite of. So, explicitly, and enforced by test:

- no percentage, no rate, no grade and no score, anywhere;
- a badge or chip may carry a **state's name** — a Facet's state, a Finding's kind — and never a
  **count**. A figure carries the phrase naming what it is out of, or it is not drawn, and a chip has no
  room for that phrase;
- `—` means **no baseline** and stays `—`. It never becomes `0%`, a flat line, or a neutral chip: a
  first-ever reading and a figure that held steady are different facts and are never drawn the same;
- no ring, gauge, or sparkline standing in for a count.

## 8. The tests come first

Seventeen assertions across three of the four studio test files match exact class attributes —
`class="figure"`, `class="conspicuous"`, `class="movement gained"`, `class="cell…"`,
`class="facet unstarted"`, `class="grid-scroll"`, `class="destination…"`. Under Tailwind every one of
them becomes a string of utilities and every one of them breaks.

They break because they are using a **styling** hook to assert **meaning**. The sharpest is
`corpus-matrix.test.tsx:193`:

```ts
expect(drawn.match(/class="figure"/g)).toHaveLength(2);
```

That is the LAW-006 guard that exactly two figures are drawn and no third, fused one ever appears. Tied
to a CSS class, it is deleted by whoever next changes the styling, and its absence looks like nothing at
all.

So the **first step of implementation, before a single Tailwind class**, is to move those assertions onto
`data-*` attributes on the components as they stand: `data-figure`, `data-movement`, `data-cell`,
`data-conspicuous`, `data-facet`, `data-destination`, `data-grid-scroll`. Tests stay green, nothing
changes visually, and each law-enforcing assertion survives into the new markup instead of being quietly
dropped along with a class name. shadcn's own components use `data-slot` for the same reason, so this is
the idiom being adopted anyway.

## 9. Verification

- **Two-corpus rule (ADR-0001).** Every restyled surface and the shell exercised against both fixture
  corpora, which differ in Facets, ladder, Module set and owner mechanism.
- **The shell contributes no business word.** A test asserting the sidebar draws one item per Corpus it
  was given and no label of its own, and that the tab row's labels are the product's own vocabulary.
- **Both vocabulary guards green**, over the vendored components as well as ours (§4.2).
- **Every law-enforcing assertion survives the restyle**, because §8 moves it off the styling first: two
  figures and never three; no `%` and no *score*; no baseline distinct from no change; a Module with no
  Owner marked conspicuously rather than left blank.
- **The sidebar degrades alone.** A failed Corpus-list read leaves the content area's own error intact.

## 10. Build sequence

| # | Slice | Done when |
| --- | --- | --- |
| 0 | ADR-0018, and the index entry | The decision and its reasoning are recorded before any code moves |
| 1 | Assertions onto `data-*` | All studio tests green with no class-attribute matches left and no visual change |
| 2 | Tailwind, the token layer, `components.json` | `@theme` carries the existing tokens plus the cell states and the mark; the guards are green over the vendored source |
| 3 | The shell and the routes | Sidebar, top bar with the reading age, tab row, placeholders; both fixtures navigable; sidebar degrades alone |
| 4 | Corpus list | Two figures side by side, nothing between them, against both fixtures |
| 5 | Readiness Matrix | Sticky Module column, wrapper-only overflow, all-absent column called out, denominator sentences intact |
| 6 | Module detail | Facet cards with unmet criteria, Findings, Facts; Maturity and Sources separate |
| 7 | Delete what is unused | Nothing of `studio.css`'s hand-rolled rules remains that nothing renders |

Slice 1 is the risk and is deliberately first. If the law-enforcing assertions are not moved before the
markup changes, they are lost in the diff that changes the markup, and nothing ever reports it.

## 11. Risks

| Risk | Mitigation |
| --- | --- |
| A law-enforcing assertion is lost in the restyle | §8 and slice 1: the assertion moves to a stable handle while the markup is still the old one |
| The grid at real scale is still untested | Named, not resolved. The fixtures hold 3 Modules and 2; `2026-08-10` §5.3's ~40-Module limit and its open question stand. List-primary layout remains the fallback |
| shadcn's idioms reintroduce a fused or denominator-less figure | §7.1, enforced by the tests already asserting no `%` and no *score*, extended to badges and tiles |
| The sidebar-as-shelf does not scale past ~15 Corpus | §5.1: fall back to a header switcher, which costs only the sidebar group |
| Vendored components are source we now own, updated by hand | Accepted. It is how `vertuo-front` and `vertuo-playground-ai` both work |
| Two styling systems co-exist mid-change | Slice order: tokens, then one surface at a time, with slice 7 deleting each rule as the last thing using it goes |

## 12. Open questions

1. Does the grid hold up against a real Corpus with more than forty Modules? Unchanged from
   `2026-08-10`, and the neighbouring corpora are where it would be answered.
2. When an actor registry exists, does the Inbox become shelf-wide again (§6), or does a Corpus-scoped
   Inbox turn out to be the better surface regardless?
3. Does the vendored component set stay in `apps/comply-studio`, or move to `libs/` if a second
   interface appears?
