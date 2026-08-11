# ADR-0029: A Fact states where it stands and what it was checked against

Status: Accepted. Implements ADR-0022, and corrects four figures in it. Refines ADR-0006 and
ADR-0026.

**A Facet may name the attribute holding where one of its Facts stands, and the attribute holding
what that Fact was checked against.** A Fact that states its own standing is read by it; a Fact that
states nothing falls back to its document's. What a Fact was checked against is unioned with what
the status mapping says that status corroborates, because Sources are a set (LAW-005). The adapter's
document-level status key becomes optional, so a corpus whose Facts all state their own has nothing
it must invent in frontmatter.

The reason is arithmetic that nobody would defend once it is written down. Measured against the DDD
Corpus at `ad84021`:

| Status at source | Documents | Facts it stamps | Set aside beside them |
| --- | --- | --- | --- |
| `Candidat - Dérivé du Comportement Backend Actuel` | 100 | 1247 | 84 |
| `Revu par PM` | 16 | **253** | 62 |
| `Placeholder - Non documenté` | 36 | 6 | 0 |

Sixteen documents have been through review, and the grain makes each of those sixteen acts a claim
about everything underneath it. `coeur/devis/glossary.md` is one `Revu par PM` and it marks **47
Terms reviewed at once**. Nobody reviewed 47 definitions; somebody reviewed a document. The reverse
is the same wall: a product manager who has genuinely checked three Commands of thirty-five has
nowhere to say so, so the only honest move is to sign off none. And the whole of it sits in two
Modules — `coeur/devis` and `coeur/opportunite` — which is what one line of frontmatter per document
buys a corpus of twenty.

## Why an attribute, and nothing more

This is the decision that kept the change to two optional strings and one loop.

Both declarations name an *attribute*. How an attribute came to be on a Fact is already the
extractor's business: a column of a table (ADR-0024), a Part under a heading (ADR-0026), or the body
itself. So a corpus that keeps its Commands in tables and its Rules in sections is read by one
mechanism, and neither `statusAttribute` nor `sourcesAttribute` contains a single line about tables
or headings. If a future change adds a case for one extractor here, the design has drifted and the
case belongs where the extractor lives.

The same reasoning says where the reading happens rather than the extraction. A Seed quotes its
source and says nothing about it (ADR-0017); `interpret` is the one place that decides what a status
denotes. So a Seed carries the passage the source wrote, and this reads a rung out of it — exactly as
it already reads one out of a document's frontmatter value.

## What one passage written as a list becomes, and the rule that was refused

This was the real work in the slice, and the trap is easy to walk into without measuring.

190 Facts in the DDD Corpus already name where they came from — 177 of 183 Business Rules and 13 of
20 Overviews carry a `Traçabilité des Sources` Part, read into a `traceability` attribute since
ADR-0026 and looked at by nothing. But a Part maps onto one attribute, so a Rule citing three files
handed its provenance over as **one string with three lines in it**:

```
- `…/Offers/Services/OfferState.php`
- `…/Offers/Services/QuoteMutationPrepareData.php`
- `…/Offers/Headers/QuoteInput.php`
```

Taken as one Source, that is worse than no Sources at all: `minSources: 2` would then be unmeetable
by the best-corroborated Fact in the corpus, which names fifteen places.

**One line, one Source, taken exactly as written apart from the mark saying it is one item of a
list.** `sourcesWritten` does nothing else, and the thing it deliberately does *not* do is the reason
it was measured first. The obvious tidy-up is to unwrap a path written between backticks — and across
the 646 lines those 190 Facts write, **468 are a bare backticked path and 178 are a path followed by
a note narrowing which part of it**:

> `` - `…/entities/UserEntity.php` (`canAccessOwnWorksiteOnly`) ``

A rule that unwrapped the first would leave the second untouched, and the set would be half one kind
of thing and half another. A place a reader is sent to is quoted and never tidied (LAW-009), so all
646 are read the same way. The cost is honest and stated: a Source's name carries the backticks the
corpus wrote, and a corpus that writes several places on one line gets one Source. Nothing here
splits on a comma, because a comma is a character a filename may contain and no corpus in front of us
writes them that way.

## Where a status is deliberately not read

`Statut de Revue PM` is where this corpus writes its review status, and ADR-0025 set it aside as one
of 39 headings that are a page's furniture, with a note saying #45 would come looking for exactly
it. It came looking, and **what is written there is not a per-Fact status**:

```
 6  status: Revu par PM        ← frontmatter
13  ## Statut de Revue PM
15  Revu par PM
```

`coeur/devis/business-rules.md:13` is a `##` section — item level, beside the rules and not under one
— whose body repeats the frontmatter value. Naming it would read the document's own status a second
time, change nothing about the reading, and make the Lens claim a grain the corpus does not have. It
stays set aside.

So this slice's two halves are not equally blocked, and the PR that landed it says so:
`sourcesAttribute` changes the DDD reading the day it lands, and `statusAttribute` changes nothing
about it until 1506 statuses are transcribed in `vertuo-domain-fr`. The mechanism is landed and held
by the fixtures; the corpus is somebody else's change in another repository.

## What moved, and what did not

**The DDD report did not move by a byte.** All 550 lines identical before and after: `Approved
facets: 0/224 across 28 modules.`, `Knowledge as found: 1506 of 1652 read, 146 set aside.`,
`Findings (125)` with the same 33 empty-facet, 30 conflicting-definition, 27 missing-owner, 24
broken-reference, 8 split-identity, 3 unparsable-document. No Facet in that Lens declares
`minSources`, and Sources feed nothing else, so naming where they are written cannot move a mark.
`0/224` is correct for a separate reason and is not what this fixes: the ladder tops at `validé` and
nothing in the corpus has reached it.

**What moved is Trust, which had never varied.** Every Fact's Sources came from its document's status
mapping — one place for `candidat`, two for `revu` — so across 1506 Facts the corpus named **two
distinct places in total**:

| | Before | After |
| --- | --- | --- |
| Distinct places named anywhere in the Corpus | **2** | **550** |
| Facts corroborated by two or more | 253 | **416** |
| Sources a Fact carries | 0, 1 or 2 | 0 to 15 |

163 Facts moved from one corroborating place to several, and 27 from two to more. `minSources` means
something for the first time, and it is not declared here: turning it on is a decision about what
counts as enough, which belongs to whoever is answerable for the corpus, and it would move the grid.

**The citation improved before any status is transcribed.** An unrecognised status stated by a Fact
is reported at that Fact's own line. In the fixture Corpus it reads `alpha/rules.md:47`, which is the
rule's own heading and not the top of a document 46 lines above it.

## Two grains of the same Finding, on purpose

A document whose one status cannot be read is one thing wrong in one place, and it is reported once,
at the document. Saying it again for every Fact beneath it would count one defect as many (LAW-006).
A status stated by a Fact is reported at that Fact, because that is where somebody wrote it.

A Fact whose status cannot be read keeps the places it named. Maturity and Source are independent
(LAW-005), and what a Fact was checked against does not depend on which rung it reached.

## The one ambiguity, and why it is refused rather than resolved

An attribute holds two passages when a source wrote the same Part twice (ADR-0026). Two of them under
a status attribute are two statements about where one thing stands, and the reading takes **neither**:
picking one would be a silent choice between two things the source says, and nothing in either makes
it the answer (LAW-008). The reader is told what was found, at the Fact's line.

Reported under `unknown-status` rather than as a new Finding code. The code means *this status could
not be turned into a rung*, which is true of both cases, and no corpus in front of us exhibits this
one — a Finding code invented for a case nothing exercises is the thing ADR-0026 refused to build.

## Refused at load, not ignored

A Facet naming an attribute that nothing it reads writes to is refused when the Lens loads. This is
the fourth member of a family: ADR-0024's `identifyingColumns` on a Facet reading no tables,
ADR-0025's `itemPattern` on a Facet reading no headings, ADR-0026's empty `parts`. Every one of them
is the same hazard — ignored, the declaration reads as though it were in force, every Fact falls back
to its document exactly as before, and the Lens says in writing that it does not.

The check derives what a Facet could fill from the same three declarations the reading itself is
derived from, so the two cannot drift.

## Consequences

- `facetSpecSchema` gains `statusAttribute` and `sourcesAttribute`. `adapterSpecSchema.statusKey`
  becomes optional, and `extractSeed` records `null` where a Lens names no key.
- `sourcesWritten` in `comply-lens` reads one passage as the set of places it names. It sits beside
  `decomposeStatus` so both halves of LAW-005 are in one file.
- `interpret` resolves where a Fact stands per item, with the document as fallback, and unions both
  paths' Sources.
- The DDD Lens names `sourcesAttribute: "traceability"` on `overview` and `business-rules`, and names
  `statusAttribute` nowhere. Two lines.
- `lens-a.json` says its rules state their standing and what they were checked against;
  `corpus-a/alpha/rules.md` gained a third rule that states a standing no mapping covers.
  `lens-b.json` and `corpus-b` are untouched, and `corpus-b.txt` did not move by a byte — a corpus
  whose review genuinely happens a document at a time reads exactly as it did (ADR-0001).
- `corpus-a.txt` moved by three lines, all three accounted for by the rule that was added.
- Requiredness is a sentence a Lens says through `requiredAttributes`, and a test holds that the
  engine asks for a standing only where a Facet named one.
- Nothing a reader meets gained an engineering word, and no corpus word reached core source.
  `standing` and `checkedAgainst` are Lens declarations and are on the core guard's list.

## Erratum to ADR-0022

Four of its figures are wrong. Corrected here rather than in place, and noted at the foot of ADR-0022
so nobody reads them without meeting this.

**Three counts are stale, not mistaken.** ADR-0022 records 1331 Facts under `candidat`, 315 under
`revu`, and 52 Terms in `coeur/devis/glossary.md`. The reading has since declined 107 table rows
(ADR-0024) and 39 headings (ADR-0025) that were never any Facet's own, and the difference decomposes
exactly: **84 out of `candidat` and 62 out of `revu`, and 84 + 62 = 146**, which is the number the
report prints as set aside. The glossary's five are payload rows, the same five that took ADR-0021's
482 to 477. The figures are 1247, 253 and 47, and its argument is unaffected — 47 definitions
reviewed by one line of frontmatter is the same wall as 52.

ADR-0022 also states "Trust stops being constant across 1148 Facts". That number matches no reading
of this corpus at any commit; the Corpus holds 1506 Facts, of which 190 name where they came from.

**The Seed format does not go to version 2, or to 3, and does not move.** ADR-0022 planned
`seedItemSchema` gaining `status` and `sources` at version 2; ADR-0025 reached version 2 first and
reserved 3 for this change. Neither is taken, because there is nothing new to write down.

Where a Fact states its own standing, it states it in one of its attributes, and
`seedItemSchema.attributes` has held `Record<string, string | string[]>` since it was written. A Seed
carrying a status and a list of places validates today at version 2, and a test in `comply-seed` says
so. Lifting the two into fields of their own would either duplicate what `attributes` already holds —
a second opinion waiting to disagree — or remove them from it, which would put the status beyond
`requiredAttributes` and take away the only way a Lens has of asking a Fact to state one.

Measured rather than argued. Re-extracting the DDD Corpus against the changed Lens reports `Nothing
has changed at source. Already held: …d744f885…`: the Seed is byte-identical and its digest is
unchanged. With `SEED_VERSION` raised to 3, that same Seed is refused —

> The knowledge held at … was written down before this reading learned to say everything it now says
> (it was written down as 2, and this reads 3). Write it down from source again, and this will read it.

— and the Seed written in its place differs from the one on the shelf in the single digit of its
`version` field, `documents` identical object for object, under a new digest. That sentence would be
untrue, every shelf would be refused until re-read, and the re-reading would buy a new name for
knowledge that had not changed. A version is a portability contract (ADR-0012) and it earns its
increment when the shape of what is carried changes. This slice changes what is *read out of* that
shape.

**Revisit when** a corpus writes its Sources somewhere a newline does not separate them — a table
cell holding several, a Part written as prose — at which point how a list is written becomes
something a Lens has to say rather than something this reading assumes. Or when `statusAttribute`
has a corpus to read: the first Lens to name one will find out whether a rung and a provenance stay
separable when both are stated per Fact, which is the claim ADR-0022 rests on and the one thing here
that no corpus has yet tested.
