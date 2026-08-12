import { Link } from 'react-router';
import type { CorpusSummary, CriteriaNotFollowed } from '@vertuo/comply-contract';
import { Age } from '../components/Age.js';
import { TwoReadings } from '../components/TwoReadings.js';
import { WhyThereIsNoReading } from '../components/NoReading.js';
import { Conspicuous, NothingToShow, Surface } from '../components/layout.js';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card.js';

/**
 * The two readings of one Corpus, and how old they are.
 *
 * Each carries what it is counted against, and nothing draws a third figure from
 * the pair: they answer different questions — how much is agreed, how much
 * disagrees — demand different work, and often different people. One figure for
 * both would hide which is failing.
 */
function Reading({ reading }: { reading: CorpusSummary['reading'] }) {
  if (reading.outcome !== 'read') return <WhyThereIsNoReading reading={reading} />;

  const { readiness, integrity } = reading;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Read from source <Age at={reading.sourceReadAt} />
      </p>
      <TwoReadings readiness={readiness} integrity={integrity} />
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
export function CorpusList({
  corpus,
  criteriaNotFollowed,
}: {
  corpus: CorpusSummary[];
  criteriaNotFollowed: CriteriaNotFollowed[];
}) {
  if (corpus.length === 0 && criteriaNotFollowed.length === 0) {
    return (
      <Card className="border-dashed shadow-none">
        <CardContent>
          <NothingToShow>
            No Corpus is on the shelf yet. A Corpus arrives as a set of criteria saying
            where its source is and what is asked of it, put on the shelf beside it.
          </NothingToShow>
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
      {criteriaNotFollowed.map((refused) => (
        <Card key={refused.where} className="border-dashed shadow-none">
          <CardHeader>
            {/* Not a link, and not underlined as one. There is no page: what says a
                Corpus has an id, a name and a reading is the file that could not be
                read, so every one of those would have to be invented for it. */}
            <CardTitle>{refused.where}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground" data-cannot-be-read="criteria">
              <Conspicuous>{refused.because}</Conspicuous>
            </p>
          </CardContent>
        </Card>
      ))}
    </Surface>
  );
}
