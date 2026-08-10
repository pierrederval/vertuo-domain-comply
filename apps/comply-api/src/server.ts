import Fastify, { type FastifyInstance } from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { corpusListSchema, type CorpusReading, type CorpusSummary } from '@vertuo/comply-contract';
import { readSeededCorpus } from '@vertuo/comply-reading';
import { readShelf, type ShelvedCorpus } from './shelf.js';

/**
 * What the product can say about one Corpus right now.
 *
 * The reading is computed on request. Recording readings so a trend can be drawn
 * against them is #24; until then there is nothing to serve but a fresh one, and
 * the age reported is the age of the knowledge it was made from — never the moment
 * the figures happened to be computed, which would claim the source had just been
 * looked at.
 */
function summarise(shelved: ShelvedCorpus, takenAt: string): CorpusSummary {
  const { lens, seed, sourceReadAt } = shelved;
  const name = lens.name ?? lens.id;

  if (seed === null || sourceReadAt === null) {
    return { id: lens.id, name, reading: { outcome: 'nothing-written-down-yet' } };
  }

  const { scores, findings, checks } = readSeededCorpus(seed, lens, takenAt, null);

  const reading: CorpusReading = {
    outcome: 'read',
    sourceReadAt: sourceReadAt.toISOString(),
    // Two readings, side by side, each carrying what it is out of. Nothing here
    // combines them, and no third figure is derived from them (spec §4).
    readiness: {
      modulesFullyApproved: scores.filter((score) => score.approved === score.total).length,
      modules: scores.length,
    },
    integrity: { openFindings: findings.length, lookedFor: checks },
  };

  return { id: lens.id, name, reading };
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

  return server;
}
