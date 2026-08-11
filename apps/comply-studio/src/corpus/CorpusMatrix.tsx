import { Link } from 'react-router';
import type { CorpusDetail, FacetState, ModuleRow, Movement } from '@vertuo/comply-contract';
import { Age } from '../components/Age.js';
import { Figure } from '../components/Figure.js';
import { Aside, Conspicuous, NothingToShow, Page, Panel } from '../components/layout.js';
import { count } from '../words.js';

/**
 * What a cell in each state is drawn as, highest first.
 *
 * The four states are the product's own — is it present, is it well-formed, is
 * it approved — and mean the same thing in every Corpus. What each of them means
 * *here* does not: which rung counts as approved is one Corpus's own word, and
 * arrives in the payload rather than being known.
 */
const MARKS: { state: FacetState; mark: string }[] = [
  { state: 'approved', mark: '✓' },
  { state: 'well-formed', mark: '◑' },
  { state: 'present', mark: '◔' },
  { state: 'absent', mark: '·' },
];

function markOf(state: FacetState): string {
  return MARKS.find((known) => known.state === state)?.mark ?? '';
}

function Cell({ state }: { state: FacetState }) {
  return (
    <td className={`cell cell-${state}`}>
      <abbr title={state}>{markOf(state)}</abbr>
    </td>
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
      <abbr className="movement none" title="there is no earlier reading to compare this one with">
        —
      </abbr>
    );
  }
  if (movement.approvedDelta === 0) {
    return <span className="movement steady">held steady</span>;
  }

  const gained = movement.approvedDelta > 0;
  return (
    <span className={`movement ${gained ? 'gained' : 'lost'}`}>
      {`${gained ? '▲' : '▼'} ${Math.abs(movement.approvedDelta)}`}
    </span>
  );
}

function Row({ module, corpusId }: { module: ModuleRow; corpusId: string }) {
  return (
    <tr>
      <th scope="row" className="module">
        {/*
          A cell says how far along a Module is and never what to do about it.
          What to do is a Facet at a time, with the reason it fell short, which
          is the page this leads to (spec §5.4).
        */}
        <Link
          className="module-id"
          to={`/corpus/${encodeURIComponent(corpusId)}/modules/${encodeURIComponent(module.id)}`}
        >
          {module.id}
        </Link>
        {module.owner === null ? (
          // LAW-007: every Finding against this Module routes to nobody, which is
          // a defect and not an empty space.
          <Conspicuous>nobody answers for this</Conspicuous>
        ) : (
          <span className="owner">{module.owner}</span>
        )}
      </th>
      {module.cells.map((cell) => (
        <Cell key={cell.facet} state={cell.state} />
      ))}
      <td className="tally">{`${module.approved} of ${module.declaredFacets}`}</td>
      <td className="moved">
        <Moved movement={module.movement} />
      </td>
    </tr>
  );
}

/**
 * The Corpus page, which *is* the Readiness Matrix: every Module against every
 * Facet its Lens declares (spec §5.3).
 *
 * The grid is primary because it is the only view read in two directions, and
 * the two directions mean different things. Along a row, a Module is thin —
 * ordinary work, routing to its Owner. Down a column, a Facet is absent in
 * *every* Module, which is as often a defect in the denominator as it is work
 * nobody has begun, and no list of Modules can show it.
 *
 * Nothing here knows what any of it is called. Every column, every rung and
 * every name arrives in the payload, so this draws a Corpus it has never met
 * without being changed (LAW-004).
 */
export function CorpusMatrix({ corpus }: { corpus: CorpusDetail }) {
  const { reading } = corpus;

  if (reading.outcome !== 'read') {
    return (
      <Page title={corpus.name}>
        <NothingToShow>Nothing has been written down from this source yet.</NothingToShow>
      </Page>
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
    <Page title={corpus.name}>
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

      <Panel>
        {modules.length === 0 ? (
          <NothingToShow>No Module has been written down from this source yet.</NothingToShow>
        ) : (
          <>
            {/*
              The one thing on this page that grows with a Corpus grows sideways,
              so it slides inside its own edges. A page that slid instead would
              take the Module column with it — the column every other one is read
              against.
            */}
            <div className="grid-scroll">
              <table className="grid">
                <thead>
                  <tr>
                    <th scope="col">Module</th>
                    {facets.map((facet) => (
                      <th
                        key={facet}
                        scope="col"
                        className={unstarted.includes(facet) ? 'facet unstarted' : 'facet'}
                      >
                        {facet}
                      </th>
                    ))}
                    <th scope="col">Approved</th>
                    <th scope="col">Movement</th>
                  </tr>
                </thead>
                <tbody>
                  {modules.map((module) => (
                    <Row key={module.id} module={module} corpusId={corpus.id} />
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="legend">
              {MARKS.map(({ state, mark }) => (
                <li key={state}>
                  <span className="mark">{mark}</span> {state}
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
      </Panel>
    </Page>
  );
}
