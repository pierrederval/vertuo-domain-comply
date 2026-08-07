# ADR-0011: TypeScript, PostgreSQL, React, shared design system

Status: Accepted

TypeScript throughout. PostgreSQL for the ledger. React for the interface, consuming the shared
design system and API contract packages rather than defining a local visual language.

These match the surrounding engineering estate, which matters more than any property of the
technologies themselves: the people who will maintain this already know them, and the append-only
ledger discipline is already practised nearby.

Consequence: the interface inherits shared conventions and must not introduce page-specific colour or
component systems. Where the shared system lacks something, it is extended there rather than forked
here.
