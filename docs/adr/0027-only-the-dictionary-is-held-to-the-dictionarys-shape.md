# ADR-0027: Only the dictionary is held to the dictionary's shape

Status: Accepted. Implements ADR-0021. Corrects one figure in it.

ADR-0021 decided that exactly one Facet declares `definesTerms: true` and only its Facts settle what a
word means. Building it forced one question ADR-0021 did not reach, and the answer is a decision:

**A Facet of Terms must map onto `name`. Only the defining Facet must map onto `definition`.**

Before this, every Facet of Terms was refused unless it named an attribute holding a definition — a
column mapped to `definition` for a table, a `bodyAttribute` for a heading. That requirement existed for
one reason: so the language reading could find a word's meaning without guessing at corpus-specific
attribute names. Once only one Facet feeds that reading, asking it of the others asks a Lens to write
down that its rows mean something they do not.

Two smaller decisions go with it:

- **`definesTerms` on a Facet that is not a Facet of Terms is refused**, on the same grounds as
  `identifyingColumns` on a Facet reading no tables and `parts` on a Facet reading no headings
  (ADR-0024, ADR-0026). Ignored, the declaration reads as though it were in force, and a Lens whose
  author believes they have named a dictionary has none.
- **`definesTerms` is written as `true` or not written**, never as `false`. A Facet says this about
  itself or says nothing, exactly as it does with its parts and its columns.

## Why the requirement had to move, and not merely be tolerated

The requirement and the accident were the same mechanism, pointing opposite ways.

ADR-0021 records that a Facet of Terms stayed out of the dictionary only by mapping nothing onto
`definition`, and calls this working *by accident* — nothing said so, so it held until somebody renamed
one attribute. What it does not say is that the schema simultaneously **forbade** that same omission.
Every Facet of Terms had to name a definition; naming one enlisted it into the dictionary. So the only
way out of the dictionary was the one thing the schema refused, and the only Facets of Terms that loaded
were ones the reading then treated as rival dictionaries.

`lenses/vertuo-domain-fr.json` is that contradiction in the tree. `experience` — 17 Facts describing
where knowledge is seen on screen — satisfies the requirement by calling its body attribute
`description`, and escapes the dictionary because the reading looks for `definition`. One word doing two
jobs, by luck, in opposite directions.

Leaving the requirement in place after naming a dictionary would mean an aggregates table has to map a
column to `definition` to load at all, while the reading correctly ignores it. A Lens would then say
*this column holds what this word means* about a column that holds which entity is the root. That is a
falsehood written into a Lens to satisfy a check that no longer reads it, and the line it crosses is
LAW-009: what a Lens says about a corpus has to be what the corpus says.

## Where the line falls, and why there

**A word is what makes a Term a Term. A meaning is what makes it a dictionary entry.**

So `name` is asked of every Facet of Terms and `definition` only of the defining one. The document
extractor stays refused for every Facet of Terms, defining or not — that refusal *is* the `name` rule for
an extractor that produces no name, and a Term with no word is not a Term under any Facet.

## What was measured

Against `../vertuo-domain-fr` at `ad84021`, read through `lenses/vertuo-domain-fr.json`.

**The defect, priced.** Changing `experience`'s `bodyAttribute` from `description` to `definition` — one
word, in one line of one Lens — took the reading from 125 Findings to 129, and all four new ones are
inventions:

```
[conflicting-definition] coeur/devis/experience/editeur.md:32
    Term "Couche Décision" is defined 4 different ways
[conflicting-definition] coeur/devis/experience/editeur.md:170
    Term "Couche Pointeurs" is defined 4 different ways
[conflicting-definition] coeur/devis/experience/editeur.md:187
    Term "Couche Snapshot" is defined 4 different ways
[conflicting-definition] coeur/devis/experience/editeur.md:25
    Term "Statut de Revue PM" is defined 2 different ways
```

Not one of those is a word this business defines. The first three are a single screen-layer heading
written once in each of the four screen documents — `coeur/devis/experience/editeur.md`,
`coeur/devis/experience/liste.md`, `coeur/opportunite/experience/liste.md`,
`coeur/facturation/experience/liste.md`. *Defined 4 different ways* reads to a Module Owner as a serious
disagreement about a word, arriving beside the 30 real ones and carrying the same weight, about a corpus
that wrote one heading four times.

The fourth is `Statut de Revue PM`, which is where this corpus writes its review status. ADR-0025 set it
aside from Business Rules and ADR-0026 kept it out of the overview's attributes; under `experience` it is
still a Fact, because that Facet names no `itemPattern` for the reason ADR-0025 gives. This change stops
it being a *definition*. It does not stop it being a Term, and does not try — reading it as the review
status it is belongs to the work ADR-0022 describes.

**The same word, after.** With the defining Facet declared, `experience` may call its body attribute
`definition` and nothing happens: 125 Findings, 30 conflicting definitions, every figure unmoved. The
accident is no longer load-bearing in either direction.

**Nothing else moved.** The whole report is byte-for-byte what it was: 1506 of 1652 read, 146 set aside,
0 of 224 facets approved across 28 modules, 125 Findings — 33 empty-facet, 30 conflicting-definition, 27
missing-owner, 24 broken-reference, 8 split-identity, 3 unparsable-document. Fact counts per Facet are
unchanged, which they must be: which Facet is the dictionary decides what a reading compares, never how
many things there are (ADR-0016).

## Erratum to ADR-0021

ADR-0021 states the Glossary holds **482** Facts, in two places. It holds **477**.

The figure was right when it was written. ADR-0021 was accepted at 12:08 and ADR-0024 landed at 13:30 the
same day, and what ADR-0024 did was set five payload rows aside from that very Facet. So this is not a
mistake in ADR-0021; it is a figure that moved underneath it ninety minutes later, which is the case an
erratum exists for. Nothing in the reasoning turns on it — it is the size of the dictionary the 17 screen
descriptions would have been judged against, and 477 is that size.

Recorded here rather than in ADR-0021's own text, so a number somebody has already quoted does not change
under them. Issue #44 quotes 482 as well, from the same reading.

## How the repair was made observable

The two defects ADR-0021 names are repaired by two lines, and a repair no test can fail is not a repair.
Each was reverted and the reading measured:

- **Selecting by Facet.** `corpus-a` gains a second Facet of Terms — a list of which thing owns the
  others — whose one heading is `Widget`, a word its dictionary defines. With selection reverted to Fact
  Kind, the reading says `Term "Widget" is defined 3 different ways`, citing `alpha/aggregates.md`.
- **Reading the defining Facet's attribute names.** That fixture's second Facet of Terms is written
  **before** the dictionary and names its body attribute `definition`, which is the accident, deliberately
  triggered. Taking the names from whichever Facet of Terms comes first is caught by a Corpus whose two
  Facets of Terms name their attributes differently: every entry in the dictionary comes back with an
  empty meaning, which the check then skips as *not yet written down* rather than reporting. So the test
  asserts the meaning it read, not merely that it read something.

`corpus-b` declares its dictionary and carries no second Facet of Terms, and its recorded reading did not
move by a byte. `corpus-a`'s moved by exactly the column it gained.

## Consequences

- `facetSpecSchema` gains `definesTerms`. A Lens declaring any Facet of Terms and naming no dictionary
  does not load, and neither does one naming two.
- `buildTermRegistry` selects the Facts of the defining Facet and reads that Facet's attribute names. It
  no longer asks the Corpus for a Fact Kind.
- A Corpus may now carry any number of Facets of Terms — which thing owns the others, who the actors are,
  where a word is seen on screen — with none of them disturbing what the language reading compares, and
  without any of them having to claim to hold a meaning. That is what makes a stricter reading of this
  corpus expressible.
- A Lens author who forgets the declaration is told so at the line they wrote, not by a reading that
  quietly picked one.

**Revisit when** a Corpus genuinely holds two dictionaries — most likely one per locale — where the right
answer is a defining Facet per language rather than one per Corpus. ADR-0021 says the same, and this
changes nothing about it.
