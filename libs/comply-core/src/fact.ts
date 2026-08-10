export const FACT_KINDS = ['Module', 'Term', 'Rule', 'Message', 'Transition'] as const;

export type FactKind = (typeof FACT_KINDS)[number];

export type FactId = string;

/** A place a human can open to verify a claim (LAW-009). `line` is 1-indexed. */
export interface SourceLocation {
  file: string;
  line: number;
}

/** A typed edge to another Fact. `targetRef` is resolved against Fact ids. */
export interface Relation {
  type: string;
  targetRef: string;
}

export type AttributeValue = string | string[];

export interface Fact {
  id: FactId;
  kind: FactKind;
  /** null for Facts of kind 'Module'. */
  moduleId: FactId | null;
  /** Lens-declared facet name. The core never inspects its value. */
  facet: string;
  /** Adapter-reported grouping (e.g. a directory). Used by split-identity. */
  containerId: string;
  attributes: Record<string, AttributeValue>;
  relations: Relation[];
  /** A level name from the Lens's ladder. null when the corpus said nothing. */
  maturityLevel: string | null;
  /** Provenance. A set, never merged with maturityLevel (ADR-0006). */
  sources: string[];
  origin: SourceLocation;
}
