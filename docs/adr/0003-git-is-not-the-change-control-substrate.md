# ADR-0003: Git is not the change-control substrate

Status: Accepted

Change control is implemented by the product, not delegated to git. Business users never encounter a
branch, a commit, a merge, or a conflict.

Git would have supplied versioning, diffing, review, rollback, and a tamper-evident audit trail for
free, and this decision gives all of that up knowingly. It is rejected anyway because the people who
hold business knowledge will not adopt a tool that lives in engineering territory, and a tool they do
not adopt is worth nothing regardless of how cheaply it was built. Adoption outranks engineering
cost here.

Two things improve as a result: concurrency becomes optimistic locking per Fact rather than textual
merge conflicts, and diffs become Fact-level and readable by a non-engineer instead of textual.

Consequence: history browsing, rollback, and a genuine backup and recovery story must be built and
budgeted. They are not free and they are not optional.

Superseded only by evidence that business users are willing to work in git — which would invalidate
the premise, not the reasoning.
