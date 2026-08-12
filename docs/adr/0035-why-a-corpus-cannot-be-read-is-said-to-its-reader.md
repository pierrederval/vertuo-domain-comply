# ADR-0035: Why a Corpus cannot be read is said to its reader, and a Finding code is a surface

Status: Accepted. Builds §8 of `docs/superpowers/specs/2026-08-10-studio-readonly-design.md`, the last slice
of the read-only phase, and closes issue #27. Applies LAW-010 to a place nobody had checked it in, and
answers a question `libs/comply-guards/src/surface-vocabulary.ts` deliberately left open. Uses ADR-0034's
rule about where a sentence for a person is written. The spec, LAW-004, LAW-006, LAW-007 and LAW-010 are
not modified.

Failure splits in two and the split matters more than either half. The Finding half was largely built. The
other half was computed in six places and handed, in every one of them, to a function called `noop`.

## 1. A reason had never reached anybody, and three comments said it had

`Fastify()` is built with no logger, so `server.log.warn` is literally `function noop () { }`. Verified by
printing it.

Every reason this product carefully worked out about a Corpus it could not read went there:

| Where a reason was worked out | Where it went |
| --- | --- |
| `readShelf`, a file on the shelf that is not a Lens | `noop` |
| `readShelf`, knowledge that could not be read back | `noop` |
| `whatMoved`, the knowledge a baseline was made of | `noop` |
| four of the six routes | dropped before reaching `noop` |

Three doc comments said a reason *goes only to its own log*. None of them did, and the shelf answered as
though it held one Corpus fewer — which is exactly what a shelf holding one Corpus fewer looks like
(LAW-006).

**The reason goes to the reader.** Turning the logger on was considered and declined in this slice: it
changes output on every request in development and in CI, which is a decision with its own consequences and
not a side effect of wording an error. What is *not* kept is the shape that made a lost reason look routed:
`whatMoved`'s `reportTrouble` callback is deleted rather than pointed somewhere else. Pruned away and
written down in a form nothing reads are deliberately still not told apart there — the sentence beside it
already says *read the source again and the next reading kept has everything it needs*, which is the remedy
for both, and two statements a reader acts on identically are not the two LAW-006 exists to separate.

## 2. Two kinds of unreadable, and the shape of each follows what its reader can do

`passedOver` held both kinds in one field, so `file` carried a filename for one and a Lens id for the other
— an inconsistency ADR-0034 introduced. They are separated, and not arbitrarily:

**A Corpus whose knowledge cannot be read back keeps its id, its name and its pages.** It has a Lens, so
there is somewhere for its reader to stand and something for them to press, and reading its source again is
the one thing to do about it. It travels as a third outcome on the reading — the spot `corpusReadingSchema`
reserved in writing for it — and every page of it now draws instead of answering 404.

**A set of criteria that could not be followed travels beside the Corpus, not among them.** What says a
Corpus has an id, a name, Modules and a page is the file that could not be read, so one in the list would
need all four invented for it, and every page the invented id led to would have to answer for a Corpus
nothing knows anything about. The file it is written in is the only name it has, and it is also the only
thing to act on — so it is drawn, unlinked, with its file as its title.

The six payloads that carry a reading spelled *nothing written down yet* six times. They now spread one
declaration, `WAYS_OF_HAVING_NO_READING`, and the Studio draws one component for it. Six copies were six
chances for one surface to learn a new way of having no reading and five to go on drawing the old sentence
for it — and the old sentence is not a blank space but the wrong true-sounding one. *Nothing has been
written down from this source yet* was what all six said about a Corpus whose source **had** been read, and
it invited a reader to go and do the thing they had already done.

A Corpus that cannot be read gets no figure of any kind. It has no Modules to count and nothing was looked
for in it, so it has neither denominator, and a zero in place of either reads as a Corpus measured and found
empty (LAW-006). The contract refuses one, on all six surfaces, and a test asserts that.

### The sidebar

It names neither kind: a menu is somewhere to go and neither has anywhere. But it said *nothing is on the
shelf yet* about a shelf holding one file, which is what a shelf holding nothing says. It now tells the two
apart and points at the list.

## 3. The sentence is written where the refusal is, never at a surface

ADR-0034 settled this for the Door and it holds here. `loadLens`'s wrapper is replaced by
`whyItCannotBeFollowed` in `libs/comply-lens/src/refusal.ts`, so the runner and the Studio say one thing
about one file. Character for character, on the failure spec §8 names as the one a business user is
likeliest to meet:

Before:

```
Lens at /Users/pid/vertuoza/vertuo-ddd-comply/lenses/lens-b.json is invalid — maturity.approvedAtOrAbove: approvedAtOrAbove "signed-off" is not on the ladder [0, 1, 2]
```

After:

```
Nothing about the Corpus described in lens-b.json can be read yet, because it counts anything at "signed-off" or above as approved, and "signed-off" is not one of the steps on its ladder (0, 1, 2). Put that right in lens-b.json and it will be read.
```

Four things changed and each was wrong on its own. The absolute path is gone: it differs on every checkout
and in CI, so a reason carrying one reads differently to two people looking at one shelf, and it names a
directory the reader is already standing in. *is invalid* is gone. The path into the file is gone from the
front, and the rules that already worded themselves well say the whole reason. And it ends with what to do.

Three further points about the wording:

- **Every reason at once.** A file with two mistakes reported one at a time is two loads to find the second,
  and the person fixing it has the whole file open.
- **A validator's own vocabulary is said again in five cases** — a key absent, a key of the wrong kind, a
  word this product does not know, a key nothing reads, and a value too small — because *expected*,
  *received* and *invalid* are the vocabulary LAW-010 keeps off a screen. What is kept from the validator is
  the place and the value, which are the two things a reader needs and the two things it alone knows.
- **A file that is not there gets its own sentence**, and is the one place the path is said as given.
  Nothing is wrong inside a file, so *put that right in it* would send somebody to open one that does not
  exist; and a name mistyped by one directory cannot be checked against a name with the directory removed.

### Who it reaches

Nobody the product knows about, and that is stated rather than hidden. A Lens is hand-authored, there is no
Module and so no Owner to route to, and no reading in which to raise a Finding. LAW-007 says a finding
belonging to nobody is a dashboard; this is the one exception, and it is answered the only way it can be —
the sentence carries its own routing, by naming the file and what to change in it.

## 4. A Finding code is a surface, and one of them was two defects

`unparsable-document` becomes `unreadable-document` and `unknown-facet`.

**It was a surface.** Every code is drawn: as the denominator beside the Integrity figure, as the list of
what ran on the Inbox and on a Module, and in the runner's own `Findings (6):` block. It survived LAW-010
only because the surface guard stops at the start of a word, and that guard's doc comment says in writing
that whether a code prefixed with *un* is a surface *is a question for whoever names them, not for this
guard to settle by failing a build*. This is that answer. A test now asserts no code carries an engineering
word, because the guard structurally cannot.

**It was two defects with nothing in common.** On the DDD Corpus it fired three times: twice for a document
naming `state-machine` where the Lens declares `state-machines`, and once for a document with nothing
readable at the top of it. One is a word spelled two ways; the other needs two lines written. One code put
them in one row shape and made the stated denominator claim four looks where five happen.

**Growing `lookedFor` from 4 to 5 is a denominator correction, not a new Check.** `interpret` always
distinguished these two cases — it reported them under one name. So no look was added, no Finding count
moved, and the honest figure is that the denominator was understating by one all along. Measured on all
three corpora:

| Corpus | Open Findings, before | after | Checks named, before | after |
| --- | --- | --- | --- | --- |
| `corpus-a` | 6 | 6 | 8 | 9 |
| `corpus-b` | 0 | 0 | 8 | 9 |
| `vertuo-domain-fr` | 125 | 125 | 8 | 9 |

Not a line of either baseline moved, because `lookedFor` reaches no baseline: a recorded reading holds
`scores` and nothing else, and the runner does not print the list. And no trend statement moved, because a
trend is stated over Readiness. **#46 and #47 face a different question from this one** — each of those adds
a look that did not happen, and adding one moves a denominator with no correction to point at.

**Three messages said *frontmatter*, inside a function whose own doc comment says it is deliberately not
markdown's business.** A Seed from any adapter is interpreted there, so a second adapter would have arrived
and its Findings would have talked about a thing it does not have (LAW-004). All three now name the two keys
the *Lens* declares, and each says what the document would have to say — a Finding reporting only an absence
is one nobody can act on. The `unknown-facet` message says the declared Facet names back, which is what
makes the DDD Corpus's typo visible at a glance.

## 5. The press said the knowledge could not be kept when what failed was reading it back

Found by pressing the button on a shelf holding a damaged Seed, which is a thing that only happens if you
go and try it.

`readTheSourceAgain` wrapped its whole write phase in one `catch`, so any failure said *what it says could
not be written down where this product keeps it*. Where the failure is `readSeed` of an already-held Seed,
that is false: it **was** written down, possibly months ago, and this press never touched it. Three phases
now have three sentences.

The third of them is the one failure here whose remedy is not another press, because a press has just met
it: unchanged source finds the Seed already held and reads that, so a damaged file under that name stops
every read of that source until it is gone. So it says the way out instead, which is LAW-011 said to a
person — what this product keeps for itself is worked out from the source and can be dropped and worked out
again, and none of the knowledge is at risk.

The same press's follow-on sentence said *the reading below is the one that was already there*, which claims
there is a reading. A Corpus whose knowledge cannot be read back has none, and that is precisely the Corpus
the action is now pressed on most. It says *what is below is what was below before*.

## 6. What the guard enforces, and what it still cannot

`valid`, `structure` and `exception` join the forbidden list. All three were at zero violations, and the
first two are the words AC-3 names, so spec §8's rule is now enforced by a run rather than by whoever reads
the wording next.

`invalid` belongs there and cannot be added, for two reasons that are both the over-catch the guard's own
doc comment accepts: three vendored components carry `aria-invalid:` in a class string, which is a selector
and not text, and `refusal.ts` compares against a validator's own code names — `invalid_type`,
`invalid_enum_value` — to turn each of them into a sentence, which is the very work that keeps the word off a
screen. `valid` catches the form a reader would meet, because `\bvalid` does not match *invalid*; what it
will not catch is the exact phrase *is invalid*, which is what `loadLens` said before this slice, so a test
stands in for it. `refusal.ts` and `door.ts` are named in the guard test's list of surfaces that exist,
because neither reaches a component and nothing else would notice them falling out of scope.

## 7. Neither fixture gained an unreadable document

Considered, and declined with the reason recorded. `libs/comply-fixtures/corpus` is read directly by about
thirty test files, so a document added there changes the source every one of them reads — and a permanent
planted defect means every test that is about something else carries an expectation about this. `corpus-a`'s
baseline is asserted character for character.

Both new codes are exercised end to end instead: as units in `interpret.test.ts`, and against a copy of a
fixture corpus in the API's tests. Both baselines are byte-identical, which is what tells a fixture change
from a pipeline fault (ADR-0001's two-corpus rule is unaffected — both new codes are raised for either
shape, and neither fixture happens to contain one).

## Measured, on a shelf holding one good Lens and one naming a rung off its ladder

The good Corpus lists, reads and re-reads exactly as it does alone, asserted against the payload it answers
with rather than against a shape written out in a test (AC-4). `pnpm comply report` on the refused Lens
prints the sentence above and nothing else, and exits 1.

| Read | DDD Corpus, 153 documents |
| --- | --- |
| the list, one Corpus and one refused set of criteria | 27–30ms |
| the list, one Corpus alone | 31–42ms |
| the Inbox | 29ms |

A refused Lens costs nothing to report, because loading it was already attempted.

The DDD Corpus's three unreadable documents reach the Inbox in the nobody-answers queue with the places they
cite, and the two whose Facet is misspelled say something different from the one with nothing readable at the
top of it. The `unreadable-document` one is additionally marked *this belongs to no Module, so no Module's
page shows it*, which is ADR-0031 doing its job on a Finding it had never actually been handed.

## Consequences

- The workspace stays at 24 test tasks and 14 typechecked packages. The surface guard's verdict goes from 97
  files in 14 places to 100 in 14.
- A Corpus whose knowledge cannot be read back is reachable on every one of its pages. ADR-0034 §5 gave the
  action a way to find its Lens without a reading; this gives it a page to sit on.
- `everyLensOn` and `readShelf` return `criteriaNotFollowed` rather than `passedOver`, and the one field that
  held two kinds of name holds one.
- Every empty state names what would fill it. *Nothing has been written down from this source yet* gained a
  second sentence, and *No Corpus is on the shelf yet* now says how one arrives.
- `data-cannot-be-read` carries `"knowledge"` or `"criteria"`, so a test can position and count either
  without reaching for a class name.
- The read-only phase's build sequence is complete. Every slice of spec §9 is implemented.
