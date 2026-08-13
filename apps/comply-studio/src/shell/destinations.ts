import { Grid2x2Check, House, Inbox, type LucideIcon } from 'lucide-react';

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
  /**
   * The figure a reader picks this out of a list by.
   *
   * Declared beside the name rather than mapped where the list is drawn, so adding a
   * fourth destination is one entry here and not one entry plus a lookup somebody
   * finds out about when the fourth one draws with nothing beside it.
   */
  icon: LucideIcon;
  /**
   * The question this surface answers, in one line.
   *
   * Required rather than optional, so a fourth destination cannot arrive as a bare
   * word in a row of bare words. Three of them were exactly that, and a reader who
   * has never met this product cannot tell *Readiness* from *Inbox* by name alone —
   * which left the row of destinations to be learned by clicking all of it.
   *
   * A Facet says what it is from the Lens (ADR-0019) for the same reason, and this is
   * that decision applied to the product’s own surfaces rather than to a corpus’s
   * Facets. These are the product’s words and never a business’s, which is why they
   * can be written here at all (LAW-004).
   */
  describes: string;
}

export const DESTINATIONS: Destination[] = [
  {
    at: 'home',
    label: 'Home',
    icon: House,
    describes: 'What needs a person in this Corpus, and what moved in it.',
  },
  {
    at: 'readiness',
    label: 'Readiness',
    icon: Grid2x2Check,
    describes: 'Every Module against every Facet its Lens declares.',
  },
  {
    at: 'inbox',
    label: 'Inbox',
    icon: Inbox,
    /*
     * It said *as a queue for whoever answers for it*, which described a page drawn as
     * one card per person. It is one list a reader narrows now, and every row says who
     * answers for it — so the sentence describes the shape a reader will meet rather
     * than the one it replaced (ADR-0041).
     */
    describes: 'Every Finding in this Corpus, and who answers for each of them.',
  },
];

/**
 * One destination, by the address it lives at.
 *
 * Here rather than beside whatever needs it, because three surfaces draw a way in to
 * a destination they are not on — the two readings, wherever that pair appears — and
 * each of them needs the same three things about it: its figure, its address and what
 * it says it answers. A copy of this lookup per surface is three chances for a tile to
 * point at Readiness and describe the queue.
 *
 * Looked up by address because that is the one part of a destination that is also an
 * address: a label can be renamed and every caller here goes on pointing at the right
 * page. It throws rather than answering with nothing, because a destination missing
 * from this list is a rail missing an entry too — and a tile that has quietly stopped
 * being a way in is the one failure on these surfaces that nothing else reports.
 */
export function destinationAt(at: string): Destination {
  const found = DESTINATIONS.find((entry) => entry.at === at);
  if (found === undefined) throw new Error(`No destination is declared at "${at}"`);
  return found;
}

/**
 * Where a Corpus opens when a reader arrives with nothing more specific in mind.
 *
 * Home, which is the work surface: what needs a person in this Corpus, and what moved
 * in it. A reader arriving is asking what to do, and that is the surface that answers
 * it.
 *
 * It was the grid, and the reason was real rather than a preference. Read down a
 * column, a Facet absent in *every* Module is as often a Lens declaring something this
 * business does not have as it is work nobody has begun — a defect in the denominator,
 * silently deflating every figure Home draws — and no list of rows can show it. Opening
 * at the grid put a reader in front of the one view that could, before they met any
 * figure.
 *
 * What moved is not that reasoning but the need to spend a landing page on it. Home now
 * states which Facets nobody has begun, in its own words, beneath the figures they
 * qualify (`facetsNobodyHasBegun`, ADR-0040) — so the warning travels with the figures
 * instead of being kept one page upstream of them, which is where it belonged. The grid
 * is still the only place that column can be *read*, and Home says so and points at it.
 */
export const OPENS_AT = 'home';
