import { ArrowUpRight, ChevronRight, Search, X } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';
import type { CitedPlace, CorpusInbox, InboxFinding } from '@vertuo/comply-contract';
import { WhyThereIsNoReading } from '../components/NoReading.js';
import { Conspicuous, NothingToShow, Surface } from '../components/layout.js';
import { Person } from '../components/Person.js';
import { opensAt, Where } from '../components/Where.js';
import { Card, CardContent } from '../components/ui/card.js';
import { count } from '../words.js';

/**
 * How a reader has narrowed the queue, read off the address and nowhere else.
 *
 * Every one of these is a query in the address, so a narrowed queue is a link
 * somebody can send and come back to, and nothing about it is remembered anywhere a
 * rebuild could not reproduce (LAW-011). That is also what keeps a filter from being
 * the dismiss control this surface must never grow: a `select` whose value is in the
 * address remembers nothing about a Finding.
 */
export interface Narrowing {
  /**
   * Whose queue: a name, the empty value for the one reaching nobody, or nothing at
   * all for everybody's.
   *
   * Nobody's is addressed by the empty value, which is the one value that can never
   * be somebody's: an Owner is free text lifted from a corpus, so any word reserved
   * here is a word some corpus can write, and a reader would then be sent a
   * stranger's queue under their own name. Every owner field in the agreement refuses
   * an empty name, and that is what makes the empty one free.
   */
  owner: string | null;
  /** Which Check's Findings, by the name the Check gives itself. */
  kind: string | null;
  /** Which Module's, or nothing for every Module's. */
  module: string | null;
  /** Words that must appear in what a Finding says. Empty for all of them. */
  says: string;
}

/** Nothing narrowed: every Finding in the Corpus. */
export const EVERYTHING: Narrowing = { owner: null, kind: null, module: null, says: '' };

/** One Finding, with who answers for it — which is a property of its queue and not of it. */
interface Routed {
  finding: InboxFinding;
  owner: string | null;
}

/** Where the rest of one Module's knowledge is, for a Finding that belongs to one. */
function moduleAt(corpusId: string, moduleId: string): string {
  return `/corpus/${encodeURIComponent(corpusId)}/modules/${encodeURIComponent(moduleId)}`;
}

/**
 * One place a Finding cites, and the text that is there.
 *
 * The reason this surface is worth reading in a browser at all: a place is
 * verifiable evidence for somebody at a terminal and useless to somebody who cannot
 * open it, so the cited text is drawn in place and the Finding can be judged without
 * leaving the page (LAW-009).
 *
 * Drawn as it was written, line breaks and all, and never rendered as though the
 * marks in it were formatting: what a reader is owed is the text the defect was
 * found in, not a tidy version of it.
 *
 * Followed to the Module that *writes* here, which is not always the Module the
 * Finding routes to — a defect about two statements that disagree cites a place
 * under each of them. An address built out of the Finding's own Module would send a
 * reader to a Module that writes nothing here, and be refused when they clicked it.
 */
function Cited({
  cited,
  corpusId,
  also = false,
}: {
  cited: CitedPlace;
  corpusId: string;
  also?: boolean;
}) {
  return (
    <div data-cited="" className="flex flex-col gap-1">
      <p className="text-sm text-muted-foreground">
        {also ? 'And also at ' : 'At '}
        {cited.writtenUnder === null ? (
          <Where at={cited.at} />
        ) : (
          <Link
            to={opensAt(corpusId, cited.writtenUnder, cited.at)}
            className="underline decoration-dotted underline-offset-4"
          >
            <Where at={cited.at} />
          </Link>
        )}
      </p>
      {cited.quoted === null ? (
        // A Finding may cite a place precisely because nothing is written at it,
        // which is the whole of what a good many of them say. Said plainly and not
        // marked: the mark belongs to what a person has to act on, and a Finding
        // whose point is an empty place is not a fault in the Finding.
        <p className="text-sm text-muted-foreground">
          {'Nothing is written down at that place, so there is nothing here to quote.'}
        </p>
      ) : (
        <>
          <pre
            data-quoted=""
            /*
             * The evidence, told from the page around it by a ground and an edge. It
             * was tinted in the same value as the paper the page is on, which on a
             * white card is no tint at all — so the one thing on this surface that is
             * the source’s own words looked like the product’s prose.
             */
            className="overflow-x-auto rounded-md border border-border bg-sunken p-3 text-[0.8125rem] leading-relaxed whitespace-pre-wrap"
          >
            {cited.quoted.says}
          </pre>
          {cited.quoted.cut && (
            // A cut with a pointer is honest about being partial in a way a
            // summary is not, and a cut left unsaid reads as the whole of what the
            // source says (LAW-006, ADR-0017).
            <p data-cut="" className="text-sm text-muted-foreground">
              {'The source text goes on past this. The rest of it is at '}
              <Where at={cited.at} />
              {'.'}
            </p>
          )}
        </>
      )}
    </div>
  );
}

/**
 * One Finding, as the person who has to answer for it meets it.
 *
 * What was found, which Check found it, which Module it is about, who answers for it,
 * and where it is — on one line, at one row height. Opened, every place it concerns
 * with the text at each.
 *
 * Nothing to do to it but read it: a Finding is resolved by the knowledge changing
 * and the Finding no longer being found, so there is nothing here to dismiss it, hide
 * it, or remember having seen it — nothing in this product may hold what a rebuild
 * could not reproduce (LAW-011), and a control for it is how such a thing arrives.
 */
function Found({ routed, corpusId }: { routed: Routed; corpusId: string }) {
  const { finding, owner } = routed;
  const cited = [finding.cites, ...finding.alsoCites];
  // Where the whole Fact is, for the one action a row offers. A cited place that no
  // Module writes at has no page to open, so that row offers none.
  const opens =
    finding.cites.writtenUnder === null
      ? null
      : opensAt(corpusId, finding.cites.writtenUnder, finding.cites.at);

  return (
    <li
      data-finding=""
      data-routes-to={owner ?? ''}
      /*
       * The mark is on the row's own edge, which is what makes it survive the list
       * being narrowed, sorted or bookmarked. It was on the edge of a card holding a
       * hundred rows, so a reader four screens down was looking at unowned work with
       * nothing on screen saying so (LAW-007). A row that has an Owner keeps the same
       * edge in nothing, so the names below it stay on one line.
       */
      className={`group/finding relative border-b border-border last:border-0 ${
        owner === null ? 'border-l-4 border-l-mark' : 'border-l-4 border-l-transparent'
      }`}
    >
      {/*
        A disclosure and not a control. `details` is the whole mechanism: nothing is
        remembered about a Finding between two draws of this page, because there is
        nowhere for it to be remembered — which is LAW-011 holding by construction
        rather than by anybody's restraint. It is also why this is not a button: a
        Finding is resolved by the knowledge changing, so the only thing to do to one
        is read it and the only actions on it are places to go.
      */}
      <details className="group/row">
        {/*
          The right gutter is the action's, kept clear whether or not the action is
          drawn. Sized to the action and not guessed: at a guess it overlapped the
          place, and a row whose evidence is covered by a control is worse than one with
          no control at all.

          Every fixed column is as narrow as its content needs, because what a row is
          read for is the sentence in the middle and it is the only column that gives.
          At a 1440 window the four fixed ones came to 632px and left the sentence 299 —
          which cut *Facet "state-machines" produced no content in this do…* four words
          short of its point.

          The Check's column is measured and not guessed: the longest code either corpus
          writes is `missing-module-identity` at 166px, and `conflicting-definition` at
          159. 10rem holds every code but the first, and that one loses a character. A
          column wide enough for the longest would spend 24px of the sentence's width on
          two rows in a hundred, and the codes are told apart three characters in. Every
          column says its content in full to the pointer, because past this the only
          column left to take from is the sentence.

          The place is the sixth column and arrives at `2xl`, not `xl`. A breakpoint is
          on the window and this row's width is the window less the rail and two gutters,
          so six fixed columns at a 1280 window leave the sentence 264px — narrower than
          the five-column arrangement gives it at the same width. Between the two the
          place is the column to lose, because it is the only one the disclosure repeats.

          `minmax` and not a bare `1fr`, so the sentence has a floor. Fixed columns cannot
          shrink, and squeezed hard enough a bare `1fr` resolves to nothing at all — the
          row keeps its Module, its Owner and its place, and loses the only part of it
          that says what was found.
        */}
        <summary className="grid cursor-pointer list-none grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1 py-2.5 pr-20 pl-3 outline-none group-hover/finding:bg-sunken focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset md:grid-cols-[auto_10rem_minmax(10rem,1fr)_auto_auto] 2xl:grid-cols-[auto_10rem_minmax(10rem,1fr)_8rem_8.5rem_8.5rem]">
          <ChevronRight
            aria-hidden="true"
            className="size-3.5 shrink-0 text-ink-faint transition-transform group-open/row:rotate-90"
          />
          {/*
            Which Check found it, in the Check's own words. The identifier a reader
            groups by: of the real Corpus's 125 Findings, one kind accounts for most of
            them, and until this column existed a queue of a hundred rows all beginning
            *Facet "…" produced no content* could not be told from a hundred different
            defects (ADR-0041). Quiet on purpose — it is what a row is filed under and
            never what a row is about.
          */}
          <span
            data-found-by={finding.foundBy}
            title={finding.foundBy}
            className="col-start-2 justify-self-start truncate rounded border border-border bg-sunken px-1.5 py-0.5 font-mono text-[0.6875rem] leading-4 text-muted-foreground md:max-w-full"
          >
            {finding.foundBy}
          </span>
          {/*
            What was found leads, on one line, at one row height. A queue of a hundred
            was a hundred blocks of five lines apiece — and a list whose rows are all
            different heights cannot be scanned down at all, which is what made this
            surface unreadable at 103 Findings. Opened, it is no longer cut: a Finding
            too long for a row is exactly the one a reader needs the whole of.
          */}
          <span
            // Said in full to the pointer as well, because the width a sentence gets is
            // whatever the window has left and no column arrangement can promise the
            // longest one fits. Opening the row is the other way to the whole of it.
            title={finding.says}
            className="col-start-2 min-w-0 truncate font-medium group-open/row:whitespace-normal md:col-start-3"
          >
            {finding.says}
          </span>
          {finding.moduleId === null ? (
            // The only place in the product this Finding appears at all. No Module's
            // page can show it, because showing it there would make it look answered
            // for by somebody.
            <span className="col-start-2 text-xs md:col-start-4">
              <Conspicuous>no Module</Conspicuous>
            </span>
          ) : (
            // Named in full to the pointer as well as to the column, because a Module
            // whose name is longer than its column is one a reader cannot identify —
            // and identifying it is the whole use the column has.
            <span
              title={finding.moduleId}
              className="col-start-2 truncate text-xs text-muted-foreground md:col-start-4"
            >
              {finding.moduleId}
            </span>
          )}
          {/* Who answers for it, on the row and not over a section of rows. */}
          <span className="col-start-2 min-w-0 md:col-start-5">
            <Person owner={owner} />
          </span>
          {/* The end of a place is the part that identifies it, so it is the end that
              survives when there is not room for all of it. */}
          <span
            dir="rtl"
            title={`${finding.cites.at.file}, line ${finding.cites.at.line}`}
            className="col-start-2 hidden min-w-0 truncate text-left font-mono text-xs text-ink-faint 2xl:col-start-6 2xl:block"
          >
            {`${finding.cites.at.file}:${finding.cites.at.line}`}
          </span>
        </summary>

        <div className="flex flex-col gap-3 pt-1 pr-4 pb-4 pl-10">
          {finding.moduleId !== null && (
            <p className="text-sm text-muted-foreground">
              {'In '}
              <Link
                to={moduleAt(corpusId, finding.moduleId)}
                className="text-foreground underline underline-offset-4"
              >
                {finding.moduleId}
              </Link>
            </p>
          )}
          {finding.moduleId === null && (
            <p className="text-sm text-muted-foreground">
              <Conspicuous>This belongs to no Module, so no Module’s page shows it.</Conspicuous>
            </p>
          )}
          {cited.map((place, at) => (
            <Cited
              key={`${place.at.file}:${place.at.line}`}
              cited={place}
              corpusId={corpusId}
              also={at > 0}
            />
          ))}
        </div>
      </details>

      {/*
        The one action, over the right of the row and drawn only for the row under the
        pointer — which is what stops a hundred of them reading as a hundred controls.
        Outside the `summary` on purpose: a link inside it is a second thing to click in
        one place, and whichever a reader hits is the one they did not mean.

        Never hidden from the keyboard. `opacity-0` leaves it reachable by tab, and
        focus brings it back, so it is quiet rather than absent.
      */}
      {opens !== null && (
        <Link
          to={opens}
          // Named in full for anyone who cannot see the figure beside it, and short on
          // screen because a row this dense has no room for a sentence.
          aria-label="Open where it is written"
          title="Open where it is written"
          className="absolute top-1.5 right-3 flex items-center gap-1 rounded-md border border-border bg-panel px-2 py-1 text-xs font-medium text-muted-foreground opacity-0 transition-opacity group-hover/finding:opacity-100 hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring"
        >
          Open
          <ArrowUpRight aria-hidden="true" className="size-3" />
        </Link>
      )}
    </li>
  );
}

/**
 * One way of narrowing the queue, as a menu of what the reading itself offers.
 *
 * Native, and it has to stay native. A menu in a portal is not in the document until
 * it opens and `renderToStaticMarkup` renders no portal at all, so the options a
 * reader is offered would be untestable — and what is offered here is drawn from the
 * reading, which is exactly the thing a test has to be able to check has not been
 * written into this file (LAW-004).
 *
 * What a reader picks is carried as the option's *position* and never as its value.
 * The queue reaching nobody is narrowed to by the empty value — the one value no Owner
 * can ever have — and *narrowed to nothing at all* has to be a value too. As two
 * strings those are the same string, so the menu could neither show that nobody's queue
 * was chosen nor let a reader choose it: picking *Nobody* cleared the filter. A
 * position cannot collide with a name a corpus writes, which no reserved word can
 * promise (LAW-004).
 */
function Narrow({
  label,
  of,
  chosen,
  options,
  all,
  onto,
}: {
  label: string;
  of: string;
  chosen: string | null;
  options: { value: string; label: string }[];
  all: string;
  onto: (value: string | null) => void;
}) {
  const at = options.findIndex((option) => option.value === chosen);

  return (
    <label className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
      <span className="sr-only">{label}</span>
      <select
        // Two handles: one says this way of narrowing exists, the other says it is on.
        // A reader who cannot see which filters are on reads a slice as the whole
        // (LAW-006), so *on* is a fact about the page and not only a colour.
        data-narrows={of}
        data-narrowed={chosen === null ? undefined : of}
        aria-label={label}
        value={at === -1 ? '' : String(at)}
        onChange={(event) =>
          onto(event.target.value === '' ? null : options[Number(event.target.value)]!.value)
        }
        className={`min-w-0 max-w-[13rem] truncate rounded-md border px-2.5 py-1.5 text-xs transition-colors hover:border-line-strong focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
          chosen === null
            ? 'border-border bg-panel text-muted-foreground'
            : // A filter that is on says so by looking different from one that is not.
              // Four menus that look identical whether or not they are narrowing is how
              // a reader comes to read a slice as the whole (LAW-006).
              'border-here bg-here-quiet font-medium text-here'
        }`}
      >
        <option value="">{all}</option>
        {options.map((option, position) => (
          <option key={option.value} value={String(position)}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/**
 * Everything a reader can narrow the queue by, and what the whole of it still is.
 *
 * The figure and its denominator are drawn here, narrowed or not, and they are always
 * the Corpus's own. A narrowed page reporting its own slice as the total is how a
 * queue comes to look finished, which is why nothing on this page is recomputed per
 * view (LAW-006).
 */
function Toolbar({
  found,
  shown,
  ran,
  narrowing,
  owners,
  kinds,
  modules,
  onto,
}: {
  found: number;
  shown: number;
  ran: string;
  narrowing: Narrowing;
  owners: (string | null)[];
  kinds: string[];
  modules: string[];
  onto: (part: Partial<Narrowing>) => void;
}) {
  const narrowed =
    narrowing.owner !== null ||
    narrowing.kind !== null ||
    narrowing.module !== null ||
    narrowing.says !== '';

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-panel px-4 py-3.5">
      <div className="flex flex-wrap items-center gap-2">
        {/*
          Words a Finding has to contain. The one filter that needs no list behind it,
          and the only way to narrow by something no Check and no Module names — the
          word a defect is about.
        */}
        {/* Capped rather than given the rest of the row. Stretched, one text field ran
            the width of the page and the three menus beside it read as an afterthought
            pushed to the far edge — a toolbar is four ways to ask one question and they
            are the same size. */}
        <div className="relative w-full min-w-[13rem] sm:w-[16rem]">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-ink-faint"
          />
          <input
            type="search"
            data-narrows="says"
            data-narrowed={narrowing.says === '' ? undefined : 'says'}
            aria-label="Words a Finding says"
            placeholder="Search what was found"
            value={narrowing.says}
            onChange={(event) => onto({ says: event.target.value })}
            className="w-full rounded-md border border-border bg-panel py-1.5 pr-2.5 pl-8 text-xs transition-colors placeholder:text-ink-faint hover:border-line-strong focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          />
        </div>
        <Narrow
          label="Which Check found it"
          of="kind"
          chosen={narrowing.kind}
          all="Every Check"
          options={kinds.map((kind) => ({ value: kind, label: kind }))}
          onto={(kind) => onto({ kind })}
        />
        <Narrow
          label="Who answers for it"
          of="owner"
          chosen={narrowing.owner}
          all="Everybody"
          /* The empty value is nobody's queue, and it keeps the position the payload
             gives it — first, because that is LAW-007 made into an order. */
          options={owners.map((owner) => ({
            value: owner ?? '',
            label: owner ?? 'Nobody',
          }))}
          onto={(owner) => onto({ owner })}
        />
        <Narrow
          label="Which Module it is about"
          of="module"
          chosen={narrowing.module}
          all="Every Module"
          options={modules.map((module) => ({ value: module, label: module }))}
          onto={(module) => onto({ module })}
        />
      </div>

      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 border-t border-border pt-3 text-sm text-muted-foreground">
        {/*
          What is in this Corpus and what was looked for to find it. It is the
          denominator every row below is read against (LAW-006), and it was a line of
          grey text floating above the first card — the position a reader learns to
          skip, and the one sentence on this page that must not be skipped.

          One phrase and two weights. All one grey, the figure was the quietest thing on
          a page whose every row is louder than it; the names of the Checks stay quiet
          because a reader reads them once and the figure every time. Never two elements
          a stylesheet could put on two lines: read as one sentence it cannot be halved.
        */}
        <span>
          <span className="font-semibold text-foreground">{count(found, 'Finding')}</span>
          {` in this Corpus, from ${ran}.`}
        </span>
        {narrowed && (
          <span data-showing="" className="font-medium text-foreground">
            {`Showing ${shown} of ${found}.`}
          </span>
        )}
        {narrowed && (
          <button
            type="button"
            /* Takes every query out of the address. Not a thing done to a Finding —
               there is no such control on this surface and no room for one to arrive:
               what this clears is four queries in an address, and the page is drawn
               from the address (LAW-011). */
            onClick={() => onto(EVERYTHING)}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            <X aria-hidden="true" className="size-3" />
            Everything in this Corpus
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * One Corpus's Findings as one list a reader can narrow, the ones reaching nobody
 * first (spec §5.2).
 *
 * The other reading, become a list of specific work for a named person. What routes
 * to nobody is deliberately the loudest thing here: a violation belonging to nobody is
 * how a knowledge base quietly dies, and it keeps three marks rather than one — it
 * sorts first, every such row carries the mark on its own edge, and a band above the
 * list states how many there are wherever a reader has narrowed away from them.
 *
 * It was one card per Owner. On the real Corpus that is a card of 103 and a card of
 * 22, which divides the page without making either half readable, and puts the one
 * fact LAW-007 exists to keep visible into a heading a reader scrolls past. Every row
 * carries its own Owner now, so the sections have nothing left to say (ADR-0041).
 *
 * Every figure here is the whole Corpus's and is stated against the Checks that ran.
 * A narrowed page reporting its own slice as the total is how a queue comes to look
 * finished (LAW-006). There is no figure for how much of a queue somebody has dealt
 * with, because no such reading has a denominator a rebuild could reproduce.
 *
 * Nothing here knows what any of it is called. Every name, every person, every Check
 * and every sentence a Check wrote arrives in the payload, so this draws the Findings
 * of a Corpus it has never met without being changed (LAW-004).
 */
export function Inbox({
  inbox,
  narrowing,
}: {
  inbox: CorpusInbox;
  narrowing: Narrowing;
}) {
  const [asked, setAsked] = useSearchParams();
  const { reading } = inbox;

  /**
   * Narrowing, put in the address rather than kept.
   *
   * `replace` so that narrowing four times does not leave four steps for a reader to
   * walk back through to leave the page — and typing a word does not leave one step
   * per letter.
   */
  const onto = (part: Partial<Narrowing>) => {
    const next = new URLSearchParams(asked);
    for (const [of, value] of Object.entries({ ...narrowing, ...part })) {
      /*
       * Out of the address entirely rather than present and empty, so an address a
       * reader sends somebody says a filter is on only where one is.
       *
       * `owner` is the exception and has to be: its empty value is the queue reaching
       * nobody, which is a narrowing and not the absence of one. Treated like the
       * others, choosing that queue took the query straight back out of the address and
       * showed the reader everybody's — and the loudest thing in the product was the one
       * thing that could not be asked for (LAW-007). Nothing is narrowed here only when
       * the value is nothing at all.
       */
      if (value === null || (value === '' && of !== 'owner')) next.delete(of);
      else next.set(of, String(value));
    }
    setAsked(next, { replace: true });
  };

  if (reading.outcome !== 'read') {
    return (
      <Card className="border-dashed shadow-none">
        <CardContent>
          <WhyThereIsNoReading reading={reading} />
        </CardContent>
      </Card>
    );
  }

  const { routesTo, lookedFor } = reading;
  const corpusId = inbox.corpus.id;
  const ran = `the ${count(lookedFor.length, 'Check')} that ran: ${lookedFor.join(', ')}`;

  /*
   * One list, in the order the payload already guarantees: what routes to nobody
   * first, then each person in the order they first answer for a Module in this
   * Corpus. Nothing about that order is decided here, so the two refinements the
   * agreement makes about it keep their force.
   */
  const every: Routed[] = routesTo.flatMap((queue) =>
    queue.findings.map((finding) => ({ finding, owner: queue.owner })),
  );
  const found = every.length;
  const nobody = every.filter((routed) => routed.owner === null).length;

  const shown = every.filter(
    (routed) =>
      (narrowing.owner === null || (routed.owner ?? '') === narrowing.owner) &&
      (narrowing.kind === null || routed.finding.foundBy === narrowing.kind) &&
      (narrowing.module === null || routed.finding.moduleId === narrowing.module) &&
      (narrowing.says === '' ||
        routed.finding.says.toLocaleLowerCase().includes(narrowing.says.toLocaleLowerCase())),
  );

  if (found === 0) {
    // The empty Inbox is the harder page. *Nothing was found* is a claim about a
    // whole Corpus, and can only ever mean nothing these Checks would have found.
    //
    // Drawn as a surface rather than as a sentence on an empty page, for the reason
    // every other empty state here is: a page with one line of grey text on it reads
    // as a page that failed to load, and a reader who takes a clean Corpus for a
    // broken screen learns to distrust the ones that work.
    return (
      <Card className="border-dashed shadow-none">
        <CardContent>
          <NothingToShow>{`Nothing was found in this Corpus by ${ran}.`}</NothingToShow>
        </CardContent>
      </Card>
    );
  }

  /*
   * What each menu offers, taken from the reading and never from this file.
   *
   * The Owners keep the payload's order, because nobody's queue coming first is
   * LAW-007 made into an order and not a convenience. The Checks are what was looked
   * for, which means one that found nothing is still offered — *this Check ran and
   * found nothing here* is worth being able to ask, and is a different answer from a
   * Check that was never run. The Modules are sorted, which is not a ranking: a menu
   * is somewhere a reader finds a name they already have in mind.
   */
  const owners = routesTo.map((queue) => queue.owner);
  const modules = [
    ...new Set(
      every
        .map((routed) => routed.finding.moduleId)
        .filter((moduleId): moduleId is string => moduleId !== null),
    ),
  ].sort((one, other) => one.localeCompare(other));

  return (
    <Surface>
      <Toolbar
        found={found}
        shown={shown.length}
        ran={ran}
        narrowing={narrowing}
        owners={owners}
        kinds={lookedFor}
        modules={modules}
        onto={onto}
      />

      {/*
        What reaches nobody, wherever a reader has narrowed away from it. A bookmark is
        how the loudest thing on a page stops being seen, and a filter is a bookmark
        somebody made for themselves (LAW-007). Not drawn where they are already
        looking at exactly these, which would be the page telling them twice what they
        can see.
      */}
      {nobody > 0 && narrowing.owner !== '' && (
        <p
          data-reaches-nobody=""
          className="flex flex-wrap items-baseline gap-x-2 rounded-lg border border-mark/40 border-l-4 border-l-mark bg-mark-quiet/60 px-4 py-3 text-sm"
        >
          <Conspicuous>
            {`${count(nobody, 'Finding')} in this Corpus ${nobody === 1 ? 'routes' : 'route'} to nobody.`}
          </Conspicuous>
          <span className="text-muted-foreground">
            {'Nothing will be done about them until somebody is named to answer for them. '}
            <button
              type="button"
              onClick={() => onto({ ...EVERYTHING, owner: '' })}
              className="text-foreground underline underline-offset-4"
            >
              Read them
            </button>
            {'.'}
          </span>
        </p>
      )}

      {shown.length === 0 ? (
        // Narrowed to nothing. The good outcome where it is somebody's own queue that
        // has emptied, and not the same claim as the Corpus being clean — the figure
        // above says what is still here, and it belongs to other people. Drawn where
        // the list would have been, because a sentence where a surface belongs reads
        // as a surface that failed to arrive.
        <Card className="border-dashed shadow-none">
          <CardContent>
            <NothingToShow>
              {`Nothing that these Checks found matches what you have narrowed this to. ${count(found, 'Finding')} in this Corpus ${found === 1 ? 'does' : 'do'} not.`}
            </NothingToShow>
          </CardContent>
        </Card>
      ) : (
        <Card className="gap-0 overflow-hidden py-0">
          {/* Flush to the card's edges, so a row and the rule under it run the whole
              width of the surface. Inset, each row read as a paragraph in a document
              rather than as a line in a queue. */}
          <CardContent className="px-0">
            <ul>
              {shown.map((routed) => (
                <Found
                  key={`${routed.finding.cites.at.file}:${routed.finding.cites.at.line}:${routed.finding.says}`}
                  routed={routed}
                  corpusId={corpusId}
                />
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </Surface>
  );
}
