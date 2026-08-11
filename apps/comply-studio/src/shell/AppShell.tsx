import { Library } from 'lucide-react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import type { CorpusSummary } from '@vertuo/comply-contract';
import { Age } from '../components/Age.js';
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
  corpus: CorpusSummary[] | null;
  trouble: string | null;
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

  if (shelf.corpus.length === 0) {
    return <p className="px-2 py-1 text-sm text-muted-foreground">Nothing is on the shelf yet.</p>;
  }

  return (
    <SidebarMenu>
      {shelf.corpus.map((entry) => (
        <SidebarMenuItem key={entry.id}>
          {/*
            Every word in this list arrived in the payload. A sidebar that draws
            one item per Corpus it was told about cannot learn a business word,
            which is LAW-004 holding by construction rather than by review.
          */}
          <SidebarMenuButton asChild isActive={entry.id === reading} tooltip={entry.name}>
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
 */
function Destinations({ corpusId }: { corpusId: string }) {
  const held = `/corpus/${encodeURIComponent(corpusId)}`;

  return (
    <nav aria-label="This Corpus" className="inline-flex gap-1 rounded-md bg-muted p-1">
      {DESTINATIONS.map((destination) => (
        <NavLink
          key={destination.at}
          to={`${held}/${destination.at}`}
          data-destination=""
          className={({ isActive }) =>
            [
              'rounded-sm px-3 py-1 text-sm font-medium transition-colors',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
              isActive
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground',
            ].join(' ')
          }
        >
          {destination.label}
        </NavLink>
      ))}
    </nav>
  );
}

/**
 * What the reader is looking at, named once, at the top.
 *
 * The page beneath does not repeat it. One heading for one surface: a Corpus
 * named twice on the same screen reads as two things, and the second one is
 * always the one somebody forgets to change.
 */
function Trail({ corpus, moduleId }: { corpus: CorpusSummary | null; moduleId: string | null }) {
  if (corpus === null) return <h1 className="text-sm font-semibold">Corpus</h1>;

  const held = `/corpus/${encodeURIComponent(corpus.id)}`;

  return (
    <h1 className="flex min-w-0 items-center gap-1.5 text-sm font-semibold">
      {moduleId === null ? (
        <span className="truncate">{corpus.name}</span>
      ) : (
        <>
          <Link
            to={`${held}/${OPENS_AT}`}
            className="truncate font-normal text-muted-foreground hover:text-foreground"
          >
            {corpus.name}
          </Link>
          <span aria-hidden="true" className="text-muted-foreground">
            ›
          </span>
          <span className="truncate">{moduleId}</span>
        </>
      )}
    </h1>
  );
}

/**
 * The frame every surface is read inside (ADR-0018).
 *
 * The shelf on the left, the Corpus's destinations across the top, and the age
 * of its reading always in view — a surface that cannot say how old its reading
 * is invites false confidence in it.
 *
 * There is no account and no settings here. Neither exists: a Module Owner is
 * free text lifted from a corpus, not somebody who signs in. An affordance for
 * something that does not exist is a lie the interface tells.
 */
export function AppShell({ shelf }: { shelf: ShelfState }) {
  const { pathname } = useLocation();
  const { corpusId, moduleId } = whereTheReaderIs(pathname);
  const corpus = shelf.corpus?.find((entry) => entry.id === corpusId) ?? null;
  const read = corpus?.reading.outcome === 'read' ? corpus.reading.sourceReadAt : null;

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <h2 className="px-2 py-1 text-base font-semibold group-data-[collapsible=icon]:hidden">
            Comply
          </h2>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Corpus</SidebarGroupLabel>
            <SidebarGroupContent>
              <Shelf shelf={shelf} reading={corpusId} />
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>

      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-card px-4">
          <SidebarTrigger />
          <Trail corpus={corpus} moduleId={moduleId} />
          {read !== null && (
            <p className="ml-auto shrink-0 text-sm text-muted-foreground">
              Read from source <Age at={read} />
            </p>
          )}
        </header>

        {corpusId !== null && (
          <div className="px-6 pt-6">
            <Destinations corpusId={corpusId} />
          </div>
        )}

        <main className="min-w-0 flex-1 px-6 py-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
