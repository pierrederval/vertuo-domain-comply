import { relative } from 'node:path';
import Fastify, { type FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import {
  corpusDetailSchema,
  corpusListSchema,
  corpusModuleSchema,
  notHeldSchema,
  type CorpusDetail,
  type CorpusModule,
  type CorpusReading,
  type CorpusSummary,
  type IntegrityFigure,
  type ModuleFacet,
  type ModuleFinding,
  type ModuleRow,
  type Movement,
  type Place,
  type ReadinessFigure,
} from '@vertuo/comply-contract';
import type { Finding, SourceLocation } from '@vertuo/comply-core';
import { factsUnder } from '@vertuo/comply-readiness';
import { readSeededCorpus, type Reading } from '@vertuo/comply-reading';
import { readShelf, type ShelvedCorpus } from './shelf.js';

/**
 * The two readings of one Corpus, each carrying what it is counted against.
 *
 * One derivation, wherever they are asked for. Two would be two answers to one
 * question, and the surface that showed both would be the last place anybody
 * looked for the disagreement.
 */
function figures(reading: Reading): { readiness: ReadinessFigure; integrity: IntegrityFigure } {
  const { scores, findings, checks } = reading;

  return {
    readiness: {
      modulesFullyApproved: scores.filter((score) => score.approved === score.total).length,
      modules: scores.length,
    },
    integrity: { openFindings: findings.length, lookedFor: checks },
  };
}

/**
 * What the product can say about one Corpus right now.
 *
 * The reading is computed on request. Recording readings so a trend can be drawn
 * against them is #24; until then there is nothing to serve but a fresh one, and
 * the age reported is the age of the knowledge it was made from — never the moment
 * the figures happened to be computed, which would claim the source had just been
 * looked at.
 */
function readNow(shelved: ShelvedCorpus, takenAt: string): Reading | null {
  const { lens, seed } = shelved;
  return seed === null ? null : readSeededCorpus(seed, lens, takenAt, null);
}

function summarise(shelved: ShelvedCorpus, takenAt: string): CorpusSummary {
  const { lens, sourceReadAt } = shelved;
  const name = lens.name ?? lens.id;
  const reading = readNow(shelved, takenAt);

  if (reading === null || sourceReadAt === null) {
    return { id: lens.id, name, reading: { outcome: 'nothing-written-down-yet' } };
  }

  const summary: CorpusReading = {
    outcome: 'read',
    sourceReadAt: sourceReadAt.toISOString(),
    // Two readings, side by side, each carrying what it is out of. Nothing here
    // combines them, and no third figure is derived from them (spec §4).
    ...figures(reading),
  };

  return { id: lens.id, name, reading: summary };
}

/**
 * What one Module has done since the last reading kept to compare it against.
 *
 * There is no such reading yet — recording them is #24 — so this is *nothing to
 * compare with* for every Module, which is the honest answer and reads
 * differently from *nothing changed*. The day baselines exist, they arrive here
 * as `previous` and the same two shapes carry the difference.
 */
export function movementOf(approvedDelta: number | null): Movement {
  return approvedDelta === null
    ? { comparedWith: 'no-earlier-reading' }
    : { comparedWith: 'the-last-reading', approvedDelta };
}

/**
 * One Corpus, whole: every Module against every Facet its Lens declares.
 *
 * Every Module appears, including one with nothing in it, and every declared
 * Facet appears, including one no Module has filled — a column of absences is
 * the finding, not a row to leave out (spec §5.3).
 */
function wholeReading(shelved: ShelvedCorpus, takenAt: string): CorpusDetail {
  const { lens, sourceReadAt } = shelved;
  const name = lens.name ?? lens.id;
  const reading = readNow(shelved, takenAt);

  if (reading === null || sourceReadAt === null) {
    return { id: lens.id, name, reading: { outcome: 'nothing-written-down-yet' } };
  }

  // Scores and trend are both derived from the matrix's rows, in order, so the
  // three line up Module for Module.
  const modules: ModuleRow[] = reading.matrix.rows.map((row, at) => ({
    id: row.moduleId,
    owner: row.owner,
    cells: row.cells.map((cell) => ({ facet: cell.facet, state: cell.state })),
    approved: reading.scores[at]!.approved,
    declaredFacets: reading.scores[at]!.total,
    movement: movementOf(reading.trend[at]!.approvedDelta),
  }));

  return {
    id: lens.id,
    name,
    reading: {
      outcome: 'read',
      sourceReadAt: sourceReadAt.toISOString(),
      lensId: reading.matrix.lensId,
      ladder: { levels: lens.maturity.levels, approvedAtOrAbove: lens.maturity.approvedAtOrAbove },
      // Named from the Lens, so a Facet no Module has filled still has something
      // to be called: an all-absent column is the reading the grid exists to make
      // visible and it cannot be named from documents that are not there.
      facets: lens.facets.map((facet) => ({
        name: facet.name,
        label: facet.label ?? facet.name,
        describes: facet.describes,
      })),
      modules,
      ...figures(reading),
    },
  };
}

/**
 * Where a claim was found, as somewhere a reader can go.
 *
 * Relativised against where this Corpus's knowledge is kept. Origins are held as
 * absolute paths because LAW-009 needs a path a person can open, but sending that
 * path bakes in the machine that read it: it cannot be shared, compared between
 * two people, or quoted into a Change Request, which is every use a reader has
 * for it.
 */
function placeOf(root: string, at: SourceLocation): Place {
  return { file: relative(root, at.file), line: at.line };
}

function reportOf(root: string, finding: Finding): ModuleFinding {
  return {
    says: finding.message,
    at: placeOf(root, finding.origin),
    alsoAt: (finding.relatedOrigins ?? []).map((also) => placeOf(root, also)),
  };
}

/**
 * One Module, whole, or nothing where this Corpus holds no Module of that name.
 *
 * Every declared Facet appears, in the order the Lens declares them, and each
 * carries only the reason belonging to the state it is in. Nothing is judged
 * here: which Facts sit under a Facet, whether they are well-formed and how many
 * have not reached the approved step were all decided where the reading was
 * taken, and this arranges what was decided into what the two sides agreed
 * (spec §3.2).
 */
function oneModule(
  shelved: ShelvedCorpus,
  moduleId: string,
  takenAt: string,
): CorpusModule | null {
  const { lens, sourceReadAt } = shelved;
  const corpus = { id: lens.id, name: lens.name ?? lens.id };
  const reading = readNow(shelved, takenAt);

  // Nothing has been written down, so there is no Module here to find and no
  // reading to report — which is a different answer from a name this Corpus does
  // not have, and sends a reader somewhere else.
  if (reading === null || sourceReadAt === null) {
    return { corpus, id: moduleId, reading: { outcome: 'nothing-written-down-yet' } };
  }

  const at = reading.matrix.rows.findIndex((row) => row.moduleId === moduleId);
  const row = reading.matrix.rows[at];
  if (row === undefined) return null;

  const { root } = lens.adapter;
  const facets: ModuleFacet[] = row.cells.map((cell, position) => {
    const declared = lens.facets[position]!;
    const knowledge = factsUnder(reading.corpus, moduleId, declared).map((fact) => ({
      at: placeOf(root, fact.origin),
      maturity: fact.maturityLevel,
    }));

    // What this Facet is called and what belongs under it, in every state it can
    // be in — a Facet with nothing written under it is where a reader most needs
    // to be told what belongs there.
    const named = {
      facet: cell.facet,
      label: declared.label ?? declared.name,
      describes: declared.describes,
    };

    switch (cell.state) {
      case 'absent':
        return { ...named, state: 'absent' };
      case 'present':
        return { ...named, state: 'present', knowledge, shortOf: cell.unmet };
      case 'well-formed':
        return { ...named, state: 'well-formed', knowledge, notYetApproved: cell.notYetApproved };
      case 'approved':
        return { ...named, state: 'approved', knowledge };
    }
  });

  return {
    corpus,
    id: moduleId,
    reading: {
      outcome: 'read',
      sourceReadAt: sourceReadAt.toISOString(),
      lensId: reading.matrix.lensId,
      ladder: { levels: lens.maturity.levels, approvedAtOrAbove: lens.maturity.approvedAtOrAbove },
      owner: row.owner,
      facets,
      approved: reading.scores[at]!.approved,
      declaredFacets: reading.scores[at]!.total,
      // A Finding that belongs to no Module cannot be shown against one. Where
      // those go is the Inbox's business (#23), and dropping them here would be
      // a Finding that routes to nobody quietly becoming a Finding nobody sees.
      findings: reading.findings
        .filter((finding) => finding.moduleId === moduleId)
        .map((finding) => reportOf(root, finding)),
      lookedFor: reading.checks,
    },
  };
}

/**
 * The read-only surface over a shelf.
 *
 * Every route is a GET. Nothing here writes: re-reading the source is the one
 * write this design has, and it is #26. Until then a request cannot change what
 * the product holds, whatever it asks for.
 */
export function buildServer(shelf: string): FastifyInstance {
  const server = Fastify().withTypeProvider<ZodTypeProvider>();
  server.setValidatorCompiler(validatorCompiler);
  server.setSerializerCompiler(serializerCompiler);

  server.get('/corpus', { schema: { response: { 200: corpusListSchema } } }, async () => {
    const { corpus, passedOver } = await readShelf(shelf);

    for (const skipped of passedOver) {
      server.log.warn({ file: skipped.file, reason: skipped.reason }, 'not read as a Lens');
    }

    const takenAt = new Date().toISOString();
    return { corpus: corpus.map((shelved) => summarise(shelved, takenAt)) };
  });

  server.get(
    '/corpus/:id/reading',
    {
      schema: {
        params: z.object({ id: z.string().min(1) }),
        /**
         * Nothing of that name is held. The answer names what was asked for and
         * says nothing else: which sentence a reader meets is the surface's to
         * choose, and a sentence chosen here would be one written where nobody
         * reading it can see it (LAW-010).
         */
        response: { 200: corpusDetailSchema, 404: z.object({ id: z.string().min(1) }) },
      },
    },
    async (request, reply) => {
      const { corpus } = await readShelf(shelf);
      const shelved = corpus.find((entry) => entry.lens.id === request.params.id);

      // Nothing of that name is on the shelf. What a Corpus that *is* there but
      // cannot be read should say is #27; this is the plainer case of a Corpus
      // the product does not hold.
      if (shelved === undefined) return reply.status(404).send({ id: request.params.id });

      return wholeReading(shelved, new Date().toISOString());
    },
  );

  server.get(
    '/corpus/:id/modules/:moduleId',
    {
      schema: {
        params: z.object({ id: z.string().min(1), moduleId: z.string().min(1) }),
        response: { 200: corpusModuleSchema, 404: notHeldSchema },
      },
    },
    async (request, reply) => {
      const { id, moduleId } = request.params;
      const { corpus } = await readShelf(shelf);
      const shelved = corpus.find((entry) => entry.lens.id === id);

      if (shelved === undefined) {
        return reply.status(404).send({ notHeld: 'corpus', id, moduleId });
      }

      const answer = oneModule(shelved, moduleId, new Date().toISOString());
      if (answer === null) return reply.status(404).send({ notHeld: 'module', id, moduleId });

      return answer;
    },
  );

  return server;
}
