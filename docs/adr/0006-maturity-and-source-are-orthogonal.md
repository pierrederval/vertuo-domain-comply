# ADR-0006: Maturity and Source are separate dimensions

Status: Accepted

A Fact carries a **Maturity** (an ordered ladder: present, well-formed, approved) and a set of
**Sources** (where the knowledge came from). They are stored separately and never encoded in a single
field.

Conflating them makes both unmeasurable. If review state and provenance share one value, neither can
be grouped independently, and coverage cannot be computed at all. This is not a theoretical concern:
it is the observed root cause of the measurement gap that motivated this product.

Sources are a set rather than a value because corroboration is real signal. A rule inferred from
code, confirmed in an interview, and stated in a document is stronger than the same rule from one
unreviewed inference, and the model must be able to say so. It also makes conflict representable —
two Sources asserting incompatible things is a Finding rather than a silent overwrite.

Consequence: any imported vocabulary that mixes the two must be decomposed at the Seed Adapter
boundary, and the decomposition is part of the import's reviewable output.

See LAW-005.
