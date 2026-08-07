import { runChecks } from '@vertuo/comply-integrity';
import { loadCorpus } from '@vertuo/comply-ingestion';
import { loadProfile } from '@vertuo/comply-profile';
import { buildMatrix } from '@vertuo/comply-readiness';
import { scoreMatrix } from '@vertuo/comply-readiness';
import {
  readPreviousSnapshot, trend, writeSnapshot, type Snapshot,
} from '@vertuo/comply-readiness';
import { renderFindings, renderMatrix } from './render.js';

const RUNS_DIR = '.comply/runs';

async function main(): Promise<void> {
  const profilePath = process.argv[2];
  if (profilePath === undefined) {
    console.error('Usage: pnpm comply <profile.json>');
    process.exitCode = 2;
    return;
  }

  const profile = await loadProfile(profilePath);
  const { corpus, findings: importFindings } = await loadCorpus(profile);

  const matrix = buildMatrix(corpus, profile);
  const scores = scoreMatrix(matrix);

  const snapshot: Snapshot = {
    takenAt: new Date().toISOString(),
    profileId: profile.id,
    scores,
  };
  const previous = await readPreviousSnapshot(RUNS_DIR, profile.id, snapshot.takenAt);
  await writeSnapshot(RUNS_DIR, snapshot);

  console.log(renderMatrix(matrix, scores, trend(snapshot, previous)));
  console.log();
  console.log(
    renderFindings([...importFindings, ...runChecks(corpus, profile)], profile.adapter.root),
  );
}

await main();
