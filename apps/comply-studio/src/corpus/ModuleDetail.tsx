import { Link } from 'react-router';
import type {
  CorpusModule,
  Knowledge,
  Ladder,
  ModuleFacet,
  ModuleFinding,
  UnmetCriterion,
} from '@vertuo/comply-contract';
import { Figure } from '../components/Figure.js';
import { WhyThereIsNoReading } from '../components/NoReading.js';
import {
  Aside,
  Conspicuous,
  NothingToShow,
  Readings,
  Surface,
} from '../components/layout.js';
import { opensAt, Where } from '../components/Where.js';
import { Badge } from '../components/ui/badge.js';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card.js';
import { count } from '../words.js';

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

/** The bullets a reason or a place is read as. */
const LISTED = 'list-disc pl-6 marker:text-muted-foreground';

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
      <p>
        <Conspicuous>Nothing is written down here.</Conspicuous>{' '}
        {'Somebody has to write it down before there is anything to approve.'}
      </p>
    );
  }

  if (facet.state === 'approved') {
    return <p>{`Everything written down here is at or above “${ladder.approvedAtOrAbove}”.`}</p>;
  }

  if (facet.state === 'well-formed') {
    return (
      <>
        <p>{'What is written down here is enough. What it needs is somebody to approve it.'}</p>
        <p>
          {`Not yet at “${ladder.approvedAtOrAbove}”: ${facet.notYetApproved} of ${count(facet.knowledge.length, 'piece')} of knowledge here.`}
        </p>
      </>
    );
  }

  return (
    <>
      <p>{'What is written down here is not yet enough:'}</p>
      <ul className={LISTED}>
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
 *
 * The rung each piece sits at is drawn beside where it is, and never in place of
 * it. How far along a piece of knowledge is and how well backed it is are two
 * separate readings, and conflating them is what made coverage uncomputable in
 * the first place (LAW-005).
 *
 * Each place opens onto the piece written at it, where the rest of what it says,
 * what backs it up, and the source text it was read out of are all shown together
 * (#22). A place is the address for the same reason it is what a reader is shown.
 */
function Written({
  knowledge,
  corpusId,
  moduleId,
}: {
  knowledge: Knowledge[];
  corpusId: string;
  moduleId: string;
}) {
  return (
    <>
      <p className="text-sm text-muted-foreground">
        {`Written down in ${count(knowledge.length, 'place')}:`}
      </p>
      <ul className={LISTED}>
        {knowledge.map((piece) => (
          <li key={`${piece.at.file}:${piece.at.line}`}>
            <Link
              to={opensAt(corpusId, moduleId, piece.at)}
              className="underline decoration-dotted underline-offset-4"
            >
              <Where at={piece.at} />
            </Link>{' '}
            {piece.maturity === null ? (
              // Not an empty space, and not the word the code has for nothing
              // (LAW-010). A Corpus that graded nothing here said something.
              <Conspicuous>this Corpus does not say how far along it is</Conspicuous>
            ) : (
              <span className="text-sm text-muted-foreground">{`at “${piece.maturity}”`}</span>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}

function Declared({
  facet,
  ladder,
  corpusId,
  moduleId,
}: {
  facet: ModuleFacet;
  ladder: Ladder;
  corpusId: string;
  moduleId: string;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <CardTitle>{facet.label}</CardTitle>
          {/*
            The one state that is nothing at all still gets a mark. A Facet drawn as
            blank cannot be told from one the page forgot, and an unwritten Facet is
            the work this page exists to name.

            A badge, which is what LAW-006 leaves room for: it carries a state's name
            and never a count, so there is nothing in this shape for a denominator to
            fall out of. It was a grey word on its own line below the heading, which
            is where a reader reads a subtitle rather than a state — and one word of
            eight Facets’ worth of them cannot be scanned down a page at all.
          */}
          <Badge
            variant="outline"
            data-facet-state={facet.state}
            className={
              facet.state === 'absent'
                ? 'border-mark/40 bg-mark-quiet text-mark'
                : facet.state === 'approved'
                  ? 'border-cell-approved/30 bg-sunken text-cell-approved'
                  : 'border-border bg-sunken text-muted-foreground'
            }
          >
            {facet.state}
          </Badge>
        </div>
        {/*
          What belongs under this Facet, in the business's own words, above what
          stands between it and approval. Drawn in every state including absent:
          somebody with nothing written here is exactly who needs telling what
          goes here, and telling them once something exists is telling them after
          they needed it.

          A Facet whose Lens says nothing draws nothing. An empty space where a
          sentence goes reads as a sentence somebody forgot to write.
        */}
        {facet.describes !== undefined && (
          // Bounded to a measure a person can read down. Run the width of the card it
          // was a 140-character line, which is twice what an eye tracks back from.
          <p data-describes="" className="max-w-prose text-sm text-muted-foreground">
            {facet.describes}
          </p>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Standing facet={facet} ladder={ladder} />
        {facet.state !== 'absent' && (
          <Written knowledge={facet.knowledge} corpusId={corpusId} moduleId={moduleId} />
        )}
      </CardContent>
    </Card>
  );
}

/**
 * What disagrees with itself in this Module.
 *
 * The other reading, kept apart from the Facets above: those say how much is
 * written down and approved, these say what contradicts what. Nothing on this
 * page derives a third figure from the pair.
 */
function Against({ findings, lookedFor }: { findings: ModuleFinding[]; lookedFor: string[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Findings</CardTitle>
      </CardHeader>
      <CardContent>
        {findings.length === 0 ? (
          // Never a bare "none". It can only ever mean none that these Checks
          // would have found, so they are named (LAW-006).
          <NothingToShow>
            {`Nothing was found against this Module by the ${count(lookedFor.length, 'Check')} that ran: ${lookedFor.join(', ')}.`}
          </NothingToShow>
        ) : (
          <ul className={`${LISTED} flex flex-col gap-4`}>
            {findings.map((finding) => (
              <li key={`${finding.at.file}:${finding.at.line}:${finding.says}`}>
                <p>{finding.says}</p>
                <Where at={finding.at} />
                {finding.alsoAt.map((also) => (
                  <span key={`${also.file}:${also.line}`} className="text-sm text-muted-foreground">
                    {' also '}
                    <Where at={also} />
                  </span>
                ))}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * One Module, where a figure becomes a list of specific work.
 *
 * The grid says how far along a Module is. This says what to do about it, and
 * for each Facet which of the two things to do: write something down, or get
 * what is written approved. Every Facet the Lens declares appears, including
 * the ones with nothing under them — an unwritten Facet is the work, not a row
 * to leave out.
 *
 * Which Module this is, and which Corpus it sits in, are the shell's to say. It
 * carries both in the trail with the age of the reading, so nothing here repeats
 * them.
 *
 * Nothing here knows what any of it is called. Every Facet name, every step of
 * the ladder, every missing thing named in a reason arrives in the payload, so
 * this draws a Module of a Corpus it has never met without being changed
 * (LAW-004).
 */
export function ModuleDetail({ module }: { module: CorpusModule }) {
  const { reading } = module;

  if (reading.outcome !== 'read') {
    return (
      <Card className="border-dashed shadow-none">
        <CardContent>
          <WhyThereIsNoReading reading={reading} />
        </CardContent>
      </Card>
    );
  }

  const { facets, ladder, findings, lookedFor } = reading;

  return (
    <Surface>
      {/*
        Who answers for this Module, on a surface of its own, because every Finding on
        the page below reaches them or reaches nobody (LAW-007). Where nobody does, the
        surface is marked as well as the sentence: a line of amber text floating above
        the first card is the position a reader skips.
      */}
      <p
        className={`rounded-lg border px-5 py-4 text-sm ${
          reading.owner === null
            ? 'border-mark/40 bg-mark-quiet/40'
            : 'border-border bg-panel text-muted-foreground'
        }`}
      >
        {reading.owner === null ? (
          // LAW-007: a Module nobody answers for is a defect, and the Findings
          // below have nobody to reach.
          <Conspicuous>
            Nobody answers for this Module, so everything below routes to nobody.
          </Conspicuous>
        ) : (
          <>
            {'Answered for by '}
            <span className="font-medium text-foreground">{reading.owner}</span>
          </>
        )}
      </p>

      <Readings>
        {[
          <Figure
            key="readiness"
            reading="Readiness"
            counts="Facets approved"
            value={reading.approved}
            outOf={`of ${count(reading.declaredFacets, 'Facet')}`}
          />,
          <Figure
            key="integrity"
            reading="Integrity"
            counts="Open Findings"
            value={findings.length}
            outOf={`from ${count(lookedFor.length, 'Check')}`}
            detail={lookedFor.join(', ')}
          />,
        ]}
      </Readings>

      {facets.map((facet) => (
        <Declared
          key={facet.facet}
          facet={facet}
          ladder={ladder}
          corpusId={module.corpus.id}
          moduleId={module.id}
        />
      ))}
      <Against findings={findings} lookedFor={lookedFor} />

      <Aside>
        {`Every figure here is counted out of the ${count(reading.declaredFacets, 'Facet')} the Lens “${reading.lensId}” declares. Knowledge nobody has written down anywhere is not counted here, and cannot be.`}
      </Aside>
      <Aside>
        {`Approved means at or above “${ladder.approvedAtOrAbove}” on this Corpus’s ladder: ${ladder.levels.join(' → ')}.`}
      </Aside>
    </Surface>
  );
}
