# ADR-0004: The Change Request is the unit of change, and there is one Door

Status: Accepted

Knowledge enters the Corpus only as a Change Request: a proposed set of Fact Versions that Checks run
against and a human approves. All commits pass through a single write interface.

Every guarantee this product makes is enforced at that interface. A second write path does not weaken
the guarantees proportionally — it voids them, because no reader can any longer assume they held for
any given Fact.

This applies without exception to imports, bulk edits, migrations, and administrative corrections. An
import is a proposal like any other.

Consequence: operational work that would conventionally be a direct database fix must instead be
expressible as a Change Request. Where that is painful, the tooling around Change Requests is what
gets improved.

See LAW-001, LAW-002.
