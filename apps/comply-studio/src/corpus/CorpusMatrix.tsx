import { Link } from 'react-router';
import type { CorpusDetail, FacetState, ModuleRow } from '@vertuo/comply-contract';
import { Moved } from '../components/Moved.js';
import { TwoReadings } from '../components/TwoReadings.js';
import { WhyThereIsNoReading } from '../components/NoReading.js';
import { Aside, Conspicuous, NothingToShow, Surface } from '../components/layout.js';
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

function Cell({ state, unstarted }: { state: FacetState; unstarted: boolean }) {
  const { mark, tone } = drawnAs(state);

  return (
    // `data-cell` carries the state for anything asserting about it, so no test
    // has to reach for a class name to find out what a cell means.
    // Narrower than a cell of words, because the whole content is one glyph. At the
    // padding a column of text needs, eight Facets push the two figures at the end of
    // the row off the edge of the grid — and those two are what the row is read for.
    <TableCell
      /*
       * A Facet no Module has anything under is marked down the whole of its column and
       * not only in its heading. Reading down a column is the one thing the grid can do
       * that no list of Modules can, and an all-absent column was 28 cells of the
       * faintest mark on the page with one tinted word at the top — the reading the grid
       * exists for was the hardest one on it to see.
       *
       * A ground and never a colour on the mark: what state a cell is in is the mark's
       * to say, and tinting it would make one column's cells mean something different
       * from the same cells anywhere else.
       */
      className={`px-2 text-center text-xl leading-none ${tone} ${unstarted ? 'bg-mark-quiet/50' : ''}`}
      data-cell={state}
    >
      <abbr title={state} className="cursor-help no-underline">
        {mark}
      </abbr>
    </TableCell>
  );
}

function Row({
  module,
  corpusId,
  unstarted,
}: {
  module: ModuleRow;
  corpusId: string;
  /** Which Facets no Module in this Corpus has anything under, by name. */
  unstarted: Set<string>;
}) {
  return (
    <TableRow>
      {/*
        The Module column stays put while the rest slides under it. It is the
        column every other one is read against, and a row of marks with nothing
        at the left of it says which state something is in without saying what.
      */}
      {/*
        A row's name, not a column's heading, so the column-heading treatment a
        `TableHead` carries is undone here: this reads as the knowledge it labels.
        It keeps `th` because that is what it is — the cell every mark on the row is
        read against.

        It comes up with the row under the pointer. Left on the panel's own white it
        would stay put while the rest of the row tinted, which reads as a row that
        stops at the Module column.
      */}
      <TableHead
        scope="row"
        className="sticky left-0 z-10 grid gap-0.5 border-r border-border bg-panel align-middle text-sm font-normal tracking-normal text-foreground normal-case group-hover/row:bg-sunken"
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
          <span className="text-xs">
            <Conspicuous>nobody answers for this</Conspicuous>
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">{module.owner}</span>
        )}
      </TableHead>
      {module.cells.map((cell) => (
        <Cell key={cell.facet} state={cell.state} unstarted={unstarted.has(cell.facet)} />
      ))}
      {/* The two figures are a different kind of thing from the marks beside them —
          one is how far along a Facet is, these are the row read as a whole — so a rule
          separates them. Run together, a row was eleven cells of equal standing. */}
      <TableCell className="border-l border-border text-sm">
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
          <WhyThereIsNoReading reading={reading} />
        </CardContent>
      </Card>
    );
  }

  const { facets, modules, ladder, readiness, integrity } = reading;
  // A Facet nobody has begun anywhere. Read down the column, which is the reading
  // this page exists for.
  const unstarted = facets.filter((facet) =>
    modules.every(
      (module) => module.cells.find((cell) => cell.facet === facet.name)?.state === 'absent',
    ),
  );
  const unstartedNames = new Set(unstarted.map((facet) => facet.name));
  const nothingToCompare = modules.some(
    (module) => module.movement.comparedWith === 'no-earlier-reading',
  );
  // The criteria are a property of the reading and not of one Module, so one row
  // saying this means every row was read that way. Read off the rows all the same,
  // because the rows are what a reader is looking at.
  const criteriaChanged = modules.some(
    (module) => module.movement.comparedWith === 'a-reading-under-other-criteria',
  );

  return (
    <Surface>
      <TwoReadings readiness={readiness} integrity={integrity} />

      <Card className="gap-0 overflow-hidden py-0">
        <CardContent className="px-0">
          {modules.length === 0 ? (
            <div className="px-6 py-5">
              <NothingToShow>No Module has been written down from this source yet.</NothingToShow>
            </div>
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
              <div
                data-grid-scroll=""
                /*
                 * Bounded in height so the grid scrolls in both directions inside its
                 * own edges, which is what lets the headings stay put. Unbounded, a
                 * `sticky` heading resolves against a box that never scrolls and sits
                 * exactly where it already was — the freeze looked done and did nothing.
                 *
                 * One box scrolling both axes and not two nested ones, which is the
                 * thing the note below rules out: a reader dragging this is dragging the
                 * grid, and there is nothing else here for them to be dragging.
                 */
                className="relative max-h-[min(70vh,44rem)] w-full overflow-auto overscroll-contain"
              >
                {/*
                  The table is as wide as the Corpus makes it and no wider. Stretched
                  to the page it would hand every spare pixel to the Module column,
                  pushing the marks away from the name they belong to — and reading
                  along a row is half of what the grid is for.
                */}
                <table className="caption-bottom text-sm whitespace-nowrap">
                  {/*
                    The headings stay while the rows go by. At 28 Modules the row a
                    reader has scrolled to is eight columns of identical marks with
                    nothing above it saying which Facet any of them is — the same reason
                    the Module column is pinned, in the other direction.
                  */}
                  {/*
                    The rule under the headings is drawn as an inset shadow and not as a
                    border, because a collapsed table gives its borders to the row below
                    and a pinned heading then has none — the headings floated over the
                    rows with nothing between them.
                  */}
                  <TableHeader className="sticky top-0 z-20 [&_th]:shadow-[inset_0_-1px_0_var(--line-strong)]">
                    <TableRow className="hover:bg-panel">
                      {/*
                        The ground is on each heading and not on the row around it: a
                        sticky `tr` does not paint, so the marks scrolling underneath
                        showed through the words naming their columns.
                      */}
                      <TableHead
                        scope="col"
                        className="sticky left-0 z-30 border-r border-border bg-panel"
                      >
                        Module
                      </TableHead>
                      {facets.map((facet) => (
                        <TableHead
                          key={facet.name}
                          scope="col"
                          /*
                            A Facet no Module has anything under is marked in the
                            head of its own column, because the whole reason the
                            grid is drawn this way is that a column reads as one
                            fact and a list of Modules cannot show it at all. It
                            keeps its label either way: a column with nothing in
                            it is the one a reader most needs named.
                          */
                          className={`bg-panel ${unstarted.includes(facet) ? 'bg-mark-quiet text-mark' : ''}`}
                          data-facet={unstarted.includes(facet) ? 'unstarted' : undefined}
                        >
                          {/*
                            What belongs under a Facet is the Lens's to say, and it
                            is said in full on the Module page. Here it qualifies
                            the heading, for a reader working out what a column is
                            asking of them.
                          */}
                          {facet.describes === undefined ? (
                            facet.label
                          ) : (
                            <abbr title={facet.describes} className="cursor-help no-underline">
                              {facet.label}
                            </abbr>
                          )}
                        </TableHead>
                      ))}
                      <TableHead scope="col" className="border-l border-border bg-panel">
                        Approved
                      </TableHead>
                      <TableHead scope="col" className="bg-panel">
                        Movement
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {modules.map((module) => (
                      <Row
                        key={module.id}
                        module={module}
                        corpusId={corpus.id}
                        unstarted={unstartedNames}
                      />
                    ))}
                  </TableBody>
                </table>
              </div>
            </>
          )}
        </CardContent>

        {/*
          What the marks mean, and what every figure above is counted out of, on their
          own ground beneath the grid. The key belongs against the grid it decodes and
          the notes belong under both: run together on the same white as the rows, all
          six read as more of the table (LAW-006).
        */}
        <div className="flex flex-col gap-3 border-t border-border bg-sunken px-6 py-4">
          {modules.length > 0 && (
            <ul className="flex flex-wrap gap-x-6 gap-y-1.5 text-sm text-muted-foreground">
              {MARKS.map(({ state, mark, tone }) => (
                <li key={state} className="flex items-center gap-1.5">
                  <span className={`text-base ${tone}`}>{mark}</span> {state}
                </li>
              ))}
            </ul>
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
          {criteriaChanged && (
            <Aside>
              {`The last reading kept for this Corpus was taken against different criteria from these, so no figure above can be compared with it. What ${reading.lensId} asks of this Corpus changed; whether the knowledge did is not something this page can say yet.`}
            </Aside>
          )}
          {unstarted.map((facet) => (
            <Aside key={facet.name}>
              <Conspicuous>{`No Module has anything under “${facet.label}” yet.`}</Conspicuous>{' '}
              {`It is declared by the Lens “${reading.lensId}”, so either nobody has begun it, or this Corpus does not have it and every figure above is counted out of one too many.`}
            </Aside>
          ))}
        </div>
      </Card>
    </Surface>
  );
}
