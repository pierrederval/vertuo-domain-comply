# ADR-0036: A quotation is long enough to check a claim against, and cuts where the source breaks a word

Status: Accepted. Takes the decision ADR-0030 declined, closes issue #59, and refines ADR-0017 on the
size of a cut and where it falls — not on what may be altered, which is unchanged. Corrects what
ADR-0012's idempotence is reported as on a Corpus's change feed. Serves LAW-009. The spec, LAW-004,
LAW-006, LAW-009 and LAW-011 are not modified.

**A quotation carries 4,000 characters of source and is cut where the source last breaks between
words.** It was 600 characters cut at the last line boundary. Four things were decided and the
measurement that decided each is below.

## What was wrong, and it was two separate faults

`LIMIT` was 600 and the cut fell at the last line boundary inside those 600. On the DDD Corpus's 1,506
pieces of knowledge that produced **220 cut quotations — 183 of 183 Business Rules and 20 of 20
Overviews**, which is the two Facets the product cares most about cut without exception.

The size and the boundary rule are two faults and not one, and separating them is what let each be
decided on its own evidence:

- **The size** decides how many parts of a piece of knowledge a reader can check at all. Of the 6,012
  parts the DDD Corpus writes inside the spans they were read from, **1,038 fell past the cut**.
- **The boundary rule** decides how much of the last part they see. It threw away **502 of a
  600-character budget** at its worst.

Nothing else about them interacts: at every candidate size the two rules leave the same number of parts
unreachable, to the part. So they are two decisions taken against two measurements.

## The size is 4,000, and not the number that would zero this corpus

| what a reader can check | 600 | 2,000 | 3,000 | **4,000** | 6,000 | 8,500 |
| --- | --- | --- | --- | --- | --- | --- |
| pieces of knowledge quoted whole, of 1,506 | 1,288 | 1,383 | 1,442 | **1,472** | 1,488 | 1,500 |
| parts falling past the cut, of 6,012 | 1,038 | 426 | 213 | **128** | 67 | 34 |
| quotation text the budget allows | 404KB | 655KB | 743KB | **786KB** | 834KB | 878KB |

The last row is what the budget allows, not what was carried: the old rule wasted budget, so it carried
384KB against a 404KB bound, while the new rule wastes so little that at 4,000 it carries the 786KB the
bound allows.

There is no knee in that curve, so the number had to come from an argument rather than from the shape of
it. Three things decided it:

**Every Facet read a row at a time is carried whole by any number above 700.** The longest span across
Commands, Domain Events, Glossary, State Machines and Workflows is 680 characters, and 1,286 of the
1,506 pieces of knowledge are in those five. So the number is never about tabular knowledge; it is only
ever about prose read a heading at a time.

**Business Rules are that prose, and their ninth decile is 3,924 characters.** 4,000 carries nine
Business Rules in ten whole. That is a figure about the shape of a rule — a statement, a justification,
the conditions derived from the source — and not about one corpus's tail.

**8,500 was rejected precisely because it works.** It is this corpus's longest Business Rule, so it
takes Business Rules to none cut. Choosing it would fit the core to one corpus, which is the thing
ADR-0001 exists to prevent: the next corpus writes a 12,000-character rule and the number is wrong
again, having been derived from a corpus this product is not about.

Disk was measured and is not a constraint either way. The DDD Seed goes **1,955KB to 2,373KB**, a fifth
larger, of which quotations are 384KB to 786KB.

## The cut falls at a word because a word has a bound and a line does not

Cutting at a line boundary keeps whole source lines, which is why it was written. What it keeps is
bounded by the longest line the source happens to write, and **nothing bounds that.** A document whose
next line was a long paragraph kept only what came before it.

The worst instance is the one issue #59 names, and it is worth reading rather than describing.
`coeur/facturation/index.md`, line 19 — a 26,676-character span — gave a reader **99 characters**:

```
# Facturation

## Statut de Revue PM

Candidat - Dérivé du Comportement Backend Actuel

## Objectif
```

Four headings, a review status, and not one word of what the Module is for. Line 28 of that document is
672 characters — longer than the whole budget — so the last line break inside 600 characters was at
position 99 and 501 characters of budget went with it.

A break between words is bounded by the longest word, which a language bounds. Measured across the same
220 cuts at the same 600 characters: **the budget wasted goes from a median of 54 and a worst case of
502, to a median of 4 and a worst case of 79.** The same document at line 19 now gives a reader 3,994
characters, being the headings above plus the whole of what `## Objectif` says.

What this gives up is that a quotation may now end inside a source line. It does not end inside a word,
which is the part that would read as the source's own defect rather than as a cut: a word broken in half
looks like a typo in the corpus, and a sentence stopping at a word looks like what it is. The cut still
says it was cut, on both surfaces that draw one, and ADR-0017's terms are untouched — text is removed
and no text that remains is altered.

## The change feed stopped claiming that a writing-down means the source said something new

This is the cost issue #59 does not list, and it is the reason this change is more than a constant.

A Seed's digest is over its content, and its content includes its quotations. So a new quotation rule
writes down a new Seed over documents nobody touched. Measured on the DDD Corpus's shelf: two
writings-down **twelve seconds apart**, the comparison between them reporting `the-last-reading` with
**zero changes**, 125 Findings before and after, 0 of 28 Modules approved before and after. And the page
above that comparison said *every time this source was read and said something new is listed.*

That sentence was false about the second entry, and it had been available to be false since the feed was
built: ADR-0023's `slugify` correction and ADR-0025's `itemPattern` both changed what came out of
unchanged documents, and each would have written a phantom *the source said something new* onto every
shelf then held.

**The feed now says what happened and the comparison beside it says what changed.** Each entry says the
source was read and something was written down, which is all any of them ever knew. That division is
LAW-006's own: two facts a reader acts on differently do not get one presentation, and *the business
edited a document* and *this product reads documents differently now* are exactly two such facts.

Telling the two apart in the feed itself was considered and is not done here. It needs the Seed to say
which rule wrote it, and a Seed saying something about itself rather than about its source is a new axis
on a thing ADR-0017 deliberately keeps empty — the Seed's own `version` and `lensId` are there to find it
and read it back, not to explain it. It is also a change about the change feed and not about quotations,
and it is worth its own issue, because until then a reader who wants to know whether the business moved
reads the comparison, which is right beside it and correct.

## One number, not one per Facet

An Overview's span is a whole document, and `coeur/facturation/index.md` is 26,676 characters of one. So
the obvious reading of the table above is that one number cannot serve both a heading-sized Rule and a
whole document, and that a Lens should declare the number per Facet.

It is refused, on the measurement and on the boundary. **No number serves an Overview**: 14 of 20 are
still cut at 4,000 and 13 at 6,000, and the number that would carry one whole is 26,676 — which is
reproducing the corpus onto a page, not checking a claim against it. Nobody verifies a statement by
reading a 26,000-character document on a screen; they open the document, which is what the cut already
tells them to do and where the pointer already sends them.

And a per-Facet number is the wrong kind of thing for a Lens to hold. A Lens says what a Corpus means —
which Facets there are, what a rung denotes, what a Facet requires. How much source text travels so a
reader can check it is this product's own transport, which is where ADR-0017 put it: *an excerpt's length
limit is a property of extraction.* A knob there would also oblige every Lens author to have an opinion
about a number the core can choose correctly, and would let one of them ask for the 26,000-character
page this paragraph rejects.

## Measured

Every figure below is the DDD Corpus's shelf, written down under each rule from the same 153 documents,
with no document touched between the two.

| | before | after |
| --- | --- | --- |
| quotations cut, of 1,506 | 220 | **34** |
| Business Rules cut, of 183 | 183 | **17** |
| Overviews cut, of 20 | 20 | **14** |
| Experience cut, of 17 | 12 | **3** |
| Glossary cut, of 477 | 4 | **0** |
| Commands cut, of 245 | 1 | **0** |
| Domain Events, Workflows, State Machines cut | 0 | 0 |
| a cut quotation keeps: least | 98 | **3,913** |
| a cut quotation keeps: median | 547 | 3,997 |
| cut quotations keeping under 300 characters | 10 | **0** |
| thinnest quotation in the corpus | 98, at `technique/parametres/index.md:18` | 3,913, at `coeur/facturation/business-rules.md:899` |
| `coeur/facturation/index.md:19` | 99 | **3,994** |
| budget wasted by the boundary rule, median / worst | 54 / 502 | 5 / 87 |
| Seed on disk | 1,955KB | 2,373KB |
| of which quotation | 384KB | 786KB |
| open Findings | 125 | 125 |
| Modules fully approved | 0 of 28 | 0 of 28 |

Two of those rows are the point of the other twenty: **no figure and no Finding moved on any of the
three corpora.** A quotation participates in no Check and in no criterion — it reaches two surfaces and
nothing else — so nothing about how much of a source it carries can move a reading. That is also why a
fear of moving a figure was not allowed to choose the size.

## Consequences

- `EXCERPT_LIMIT` is exported, and the two tests that build a span long enough to be cut build it from
  the budget. Both had a length written into them — 1,000 and 1,560 characters — and both would have gone
  on passing over a span this change no longer cuts, which is a test that has quietly stopped testing.
- **Neither fixture Corpus moves, and this was measured rather than assumed.** No quotation in either was
  ever cut at 600, so none is cut at 4,000, so both Seed digests are byte-identical and writing the
  fixtures shelf down again adds no Seed and records no reading. Fixture B remains the one whose
  knowledge is too short to be cut under any rule, its longest quotation being 92 characters.
- **Only the DDD Corpus's shelf has to be written down again**, with `pnpm shelf:domain`, and nothing in
  the repository holds a shelf: `**/seeds/`, `**/runs/` and `**/lens-versions/` are ignored by design.
  The cost issue #59 gave for this change — every shelf rewritten, every recorded reading citing an old
  Seed orphaned — is not there. `holdSeed` adds a digest-named file and never replaces one, so a reading
  citing the old Seed still cites a Seed on the shelf; the reading taken after the change reported
  `the-last-reading`, not `knowledge-no-longer-held`.
- No fixture gained a long document. A fixture carries a corpus *shape* (ADR-0001), and length is a size
  and not a shape: 4,000 characters of invented prose would make every test that reads that directory
  slower to understand and would prove nothing the boundary rule's own tests prove precisely. The cut is
  held at three levels instead — the rule's own tests, a third-shaped corpus written inside the Fact
  route's test, and both Studio surfaces from a payload that says a quotation was cut.
- The Seed's format does not move, so there is no version bump and every Seed already held stays
  readable. A bump would make every existing shelf answer *the knowledge last written down from this
  source cannot be read back* (ADR-0035), which is a self-inflicted version of the thing that ADR
  exists to report.
