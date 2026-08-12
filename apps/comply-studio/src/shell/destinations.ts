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
}

export const DESTINATIONS: Destination[] = [
  { at: 'home', label: 'Home' },
  { at: 'readiness', label: 'Readiness' },
  { at: 'inbox', label: 'Inbox' },
];

/**
 * Where a Corpus opens when a reader arrives with nothing more specific in mind.
 *
 * The grid, and not Home, though Home is the work surface and stands first in the
 * row. The grid carries a reading nothing else in the product can give: read down a
 * column, a Facet absent in *every* Module is as often a Lens declaring something
 * this business does not have as it is work nobody has begun — a defect in the
 * denominator, silently deflating every figure Home draws. Opening at Home would put
 * figures in front of the one view that can tell a reader those figures are counted
 * out of one too many.
 *
 * This moves when Home's work list is meaningfully shorter than the Corpus. Today no
 * Module in any Corpus on any shelf has every Facet its Lens declares approved, so
 * that list *is* the whole grid without its cells, and the grid says more in the same
 * space. Both are one click apart either way, which is what the redirect above is
 * for.
 */
export const OPENS_AT = 'readiness';
