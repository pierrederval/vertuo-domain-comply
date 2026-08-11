const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Whole units, and the unit is never dropped: "4 hours ago", never "4". */
function inWords(elapsed: number): string {
  if (elapsed < MINUTE) return 'just now';
  if (elapsed < HOUR) return plural(Math.floor(elapsed / MINUTE), 'minute');
  if (elapsed < DAY) return plural(Math.floor(elapsed / HOUR), 'hour');
  return plural(Math.floor(elapsed / DAY), 'day');
}

function plural(count: number, unit: string): string {
  return `${count} ${count === 1 ? unit : `${unit}s`} ago`;
}

export interface AgeProps {
  /** When the thing happened. */
  at: string;
  /** Overridable so the phrase can be asserted against a fixed moment. */
  now?: Date;
}

/**
 * How long ago something was, in words, with the exact moment kept for anyone who
 * wants it.
 *
 * Always shown wherever a reading is shown. A surface that cannot say how old its
 * reading is invites false confidence in it (spec §5.1), and a timestamp nobody
 * can read at a glance is the same failure politely dressed.
 */
export function Age({ at, now }: AgeProps) {
  const moment = new Date(at);
  const elapsed = (now ?? new Date()).getTime() - moment.getTime();

  return (
    <time
      className="cursor-help border-b border-dotted border-border"
      dateTime={at}
      title={moment.toISOString()}
    >
      {inWords(Math.max(0, elapsed))}
    </time>
  );
}
