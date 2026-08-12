import { createHash } from 'node:crypto';
import { canonicalJson } from '@vertuo/comply-core';
import type { Lens } from './lens.js';

/**
 * A Lens with where it points left out: everything it *says* about a Corpus, and
 * nothing about the machine that read it.
 *
 * This is the whole of a Lens except one field. Which Facets are declared, what
 * each of them asks for, which rung counts as approved, which keys a document is
 * read by — every one of those decides what a reading says, and a change to any of
 * them means the reading was taken against different criteria.
 *
 * `adapter.root` decides none of it. `loadLens` resolves it against wherever the
 * file happened to sit, so it is a path on one machine's disk: it changes when a
 * checkout moves, when a second person clones the source, when a build runs
 * somewhere else. Held as part of a Lens's identity, every one of those would read
 * as *the criteria changed* and no baseline would ever match again. It is left out
 * for the same reason a Seed keeps its paths relative, and the test that proves it
 * is the same Lens digested from two different roots.
 *
 * Where the documents are still reaches a reading — an origin a person can open is
 * built from it (LAW-009) — but it moves no figure and no Finding's words, so a
 * reading recomputed from a retained Seed and a retained Lens against a root
 * supplied on the day says everything this one said.
 */
export type WhatALensSays = Omit<Lens, 'adapter'> & {
  adapter: Omit<Lens['adapter'], 'root'>;
};

/** {@link WhatALensSays}, as a value that can be digested and retained. */
export function whatTheLensSays(lens: Lens): WhatALensSays {
  const { root: _pointsAt, ...says } = lens.adapter;
  return { ...lens, adapter: says };
}

/**
 * The Lens's content digest: its identity, and what a recorded reading cites
 * alongside the Seed's (ADR-0016).
 *
 * Taken over canonical JSON by the one canonicaliser there is, so the order a
 * hand-authored file happens to write its keys in is not part of what it says —
 * the same property that lets a Seed be extracted twice and match.
 */
export function lensDigest(lens: Lens): string {
  return createHash('sha256').update(canonicalJson(whatTheLensSays(lens))).digest('hex');
}
