# Domain Model

Six bounded contexts. Four are core — they are where this product's value is created. Two are
supporting: necessary, replaceable, and deliberately kept at the edges.

```
   INGESTION ──proposes──►  CHANGE CONTROL  ──commits via the Door──►  CORPUS
  (supporting)                    ▲                                      │
                                  │                                      │ read
                            consumes Findings                            ▼
                                  │                          ┌───────────┴───────────┐
                                  └──────────────────────────┤  READINESS            │
                                                             │  LANGUAGE INTEGRITY   │
                                                             └───────────┬───────────┘
                                                                         │
                                                                    PUBLICATION
                                                                    (supporting)
```

## Core contexts

### Corpus

*Holds the record.*

Owns Facts, Fact Versions, and the Door. Enforces append-only history and refuses every write that
did not arrive through a committed Change Request. Knows nothing about what the Facts mean.

This context is deliberately dumb. Meaning lives elsewhere; permanence lives here.

### Change Control

*Governs how knowledge changes.*

Owns Change Requests, the execution of Checks against them, review, approval, and the work queue that
routes Findings to Module Owners. It is the only context that writes to the Corpus.

It is also where the product's business promise lives: knowledge cannot change without a proposal, a
check, and a human.

### Readiness

*Answers "is this good enough?"*

Computes presence, well-formedness, and approval per Module and Facet, and assembles the Readiness
Matrix and its trend. Reads the Corpus; writes nothing.

Well-formedness criteria are supplied by the Profile, never built in.

### Language Integrity

*Answers "does the language hold together?"*

Owns the Term registry, the Occurrence index, and the integrity Checks — broken references,
conflicting definitions, orphan and unknown terms, split identities. Owns Rename: classify, preview,
apply.

This is the context most exposed to natural language, and therefore the one most bound by LAW-008.

## Supporting contexts

### Ingestion

*Brings knowledge in.*

Owns Profiles and Seed Adapters. Translates bidirectionally between an external shape and a Seed —
a portable serialisation of a whole Corpus.

A Seed load is not a proposal. It passes through the Door, but as the `Load` operation, recorded as a
single Genesis entry rather than one Fact Version per Fact (ADR-0012). Loading is atomic, idempotent
by digest, and refused against a diverged Corpus unless explicitly forced.

Every business-specific assumption in the system is confined to this context.

### Publication

*Sends knowledge out.*

Owns the derived artifacts: document snapshots, machine-readable indexes, and the query interface
agents use. Also owns Gap logging — recording every query that found nothing or found only low-Trust
Facts, which becomes a demand-ranked backlog.

Everything here is disposable and rebuildable (LAW-011).

## Relationships

| From | To | Nature |
| --- | --- | --- |
| Ingestion | Change Control | Submits Seeds to the Door's `Load` operation; no special privileges for any Adapter |
| Change Control | Corpus | Sole writer, through the Door |
| Readiness | Corpus | Read-only consumer |
| Language Integrity | Corpus | Read-only consumer |
| Readiness, Language Integrity | Change Control | Emit Findings into the work queue |
| Publication | Corpus | Read-only consumer |

## Why the model is this small

Five Fact Kinds and six contexts is a deliberate constraint. An ontology large enough that
contributors disagree about which bucket a thing belongs in is an ontology that fragments, and a
fragmented model produces exactly the disagreement this product exists to detect.

Growth pressure will be constant. It should be resisted at the Fact Kind level and absorbed in the
Profile instead — that is what the Profile is for.
