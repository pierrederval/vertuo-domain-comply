import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  readPreviousSnapshot, trend, writeSnapshot, type Snapshot,
} from '@vertuo/comply-readiness';

function snapshot(takenAt: string, approved: number): Snapshot {
  return {
    takenAt, profileId: 'p',
    scores: [{ moduleId: 'alpha', owner: 'avery', total: 3, present: 3, wellFormed: 3, approved }],
  };
}

describe('run snapshots', () => {
  it('writes a snapshot and reads back the most recent earlier one', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'runs-'));
    await writeSnapshot(dir, snapshot('2026-01-01T00:00:00.000Z', 1));
    await writeSnapshot(dir, snapshot('2026-01-02T00:00:00.000Z', 2));

    const previous = await readPreviousSnapshot(dir, 'p', '2026-01-02T00:00:00.000Z');
    expect(previous?.takenAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('returns null when no earlier snapshot exists', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'runs-'));
    await writeSnapshot(dir, snapshot('2026-01-01T00:00:00.000Z', 1));
    expect(await readPreviousSnapshot(dir, 'p', '2026-01-01T00:00:00.000Z')).toBeNull();
  });

  it('computes the approved delta per module', () => {
    const rows = trend(snapshot('b', 3), snapshot('a', 1));
    expect(rows).toEqual([{ moduleId: 'alpha', approvedDelta: 2 }]);
  });

  it('treats a first run as a zero delta rather than a jump', () => {
    expect(trend(snapshot('a', 2), null)).toEqual([{ moduleId: 'alpha', approvedDelta: 0 }]);
  });

  it('skips a corrupt snapshot file and still returns a valid earlier one', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'runs-'));
    await writeSnapshot(dir, snapshot('2026-01-01T00:00:00.000Z', 1));
    await writeFile(join(dir, 'p-corrupt.json'), '{ not valid json', 'utf8');

    const previous = await readPreviousSnapshot(dir, 'p', '2026-01-02T00:00:00.000Z');
    expect(previous?.takenAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('never returns another profile’s snapshot', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'runs-'));
    await writeSnapshot(dir, { ...snapshot('2026-01-01T00:00:00.000Z', 1), profileId: 'other' });

    expect(await readPreviousSnapshot(dir, 'p', '2026-01-02T00:00:00.000Z')).toBeNull();
  });

  it('returns null for a directory that does not exist', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'runs-'));
    expect(await readPreviousSnapshot(join(dir, 'missing'), 'p', '2026-01-02T00:00:00.000Z')).toBeNull();
  });
});
