# ADR-0034: A reading is never compared against itself, and the Door's second operation is one function

Status: Accepted. Builds §5.5 of `docs/superpowers/specs/2026-08-10-studio-readonly-design.md`, the last
slice of the read-only phase. Refines ADR-0016 on which reading a trend is stated against; uses ADR-0012's
idempotence and ADR-0032's holding order unchanged. Corrects one figure in ADR-0033. The spec, LAW-002 and
ADR-0012 are not modified.

The Studio gained an action that reads a Corpus's source again. Writing it turned up something that had
been true of every Corpus in the product since ADR-0016 landed, and had been invisible because nothing
until now made a person look at a trend twice.

## 1. A reading is never compared against itself

`earlierReading(dir, lensId, inHand)` replaces `lastRecordedReading(dir, lensId)`. It hands back the most
recent reading on record whose two input digests are not both the ones in hand.

The defect it closes was measured before it was fixed, on every shelf that exists:

| Shelf | Modules | What each said | Was that a comparison? |
| --- | --- | --- | --- |
| `corpus-a` | 3 | held steady | no |
| `corpus-b` | 2 | held steady | no |
| `vertuo-domain-fr` | 28 | held steady | no |

**33 of 33 Modules reported *held steady*, and not one of them was compared with anything.** A reading goes
on record the moment either input changes (§6), so the most recent one on any shelf is a reading of exactly
the knowledge in hand under exactly the criteria in hand. Handed that as a baseline, `trend` finds the same
figures — because they are the same figures — and reports a delta of nothing. Every change feed said
*nothing about the knowledge has moved*, on three corpora, one of which had been rewritten repeatedly.

*No baseline* and *no change* are different facts a reader acts on differently, and LAW-006 exists to keep
them apart. This was the one place they were fused, and the fusion was structural rather than a value
somebody forgot to check: the product could not have reported movement on any Corpus, however much the
knowledge moved, for as long as the runner recorded a reading of what it had just written down.

After the change the same 33 Modules say *there is no earlier reading to compare this one with*, which is
true. The first press of the action that changes anything is the first real comparison the product has ever
stated.

Both inputs have to match for a reading to be the one in hand. Passing over every reading of this
*knowledge* was considered and rejected: criteria tightened over unchanged documents would then reach past
the one reading worth comparing with, and answer *no earlier reading* on the morning somebody raised the
bar — which is a second, quieter way of declining to say the bar moved (§6, ADR-0016).

`lastRecordedReading` is deleted rather than left beside the new function. Its whole use was the defect, and
a function whose name reads as the obvious choice is a trap for whoever writes the next caller.

### What this does not change

`trend` and `whatChanged` are untouched. Both were already pure functions of two readings, and both were
already right — they were being handed the wrong second argument. The fix is in what a caller asks the shelf
for, which is where the meaning of *the reading this is stated against* belongs.

## 2. The Door's second operation is one function, and both callers call it

`readTheSourceAgain(shelf, lens, takenAt)` in `libs/comply-door` writes down what is at source, reads it
back, interprets it, holds the criteria and records the reading. The runner calls it. The server's
`POST /corpus/:id/reads` calls it. There is no second copy of the sequence.

LAW-002 says the Door has exactly two operations, and until now neither was written down as one: the runner
performed this one inline in `reportCommand` and nothing else performed it at all. A button meant a second
performer, and two performances of a five-step sequence whose order is load-bearing is how the runner's
answer and the button's answer come to differ about which reading is true — the quiet failure LAW-002 names.

The order is the part worth having in one place. The criteria are held **before** the reading is recorded,
always, so no reading on record can cite criteria the shelf does not have (ADR-0032). Tested as the property
rather than as a call order, because the property is what a person reading a moved figure next Tuesday
depends on.

A new package rather than a home in an existing one. `comply-reading` was the near miss and is refused: this
writes, and a write path inside the library named for reading is a thing the next person will not look for.
It also takes over `Shelf` and `shelfAt`, which the runner and the server had been spelling separately — the
server knew `seeds` and `runs` and had never heard of `lens-versions`, which it now needs.

The workspace goes from 22 test tasks to 24 and from 13 typechecked packages to 14. The surface guard's
verdict goes from 93 files in 13 places to 97 in 14.

## 3. A read is asked for as a read, and one at a time per Corpus

`POST`, and the only route in the product that is not a `GET`. A read that could be reached by following a
link is a write a browser may repeat.

Reads of one Corpus are serialised inside the process. Extraction is 2–4ms on a fixture Corpus and up to
340ms on the real one, so a second press landing inside the first is something that happens. Left to
overlap, both find nothing on record and both write, which is the duplicated reading ADR-0016 exists to
prevent arriving by a route its deduplication cannot see — and both then tell a reader something came in
when the source changed once. Waiting is per Corpus, because a queue across a shelf of twenty would make the
twentieth person wait out nineteen reads of sources nobody else was touching.

This is one process's promise and not the shelf's. The runner writes to the same shelf and knows nothing of
it, which is safe for the reason a Seed is safe: every write is digest-named, written aside and moved into
place, so the worst two writers can do is leave one extra reading on record — which a prune drops, and which
decision 1 above guarantees no comparison is ever stated against.

### Measured

| Corpus | Documents | First press | Pressed again, nothing changed |
| --- | --- | --- | --- |
| `corpus-a` | 7 | 25ms | 3–6ms |
| `corpus-b` | 3 | 6ms | 3ms |
| `vertuo-domain-fr` | 153 | 339ms | 79–100ms |

Six presses on the DDD Corpus left one Seed, one set of criteria and one reading on record.

## 4. A failed read is an answer, and the sentence is the Door's

A source that cannot be read comes back as `could-not-read` with a sentence, inside a 200, exactly as
*nothing written down yet* does. Both are facts about a Corpus rather than a request that went wrong, and
both are things a reader is owed a sentence about; a second language of status codes carrying one of them
would put the sentence somewhere a surface has to guess at it.

The sentence is written in `comply-door`, not at either surface, so the runner and the Studio say the same
thing about the same failure. The failure that matters is named specifically: the documents are a separate
checkout and a shelf outlives one, so *the documents this Corpus is read from are not where its Lens says
they are* names the place it looked and what to do about it (LAW-010, spec §8).

Nothing is written until the source has been read, so a failed read leaves the previous reading intact —
asserted on the bytes of the shelf and on the reading the server still answers with, not on the code that
was meant to leave them alone (LAW-003).

## 5. The action finds its Lens without going through a reading

`everyLensOn` is separate from `readShelf`. A Corpus whose knowledge is written down in a form the product
can no longer read is passed over by every reading there is — it is in no list and on no page — and reading
its source again is the one thing to do about it. Found through a reading, the action would be missing from
the only Corpus that needs it. Found through its Lens, it is there.

## Consequences

- Every surface in the Studio asks again when a read brings knowledge in, counted in one place. A count that
  moved on a read that found nothing would send every surface off for knowledge nobody changed, and that is
  the common press.
- The action is on Corpus detail and nowhere else (spec §5.5). It is above the reading rather than inside it,
  so it is drawn on a Corpus with nothing written down yet — the state it exists to get a reader out of.
- `report` run twice over unchanged source now says the same thing twice. It used to state the movement on
  the run that caused it and *held steady* on the next, which was the same defect reaching the runner.
- A Corpus whose Lens will not load is still absent from everything, including this action. Saying why is
  #27's.
- ADR-0033 describes the DDD Corpus as *20 documents*; its Seed holds **153**, and 20 is its Modules. The
  timings either side of that figure are right.
