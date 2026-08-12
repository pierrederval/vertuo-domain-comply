import type { Movement } from '@vertuo/comply-contract';

/**
 * What one Module's figure has done since the last reading kept to compare it
 * against.
 *
 * Four facts, drawn four ways, and the two that are not a number are not the same
 * fact. A reading with nothing behind it is not a figure that held steady, and a
 * page that draws both as `0` tells a person work has stalled when nobody has ever
 * measured it (LAW-006).
 *
 * A reading taken against other criteria is the third of those, and it is not `—`
 * either: there *is* an earlier reading, and what changed is what was asked of the
 * Corpus rather than what the Corpus says. Drawn as a loss it would report the
 * knowledge getting worse on the morning somebody raised the bar (§6).
 *
 * One component, because two surfaces state this movement — the grid and the work
 * list — and two drawings of it would be two answers to one question. The kind that
 * disagree quietly, and only about the awkward cases.
 */
export function Moved({ movement }: { movement: Movement }) {
  if (movement.comparedWith === 'no-earlier-reading') {
    return (
      <abbr
        className="cursor-help no-underline"
        data-movement="none"
        title="there is no earlier reading to compare this one with"
      >
        —
      </abbr>
    );
  }
  if (movement.comparedWith === 'a-reading-under-other-criteria') {
    return (
      <abbr
        className="cursor-help no-underline"
        data-movement="other-criteria"
        title="the last reading was taken against different criteria, so nothing about this figure’s movement can be stated"
      >
        criteria changed
      </abbr>
    );
  }
  if (movement.approvedDelta === 0) {
    return <span data-movement="steady">held steady</span>;
  }

  const gained = movement.approvedDelta > 0;
  return (
    <span className="font-semibold text-foreground" data-movement={gained ? 'gained' : 'lost'}>
      {`${gained ? '▲' : '▼'} ${Math.abs(movement.approvedDelta)}`}
    </span>
  );
}
