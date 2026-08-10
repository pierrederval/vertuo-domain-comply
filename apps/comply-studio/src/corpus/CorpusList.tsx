import type { CorpusSummary } from '@vertuo/comply-contract';
import { Age } from '../components/Age.js';
import { Figure } from '../components/Figure.js';
import { NothingToShow, Panel, PanelHeading, Page, Stack } from '../components/layout.js';

/** One of a thing is not "1 things". A denominator a reader trips over is one they discount. */
function count(howMany: number, unit: string): string {
  return `${howMany} ${howMany === 1 ? unit : `${unit}s`}`;
}

/**
 * The two readings of one Corpus, side by side.
 *
 * Each carries what it is counted against, and nothing draws a third figure from
 * the pair: they answer different questions — how much is agreed, how much
 * disagrees — demand different work, and often different people. One figure for
 * both would hide which is failing (spec §4).
 */
function Readings({ reading }: { reading: CorpusSummary['reading'] }) {
  if (reading.outcome !== 'read') {
    return <NothingToShow>Nothing has been written down from this source yet.</NothingToShow>;
  }

  const { readiness, integrity } = reading;

  return (
    <>
      <p className="read-at">
        Read from source <Age at={reading.sourceReadAt} />
      </p>
      <div className="readings">
        <Figure
          reading="Readiness"
          counts="Modules fully approved"
          value={readiness.modulesFullyApproved}
          outOf={`of ${count(readiness.modules, 'Module')}`}
        />
        <Figure
          reading="Integrity"
          counts="Open Findings"
          value={integrity.openFindings}
          outOf={`from ${count(integrity.lookedFor.length, 'Check')}`}
          detail={integrity.lookedFor.join(', ')}
        />
      </div>
    </>
  );
}

/**
 * Every Corpus the product holds.
 *
 * Nothing here knows the shape of any of them. A Corpus's name, its Modules, and
 * what was looked for in it all arrive in the payload, so this list draws a Corpus
 * it has never met without being changed (LAW-004). A component that knew what a
 * Facet was called would render perfectly and still be a defect.
 */
export function CorpusList({ corpus }: { corpus: CorpusSummary[] }) {
  return (
    <Page title="Corpus">
      {corpus.length === 0 ? (
        <NothingToShow>No Corpus is on the shelf yet.</NothingToShow>
      ) : (
        <Stack>
          {corpus.map((entry) => (
            <Panel key={entry.id}>
              <PanelHeading>{entry.name}</PanelHeading>
              <Readings reading={entry.reading} />
            </Panel>
          ))}
        </Stack>
      )}
    </Page>
  );
}
