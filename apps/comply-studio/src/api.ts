import {
  corpusDetailSchema,
  corpusFactSchema,
  corpusInboxSchema,
  corpusListSchema,
  corpusModuleSchema,
  notHeldSchema,
  type CorpusDetail,
  type CorpusFact,
  type CorpusInbox,
  type CorpusModule,
  type CorpusSummary,
  type NotHeld,
  type Place,
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

/**
 * What to do about something the shelf does not hold.
 *
 * Three different things to go and do: put a Corpus on the shelf, check a name
 * against the grid, or go and look at a place. A single sentence for all of them
 * would send two thirds of the people who meet it to the wrong one.
 */
function whatIsNotHeld(said: NotHeld['notHeld'] | null): string {
  switch (said) {
    case 'corpus':
      return 'No Corpus of that name is on the shelf.';
    case 'module':
      return 'No Module of that name is in this Corpus.';
    case 'knowledge':
      return 'This Corpus writes nothing down at that place.';
    default:
      return 'Nothing is kept at that address.';
  }
}

/**
 * One Corpus's Findings, grouped by who answers for them, the ones reaching nobody
 * first.
 *
 * The whole queue is asked for and the page narrows it. Asked for one person at a
 * time, the page could not say how many Findings reach nobody without asking a
 * second time — and two answers about one Corpus is how the loudest thing on the
 * page comes to disagree with the rest of it.
 */
export async function fetchInbox(id: string): Promise<CorpusInbox> {
  const response = await fetch(`/corpus/${encodeURIComponent(id)}/inbox`);
  // Only one thing this route can fail to hold, and it is the Corpus itself.
  if (response.status === 404) throw new Error(whatIsNotHeld('corpus'));
  if (!response.ok) throw new Error('The Studio could not reach the knowledge it holds.');

  const answer = corpusInboxSchema.safeParse(await response.json());
  if (!answer.success) throw new Error('The Studio was sent something it could not read.');

  return answer.data;
}

/** One Module: every Facet its Lens declares, and why each one falls short. */
export async function fetchModule(id: string, moduleId: string): Promise<CorpusModule> {
  const response = await fetch(
    `/corpus/${encodeURIComponent(id)}/modules/${encodeURIComponent(moduleId)}`,
  );

  if (response.status === 404) {
    const said = notHeldSchema.safeParse(await response.json());
    // A Module page reached from a Corpus that is not there and one reached with a
    // name the Corpus does not have are the two cases here; anything else this
    // route could say would be about a place, which it never asks for.
    throw new Error(whatIsNotHeld(said.success ? said.data.notHeld : 'module'));
  }
  if (!response.ok) throw new Error('The Studio could not reach the knowledge it holds.');

  const answer = corpusModuleSchema.safeParse(await response.json());
  if (!answer.success) throw new Error('The Studio was sent something it could not read.');

  return answer.data;
}

/**
 * One piece of knowledge: what it says, how far along it is, what backs it up, and
 * the source text it was read out of.
 *
 * Asked for by where it is written down, which is the only name every Corpus gives
 * one, under the Module it belongs to — so a place cannot be read on the page of a
 * Module that did not write it.
 */
export async function fetchFact(
  id: string,
  moduleId: string,
  at: Place,
): Promise<CorpusFact> {
  const held = `/corpus/${encodeURIComponent(id)}/modules/${encodeURIComponent(moduleId)}`;
  const response = await fetch(
    `${held}/knowledge?in=${encodeURIComponent(at.file)}&line=${at.line}`,
  );

  if (response.status === 404) {
    const said = notHeldSchema.safeParse(await response.json());
    throw new Error(whatIsNotHeld(said.success ? said.data.notHeld : 'knowledge'));
  }
  if (!response.ok) throw new Error('The Studio could not reach the knowledge it holds.');

  const answer = corpusFactSchema.safeParse(await response.json());
  if (!answer.success) throw new Error('The Studio was sent something it could not read.');

  return answer.data;
}
