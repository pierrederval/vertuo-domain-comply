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
  /**
   * What to call this Facet where a person reads it. Optional: a Facet that
   * declares none is called by its name, which is a word somebody chose too.
   * Drawn and never interpreted.
   *
   * Declared here rather than lifted from the source, because a surface has to
   * name a Facet that **no document exists for**. A Facet absent across every
   * Module is the reading the grid is drawn to make visible, and it cannot be
   * named from documents that are not there.
   */
  label: z.string().min(1).optional(),
  /**
   * What belongs under this Facet, in the business's own words.
   *
   * A Facet name arrives from the source, so it is whatever word that corpus
   * happened to use — `events`, `br`, `state-machines`. A reader who does not
   * already know what belongs under one cannot learn it from the name, and a
   * product whose claim is that it shows a person what to write down next
   * cannot answer that with a slug.
   *
   * Optional, and a Facet that declares none says nothing extra. Never
   * interpreted: this is drawn, and no reading depends on it.
   */
  describes: z.string().min(1).optional(),
  factKind: factKindSchema,
  extractor: extractorNameSchema,
  /** For 'table': column header -> attribute name. */
  columns: z.record(z.string()).optional(),
  /**
   * For 'table': the column headers a table must carry to be one of this Facet's
   * own (ADR-0024).
   *
   * A document routinely holds several tables, and only some of them hold this
   * Facet's knowledge. The others are a payload, a retired vocabulary, a note about
   * what the software does today — written down next to the knowledge because that
   * is where it belongs, not because it is the same thing. Read as this Facet's,
   * each row becomes something carrying a name and almost nothing else, failing a
   * criterion it was never meant to be held to, in a queue where nobody can act on
   * it.
   *
   * Only the headers that identify the table are named, never all of them: a corpus
   * spells the same column several ways, and requiring the whole header row would
   * refuse a table the moment one word of it moved.
   *
   * Whether a table is this Facet's is decided here and never by `criteria`, so
   * tightening what counts as enough can never change how many things there are and
   * two readings of one Corpus stay comparable (ADR-0016).
   *
   * Optional. A Facet that names none reads every table it finds, which is what
   * every Facet did before this could be said.
   */
  identifyingColumns: z.array(z.string().min(1)).min(1).optional(),
  /**
   * For 'heading': which headings under this Facet are its own elements
   * (ADR-0025).
   *
   * A page carries its own furniture beside the knowledge — a section of
   * terminology, a note about who last looked the page over, a list of what it
   * links to. Every one of those belongs on the page. None of them is one of the
   * things the Facet is a Facet of, and read as though it were, each becomes
   * something with a name and a paragraph that pads a denominator LAW-006
   * requires be honest.
   *
   * Matched against the heading as the document writes it, markup and all: the
   * person writing this is looking at the source, so what they describe is what
   * the source says.
   *
   * Whether a heading is one of this Facet's is decided here and never by
   * `criteria`, so tightening what counts as enough can never change how many
   * things there are and two readings of one Corpus stay comparable (ADR-0016).
   *
   * Optional. A Facet that says nothing reads every heading it finds, which is
   * what every Facet did before this could be said.
   */
  itemPattern: z.string().min(1).optional(),
  /**
   * For 'document' and 'heading': the parts one of this Facet's Facts is written
   * in — the source's own subheading, mapped onto an attribute name, exactly as
   * `columns` maps a table's headers (ADR-0020).
   *
   * This is what turns a question about the quality of prose into a question about
   * presence. *A rule must say why it exists* is a judgment nobody can make
   * mechanically, and a criterion that tried would be a word count or a pattern
   * over prose, both of which ADR-0020 refuses. Written in parts, the same
   * question is whether a part is there.
   *
   * Several spellings may name one attribute, because a corpus drifts: one person
   * writes the rationale under one heading and the next writes it under another,
   * and a Lens unable to say they are the same part would force a corpus to be
   * tidied before it could be read at all. Where a source turns out to have
   * written two of them, both are kept — neither is dropped in silence (LAW-006).
   *
   * A subheading no part names contributes nothing. It is not set aside either:
   * set aside counts one of this Facet's own things, declined (ADR-0025), and a
   * subheading was never going to be one of them.
   *
   * Parts decide what a Fact is made of and never how many Facts there are, so
   * naming them can no more move a count than tightening a criterion can
   * (ADR-0016).
   *
   * Optional. A Facet that names none reads the whole body into one attribute,
   * which is what every Facet did before this could be said.
   */
  parts: z.record(z.string()).optional(),
  /**
   * For 'document' and 'heading': the attribute the body lands in.
   *
   * Where a Facet names parts, this holds only what was written before the first
   * of them — so a Facet whose documents begin at their first part must name a
   * part for that opening section, or ask for nothing that lands here.
   */
  bodyAttribute: z.string().optional(),
  /**
   * That this is the Facet whose Facts settle what a word means (ADR-0021).
   *
   * A corpus routinely writes the same word down under more than one Facet, saying
   * something different about it each time: a dictionary says what a word means,
   * and a list of which thing owns the others says which of them is the root. Both
   * are Terms — same Kind, same readings — and only the first is a dictionary.
   *
   * Read as though both were, the second arrives as *this word is defined two
   * different ways*, which is the defect this product exists to find, reported
   * about a corpus that does not have it. A tool that invents defects is worse
   * than one that misses them.
   *
   * Exactly one Facet of Terms declares it, and a Lens declaring any Facet of
   * Terms must name one. A language with two authorities is two languages, which
   * is the split this product exists to detect, and allowing several would bring
   * back the precedence question ADR-0019 refused to answer in a hand-authored
   * Lens: when two of them define one word, which one wins.
   *
   * Declared rather than left to be inferred. It was inferable — a Facet mapping
   * nothing onto `definition` never entered the dictionary — and that is exactly
   * the hazard: nothing said so, so the constraint held only until somebody
   * renamed one attribute, and then the reading filled with contradictions that
   * looked like the corpus's fault.
   *
   * Absent, and never written down as false: a Facet either says this about itself
   * or says nothing, exactly as it does with the parts and the columns above.
   */
  definesTerms: z.literal(true).optional(),
  /**
   * The attribute holding where one of this Facet's Facts stands (ADR-0022).
   *
   * A status read from a document's frontmatter stamps one rung onto everything
   * beneath it, so one person's one sign-off becomes a claim about every Fact on
   * the page — sixteen documents reviewed in the corpus that prompted this, one of
   * them marking 47 words as reviewed at once. And the reverse is the same wall: a
   * person who has genuinely checked three Commands of thirty-five has nowhere to
   * say so, so the only honest move is to sign off none.
   *
   * An *attribute*, and nothing more. How one came to be on a Fact is already the
   * extractor's business — a column of a table, a Part under a heading, the body
   * itself — so both shapes are read without this having to know which.
   *
   * A Fact that states one is read by it; one that does not falls back to its
   * document's. Optional, and a Facet naming none is read entirely from its
   * document, which is what every Facet was read by before this could be said. What
   * a Fact is *required* to state is a sentence the Lens says through its criteria
   * and never one the core says (ADR-0001).
   *
   * Refused where nothing this Facet reads could ever fill it, for the reason the
   * refusals above are: ignored, the declaration reads as though it were in force,
   * and the reading is exactly what it was while the Lens says in writing that it
   * is not.
   */
  statusAttribute: z.string().min(1).optional(),
  /**
   * The attribute holding what one of this Facet's Facts was checked against
   * (ADR-0022).
   *
   * Named separately from the status and never folded into it. A corpus that writes
   * *derived from current backend behaviour* has put a rung and a provenance in one
   * string, and `statusMappings` exists to undo exactly that at the boundary
   * (LAW-005, ADR-0006). Undoing a conflation is the right treatment for a corpus
   * that has one; building a new convention that needs the same treatment is not.
   *
   * What is found here is unioned with what the status mapping says that status
   * corroborates, because Sources are a set and a Fact confirmed by more is
   * stronger than the same Fact confirmed by fewer.
   *
   * Refused where nothing this Facet reads could ever fill it.
   */
  sourcesAttribute: z.string().min(1).optional(),
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
  /**
   * Where a document says what it stands at, if it says so at all.
   *
   * Optional, because a corpus whose Facts state their own has nothing to put in a
   * document's frontmatter, and requiring a key here would make such a corpus
   * declare one it does not have. Where both are declared, this is the fallback for
   * a Fact that states nothing (ADR-0022).
   */
  statusKey: z.string().optional(),
  ownerKey: z.string().optional(),
});

/**
 * Every attribute a Facet reading this way could put on one of its Facts.
 *
 * Named so a Facet can be told that the attribute it points at is one nothing it
 * reads will ever write to. Derived from the same three declarations the reading
 * itself is derived from, so the two cannot drift: a table writes the columns it
 * maps, a heading or a whole document writes the parts it maps and whatever the
 * body lands in, and a heading is additionally known by the words of the heading
 * itself. A Facet whose Facts are Modules is given its Module's identity and its
 * owner, which are put on by the reading rather than found on the page.
 */
function attributesAFacetCanFill(facet: z.infer<typeof facetSpecSchema>): Set<string> {
  const filled = new Set<string>();
  if (facet.extractor === 'table') {
    for (const attribute of Object.values(facet.columns ?? {})) filled.add(attribute);
    // Derived from the name, where a name is read at all, so a row can be referred to.
    if (filled.has('name')) filled.add('slug');
  } else {
    if (facet.extractor === 'heading') {
      filled.add('name');
      filled.add('slug');
    }
    for (const attribute of Object.values(facet.parts ?? {})) filled.add(attribute);
    filled.add(facet.bodyAttribute ?? 'body');
  }
  if (facet.factKind === 'Module') {
    filled.add('name');
    filled.add('owner');
  }
  return filled;
}

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
    // Naming the columns that identify a table means nothing to a Facet that reads no
    // rows. Refused rather than ignored: ignored, the declaration reads as though it
    // were in force, and whoever wrote it is looking at a count that includes
    // everything they wrote it to leave out.
    for (const [index, facet] of lens.facets.entries()) {
      if (facet.identifyingColumns === undefined || facet.extractor === 'table') continue;
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['facets', index, 'identifyingColumns'],
        message:
          `facet "${facet.name}" names identifyingColumns but reads "${facet.extractor}", ` +
          `not rows of a table; only a facet reading rows can say which tables are its own`,
      });
    }

    // Describing which headings are a Facet's own means nothing to a Facet that reads
    // no headings, and is refused for the same reason as the rule above it.
    for (const [index, facet] of lens.facets.entries()) {
      if (facet.itemPattern === undefined) continue;
      if (facet.extractor !== 'heading') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['facets', index, 'itemPattern'],
          message:
            `facet "${facet.name}" describes which headings are its own but reads ` +
            `"${facet.extractor}", not headings; only a facet reading headings can say ` +
            `which of them are its elements`,
        });
        continue;
      }
      try {
        new RegExp(facet.itemPattern);
      } catch {
        // Refused where it is written, rather than thrown from the middle of a
        // reading: what is wrong is one line of this file, and the person who can
        // put it right is the person holding it.
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['facets', index, 'itemPattern'],
          message:
            `facet "${facet.name}" describes its headings as "${facet.itemPattern}", ` +
            `which is not a description this reading can follow`,
        });
      }
    }

    // Naming the parts a Fact is written in means nothing to a Facet that reads rows:
    // a row has no subheadings under it. Refused for the same reason as the two rules
    // above — ignored, the declaration reads as though it were in force, and whoever
    // wrote it believes those Facts carry parts that were never read.
    //
    // An empty declaration is refused too, and is the more dangerous of the two. It
    // reads as "no parts named", but it puts a Facet into reading-by-parts with no part
    // to read, so every Fact under it keeps only what was written before its first
    // subheading — which for a source that begins at one is nothing at all.
    for (const [index, facet] of lens.facets.entries()) {
      if (facet.parts === undefined) continue;
      if (facet.extractor === 'table') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['facets', index, 'parts'],
          message:
            `facet "${facet.name}" names the parts its facts are written in but reads rows ` +
            `of a table; a row has nothing written under it, so only a facet reading ` +
            `whole documents or headings can name parts`,
        });
        continue;
      }
      if (Object.keys(facet.parts).length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['facets', index, 'parts'],
          message:
            `facet "${facet.name}" names no parts at all; remove parts to read each fact ` +
            `whole, because naming none reads every fact as only what stands before its ` +
            `first part`,
        });
      }
    }

    // Where a Facet says a Fact states its own standing or its own sources, something the
    // Facet reads has to be able to fill the attribute it named. Refused rather than
    // ignored, for the reason the three rules above are refused: ignored, every Fact
    // falls back to its document exactly as before, and the Lens says in writing that it
    // does not.
    for (const [index, facet] of lens.facets.entries()) {
      const couldFill = attributesAFacetCanFill(facet);
      for (const declaration of ['statusAttribute', 'sourcesAttribute'] as const) {
        const named = facet[declaration];
        if (named === undefined || couldFill.has(named)) continue;
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['facets', index, declaration],
          message:
            `facet "${facet.name}" names "${named}" as ${declaration} and nothing it reads ` +
            `writes to it; it reads ${[...couldFill].map((a) => `"${a}"`).join(', ')}`,
        });
      }
    }

    // Exactly one Facet of Terms settles what a word means, and it says so about itself
    // (ADR-0021). Refused either way round: with none, whichever Facet happened to be
    // written first became the dictionary and nothing said so; with two, one word carries
    // two settled meanings and there is no rule saying which of them holds.
    const wordFacets = lens.facets.filter((facet) => facet.factKind === 'Term');
    const defining = lens.facets.filter((facet) => facet.definesTerms === true);
    const named = (facets: typeof lens.facets): string =>
      facets.map((facet) => `"${facet.name}"`).join(', ');

    for (const [index, facet] of lens.facets.entries()) {
      if (facet.definesTerms !== true || facet.factKind === 'Term') continue;
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['facets', index, 'definesTerms'],
        message:
          `facet "${facet.name}" declares definesTerms but holds ${facet.factKind}s, not ` +
          `Terms; only a facet whose facts are words can settle what a word means`,
      });
    }
    if (wordFacets.length > 0 && defining.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['facets'],
        message:
          `facets of Terms are declared (${named(wordFacets)}) and none of them declares ` +
          `definesTerms; exactly one must, because nothing else says which of them settles ` +
          `what a word means`,
      });
    }
    if (defining.length > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['facets'],
        message:
          `facets ${named(defining)} all declare definesTerms; exactly one may, because a ` +
          `language with two authorities is two languages`,
      });
    }

    // The defining facet must map onto the core's semantic slots for a term's canonical
    // name and its definition, so a language-integrity check can find them without
    // guessing at corpus-specific attribute names.
    //
    // Asked of the defining facet and not of every facet of Terms, because what makes a
    // Term a Term is having a word and what makes it a dictionary entry is having a
    // meaning. A list of which thing owns the others holds no meanings, and requiring one
    // would make a Lens write down that its rows mean something they do not — the exact
    // untruth naming a dictionary was introduced to stop being necessary.
    for (const [index, facet] of lens.facets.entries()) {
      if (facet.factKind !== 'Term') continue;
      if (facet.extractor === 'table') {
        const targets = new Set(Object.values(facet.columns ?? {}));
        const required = facet.definesTerms === true ? ['name', 'definition'] : ['name'];
        for (const slot of required) {
          if (!targets.has(slot)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['facets', index, 'columns'],
              message: `Term facet "${facet.name}" has no column mapped to "${slot}"`,
            });
          }
        }
      } else if (facet.extractor === 'document') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['facets', index, 'extractor'],
          message: `Term facet "${facet.name}" cannot use the document extractor: a whole document has no name to key a Term on, so no Term would ever be extracted; use "table" or "heading" instead`,
        });
      } else if (facet.definesTerms === true && facet.bodyAttribute === undefined) {
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
