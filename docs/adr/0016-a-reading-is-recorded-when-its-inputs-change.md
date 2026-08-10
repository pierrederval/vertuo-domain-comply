# ADR-0016: A recorded reading is a cache, keyed by the Seed and the Lens that produced it

Status: Accepted. Amends ADR-0014, which granted run snapshots an exemption from LAW-011. The
exemption is withdrawn.

A reading of a Corpus — every Module's presence, well-formedness, approval, its denominator, and the
Findings against it — is a pure function of two inputs: the **Seed** that was loaded and the **Lens**
it was read through. Identical inputs produce an identical reading.

Therefore a reading is **recorded when, and only when, one of its inputs changes**, and a recorded
reading names the digest of both.

## What this fixes

ADR-0014 accepted a breach of LAW-011: run snapshots held history that could not be recomputed, so
deleting them lost something permanently. That premise no longer holds. Every load now passes through
a **written, immutable Seed**, and Seeds are kept. Given the Seed and the Lens, any past reading can be
recomputed exactly — so snapshots hold nothing unique. They are a cache of a derivable value, which is
what LAW-011 permits.

The remaining hole was the Lens: a hand-authored file that changed in place, leaving "which criteria
were in force last Tuesday" unrecoverable. It is closed by holding Lens versions under the same
discipline as Seeds — a recorded reading either cites a retained Lens version by digest, or carries the
Lens content itself.

## Why recording on every load was rejected

The Studio offers a button that re-reads the source. Someone will press it four times in a morning.
With a snapshot per load, "the previous reading" becomes *twenty minutes ago*, every delta reads zero,
and the trend column stops meaning anything — while the genuinely useful baseline from last week sits
buried under a hundred files. ADR-0010 makes trend the mechanism by which a figure routes to a person
and moves; a trend that always reads zero removes it.

Deduplicating by input digest makes the trend statement precise instead: **what changed since the last
time either the knowledge or the criteria changed.** A load whose Seed digest already matches records
nothing, which is the same idempotence ADR-0012 requires of loading itself.

## Consequences

- Reading is free and unrecorded. The server computes a reading on request; only a change of input
  writes one down. There is no "take a reading" action, because there is nothing for a person to
  decide.
- A reading changes when criteria are tightened, not only when knowledge is written. That is correct
  and must be visible: a drop caused by a stricter Lens is not a regression in the Corpus, and a
  reading that cannot distinguish the two would be read as one.
- Seeds and Lens versions accumulate. They are prunable. Pruning costs the ability to recompute
  readings from before the pruned point, and can never cost a Fact — the Corpus is the record
  (LAW-001).
- Absence still reports as absence. No baseline remains distinct from no change, everywhere.
- When the ledger lands, it supersedes the Seed shelf as the substrate for history. Nothing in this
  decision needs revisiting then: a reading stays a cache keyed by its inputs.
