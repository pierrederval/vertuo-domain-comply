# ADR-0037: A request that says who may make it is checked against a cast, and a corpus says how it writes more than one

Status: Accepted. Implements the second half of ADR-0020's split — *across Facts → a Check* — and closes
issue #46. Follows ADR-0019 on criteria belonging to a Facet and ADR-0021 on a Facet saying something about
itself. Bound by ADR-0020 on judging structure and never content. Serves LAW-007 and LAW-009. The spec,
LAW-004, LAW-006 and LAW-010 are not modified.

**A Message naming who may make it is reported where nothing the Corpus has written down says who that
is.** The Facet that asks says which of its attributes holds the name, which Facet settles it, and how this
corpus writes more than one name in one place.

## What a reader gets, and what they used to get

Corpus A now writes down what can be asked of it, and who may ask:

```
| Order         | Who may place it |
| ---           | ---              |
| Make a Widget | Maker            |
| Fill a Crate  | Fixer            |
```

Its crew page says who a Maker is. Nothing says who a Fixer is, and the reading now says so, at the row:

```
  [unsettled-actor] alpha/orders.md:11
      Message "Fill a Crate" says "Fixer" may make it, and nothing under "Crew" says who that is
```

Before this, nothing in the product looked. A field saying who is allowed to do something was read,
carried, drawn and never checked against anything — so a corpus could name forty roles, define three, and
report as complete as one that defined all forty.

## Why a Check and not a criterion

*Who may make this* is present in the row. What is absent is somewhere else entirely: the page that says
who that is. `evaluateFact` is handed one Fact and its Facet and nothing more, deliberately, and a
predicate needing a second Fact is in the wrong half (ADR-0020).

It is also the right half for who the work reaches. A Readiness shortfall says *write something down* to
whoever owns the thin Facet. This says *these two do not agree* — and the person who resolves it may write
neither of them: they decide whether a Fixer is a role this business has, or whether that row meant a
Packer all along.

So a Message that names **nobody at all** is not reported here. That is one Fact short of what its Facet
asks of it, which its criteria already state; said here as well, one thing to do would arrive twice, in two
queues, to two people.

## The measured reason a Lens can say how a corpus writes more than one

This is the decision issue #46 does not name, and the corpus it was written about is what forces it.

The DDD Corpus has 245 Commands. **Every one of them names an actor** — not one is blank — in **50 distinct
strings**. Its Glossary settles 431 words. Only **5 of the 50** are among them, so a Check pointed at the
Glossary reports **45 distinct roles across 157 of the 245 Commands**.

Fourteen of those 45 reports would have been false, and this is the whole of it:

| what the row says | Commands | what the corpus has settled |
| --- | --- | --- |
| `Administrateur ou Gestionnaire` | 15 | `Gestionnaire` |
| `Gestionnaire ou Planificateur` | 10 | `Gestionnaire` |
| `Utilisateur Gestion, Invité ou Utilisateur Chantier` | 9 | `Utilisateur Gestion`, `Utilisateur Chantier` |
| `Gestionnaire ou Responsable Administratif` | 7 | `Gestionnaire` |
| `Gestionnaire ou Responsable de Bureau` | 5 | `Gestionnaire` |
| …nine more | 15 | one apiece |

**61 of 245 Commands — a quarter of them — would be told a role is missing when the corpus has written it
down.** That is ADR-0020's own cautionary tale queued to happen again: 763 of the 772 broken references
that ADR was written about were `slugify`'s defect, stated with the full confidence a mechanical check
trades on, and a reader who checks two findings and finds nothing wrong has no reason to check the third.

So a Facet may say how this corpus divides two roles written in one place. Measured through the shipped
Check, with the DDD Lens's `commands` pointed at its Glossary and nothing else changed:

| | read whole | divided on `,`, ` ou `, ` et ` |
| --- | --- | --- |
| Findings | 157 | **197** |
| distinct roles reported | 45 | **33** |
| Commands implicated, of 245 | 157 | **156** |
| reports naming a role the corpus settles | 14, on 61 Commands | **2, on 4 Commands** |

The count goes **up** and that is the right trade: the number of requests implicated barely moves
(157 → 156), and what each Finding says stops being wrong. The two that remain are
`Gestionnaire (tenant français)` and `Gestionnaire (sur retour des parties)` — a settled role carrying a
parenthetical, on four Commands, and honestly reported as the residue rather than dissolved by a rule that
would start reading inside a role's name.

Said by a Lens and never worked out in the core, because what divides two roles is a word of the corpus's
own language — `ou` here, `or` or a comma or a slash elsewhere (LAW-004). Several spellings, for the reason
`parts` takes several (ADR-0026). A Facet that names none reads whatever is written as one role, which is
correct for a corpus that writes one, and is what corpus A does.

## Three things this deliberately does not do

**It does not decide that a field holding three roles is a defect of its own.** Nothing structural tells
`Administrateur ou Gestionnaire` from `Responsable de Chantier`: both are words with spaces. A second
Finding code for *this field is in a form nothing can check* would need the core to guess at the shape of a
cell, which is the content analysis ADR-0020 refuses. With a divider declared, a field holding several is
not a second kind of defect at all — it is several of the first, each named as itself. Hence one code.

**It does not fold case or accents.** `système` and `Système` are two roles here, and `Manager` and
`manager RH` are two more. A corpus that spells one role two ways has something worth saying about it, and
saying it by matching loosely is saying nothing. The name is matched as written, after trimming, exactly as
the dictionary matches a word (ADR-0021).

**It does not read aliases.** The DDD Glossary carries an `Alias ou Notes` column, and folding it in was
measured before it was declined: 431 settled words become **1,487 spellings, and 45 of the 50 actor strings
are still unsettled** — `Manager`, `Administrateur`, `Responsable de Chantier`, `Système` and `Utilisateur`
are settled by neither a name nor an alias. It buys nothing here and would put a second attribute into the
core's semantic slots.

## Declared by the Facet that asks, not by a flag on the one that settles

The dictionary says `definesTerms: true` about itself, and exactly one Facet in a Lens may. This is
deliberately the other shape — the Facet that asks names the Facet that settles — for three reasons.

**One authority is a real constraint for a word and an invented one for a role.** A word settled two ways
is two languages, which is the defect this product exists to find. Two casts of actors is not a
contradiction: a corpus may well settle its own roles in one place and the outside parties it deals with in
another, and each Facet that asks knows which of them it asks of. Refusing that would be the core having an
opinion about a corpus's shape (ADR-0001).

**A flag would make a Facet claim something it cannot know.** Being *the place a role is settled* is only
meaningful relative to whoever is asking. A cast of actors sitting in a Lens nobody points at settles
nothing, and would say in writing that it does.

**The asymmetry is already a Facet's, not a Kind's.** A Command needs an actor where a Domain Event needs
the Rule it came from, and both are Messages — the observation ADR-0019 stopped keying criteria by Fact Kind
for. The same observation applies here, and the declaration follows it.

Four things must hold for the declaration to mean anything, and a Lens saying otherwise does not load:

- the attribute is one this Facet's own reading could fill, the way `statusAttribute`'s is (ADR-0022);
- the Facet it points at is declared in this Lens — a misspelling would otherwise settle nothing and
  report every request in the corpus;
- that Facet's Facts have a name, or nothing under it could ever match;
- **and this Facet's Facts have a name too**, because what a Finding says names the request, and a Facet
  reading whole documents has nothing to put in that sentence.

## Silent, and named while silent

No Corpus on any shelf declares this today, including the DDD Corpus, so the Check is silent everywhere but
the fixtures. Silence is not absence: `unsettled-actor` is in `CHECKS`, so it is named among what was
looked for on every reading of every Corpus, which is the denominator the open-Findings figure is stated
against (LAW-006). A Check that ran and found nothing and a Check nobody wrote are the same number and not
the same fact.

A role is settled where it is written down **anywhere in the Corpus**, not only under the request's own
Module. Integrity reads one Corpus as one language, which is the premise the dictionary is read on too.

## The three real broken references are not this Check's business

Issue #46 opens on them, and they are the wrong evidence for it. `opportunite/index.md` links
`[Commercial](#commercial)`, `[Client](#client)` and `[Administrateur](#administrateur)`, and **two of those
three words are settled by the Glossary** — so what is wrong there is a link to a heading in the wrong
document, which is `broken-reference`'s job and remains it. A Check built to explain those three would be
the wrong Check aimed at the right symptom. They stay where they are, all 24 of them, unmoved.

## Measured

| | before | after |
| --- | --- | --- |
| Checks named among what was looked for | 4 | **5** |
| corpus A: Facets declared | 5 | **7** |
| corpus A: approved, alpha | 3/5 | 5/7 |
| corpus A: approved, whole Corpus | 3/15 | 5/21 |
| corpus A: knowledge found / set aside | 14 / 2 | 18 / **2** |
| corpus A: Findings | 6 | **7** |
| corpus B: Facets declared | 2 | **3** |
| corpus B: approved, whole Corpus | 1/4 | 1/6 |
| corpus B: knowledge found / set aside | 4 / 0 | 8 / 0 |
| corpus B: Findings | 0 | **0** |
| DDD Corpus: approved | 0 of 224 across 28 Modules | 0 of 224 across 28 Modules |
| DDD Corpus: knowledge found / set aside | 1652 / 146 | 1652 / 146 |
| DDD Corpus: Findings | 125 | **125** |
| DDD Corpus: `unsettled-actor` | — | **0** |

The DDD Corpus's report is unmoved to the line, with the same 33 empty-facet, 30 conflicting-definition, 27
missing-owner, 24 broken-reference, 8 split-identity, 2 unknown-facet and 1 unreadable-document it has held
since ADR-0029. That is the acceptance test for a Check that must be silent where nothing asks it to speak:
had one line moved, the silence would not be silence.

Both fixtures moved, and neither could have avoided it — neither held a Message at all before this, so there
was nothing to check against anything. What each gained is deliberately dissimilar (ADR-0001):

| | corpus A | corpus B |
| --- | --- | --- |
| where requests are written | rows of a table | sections under a heading |
| which attribute names who may make it | a column, `placedBy` | a Part, `acteur` |
| what settles a role | `crew`, a cast of its own | `definitions`, the dictionary itself |
| more than one in one place | never | ` ou `, declared |
| what it reports | one role nobody wrote down | **nothing** |

Corpus B is the half worth reading twice. It writes `Opérateur ou Inspecteur` in one section and settles
both, so a reading unable to be told how this corpus divides them reports a defect corpus B does not have —
which makes its **empty** result the strictest test of the divider there is. Corpus A is the other half:
`Fixer` is genuinely nobody, the Finding routes to `avery`, who owns `alpha`, and it cites
`alpha/orders.md:11`, which is the row itself and not the top of the document (LAW-009).

## Consequences

- `facetSpecSchema` gains `actor`, with `attribute`, `settledBy` and an optional `separatedBy`. Nested
  rather than three sibling fields, because an attribute with nowhere to settle it means nothing and the
  coupling should be structural rather than a fourth refusal.
- `FindingCode` gains `unsettled-actor`, and it is a surface like every other code (ADR-0035). It carries
  no engineering word, and the sentence beside it names the request and the role and never a reference, a
  target or a lookup.
- `checkUnsettledActor` is the fourth of the five entries in `CHECKS`, which is where a Check is run and
  named in the same act, so the two cannot drift. Nothing about
  Readiness moves: the Check is in the Language Integrity context, which reads the Corpus and never writes
  to it.
- The runner still states no denominator for its Findings — it prints `Findings (7)` and never what looked.
  That gap predates this and is not widened by it: every surface that does state one picks the new Check up
  from `CHECKS` without being told.
- Both CLI baselines moved, each by the knowledge its fixture gained plus the one sentence the reading
  learned, and the log in `reading.test.ts` carries the sixth entry. It is the first move that touches both
  files at once for a legitimate reason, so the sibling-did-not-budge test that usually tells a real move
  from a lost one had to be replaced by reading both diffs line by line.
- **One word had to be settled to introduce this one.** Two design records call reconciling free-text owner
  strings across corpora an *actor registry* — that is about the real people who own Modules, and an Actor
  here is who a request says may make it. One word for two things is the split identity this product
  detects, so `UBIQUITOUS_LANGUAGE.md` settles Actor as the role and renames the deferred work an Owner
  registry. Nothing in either spec is otherwise touched.
- A Lens over the DDD Corpus can be pointed at its Glossary the day somebody wants the 197 Findings above.
  That is a change to `lenses/vertuo-domain-fr.json` and to nothing here, and the number to expect is
  written down.

**Revisit when** a corpus writes a role's name somewhere other than in the settling Facet's `name` — an
alias column, or a role known by two words. The measurement above says the DDD Corpus is not that corpus:
its aliases move 431 settled words to 1,487 spellings and leave 45 of 50 actor strings exactly where they
were.
