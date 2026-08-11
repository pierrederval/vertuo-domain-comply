# ADR-0024: A Facet says which tables are its own

Status: Accepted. Refines ADR-0019 and ADR-0020.

A Facet that reads rows may name `identifyingColumns` — the column headers a table has to carry to be one
of its own. A table without them contributes nothing and is reported as nothing, because it is not this
Facet's table, which is not the same as being an empty one.

Three things about how it decides:

- It is settled at the header row, once, and never re-opened by a row's own contents. A row that happens
  to be filled in cannot argue its way into a table that was set aside.
- Only the headers that identify the table are named, never all of them. A corpus spells the same column
  several ways, and a declaration listing the whole header row refuses a table the moment one word of it
  moves.
- It is decided here and never by `criteria`, so tightening what counts as enough can never change how
  many things there are, and two readings of one Corpus stay comparable (ADR-0016).

A Facet that names none reads every table it finds, which is what every Facet did before this could be
said. A Facet that reads no rows and names some is refused at load: ignored, the declaration reads as
though it were in force, and whoever wrote it is looking at a count that includes everything they wrote it
to leave out.

## Why

ADR-0020 named this gap and measured one instance of it: an events document carries the Facet's table and
a second one headed `Domain Event | Payload (attribut : signification)`, sharing only the first column, so
81 of 279 Domain Events were payload rows carrying a name and almost nothing else.

Measured across every table in the DDD Corpus, it is **six tables and 107 rows**, not one and 81:

| The table set aside | Facet | Rows | Where to see it |
| --- | --- | --- | --- |
| `Domain Event \| Payload (attribut : signification)` | events | 81 | 4 documents, e.g. `coeur/devis/events.md:51` |
| `Command \| Payload \| Erreurs métier` | commands | 13 | `coeur/opportunite/commands.md:55` |
| `Terme \| Ce qu'il désignait \| Pourquoi il est obsolète` | glossary | 5 | `coeur/devis/glossary.md:112` |
| `Opération \| Description \| Règles Appliquées \| Domain Events` | workflows | 4 | `coeur/opportunite/workflows.md:47` |
| `État \| Signification \| Attributs` | events | 3 | `coeur/devis/events.md:43` |
| `Comportement \| Déclenchement \| Règles Principales \| …` | commands | 1 | `coeur/opportunite/commands.md:47` |

None of it is a defect in the corpus. A payload belongs next to the Domain Event it belongs to; a word the
business retired belongs next to the words it still uses. Each was read as this Facet's own because the
reading had no way to tell one table from another, and each row then failed a criterion it was never meant
to be held to — landing in a Module Owner's queue as work that cannot be done (LAW-007).

| Facet | Facts before | Facts after |
| --- | --- | --- |
| glossary | 482 | **477** |
| commands | 259 | **245** |
| events | 279 | **195** |
| workflows | 238 | **234** |
| business-rules | 222 | 222 |
| state-machines | 135 | 135 |
| overview | 20 | 20 |
| experience | 17 | 17 |
| **total** | **1652** | **1545** |

Every Finding count is unchanged — 33 empty Facets, 30 conflicting definitions, 27 missing Owners, 25
broken references, 8 split identities, 3 unreadable documents — which is the check that this moved what
counts as an item and nothing else. On the Readiness Matrix, cells reading *present but not well-formed*
fall from **9 to 2**: `chantier`, `devis`, `facturation` and `opportunite` on events, `devis` on glossary,
and `opportunite` on both commands and workflows all become well-formed, because in every one of those
cells the shortfall was the reading's own.

ADR-0020 expected events to fall to 198. It falls to **195**, because a third table — `État |
Signification | Attributs` — was also being read, on the strength of one shared header.

## What this does not repair, deliberately

- **A step spelled a fourth way is now set aside rather than failing.** `coeur/opportunite/workflows.md`
  heads its step column `Opération` where every other workflow document heads it `Étape`. Those four rows
  used to be read and to fail; now they are not read at all. That is the better of two wrong answers and
  it is still a wrong answer: the corpus using the word it uses everywhere else recovers them, and so
  would a declaration that could name alternatives. Neither is done here.
- **`state-machines` names nothing**, because its own tables already separate correctly: the twelve shapes
  headed `État | Signal backend | Signification` and the rest contribute nothing today, since none of
  their headers is mapped. What remains wrong there is a spelling, not a table — 18 transitions head their
  guard column `Gardien` or `Garde (appliquée par le backend)`, so they are read with a name and no guard.
  That is a column mapping and belongs with one.
- **The reading does not yet say how many tables it set aside.** *(Built in ADR-0025: the reading now
  states 1506 read of 1652 found, 146 set aside — these 107 rows and 39 headings.)* Six tables leaving
  107 rows behind is a
  reading a person should be told about, and LAW-006 asks that nothing be silently excluded. There is no
  channel for it: saying so per document means a Seed that records it, and the Seed's next version is
  already spoken for (ADR-0022). #41 carries the same obligation for headings and will build the one
  channel both need. Until then this ADR is where the 107 are written down.

## Consequences

- `facetSpecSchema` gains `identifyingColumns`. `lensSchema` refuses it on a Facet that reads no rows.
- `lens-a.json` declares it, and `corpus-a` gained a second table headed differently in one document, so
  both directions are held against a corpus that is not the DDD one — a Facet that names its columns reads
  two rows, and a Facet that names none reads three (ADR-0001).
- `lenses/vertuo-domain-fr.json` declares it on glossary, commands, events and workflows.
- A Seed taken before this change holds the rows this reading now leaves out. It is re-read and a new Seed
  written; the old one stays exactly as it was (ADR-0012, ADR-0017).
- Nothing a reader meets gained a word for any of this. Which tables belong to a Facet is a sentence the
  Lens says, and the core says nothing about it (LAW-004, LAW-010).

**Revisit when** a corpus needs alternatives — one Facet whose table is legitimately headed two ways, as
`workflows` and `state-machines` both now suggest. The declaration takes a list of headers all of which
must be present; the shape that answers this is a list of such lists, any one of which does.
