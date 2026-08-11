# ADR-0030: A piece of knowledge is opened where it is written down, and quoted from the Seed

Status: Accepted. Implements §5.4 of `docs/superpowers/specs/2026-08-10-studio-readonly-design.md`.
Builds ADR-0017's excerpt and ADR-0029's Sources into a surface. Bears on ADR-0026.

**One piece of knowledge is addressed by the place it is written down — a document and a line —
beneath the Module that wrote it, and the source text it was read out of is looked up in the Seed
rather than carried on a Fact.** Its parts travel as a list of named passages in the order the source
writes them, its rung and its Sources travel as two fields that nothing derives a third from, and the
page draws no figure at all.

Two things made this the smallest change that could work.

## The address is a place, because a place is the only name every Corpus gives

`knowledgeSchema` already says it, and has since the Module page was built: *identified by where it is
written down, and never by its own id.* A Fact's id is a Module's name for a Module and
`document.md#3` for everything else — a position, not a name anybody chose, and not stable across an
edit. Nothing in a Lens promises a piece of knowledge a name; that some corpora give one is a property
of the extractor they happen to use. `Pulley d'Étage` has one. A row of a table has one when the Lens
maps a column onto `name` and none when it does not.

So the address carries a place. A place holds a document path, and a path holds separators, which is
where the three rejected alternatives died:

| Rejected | Why |
| --- | --- |
| `…/knowledge/25/coeur/devis/business-rules.md` — the line, then the path as a splat | Works, and reads backwards. The line has to come first for the splat to be the tail, so every address in the product would name the position before the thing it is a position in |
| `…/knowledge/coeur%2Fdevis%2Fbusiness-rules.md:25` — one encoded segment | Works here and is taken apart by the first thing that tidies a path on the way through. An address whose correctness depends on nothing normalising it is an address that fails in somebody else's infrastructure and not in this repository's tests |
| `/corpus/:id/knowledge?in=…&line=…` — not beneath the Module | The shell reads where a reader is off the address, and a Module is the fourth segment of it. Unnested, a reader inside a piece of knowledge is drawn as standing at the Corpus, and the trail loses the way back to the Module they descended from |

What landed is `/corpus/:id/modules/:moduleId/knowledge?in=<path>&line=<n>`: the two halves of a place
travel named, beneath the Module. The Module in it is **checked and not trusted** — the place alone
would answer, and answering it would put one Module's knowledge on another Module's page. A name this
Corpus does not have and a place it writes nothing at are told apart in the answer, for the same reason
a Corpus and a Module already are: they send a reader to different places.

One assumption is worth writing down because nothing enforces it. A place names at most one piece of
knowledge: every extractor there is reads one thing per heading or one thing per row, and across the
two fixture Corpus and the real one **1520 pieces of knowledge are written at 1520 distinct places**.
Were that to stop holding, what stops holding with it is a piece of knowledge having a name at all —
which is the agreement's own statement about what identifies one, and not this surface's to repair.

## The evidence was already written down, and had reached nobody

`excerptOf` has run on every extraction since ADR-0017 and its output had been read by nothing but its
own test. 1506 quotations sit in the DDD Seed and 12 in fixture A's; `Fact` has no such field,
`interpret` drops it, and the word `sources` appeared nowhere in `libs/comply-contract` at all. A
Corpus that had gone from naming 2 distinct places across 1506 Facts to naming 550 (ADR-0029) looked
exactly the same in the Studio as before, and a Fact naming fifteen places looked like one naming one.

So this slice adds no reading and no field to `Fact`. The design already said where the text comes
from — *with the excerpt travelling in the Seed, the Studio shows the cited text in place and the
server never needs access to the original documents* (§3.3) — and the server already holds the Seed
beside the Lens. It is looked up by document path and item line, which is the same key the agreement
says identifies a piece of knowledge, so nothing new had to be invented to find it.

Where the Seed holds no text for a place, the answer says so and the page says so. Nothing rather than
an empty quotation: a reader shown one has been shown a claim they cannot check and told nothing about
why.

## Every part, including the ones nobody wrote

The page draws every part the reading holds, in the order the source writes them — including `slug`,
which no source wrote and `slugify` computed (ADR-0023).

The temptation is to keep an extractor's own attributes off a business surface. It is refused because a
Facet may state `requiredAttributes` against any attribute a Fact has, and does: the Module page tells
a reader *nothing is written down under `slug`* the moment a Lens asks for it. A reader shown fewer
parts than the criteria are stated against cannot check the shortfall they were told about, and a
surface that hides one attribute while another surface counts it is two answers to one question.

A part holding several passages is drawn as the several it is, and says that it is several. 15 Business
Rules in the DDD Corpus write a line of preamble before their first subheading and then the subheading
the Lens maps onto the same attribute, so `statement` holds both — and fixture A's `R-1` does the same
thing, which is why this is held by a test and not by care. There is deliberately no shape in the
agreement that could carry them joined: `says` is a list, so a server cannot fuse them and a page
cannot be handed them fused. Two passages that are not next to each other in the source, handed to a
reader as continuous prose, are not what the source says (ADR-0017, ADR-0026), and prose that reads
continuously is exactly how nobody notices.

## No figure on this surface, and two zeros that are not the same zero

A rung and a set of places are drawn as two things and neither in the other's place (LAW-005). The
distinction has a sharp instance in fixture B, which exists to carry it: its ladder is `0 → 1 → 2` and
`Pulley d'Étage` sits at the rung called **`0`** with **no Sources at all**. One is the name its Corpus
gave a step; the other is a real emptiness. So the rung is drawn as a name and never as a quantity, and
the absence is drawn as the absence it is and never as a nought, which reads as a measurement.

What a reader sees when several places attest something rather than one is **the set itself**. There is
no count of Sources anywhere on the page, and no `Figure` on it at all: a count of Sources has nothing
to be counted against unless the Facet declares `minSources`, and a number without its denominator is
the figure LAW-006 refuses. The set of three places beside the set of one is the difference, drawn.

## What this makes visible and does not fix

Every one of the 1506 places in the DDD Corpus answers through the new route, and none of them is
without a quotation. **220 of those quotations stop short of what the source says** — and that is 183 of
183 Business Rules, 20 of 20 Overviews, 12 of 17 Experience, 4 of 477 Glossary and 1 of 245 Commands.
The page says so, with the place to go for the rest, because a cut with a pointer is honest about being
partial in a way a summary is not.

Honest is not the same as sufficient, and this is where the surface earns its keep by showing the
problem rather than by solving it. The widest gap in the corpus is
`coeur/facturation/index.md`, line 19: **25,201 characters of parts beside a 99-character quotation**.
`LIMIT` is 600 characters in `excerpt.ts`, and the cut falls at a line boundary — so a document whose
next line is a long paragraph keeps only what came before it. Across the 220, the quotation runs to a
median of 547 characters and 10 of them keep under 300.

`LIMIT` is deliberately not touched here. Raising it changes the content of every Seed, so every
digest, so every shelf has to be written down again — and it would still be a cut, only a longer one.
What to do about the size and the boundary rule is its own change, against a surface that now shows
what a cut looks like to a reader.

## Consequences

- The Studio has a third surface and the API a fourth route, both GET. Nothing writes; re-reading the
  source is #26.
- `notHeldSchema` tells three things apart rather than two, so a reader who lands on a place this
  Corpus writes nothing at is not told to go and check a Module's name.
- The Module page's list of places became links, and the Findings beside it did not. Where a Finding's
  place goes is the Inbox's business (#23).
- `corpusFactSchema` refuses a rung the ladder alongside it does not have, and one part arriving twice.
  Both are agreements a server could break and a page would then draw confidently and wrongly.
- Nothing about a Fact's own status or provenance is asked of a Corpus that keeps neither. ADR-0029's
  fallback holds, so fixture B — whose review happens a document at a time and whose Facets declare no
  `sourcesAttribute` — draws the same page through the same route.
