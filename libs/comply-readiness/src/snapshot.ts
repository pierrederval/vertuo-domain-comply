import { mkdir, readFile, readdir, rename, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { FactId } from '@vertuo/comply-core';
import type { ModuleScore } from './score.js';

export interface Snapshot {
  takenAt: string;
  profileId: string;
  scores: ModuleScore[];
}

export interface TrendRow {
  moduleId: FactId;
  approvedDelta: number;
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
  const base = `${snapshot.profileId}-${snapshot.takenAt.replace(/[:.]/g, '-')}`;

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
  profileId: string,
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
    let snapshot: Snapshot;
    try {
      snapshot = JSON.parse(await readFile(join(dir, name), 'utf8')) as Snapshot;
    } catch {
      // A single corrupt or partially-written file costs one data point,
      // not the whole directory's trend history.
      continue;
    }
    if (snapshot.profileId === profileId && snapshot.takenAt < excludeAt) candidates.push(snapshot);
  }

  candidates.sort((a, b) => a.takenAt.localeCompare(b.takenAt));
  return candidates.at(-1) ?? null;
}

export function trend(current: Snapshot, previous: Snapshot | null): TrendRow[] {
  return current.scores.map((score) => {
    const before = previous?.scores.find((s) => s.moduleId === score.moduleId);
    return {
      moduleId: score.moduleId,
      approvedDelta: before === undefined ? 0 : score.approved - before.approved,
    };
  });
}
