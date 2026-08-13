/**
 * Where a reader is, read off the address they are at.
 *
 * The shell needs this and the pages do not: a page is handed what it draws,
 * while the shell has to say which Corpus is being read and what to put in the
 * trail without fetching anything of its own. Kept as a function over a string
 * so it can be checked directly, rather than by rendering a shell and reading
 * the result back out of it.
 */
export interface Whereabouts {
  /** The Corpus being read, or nothing when the reader is on the shelf. */
  corpusId: string | null;
  /** The Module opened inside it, if one is. */
  moduleId: string | null;
  /**
   * Which of the Corpus's destinations reads as the one being stood at.
   *
   * A Module is not a destination of its own — it is drilled into from where the
   * Corpus opens — so a reader inside one is still standing where they descended
   * from. Marking nothing there would leave the row of destinations saying the
   * reader is nowhere in the Corpus they are plainly inside.
   */
  standingAt: string | null;
}

const NOWHERE_IN_PARTICULAR: Whereabouts = {
  corpusId: null,
  moduleId: null,
  standingAt: null,
};

/**
 * The one Corpus a reader arriving at the product should be put into, if there is one.
 *
 * A shelf holding exactly one Corpus has nothing to choose between, and a list of one
 * is a decision asked of somebody who has none to make — so arriving lands them in it.
 *
 * Two things it refuses, both deliberate. It says nothing until the shelf has actually
 * been read: sending a reader somewhere on the strength of an empty array is sending
 * them nowhere. And it stays put where anything on the shelf could not be read at all,
 * because a set of criteria that could not be followed has no page of its own — the
 * shelf is the only surface that names it, and skipping past it hides the one thing
 * there that somebody has to fix (ADR-0035).
 *
 * Only what a reader arriving is sent to. The shelf keeps its own address, so *every
 * Corpus on the shelf* still goes there and does not bounce straight back.
 */
export function theOneCorpusToOpen(
  shelf: { corpus: readonly { id: string }[]; criteriaNotFollowed: readonly unknown[] } | null,
): string | null {
  if (shelf === null) return null;
  if (shelf.criteriaNotFollowed.length > 0) return null;
  return shelf.corpus.length === 1 ? shelf.corpus[0]!.id : null;
}

export function whereTheReaderIs(
  pathname: string,
  destinations: readonly string[],
  opensAt: string,
): Whereabouts {
  const [, held, corpusId, beneath, moduleId] = pathname.split('/');

  if (held !== 'corpus' || corpusId === undefined || corpusId === '') {
    return NOWHERE_IN_PARTICULAR;
  }

  const inAModule = beneath === 'modules' && moduleId !== undefined && moduleId !== '';
  const named = beneath !== undefined && destinations.includes(beneath);

  return {
    corpusId: decodeURIComponent(corpusId),
    // Decoded, because a name is what a reader is shown and an address is only
    // how it travelled.
    moduleId: inAModule ? decodeURIComponent(moduleId) : null,
    standingAt: named ? beneath : opensAt,
  };
}
