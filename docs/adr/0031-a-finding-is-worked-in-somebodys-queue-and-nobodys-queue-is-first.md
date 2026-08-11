# ADR-0031: A Finding is worked in somebody's queue, nobody's queue is first, and the place it cites is opened under whoever writes there

Status: Accepted. Implements §5.2 of `docs/superpowers/specs/2026-08-10-studio-readonly-design.md` and
LAW-007. Builds ADR-0030's quotation into a second surface. Bears on ADR-0010.

**A Corpus's Findings reach a reader as one queue per person who answers for something, with the queue
reaching nobody first — an ordering the agreement refuses to send any other way, not a choice the page
makes.** A queue is addressed by its Owner's name, and nobody's by the empty value. Each Finding carries
the sentence written for it, the Module it routes to, and every place it concerns with the source text at
each; nothing on it can be dismissed, hidden, or marked as seen.

Four things made this the smallest change that could work.

## Nobody's queue is named by the one value no name can be

The Inbox has to be deep-linkable — the point of it is that a person bookmarks their own queue and is
sent it — so *nobody* needs an address. An Owner is free text lifted from a corpus (`avery`, `quinn`,
`pierre-derval`), so any word reserved for nobody is a word some corpus can write, and a reader would
then be sent a stranger's queue under their own name.

The way out was already in the agreement, said the same way in three places since the Module page was
built: *nothing is sent as nothing and never as an empty name.* Every owner field is
`z.string().min(1).nullable()`. So the empty value is the one value that can never be somebody's, and
`?owner=` with nothing after it is free, unambiguous, and grounded in a decision the product had already
made.

| Rejected | Why |
| --- | --- |
| `?owner=nobody` | `nobody` is a word a corpus can write in an owners map. The failure is silent and lands on a real person |
| `?owner=x` plus a separate `?unowned` flag | Two parameters for one choice, which can disagree; the page then needs a rule for what `?owner=avery&unowned` means, and any rule is arbitrary |
| `/inbox/nobody` as a path segment | The same collision, plus a name with a slash in it to escape |

The spec names the parameter `owner`, and it is `owner` here rather than anything shorter, because a
parent document naming a thing is worth more than a saved character. One consequence is worth writing
down: something that strips empty query parameters on the way through turns nobody's queue into the whole
Inbox. That degrades to *showing more, with the unowned queue still first* rather than to somebody else's
queue, which is why it was acceptable.

## The order is in the agreement, not in the page

`corpusInboxSchema` refuses a payload whose unowned queue is not first, and refuses one person's Findings
split across two queues. Both could have been rendering rules. They are not, because LAW-007's failure
mode is precisely a violation *belonging to nobody* becoming ambient: mixed into a flat list, unowned
Findings reproduce the death the law exists to prevent, and a rule that lives only in a component is one
refactor away from being lost. A test asserts the position off a `data-queue` handle rather than off a
class, for the same reason.

The named queues follow in the order their person first answers for a Module — this Corpus's own order.
Ordering by how much each queue holds was rejected: a ranking is a figure by another name, and it would
put whoever has most to do at the top for no reason a reader can act on.

There is a second guard against the law being escaped, and it is on the page rather than in the
agreement. **A narrowed queue still says what routes to nobody, with the way to it.** A bookmark is
otherwise exactly how the loudest thing on a page stops being seen — and in the DDD Corpus what it says
is *103 Findings in this Corpus route to nobody*, on a page whose reader owns the other 22.

## What a cited place is opened under, and it is not the Module the Finding routes to

The two disagree as a matter of course. A Finding routes to the Module it is *about* and cites the place
the words are *written*. Fixture A carries the case at full size: `beta/terms.md` sits in one Module's
folder and says `area: bravo` in its own frontmatter, so the Finding about that split identity routes to
`beta` and cites a place written under `bravo`. In the DDD Corpus **8 Findings cite a place another Module
writes, and 29 of the 30 that concern a second place have that second place under another Module** —
which is what makes two statements disagree in the first place.

So an address built from a Finding's Module and a Finding's place is wrong, and wrong in the way that
looks right: `/corpus/…/modules/beta/knowledge?in=beta/terms.md&line=9` is refused by ADR-0030's route,
correctly, because `beta` writes nothing there. Rather than not linking, each cited place carries
`writtenUnder` — the Module that writes at that place, resolved where the reading is, from the place and
never from the Finding. **Of the 135 links this page draws over the DDD Corpus, none is refused.**

Where nothing is written at the place, `writtenUnder` is nothing and the place is not a link. That is not
a workaround: it is the same answer, and it means the page never offers a reader something that would be
refused when they clicked it.

## Nothing to quote is not the same as nothing to say

**36 of the DDD Corpus's 125 Findings cite a place no piece of knowledge is written at** — all 33
`empty-facet` and all 3 `unparsable-document` — and for every one of them that is the whole of what the
Finding says. A Facet with nothing under it cites the line its document's body begins at *because nothing
is there*; a document nothing can be read from has no knowledge in it by definition.

So the sentence is the Finding's own — *nothing is written down at that place, so there is nothing here to
quote* — and it is drawn plainly and not marked. The mark belongs to what a person has to act on, and a
Finding whose point is an empty place is not a fault in the Finding. Marking these would make 36 of 125
look broken, and a tool that makes its own correct output look like a defect is not trusted for long.

One conflation is latent and worth naming. `quotedAt` cannot tell *no knowledge at that place* from
*knowledge whose text did not come with it*, and the sentence above says the first. No item in either
fixture Seed or the DDD Seed has an empty excerpt — `excerptOf` includes the heading or table row itself,
so the span is never blank — and across all three corpora the 36 places with no text are exactly the 36
with no knowledge. If a Corpus ever produces the second case, the sentence is wrong about it, and telling
them apart is one field.

## What may be counted, and what a Finding may hold

Every figure on the page is the whole Corpus's and is stated against the Checks that ran. A narrowed page
reporting its own slice as the total is how a queue comes to look finished, so *125 Findings in this
Corpus, from the 8 Checks that ran* is drawn on a page showing 22 of them.

There is **no figure for how much of a queue somebody has dealt with**, and no `Figure` on the surface at
all. Such a reading has no denominator a rebuild could reproduce, which is also why nothing here
dismisses, snoozes, acknowledges, or remembers having seen a Finding (LAW-011). A Finding is resolved by
the knowledge changing and the Finding no longer being found. There is nowhere in `inboxFindingSchema` to
put a state, which is what stops one arriving — and a control that did nothing would be worse than none.

## Consequences

- The Studio has a fourth surface and the API a fifth route, both GET. The `Inbox` destination stops
  saying it is being built.
- **The 5 Findings that belong to no Module are visible somewhere.** `oneModule` deliberately drops them,
  because showing a Finding against a Module it does not belong to makes it look answered for; until now
  that meant they appeared nowhere in the product at all. They reach the unowned queue, marked, saying
  that no Module's page shows them.
- The whole queue travels and the surface narrows it. Asked for one person at a time, the page could not
  say how many Findings reach nobody without asking twice — and two answers about one Corpus is how the
  loudest thing on the page comes to disagree with the rest of it.
- `opensAt` moved beside `Where`, because two surfaces now turn a place into an address and two copies of
  that would be two answers to one question.
- Fixture B is the empty Inbox: no Findings, both Modules answered for. It is drawn as a surface and not
  as a sentence on a blank page — one line of grey text reads as a page that failed to load, and a reader
  who takes a clean Corpus for a broken screen learns to distrust the ones that work.
- The queue reaching nobody says *nothing will be done about them until somebody is named to answer for
  them*, and not *until somebody answers for the Module each belongs to*. Some of them belong to no
  Module, so for those there is no Module to name anybody against.
- 49 of the 171 places this page quotes are cut at ADR-0030's 600-character limit. The Inbox is now a
  second reader of that limit, which is #59.
