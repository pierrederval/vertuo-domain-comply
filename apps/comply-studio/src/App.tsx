import { useEffect, useState, type ReactNode } from 'react';
import { Link, Navigate, Route, Routes, useParams, useSearchParams } from 'react-router';
import {
  fetchCorpus,
  fetchCorpusDetail,
  fetchFact,
  fetchHome,
  fetchInbox,
  fetchModule,
  readSourceAgain,
} from './api.js';
import { Answering } from './components/Answering.js';
import { NothingToShow, Surface } from './components/layout.js';
import { Card, CardContent } from './components/ui/card.js';
import { CorpusHome } from './corpus/CorpusHome.js';
import { CorpusList } from './corpus/CorpusList.js';
import { CorpusMatrix } from './corpus/CorpusMatrix.js';
import { FactDetail } from './corpus/FactDetail.js';
import { Inbox } from './corpus/Inbox.js';
import { ModuleDetail } from './corpus/ModuleDetail.js';
import { ReadAgain, type Doing } from './corpus/ReadAgain.js';
import { AppShell, type ShelfState } from './shell/AppShell.js';
import { OPENS_AT } from './shell/destinations.js';
import { theOneCorpusToOpen } from './shell/where.js';

/** Reading a Corpus's source again, as every surface that has to ask again sees it. */
type ReadingTheSource = ReturnType<typeof useReadingTheSource>;

/**
 * The shelf, read once and shared.
 *
 * The sidebar and the Corpus list are the same answer drawn two ways, so they
 * are asked for once. Asking twice would let the two disagree about what is on
 * the shelf, and a reader would have no way to tell which of them was right.
 *
 * Read again whenever a Corpus's source has been. The age of a reading is drawn in
 * the shell from this answer, so a shelf read once at start-up would report the old
 * age for the rest of the session — beside a page drawn from the new knowledge.
 */
function useShelf(since: number): ShelfState {
  const [shelf, setShelf] = useState<ShelfState>({ corpus: null, trouble: null });

  useEffect(() => {
    let listening = true;

    fetchCorpus()
      .then((corpus) => listening && setShelf({ corpus, trouble: null }))
      .catch((cause: unknown) => {
        if (!listening) return;
        setShelf({
          corpus: null,
          trouble: cause instanceof Error ? cause.message : String(cause),
        });
      });

    return () => {
      listening = false;
    };
  }, [since]);

  return shelf;
}

/**
 * Reading a Corpus's source again: what it is doing, and how many times it has
 * brought knowledge in.
 *
 * Held here rather than beside the button, because what a read changes is not the
 * button. Every surface in the Studio is derived from the knowledge on the shelf, so
 * every one of them has to ask again — and the count is what tells them to.
 *
 * `brought` counts only reads that wrote something down. Bumping it on a read that
 * found nothing would send every surface off to ask for knowledge nobody has changed,
 * and the common press is exactly that one.
 *
 * What it is doing is remembered against the Corpus it is about. A reader who presses
 * this and walks to another Corpus is not owed a sentence about a source they are no
 * longer looking at.
 */
function useReadingTheSource(): {
  brought: number;
  doingTo: (id: string) => Doing;
  read: (id: string) => void;
} {
  const [brought, setBrought] = useState(0);
  const [doing, setDoing] = useState<{ about: string; doing: Doing } | null>(null);

  return {
    brought,
    doingTo: (id) => (doing?.about === id ? doing.doing : { at: 'ready' }),
    read: (id) => {
      setDoing({ about: id, doing: { at: 'reading' } });

      readSourceAgain(id)
        .then((said) => {
          setDoing({
            about: id,
            doing:
              said.outcome === 'read'
                ? { at: 'read', unchangedAtSource: said.unchangedAtSource }
                : { at: 'could-not-read', because: said.because },
          });
          // Only where knowledge arrived. Everything on screen is a reading of what
          // is on the shelf, and where nothing was written down there is nothing new
          // for any of them to read.
          if (said.outcome === 'read' && !said.unchangedAtSource) {
            setBrought((count) => count + 1);
          }
        })
        .catch((cause: unknown) => {
          setDoing({
            about: id,
            doing: {
              at: 'could-not-read',
              because: cause instanceof Error ? cause.message : String(cause),
            },
          });
        });
    },
  };
}

/** A sentence where a surface would be, drawn as a surface so it reads as one. */
function Says({ children }: { children: ReactNode }) {
  return (
    <Card className="border-dashed shadow-none">
      <CardContent>
        <NothingToShow>{children}</NothingToShow>
      </CardContent>
    </Card>
  );
}

function EveryCorpus({ shelf }: { shelf: ShelfState }) {
  if (shelf.trouble !== null) return <Says>{shelf.trouble}</Says>;
  if (shelf.corpus === null) return <Says>Reading the shelf.</Says>;
  return <CorpusList corpus={shelf.corpus.corpus} criteriaNotFollowed={shelf.corpus.criteriaNotFollowed} />;
}

/**
 * The grid.
 *
 * The action that reads the source again was drawn here, because this is where a
 * Corpus opens. It is in the frame now, so it is in reach from a queue and from what
 * moved as well — and a Corpus with nothing written down yet still meets it, which is
 * the state it exists to get a reader out of (ADR-0035).
 */
function OneCorpus({ reading }: { reading: ReadingTheSource }) {
  const { id } = useParams();
  const asked = id ?? '';

  return (
    <Answering ask={() => fetchCorpusDetail(asked)} about={asked} since={reading.brought}>
      {(corpus) => <CorpusMatrix corpus={corpus} />}
    </Answering>
  );
}

/** What needs a person in one Corpus, and what moved in it. */
function WhatNeedsWork({ reading }: { reading: ReadingTheSource }) {
  const { id } = useParams();
  const asked = id ?? '';

  return (
    <Answering ask={() => fetchHome(asked)} about={asked} since={reading.brought}>
      {(corpus) => <CorpusHome corpus={corpus} />}
    </Answering>
  );
}

function OneModule({ reading }: { reading: ReadingTheSource }) {
  const { id, moduleId } = useParams();
  const corpus = id ?? '';
  const asked = moduleId ?? '';

  return (
    <Answering
      ask={() => fetchModule(corpus, asked)}
      about={`${corpus}/${asked}`}
      since={reading.brought}
    >
      {(module) => <ModuleDetail module={module} />}
    </Answering>
  );
}

/**
 * One Corpus's Findings, worked as a queue apiece.
 *
 * Whose queue is read off the address, so a person can bookmark theirs and be sent
 * it: a name, the empty value for the one reaching nobody, or nothing at all for the
 * whole Inbox. The three are told apart because they are three different pages, and
 * an empty name is the one value no Owner can ever have.
 *
 * The whole Inbox is asked for whichever it is, and narrowing does not ask again —
 * every figure on the page is the Corpus's, and a page that re-asked per person
 * could report its own slice as the total.
 */
function TheInbox({ reading }: { reading: ReadingTheSource }) {
  const { id } = useParams();
  const [asked] = useSearchParams();
  const corpus = id ?? '';

  return (
    <Answering ask={() => fetchInbox(corpus)} about={corpus} since={reading.brought}>
      {(inbox) => <Inbox inbox={inbox} narrowedTo={asked.get('owner')} />}
    </Answering>
  );
}

/**
 * One piece of knowledge, opened at the place it is written down.
 *
 * The place arrives as the two things it is, and is checked before anything is
 * asked for: an address holding no place, or a line no editor could go to, is an
 * address with nothing kept at it and is answered as one rather than as knowledge
 * the shelf is short of.
 */
function OneFact({ reading }: { reading: ReadingTheSource }) {
  const { id, moduleId } = useParams();
  const [asked] = useSearchParams();
  const corpus = id ?? '';
  const module = moduleId ?? '';
  const file = asked.get('in') ?? '';
  const line = Number(asked.get('line'));

  if (file === '' || !Number.isInteger(line) || line < 1) return <Nowhere />;

  return (
    <Answering
      ask={() => fetchFact(corpus, module, { file, line })}
      about={`${corpus}/${module}/${file}/${line}`}
      since={reading.brought}
    >
      {(held) => <FactDetail held={held} />}
    </Answering>
  );
}

/**
 * Where a reader arriving at the product is put.
 *
 * Into the one Corpus where the shelf holds one, and into the shelf otherwise. It waits
 * rather than guessing: sending somebody into a Corpus on the strength of a shelf that
 * has not been read yet is sending them to a page that has nothing on it, and the wait
 * is one answer long.
 */
function Arriving({ shelf }: { shelf: ShelfState }) {
  const only = theOneCorpusToOpen(shelf.corpus);

  if (shelf.corpus === null && shelf.trouble === null) return <Says>Reading the shelf.</Says>;
  if (only === null) return <Navigate to="/corpus" replace />;

  return <Navigate to={`/corpus/${encodeURIComponent(only)}/${OPENS_AT}`} replace />;
}

/** Nothing is kept at the address the reader arrived at. */
function Nowhere() {
  return (
    <Says>
      Nothing is kept at that address.{' '}
      <Link to="/corpus" className="underline underline-offset-4">
        Every Corpus on the shelf
      </Link>{' '}
      is a place to start.
    </Says>
  );
}

export function App() {
  const reading = useReadingTheSource();
  const shelf = useShelf(reading.brought);

  return (
    <Routes>
      <Route element={<AppShell shelf={shelf} reading={reading} />}>
        {/*
          Where arriving lands. A shelf holding one Corpus has nothing to choose
          between, so a reader is put into it rather than shown a list of one — and
          into the surface it opens at, which is the work.

          Only from the bare address. The shelf keeps its own, so *every Corpus on the
          shelf* still goes there and does not bounce straight back to the Corpus a
          reader just left it for. Until the shelf has been read, and wherever anything
          on it could not be read at all, this stays the list (ADR-0040).
        */}
        <Route path="/" element={<Arriving shelf={shelf} />} />
        <Route path="/corpus" element={<EveryCorpus shelf={shelf} />} />
        {/*
          A Corpus opens where its reading is. The address without a destination
          is kept and redirected rather than removed, so every link to a Corpus
          made before this shell existed still arrives somewhere.
        */}
        <Route path="/corpus/:id" element={<Navigate to={OPENS_AT} replace />} />
        <Route path="/corpus/:id/home" element={<WhatNeedsWork reading={reading} />} />
        <Route path="/corpus/:id/readiness" element={<OneCorpus reading={reading} />} />
        <Route path="/corpus/:id/inbox" element={<TheInbox reading={reading} />} />
        <Route path="/corpus/:id/modules/:moduleId" element={<OneModule reading={reading} />} />
        {/*
          A piece of knowledge sits beneath the Module that wrote it down, so a
          reader inside one is still inside that Module — which is what lets the
          shell go on saying where they are without knowing this surface exists.
        */}
        <Route path="/corpus/:id/modules/:moduleId/knowledge" element={<OneFact reading={reading} />} />
        <Route path="*" element={<Nowhere />} />
      </Route>
    </Routes>
  );
}
