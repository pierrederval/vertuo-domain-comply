import { useEffect, useState, type ReactNode } from 'react';
import { Link, Navigate, Route, Routes, useParams, useSearchParams } from 'react-router';
import { fetchCorpus, fetchCorpusDetail, fetchFact, fetchInbox, fetchModule } from './api.js';
import { Answering } from './components/Answering.js';
import { NothingToShow } from './components/layout.js';
import { Card, CardContent } from './components/ui/card.js';
import { CorpusList } from './corpus/CorpusList.js';
import { CorpusMatrix } from './corpus/CorpusMatrix.js';
import { FactDetail } from './corpus/FactDetail.js';
import { Inbox } from './corpus/Inbox.js';
import { ModuleDetail } from './corpus/ModuleDetail.js';
import { AppShell, type ShelfState } from './shell/AppShell.js';
import { DESTINATIONS, OPENS_AT } from './shell/destinations.js';

/**
 * The shelf, read once and shared.
 *
 * The sidebar and the Corpus list are the same answer drawn two ways, so they
 * are asked for once. Asking twice would let the two disagree about what is on
 * the shelf, and a reader would have no way to tell which of them was right.
 */
function useShelf(): ShelfState {
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
  }, []);

  return shelf;
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
  return <CorpusList corpus={shelf.corpus} />;
}

function OneCorpus() {
  const { id } = useParams();
  const asked = id ?? '';

  return (
    <Answering ask={() => fetchCorpusDetail(asked)} about={asked}>
      {(corpus) => <CorpusMatrix corpus={corpus} />}
    </Answering>
  );
}

function OneModule() {
  const { id, moduleId } = useParams();
  const corpus = id ?? '';
  const asked = moduleId ?? '';

  return (
    <Answering ask={() => fetchModule(corpus, asked)} about={`${corpus}/${asked}`}>
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
function TheInbox() {
  const { id } = useParams();
  const [asked] = useSearchParams();
  const corpus = id ?? '';

  return (
    <Answering ask={() => fetchInbox(corpus)} about={corpus}>
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
function OneFact() {
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
    >
      {(held) => <FactDetail held={held} />}
    </Answering>
  );
}

/**
 * A destination that has its place but not yet its content.
 *
 * It says what it will hold rather than standing empty, because a surface with
 * nothing on it reads as a broken one — and a reader who takes an unbuilt
 * surface for a broken one stops trusting the ones that work.
 */
function BeingBuilt({ says }: { says: string }) {
  return <Says>{says}</Says>;
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
  const shelf = useShelf();

  return (
    <Routes>
      <Route element={<AppShell shelf={shelf} />}>
        <Route path="/" element={<Navigate to="/corpus" replace />} />
        <Route path="/corpus" element={<EveryCorpus shelf={shelf} />} />
        {/*
          A Corpus opens where its reading is. The address without a destination
          is kept and redirected rather than removed, so every link to a Corpus
          made before this shell existed still arrives somewhere.
        */}
        <Route path="/corpus/:id" element={<Navigate to={OPENS_AT} replace />} />
        <Route path="/corpus/:id/readiness" element={<OneCorpus />} />
        <Route path="/corpus/:id/inbox" element={<TheInbox />} />
        {DESTINATIONS.filter((destination) => destination.beingBuilt !== undefined).map(
          (destination) => (
            <Route
              key={destination.at}
              path={`/corpus/:id/${destination.at}`}
              element={<BeingBuilt says={destination.beingBuilt ?? ''} />}
            />
          ),
        )}
        <Route path="/corpus/:id/modules/:moduleId" element={<OneModule />} />
        {/*
          A piece of knowledge sits beneath the Module that wrote it down, so a
          reader inside one is still inside that Module — which is what lets the
          shell go on saying where they are without knowing this surface exists.
        */}
        <Route path="/corpus/:id/modules/:moduleId/knowledge" element={<OneFact />} />
        <Route path="*" element={<Nowhere />} />
      </Route>
    </Routes>
  );
}
