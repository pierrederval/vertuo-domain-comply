import {
  corpusDetailSchema,
  corpusListSchema,
  type CorpusDetail,
  type CorpusSummary,
} from '@vertuo/comply-contract';

/**
 * Everything the Studio asks the server for, and the one place an answer is
 * checked against what both sides agreed it would be.
 *
 * Validated on arrival rather than trusted. An answer that does not match the
 * agreement is a fault at the boundary, and saying so is better than drawing half
 * a screen from it and leaving a reader to wonder which half is missing.
 */
export async function fetchCorpus(): Promise<CorpusSummary[]> {
  const response = await fetch('/corpus');
  if (!response.ok) throw new Error('The Studio could not reach the knowledge it holds.');

  const answer = corpusListSchema.safeParse(await response.json());
  if (!answer.success) throw new Error('The Studio was sent something it could not read.');

  return answer.data.corpus;
}

/** The whole reading of one Corpus: the grid, the two figures, and their age. */
export async function fetchCorpusDetail(id: string): Promise<CorpusDetail> {
  const response = await fetch(`/corpus/${encodeURIComponent(id)}/reading`);
  // Told apart from being unable to reach the server at all, because one of the
  // two is answered by looking somewhere else and the other by waiting.
  if (response.status === 404) throw new Error('No Corpus of that name is on the shelf.');
  if (!response.ok) throw new Error('The Studio could not reach the knowledge it holds.');

  const answer = corpusDetailSchema.safeParse(await response.json());
  if (!answer.success) throw new Error('The Studio was sent something it could not read.');

  return answer.data;
}
