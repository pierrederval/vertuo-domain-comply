import { z } from 'zod';
import { FACT_KINDS } from '@vertuo/comply-core';

export const factKindSchema = z.enum(FACT_KINDS);
export const extractorNameSchema = z.enum(['document', 'table', 'heading']);

export const criterionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('requiredAttributes'), attributes: z.array(z.string()).min(1) }),
  z.object({ type: z.literal('minSources'), count: z.number().int().nonnegative() }),
  z.object({
    type: z.literal('minRelations'),
    relation: z.string(),
    count: z.number().int().nonnegative(),
  }),
  z.object({
    type: z.literal('allStatesReachable'),
    fromAttribute: z.string(),
    toAttribute: z.string(),
  }),
]);

export const facetSpecSchema = z.object({
  /** Corpus-specific facet name. Never interpreted by the core. */
  name: z.string().min(1),
  factKind: factKindSchema,
  extractor: extractorNameSchema,
  /** For 'table': column header -> attribute name. */
  columns: z.record(z.string()).optional(),
  /** For 'document' and 'heading': the attribute the body lands in. */
  bodyAttribute: z.string().optional(),
  /**
   * What counts as enough under this Facet (ADR-0019).
   *
   * Declared here rather than against the Fact Kind, because a corpus routinely
   * splits one Kind into several Facets that are not the same thing: Commands
   * and Events are both Messages, and an Event needs the Rule it came from
   * where a Command needs an actor. Keyed by Kind, either both are asked for
   * both or neither is asked for anything.
   *
   * Empty means nothing is asked for, so anything written down here is enough.
   */
  criteria: z.array(criterionSchema).default([]),
});

export const maturityLadderSchema = z.object({
  /** Ordered lowest to highest. Names are corpus-specific. */
  levels: z.array(z.string().min(1)).min(1),
  approvedAtOrAbove: z.string().min(1),
});

/** Decomposes one composite corpus status into a level plus provenance (ADR-0006). */
export const statusMappingSchema = z.object({
  match: z.string(),
  maturity: z.string(),
  sources: z.array(z.string()),
});

export const adapterSpecSchema = z.object({
  kind: z.literal('markdown-frontmatter'),
  root: z.string(),
  moduleIdKey: z.string(),
  facetKey: z.string(),
  statusKey: z.string(),
  ownerKey: z.string().optional(),
});

export const lensSchema = z
  .object({
    id: z.string().min(1),
    /**
     * What to call this Corpus where a person will read it. Optional: a Corpus
     * that declares none is called by its id, which is a name somebody chose too.
     * Never interpreted — it is drawn and nothing else.
     */
    name: z.string().min(1).optional(),
    adapter: adapterSpecSchema,
    facets: z.array(facetSpecSchema),
    maturity: maturityLadderSchema,
    statusMappings: z.array(statusMappingSchema),
    /** Fallback owner map when the corpus carries no owner key. */
    owners: z.record(z.string()).optional(),
  })
  .superRefine((lens, ctx) => {
    const { levels, approvedAtOrAbove } = lens.maturity;
    if (!levels.includes(approvedAtOrAbove)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['maturity', 'approvedAtOrAbove'],
        message: `approvedAtOrAbove "${approvedAtOrAbove}" is not on the ladder [${levels.join(', ')}]`,
      });
    }
    for (const [index, mapping] of lens.statusMappings.entries()) {
      if (!levels.includes(mapping.maturity)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['statusMappings', index, 'maturity'],
          message: `status mapping "${mapping.match}" targets level "${mapping.maturity}", which is not on the ladder`,
        });
      }
    }
    // A Term facet must map onto the core's semantic slots for a term's canonical name
    // and its definition, so a language-integrity check can find them without guessing
    // at corpus-specific attribute names.
    for (const [index, facet] of lens.facets.entries()) {
      if (facet.factKind !== 'Term') continue;
      if (facet.extractor === 'table') {
        const targets = new Set(Object.values(facet.columns ?? {}));
        for (const required of ['name', 'definition']) {
          if (!targets.has(required)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['facets', index, 'columns'],
              message: `Term facet "${facet.name}" has no column mapped to "${required}"`,
            });
          }
        }
      } else if (facet.extractor === 'document') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['facets', index, 'extractor'],
          message: `Term facet "${facet.name}" cannot use the document extractor: a whole document has no name to key a Term on, so no Term would ever be extracted; use "table" or "heading" instead`,
        });
      } else if (facet.bodyAttribute === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['facets', index, 'bodyAttribute'],
          message: `Term facet "${facet.name}" must set bodyAttribute to name the attribute holding its definition`,
        });
      }
    }
  });

export type ExtractorName = z.infer<typeof extractorNameSchema>;
export type FacetSpec = z.infer<typeof facetSpecSchema>;
export type MaturityLadder = z.infer<typeof maturityLadderSchema>;
export type StatusMapping = z.infer<typeof statusMappingSchema>;
export type Criterion = z.infer<typeof criterionSchema>;
export type AdapterSpec = z.infer<typeof adapterSpecSchema>;
export type Lens = z.infer<typeof lensSchema>;
