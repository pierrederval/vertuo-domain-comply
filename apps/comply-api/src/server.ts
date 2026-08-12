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
  corpusFactSchema,
  corpusHomeSchema,
  corpusInboxSchema,
  corpusListSchema,
  corpusModuleSchema,
  notHeldSchema,
  sourceWasReadSchema,
  type CitedPlace,
  type CorpusDetail,
  type CorpusFact,
  type CorpusHome,
  type CorpusInbox,
  type CorpusModule,
  type CorpusReading,
  type CorpusSummary,
  type InboxFinding,
  type IntegrityFigure,
  type ModuleFacet,
  type ModuleFinding,
  type ModuleRow,
  type Movement,
  type NeedsWork,
  type Place,
  type ReadinessFigure,
  type RoutedFindings,
  type SourceText,
  type SourceWasRead,
  type WrittenPart,
} from '@vertuo/comply-contract';
import type { AttributeValue, Finding, SourceLocation } from '@vertuo/comply-core';
import type { Lens } from '@vertuo/comply-lens';
import { readTheSourceAgain, shelfAt } from '@vertuo/comply-door';
import { factsUnder, type TrendRow } from '@vertuo/comply-readiness';
import { readSeededCorpus, type Reading } from '@vertuo/comply-reading';
import type { Seed } from '@vertuo/comply-seed';
import { whatMoved, whenReadFromSource } from './home.js';
import { everyLensOn, readShelf, type ShelvedCorpus } from './shelf.js';

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
 * The reading is computed on request and is never written down here: a reading is
 * free, and one goes on record only where a Seed is loaded, which is the one route
 * below that writes (ADR-0016). This is why answering about a Corpus is a GET however
 * often it is asked.
 *
 * What it is compared against is the reading on record that is not this one, read off
 * the shelf.
 * The age reported is the age of the knowledge the reading was made from — never
 * the moment the figures happened to be computed, which would claim the source had
 * just been looked at.
 */
function readNow(shelved: ShelvedCorpus, takenAt: string): Reading | null {
  const { lens, seed, lastRecorded } = shelved;
  return seed === null ? null : readSeededCorpus(seed, lens, takenAt, lastRecorded);
}

/**
 * When the knowledge a reading is made of was written down, or nothing where the
 * source has never been read.
 *
 * The last of the writings-down the shelf holds, because a Seed is never rewritten:
 * the most recent one is the knowledge in hand, and the moment it appeared is how
 * old every figure counted from it is.
 */
function whenWrittenDown(shelved: ShelvedCorpus): Date | null {
  return shelved.writtenDown.at(-1)?.heldAt ?? null;
}

function summarise(shelved: ShelvedCorpus, takenAt: string): CorpusSummary {
  const { lens } = shelved;
  const sourceReadAt = whenWrittenDown(shelved);
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
 * Three statements on the wire because there are three at the reading, and the
 * mapping is written out rather than passed through: the reading's words are the
 * core's and the agreement's are what a person is eventually shown, so a fourth
 * arriving on either side has to be answered for here rather than travelling
 * unnoticed.
 *
 * Nothing is collapsed. *Nothing to compare with* and *read against other
 * criteria* both decline to state a delta, and they decline for different reasons a
 * reader acts on differently — the first is a Corpus nobody has measured twice, the
 * second is a bar that moved.
 */
function movementOf(row: TrendRow): Movement {
  switch (row.comparedWith) {
    case 'no-earlier-reading':
      return { comparedWith: 'no-earlier-reading' };
    case 'a-reading-under-other-criteria':
      return { comparedWith: 'a-reading-under-other-criteria' };
    case 'the-last-reading':
      return { comparedWith: 'the-last-reading', approvedDelta: row.approvedDelta };
  }
}

/**
 * What needs a person in one Corpus, and what moved in it (spec §5.1).
 *
 * The same two figures the list and the grid carry, from the same derivation, and
 * then the Modules where there is work. The Modules are in this Corpus's own order:
 * an order by how thin each one is would be a ranking, and a ranking is a figure by
 * another name — the same refusal the Inbox makes about whose queue is longest.
 *
 * A Module short of nothing is left out rather than shown as finished. What it holds
 * is on the grid, where its Facets are stated one by one; a work list that carried
 * everything would be the grid again, in a shape that cannot be read down a column.
 *
 * Two horizons, both stated. Every writing-down of the source is still held, so
 * every one of them can be named; what a Facet or a Finding did can only be stated
 * since the last reading kept, because that is as far back as the shelf holds
 * anything to work it out from.
 */
async function homeOf(
  shelved: ShelvedCorpus,
  takenAt: string,
  reportTrouble: (because: string) => void,
): Promise<CorpusHome> {
  const { lens } = shelved;
  const sourceReadAt = whenWrittenDown(shelved);
  const name = lens.name ?? lens.id;
  const reading = readNow(shelved, takenAt);

  if (reading === null || sourceReadAt === null) {
    return { id: lens.id, name, reading: { outcome: 'nothing-written-down-yet' } };
  }

  // Scores and trend are derived from the matrix's rows in order, so the two line
  // up Module for Module.
  const needsWork: NeedsWork[] = reading.scores.flatMap((score, at) =>
    score.approved === score.total
      ? []
      : [
          {
            id: score.moduleId,
            owner: score.owner,
            approved: score.approved,
            declaredFacets: score.total,
            movement: movementOf(reading.trend[at]!),
          },
        ],
  );

  return {
    id: lens.id,
    name,
    reading: {
      outcome: 'read',
      sourceReadAt: sourceReadAt.toISOString(),
      lensId: reading.matrix.lensId,
      ladder: { levels: lens.maturity.levels, approvedAtOrAbove: lens.maturity.approvedAtOrAbove },
      ...figures(reading),
      declaredFacets: lens.facets.length,
      needsWork,
      writtenDown: whenReadFromSource(shelved),
      since: await whatMoved(shelved, reading, reportTrouble),
    },
  };
}

/**
 * One Corpus, whole: every Module against every Facet its Lens declares.
 *
 * Every Module appears, including one with nothing in it, and every declared
 * Facet appears, including one no Module has filled — a column of absences is
 * the finding, not a row to leave out (spec §5.3).
 */
function wholeReading(shelved: ShelvedCorpus, takenAt: string): CorpusDetail {
  const { lens } = shelved;
  const sourceReadAt = whenWrittenDown(shelved);
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
    movement: movementOf(reading.trend[at]!),
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
  const { lens } = shelved;
  const sourceReadAt = whenWrittenDown(shelved);
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
 * One place, and no more than one piece of knowledge is written down at it.
 *
 * Every extractor there is reads one thing per heading or one thing per row, so no
 * two things share a line: across the two fixture Corpus and the real one, 1520
 * pieces of knowledge are written at 1520 distinct places. Were that ever to stop
 * holding, what stops holding with it is a piece of knowledge having a name at all
 * — which is the agreement's own statement about what identifies one, and not this
 * surface's to repair.
 */
function samePlace(one: Place, other: Place): boolean {
  return one.file === other.file && one.line === other.line;
}

/**
 * What was asked for at an address this shelf holds a Corpus for, and has not.
 *
 * The two are told apart for the reason the Corpus and the Module are: they send a
 * reader to different places, and one sentence for both would send half of the
 * people who meet it to the wrong one.
 */
type NotHeldHere = 'module' | 'knowledge';

/**
 * The source text one piece of knowledge was read out of.
 *
 * Taken from the knowledge as written down and not from the source, which is what
 * lets a reader be shown the text a claim came from on a machine that cannot reach
 * the documents at all (spec §3.3). It was written down at extraction and has
 * reached no reader until now.
 *
 * Nothing where the knowledge on the shelf carries no text for that place — the
 * surface says so rather than drawing an empty quotation, because a reader shown
 * one has been shown a claim they cannot check and told nothing about why.
 */
function quotedAt(seed: Seed, at: Place): SourceText | null {
  const document = seed.documents.find((held) => held.path === at.file);
  const item = document?.items.find((held) => held.line === at.line);
  if (item === undefined || item.excerpt === '') return null;
  return { says: item.excerpt, cut: item.excerptCut };
}

/**
 * The parts one piece of knowledge is written in, in the order its source writes
 * them.
 *
 * Every part the reading holds, including the ones an extractor made rather than
 * the source. A Facet may state a criterion against any of them, and a reader
 * shown fewer parts than the criteria are stated against cannot check the
 * shortfall they were told about.
 *
 * A passage that says nothing at all is left out, because that is already what the
 * reading counts as nothing written down under a part — and the source text
 * alongside still shows whatever it was written under.
 */
function partsOf(attributes: Record<string, AttributeValue>): WrittenPart[] {
  const written: WrittenPart[] = [];

  for (const [named, value] of Object.entries(attributes)) {
    // Each passage as written. Two of them are two, never one: passages that are
    // not next to each other in the source are not continuous prose (ADR-0017).
    const says = (Array.isArray(value) ? value : [value]).filter((one) => one.trim() !== '');
    if (says.length > 0) written.push({ named, says });
  }

  return written;
}

/**
 * One piece of knowledge, whole, or nothing where this Corpus writes none at the
 * place asked about.
 *
 * Asked for by where it is written down, because that is the one name every Corpus
 * gives a piece of knowledge — nothing in a Lens promises it another (spec §5.4).
 * The Module is part of the address and is checked rather than trusted: the place
 * alone would answer, and answering it would put one Module's knowledge on another
 * Module's page.
 *
 * Nothing is judged here. Which rung it sits at, what corroborates it, and which
 * Facet it is under were all decided where the reading was taken; this puts the
 * reading beside the text it was read out of.
 */
function oneFact(
  shelved: ShelvedCorpus,
  moduleId: string,
  at: Place,
  takenAt: string,
): CorpusFact | NotHeldHere {
  const { lens, seed } = shelved;
  const sourceReadAt = whenWrittenDown(shelved);
  const corpus = { id: lens.id, name: lens.name ?? lens.id };
  const reading = readNow(shelved, takenAt);

  // Nothing has been written down, so nothing is at that place — which is a
  // different answer from a place this Corpus writes nothing at, and sends a
  // reader somewhere else.
  if (reading === null || seed === null || sourceReadAt === null) {
    return { corpus, reading: { outcome: 'nothing-written-down-yet' } };
  }

  // Told apart, because they send a reader to different places: a name this
  // Corpus does not have is a name to go and check, and a place it writes nothing
  // at is a place to go and look at.
  if (!reading.matrix.rows.some((row) => row.moduleId === moduleId)) return 'module';

  const { root } = lens.adapter;
  const fact = reading.corpus.facts.find(
    (held) =>
      (held.moduleId ?? held.id) === moduleId && samePlace(placeOf(root, held.origin), at),
  );
  if (fact === undefined) return 'knowledge';

  // Read under a Facet the Lens declares, or it would not have been read at all.
  const declared = lens.facets.find((facet) => facet.name === fact.facet)!;

  return {
    corpus,
    reading: {
      outcome: 'read',
      sourceReadAt: sourceReadAt.toISOString(),
      lensId: reading.matrix.lensId,
      ladder: { levels: lens.maturity.levels, approvedAtOrAbove: lens.maturity.approvedAtOrAbove },
      at,
      moduleId,
      facet: declared.name,
      label: declared.label ?? declared.name,
      // The two readings of one piece of knowledge, side by side and neither
      // standing for the other (LAW-005). Nothing is derived from the pair.
      maturity: fact.maturityLevel,
      sources: [...fact.sources],
      written: partsOf(fact.attributes),
      quoted: quotedAt(seed, at),
    },
  };
}

/**
 * Which Module writes knowledge at each place this Corpus writes any.
 *
 * Keyed on the place, because a place names at most one piece of knowledge — the
 * assumption ADR-0030 wrote down, and the same one that makes a place an address.
 * Built once and looked up, rather than searched per Finding: the DDD Corpus writes
 * 1506 places and its Findings cite 155 of them.
 */
function whoWritesWhere(reading: Reading, root: string): Map<string, string> {
  const written = new Map<string, string>();

  for (const fact of reading.corpus.facts) {
    const at = placeOf(root, fact.origin);
    written.set(`${at.file}:${at.line}`, fact.moduleId ?? fact.id);
  }

  return written;
}

/**
 * One place a Finding concerns, with the source text there and the Module that
 * wrote it.
 *
 * The Module is resolved from the place and never from the Finding, because the two
 * disagree and often: a Finding routes to the Module it is *about* and cites the
 * place the words are *written*, and a Module referred to but never written reaches
 * Findings citing places written under somebody else entirely. An address built out
 * of the Finding's own Module would be refused, correctly, by the surface that opens
 * a place.
 *
 * Nothing for either where there is nothing. A Finding may cite a place precisely to
 * say that nothing is written at it, and that is the answer rather than a fault.
 */
function citedAt(
  seed: Seed,
  written: Map<string, string>,
  root: string,
  origin: SourceLocation,
): CitedPlace {
  const at = placeOf(root, origin);

  return {
    at,
    writtenUnder: written.get(`${at.file}:${at.line}`) ?? null,
    quoted: quotedAt(seed, at),
  };
}

/**
 * One Corpus's Findings as a queue apiece, the ones reaching nobody first.
 *
 * The one surface where every Finding is accounted for. A Module's page shows only
 * its own, and a Finding belonging to no Module appears on no Module's page at all —
 * so a Finding this dropped would be a Finding nowhere in the product shows.
 *
 * Who answers for each comes from the reading's own Modules and never from the
 * Finding, so this and the grid cannot come to disagree about who answers for a
 * Module. Nothing is judged here: what was found, and against what, were both
 * decided where the reading was taken (spec §5.2).
 */
function inboxOf(shelved: ShelvedCorpus, takenAt: string): CorpusInbox {
  const { lens, seed } = shelved;
  const sourceReadAt = whenWrittenDown(shelved);
  const corpus = { id: lens.id, name: lens.name ?? lens.id };
  const reading = readNow(shelved, takenAt);

  // Nothing has been written down, so there was nothing to look at — which is a
  // different answer from a Corpus nothing was found in, and would otherwise tell
  // a reader their knowledge is clean when nobody has read it.
  if (reading === null || seed === null || sourceReadAt === null) {
    return { corpus, reading: { outcome: 'nothing-written-down-yet' } };
  }

  const { root } = lens.adapter;
  const written = whoWritesWhere(reading, root);
  const answersFor = new Map(reading.matrix.rows.map((row) => [row.moduleId, row.owner]));

  // The queue reaching nobody first, then one per person in the order they first
  // answer for a Module here — this Corpus's own order, and not one invented. An
  // order by how much each holds would be a ranking, which is a figure by another
  // name.
  const queues = new Map<string | null, InboxFinding[]>([[null, []]]);
  for (const row of reading.matrix.rows) {
    if (row.owner !== null && !queues.has(row.owner)) queues.set(row.owner, []);
  }

  for (const finding of reading.findings) {
    // A Finding belonging to no Module reaches nobody, and so does one belonging
    // to a Module nobody answers for. They are different work and go to the same
    // queue: what the reader is asked for is a person, and there is none.
    const owner = finding.moduleId === null ? null : answersFor.get(finding.moduleId) ?? null;

    queues.get(owner)!.push({
      says: finding.message,
      moduleId: finding.moduleId,
      cites: citedAt(seed, written, root, finding.origin),
      alsoCites: (finding.relatedOrigins ?? []).map((also) =>
        citedAt(seed, written, root, also),
      ),
    });
  }

  const routesTo: RoutedFindings[] = [...queues.entries()]
    // A person with nothing to answer for has no queue rather than an empty one:
    // drawn, an empty queue reads as work that has been dealt with.
    .filter(([, findings]) => findings.length > 0)
    .map(([owner, findings]) => ({ owner, findings }));

  return {
    corpus,
    reading: {
      outcome: 'read',
      sourceReadAt: sourceReadAt.toISOString(),
      lensId: reading.matrix.lensId,
      routesTo,
      lookedFor: reading.checks,
    },
  };
}

/**
 * Reads one Corpus's source again, and says what that did to the knowledge.
 *
 * The whole operation is `@vertuo/comply-door`'s and is not written twice: the runner
 * reads the source through the same function, so what a build says about a Corpus and
 * what a person is shown are readings of the same knowledge, arrived at the same way
 * (LAW-002, spec §5.5).
 *
 * A failure is an answer and not a fault. The documents are a separate checkout and a
 * shelf outlives one, so a reader meets this — with the previous reading untouched
 * beside it, because nothing is written until the source has been read.
 */
async function readSourceOf(shelf: string, lens: Lens): Promise<SourceWasRead> {
  try {
    const read = await readTheSourceAgain(shelfAt(shelf), lens, new Date().toISOString());
    return { outcome: 'read', unchangedAtSource: read.unchangedAtSource };
  } catch (cause) {
    // The sentence is the Door's, so the runner and this say the same thing about the
    // same failure — and every way out of that operation carries one, which is why this
    // passes the words through rather than choosing its own (LAW-010).
    return {
      outcome: 'could-not-read',
      because:
        cause instanceof Error
          ? cause.message
          : 'This Corpus could not be read from its source. Nothing that was already read has changed.',
    };
  }
}

/**
 * One read of one Corpus at a time, in this process.
 *
 * Extraction takes milliseconds on a fixture Corpus and up to a quarter of a second
 * on the real one, so a second press landing inside the first is something that
 * happens rather than something to imagine. Left to overlap, both find nothing on
 * record and both write — the duplicated reading ADR-0016 exists to prevent, arriving
 * by a route its deduplication cannot see — and both then tell a reader that something
 * came in, when the source changed once.
 *
 * Waiting is per Corpus. One shelf holds twenty, and a queue across all of them would
 * make the twentieth person wait out the nineteen ahead of them for a read of a source
 * nobody else was touching.
 *
 * This is one process's promise and not the shelf's. The runner writes to the same
 * shelf and knows nothing of this, which is safe for the reason a Seed is safe — every
 * write here is digest-named, written aside and moved into place, so the worst two
 * writers can do is one extra reading on record, which a prune drops and no comparison
 * is stated against (see `earlierReading`).
 */
function oneAtATime(): (id: string, read: () => Promise<SourceWasRead>) => Promise<SourceWasRead> {
  const after = new Map<string, Promise<unknown>>();

  return (id, read) => {
    const reading = (after.get(id) ?? Promise.resolve()).then(read, read);
    // Settled either way, so a read that failed does not hold up the one behind it —
    // and the one behind it is often somebody putting right what made it fail.
    after.set(
      id,
      reading.catch(() => undefined),
    );
    return reading;
  };
}

/**
 * The surface over a shelf.
 *
 * Every route that answers about a Corpus is a GET, and exactly one writes: reading
 * the source again, which is the Door's second operation and the only way knowledge
 * arrives (LAW-002). It is asked for as what it is, so a read cannot be reached by
 * following a link — and a reading, which is free, is never mistaken for one.
 */
export function buildServer(shelf: string): FastifyInstance {
  const server = Fastify().withTypeProvider<ZodTypeProvider>();
  server.setValidatorCompiler(validatorCompiler);
  server.setSerializerCompiler(serializerCompiler);
  const queued = oneAtATime();

  server.get('/corpus', { schema: { response: { 200: corpusListSchema } } }, async () => {
    const { corpus, passedOver } = await readShelf(shelf);

    for (const skipped of passedOver) {
      // A Lens that cannot be followed and knowledge written down in an older form
      // both land here, so what is said covers either.
      server.log.warn({ file: skipped.file, reason: skipped.reason }, 'this Corpus was passed over');
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
    '/corpus/:id/home',
    {
      schema: {
        params: z.object({ id: z.string().min(1) }),
        /**
         * Still a GET, and still nothing written. Working out where this Corpus
         * stood at the last reading means reading its retained knowledge back and
         * applying the Lens to it again — which produces a value and leaves the
         * shelf exactly as it was (LAW-002, ADR-0016).
         */
        response: { 200: corpusHomeSchema, 404: z.object({ id: z.string().min(1) }) },
      },
    },
    async (request, reply) => {
      const { corpus } = await readShelf(shelf);
      const shelved = corpus.find((entry) => entry.lens.id === request.params.id);

      if (shelved === undefined) return reply.status(404).send({ id: request.params.id });

      return homeOf(shelved, new Date().toISOString(), (because) =>
        server.log.warn(
          { corpus: request.params.id, reason: because },
          'the knowledge the last reading on record was made of could not be read back',
        ),
      );
    },
  );

  server.post(
    '/corpus/:id/reads',
    {
      schema: {
        params: z.object({ id: z.string().min(1) }),
        /**
         * A failure comes back as an answer with a 200, as *nothing written down yet*
         * does. Both are facts about a Corpus rather than a request that went wrong,
         * and both are things a reader is owed a sentence about — inventing a second
         * language of status codes to carry one of them would leave the sentence
         * somewhere the surface has to guess at it.
         */
        response: { 200: sourceWasReadSchema, 404: z.object({ id: z.string().min(1) }) },
      },
    },
    async (request, reply) => {
      // The criteria, and not a reading of the knowledge. A Corpus whose knowledge is
      // written down in a form this can no longer read is passed over by every reading
      // there is, and reading its source again is precisely the one thing to do about
      // it — so the action has to be reachable on exactly the Corpus that cannot be
      // reported on.
      const { lenses } = await everyLensOn(shelf);
      const lens = lenses.find((held) => held.id === request.params.id);

      if (lens === undefined) return reply.status(404).send({ id: request.params.id });

      return queued(lens.id, () => readSourceOf(shelf, lens));
    },
  );

  server.get(
    '/corpus/:id/inbox',
    {
      schema: {
        params: z.object({ id: z.string().min(1) }),
        /**
         * The whole queue travels, and the surface narrows it to one person. Asked
         * for per person, the page could not say how many Findings reach nobody
         * without asking a second time — and two answers about one Corpus is how
         * the loudest thing on the page comes to disagree with the rest of it.
         */
        response: { 200: corpusInboxSchema, 404: z.object({ id: z.string().min(1) }) },
      },
    },
    async (request, reply) => {
      const { corpus } = await readShelf(shelf);
      const shelved = corpus.find((entry) => entry.lens.id === request.params.id);

      if (shelved === undefined) return reply.status(404).send({ id: request.params.id });

      return inboxOf(shelved, new Date().toISOString());
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

  server.get(
    '/corpus/:id/modules/:moduleId/knowledge',
    {
      schema: {
        params: z.object({ id: z.string().min(1), moduleId: z.string().min(1) }),
        /**
         * Where the knowledge is written down, as the two things a place is.
         *
         * Named rather than folded into the address, because a document's path
         * holds separators of its own: one carrying them encoded is an address
         * that works here and is taken apart by the first thing that tidies a
         * path on its way through.
         */
        querystring: z.object({
          in: z.string().min(1),
          /** Counted from one, as an editor counts. */
          line: z.coerce.number().int().positive(),
        }),
        response: { 200: corpusFactSchema, 404: notHeldSchema },
      },
    },
    async (request, reply) => {
      const { id, moduleId } = request.params;
      const { corpus } = await readShelf(shelf);
      const shelved = corpus.find((entry) => entry.lens.id === id);

      if (shelved === undefined) {
        return reply.status(404).send({ notHeld: 'corpus', id, moduleId });
      }

      const at = { file: request.query.in, line: request.query.line };
      const answer = oneFact(shelved, moduleId, at, new Date().toISOString());
      if (typeof answer === 'string') {
        return reply.status(404).send({ notHeld: answer, id, moduleId });
      }

      return answer;
    },
  );

  return server;
}
