import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ReadAgain, type Doing } from '../src/corpus/ReadAgain.js';

function drawn(doing: Doing): string {
  return renderToStaticMarkup(<ReadAgain doing={doing} press={() => {}} />);
}

/** What state the action says it is in, read off its handle and never off a class. */
function saysItIs(markup: string): string | null {
  return /data-read-again="([^"]*)"/.exec(markup)?.[1] ?? null;
}

/**
 * Whether the action refuses a press, as the attribute and not as the word.
 *
 * The word is in the styling — a vendored `Button` names `disabled:` twice to say what
 * it looks like when refused — so a test looking for the word passes on a button that
 * is merely styled for it. Which is the reason nothing here asserts about a class name.
 */
function refusesAPress(markup: string): boolean {
  return /<button[^>]*\sdisabled=""/.test(markup);
}

/** Just the words a reader meets, with every attribute this is drawn with taken off. */
function words(markup: string): string {
  return markup.replace(/<[^>]*>/g, ' ');
}

describe('reading a Corpus’s source again', () => {
  it('offers the action, in the words of what it does to the knowledge', () => {
    const markup = drawn({ at: 'ready' });

    expect(saysItIs(markup)).toBe('ready');
    expect(markup).toContain('Read the source again');
    // Nothing about extraction, a run, or a place on a disk. What a reader is doing is
    // reading the documents their business wrote (LAW-010).
    expect(refusesAPress(markup)).toBe(false);
  });

  it('cannot be pressed twice while it is reading, and says it is reading', () => {
    const markup = drawn({ at: 'reading' });

    expect(saysItIs(markup)).toBe('reading');
    // Both, deliberately. Refusing the press stops two reads; saying so is what stops
    // a reader concluding the first press did nothing and going looking elsewhere.
    expect(refusesAPress(markup)).toBe(true);
    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain('Reading the source');
  });

  it('says a source that had not changed had not changed', () => {
    const markup = drawn({ at: 'read', unchangedAtSource: true });

    expect(saysItIs(markup)).toBe('read');
    expect(markup).toContain('Nothing has changed at source');
    // The common press, and the one most easily read as a failure. It says what it
    // found rather than falling silent, and it is not marked as something to act on.
    expect(markup).not.toContain('data-conspicuous');
    expect(refusesAPress(markup)).toBe(false);
  });

  it('says a source that had changed has been written down', () => {
    const markup = drawn({ at: 'read', unchangedAtSource: false });

    expect(saysItIs(markup)).toBe('read');
    expect(markup).toContain('read again');
    // What moved is the grid's and the change list's to say. A count here would be a
    // second answer to one question on the screen where the first one just moved.
    expect(words(markup)).not.toMatch(/\d/);
  });

  it('says why a read could not be done, and that the reading below still stands', () => {
    const markup = drawn({
      at: 'could-not-read',
      because: 'The documents this Corpus is read from are not where its Lens says they are.',
    });

    expect(saysItIs(markup)).toBe('could-not-read');
    // The sentence comes from the server, so the runner and this say the same thing
    // about the same failure, and it is marked as something to act on (LAW-007).
    expect(markup).toContain('are not where its Lens says they are');
    expect(markup).toContain('data-conspicuous');
    // And a reader is told the figures they are looking at are the old ones and are
    // intact — a failed read that said only *it failed* leaves them unsure whether
    // what is below is knowledge or wreckage.
    expect(markup).toContain('already there');
    expect(refusesAPress(markup)).toBe(false);
  });

  it('never claims a figure or a state a reading has not been taken of', () => {
    // Four states, four drawings, and not one of them carries a figure. This is an
    // action and not a reading: a percentage, a rate or a count here would be a
    // reading of the knowledge taken by the thing that went to fetch it (LAW-006).
    for (const doing of [
      { at: 'ready' },
      { at: 'reading' },
      { at: 'read', unchangedAtSource: true },
      { at: 'read', unchangedAtSource: false },
    ] as Doing[]) {
      expect(drawn(doing)).not.toContain('data-figure');
    }
  });
});
