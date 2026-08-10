import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, Navigate, Route, Routes, useParams } from 'react-router';
import { fetchCorpus, fetchCorpusDetail } from './api.js';
import { NothingToShow, Page } from './components/layout.js';
import { CorpusList } from './corpus/CorpusList.js';
import { CorpusMatrix } from './corpus/CorpusMatrix.js';

/**
 * Where a person can go. Three places, and the plural of Corpus is Corpus
 * (spec §5).
 */
const DESTINATIONS = [
  { to: '/home', label: 'Home' },
  { to: '/inbox', label: 'Inbox' },
  { to: '/corpus', label: 'Corpus' },
];

export function Navigation() {
  return (
    <nav className="navigation">
      {DESTINATIONS.map((destination) => (
        <NavLink
          key={destination.to}
          to={destination.to}
          className={({ isActive }) => (isActive ? 'destination here' : 'destination')}
        >
          {destination.label}
        </NavLink>
      ))}
    </nav>
  );
}

/**
 * Home is a work surface, per Corpus, and Inbox is a queue per Owner. Both are
 * their own slices (#25, #23). Until then each says what it will hold rather than
 * standing empty, because an empty screen reads as a broken one.
 */
function Placeholder({ title, children }: { title: string; children: string }) {
  return (
    <Page title={title}>
      <NothingToShow>{children}</NothingToShow>
    </Page>
  );
}

/**
 * What the Studio shows while an answer is on its way, and what it shows when one
 * cannot be had.
 *
 * Both said in one place, because they are one screen's worth of language and
 * the reader meets them everywhere. Neither is ever a blank page: a surface with
 * nothing on it reads as a broken one, and a person who cannot tell waiting from
 * failing will wait through a failure.
 */
function Answering<T>({
  ask,
  about,
  title,
  children,
}: {
  ask: () => Promise<T>;
  /** What is being asked about. Asking again when it changes is the point. */
  about: string;
  title: string;
  children: (answer: T) => ReactNode;
}) {
  const [answer, setAnswer] = useState<T | null>(null);
  const [trouble, setTrouble] = useState<string | null>(null);

  useEffect(() => {
    let listening = true;
    setAnswer(null);
    setTrouble(null);

    ask()
      .then((given) => listening && setAnswer(given))
      .catch((cause: unknown) => {
        if (listening) setTrouble(cause instanceof Error ? cause.message : String(cause));
      });

    return () => {
      listening = false;
    };
    // Asked again when the subject changes, not when the asking is redefined:
    // the caller builds a new function every render, and depending on that would
    // ask forever.
  }, [about]);

  if (trouble !== null) {
    return (
      <Page title={title}>
        <NothingToShow>{trouble}</NothingToShow>
      </Page>
    );
  }
  if (answer === null) {
    return (
      <Page title={title}>
        <NothingToShow>Reading the shelf.</NothingToShow>
      </Page>
    );
  }
  return <>{children(answer)}</>;
}

function EveryCorpus() {
  return (
    <Answering ask={fetchCorpus} about="every" title="Corpus">
      {(corpus) => <CorpusList corpus={corpus} />}
    </Answering>
  );
}

function OneCorpus() {
  const { id } = useParams();
  const asked = id ?? '';

  return (
    <Answering ask={() => fetchCorpusDetail(asked)} about={asked} title="Corpus">
      {(corpus) => <CorpusMatrix corpus={corpus} />}
    </Answering>
  );
}

export function App() {
  return (
    <div className="studio">
      <Navigation />
      <Routes>
        <Route path="/" element={<Navigate to="/corpus" replace />} />
        <Route
          path="/home"
          element={
            <Placeholder title="Home">
              A work surface for one Corpus, with what changed in it, is being built.
            </Placeholder>
          }
        />
        <Route
          path="/inbox"
          element={
            <Placeholder title="Inbox">
              The Findings that route to one person, unowned ones first, are being built.
            </Placeholder>
          }
        />
        <Route path="/corpus" element={<EveryCorpus />} />
        <Route path="/corpus/:id" element={<OneCorpus />} />
      </Routes>
    </div>
  );
}
