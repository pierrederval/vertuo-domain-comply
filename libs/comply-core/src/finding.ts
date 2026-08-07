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
}
