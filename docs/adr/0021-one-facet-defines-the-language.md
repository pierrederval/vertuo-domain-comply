# ADR-0021: One Facet defines the language

Status: Accepted. Refines ADR-0019.

Exactly one Facet declares `definesTerms: true`. Only that Facet's Facts build the registry a
language-integrity Check reads. Every other Term Facet is still a Term — same Kind, same readings — and
settles nothing about what a word means.

A Lens that declares any Term Facet must name exactly one defining Facet. Validated at load.

## Why

ADR-0019 established that a corpus routinely splits one Fact Kind across several Facets, and named this
case out loud: *"a glossary and a list of aggregates are both Terms."* What it did not say is that only
one of them is a dictionary.

`buildTermRegistry` walked `corpus.byKind('Term')` — every Term Fact in the Corpus. The defect is already
live in a shipped Lens. `lenses/vertuo-domain-fr.json` declares two Term Facets: `glossary`, 482 Facts,
and `experience`, 17 Facts describing where knowledge is seen on screen.

No false contradiction arises today, for exactly one reason: `experience` names its body attribute
`description`. The registry looks for `definition`, finds nothing, and `conflicting-definition` skips
each one as *not yet documented here*. **Rename that single word in the Lens and 17 screen descriptions
silently become word definitions**, judged against a 482-word dictionary they were never meant to enter.

The forward case is worse. The corpus documents `## Aggregates` inside four of its twenty overviews,
naming Devis, Ligne de Devis, Signature, Chantier and Avenant — every one of which the Glossary already
defines. The moment those become Facts, the Check reports `Term "Devis" is defined 2 different ways`,
where one entry says what the word means and the other says which entity is the Aggregate Root.

Two different statements about one word, reported as a contradiction, arriving in a Module Owner's queue
carrying the same weight as the 30 genuine conflicting definitions the same Check finds.

A second defect goes with it, quieter and worse. `termAttributes` read the attribute names from
`lens.facets.find(f => f.factKind === 'Term')` — the **first** Term Facet — and applied them to every
Term Fact in the Corpus. So `experience`'s Facts are already being read through `glossary`'s attribute
names. Two Term Facets with different column names and the registry silently reads the wrong fields,
producing a reading that is simply wrong and looks fine.

## Why one, and not several

A dictionary with two authorities is two dictionaries, which is the split identity this product exists
to detect. Allowing several defining Facets also brings back the precedence question — when two of them
define the same word, which wins — and that is the exact cost ADR-0019 refused to pay in a
hand-authored Lens.

## Why not simply omit a definition column elsewhere

It already works: `conflicting-definition` skips a Term whose definition is empty, because absence is
not a contradiction. So an aggregates table with no column mapped to `definition` never enters the
registry, today, with no code change.

It works by accident, and `experience` is that accident already in the tree. Nothing in the Lens or the
code says that naming an attribute `definition` would silently enlist a Facet into the dictionary, so the
constraint holds only until somebody adds a Term Facet — or renames one attribute — without knowing it
exists. The failure then arrives as invented Findings that look like a corpus problem.

## Consequences

- `facetSpecSchema` gains `definesTerms`. `lensSchema` rejects a Lens whose Term Facets do not name
  exactly one.
- `buildTermRegistry` selects by Facet rather than by Kind, and reads that Facet's attribute names —
  which repairs the wrong-attribute defect in the same change.
- Both fixture Lenses declare it, so ADR-0001 is satisfied against two differently shaped corpora.
- A Corpus may now carry any number of Term Facets — aggregates, actors, whatever a Lens needs — without
  any of them disturbing the language reading. That is what made a stricter DDD Lens expressible.

**Revisit when** a corpus genuinely holds two dictionaries — most likely one per locale — where the
right answer is a defining Facet per language rather than one per Corpus.

## Erratum

**The Glossary holds 477 Facts, not the 482 stated twice above.** The figure was right when this was
written; ADR-0024 landed the same day and set five payload rows aside from that Facet. Nothing here turns
on it — 477 is the size of the dictionary the 17 screen descriptions would have been judged against.

Appended rather than corrected in place, so a figure somebody has already quoted does not change under
them. ADR-0027, which builds this decision, carries the correction and the measurements taken while
building it — including what the one-word rename actually costs, which is four invented contradictions
this text predicted without naming.

ADR-0027 also decides one thing this ADR did not reach: what a Facet of Terms must map onto now depends on
whether it is the dictionary. `name` is asked of every one of them; `definition` only of the defining one.
The paragraph above headed *Why not simply omit a definition column elsewhere* is where that question
starts — omitting the column was simultaneously the only way out of the dictionary and a thing the schema
refused.
