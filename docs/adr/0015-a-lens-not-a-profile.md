# ADR-0015: The declaration of how a Corpus is read is a Lens, not a Profile

Status: Accepted. Amends LAW-004, which named this thing a Profile.

Everything specific to one body of knowledge — its Facets, its Maturity ladder, its locale and
word-formation rules, its well-formedness criteria — arrives at runtime in a single declaration. That
declaration is now called a **Lens**. Only the word changes. Every requirement of LAW-004 and ADR-0001
stands exactly as written.

## Why the old word had to go

**It will collide with users.** The Studio has people in it, and a person's profile is their account.
Two unrelated things called "profile" in the product whose job is detecting one thing known by two
names is a split identity in its own vocabulary — the failure it ships a Check for.

**It described the wrong property.** "Profile" says *configuration lives here*. "Lens" says what the
thing does: the same Corpus read through a different Lens yields different Facets, a different ladder,
different criteria. The metaphor also carries the law — a lens shapes what a reader sees and holds no
knowledge of its own, which is precisely why no business vocabulary may sit anywhere else.

## Alternatives rejected

**Keep Profile.** Free. The word is engineer-facing, so LAW-010 does not forbid it. Rejected because
the collision arrives the day the Studio gets a login, and the rename only gets more expensive: the
term is load-bearing in a law, in the package graph, and in every artifact key.

**Charter.** Captures the agreement half well — §9 of the design requires criteria be confirmed with a
Corpus's owners before any score is published. Rejected for underselling the other half: a charter
does not obviously declare a locale or word-formation rules, and those are half of what the file holds.

**Dialect.** Right for the locale, Facets, and vocabulary; wrong for the criteria. A dialect does not
declare what "well-formed" means.

## Consequences

- `libs/comply-profile` becomes `libs/comply-lens`; `profileSchema`, `loadProfile`, and the `Profile`
  type are renamed with it. Mechanical, and cheapest before the Studio and the ledger exist.
- `Snapshot.profileId` becomes `lensId`. Snapshots already written on disk carry the old key, so a
  reader tolerates both for one transition — an unreadable prior snapshot costs a trend baseline, and
  ADR-0014 permits losing exactly that and nothing more.
- Documents predating this decision — ADR-0001, ADR-0006, ADR-0013, the design at
  `docs/superpowers/specs/2026-08-07-ddd-comply-design.md`, and the implementation plan beside it —
  keep the word Profile. An accepted record is amended by a new record, never edited to match current
  practice. Read Profile as Lens in all of them.
