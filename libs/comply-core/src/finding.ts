import type { FactId, SourceLocation } from './fact.js';

export type FindingCode =
  | 'unparsable-document'
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
