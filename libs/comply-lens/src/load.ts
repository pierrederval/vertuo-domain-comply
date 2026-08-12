import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { lensSchema, type Lens } from './lens.js';
import {
  everyReason,
  NOT_WRITTEN_AS_CRITERIA,
  thereIsNoSuchFile,
  whyItCannotBeFollowed,
} from './refusal.js';

/**
 * The criteria one Corpus is read through, or a sentence saying why it cannot be.
 *
 * Both ways of failing come back as the same sentence, because they are the same
 * fact to whoever is holding the file: nothing about this Corpus can be read yet,
 * and here is what to change. A file nobody could read at all and a file whose
 * rules refused it differ only in the reason, which is where the difference
 * belongs (spec §8).
 */
export async function loadLens(path: string): Promise<Lens> {
  let written: string;
  try {
    written = await readFile(path, 'utf8');
  } catch (cause) {
    throw new Error(thereIsNoSuchFile(path), { cause });
  }

  let said: unknown;
  try {
    said = JSON.parse(written);
  } catch (cause) {
    throw new Error(whyItCannotBeFollowed(path, [NOT_WRITTEN_AS_CRITERIA]), { cause });
  }

  const read = lensSchema.safeParse(said);
  if (!read.success) {
    throw new Error(whyItCannotBeFollowed(path, everyReason(read.error.issues)));
  }

  const lens = read.data;
  return {
    ...lens,
    adapter: { ...lens.adapter, root: resolve(dirname(path), lens.adapter.root) },
  };
}
