import type { IntegrityFigure, ReadinessFigure } from '@vertuo/comply-contract';
import { Figure } from './Figure.js';
import { Readings } from './layout.js';
import { count } from '../words.js';

/**
 * The two readings of one Corpus, side by side, each carrying what it is counted
 * against.
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
 */
export function TwoReadings({
  readiness,
  integrity,
}: {
  readiness: ReadinessFigure;
  integrity: IntegrityFigure;
}) {
  return (
    <Readings>
      {[
        <Figure
          key="readiness"
          reading="Readiness"
          counts="Modules fully approved"
          value={readiness.modulesFullyApproved}
          outOf={`of ${count(readiness.modules, 'Module')}`}
        />,
        <Figure
          key="integrity"
          reading="Integrity"
          counts="Open Findings"
          value={integrity.openFindings}
          outOf={`from ${count(integrity.lookedFor.length, 'Check')}`}
          detail={integrity.lookedFor.join(', ')}
        />,
      ]}
    </Readings>
  );
}
