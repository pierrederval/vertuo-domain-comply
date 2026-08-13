import { Aside, Conspicuous } from '../components/layout.js';
import { Button } from '../components/ui/button.js';

/**
 * What reading one Corpus's source again is doing, and what it last did.
 *
 * Four states and not a flag, because the three a reader acts on differently cannot
 * be collapsed: *it is happening*, *nothing was there to bring in*, and *it could not
 * be done and here is why*. A single *done* would leave the second of those looking
 * like a change nobody can find.
 */
export type Doing =
  | { at: 'ready' }
  | { at: 'reading' }
  | { at: 'read'; unchangedAtSource: boolean }
  | { at: 'could-not-read'; because: string };

/**
 * The one action in the product that changes what it holds: read this Corpus's source
 * again (spec §5.5).
 *
 * It sits on the page a Corpus opens at, and there is one of it. Two buttons doing one
 * thing on two pages is two things to keep in step, and a reader who pressed the other
 * one has no way to know which of the two answers they are looking at.
 *
 * Drawn while it is happening, and drawn afterwards. Extraction is milliseconds on a
 * small Corpus, so a state that only showed for the duration would be a state nobody
 * ever sees and nobody ever tests — and what the press *did* is the half a reader came
 * for.
 *
 * Nothing here says what moved. What moved is the grid's and the change list's to say,
 * from the reading itself; a sentence here repeating it would be a second answer to
 * one question, on the very screen where the first one is expected to move.
 *
 * It is drawn in the frame, beside the age of the reading it changes, so it is within
 * reach from every surface of a Corpus rather than from the one the Corpus opens at. A
 * reader working a queue had to walk back to the grid to bring new knowledge in, which
 * is the walk this action exists to save. Still one of it, which is what the doc above
 * asks for: one button, in one place, on every screen.
 *
 * The button leads and whatever it has to say follows underneath it, because the
 * button is the same size in all four states and the sentence is not — a row that
 * grows sideways as it reports would move the control a reader is about to press.
 */
export function ReadAgain({ doing, press }: { doing: Doing; press: () => void }) {
  const reading = doing.at === 'reading';

  return (
    // `data-read-again` carries which of the four it is in, so nothing asserting
    // about this state has to reach for a class name to find out.
    <div
      className="flex flex-col items-start gap-2 sm:max-w-sm sm:items-end sm:text-right"
      data-read-again={doing.at}
    >
      <Button variant="outline" size="sm" onClick={press} disabled={reading} aria-busy={reading}>
        {reading ? 'Reading the source' : 'Read the source again'}
      </Button>
      {doing.at === 'reading' && (
        <Aside>Reading the documents this Corpus is written down from.</Aside>
      )}
      {doing.at === 'read' && (
        <Aside>
          {doing.unchangedAtSource
            ? 'Nothing has changed at source, so nothing was written down. What is below is a reading of the same knowledge as before.'
            : 'The source has been read again, and what it says now is written down. What moved is below.'}
        </Aside>
      )}
      {doing.at === 'could-not-read' && (
        <Aside>
          <Conspicuous>{doing.because}</Conspicuous>{' '}
          {/* Not *the reading below is the one that was already there*, which claims
              there is one. A Corpus whose knowledge cannot be read back has none, and
              that is exactly the Corpus this action is most often pressed on (#27). */}
          {'Nothing has changed, so what is below is what was below before.'}
        </Aside>
      )}
    </div>
  );
}
