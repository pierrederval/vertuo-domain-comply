# ADR-0007: Published outputs are derived, read-only, and disposable

Status: Accepted

Document snapshots, machine-readable indexes, and the agent query interface are generated from the
Corpus. They cannot be edited, and deleting all of them loses nothing.

Two writable stores of the same knowledge always diverge, and after divergence nobody can say which
is true. Knowledge bases rarely die of neglect; they die of acquiring a rival that is easier to edit.
Making outputs read-only removes the rival by construction.

Consequence: any request to "just fix it in the published copy" is a request to change the Corpus,
and is routed there. Rebuild must be cheap enough that this never feels unreasonable.

See LAW-001, LAW-011.
