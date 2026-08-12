import type { CorpusChange, Since, WrittenDown } from '@vertuo/comply-contract';
import type { Lens } from '@vertuo/comply-lens';
import { readSeededCorpus, whatChanged, type Reading } from '@vertuo/comply-reading';
import { readSeed } from '@vertuo/comply-seed';
import type { ShelvedCorpus } from './shelf.js';

/**
 * Every time this source was read and said something it had not said before, oldest
 * first.
 *
 * One per writing-down the shelf holds, and there is one of those per change at
 * source: re-reading unchanged source finds what is already held and writes nothing
 * (ADR-0012). So this cannot become a report of runs, which is what ADR-0012 exists
 * to keep out of the record — not by a rule anybody follows, but because a run that
 * changed nothing leaves nothing behind to report.
 */
export function whenReadFromSource(shelved: ShelvedCorpus): WrittenDown[] {
  return shelved.writtenDown.map((held) => ({ at: held.heldAt.toISOString() }));
}

/** What a Facet is called, from the Lens that declared it. */
function labelOf(lens: Lens, facet: string): string {
  const declared = lens.facets.find((held) => held.name === facet);
  return declared?.label ?? facet;
}

/**
 * What a Facet or a Finding did since the last reading kept for this Corpus, or
 * which of three reasons means nothing can be said about it.
 *
 * The criteria are checked before the knowledge, on the same two values `trend`
 * compares and in the same order, so the top of the page and the movement beside
 * each figure cannot say different things. Where the criteria moved, nothing here is
 * a comparison of knowledge at all: a Facet asking for more than it did last week
 * drops every figure in the Corpus without a word of the knowledge changing.
 *
 * Where they held, the earlier reading is worked out again from the knowledge it was
 * made of. A recorded reading holds the figures and not the Facets they were counted
 * from — that is LAW-011 keeping a cache to what a rebuild could reproduce — so this
 * is the rebuild, and it is the first thing to need one.
 *
 * **The criteria to rebuild against are the ones in hand.** They are only used where
 * the two digests agree, and a Lens digest is taken over everything a Lens says
 * (ADR-0032), so agreeing digests mean the criteria held on the shelf say exactly
 * what these do. The one field they differ in is where the documents are, which is
 * supplied on the day and moves no figure and no Finding's words.
 *
 * Where the knowledge that reading was made of is no longer on the shelf — pruned
 * away, or written down in a form this can no longer read — the figures still
 * compare and this cannot. Said as a statement of its own rather than as an empty
 * list, because *nothing moved* and *nothing can be worked out* are different facts.
 */
export async function whatMoved(
  shelved: ShelvedCorpus,
  now: Reading,
  reportTrouble: (because: string) => void,
): Promise<Since> {
  const { lens, lastRecorded, writtenDown } = shelved;

  if (lastRecorded === null) return { comparedWith: 'no-earlier-reading' };
  if (lastRecorded.lensDigest !== now.asRecorded.lensDigest) {
    return { comparedWith: 'a-reading-under-other-criteria' };
  }

  const held = writtenDown.find((seed) => seed.digest === lastRecorded.seedDigest);
  if (held === undefined) return { comparedWith: 'knowledge-no-longer-held' };

  let before: Reading;
  try {
    before = readSeededCorpus(await readSeed(held.path), lens, lastRecorded.takenAt, null);
  } catch (cause) {
    // Which of the reasons it was goes to the log and not to the page. What a
    // reader is owed here is that the comparison cannot be made; what to do about
    // knowledge written down in an older form is one sentence, and where it is said
    // is #27's work.
    reportTrouble(cause instanceof Error ? cause.message : String(cause));
    return { comparedWith: 'knowledge-no-longer-held' };
  }

  const moved = whatChanged(before, now);
  const changed: CorpusChange[] = [
    ...moved.facets.map((crossed) => ({
      changed: 'facet' as const,
      moduleId: crossed.moduleId,
      facet: crossed.facet,
      label: labelOf(lens, crossed.facet),
      approved: crossed.approved,
    })),
    ...moved.findings.map(({ finding, appeared }) => ({
      changed: 'finding' as const,
      // The words the Check reported, exactly. A feed that summarised a Finding
      // would show a reader a second-hand account of the very thing this product
      // exists to detect.
      says: finding.message,
      moduleId: finding.moduleId,
      appeared,
    })),
  ];

  return { comparedWith: 'the-last-reading', takenAt: lastRecorded.takenAt, changed };
}
