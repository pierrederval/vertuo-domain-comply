# ADR-0023: A reference resolves the way its source resolves it

Status: Accepted. Refines ADR-0020.

The anchor a Fact answers to is computed the way the pages a reader actually reads compute one: markup
the heading carries is removed along with everything written inside it, an accented letter folds to the
letter it is built on, a letter that decomposes into nothing is kept as it stands, and every other run
of characters separates — an apostrophe included.

A Fact written down as a row of a table is reachable by its name, the same as one written down as a
heading.

## Why

ADR-0020 measured 772 broken references in the DDD Corpus and called 763 of them the reading's own
defect. The figure was low, and the nine it left standing do not exist.

Measured on the same corpus after the repair: **772 becomes 25**, with the other five kinds of Finding
unmoved — 33 empty Facets, 30 conflicting definitions, 27 missing Owners, 8 split identities, 3
unreadable documents. So 747 references stopped being reported, and none of them was ever about the
corpus.

Every one of the 25 that remain also works where a reader clicks it, for three reasons this change does
not touch and one it cannot:

| Why it is not found here | References | Where to see it |
| --- | --- | --- |
| Its document is read row by row, so its headings are nothing at all | 20 | `## États Opérationnels` — `coeur/devis/events.md:39` |
| It sits one level deeper than the level a Facet reads | 3 | `### Complétude des Lignes de Devis` — `coeur/devis/business-rules.md:76` |
| Its document is read whole, so its headings are nothing at all | 1 | `## Frontières et Relationships typées` — `coeur/chantier/index.md:111` |
| It names a page outside what the Lens was pointed at | 1 | `[Administrateur](/actors/#administrateur)` — `coeur/opportunite/index.md:86` |

The last row corrects ADR-0020 rather than adding to it, because somebody will otherwise act on what it
says. The three references it calls *the corpus reaching for actor definitions that were never written*
are written `[Commercial](/actors/#commercial)`, not `[Commercial](#commercial)`. All three are defined,
under `### Commercial`, `### Client` and `### Administrateur`. Nobody has to write anything. The Lens was
pointed at the Domains, the part of the target naming the page is dropped before the rest is judged, and
what is left is then held against a Corpus that was never asked to contain it.

The count of genuine broken references in the DDD Corpus today is therefore **zero**. That is itself the
finding worth keeping: this tool said 772 things about that corpus's references, with the full confidence
a mechanical check trades on, and not one of them was about the corpus.

## Why a row of a table is reachable, when the page it is published on gives it no anchor

A published page gives an anchor to a heading and not to a row, so this resolves a reference that page
would not. The asymmetry is deliberate and it runs one way: it lets a reference through, and it never
invents one. Nothing here can add a Finding.

Left unreachable, no check between two elements is possible at all for a corpus that keeps its Commands,
its Domain Events and its words in tables — which is every corpus shaped like this one. A reference
nobody can follow is not a stricter reading of the knowledge; it is a blind one.

The cost is named rather than discovered later: anchors are one set across the whole Corpus, so a name
resolves against a row in any Module and not only the one the link was written in. Two of the three
`/actors/` references above stopped being reported for exactly that reason — a row named *Commercial* and
a row named *Client* exist elsewhere in the corpus. Both of those references do work at their source, so
nothing true was lost. A case where something true would be lost is a reason to resolve a name within the
document that wrote it, and never a reason to put rows back out of reach.

## Consequences

- An anchor is computed where the source is read, so it is written into the Seed. A Seed taken before
  this change carries the anchors of the old rule; it is re-read and a new Seed written, and the old one
  stays exactly as it was (ADR-0012, ADR-0017, LAW-009).
- Both fixture Corpus hold the repair. `corpus-a` carries a heading with an accent and an apostrophe and
  a reference into a row of a table; `corpus-b`, laid out differently, carries the same accent and
  apostrophe in its own shape (ADR-0001).
- Nothing a reader meets gained a word for any of this. An anchor is how the reading finds what a
  reference points at, and a reader is told only that a reference resolves to nothing (LAW-010).
- The three remaining causes are not repaired here. Each is a decision about what a Facet reads, not
  about how a name becomes something a reference can find.

**Revisit when** a Facet can read both rows and headings out of one document. That removes 21 of the 25
at a stroke and is the next thing worth doing to this reading.
