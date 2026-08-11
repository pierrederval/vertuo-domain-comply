# ADR-0022: A status is declared per Fact, and its provenance beside it

Status: Accepted. Refines ADR-0006 and ADR-0012.

A Facet declares `statusAttribute` and `sourcesAttribute`. Each Fact carries its own raw status and its
own provenance, read from the source the same way any other attribute is. The adapter's document-level
`statusKey` becomes optional and is a fallback only.

The Seed format goes to version 2: `seedItemSchema` gains `status` and `sources`.

## Why

`interpret` stamped one Maturity onto every item in a document, because that is where the status was
read. Measured against the DDD Corpus:

| Status at source | Documents | Facts it stamps |
| --- | --- | --- |
| `Candidat - Dérivé du Comportement Backend Actuel` | 100 | 1331 |
| `Revu par PM` | 16 | **315** |
| `Placeholder - Non documenté` | 36 | 6 |

Review is happening — sixteen documents have been through it. What the grain does is make each of those
sixteen acts of review a claim about everything underneath it. `coeur/devis/glossary.md` is one
`Revu par PM`, and it marks **52 Terms reviewed at once**. Nobody reviewed 52 definitions; somebody
reviewed a document, and 52 Facts inherited the verdict.

The reverse is the same wall. A product manager who has genuinely checked three Commands in a document of
thirty-five has nowhere to record it, so the only move available is to sign off all thirty-five or none —
and a unit of work nobody can complete honestly is a unit of work that stalls.

## Why two attributes and not one

The corpus's existing value conflates them: `Candidate - Derived From Current Backend Behavior` is a
rung and a provenance in one string, and `statusMappings` exists precisely to undo that at the boundary
(ADR-0006, LAW-005).

Undoing a conflation is the right treatment for a corpus that already has one. Building a new convention
that needs the same treatment is not. A Fact states its rung, and states where it came from, as two
things — so `minSources` means something for the first time, corroboration can vary, and Trust stops
being constant across 1148 Facts.

Sources from the two paths are unioned rather than one overriding the other, because Sources are a set
(LAW-005) and a Fact confirmed by more is stronger than the same Fact confirmed by fewer.

## Why declared rather than inherited

A Fact that inherits its document's rung spreads one person's one sign-off across every Fact beneath it,
and no reader can tell an inherited claim from a stated one. Requiring it makes the claim explicit at
the place it is claimed, which is what LAW-009 asks of everything else in this product.

The cost is real and was accepted knowingly: 1652 Facts need a status written onto them, and the
transcription is done by a one-off script over the source, seeded from each document's current value.
That is a bulk edit to *source markdown*, not to a Corpus — LAW-002 and LAW-003 govern writes to the
Corpus, and nothing here writes to one.

## Why the document-level key survives as a fallback

Requiring per-Fact status in the core would make a corpus whose review genuinely happens a document at
a time unreadable. `corpus-b` is exactly that corpus, and it is carried in the test suite precisely so
that this kind of shape cannot leak into the core (LAW-004, ADR-0001).

Requiredness is therefore a sentence the Lens says — `requiredAttributes` naming the status attribute —
and never one the core says.

## Consequences

- `seedItemSchema` gains `status: string | null` and `sources: string[]`; `SEED_VERSION` becomes 2.
- Existing Seeds are **not** migrated. A Seed is immutable and its digest is what makes a load
  idempotent; the source is re-read and a new Seed written, and the old one stays exactly as it was
  (ADR-0012, ADR-0017, LAW-009).
- `adapterSpecSchema.statusKey` becomes optional.
- `interpret` decomposes a Fact's own status when its Facet names one, falls back to the document's, and
  unions the Sources from the mapping with those the Fact declares.
- `unknown-status` becomes a per-Fact Finding with the Fact's own origin line, which is a better citation
  than the document's line 1.

**Revisit when** a corpus arrives where per-Fact status is pure noise — every Fact in a document always
moving together — and the authoring cost buys no reading. The fallback already handles it; what would
change is which grain a new Lens reaches for first.
