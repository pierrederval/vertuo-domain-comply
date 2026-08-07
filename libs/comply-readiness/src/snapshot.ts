import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
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

export async function writeSnapshot(dir: string, snapshot: Snapshot): Promise<string> {
  await mkdir(dir, { recursive: true });
  const name = `${snapshot.profileId}-${snapshot.takenAt.replace(/[:.]/g, '-')}.json`;
  const path = join(dir, name);
  await writeFile(path, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
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
    const snapshot = JSON.parse(await readFile(join(dir, name), 'utf8')) as Snapshot;
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
