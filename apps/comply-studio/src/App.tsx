import { useEffect, useState } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router';
import type { CorpusSummary } from '@vertuo/comply-contract';
import { fetchCorpus } from './api.js';
import { NothingToShow, Page } from './components/layout.js';
import { CorpusList } from './corpus/CorpusList.js';

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

function Corpus() {
  const [corpus, setCorpus] = useState<CorpusSummary[] | null>(null);
  const [trouble, setTrouble] = useState<string | null>(null);

  useEffect(() => {
    fetchCorpus()
      .then(setCorpus)
      .catch((cause: unknown) => setTrouble(cause instanceof Error ? cause.message : String(cause)));
  }, []);

  if (trouble !== null) return <Page title="Corpus">
    <NothingToShow>{trouble}</NothingToShow>
  </Page>;

  // Nothing yet is not the same fact as nothing at all, so the two never share a
  // sentence: what a Corpus with no knowledge written down says is the list's own.
  if (corpus === null) return <Page title="Corpus">
    <NothingToShow>Reading the shelf.</NothingToShow>
  </Page>;

  return <CorpusList corpus={corpus} />;
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
        <Route path="/corpus" element={<Corpus />} />
      </Routes>
    </div>
  );
}
