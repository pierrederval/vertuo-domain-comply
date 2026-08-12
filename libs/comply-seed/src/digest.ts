import { createHash } from 'node:crypto';
import { canonicalJson } from '@vertuo/comply-core';
import type { Seed } from './seed.js';

/**
 * The Seed's content digest: its identity, and what a Genesis entry cites.
 *
 * Taken over canonical JSON, so two extractions of unchanged source agree
 * whatever order their keys came out in — which is what lets a load be a no-op
 * (ADR-0012). `seedDocumentSchema` keeps paths relative for the same reason: two
 * machines extracting the same source produce the same digest.
 */
export function seedDigest(seed: Seed): string {
  return createHash('sha256').update(canonicalJson(seed)).digest('hex');
}
