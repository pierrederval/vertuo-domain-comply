# ADR-0013: Technical stack

Status: Accepted. Supersedes ADR-0011.

ADR-0011 named four technologies and was decided by resemblance to neighbouring repositories rather
than by argument. This decision replaces it and covers the parts it left silent: runtime, repository
shape, database access, validation, HTTP, migrations, and deployment.

## The stack

| Concern | Choice |
| --- | --- |
| Language | TypeScript, `strict` and `noUncheckedIndexedAccess` |
| Runtime | Node 24 |
| Execution | `tsx` |
| Packages | pnpm 10, workspaces over `apps/*` and `libs/*` |
| Build orchestration | Turborepo |
| Database | PostgreSQL |
| Database access | Kysely, confined to a single `libs/system-db` package |
| Migrations | Kysely's migrator, run as a role separate from the application role |
| Validation and contracts | Zod |
| HTTP | Fastify with `fastify-type-provider-zod` |
| Interface | React 19, Vite, React Router, the shared design-system package |
| Tests | Vitest |
| Deployment | Docker |

## Database access: why a query builder, and why not an ORM

The ledger needs roughly ten statements: append a Genesis row, bulk-insert Fact Versions for a load,
insert a Change Request and its items, append Fact Versions on commit, select current state as the
latest version per Fact, read one Fact's history, read the latest Genesis, and list Change Requests.

Counting only those suggests raw SQL is sufficient. That count is wrong, because **the ledger is not
the schema.** Around it sit ordinary mutable records: a corpus registry, Profiles, actors, Module
Owner assignments, Change Request status, check results, finding suppressions with owners and
expiries, gap logs, and run snapshots. Those are conventional CRUD, and hand-written SQL across a
dozen such tables accumulates exactly the drift and duplication a query builder exists to prevent.

One access layer for the whole database is preferable to two idioms for two halves of it.

Kysely rather than an ORM because it is SQL with types: no change tracking, no identity map, no lazy
loading, no entity lifecycle. What is written is what runs.

## Enforcing append-only at the database, not by convention

A query builder can express `UPDATE` against the ledger. Avoiding the tool to prevent the statement
would be enforcement by discipline, which fails the first time someone is in a hurry.

LAW-003 is therefore enforced by PostgreSQL:

- The application role is granted `SELECT` and `INSERT` on ledger tables and **no `UPDATE` or
  `DELETE`**.
- A trigger on each ledger table raises on `UPDATE` and `DELETE`, so the guarantee survives a
  mis-granted role.
- Migrations run under a separate role that owns the schema; the application never holds DDL rights.

The law becomes structurally true rather than conventionally true, and it stops depending on which
library is in use.

## HTTP: Fastify rather than NestJS

The shared API contract package is Zod-based and framework-agnostic — no decorators, no
`reflect-metadata`, no framework coupling. The strongest argument for NestJS was that the existing
studio API uses it and the contract would slot in natively; the contract slots into anything, so that
argument does not hold.

At roughly twenty endpoints and six bounded contexts that map cleanly onto plain modules, NestJS's
dependency injection and module system are ceremony without a matching problem.
`fastify-type-provider-zod` gives end-to-end typed request and response validation from the same Zod
schemas the contract package already uses.

**Revisit when** the API passes roughly forty endpoints or acquires substantial cross-cutting
concerns. At that size NestJS's structure begins to pay for itself.

## Repository shape

A pnpm workspace with Turborepo from the first commit, rather than a single package split later.

One library per bounded context, so the boundaries in the domain model are enforced by the package
graph rather than by intention. A library that needs to import from a context it should not depend on
fails to resolve, which is a better guard than a review comment.

## Consequences

- `libs/system-db` is the only package that may import Kysely or open a connection. Any other package
  reaching the database directly is a defect.
- Ledger tables need integration tests that run against real PostgreSQL, including tests asserting
  that `UPDATE` and `DELETE` are rejected.
- Zod schemas are the single definition of a shape, shared between validation, HTTP types, and
  Profile parsing. A hand-written type where a Zod schema exists is duplication.
