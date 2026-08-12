import { describe, expect, it } from 'vitest';
import type { ZodDiscriminatedUnion, ZodTypeAny } from 'zod';
import {
  corpusReadingSchema,
  factReadingSchema,
  homeReadingSchema,
  inboxReadingSchema,
  moduleReadingSchema,
  wholeReadingSchema,
} from '../src/index.js';

/**
 * The union each payload carries a reading in, whatever it wraps that in.
 *
 * Reached by name rather than by walking, because a surface that renamed its
 * reading is a surface this test should stop finding and say so.
 */
const READING_IN: Record<string, ZodDiscriminatedUnion<'outcome', never>> = {
  'the shelf': corpusReadingSchema as never,
  'the grid': wholeReadingSchema as never,
  'the work surface': homeReadingSchema as never,
  'the Inbox': inboxReadingSchema as never,
  'a Module': moduleReadingSchema as never,
  'a Fact': factReadingSchema as never,
};

function outcomesOf(union: ZodDiscriminatedUnion<'outcome', never>): string[] {
  return [...(union.optionsMap as Map<string, ZodTypeAny>).keys()].sort();
}

/**
 * Spec §8's split, held at the boundary.
 *
 * These six payloads each tell a Corpus with a reading apart from one without. The
 * ways of having none were spelled out six times, which was six chances for one
 * surface to learn a new one and five to go on drawing the old sentence for it.
 */
describe('every surface answers for every way of having no reading', () => {
  it('finds the reading in all six, so the check below is about something', () => {
    expect(Object.keys(READING_IN)).toHaveLength(6);
    for (const [surface, union] of Object.entries(READING_IN)) {
      expect(outcomesOf(union), surface).toContain('read');
    }
  });

  it('names the same ways of having none in all six', () => {
    for (const [surface, union] of Object.entries(READING_IN)) {
      expect(outcomesOf(union), surface).toEqual([
        'could-not-be-read',
        'nothing-written-down-yet',
        'read',
      ]);
    }
  });

  it('asks every one of them for the reason, because a name without one is a blank space', () => {
    for (const [surface, union] of Object.entries(READING_IN)) {
      const withoutOne = union.safeParse({ outcome: 'could-not-be-read' });
      expect(withoutOne.success, surface).toBe(false);

      const withOne = union.safeParse({ outcome: 'could-not-be-read', because: 'it cannot' });
      expect(withOne.success, surface).toBe(true);
    }
  });

  it('gives none of them a figure, because a Corpus that cannot be read has no denominator', () => {
    // Nothing was looked for and there are no Modules to count, so a zero here would
    // read as a Corpus measured and found empty (LAW-006).
    for (const [surface, union] of Object.entries(READING_IN)) {
      const parsed = union.parse({
        outcome: 'could-not-be-read',
        because: 'it cannot',
        readiness: { modulesFullyApproved: 0, modules: 0 },
        integrity: { openFindings: 0, lookedFor: ['a-check'] },
        declaredFacets: 0,
      });

      expect(Object.keys(parsed as object).sort(), surface).toEqual(['because', 'outcome']);
    }
  });
});
