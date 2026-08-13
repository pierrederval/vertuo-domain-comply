import type { IntegrityFigure, ReadinessFigure } from '@vertuo/comply-contract';
import { Figure } from './Figure.js';
import { Readings } from './layout.js';
import { destinationAt } from '../shell/destinations.js';
import { count } from '../words.js';

/**
 * The two readings of one Corpus, side by side, each carrying what it is counted
 * against and each a way in to its own work.
 *
 * One drawing, wherever they appear. Three surfaces state this pair — the shelf, the
 * grid, and the work surface — and three copies of it would be three chances for one
 * of them to lose a denominator, or to gain a third figure standing for the pair. It
 * cannot gain one here: `Readings` takes exactly two children and says so in its
 * type, and each of them is a `Figure`, which has no drawing without an `outOf`.
 *
 * Nothing fuses them, averages them, or grades them. They answer different questions
 * — how much is agreed, how much disagrees — demand different work, and often
 * different people, so one figure standing for both would hide which is failing
 * (LAW-006, spec §4).
 *
 * Which Corpus arrives as an argument because each tile is a way in to that Corpus's
 * own work, and there is no shelf-wide anything to fall back on: every figure in the
 * product belongs to one Corpus, and on the shelf this pair is drawn once per Corpus.
 */
export function TwoReadings({
  corpusId,
  readiness,
  integrity,
}: {
  corpusId: string;
  readiness: ReadinessFigure;
  integrity: IntegrityFigure;
}) {
  const held = `/corpus/${encodeURIComponent(corpusId)}`;
  const grid = destinationAt('readiness');
  const queue = destinationAt('inbox');

  return (
    <Readings>
      {[
        <Figure
          key="readiness"
          reading="Readiness"
          icon={grid.icon}
          counts="Modules fully approved"
          value={readiness.modulesFullyApproved}
          outOf={`of ${count(readiness.modules, 'Module')}`}
          to={`${held}/${grid.at}`}
          answers={grid.describes}
        />,
        <Figure
          key="integrity"
          reading="Integrity"
          icon={queue.icon}
          counts="Open Findings"
          value={integrity.openFindings}
          outOf={`from ${count(integrity.lookedFor.length, 'Check')}`}
          detail={integrity.lookedFor.join(', ')}
          to={`${held}/${queue.at}`}
          answers={queue.describes}
        />,
      ]}
    </Readings>
  );
}
