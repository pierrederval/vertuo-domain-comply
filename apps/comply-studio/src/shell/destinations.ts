/**
 * Where a person can go inside one Corpus.
 *
 * Three, and every one of them belongs to a Corpus rather than to the shelf.
 * Home is a work surface *per Corpus* and no global figure exists anywhere in
 * the product, so a shelf-wide Home would have nothing to put on it. The Inbox
 * is per Corpus for a sharper reason: an Owner is free text lifted from a
 * corpus, and two corpora spell the same person differently — a shelf-wide
 * queue would merge two people the product cannot yet prove are one.
 *
 * Declared here and drawn by the shell, so adding a fourth is one line and not a
 * fourth idea about how navigation works.
 */
export interface Destination {
  /** The last part of the address, beneath the Corpus. */
  at: string;
  label: string;
  /** What is not built yet says so where it stands, rather than standing empty. */
  beingBuilt?: string;
}

export const DESTINATIONS: Destination[] = [
  {
    at: 'home',
    label: 'Home',
    beingBuilt: 'What needs work in this Corpus, and what changed in it, is being built.',
  },
  { at: 'readiness', label: 'Readiness' },
  { at: 'inbox', label: 'Inbox' },
];

/** Where a Corpus opens when a reader arrives with nothing more specific in mind. */
export const OPENS_AT = 'readiness';
