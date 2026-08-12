import { join } from 'node:path';

/**
 * The three things a shelf holds, and where each of them sits.
 *
 * The knowledge as written down, the readings put on record, and the criteria each
 * of those readings was taken through. The last of the three is answerable nowhere
 * else: a Lens is hand-authored and changes in place, so *which criteria were in
 * force last Tuesday* cannot be got from the file itself, and a reading nobody can
 * work out again is a reading holding history that cannot be recomputed — which is
 * what LAW-011 refuses and what ADR-0016 closes.
 *
 * Said once, here, because both the runner and the server write to and read from the
 * same shelf. Two spellings of one layout is how a build comes to put a reading
 * somewhere a person is never shown it.
 *
 * Not called `lenses`. The DDD Corpus's shelf **is** the directory called `lenses`,
 * so that name would put held criteria at `lenses/lenses/` — a path somebody would
 * have to read twice to be sure of, in the one place a person goes looking when a
 * figure has moved and they want to know whether the bar did.
 */
export interface Shelf {
  /** Where the knowledge written down from source is kept. */
  seeds: string;
  /** Where readings put on record are kept, which is what a trend is stated against. */
  readings: string;
  /** Where the criteria a recorded reading was taken through are kept. */
  criteria: string;
}

export function shelfAt(dir: string): Shelf {
  return {
    seeds: join(dir, 'seeds'),
    readings: join(dir, 'runs'),
    criteria: join(dir, 'lens-versions'),
  };
}
