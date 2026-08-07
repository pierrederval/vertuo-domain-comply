# ADR-0004: The Change Request is the unit of change, and there is one Door

Status: Accepted. Amended by ADR-0012 — a Seed load is not a proposal.

Knowledge enters the Corpus only as a Change Request: a proposed set of Fact Versions that Checks run
against and a human approves. All commits pass through a single write interface.

Every guarantee this product makes is enforced at that interface. A second write path does not weaken
the guarantees proportionally — it voids them, because no reader can any longer assume they held for
any given Fact.

This applies without exception to bulk edits, migrations, and administrative corrections.

It does **not** apply to loading a Seed, which is the arrival of a whole Corpus state rather than a
set of decisions. A Seed still passes through the Door, but is recorded as a single Genesis entry
rather than one Fact Version per Fact. ADR-0012 sets out why and how.

Consequence: operational work that would conventionally be a direct database fix must instead be
expressible as a Change Request. Where that is painful, the tooling around Change Requests is what
gets improved.

See LAW-001, LAW-002.
