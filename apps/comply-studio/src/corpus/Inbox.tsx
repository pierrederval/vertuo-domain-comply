import { Link } from 'react-router';
import type { CitedPlace, CorpusInbox, InboxFinding, RoutedFindings } from '@vertuo/comply-contract';
import { WhyThereIsNoReading } from '../components/NoReading.js';
import { Conspicuous, NothingToShow, Surface } from '../components/layout.js';
import { opensAt, Where } from '../components/Where.js';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card.js';
import { count } from '../words.js';

/**
 * One queue's own page, so a person can bookmark theirs and be sent it (spec §5.2).
 *
 * Nobody's queue is addressed by the empty value, which is the one value that can
 * never be somebody's: an Owner is free text lifted from a corpus, so any word
 * reserved here is a word some corpus can write, and a reader would then be sent a
 * stranger's queue under their own name. Every owner field in the agreement refuses
 * an empty name, and that is what makes the empty one free.
 */
function queueAt(corpusId: string, owner: string | null): string {
  return `/corpus/${encodeURIComponent(corpusId)}/inbox?owner=${encodeURIComponent(owner ?? '')}`;
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
            className="overflow-x-auto rounded-md bg-muted p-3 text-sm whitespace-pre-wrap"
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
 * What was found, which Module it is about, and every place it concerns with the
 * text at each. Nothing to do to it but read it: a Finding is resolved by the
 * knowledge changing and the Finding no longer being found, so there is nothing here
 * to dismiss it, hide it, or remember having seen it — nothing in this product may
 * hold what a rebuild could not reproduce (LAW-011), and a control for it is how such
 * a thing arrives.
 */
function Found({ finding, corpusId }: { finding: InboxFinding; corpusId: string }) {
  return (
    <li data-finding="" className="flex flex-col gap-2 border-t border-border pt-4 first:border-0 first:pt-0">
      <p>{finding.says}</p>
      <p className="text-sm text-muted-foreground">
        {finding.moduleId === null ? (
          // The only place in the product this Finding appears at all. No Module's
          // page can show it, because showing it there would make it look answered
          // for by somebody.
          <Conspicuous>This belongs to no Module, so no Module’s page shows it.</Conspicuous>
        ) : (
          <>
            {'In '}
            <Link
              to={moduleAt(corpusId, finding.moduleId)}
              className="text-foreground underline underline-offset-4"
            >
              {finding.moduleId}
            </Link>
          </>
        )}
      </p>
      <Cited cited={finding.cites} corpusId={corpusId} />
      {finding.alsoCites.map((also) => (
        <Cited key={`${also.at.file}:${also.at.line}`} cited={also} corpusId={corpusId} also />
      ))}
    </li>
  );
}

/**
 * Everything reaching one person, or everything reaching nobody.
 *
 * The queue reaching nobody says what nobody answering for it costs, and not only
 * that nobody does. A mark says there is a defect; a reader who does not know why the
 * top of the page is loud reads the mark as decoration (LAW-007).
 */
function Queue({
  queue,
  corpusId,
  narrowed,
}: {
  queue: RoutedFindings;
  corpusId: string;
  narrowed: boolean;
}) {
  const { owner, findings } = queue;

  return (
    <Card data-queue={owner ?? ''}>
      <CardHeader>
        <CardTitle>
          {owner === null ? <Conspicuous>Routes to nobody</Conspicuous> : owner}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {/*
            Not *until somebody answers for the Module each belongs to*: some of
            these belong to no Module, so there is no Module to name anybody
            against, and each of those says so where it is. What is true of all of
            them is that nobody has been named.
          */}
          {owner === null
            ? `${count(findings.length, 'Finding')}, and nothing will be done about them until somebody is named to answer for them.`
            : `${count(findings.length, 'Finding')} to answer for.`}
        </p>
        {/*
          Somewhere to be sent, rather than a control that hides the rest of the
          page. A reader already looking at one queue has nowhere to be sent to.
        */}
        {!narrowed && (
          <p className="text-sm">
            <Link
              to={queueAt(corpusId, owner)}
              className="text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              This queue on its own
            </Link>
          </p>
        )}
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-4">
          {findings.map((finding) => (
            <Found
              key={`${finding.cites.at.file}:${finding.cites.at.line}:${finding.says}`}
              finding={finding}
              corpusId={corpusId}
            />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

/**
 * One Corpus's Findings as a queue apiece, the ones reaching nobody first
 * (spec §5.2).
 *
 * The other reading, become a list of specific work for a named person. The queue
 * reaching nobody is deliberately the loudest thing here: a violation belonging to
 * nobody is how a knowledge base quietly dies, and mixed in among named queues these
 * reproduce exactly the failure LAW-007 exists to prevent.
 *
 * A queue can be read on its own, so that somebody can bookmark theirs — and it is
 * still told what reaches nobody, because a bookmark is otherwise how the loudest
 * thing on a page stops being seen.
 *
 * Every figure here is the whole Corpus's and is stated against the Checks that ran.
 * A narrowed page reporting its own slice as the total is how a queue comes to look
 * finished (LAW-006). There is no figure for how much of a queue somebody has dealt
 * with, because no such reading has a denominator a rebuild could reproduce.
 *
 * Nothing here knows what any of it is called. Every name, every person and every
 * sentence a Check wrote arrives in the payload, so this draws the Findings of a
 * Corpus it has never met without being changed (LAW-004).
 */
export function Inbox({
  inbox,
  narrowedTo,
}: {
  inbox: CorpusInbox;
  /**
   * Whose queue to show on its own: a name, the empty value for the one reaching
   * nobody, or nothing at all for the whole Inbox.
   */
  narrowedTo: string | null;
}) {
  const { reading } = inbox;

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
  const found = routesTo.reduce((so, queue) => so + queue.findings.length, 0);
  const nobody = routesTo.find((queue) => queue.owner === null) ?? null;
  const shown =
    narrowedTo === null
      ? routesTo
      : routesTo.filter((queue) => (queue.owner ?? '') === narrowedTo);

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

  return (
    <Surface>
      <p className="text-sm text-muted-foreground">
        {`${count(found, 'Finding')} in this Corpus, from ${ran}.`}
      </p>

      {narrowedTo !== null && (
        <p className="text-sm text-muted-foreground">
          {narrowedTo === ''
            ? 'Showing only what routes to nobody. '
            : `Showing only what routes to “${narrowedTo}”. `}
          <Link
            to={`/corpus/${encodeURIComponent(corpusId)}/inbox`}
            className="text-foreground underline underline-offset-4"
          >
            Everything in this Corpus
          </Link>
          {' is the rest of it.'}
        </p>
      )}

      {/*
        Said on somebody's own queue too, because a bookmark is how the top of this
        page stops being read. Not said on nobody's own queue, where it would be
        the page telling a reader twice what they are already looking at.
      */}
      {narrowedTo !== null && narrowedTo !== '' && nobody !== null && (
        <p className="text-sm">
          <Conspicuous>
            {`${count(nobody.findings.length, 'Finding')} in this Corpus ${nobody.findings.length === 1 ? 'routes' : 'route'} to nobody.`}
          </Conspicuous>{' '}
          <Link to={queueAt(corpusId, null)} className="underline underline-offset-4">
            Read them
          </Link>
          {'.'}
        </p>
      )}

      {shown.length === 0 ? (
        // A bookmarked queue that has emptied. The good outcome, and not the same
        // claim as the Corpus being clean — the figure above says what is still
        // here, and it belongs to other people. Drawn where a queue would have
        // been, because a sentence where every other queue is a surface reads as a
        // surface that failed to arrive.
        <Card className="border-dashed shadow-none">
          <CardContent>
            <NothingToShow>
              {narrowedTo === ''
                ? 'Nothing that these Checks found routes to nobody.'
                : `Nothing that these Checks found routes to “${narrowedTo ?? ''}”.`}
            </NothingToShow>
          </CardContent>
        </Card>
      ) : (
        shown.map((queue) => (
          <Queue
            key={queue.owner ?? ''}
            queue={queue}
            corpusId={corpusId}
            narrowed={narrowedTo !== null}
          />
        ))
      )}
    </Surface>
  );
}
