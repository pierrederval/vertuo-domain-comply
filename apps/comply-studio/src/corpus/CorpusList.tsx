import { Link } from 'react-router';
import type { CorpusSummary } from '@vertuo/comply-contract';
import { Age } from '../components/Age.js';
import { Figure } from '../components/Figure.js';
import { NothingToShow, Readings, Surface } from '../components/layout.js';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card.js';
import { count } from '../words.js';

/**
 * The two readings of one Corpus, and how old they are.
 *
 * Each carries what it is counted against, and nothing draws a third figure from
 * the pair: they answer different questions — how much is agreed, how much
 * disagrees — demand different work, and often different people. One figure for
 * both would hide which is failing.
 */
function Reading({ reading }: { reading: CorpusSummary['reading'] }) {
  if (reading.outcome !== 'read') {
    return <NothingToShow>Nothing has been written down from this source yet.</NothingToShow>;
  }

  const { readiness, integrity } = reading;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Read from source <Age at={reading.sourceReadAt} />
      </p>
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
    </div>
  );
}

/**
 * Every Corpus the product holds.
 *
 * The shelf is also the sidebar, and this is not a second copy of it: the sidebar
 * is somewhere to go, and this says where each Corpus stands and how old that
 * answer is. A menu has no room for a figure.
 *
 * Nothing here knows the shape of any Corpus. A name, its Modules, and what was
 * looked for in it all arrive in the payload, so this list draws a Corpus it has
 * never met without being changed (LAW-004). A component that knew what a Facet
 * was called would render perfectly and still be a defect.
 */
export function CorpusList({ corpus }: { corpus: CorpusSummary[] }) {
  if (corpus.length === 0) {
    return (
      <Card className="border-dashed shadow-none">
        <CardContent>
          <NothingToShow>No Corpus is on the shelf yet.</NothingToShow>
        </CardContent>
      </Card>
    );
  }

  return (
    <Surface>
      {corpus.map((entry) => (
        <Card key={entry.id}>
          <CardHeader>
            <CardTitle>
              <Link
                to={`/corpus/${encodeURIComponent(entry.id)}`}
                className="underline decoration-border underline-offset-4 hover:decoration-foreground"
              >
                {entry.name}
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Reading reading={entry.reading} />
          </CardContent>
        </Card>
      ))}
    </Surface>
  );
}
