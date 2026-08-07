# ADR-0005: Five Fact Kinds, and the set is closed

Status: Accepted

A Fact is one of: **Module**, **Term**, **Rule**, **Message**, **Transition**. No sixth kind is added
without amending this decision.

Larger ontologies fragment. Once contributors disagree about which bucket a thing belongs in, the
same knowledge lands in different places in different modules, and the corpus develops exactly the
inconsistency the product exists to detect. Small closed sets survive contributor turnover; large
open ones do not.

Pressure to add kinds will be constant and will usually be legitimate in the small. It is absorbed in
the Profile — through facets, attributes, and well-formedness criteria — rather than in the core
model. That is what the Profile is for.

Consequence: when something genuinely does not fit one of the five, the first question is whether the
Profile can carry it, and only then whether the model is wrong.
