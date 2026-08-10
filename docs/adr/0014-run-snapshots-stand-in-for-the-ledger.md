# ADR-0014: Run snapshots stand in for the ledger, until the ledger exists

Status: Accepted. Amended by ADR-0016 — kept Seeds make a recorded reading recomputable, so the
exemption granted below is withdrawn. Read this ADR for why history is needed; read ADR-0016 for how
it is held.

Trend and "what changed" require knowing what a Corpus looked like before. The append-only ledger that
will answer this (ADR-0002) is not built: today a Corpus is assembled in memory on each run and
discarded. In its place, each run writes a **run snapshot** — a per-Module reading of presence,
well-formedness, approval, and their denominator — under `.comply/runs`.

## The tension this accepts

LAW-011 states that deleting every derived artifact and rebuilding from the Corpus must lose nothing.
Run snapshots break that. They are derived, yet **yesterday's snapshot cannot be recomputed from
today's Corpus** — the state it described is gone. Delete the directory and every baseline, trend, and
"what changed" item is lost permanently.

This is a real breach of a law, recorded rather than routed around, and it is bounded to exactly one
store.

## Why the law-abiding alternatives were rejected

**Show no history until the ledger ships.** Fully compliant, and it removes the one reading that makes
a readiness figure act on anyone. Absolutes make people disengage — every Corpus scores badly at first
— which is why the design reports trend and per-Module deltas (§12 of the design, ADR-0010). Removing
trend removes the mitigation for the product's largest adoption risk.

**Reconstruct history from the source documents' own version history.** Requires the source to be
under version control, in a shape the Adapter can read at an arbitrary past revision. No Adapter may
assume that; it privileges one corpus shape (LAW-004, ADR-0001).

**Build the ledger first.** The correct answer, and it is step 3 of the build sequence — the largest
step, deliberately sequenced after the read-only steps that can run against a real Corpus at zero
risk. Blocking a usable reading on it inverts that sequence.

## The decision

Run snapshots are the single derived store permitted to hold state that cannot be recomputed. The
permission is granted on these terms:

- **One store only.** No other derived artifact may hold unrecomputable state. This ADR is not a
  precedent to cite.
- **Losing them costs history, never knowledge.** A snapshot carries readings, never Facts. Deleting
  `.comply/runs` loses trend; it cannot lose a single piece of business knowledge, because the Corpus
  is untouched (LAW-001 holds).
- **Absence is stated, never inferred.** No baseline is distinct from no change, everywhere, always.
  A missing prior reading is reported as unknown and never rendered as zero.
- **A corrupt snapshot costs one data point.** Readers skip what they cannot parse rather than failing
  the whole history.

## How this ends

When the ledger exists, any past reading becomes recomputable by replaying Fact Versions to a point in
time. Snapshots then become a cache of a derivable thing, the exemption above lapses, and LAW-011
holds again with nothing to amend.

Snapshots are scaffolding for getting to that point — a way to put a real reading in front of real
owners while the write path is built. They are not the destination, and the Studio's read-only phase
is not either: the goal is that a Module Owner or product manager refines and approves knowledge
inside the Studio, at which point the ledger records it and snapshots stop being load-bearing.

## Consequences

- Anything the "what changed" feed must report has to be *in* a snapshot. Extending snapshots to carry
  Findings alongside per-Module readings is in scope; treating them as a general-purpose event log is
  not.
- The feed reports what changed in the Corpus. It never reports what the tooling did — "a run
  completed" is noise of the kind ADR-0012 exists to keep out of the record.
- A snapshot is an internal artifact. Its name never reaches a business-facing surface (LAW-010).
