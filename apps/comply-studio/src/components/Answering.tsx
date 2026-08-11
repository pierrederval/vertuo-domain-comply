import { useEffect, useState, type ReactNode } from 'react';
import { NothingToShow } from './layout.js';

/**
 * What the Studio shows while an answer is on its way, and what it shows when one
 * cannot be had.
 *
 * Both said in one place, because they are one screen's worth of language and
 * the reader meets them everywhere. Neither is ever a blank page: a surface with
 * nothing on it reads as a broken one, and a person who cannot tell waiting from
 * failing will wait through a failure.
 */
export function Answering<T>({
  ask,
  about,
  children,
}: {
  ask: () => Promise<T>;
  /** What is being asked about. Asking again when it changes is the point. */
  about: string;
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

  if (trouble !== null) return <NothingToShow>{trouble}</NothingToShow>;
  if (answer === null) return <NothingToShow>Reading the shelf.</NothingToShow>;
  return <>{children(answer)}</>;
}
