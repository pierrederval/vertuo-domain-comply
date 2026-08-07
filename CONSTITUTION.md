# Constitution

These are the laws of this product. They are not preferences and they are not style. Each one exists
because breaking it has a known, specific failure mode — in most cases a failure mode that has
already been observed in a real knowledge base.

A change that violates a law is not merged. If a law is wrong, amend the law first, in its own
change, with the reasoning recorded. Never route around one silently.

Each law states what must hold, why it exists, and how you can tell it has been broken.

---

## LAW-001 — The corpus is the only record

The corpus is the single authoritative store of business knowledge. Every other artifact — markdown,
JSON, diagrams, indexes, search embeddings, MCP responses — is derived, regenerable, and read-only.

**Why.** Two writable stores of the same knowledge always diverge, and once they diverge nobody can
say which is true. Knowledge bases do not usually die of neglect; they die of having a rival.

**Broken when.** Any published artifact can be edited and the edit survives. Any process writes
knowledge somewhere other than through the corpus door.

---

## LAW-002 — One door

All writes to the corpus pass through a single write interface. There is no second path — no direct
database access, no bulk script, no admin backdoor, no "just this once" migration that bypasses the
checks.

**Why.** Every guarantee in this document is enforced at the door. A second entrance does not weaken
the guarantees by half; it removes them, because no reader can any longer assume they held.

**Broken when.** A row appears in the ledger that no operation of the Door produced.

**Scope note.** The Door governs *which path may write*, not *at what granularity a write is
recorded*. It accepts two operations: proposing a Change Request, which records one Fact Version per
changed Fact, and loading a Seed, which records exactly one Genesis entry for the whole Corpus. Both
pass through the Door. Neither is a second path. See ADR-0012.

---

## LAW-003 — Append-only

Facts are never updated in place and never deleted. A correction appends a new version. A withdrawal
appends a reversal. History is immutable.

**Why.** The audit trail is the product's core value: knowing what was believed, when, on what
evidence, and who approved it. In-place mutation destroys exactly that.

**Broken when.** Any `UPDATE` or `DELETE` touches a fact-version row.

---

## LAW-004 — The core knows no business

No business vocabulary, no natural language, no corpus convention, and no organisational structure is
hardcoded in the core. Everything specific to a body of knowledge arrives at runtime through a
**Profile** (how to interpret a corpus) and a **Seed Adapter** (how to import one).

Any corpus is a pilot. None is privileged. A term, a section name, a review status, a locale, or a
directory layout appearing in core source is a defect.

**Why.** A tool shaped around one corpus can only ever serve that corpus, and the shaping is
invisible until the second corpus arrives and does not fit. By then the assumptions are load-bearing.

**Broken when.** Core source contains a business term, a language-specific string, a fixed list of
document sections, or a hardcoded review-status vocabulary.

---

## LAW-005 — Maturity and source are orthogonal

How reviewed a fact is, and where it came from, are two independent dimensions. Maturity is an
ordered ladder. Sources are a set — a fact may have several, and having several is meaningful.
They are never stored in one field and never conflated in one vocabulary.

**Why.** Conflating them makes both unmeasurable: you cannot group by review state without also
grouping by provenance, so coverage cannot be computed at all. This is not hypothetical — it is the
observed root cause of the measurement gap this product was built to close.

**Broken when.** A single field encodes both, or a maturity level implies a source.

---

## LAW-006 — Never claim completeness

Coverage is always reported against a stated denominator, and the denominator is always named. The
knowledge that nobody has written down anywhere is unmeasurable; it is estimated and displayed as an
explicit unknown band, never silently excluded.

**Why.** A score that reads 100% while the corpus is missing whole areas of the business destroys
trust in every other number the tool produces. One overclaim is enough.

**Broken when.** Any surface shows a coverage figure without its denominator, or implies that a full
score means nothing is missing.

---

## LAW-007 — Every finding routes to a person

A score, a gap, or a violation that belongs to nobody is a dashboard. Every module has a named owner,
and every finding reaches that owner's queue.

**Why.** Compliance tooling works because a person is accountable for each failing control. Remove
the person and the score decays until it is ignored, which is how knowledge bases quietly die.

**Broken when.** A finding exists with no owner, or a module exists with no named owner.

---

## LAW-008 — Ambiguity escalates, never resolves itself

Any automated change classifies each site it would touch as **certain** or **ambiguous**. Certain
sites may be applied automatically. Ambiguous sites are always escalated to a human. The system never
guesses on a write.

**Why.** A tool that silently corrupts prose is worse than no tool, because the corruption is
discovered long after the change and cannot be attributed. Natural language does not tolerate
find-and-replace.

**Broken when.** Any write path applies a change to a site it could not classify as certain.

---

## LAW-009 — Evidence, not assertion

Every fact carries its provenance. Every finding cites the exact location that produced it. Nothing
is reported that a reader cannot go and verify at its source.

**Why.** Reviewers who cannot check a claim eventually stop reading claims. Verifiability is what
makes review real rather than ceremonial.

**Broken when.** A finding or fact is displayed without a source reference a human can follow.

---

## LAW-010 — Business language at the surface

No compiler, schema, repository, or infrastructure vocabulary reaches a business user. Not in labels,
not in errors, not in empty states, not in URLs they see. Internal names for internal audiences;
business names for business audiences.

**Why.** This product only pays off if the people who hold the knowledge use it directly. Every piece
of engineering vocabulary in the interface hands the work back to engineers, which is the situation
it exists to end.

**Broken when.** A business-facing surface says *commit*, *branch*, *schema*, *parse*, *index*,
*repository*, *migration*, or *null*.

---

## LAW-011 — Derived artifacts are disposable

Deleting every derived artifact and rebuilding from the corpus must lose nothing. No derived store
holds state that cannot be recomputed.

**Why.** This is what keeps LAW-001 true over time. The moment a derived index holds something
unique, it has quietly become a second record.

**Broken when.** A rebuild from the corpus produces a different result than the store it replaced.
