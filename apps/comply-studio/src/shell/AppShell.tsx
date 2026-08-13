import type { ReactNode } from 'react';
import { Library } from 'lucide-react';
import { Link, Outlet, useLocation } from 'react-router';
import type { CorpusList, CorpusSummary } from '@vertuo/comply-contract';
import { Age } from '../components/Age.js';
import { ReadAgain, type Doing } from '../corpus/ReadAgain.js';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '../components/ui/sidebar.js';
import { DESTINATIONS, OPENS_AT } from './destinations.js';
import { whereTheReaderIs } from './where.js';

/**
 * What the shell was able to find out about the shelf.
 *
 * Held apart from the shelf itself so that not knowing yet and not being able to
 * find out are two states rather than one empty array. A shelf drawn as empty
 * when it could not be read tells a reader their knowledge is gone.
 */
export interface ShelfState {
  /** Both halves of what the shelf holds, or nothing until it has been read. */
  corpus: CorpusList | null;
  trouble: string | null;
}

/**
 * Reading a Corpus's source again, as the shell needs to see it.
 *
 * Narrower than what the App holds: the shell offers the action and says what it is
 * doing, and knows nothing about how many times knowledge has arrived. The count is
 * what tells every *surface* to ask again, which is the App's business and not the
 * frame's.
 */
export interface ReadingTheSource {
  doingTo: (corpusId: string) => Doing;
  read: (corpusId: string) => void;
}

/** Every Corpus on the shelf, as the sidebar's own list of places to go. */
function Shelf({ shelf, reading }: { shelf: ShelfState; reading: string | null }) {
  if (shelf.trouble !== null) {
    /*
     * The shelf could not be read, and only the shelf. The page beside this keeps
     * whatever it managed to answer, because a shell that empties itself when one
     * list fails to arrive turns one failure into all of them — and a reader then
     * cannot tell which of the two happened.
     */
    return <p className="px-2 py-1 text-sm text-muted-foreground">{shelf.trouble}</p>;
  }

  if (shelf.corpus === null) {
    return <p className="px-2 py-1 text-sm text-muted-foreground">Reading the shelf.</p>;
  }

  if (shelf.corpus.corpus.length === 0) {
    /*
     * A menu is somewhere to go, and a set of criteria that could not be followed is
     * nowhere: it has no id and no page, so it is named on the list and not here. But
     * *nothing is on the shelf yet* is what this said about a shelf holding one, which
     * is exactly what a shelf holding nothing says (LAW-006, spec §8).
     */
    return (
      <p className="px-2 py-1 text-sm text-muted-foreground">
        {shelf.corpus.criteriaNotFollowed.length === 0
          ? 'Nothing is on the shelf yet.'
          : 'Nothing on the shelf can be read yet. The list says which file to put right.'}
      </p>
    );
  }

  return (
    <SidebarMenu>
      {shelf.corpus.corpus.map((entry) => (
        <SidebarMenuItem key={entry.id}>
          {/*
            Every word in this list arrived in the payload. A sidebar that draws
            one item per Corpus it was told about cannot learn a business word,
            which is LAW-004 holding by construction rather than by review.

            Where the reader is gets its own ground and its own weight rather than
            the tint the pointer leaves, which the vendored button gives both. Two
            states drawn identically means the rail cannot say which Corpus is open
            while a pointer is anywhere near it.
          */}
          <SidebarMenuButton
            asChild
            isActive={entry.id === reading}
            tooltip={entry.name}
            className="h-9 data-[active=true]:bg-here-quiet data-[active=true]:font-semibold data-[active=true]:text-here"
          >
            <Link to={`/corpus/${encodeURIComponent(entry.id)}`} data-corpus={entry.id}>
              <Library aria-hidden="true" />
              <span>{entry.name}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}

/**
 * The Corpus's own destinations, across the top of it.
 *
 * Drawn as links and not as tab panels, because that is what they are: each one
 * is somewhere a reader can be sent, bookmark, and come back to. A control that
 * looks like navigation and is not is the one thing worse than either.
 *
 * They sit *on* a rule that runs the width of the content, marked underneath. Drawn
 * as a segmented control in a tinted box, which is what this was, they read as a
 * filter over the page below — a control that changes what you are looking at rather
 * than where you are.
 */
function Destinations({ corpusId, standingAt }: { corpusId: string; standingAt: string | null }) {
  const held = `/corpus/${encodeURIComponent(corpusId)}`;

  /*
   * No scrolling box around this row. Three short words never need one, and
   * `overflow-x` on one axis promotes the other to `auto` — so the one pixel each
   * mark hangs below the rule gave the row a vertical scrollbar of its own, a
   * 13-pixel stub beside the destinations on every screen in the product.
   */
  return (
    <nav aria-label="This Corpus" className="flex flex-wrap gap-6 border-b border-line-strong">
      {DESTINATIONS.map((destination) => {
        // Which one reads as current is decided from where the reader is, not from
        // whether this link's own address matches: a Module has no destination of
        // its own and is still somewhere inside one.
        const here = destination.at === standingAt;

        return (
          <Link
            key={destination.at}
            to={`${held}/${destination.at}`}
            data-destination=""
            data-here={here ? '' : undefined}
            aria-current={here ? 'page' : undefined}
            title={destination.describes}
            className={[
              // The mark is on the rule itself and overlaps it, so the current
              // destination reads as attached to the page below rather than as a
              // word with a line under it.
              '-mb-px shrink-0 border-b-2 px-1 pb-2.5 text-sm font-medium transition-colors',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
              here
                ? 'border-here text-here'
                : 'border-transparent text-muted-foreground hover:border-line-strong hover:text-foreground',
            ].join(' ')}
          >
            {destination.label}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * What the reader is looking at, named once, above the heading.
 *
 * The Corpus is named here and the surface is named in the heading, so neither is
 * said twice: a Corpus named twice on one screen reads as two things, and the second
 * one is always the one somebody forgets to change.
 */
function Trail({
  corpus,
  corpusId,
  moduleId,
}: {
  corpus: CorpusSummary | null;
  corpusId: string | null;
  moduleId: string | null;
}) {
  // On the shelf there is no trail to draw: the heading beneath already says a reader
  // is looking at the whole shelf, and the bare word *Corpus* above it named nothing.
  if (corpusId === null) return null;
  // Asked for one, and the shelf has not said what it is yet. A placeholder, because
  // the strip is where a reader looks to find out which Corpus they are in.
  if (corpus === null) return <p className="text-sm text-muted-foreground">Corpus</p>;

  const held = `/corpus/${encodeURIComponent(corpus.id)}`;

  return (
    <nav aria-label="Where this is" className="flex min-w-0 items-center gap-1.5 text-sm">
      {moduleId === null ? (
        <span className="truncate font-medium">{corpus.name}</span>
      ) : (
        <>
          <Link
            to={`${held}/${OPENS_AT}`}
            className="truncate text-muted-foreground underline decoration-transparent underline-offset-4 transition-colors hover:decoration-border hover:text-foreground"
          >
            {corpus.name}
          </Link>
          <span aria-hidden="true" className="text-ink-faint">
            /
          </span>
          <span className="truncate font-medium">{moduleId}</span>
        </>
      )}
    </nav>
  );
}

/**
 * What this surface is, and what it answers, above the surface itself.
 *
 * One heading per screen and it names the *surface*, because the Corpus is already
 * named in the trail above it. Which surface a reader is on was previously said only
 * by which of three words in a row was tinted, and the row said nothing about what
 * any of the three would tell them.
 *
 * The action that reads the source again sits on this line, at the far end. It is the
 * only thing in the product that writes, so it is the one thing on any screen that
 * earns the position — and the page's own content never has to make room for it.
 */
function Titled({
  surface,
  title,
  describes,
  action,
}: {
  surface: string;
  title: string;
  describes: string | null;
  action: ReactNode;
}) {
  return (
    <div
      data-surface={surface}
      className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3"
    >
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold">{title}</h1>
        {describes !== null && (
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">{describes}</p>
        )}
      </div>
      {action}
    </div>
  );
}

/**
 * The frame every surface is read inside (ADR-0018).
 *
 * The shelf on the left, the trail and the age of the reading across the top, the
 * surface named beneath that with the one action beside it, and the Corpus's
 * destinations on the rule under all of it. A surface that cannot say how old its
 * reading is invites false confidence in it.
 *
 * There is no account and no settings here. Neither exists: a Module Owner is
 * free text lifted from a corpus, not somebody who signs in. An affordance for
 * something that does not exist is a lie the interface tells.
 */
export function AppShell({
  shelf,
  reading,
}: {
  shelf: ShelfState;
  reading: ReadingTheSource;
}) {
  const { pathname } = useLocation();
  const { corpusId, moduleId, standingAt } = whereTheReaderIs(
    pathname,
    DESTINATIONS.map((destination) => destination.at),
    OPENS_AT,
  );
  const corpus = shelf.corpus?.corpus.find((entry) => entry.id === corpusId) ?? null;
  const read = corpus?.reading.outcome === 'read' ? corpus.reading.sourceReadAt : null;
  const standing = DESTINATIONS.find((destination) => destination.at === standingAt) ?? null;

  /*
   * What the heading says, in the order of how particular it is. A Module is the
   * thing a reader came to read, so it outranks the destination they came through;
   * failing both, they are on the shelf and the shelf is what they are looking at.
   */
  const titled =
    moduleId !== null
      ? {
          surface: 'module',
          title: moduleId,
          /*
           * A Module is not a destination and has no declaration to be described
           * from, so what this says is the product's own account of the surface and
           * not any corpus's (LAW-004). Written rather than left out, because the
           * block above the destinations would otherwise be one line shorter here —
           * and the row of destinations shifting up as a reader steps into a Module
           * reads as the page having reloaded into something else.
           */
          describes: 'Every Facet this Module’s Lens declares, and what each falls short of.',
        }
      : standing !== null
        ? { surface: standing.at, title: standing.label, describes: standing.describes }
        : { surface: 'shelf', title: 'Every Corpus on the shelf', describes: null };

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader className="h-strip justify-center border-b border-sidebar-border px-3">
          {/*
            The product's own mark, which is a word. A rail whose top-left is a
            heading in the same size as the list under it has no lockup at all, and
            a reader has nothing to tell the frame from the contents.
          */}
          <p className="flex items-center gap-2 text-base font-semibold">
            <span
              aria-hidden="true"
              className="grid size-6 shrink-0 place-items-center rounded-md bg-primary text-xs font-bold text-primary-foreground"
            >
              C
            </span>
            {/* The mark stays when the rail is down to icons; the word is what goes,
                because a rail collapsed to nothing at all has no top-left to read. */}
            <span className="group-data-[collapsible=icon]:hidden">Comply</span>
          </p>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup className="px-3 py-4">
            <SidebarGroupLabel className="px-1 text-xs font-semibold tracking-wide text-ink-faint uppercase">
              Corpus
            </SidebarGroupLabel>
            <SidebarGroupContent className="mt-1">
              <Shelf shelf={shelf} reading={corpusId} />
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>

      <SidebarInset className="min-w-0">
        <header className="flex h-strip shrink-0 items-center gap-3 border-b border-border bg-panel px-gutter">
          <SidebarTrigger className="-ml-1 text-muted-foreground" />
          <Trail corpus={corpus} corpusId={corpusId} moduleId={moduleId} />
          {read !== null && (
            <p className="ml-auto shrink-0 text-sm text-muted-foreground">
              Read from source <Age at={read} />
            </p>
          )}
        </header>

        {/*
          The heading, the action and the destinations are one block on one ground,
          held apart from the surface below by the rule the destinations sit on.
        */}
        <div className="shrink-0 border-b border-border bg-panel px-gutter pt-6">
          <Titled
            surface={titled.surface}
            title={titled.title}
            describes={titled.describes}
            action={
              corpusId !== null && (
                <ReadAgain
                  doing={reading.doingTo(corpusId)}
                  press={() => reading.read(corpusId)}
                />
              )
            }
          />
          {corpusId === null ? (
            // Nothing to sit on the rule, so the block simply ends. An empty row of
            // its own height would read as a row of destinations that failed to draw.
            <div className="h-6" />
          ) : (
            <div className="mt-5">
              <Destinations corpusId={corpusId} standingAt={standingAt} />
            </div>
          )}
        </div>

        <main className="min-w-0 flex-1 px-gutter py-8">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
