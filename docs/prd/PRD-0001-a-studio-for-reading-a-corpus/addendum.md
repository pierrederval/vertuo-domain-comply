# Addendum to PRD-0001

User-volunteered technical depth from the discovery session. Not product-reviewed, and not subject to
the PRD's product-only rule. Input to the technical spec, which is the authority:
[`docs/superpowers/specs/2026-08-10-studio-readonly-design.md`](../../superpowers/specs/2026-08-10-studio-readonly-design.md).

## The mechanism decision that shaped everything else

The command-line tool that exists today extracts knowledge from source documents **and judges it**: it
decides which rung of the maturity ladder a status value means, whether a Facet is well-formed, and
whether it is approved. That line was moved.

The runner now extracts and judges nothing. It takes source documents and writes them out in the shape
the server understands. Every interpretation — ladder, criteria, approval, Fact Kind — happens
server-side.

The reason is a product one, not a purity one: someone tightening a criterion or renaming a rung must see
the reading change **without an engineer re-running anything**. Interpretation baked into extraction makes
every criteria change a re-extraction. It also keeps the whole of the product's value in the product
rather than in a developer tool.

```
UI ──REST──► server: reads the extract, applies the per-Corpus reading rules,
                     computes Readiness + Integrity, routes Findings
                              ▲
                              │
                     the extract: knowledge as found, no judgments
                              ▲
                              │
                     runner: source ──► extract. No judgment.
```

## Decisions taken, with their reasoning

| Decision | Why |
| --- | --- |
| An extract is **immutable**. Re-reading writes a new one; the old one is untouched | Its digest is what makes re-reading idempotent and gives a load something to cite |
| One serialisation format end to end | No conversion step, stable digests, one validation idiom. Comments in the hand-authored reading rules are replaced by explicit note fields, which survive a machine rewrite and can be shown to a reader |
| Extracts carry the **source text excerpt** for each piece of knowledge | Evidence in a browser cannot be a file path and a line number — a reader cannot open it. This is what makes FR-5 possible without giving the server access to the original documents. Cost: materially larger extracts |
| A **recorded reading is a cache**, keyed by the digests of the extract and the reading rules | Recorded only when an input changes, so the re-read button cannot destroy the comparison baseline by being pressed four times a morning |
| The runner keeps a reporting command | So a build can still fail when readiness falls. It duplicates no judgment; it renders what the server computes |
| Re-reading always writes an extract, even when triggered from the Studio | One path from source to knowledge. Two paths would eventually disagree, with no way to tell which was right |
| The Studio holds **no business vocabulary of its own** | Every Facet name, ladder step, and Module name comes from the payload, so the interface cannot hardcode one Corpus's shape even by accident |
| The grid is primary, not decorative | It is the only view readable in two directions: along a row, a thin Module; down a column, a Facet nobody has started — which may mean the reading rules declare something this business does not have, deflating every figure in the product |

## Rejected architectures

**Serve the Studio from files the runner generates, containing the scores and Findings.** Simple, and it
puts every judgment in a developer tool and leaves the product as a file server. Rejected explicitly.

**Let the Studio read source documents directly, skipping the extract, for the local loop.** One less
file and faster — and now two code paths produce knowledge state, which is exactly the second entrance
the architecture forbids. Its failure mode is quiet disagreement about which reading is true.

**Build the database and the write path first.** The correct long-term order is the opposite: the
read-only phase runs against a real Corpus at zero risk and is what tells us what editing should do.

**Wait for the shared design system.** Not reachable from this repository today. A thin local component
layer is used instead, so adopting the design system later is a contained swap. Adopting a third-party UI
library instead would be a deviation that also has to be undone.

## Sequencing note

The risky slice is deliberately early: the reporting command must reproduce today's exact output when
reading an **extract** rather than source documents. If it does not, the line between extraction and
interpretation is in the wrong place, and that is cheapest to discover before any interface exists.

## Known scaffolding, and how it ends

Two things in this design are temporary and are named as such so they are not mistaken for architecture:

- **Corpus are discovered from a folder**, not a registry. It becomes a registry when the database lands;
  nothing above the API moves, because the seam is the reading rather than the storage.
- **Readings are held as files** rather than in a ledger. Because extracts are immutable and kept, any
  past reading can be recomputed from artifacts still held — which is what keeps this from becoming a
  second, rival record of knowledge.

## Vocabulary changed during discovery

Four terms were settled and are now binding in the implementation repository, with the reasoning recorded
in its constitution and decision records:

- "Application" rejected for **Corpus** — the tool measures knowledge about a business, not its software
- "Domain" rejected for **Module**
- The plural of Corpus is **Corpus**
- **Readiness** and **Integrity** are two independent readings, and neither is ever labelled "compliant"

One further rename was made for a reason that will matter to the Studio: the per-Corpus reading rules
were called a "profile", which collides with a user's account profile the moment the Studio has people in
it. Two unrelated things sharing a name is the exact defect this product detects.
