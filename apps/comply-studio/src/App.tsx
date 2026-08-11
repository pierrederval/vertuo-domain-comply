import { useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes, useParams } from 'react-router';
import { fetchCorpus, fetchCorpusDetail, fetchModule } from './api.js';
import { Answering } from './components/Answering.js';
import { NothingToShow, Page } from './components/layout.js';
import { CorpusList } from './corpus/CorpusList.js';
import { CorpusMatrix } from './corpus/CorpusMatrix.js';
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

function EveryCorpus({ shelf }: { shelf: ShelfState }) {
  if (shelf.trouble !== null) {
    return (
      <Page title="Corpus">
        <NothingToShow>{shelf.trouble}</NothingToShow>
      </Page>
    );
  }
  if (shelf.corpus === null) {
    return (
      <Page title="Corpus">
        <NothingToShow>Reading the shelf.</NothingToShow>
      </Page>
    );
  }
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
 * A destination that has its place but not yet its content.
 *
 * It says what it will hold rather than standing empty, because a surface with
 * nothing on it reads as a broken one — and a reader who takes an unbuilt
 * surface for a broken one stops trusting the ones that work.
 */
function BeingBuilt({ label, says }: { label: string; says: string }) {
  return (
    <Page title={label}>
      <NothingToShow>{says}</NothingToShow>
    </Page>
  );
}

/** Nothing is kept at the address the reader arrived at. */
function Nowhere() {
  return (
    <Page title="Nothing here">
      <NothingToShow>
        Nothing is kept at that address.{' '}
        <Link to="/corpus" className="underline">
          Every Corpus on the shelf
        </Link>{' '}
        is a place to start.
      </NothingToShow>
    </Page>
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
        {DESTINATIONS.filter((destination) => destination.beingBuilt !== undefined).map(
          (destination) => (
            <Route
              key={destination.at}
              path={`/corpus/:id/${destination.at}`}
              element={
                <BeingBuilt label={destination.label} says={destination.beingBuilt ?? ''} />
              }
            />
          ),
        )}
        <Route path="/corpus/:id/modules/:moduleId" element={<OneModule />} />
        <Route path="*" element={<Nowhere />} />
      </Route>
    </Routes>
  );
}
