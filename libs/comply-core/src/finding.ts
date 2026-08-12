import type { FactId, SourceLocation } from './fact.js';

/**
 * What a Finding is, in one word.
 *
 * Every one of these is put in front of a reader — as the denominator beside the
 * Integrity figure, and as the list of what ran in the Inbox and on a Module — so
 * a code is a surface and LAW-010 governs one exactly as it governs a label. That
 * is the question the surface guard's own known limitation left open: it stops at
 * the start of a word, so *unparsable* passed it, and the guard declined to settle
 * by failing a build whether a code prefixed with *un* is a surface at all. It is,
 * and none of these carries an engineering word.
 */
export type FindingCode =
  | 'unreadable-document'
  | 'unknown-facet'
  | 'unknown-status'
  | 'missing-module-identity'
  | 'missing-owner'
  | 'split-identity'
  | 'broken-reference'
  | 'conflicting-definition'
  | 'empty-facet';

export interface Finding {
  code: FindingCode;
  message: string;
  moduleId: FactId | null;
  origin: SourceLocation;
  /**
   * Further locations this finding concerns, beyond its primary `origin`
   * (e.g. the other places a conflicting definition appears). A check
   * reports locations as data; formatting them into text is the renderer's
   * decision, not the check's (LAW-009 evidence stays structured).
   */
  relatedOrigins?: SourceLocation[];
}
