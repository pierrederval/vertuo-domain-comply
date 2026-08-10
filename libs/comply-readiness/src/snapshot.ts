import { mkdir, readFile, readdir, rename, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { FactId } from '@vertuo/comply-core';
import type { ModuleScore } from './score.js';

export interface Snapshot {
  takenAt: string;
  lensId: string;
  scores: ModuleScore[];
}

export interface TrendRow {
  moduleId: FactId;
  /** Null when there is no prior figure for this module — a first-ever run, or a
   *  module that did not exist in the previous snapshot. Never conflated with 0,
   *  which means the figure held steady against a real baseline. */
  approvedDelta: number | null;
}

/**
 * A snapshot as found on disk. Runs from before ADR-0015 renamed the Lens carry
 * its identity under the old key, and those files are exactly the baselines a
 * trend needs. Refusing to read them would discard every comparison point the
 * rename inherited — a cost ADR-0014 permits but nothing here requires paying.
 * Tolerated on read only: nothing writes the old key, so the set of files
 * needing it can only shrink.
 */
interface StoredSnapshot extends Omit<Snapshot, 'lensId'> {
  lensId?: string;
  profileId?: string;
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

export async function writeSnapshot(dir: string, snapshot: Snapshot): Promise<string> {
  await mkdir(dir, { recursive: true });
  const base = `${snapshot.lensId}-${snapshot.takenAt.replace(/[:.]/g, '-')}`;

  let name = `${base}.json`;
  let suffix = 1;
  while (await pathExists(join(dir, name))) {
    name = `${base}-${suffix}.json`;
    suffix += 1;
  }
  const path = join(dir, name);

  // Write to a temp file in the same directory, then rename into place.
  // Rename within a directory is atomic, so a concurrent reader sees
  // either the old contents or the complete new file, never a partial one.
  const tmpPath = join(dir, `.${name}.${randomUUID()}.tmp`);
  await writeFile(tmpPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
  await rename(tmpPath, path);
  return path;
}

export async function readPreviousSnapshot(
  dir: string,
  lensId: string,
  excludeAt: string,
): Promise<Snapshot | null> {
  let names: string[];
  try {
    names = await readdir(dir);
  } catch {
    return null;
  }

  const candidates: Snapshot[] = [];
  for (const name of names) {
    if (!name.endsWith('.json')) continue;
    let stored: StoredSnapshot;
    try {
      stored = JSON.parse(await readFile(join(dir, name), 'utf8')) as StoredSnapshot;
    } catch {
      // A single corrupt or partially-written file costs one data point,
      // not the whole directory's trend history.
      continue;
    }
    const storedLensId = stored.lensId ?? stored.profileId;
    if (storedLensId === lensId && stored.takenAt < excludeAt) {
      // Normalise on the way out, so one transitional key never reaches a caller.
      candidates.push({ ...stored, lensId: storedLensId });
    }
  }

  candidates.sort((a, b) => a.takenAt.localeCompare(b.takenAt));
  return candidates.at(-1) ?? null;
}

export function trend(current: Snapshot, previous: Snapshot | null): TrendRow[] {
  return current.scores.map((score) => {
    const before = previous?.scores.find((s) => s.moduleId === score.moduleId);
    return {
      moduleId: score.moduleId,
      approvedDelta: before === undefined ? null : score.approved - before.approved,
    };
  });
}
