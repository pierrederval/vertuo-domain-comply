import { describe, expect, it } from 'vitest';
import { EXCERPT_LIMIT, excerptOf, type ParsedDocument } from '@vertuo/comply-ingestion';

/**
 * A document whose body is exactly these lines.
 *
 * Nothing here needs a file or frontmatter: what an excerpt is cut out of is a run
 * of body lines, and the tests below are about where the cut falls in that run.
 */
function documentOf(body: string): ParsedDocument {
  return { file: 'doc.md', data: {}, body, bodyStartLine: 1 };
}

/** The whole of a body, quoted. */
function quotationOf(body: string) {
  return excerptOf(documentOf(body), 1, body.split('\n').length);
}

/** A run of words of about this many characters. */
function words(length: number): string {
  return 'lorem ipsum dolor sit amet '.repeat(Math.ceil(length / 27)).slice(0, length).trimEnd();
}

describe('a quotation is the source, exactly as written', () => {
  it('carries a short span whole, and says it was not cut', () => {
    const body = '## A\n\nOne line. Then another.';
    expect(quotationOf(body)).toEqual({ text: body, cut: false });
  });

  it('carries a span the length of the budget whole, and cuts the one past it', () => {
    expect(quotationOf(words(EXCERPT_LIMIT)).cut).toBe(false);
    expect(quotationOf(`${words(EXCERPT_LIMIT)} more`).cut).toBe(true);
  });

  it('cuts a long span to a verbatim beginning of it, never to a shortening of it', () => {
    const body = words(EXCERPT_LIMIT * 2);
    const quoted = quotationOf(body);

    expect(quoted.cut).toBe(true);
    expect(body.startsWith(quoted.text)).toBe(true);
  });
});

describe('where a cut falls', () => {
  /**
   * The one this issue is about. A source whose next line is longer than the whole
   * budget used to lose everything after the line before it: cutting at a line
   * boundary keeps whole source lines, and what it keeps is bounded by the longest
   * line the source happens to write, which nothing bounds.
   *
   * On the DDD Corpus this threw away 502 of 600 characters at its worst, leaving a
   * reader four headings and no knowledge at all.
   */
  it('keeps its budget where the line after the cut is longer than the budget', () => {
    const body = `## A\n\n${words(EXCERPT_LIMIT + 500)}`;
    const quoted = quotationOf(body);

    expect(quoted.cut).toBe(true);
    // Not the heading alone, which is what a whole-line cut leaves here.
    expect(quoted.text).not.toBe('## A');
    expect(quoted.text.length).toBeGreaterThan(EXCERPT_LIMIT - 30);
  });

  it('ends where the source ends a word', () => {
    const body = words(EXCERPT_LIMIT * 2);
    const quoted = quotationOf(body);

    // What comes next at source is a break between words, so nothing a reader is
    // shown is half of a word the source wrote whole.
    expect(body.slice(quoted.text.length, quoted.text.length + 1)).toMatch(/\s/);
  });

  it('keeps a word ending exactly where the budget does, rather than dropping it', () => {
    const body = `${words(EXCERPT_LIMIT)} and more besides`;
    const quoted = quotationOf(body);

    expect(quoted.text).toBe(words(EXCERPT_LIMIT));
  });

  it('cuts where the budget falls where the source writes no break at all', () => {
    const body = 'x'.repeat(EXCERPT_LIMIT + 100);
    const quoted = quotationOf(body);

    expect(quoted.cut).toBe(true);
    expect(quoted.text).toBe('x'.repeat(EXCERPT_LIMIT));
  });

  it('never ends in blank space, whether it was cut or not', () => {
    for (const body of [words(EXCERPT_LIMIT * 2), `## A\n\n${words(EXCERPT_LIMIT + 500)}`, '## A\n\nshort']) {
      expect(quotationOf(body).text).toBe(quotationOf(body).text.trimEnd());
    }
  });
});
