import { runChecks } from '@vertuo/comply-integrity';
import { loadCorpus } from '@vertuo/comply-ingestion';
import { loadLens } from '@vertuo/comply-lens';
import { buildMatrix } from '@vertuo/comply-readiness';
import { scoreMatrix } from '@vertuo/comply-readiness';
import {
  readPreviousSnapshot, trend, writeSnapshot, type Snapshot,
} from '@vertuo/comply-readiness';
import { renderFindings, renderMatrix } from './render.js';

const RUNS_DIR = '.comply/runs';

async function main(): Promise<void> {
  const lensPath = process.argv[2];
  if (lensPath === undefined) {
    console.error('Usage: pnpm comply <lens.json>');
    process.exitCode = 2;
    return;
  }

  const lens = await loadLens(lensPath);
  const { corpus, findings: importFindings } = await loadCorpus(lens);

  const matrix = buildMatrix(corpus, lens);
  const scores = scoreMatrix(matrix);

  const snapshot: Snapshot = {
    takenAt: new Date().toISOString(),
    lensId: lens.id,
    scores,
  };
  const previous = await readPreviousSnapshot(RUNS_DIR, lens.id, snapshot.takenAt);
  await writeSnapshot(RUNS_DIR, snapshot);

  console.log(renderMatrix(matrix, scores, trend(snapshot, previous)));
  console.log();
  console.log(
    renderFindings([...importFindings, ...runChecks(corpus, lens)], lens.adapter.root),
  );
}

await main();
