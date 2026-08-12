# ADR-0032: A Lens has an identity, held versions are cited not carried, and a reading taken against other criteria is a third statement

Status: Accepted. Implements ADR-0016 and §6 of
`docs/superpowers/specs/2026-08-10-studio-readonly-design.md`. Neither is modified. Uses the same
idempotence-by-digest ADR-0012 gave a Seed load.

ADR-0016 decided that a reading is recorded when, and only when, one of its two inputs changes, and left
three things open that could not be settled without writing them. This is those three.

## 1. A Lens's identity is what it says, and the root is not part of what it says

`lensDigest` is taken over canonical JSON of the whole Lens **except `adapter.root`**.

The root is the one field that is a place on a machine rather than something the Lens says about a
Corpus. `loadLens` resolves it against wherever the file happened to sit — the DDD Lens declares it
relative and every test rewrites it to an absolute path before shelving — so a digest over the Lens as
loaded changes when a checkout moves, when a second person clones the source, when CI runs. Every reading
would then say *the criteria changed* and no baseline would ever match again: the trend column would be
permanently decorative in a different way than before.

Everything else is in. Which Facets are declared, what each asks for, which rung counts as approved,
which keys a document is read by, which Facet defines the language — a change to any of them changes what
a reading says, so a change to any of them is a change of criteria.

**The test is the same Lens digested from two different roots.** It is one digest, and the retained file
is byte-identical from both.

Where the documents are still reaches a reading, because an origin a person can open is built from it
(LAW-009). It moves no figure and no Finding's words, so a reading recomputed from a retained Seed and
retained criteria against a root supplied on the day says everything the original said about the
knowledge.

## 2. One canonicaliser, in the core, and the edge points at it

`canonical` was private to `libs/comply-seed`. A Lens needed exactly the two properties it provides —
key order is not part of what a thing says, and no absolute path is either — and `comply-lens` may not
depend on `comply-seed`.

Three ways were available. Writing a second canonicaliser was rejected outright: two answers to *what is
this thing's identity* drift, and they drift in the direction of one tolerating a shape the other does
not. The drift then shows up as a baseline that stops matching for no reason anybody can name — a bug
whose symptom is a trend column quietly resetting, which is the exact failure this whole area exists to
prevent.

So one canonicaliser, moved to where both already meet: `canonicalJson` in `libs/comply-core`.

**The edge added is `comply-seed → comply-core`**, and it points from transport toward the kernel, the
direction every other edge in this workspace already points. `comply-seed` depended on nothing before;
it now depends on the one package everything depends on. The alternative — putting the Lens digest in
`comply-reading`, the first place the two meet — was rejected because a Lens's identity belongs to the
Lens, and a store for held Lens versions would then have sat two packages away from the thing it stores.

## 3. A recorded reading cites its criteria; it does not carry them

ADR-0016 permitted either. It is **cite by digest**, with held Lens versions as artifacts in their own
right, written by `holdLens` exactly as `holdSeed` writes a Seed.

The argument that settles it is LAW-011 itself. If a recorded reading carried the Lens content, the only
copy of last Tuesday's criteria would live inside a cache — and *deleting every derived artifact and
rebuilding from the corpus must lose nothing* would then be false. Carrying the content would put back,
in a new place, exactly the exemption ADR-0016 withdrew.

Citing also gives one discipline for retained inputs, one shape on the shelf, and one thing a prune has
to understand.

| Rejected | Why |
| --- | --- |
| Carry the Lens content on the recorded reading | The cache becomes the only holder of an input, which is LAW-011 broken in a new place |
| Hold the Lens as loaded, root and all | One machine's path in a digest-named artifact; two machines write different content under one name |
| Hold only the criteria arrays | A reading is a function of the whole Lens. Held criteria that cannot reproduce a reading are not worth holding |

### Where they live: `lens-versions/`, and deliberately not `lenses/`

A shelf held `seeds/` and `runs/`. Held criteria are a third directory, and the obvious name is taken in
the worst possible way: **the DDD Corpus's shelf *is* the directory called `lenses`**, so `lenses/` would
put held criteria at `lenses/lenses/` — a path somebody has to read twice, in the one place a person goes
when a figure moved and they want to know whether the bar did.

`lens-versions/` is ADR-0016's own phrase for these ("holding Lens versions under the same discipline as
Seeds") and collides with nothing.

## 4. A reading taken against other criteria is a third statement, and the delta is unsendable

`Movement` and `TrendRow` gain a third shape: `a-reading-under-other-criteria`, carrying no
`approvedDelta` at all.

ADR-0016 required that a drop caused by a stricter Lens not be read as a regression in the Corpus. Making
that a rule somebody follows would have left a `number | null` that any surface could draw; making it a
shape means **there is no value that can carry the fall**. It is the same move `movementSchema` already
made for *nothing to compare with*: structural, not remembered.

The measured case: `lens-a` with one Facet asking for an attribute no Fact writes drops every approved
Facet in the Corpus to zero, with not one document changed. Every Module reports the criteria moved; the
word `approvedDelta` does not appear on the wire.

**The criteria are checked before the figures, and that order is a decision.** A Facet arriving or
leaving changes which documents are read at all, so which Modules exist is downstream of the criteria
too. Answering per Module first would say *nothing to compare with* about a Module whose absence from the
last reading was the criteria's own doing — a second, quieter way of blaming the Corpus for a change to
the Lens.

At the surface it is drawn as *criteria changed* with its own `data-movement="other-criteria"` handle, and
never as `—` (there *is* an earlier reading) and never as a number.

## 5. A recorded reading naming neither input is passed over, and only a prune can see it

Every reading recorded before this change is `{ takenAt, lensId, scores }`. Nothing true can be said
about one: compared against, it puts a delta on a page whose criteria nobody can check, which is exactly
what §6 refuses. So none is read as a baseline.

That alone would have left them sitting where no figure and no prune could see them — an artifact this
product holds and cannot account for, which is LAW-006 by another route. So
`readingsNamingNoInputs` names them, a prune drops them, and the prune's report counts them separately,
because what they cost is nothing and saying so is the point.

The transitional tolerance ADR-0015 earned is untouched: a reading naming its Lens under the old
`profileId` key is still read, provided it names both inputs. The two tolerances compose, and there is a
test that says so.

## Consequences

- **Reading stays free and the server stays read-only.** Every route is a GET. The shelf now *reads* the
  last recorded reading, which is not a write path around the Door (LAW-002): a recorded reading is a
  cache of a derivable value, and reading one leaves the Corpus exactly as it was.
- **A recorded reading holds nothing a rebuild could not produce.** Its keys are the two inputs, when it
  was taken, and figures counted from them. A test asserts that list whole, so a field that is not
  derivable from the pair cannot arrive quietly.
- **Every baseline on every existing shelf is passed over once.** The DDD shelf held eight readings for
  `vertuo-domain-fr`, five of them inside seventeen seconds. The first run after this change records one
  reading that names its inputs; from then on the trend is stated against something.
- **The runner gained a command.** `pnpm comply prune <lens.json> [keep]` drops recorded readings and
  retained inputs no kept reading cites, keeps the knowledge as last written down whether or not a
  reading cites it, and says what it cost. Nothing in it can reach a Fact — a Fact arrives through the
  Door and lives in the Corpus, so *a prune cannot cost a piece of knowledge* is a property of where
  things live rather than a promise somebody keeps.
- **`Snapshot` is now `RecordedReading`.** ADR-0016's whole vocabulary is *a recorded reading*, and
  keeping a second word for it while adding `recordReading` would have been two words for one thing.
  `writeSnapshot` is gone as a public operation: recording only happens through `recordReading`, which is
  the only place the deduplication can be enforced.
- **Two apps still name the shelf's directories separately.** `apps/comply-api/src/shelf.ts` names the
  two it reads and `apps/comply-cli/src/shelf.ts` names all three. That duplication predates this
  change for `seeds/` and is left as it is: `readShelf` says in its own comment that it is scaffolding
  until the ledger arrives, and the seam that matters is the Reading and not the storage.
