import type { NoReading } from '@vertuo/comply-contract';
import { Conspicuous, NothingToShow } from './layout.js';

/**
 * What a Corpus with no reading says, and what would give it one (spec §8, AC-6).
 *
 * One drawing, on all five surfaces that meet it. Each of them held its own copy of
 * one sentence — *Nothing has been written down from this source yet.* — and every
 * one of those copies was the same wrong sentence for a Corpus whose source *had*
 * been read and could not be read back. That is not a blank space; it is worse,
 * because it reads as a fact and sends a reader to do a thing they have already done.
 *
 * Neither sentence stops at the absence. A reader looking at a page with nothing on it
 * is owed what is missing *and* what would fill it, and *nothing has been written down*
 * on its own is only the first half.
 *
 * The reason for a Corpus that could not be read is drawn exactly as it arrived. It is
 * written where the failure is known — in the Door, or beside the rule that refused a
 * set of criteria — so the runner and this say one thing about one shelf (ADR-0034). A
 * sentence composed here would be a second wording to keep in step, and this component
 * knows nothing about which of the failures it is.
 */
export function WhyThereIsNoReading({ reading }: { reading: NoReading }) {
  if (reading.outcome === 'could-not-be-read') {
    return (
      <p className="text-muted-foreground" data-cannot-be-read="knowledge">
        <Conspicuous>{reading.because}</Conspicuous>
      </p>
    );
  }

  return (
    <NothingToShow>
      Nothing has been written down from this source yet. Reading the source writes down
      what it says, and this Corpus is read from that.
    </NothingToShow>
  );
}
