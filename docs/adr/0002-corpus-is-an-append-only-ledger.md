# ADR-0002: The Corpus is an append-only ledger

Status: Accepted

Facts are stored as immutable versions. Corrections append a new version; withdrawals append a
reversal. Nothing is updated in place and nothing is deleted.

The product's value is the ability to say what was believed, when, on what evidence, and who agreed
to it. In-place mutation destroys precisely that, and destroys it silently — the loss is invisible
until someone needs the history and finds it gone.

Consequence: reads go through derived projections rather than the ledger directly, and those
projections must be rebuildable from scratch. Storage grows monotonically, which is acceptable at the
scale of a knowledge corpus and is not to be optimised away by adding mutation.

See LAW-003.
