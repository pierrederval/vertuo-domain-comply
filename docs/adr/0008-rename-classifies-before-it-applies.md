# ADR-0008: Rename classifies every occurrence before applying any

Status: Accepted

Renaming a Term proceeds in three steps: classify each Occurrence as **certain** or **ambiguous**,
preview the full consequence, then apply. Ambiguous Occurrences are never applied automatically.

Natural language does not tolerate find-and-replace. Inflection, elision, agreement, casing, and
terms embedded inside other terms all produce sites that look like matches and are not. A tool that
silently corrupts prose is worse than no tool, because the damage surfaces long after the change and
cannot be attributed to it.

The conservative bias is deliberate: classifying a genuinely safe site as ambiguous costs a human a
moment, while the reverse costs the corpus its credibility.

Consequence: word-formation rules are locale-specific and therefore belong to the Profile, not the
core. Supporting a new language means supplying rules, not changing the engine.

See LAW-008.
