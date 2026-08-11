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
}

const NOWHERE_IN_PARTICULAR: Whereabouts = { corpusId: null, moduleId: null };

export function whereTheReaderIs(pathname: string): Whereabouts {
  const [, held, corpusId, beneath, moduleId] = pathname.split('/');

  if (held !== 'corpus' || corpusId === undefined || corpusId === '') {
    return NOWHERE_IN_PARTICULAR;
  }

  const inAModule = beneath === 'modules' && moduleId !== undefined && moduleId !== '';

  return {
    corpusId: decodeURIComponent(corpusId),
    // Decoded, because a name is what a reader is shown and an address is only
    // how it travelled.
    moduleId: inAModule ? decodeURIComponent(moduleId) : null,
  };
}
