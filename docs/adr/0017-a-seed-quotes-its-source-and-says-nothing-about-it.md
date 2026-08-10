# ADR-0017: A Seed quotes its source and says nothing about it

Status: Accepted. Refines ADR-0012, which established what a Seed *is*, by fixing what a Seed may
carry.

A **Seed** carries, for every piece of knowledge, the source text it was read from — an **excerpt** —
and carries no sentence written by this product. Two rules follow, and they are the same rule seen from
two sides.

**An excerpt is the source, exactly as written.** Never summarised, never reworded, never assembled out
of lines that are not adjacent in the source. Where a span runs longer than an excerpt carries, it is
**cut, and says that it was cut**, and the reader follows the origin for the rest.

**A Seed carries no message.** A document nothing could be read from is recorded as that fact alone.
What to tell a person about it — which Finding code, and in what words — is decided when a Lens is
applied.

## Why an excerpt at all

LAW-009 requires evidence rather than assertion. A `{file, line}` pair satisfies that for an engineer
at a terminal and fails completely for the person this product is built for: a product manager in a
browser cannot open a file. Without the source text travelling in the Seed, either every claim in the
Studio is unverifiable, or the server needs filesystem access to the original documents — which is the
one thing the Seed exists to make unnecessary.

The cost is a materially larger Seed. Accepted deliberately.

## Why an excerpt is never altered

A summary is a second-hand account of the knowledge. This product exists to find the places where two
statements about a business quietly disagree; a surface that paraphrases its own evidence manufactures
exactly that defect, and manufactures it invisibly, because the reader has no way to tell that what they
are looking at is not what the corpus says.

A cut is different in kind from a summary. It removes text without changing any of the text that
remains, and it announces itself, so the reader knows to follow the reference rather than believing they
have the whole thing. That is the same obligation LAW-006 places on a figure: name what you are not
showing.

Rejected: pulling a table's header row in beside the row an item came from. It reads far better, and it
presents two non-adjacent lines as though the source said them together. Labels belong to a Fact's
attributes, which carry them already; the excerpt stays untouched, and the two are shown side by side
rather than fused.

## Why the Seed carries no message

Extraction reporting its own Findings was the obvious design and is rejected.

A Finding's message is business-facing text, governed by LAW-010. A Seed is immutable (ADR-0012).
Putting the first inside the second means the wording a reader sees can only be improved by
re-extracting every Corpus — and every Seed already held keeps the old wording for ever, so two corpora
read at different times describe the same defect in different words. Adding a Finding code, or deciding
that something previously tolerated is now worth surfacing, has the same cost.

It also means extraction is judging after all: deciding that a document is defective is a judgment, and
the whole point of moving the line was that no judgment happens before a Lens is applied.

So the Seed records what was found and what was not — a document nothing could be read from, an absent
identity, a facet name matching nothing the Lens declares, a facet that yielded nothing — as structure.
Interpretation reads that structure and words every Finding, in the order the documents were found, so
the same defects are reported in the same order as before.

## Consequences

- `libs/comply-seed` has no field for a maturity level, a source list, a score, or a message, and a test
  holds its key set closed against exactly that.
- **A Seed is a list of documents, each holding its items — not a flat list of Facts.** The design of
  2026-08-10 names a single `SeedFact` carrying status, facet, container, origin and excerpt together.
  A flat list cannot hold a document that yielded *nothing*, and those are precisely the documents worth
  surfacing: one nothing could be read from, one with no identity, one whose facet the Lens does not
  declare. Recording the document and its items separately is what lets the Seed keep those cases
  without keeping a message. It also stops a status and an owner being repeated on every item, where two
  copies could disagree.
- Extraction consults a facet only for the extractor it names. A facet name the Lens does not declare
  yields no items and no complaint; interpretation is what calls it a defect.
- An excerpt's length limit is a property of extraction, so changing it changes future Seeds and leaves
  every Seed already held valid. The reading of an old Seed does not move.
- The cut flag travels as data, never as text. A surface says "there is more than this" in its own
  words, in the language its reader speaks.
- A Seed holds paths relative to the adapter root, so two machines extracting the same source agree on
  the digest. The absolute path a person can open is put back on during interpretation.
