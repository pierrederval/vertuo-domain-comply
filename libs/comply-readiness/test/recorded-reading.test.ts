import { mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  lastRecordedReading,
  readingsNamingNoInputs,
  readingsOnRecord,
  recordReading,
  trend,
  type RecordedReading,
} from '@vertuo/comply-readiness';

const KNOWLEDGE = 'a'.repeat(64);
const CRITERIA = 'b'.repeat(64);

function reading(
  takenAt: string,
  approved: number,
  inputs: { seedDigest?: string; lensDigest?: string } = {},
): RecordedReading {
  return {
    takenAt,
    lensId: 'p',
    seedDigest: inputs.seedDigest ?? KNOWLEDGE,
    lensDigest: inputs.lensDigest ?? CRITERIA,
    scores: [{ moduleId: 'alpha', owner: 'avery', total: 3, present: 3, wellFormed: 3, approved }],
  };
}

async function shelf(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'readings-'));
}

describe('a reading is recorded only when one of its inputs changes', () => {
  it('records nothing the second time the same knowledge is read through the same criteria', async () => {
    const dir = await shelf();
    const first = await recordReading(dir, reading('2026-01-01T00:00:00.000Z', 1));
    expect(first.alreadyRecorded).toBe(false);

    const again = await recordReading(dir, reading('2026-01-01T00:00:10.000Z', 1));
    expect(again.alreadyRecorded).toBe(true);
    expect(again.path).toBe(first.path);
    expect(await readdir(dir)).toHaveLength(1);
  });

  it('records nothing on the second read even where the figures would be identical', async () => {
    // The figures are a function of the two inputs, so identical inputs cannot
    // produce different figures. Deduplicating on the inputs and not on the
    // figures is what makes that a statement the store keeps rather than one
    // whoever wrote the figures happened to honour.
    const dir = await shelf();
    await recordReading(dir, reading('2026-01-01T00:00:00.000Z', 1));
    const again = await recordReading(dir, reading('2026-01-01T00:00:10.000Z', 3));

    expect(again.alreadyRecorded).toBe(true);
    expect((await lastRecordedReading(dir, 'p'))?.scores[0]!.approved).toBe(1);
  });

  it('records again once the knowledge changes', async () => {
    const dir = await shelf();
    await recordReading(dir, reading('2026-01-01T00:00:00.000Z', 1));
    const next = await recordReading(
      dir,
      reading('2026-01-02T00:00:00.000Z', 2, { seedDigest: 'c'.repeat(64) }),
    );

    expect(next.alreadyRecorded).toBe(false);
    expect(await readdir(dir)).toHaveLength(2);
  });

  it('records again once the criteria change, even where nothing was written', async () => {
    const dir = await shelf();
    await recordReading(dir, reading('2026-01-01T00:00:00.000Z', 3));
    const next = await recordReading(
      dir,
      reading('2026-01-02T00:00:00.000Z', 1, { lensDigest: 'd'.repeat(64) }),
    );

    expect(next.alreadyRecorded).toBe(false);
    expect(await readdir(dir)).toHaveLength(2);
  });

  it('records for one Lens without deduplicating against another’s', async () => {
    const dir = await shelf();
    await recordReading(dir, reading('2026-01-01T00:00:00.000Z', 1));
    const other = await recordReading(dir, {
      ...reading('2026-01-01T00:00:01.000Z', 1),
      lensId: 'other',
    });

    expect(other.alreadyRecorded).toBe(false);
  });

  it('names both of its inputs on the file it writes', async () => {
    const dir = await shelf();
    const kept = await recordReading(dir, reading('2026-01-01T00:00:00.000Z', 1));
    const onRecord = JSON.parse(await readFile(kept.path, 'utf8')) as RecordedReading;

    expect(onRecord.seedDigest).toBe(KNOWLEDGE);
    expect(onRecord.lensDigest).toBe(CRITERIA);
  });
});

describe('the reading a trend is stated against', () => {
  it('reads back the most recent one on record', async () => {
    const dir = await shelf();
    await recordReading(dir, reading('2026-01-01T00:00:00.000Z', 1));
    await recordReading(dir, reading('2026-01-02T00:00:00.000Z', 2, { seedDigest: 'c'.repeat(64) }));

    expect((await lastRecordedReading(dir, 'p'))?.takenAt).toBe('2026-01-02T00:00:00.000Z');
  });

  it('is nothing where none has been recorded, and where the place holds none at all', async () => {
    const dir = await shelf();
    expect(await lastRecordedReading(dir, 'p')).toBeNull();
    expect(await lastRecordedReading(join(dir, 'elsewhere'), 'p')).toBeNull();
  });

  it('is never another Lens’s', async () => {
    const dir = await shelf();
    await recordReading(dir, { ...reading('2026-01-01T00:00:00.000Z', 1), lensId: 'other' });
    expect(await lastRecordedReading(dir, 'p')).toBeNull();
  });

  it('survives one unreadable file, which costs one comparison and not the history', async () => {
    const dir = await shelf();
    await recordReading(dir, reading('2026-01-01T00:00:00.000Z', 1));
    await writeFile(join(dir, 'p-half-written.json'), '{ not readable', 'utf8');

    expect((await lastRecordedReading(dir, 'p'))?.takenAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('reads one recorded before the Lens was renamed, so a baseline survives the rename', async () => {
    const dir = await shelf();
    // Exactly what a pre-ADR-0015 run left behind: the identity under the old key.
    await writeFile(
      join(dir, 'p-2026-01-01T00-00-00-000Z.json'),
      JSON.stringify({
        takenAt: '2026-01-01T00:00:00.000Z',
        profileId: 'p',
        seedDigest: KNOWLEDGE,
        lensDigest: CRITERIA,
        scores: [
          { moduleId: 'alpha', owner: 'avery', total: 3, present: 3, wellFormed: 3, approved: 1 },
        ],
      }),
      'utf8',
    );

    const previous = await lastRecordedReading(dir, 'p');
    expect(previous?.takenAt).toBe('2026-01-01T00:00:00.000Z');
    // Callers never meet the old key: what comes back names the Lens, whatever was written.
    expect(previous?.lensId).toBe('p');
  });

  it('passes over one that names neither of its inputs, because nothing can be said about it', async () => {
    // What every recorded reading looked like before ADR-0016 was implemented: no
    // knowledge digest and no criteria digest. Compared against, it would put a
    // delta on the page whose criteria nobody can check — and a drop under
    // tightened criteria drawn as a drop in the knowledge is the one thing §6
    // refuses. It costs a comparison point, which is recomputable, and it costs
    // no knowledge.
    const dir = await shelf();
    await writeFile(
      join(dir, 'p-2026-01-01T00-00-00-000Z.json'),
      JSON.stringify({
        takenAt: '2026-01-01T00:00:00.000Z',
        lensId: 'p',
        scores: [
          { moduleId: 'alpha', owner: 'avery', total: 3, present: 3, wellFormed: 3, approved: 1 },
        ],
      }),
      'utf8',
    );

    expect(await lastRecordedReading(dir, 'p')).toBeNull();
    // And it does not stop the next reading being recorded.
    expect((await recordReading(dir, reading('2026-01-02T00:00:00.000Z', 1))).alreadyRecorded).toBe(
      false,
    );

    // It is still named when asked for by name, so it is not an artifact this
    // product holds and cannot account for. Only a prune asks (LAW-006).
    expect(await readingsNamingNoInputs(dir, 'p')).toEqual([
      join(dir, 'p-2026-01-01T00-00-00-000Z.json'),
    ]);
    expect(await readingsNamingNoInputs(dir, 'other')).toEqual([]);
  });

  it('lists every reading on record for one Lens, oldest first', async () => {
    const dir = await shelf();
    await recordReading(dir, reading('2026-01-01T00:00:00.000Z', 1));
    await recordReading(dir, reading('2026-01-03T00:00:00.000Z', 2, { seedDigest: 'c'.repeat(64) }));
    await recordReading(dir, reading('2026-01-02T00:00:00.000Z', 3, { seedDigest: 'e'.repeat(64) }));

    expect((await readingsOnRecord(dir, 'p')).map((held) => held.reading.takenAt)).toEqual([
      '2026-01-01T00:00:00.000Z',
      '2026-01-02T00:00:00.000Z',
      '2026-01-03T00:00:00.000Z',
    ]);
  });
});

describe('what a Module has done since the last recorded reading', () => {
  it('states the approved delta per Module where both were read the same way', () => {
    expect(trend(reading('b', 3), reading('a', 1))).toEqual([
      { moduleId: 'alpha', comparedWith: 'the-last-reading', approvedDelta: 2 },
    ]);
  });

  it('states no baseline, and not a delta of nothing, on a first-ever reading', () => {
    expect(trend(reading('a', 2), null)).toEqual([
      { moduleId: 'alpha', comparedWith: 'no-earlier-reading' },
    ]);
  });

  it('states no baseline for a Module the last recorded reading did not have', () => {
    const current: RecordedReading = {
      ...reading('b', 1),
      scores: [
        { moduleId: 'alpha', owner: 'avery', total: 3, present: 3, wellFormed: 3, approved: 1 },
        { moduleId: 'newmod', owner: 'avery', total: 2, present: 2, wellFormed: 2, approved: 2 },
      ],
    };
    const rows = trend(current, reading('a', 1));

    expect(rows.find((row) => row.moduleId === 'alpha')).toEqual({
      moduleId: 'alpha',
      comparedWith: 'the-last-reading',
      approvedDelta: 0,
    });
    expect(rows.find((row) => row.moduleId === 'newmod')).toEqual({
      moduleId: 'newmod',
      comparedWith: 'no-earlier-reading',
    });
  });

  it('sends no delta at all where the criteria moved, so a stricter Lens cannot read as a loss', () => {
    const stricter = reading('b', 1, { lensDigest: 'd'.repeat(64) });
    const rows = trend(stricter, reading('a', 3));

    // The figure did fall, by two, and the knowledge is untouched. There is no
    // shape this can be sent in that carries that fall as a delta.
    expect(rows).toEqual([{ moduleId: 'alpha', comparedWith: 'a-reading-under-other-criteria' }]);
    expect(JSON.stringify(rows)).not.toContain('approvedDelta');
  });

  it('says the criteria moved even where the figure did not', () => {
    const stricter = reading('b', 3, { lensDigest: 'd'.repeat(64) });
    expect(trend(stricter, reading('a', 3))).toEqual([
      { moduleId: 'alpha', comparedWith: 'a-reading-under-other-criteria' },
    ]);
  });
});
