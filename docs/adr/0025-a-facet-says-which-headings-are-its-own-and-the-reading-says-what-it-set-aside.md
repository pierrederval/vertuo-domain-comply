# ADR-0025: A Facet says which headings are its own, and the reading says what it set aside

Status: Accepted. Refines ADR-0020 and ADR-0024. Takes the Seed format to version 2.

Two decisions, taken together because the first is what made the second unavoidable.

**A Facet that reads headings may describe which of them are its own elements**, as `itemPattern`. A
heading that does not answer to the description is not one of this Facet's things at all — not one that
falls short. It is matched against the heading as the document writes it, markup and all, because the
person writing the description is looking at the source.

**The reading says how much it set aside**, per document in the Seed and as a sentence at the foot of a
report. *Set aside* means declined: something this Facet said was none of its own. It does not mean
unreadable, and something the Facet was never going to read anyway is not counted — otherwise the total
the figure is stated against would include things no reading of any Facet would have produced.

A Facet that describes nothing reads every heading it finds, which is what every Facet did before this
could be said. A Facet that reads no headings and describes some is refused at load, and so is a
description this reading cannot follow.

## Why the first

`extractHeading` made a thing of every `##`. A page's own furniture is written at that level too, so a
page's furniture was read as its knowledge. In the DDD Corpus, **39 of 222 Business Rules were not
rules** — nine distinct headings, every one of them a section that belongs on the page:

| The heading set aside | How many |
| --- | --- |
| `Terminologie` | 13 |
| `Statut de Revue PM` | 10 |
| `Liens vers d'Autres Connaissances` | 6 |
| `Policies Candidates` | 3 |
| `Statut de la Revue PM` | 3 |
| `Liens vers la Connaissance Associée` | 1 |
| `Règles Seulement en V1 <Badge type="warning" text="Seulement en V1" />` | 1 |
| `Traçabilité des Sources` | 1 |
| `Statut de Révision PM` | 1 |

The remaining 183 all begin `BR-` and three digits, with no near-misses, so one description separates
them exactly.

These differ from the rows ADR-0024 set aside in a way worth naming: most of them **passed** their
criteria. A section of terminology has a name and a paragraph, which is all the Facet asks of a rule, so
it was not landing in anybody's queue. What it was doing is padding a denominator — the figure a reader
is asked to judge a Module by — with things nobody ever meant to write as rules.

| Facet | Facts before | Facts after |
| --- | --- | --- |
| business-rules | 222 | **183** |
| glossary | 477 | 477 |
| commands | 245 | 245 |
| workflows | 234 | 234 |
| events | 195 | 195 |
| state-machines | 135 | 135 |
| overview | 20 | 20 |
| experience | 17 | 17 |
| **total** | **1545** | **1506** |

The Readiness Matrix does not move by a mark: 189 cells absent, 2 present but not well-formed, 88
well-formed, and none approved, before and after. The 39 were not what was holding any cell back.

## Why the second, here

ADR-0024 set aside six tables and 107 rows and told nobody, and recorded that it could not: saying so
per document means a Seed that records it, and there was no other place the figure could come from. It
assigned the channel to this change. So `seedDocumentSchema` gains `setAside`, `SEED_VERSION` goes to 2,
and a report says:

```
Knowledge as found: 1506 of 1652 read, 146 set aside.
Set aside is what a facet said was none of its own. It is judged by nothing, and left out of nothing silently.
```

146 is 39 headings and 107 rows. It is stated when it is zero as well: a figure that appears only when
it is not zero is one a reader has to already know to look for, and its absence then reads as nothing
having been left out (LAW-006).

Recorded in the Seed rather than computed later, because nothing downstream can recover it — once a
thing has been declined, the reading that declined it is the only place that knows it was ever there.
A count and not the things themselves: what was declined is not this Corpus's knowledge, and writing it
down would be writing down knowledge the Corpus does not claim. Its whereabouts is the source, which
the document's own path already gives.

ADR-0022 also plans a version 2, for a status declared per Fact. There is no conflict: this landed
first and took 2, and that change takes 3. Seeds already on a shelf are not migrated — a Seed is never
rewritten (ADR-0012, ADR-0017). They are read once more from source, and a shelf holding an older form
now says so in a sentence with the one thing to do about it, rather than failing every rule that has
come in since and reporting all of them.

## What moved in the Findings, and why each one is right

**Findings fall from 126 to 125**, entirely within broken references — 25 to **24**, from two
movements in opposite directions.

Three references stopped being reported, because they were written inside two of the 39. The body of
`Règles Seulement en V1` cites `termes-obsoletes`, and `Policies Candidates` cites `etats-operationnels`
and `frontieres-et-relationships-typees`. All three point at nothing. They were complaints about the
wording of a page's furniture, addressed to a Module Owner as though a rule were broken.

Two references started being reported, and are a fifth member of the family ADR-0023 names.
`coeur/devis/commands.md:44` and `:45` both cite
`[Règles Seulement en V1](business-rules.md#regles-seulement-en-v1)`. That heading is still on the page
and the link still works where a reader clicks it. It is simply no longer a Fact, so the reading has
nothing to resolve the reference against. The description was not widened to keep it: the section is not
a rule, and bending what counts as a rule so that a link resolves is deciding what the business wrote
down by what the tool finds convenient.

So the genuine broken-reference count in this corpus is still zero, and the reported figure is still the
reading's own defect in every case.

**Fourteen findings changed the line they cite**, from `business-rules.md:11` to `:23` and thereabouts.
A finding about a document cites its first Fact, and the first thing in those documents used to be
`Terminologie`. It is now the first rule. The same finding, pointing somewhere more useful.

## What this does not repair, deliberately

- **`experience` describes nothing, and carries the same furniture.** Four of its seventeen headings are
  `Statut de Revue PM`. The other thirteen are `Couche Décision`, `Couche Pointeurs`, `Couche Snapshot`
  and `Lacunes nommées, pas comblées` — no description separates those without becoming a list of them,
  and a list of the things you happen to have is a worse answer than four wrong ones, because it is
  wrong about every document written after it. Left as it is, and said out loud here.
- **`Statut de Revue PM` is where this corpus writes its review status.** Ten of the 39 are that, and
  four more under `experience`. Set aside as furniture, which is right — a review status is not a rule.
  But it is *written down*, and #45 (ADR-0022) will be looking for exactly it. It has not gone anywhere;
  it is in the source, under that heading, and this is the note that says so.
- **A document read heading by heading can hold a table of its own knowledge, and neither reading gets
  it.** `coeur/devis/business-rules.md` holds nine rules as rows under `Règles Seulement en V1`, and
  three other business-rules documents hold tables too. Before this change and after it, none of those
  rows is read: the Facet reads headings. This is ADR-0023's fourth cause seen from the other side, and
  it is one shape — a Facet reading both rows and headings out of one document — not two.
- **Nothing tells a reader *what kind* of thing was set aside**, only how many. A reader who wants to
  know which 146 opens the Seed. That is enough to keep the arithmetic honest and not enough to act on,
  and the shape that answers it is the Occurrence list the Studio will want anyway.

## Consequences

- `facetSpecSchema` gains `itemPattern`. `lensSchema` refuses it on a Facet that reads no headings, and
  refuses a description it cannot follow.
- `seedDocumentSchema` gains `setAside`; `SEED_VERSION` is 2. `whatWasRead` derives the totals from a
  Seed rather than a second figure being written beside the documents it totals.
- `renderMatrix` states the figures. `loadCorpus` carries them out with the Corpus, because a caller
  handed a Corpus and no figure has no way to tell a reader what it was not shown. The Studio does not
  show them yet and will need to.
- `lens-a.json` describes its rules, and `corpus-a`'s rules document gained a section of terminology, so
  both directions are held against a corpus that is not the DDD one — a Facet that describes its
  headings reads two, a Facet that describes none reads three (ADR-0001).
- Both recorded baselines gained the same two lines at the foot and not one existing line moved, which
  is the evidence that the reading learned to say something and lost nothing.
- Nothing a reader meets gained an engineering word for any of this. Which headings belong to a Facet is
  a sentence the Lens says, and the core says nothing about it (LAW-004, LAW-010).

**Revisit when** a corpus needs to describe its headings by something other than how they begin, or when
a Facet legitimately reads both rows and headings out of one document. The second is the larger of the
two and is worth its own change.

## Erratum

The three Readiness Matrix figures above — "189 cells absent, 2 present but not well-formed, 88
well-formed" — are wrong, and are corrected in ADR-0026. Measured against the same corpus at the same
commit, the grid is **119 absent, 2 present, 103 well-formed, 0 approved**: 224 cells, 28 modules by 8
Facets. The recorded three sum to 279, which no reading of eight Facets can produce.

The claim they were offered as evidence for is correct and reproduces exactly — the two readings are
identical mark for mark, and the 39 headings held no cell back. Every other figure in this ADR
reproduces as written. Left in place rather than edited, so that nobody who has read or cited these
numbers finds them quietly different; ADR-0026 carries the correction.
