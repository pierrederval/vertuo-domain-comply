# ADR-0001: The core is domain-agnostic; corpora arrive as Profile plus Seed Adapter

Status: Accepted

The core contains no business vocabulary, no natural language, no fixed document sections, and no
review-status names. Everything specific to a body of knowledge is declared in a **Profile** (how to
interpret a corpus) and implemented in a **Seed Adapter** (how to import one).

A tool shaped around its first corpus can serve only that corpus, and the shaping stays invisible
until a second corpus arrives and does not fit. By then the assumptions are load-bearing and the
rewrite is total. Naming the seam up front costs one indirection; discovering it later costs the
product.

The first corpus imported is a pilot and carries no special status. Its facet names, its status
vocabulary, and its language are Profile data, not code.

Consequence: every feature must be demonstrable against at least two differently-shaped corpora
before it is considered done. A fixture corpus that deliberately differs in shape is part of the test
suite, not an optional extra.

See LAW-004.
