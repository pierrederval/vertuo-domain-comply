# ADR-0010: Every Module has a named Owner and every Finding routes to one

Status: Accepted

Each Module records a named accountable person. Every Finding and every unmet readiness criterion
reaches that person's queue. A Module without an Owner is a validation error, not a tolerated gap.

Continuous-compliance tooling works because a person answers for each failing control. Remove the
person and the score becomes ambient information, which is ignored within weeks. This is the
documented failure mode of knowledge bases generally, and the single most likely way this product
dies.

Capturing owners is therefore a prerequisite of the first release, not a later refinement. A readiness
score shipped without owners is a dashboard.

Consequence: scores are reported per Module with a trend, never as one organisation-wide number. A
global figure routes to nobody and motivates no one.

See LAW-007.
