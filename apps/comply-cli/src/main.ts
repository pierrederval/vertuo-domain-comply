import { loadCorpus } from '@vertuo/comply-ingestion';
import { loadLens } from '@vertuo/comply-lens';
import { readPreviousSnapshot, writeSnapshot } from '@vertuo/comply-readiness';
import { readCorpus } from './reading.js';

const RUNS_DIR = '.comply/runs';

async function main(): Promise<void> {
  const lensPath = process.argv[2];
  if (lensPath === undefined) {
    console.error('Usage: pnpm comply <lens.json>');
    process.exitCode = 2;
    return;
  }

  const lens = await loadLens(lensPath);
  const { corpus, findings } = await loadCorpus(lens);

  const takenAt = new Date().toISOString();
  const previous = await readPreviousSnapshot(RUNS_DIR, lens.id, takenAt);
  const reading = readCorpus(corpus, lens, findings, takenAt, previous);
  await writeSnapshot(RUNS_DIR, reading.snapshot);

  console.log(reading.text);
}

await main();
