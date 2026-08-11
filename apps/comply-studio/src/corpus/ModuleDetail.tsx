import { Link } from 'react-router';
import type {
  CorpusModule,
  Knowledge,
  Ladder,
  ModuleFacet,
  ModuleFinding,
  Place,
  UnmetCriterion,
} from '@vertuo/comply-contract';
import { Age } from '../components/Age.js';
import { Figure } from '../components/Figure.js';
import {
  Aside,
  Conspicuous,
  NothingToShow,
  Page,
  Panel,
  PanelHeading,
  Stack,
} from '../components/layout.js';
import { count } from '../words.js';

/** Somewhere a person can go and check the claim for themselves (LAW-009). */
function Where({ at }: { at: Place }) {
  return <span className="place">{`${at.file}, line ${at.line}`}</span>;
}

/**
 * One reason a Facet is short on content, in words.
 *
 * A sentence apiece, written here, because a reason arrives as its parts and
 * every surface phrases them for the person in front of it. Written as literals
 * so the guard can read them: a sentence assembled from what a criterion is
 * called would put `requiredAttributes` in front of a Module Owner, and no
 * guard could ever see it happen (LAW-010).
 *
 * Every name inside one of these — what is missing, what kind of link, which
 * steps nothing leads to — is this Corpus's own word, drawn and never
 * interpreted (LAW-004).
 */
function Reason({ shortfall }: { shortfall: UnmetCriterion }) {
  switch (shortfall.criterion) {
    case 'requiredAttributes':
      return <li>{`Nothing is written down under ${shortfall.missing.join(', ')}.`}</li>;
    case 'minSources':
      return (
        <li>
          {`Backed by ${count(shortfall.has, 'Source')}, where this Corpus asks for ${shortfall.needs}.`}
        </li>
      );
    case 'minRelations':
      return (
        <li>
          {`${count(shortfall.has, 'link')} of the kind “${shortfall.relation}”, where this Corpus asks for ${shortfall.needs}.`}
        </li>
      );
    case 'allStatesReachable':
      return <li>{`Nothing leads to ${shortfall.unreachable.join(', ')}.`}</li>;
  }
}

/**
 * What stands between this Facet and approval.
 *
 * Two shortfalls, never drawn as one another. *What is written down is not
 * enough* asks somebody to write something; *nobody has approved it* asks
 * somebody to read what is already there. They are different work, usually for
 * different people, and a page that blurred them would send half its readers to
 * do the wrong one.
 */
function Standing({ facet, ladder }: { facet: ModuleFacet; ladder: Ladder }) {
  if (facet.state === 'absent') {
    return (
      <p className="standing">
        <Conspicuous>Nothing is written down here.</Conspicuous>{' '}
        {'Somebody has to write it down before there is anything to approve.'}
      </p>
    );
  }

  if (facet.state === 'approved') {
    return (
      <p className="standing">
        {`Everything written down here is at or above “${ladder.approvedAtOrAbove}”.`}
      </p>
    );
  }

  if (facet.state === 'well-formed') {
    return (
      <>
        <p className="standing">
          {'What is written down here is enough. What it needs is somebody to approve it.'}
        </p>
        <p className="standing">
          {`Not yet at “${ladder.approvedAtOrAbove}”: ${facet.notYetApproved} of ${count(facet.knowledge.length, 'piece')} of knowledge here.`}
        </p>
      </>
    );
  }

  return (
    <>
      <p className="standing">{'What is written down here is not yet enough:'}</p>
      <ul className="shortfalls">
        {facet.shortOf.map((shortfall, at) => (
          <Reason key={`${shortfall.criterion}-${at}`} shortfall={shortfall} />
        ))}
      </ul>
    </>
  );
}

/**
 * The knowledge written down under one Facet, by where each piece of it is.
 *
 * Where, and not what it is called. Nothing in a Lens promises a piece of
 * knowledge a name; where it is written down is the one thing every Corpus has,
 * and it is also the only thing on this page a reader can act on directly.
 */
function Written({ knowledge }: { knowledge: Knowledge[] }) {
  return (
    <>
      <p className="written">{`Written down in ${count(knowledge.length, 'place')}:`}</p>
      <ul className="knowledge">
        {knowledge.map((piece) => (
          <li key={`${piece.at.file}:${piece.at.line}`}>
            <Where at={piece.at} />{' '}
            {piece.maturity === null ? (
              // Not an empty space, and not the word the code has for nothing
              // (LAW-010). A Corpus that graded nothing here said something.
              <Conspicuous>this Corpus does not say how far along it is</Conspicuous>
            ) : (
              <span className="maturity">{`at “${piece.maturity}”`}</span>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}

function Declared({ facet, ladder }: { facet: ModuleFacet; ladder: Ladder }) {
  return (
    <Panel>
      <PanelHeading>{facet.facet}</PanelHeading>
      <p className={`facet-state state-${facet.state}`}>{facet.state}</p>
      <Standing facet={facet} ladder={ladder} />
      {facet.state !== 'absent' && <Written knowledge={facet.knowledge} />}
    </Panel>
  );
}

/**
 * What disagrees with itself in this Module.
 *
 * The other reading, kept apart from the Facets above: those say how much is
 * written down and approved, these say what contradicts what. Nothing on this
 * page derives a third figure from the pair (spec §4).
 */
function Against({ findings, lookedFor }: { findings: ModuleFinding[]; lookedFor: string[] }) {
  return (
    <Panel>
      <PanelHeading>Findings</PanelHeading>
      {findings.length === 0 ? (
        // Never a bare "none". It can only ever mean none that these Checks
        // would have found, so they are named (LAW-006).
        <NothingToShow>
          {`Nothing was found against this Module by the ${count(lookedFor.length, 'Check')} that ran: ${lookedFor.join(', ')}.`}
        </NothingToShow>
      ) : (
        <ul className="findings">
          {findings.map((finding) => (
            <li key={`${finding.at.file}:${finding.at.line}:${finding.says}`}>
              <p className="says">{finding.says}</p>
              <Where at={finding.at} />
              {finding.alsoAt.map((also) => (
                <span key={`${also.file}:${also.line}`} className="also">
                  {' also '}
                  <Where at={also} />
                </span>
              ))}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/**
 * One Module, where a figure becomes a list of specific work (spec §5.4).
 *
 * The grid says how far along a Module is. This says what to do about it, and
 * for each Facet which of the two things to do: write something down, or get
 * what is written approved. Every Facet the Lens declares appears, including
 * the ones with nothing under them — an unwritten Facet is the work, not a row
 * to leave out.
 *
 * Nothing here knows what any of it is called. Every Facet name, every step of
 * the ladder, every missing thing named in a reason arrives in the payload, so
 * this draws a Module of a Corpus it has never met without being changed
 * (LAW-004).
 */
export function ModuleDetail({ module }: { module: CorpusModule }) {
  const { corpus, reading } = module;

  if (reading.outcome !== 'read') {
    return (
      <Page title={module.id}>
        <p className="whence">
          {'In '}
          <Link to={`/corpus/${encodeURIComponent(corpus.id)}`}>{corpus.name}</Link>
        </p>
        <NothingToShow>Nothing has been written down from this source yet.</NothingToShow>
      </Page>
    );
  }

  const { facets, ladder, findings, lookedFor } = reading;

  return (
    <Page title={module.id}>
      <p className="whence">
        {'In '}
        <Link to={`/corpus/${encodeURIComponent(corpus.id)}`}>{corpus.name}</Link>
        {', read from source '}
        <Age at={reading.sourceReadAt} />
      </p>
      <p className="answers-for">
        {reading.owner === null ? (
          // LAW-007: a Module nobody answers for is a defect, and the Findings
          // below have nobody to reach.
          <Conspicuous>
            Nobody answers for this Module, so everything below routes to nobody.
          </Conspicuous>
        ) : (
          <>
            {'Answered for by '}
            <span className="owner">{reading.owner}</span>
          </>
        )}
      </p>

      <div className="readings">
        <Figure
          reading="Readiness"
          counts="Facets approved"
          value={reading.approved}
          outOf={`of ${count(reading.declaredFacets, 'Facet')}`}
        />
        <Figure
          reading="Integrity"
          counts="Open Findings"
          value={findings.length}
          outOf={`from ${count(lookedFor.length, 'Check')}`}
          detail={lookedFor.join(', ')}
        />
      </div>

      <Stack>
        {facets.map((facet) => (
          <Declared key={facet.facet} facet={facet} ladder={ladder} />
        ))}
        <Against findings={findings} lookedFor={lookedFor} />
      </Stack>

      <Aside>
        {`Every figure here is counted out of the ${count(reading.declaredFacets, 'Facet')} the Lens “${reading.lensId}” declares. Knowledge nobody has written down anywhere is not counted here, and cannot be.`}
      </Aside>
      <Aside>
        {`Approved means at or above “${ladder.approvedAtOrAbove}” on this Corpus’s ladder: ${ladder.levels.join(' → ')}.`}
      </Aside>
    </Page>
  );
}
