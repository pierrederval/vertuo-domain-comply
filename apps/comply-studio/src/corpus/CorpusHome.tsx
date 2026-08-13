import { Link } from 'react-router';
import type { CorpusChange, CorpusHome as OneCorpusHome, NeedsWork, Since } from '@vertuo/comply-contract';
import { Age } from '../components/Age.js';
import { Moved } from '../components/Moved.js';
import { TwoReadings } from '../components/TwoReadings.js';
import { WhyThereIsNoReading } from '../components/NoReading.js';
import { Aside, Conspicuous, NothingToShow, Surface } from '../components/layout.js';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card.js';
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table.js';
import { count } from '../words.js';

/**
 * One Module short of having every Facet its Lens declares approved, with what it
 * has got and what that has done.
 *
 * The Module's name leads to its own page and not to the grid, because what a reader
 * arrives here wanting is the work: the Module page states, Facet by Facet, exactly
 * what each one falls short of. The grid is where the same Corpus is read down a
 * column instead, which is a different question and has its own destination.
 */
function Work({ module, corpusId }: { module: NeedsWork; corpusId: string }) {
  return (
    <TableRow data-needs-work="">
      {/* A row's name and not a column's heading — see the same cell on the grid. */}
      <TableHead
        scope="row"
        className="grid gap-0.5 align-middle text-sm font-normal tracking-normal text-foreground normal-case"
      >
        <Link
          className="justify-self-start font-semibold text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground"
          to={`/corpus/${encodeURIComponent(corpusId)}/modules/${encodeURIComponent(module.id)}`}
        >
          {module.id}
        </Link>
        {module.owner === null ? (
          // LAW-007: every Finding against this Module routes to nobody, which is a
          // defect and not an empty space.
          <span className="text-xs">
            <Conspicuous>nobody answers for this</Conspicuous>
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">{module.owner}</span>
        )}
      </TableHead>
      {/*
        The count carries the row's weight and its denominator stays beside it, at the
        weight of the words it is. Both halves were one grey at one size, so a column of
        28 rows reading `0 of 8` had nothing in it for an eye to catch — the flatness was
        not the spacing, it was that nothing on the row was more important than anything
        else. Never a bar and never a share of the two: the denominator is a count of
        Facets a Lens declares, and a figure drawn as a proportion of it is the reading
        LAW-006 refuses.
      */}
      <TableCell className="text-sm">
        <span className="font-semibold text-foreground">{module.approved}</span>
        <span className="text-muted-foreground">{` of ${module.declaredFacets}`}</span>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        <Moved movement={module.movement} />
      </TableCell>
    </TableRow>
  );
}

/**
 * One thing that changed in the Corpus.
 *
 * Never one thing the tooling did. There is no item here for a run, a request, or a
 * reading being taken — burying real change under noise the tooling generated about
 * itself is what ADR-0012 exists to prevent, and none of those has a shape to arrive
 * in.
 *
 * What arrived is marked and what left is not. A Finding that has started being found
 * and a Facet that has fallen off the approved rung are both work landing on somebody,
 * which is what a mark is for (LAW-007); the other two directions are work having
 * been done.
 */
function Changed({ change }: { change: CorpusChange }) {
  if (change.changed === 'facet') {
    return (
      <li data-change="facet" className="text-sm">
        <span className="font-medium text-foreground">{change.moduleId}</span>{' '}
        {change.approved ? (
          `— ${change.label} became approved`
        ) : (
          <Conspicuous>{`— ${change.label} is no longer approved`}</Conspicuous>
        )}
      </li>
    );
  }

  return (
    <li data-change="finding" className="text-sm">
      {change.appeared ? (
        <Conspicuous>Finding appeared</Conspicuous>
      ) : (
        <span className="font-medium text-foreground">Finding no longer found</span>
      )}
      {' — '}
      {/*
        What was found, in the words it was found in. A feed that summarised a
        Finding would show a reader a second-hand version of the very thing this
        product exists to detect.
      */}
      {change.says}
      {change.moduleId === null ? (
        // A Finding belonging to no Module reaches nobody, which is the fact LAW-007
        // makes a defect. Left unsaid it reads as a Finding that simply has no name
        // beside it.
        <>
          {' '}
          <Conspicuous>reaches nobody</Conspicuous>
        </>
      ) : (
        <span className="text-muted-foreground">{` in ${change.moduleId}`}</span>
      )}
    </li>
  );
}

/**
 * What the knowledge did since the last reading kept for this Corpus, or which of
 * three reasons means nothing can be said about it.
 *
 * Four sentences, never a blank space. *Nothing moved*, *nobody has measured this
 * twice*, *the bar moved*, and *what it was measured from has gone* are four
 * different facts and a reader acts on each of them differently (LAW-006).
 */
function SinceThen({ since, lensId }: { since: Since; lensId: string }) {
  if (since.comparedWith === 'no-earlier-reading') {
    return (
      <NothingToShow>
        No reading has been kept for this Corpus yet, so there is nothing for what it
        says now to be compared against. The next reading kept is what the one after
        it will be read against.
      </NothingToShow>
    );
  }

  if (since.comparedWith === 'a-reading-under-other-criteria') {
    return (
      <NothingToShow>
        {`The last reading kept for this Corpus was taken against different criteria from these, so nothing about the knowledge can be stated across the two. What ${lensId} asks of this Corpus changed; whether the knowledge did is not something this page can say yet.`}
      </NothingToShow>
    );
  }

  if (since.comparedWith === 'knowledge-no-longer-held') {
    return (
      <NothingToShow>
        The knowledge the last reading kept for this Corpus was made of is not on the
        shelf any more, so what a Facet or a Finding has done since cannot be worked
        out. The figures that reading recorded are still what each one above is
        compared with. Read the source again and the next reading kept has everything
        it needs.
      </NothingToShow>
    );
  }

  if (since.changed.length === 0) {
    return (
      <NothingToShow>
        Nothing about the knowledge has moved since that reading. No Facet has crossed
        the approved rung either way, and no Finding has started or stopped being
        found.
      </NothingToShow>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {since.changed.map((change, at) => (
        <Changed key={at} change={change} />
      ))}
    </ul>
  );
}

/**
 * Home: what needs a person in this Corpus, and what moved in it (spec §5.1).
 *
 * Per Corpus and never across the shelf. No figure here stands for more than one
 * Corpus, and none stands for both readings of one.
 *
 * The Corpus's own name is not repeated. The shell names what is being read, once,
 * at the top, and says how old the reading is; a Corpus named twice on one screen
 * reads as two things, and the second one is always what somebody forgets to change.
 *
 * Nothing here knows what any of it is called. Every Facet's name, every Module's,
 * and every rung arrives in the payload, so this draws a Corpus it has never met
 * without being changed (LAW-004).
 */
export function CorpusHome({ corpus }: { corpus: OneCorpusHome }) {
  const { reading } = corpus;

  if (reading.outcome !== 'read') {
    return (
      <Card className="border-dashed shadow-none">
        <CardContent>
          <WhyThereIsNoReading reading={reading} />
        </CardContent>
      </Card>
    );
  }

  const {
    readiness,
    integrity,
    needsWork,
    declaredFacets,
    facetsNobodyHasBegun,
    ladder,
    writtenDown,
    since,
  } = reading;
  const nothingToCompare = needsWork.some(
    (module) => module.movement.comparedWith === 'no-earlier-reading',
  );
  // The criteria are a property of the reading and not of one Module, so one row
  // saying this means every row was read that way.
  const criteriaChanged = needsWork.some(
    (module) => module.movement.comparedWith === 'a-reading-under-other-criteria',
  );

  return (
    <Surface>
      <TwoReadings readiness={readiness} integrity={integrity} />

      <Card className="gap-0 overflow-hidden py-0">
        <CardHeader className="gap-2 py-5">
          <CardTitle>Needs work</CardTitle>
        </CardHeader>
        {/* Flush to the card's edges, so a row and the rule under it run the whole width
            of the surface — the same shape a queue has, because both are lists of work.
            The notes that qualify the figures keep their own padded region below. */}
        <CardContent className="border-t border-border px-0">
          {needsWork.length === 0 ? (
            <div className="px-6 py-5">
              <NothingToShow>
                {`Every Module here has each of the ${count(declaredFacets, 'Facet')} its Lens declares approved. Knowledge nobody has written down anywhere is not counted, and cannot be.`}
              </NothingToShow>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              {/*
                As wide as the card it sits in. Three columns at their own width left
                two thirds of the card empty and the whole list huddled at the left,
                which reads as a table that failed to finish drawing. The grid is the
                other case and stays intrinsic: its columns grow with the Corpus, and
                there a stretch would push the marks away from the name they belong to.
              */}
              <table className="w-full caption-bottom text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">Module</TableHead>
                    <TableHead scope="col">Approved</TableHead>
                    <TableHead scope="col">Movement</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {needsWork.map((module) => (
                    <Work key={module.id} module={module} corpusId={corpus.id} />
                  ))}
                </TableBody>
              </table>
            </div>
          )}
        </CardContent>

        {/*
          What every figure above is counted out of, and what *approved* means here. On
          its own ground beneath the list, because these are what the figures mean and
          not more of them — mixed in at the foot of the same white surface they read as
          a fourth and fifth row of the table (LAW-006).
        */}
        <div className="flex flex-col gap-2 border-t border-border bg-sunken px-6 py-4">
          <Aside>
            {`Every figure here is counted out of the ${count(declaredFacets, 'Facet')} this Corpus’s Lens declares, and a Module with all of them approved is not listed. What each one falls short of is on its own page, Facet by Facet.`}
          </Aside>
          <Aside>
            {`Approved means at or above “${ladder.approvedAtOrAbove}” on this Corpus’s ladder: ${ladder.levels.join(' → ')}.`}
          </Aside>
          {nothingToCompare && (
            <Aside>
              {'— means there is no earlier reading to compare this one with. It is not the same as nothing having changed.'}
            </Aside>
          )}
          {criteriaChanged && (
            <Aside>
              {`The last reading kept for this Corpus was taken against different criteria from these, so no figure above can be compared with it. What ${reading.lensId} asks of this Corpus changed; whether the knowledge did is not something this page can say yet.`}
            </Aside>
          )}
          {/*
            A Facet the Lens declares that nobody has begun anywhere. Every figure above
            is counted out of the declared Facets, so one this business does not have
            deflates all of them out of one too many — and read along a row that is
            invisible, while a work list is nothing but rows.

            This is what the Corpus opening at the grid used to be for: a reader met the
            one view that can show it before they met any figure. It is said here now, so
            the figures a reader lands on carry their own warning (LAW-006).
          */}
          {facetsNobodyHasBegun.map((facet) => (
            <Aside key={facet}>
              <span data-nobody-has-begun="">
                <Conspicuous>{`No Module has anything under “${facet}” yet.`}</Conspicuous>
              </span>{' '}
              {`It is declared by the Lens “${reading.lensId}”, so either nobody has begun it, or this Corpus does not have it and every figure above is counted out of one too many. The grid reads down that column.`}
            </Aside>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What changed</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <SinceThen since={since} lensId={reading.lensId} />

          {/*
            When the source was read, as a group of its own and under its own
            horizon. Every writing-down is still held, so every one of them can be
            named; what a Facet or a Finding did can only be stated as far back as
            the last reading kept. Cutting the wider one back to the narrower would
            hide writings-down the shelf can still account for exactly (LAW-006).

            What each entry says is that the source was read and something was
            written down, which is all any of them ever knew. It used to say the
            source had said something new, and a change to how much of a source a
            quotation carries writes one down over documents nobody touched — so
            that reading of it put this product's own changes into a reader's
            account of what the business did (ADR-0036). The comparison above is
            what says whether anything moved.
          */}
          <ul className="flex flex-col gap-2">
            {/*
              Most recent first. A reader arriving asks what is new, and a Corpus
              read twenty times would bury today's reading at the bottom.
            */}
            {[...writtenDown].reverse().map((held) => (
              <li key={held.at} data-change="read-from-source" className="text-sm">
                Read from source <Age at={held.at} />
              </li>
            ))}
          </ul>

          <Aside>
            {since.comparedWith === 'the-last-reading'
              ? 'One entry for every writing-down this shelf still holds, however long ago. What a Facet or a Finding did is stated only since the reading kept below, because that is as far back as the shelf holds anything to work it out from.'
              : 'One entry for every writing-down this shelf still holds, however long ago. Reading the source again when nothing has changed at it writes nothing down, so this is never a list of runs.'}
          </Aside>
          {since.comparedWith === 'the-last-reading' && (
            <Aside>
              Compared with the reading kept <Age at={since.takenAt} />.
            </Aside>
          )}
        </CardContent>
      </Card>
    </Surface>
  );
}
