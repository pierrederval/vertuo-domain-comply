import { z } from 'zod';
import { FACT_KINDS } from '@vertuo/comply-core';

export const factKindSchema = z.enum(FACT_KINDS);
export const extractorNameSchema = z.enum(['document', 'table', 'heading']);

export const facetSpecSchema = z.object({
  /** Corpus-specific facet name. Never interpreted by the core. */
  name: z.string().min(1),
  factKind: factKindSchema,
  extractor: extractorNameSchema,
  /** For 'table': column header -> attribute name. */
  columns: z.record(z.string()).optional(),
  /** For 'document' and 'heading': the attribute the body lands in. */
  bodyAttribute: z.string().optional(),
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

export const adapterSpecSchema = z.object({
  kind: z.literal('markdown-frontmatter'),
  root: z.string(),
  moduleIdKey: z.string(),
  facetKey: z.string(),
  statusKey: z.string(),
  ownerKey: z.string().optional(),
});

export const profileSchema = z
  .object({
    id: z.string().min(1),
    adapter: adapterSpecSchema,
    facets: z.array(facetSpecSchema),
    maturity: maturityLadderSchema,
    statusMappings: z.array(statusMappingSchema),
    criteria: z.record(factKindSchema, z.array(criterionSchema)).default({}),
    /** Fallback owner map when the corpus carries no owner key. */
    owners: z.record(z.string()).optional(),
  })
  .superRefine((profile, ctx) => {
    const { levels, approvedAtOrAbove } = profile.maturity;
    if (!levels.includes(approvedAtOrAbove)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['maturity', 'approvedAtOrAbove'],
        message: `approvedAtOrAbove "${approvedAtOrAbove}" is not on the ladder [${levels.join(', ')}]`,
      });
    }
    for (const [index, mapping] of profile.statusMappings.entries()) {
      if (!levels.includes(mapping.maturity)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['statusMappings', index, 'maturity'],
          message: `status mapping "${mapping.match}" targets level "${mapping.maturity}", which is not on the ladder`,
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
export type Profile = z.infer<typeof profileSchema>;
