import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Age } from '../src/components/Age.js';

const NOW = new Date('2026-01-01T12:00:00.000Z');

function phrase(at: string): string {
  const drawn = renderToStaticMarkup(<Age at={at} now={NOW} />);
  return drawn.replace(/<[^>]*>/g, '');
}

describe('how old a reading is', () => {
  it('says it in words a person reads at a glance', () => {
    expect(phrase('2026-01-01T11:59:30.000Z')).toBe('just now');
    expect(phrase('2026-01-01T11:45:00.000Z')).toBe('15 minutes ago');
    expect(phrase('2026-01-01T08:00:00.000Z')).toBe('4 hours ago');
    expect(phrase('2025-12-30T12:00:00.000Z')).toBe('2 days ago');
  });

  it('keeps the unit singular where there is one of it', () => {
    expect(phrase('2026-01-01T11:00:00.000Z')).toBe('1 hour ago');
    expect(phrase('2025-12-31T12:00:00.000Z')).toBe('1 day ago');
  });

  it('keeps the exact moment for anyone who wants it', () => {
    // The phrase is for reading, the timestamp is for checking. A surface that
    // rounded the moment away could not be held to it.
    const drawn = renderToStaticMarkup(<Age at="2026-01-01T08:00:00.000Z" now={NOW} />);
    expect(drawn).toContain('2026-01-01T08:00:00.000Z');
  });
});
