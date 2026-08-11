import { Link } from 'react-router';
import type { CorpusDetail, FacetState, ModuleRow, Movement } from '@vertuo/comply-contract';
import { Figure } from '../components/Figure.js';
import { Aside, Conspicuous, NothingToShow, Readings, Surface } from '../components/layout.js';
import { Card, CardContent } from '../components/ui/card.js';
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table.js';
import { count } from '../words.js';

/**
 * What a cell in each state is drawn as, highest first.
 *
 * The four states are the product's own — is it present, is it well-formed, is
 * it approved — and mean the same thing in every Corpus. What each of them means
 * *here* does not: which rung counts as approved is one Corpus's own word, and
 * arrives in the payload rather than being known.
 *
 * Each state's tone is a token and not a shade written here, because the colour
 * of a cell *is* its meaning: absence has to stay quiet without becoming
 * invisible, and whoever adjusts it next needs to know that is what they are
 * adjusting.
 */
const MARKS: { state: FacetState; mark: string; tone: string }[] = [
  { state: 'approved', mark: '✓', tone: 'text-cell-approved' },
  { state: 'well-formed', mark: '◑', tone: 'text-cell-well-formed' },
  { state: 'present', mark: '◔', tone: 'text-cell-present' },
  { state: 'absent', mark: '·', tone: 'text-cell-absent' },
];

function drawnAs(state: FacetState): { mark: string; tone: string } {
  return MARKS.find((known) => known.state === state) ?? { mark: '', tone: '' };
}

function Cell({ state }: { state: FacetState }) {
  const { mark, tone } = drawnAs(state);

  return (
    // `data-cell` carries the state for anything asserting about it, so no test
    // has to reach for a class name to find out what a cell means.
    <TableCell className={`text-center text-xl leading-none ${tone}`} data-cell={state}>
      <abbr title={state} className="cursor-help no-underline">
        {mark}
      </abbr>
    </TableCell>
  );
}

/**
 * What one Module's figure has done since the last reading kept to compare it
 * against.
 *
 * Three facts, drawn three ways. A reading with nothing behind it is not a
 * figure that held steady, and a page that draws both as `0` tells a person work
 * has stalled when nobody has ever measured it (LAW-006).
 */
function Moved({ movement }: { movement: Movement }) {
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
  if (movement.approvedDelta === 0) {
    return <span data-movement="steady">held steady</span>;
  }

  const gained = movement.approvedDelta > 0;
  return (
    <span
      className="font-semibold text-foreground"
      data-movement={gained ? 'gained' : 'lost'}
    >
      {`${gained ? '▲' : '▼'} ${Math.abs(movement.approvedDelta)}`}
    </span>
  );
}

function Row({ module, corpusId }: { module: ModuleRow; corpusId: string }) {
  return (
    <TableRow>
      {/*
        The Module column stays put while the rest slides under it. It is the
        column every other one is read against, and a row of marks with nothing
        at the left of it says which state something is in without saying what.
      */}
      <TableHead
        scope="row"
        className="sticky left-0 z-10 grid gap-px bg-card align-middle font-normal"
      >
        {/*
          A cell says how far along a Module is and never what to do about it.
          What to do is a Facet at a time, with the reason it fell short, which
          is the page this leads to.
        */}
        <Link
          className="justify-self-start font-semibold text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground"
          to={`/corpus/${encodeURIComponent(corpusId)}/modules/${encodeURIComponent(module.id)}`}
        >
          {module.id}
        </Link>
        {module.owner === null ? (
          // LAW-007: every Finding against this Module routes to nobody, which is
          // a defect and not an empty space.
          <span className="text-sm">
            <Conspicuous>nobody answers for this</Conspicuous>
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">{module.owner}</span>
        )}
      </TableHead>
      {module.cells.map((cell) => (
        <Cell key={cell.facet} state={cell.state} />
      ))}
      <TableCell className="text-sm text-muted-foreground">
        {`${module.approved} of ${module.declaredFacets}`}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        <Moved movement={module.movement} />
      </TableCell>
    </TableRow>
  );
}

/**
 * The Corpus page, which *is* the Readiness Matrix: every Module against every
 * Facet its Lens declares.
 *
 * The grid is primary because it is the only view read in two directions, and
 * the two directions mean different things. Along a row, a Module is thin —
 * ordinary work, routing to its Owner. Down a column, a Facet is absent in
 * *every* Module, which is as often a defect in the denominator as it is work
 * nobody has begun, and no list of Modules can show it.
 *
 * The Corpus's own name is not repeated here. The shell names what is being read,
 * once, at the top; a Corpus named twice on one screen reads as two things, and
 * the second one is always what somebody forgets to change.
 *
 * Nothing here knows what any of it is called. Every column, every rung and
 * every name arrives in the payload, so this draws a Corpus it has never met
 * without being changed (LAW-004).
 */
export function CorpusMatrix({ corpus }: { corpus: CorpusDetail }) {
  const { reading } = corpus;

  if (reading.outcome !== 'read') {
    return (
      <Card className="border-dashed shadow-none">
        <CardContent>
          <NothingToShow>Nothing has been written down from this source yet.</NothingToShow>
        </CardContent>
      </Card>
    );
  }

  const { facets, modules, ladder, readiness, integrity } = reading;
  // A Facet nobody has begun anywhere. Read down the column, which is the reading
  // this page exists for.
  const unstarted = facets.filter((facet) =>
    modules.every((module) => module.cells.find((cell) => cell.facet === facet)?.state === 'absent'),
  );
  const nothingToCompare = modules.some(
    (module) => module.movement.comparedWith === 'no-earlier-reading',
  );

  return (
    <Surface>
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

      <Card>
        <CardContent className="flex flex-col gap-4">
          {modules.length === 0 ? (
            <NothingToShow>No Module has been written down from this source yet.</NothingToShow>
          ) : (
            <>
              {/*
                The one thing on this page that grows with a Corpus grows sideways,
                so it slides inside its own edges. A page that slid instead would
                take the Module column with it — the column every other one is
                read against.

                The wrapper is written here rather than taken from the vendored
                `Table`, which brings an overflow container of its own: two nested
                scrolling boxes are one more than the grid has, and which of them
                a reader is dragging would be anybody's guess.
              */}
              <div data-grid-scroll="" className="relative w-full overflow-x-auto">
                {/*
                  The table is as wide as the Corpus makes it and no wider. Stretched
                  to the page it would hand every spare pixel to the Module column,
                  pushing the marks away from the name they belong to — and reading
                  along a row is half of what the grid is for.
                */}
                <table className="caption-bottom text-sm whitespace-nowrap">
                  <TableHeader>
                    <TableRow>
                      <TableHead scope="col">Module</TableHead>
                      {facets.map((facet) => (
                        <TableHead
                          key={facet}
                          scope="col"
                          /*
                            A Facet no Module has anything under is marked in the
                            head of its own column, because the whole reason the
                            grid is drawn this way is that a column reads as one
                            fact and a list of Modules cannot show it at all.
                          */
                          className={unstarted.includes(facet) ? 'text-mark' : undefined}
                          data-facet={unstarted.includes(facet) ? 'unstarted' : undefined}
                        >
                          {facet}
                        </TableHead>
                      ))}
                      <TableHead scope="col">Approved</TableHead>
                      <TableHead scope="col">Movement</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {modules.map((module) => (
                      <Row key={module.id} module={module} corpusId={corpus.id} />
                    ))}
                  </TableBody>
                </table>
              </div>

              <ul className="flex flex-wrap gap-6 text-sm text-muted-foreground">
                {MARKS.map(({ state, mark, tone }) => (
                  <li key={state} className="flex items-center gap-1.5">
                    <span className={`text-base ${tone}`}>{mark}</span> {state}
                  </li>
                ))}
              </ul>
            </>
          )}

          <Aside>
            {`Every figure here is counted out of the ${count(facets.length, 'Facet')} this Corpus’s Lens declares. Knowledge nobody has written down anywhere is not counted here, and cannot be.`}
          </Aside>
          <Aside>
            {`Approved means at or above “${ladder.approvedAtOrAbove}” on this Corpus’s ladder: ${ladder.levels.join(' → ')}.`}
          </Aside>
          {nothingToCompare && (
            <Aside>
              {'— means there is no earlier reading to compare this one with. It is not the same as nothing having changed.'}
            </Aside>
          )}
          {unstarted.map((facet) => (
            <Aside key={facet}>
              <Conspicuous>{`No Module has anything under “${facet}” yet.`}</Conspicuous>{' '}
              {`It is declared by the Lens “${reading.lensId}”, so either nobody has begun it, or this Corpus does not have it and every figure above is counted out of one too many.`}
            </Aside>
          ))}
        </CardContent>
      </Card>
    </Surface>
  );
}
