# ADR-0019: Well-formedness criteria belong to a Facet, not to a Fact Kind

Status: Accepted. Refines ADR-0005.

A Lens declared its well-formedness criteria as a map keyed by Fact Kind:

```json
"criteria": { "Module": [...], "Term": [...], "Rule": [...] }
```

Every Facet of a Kind was therefore judged by the same criteria, and there was no way to say otherwise.

## Why that is wrong

There are five Fact Kinds and the set is closed (ADR-0005). A corpus routinely has more Facets than
Kinds, and the extra Facets are not redundant — they are different things that happen to share a Kind.

A domain-driven corpus makes this immediate. Commands and Events are both **Messages**: one is a
request that something happen, the other a statement that something has happened. An Event needs a
meaning and the Rule it came from. A Command needs an actor and an effect. Keyed by Kind, either both
are asked for both, or neither is asked for anything — and the reading loses the distinction that made
the two worth writing down separately.

The same applies wherever a corpus splits a Kind: business rules and invariants are both Rules, a
glossary and a list of aggregates are both Terms.

ADR-0005 already committed to the answer. It says pressure to add Kinds "is absorbed in the Profile —
through facets, attributes, and well-formedness criteria". Criteria that cannot vary per Facet absorb
only part of that pressure, and the remainder comes back as pressure for a sixth Kind — which is the
thing ADR-0005 exists to refuse. Keying criteria by Facet is what makes that refusal affordable.

## The decision

**A Facet declares its own criteria.** The Fact-Kind-keyed map is removed.

```json
{ "name": "events", "factKind": "Message", "extractor": "table",
  "criteria": [{ "type": "requiredAttributes", "attributes": ["name", "definition", "rule"] }] }
```

The Kind still decides what a Fact *is* and which core reading applies to it. It no longer decides what
counts as enough.

## Why the map is removed rather than kept as a default

Keeping it would allow a Kind-level baseline that a Facet extends or overrides. That is two ways to say
one thing, and a precedence rule — does a Facet's list replace the Kind's or add to it? — that has to
be explained to every person who ever hand-authors a Lens, and got right by every one of them.

A Lens is hand-authored. That is exactly where the cost of a second mechanism lands hardest, and a
misread precedence rule is silent: the reading is simply wrong, and looks fine.

The duplication this costs is small at the sizes in hand — a DDD Lens has seven Facets over five Kinds.
When a corpus arrives with enough Facets of one Kind for duplication to hurt, inheritance can be added
then, by somebody who can see the real shape it has to serve. Adding it now would be designing for a
corpus nobody has.

## Consequences

- `evaluateFact(fact, lens)` selects criteria by `fact.facet` rather than `fact.kind`. A `Fact` already
  carries its Facet, so nothing new is threaded through the core.
- `evaluateFacet` takes a Facet name rather than a Fact Kind.
- Every existing Lens is migrated. The change is mechanical: each entry in the old map moves onto the
  Facets that declare that Kind.
- A Lens can now describe a corpus that splits a Kind, which is what made a real DDD Corpus expressible
  at all.
- ADR-0005 is unamended and stronger: the first question when something does not fit one of the five
  Kinds is still whether the Lens can carry it, and the Lens can now carry more.

**Revisit when** a real corpus has enough Facets of one Kind that repeating their criteria is a source
of drift. The fix then is inheritance, and a Facet's shape does not have to change to gain it.
