import { extractCommand, pruneCommand, reportCommand } from './commands.js';
import { shelfAt } from '@vertuo/comply-door';

/**
 * The shelf this runner writes to, which is the one the server reads. Both take
 * it from the same place so that what a build reports and what a person is shown
 * are readings of the same knowledge.
 */
const SHELF = process.env['COMPLY_SHELF'] ?? '.comply';

const COMMANDS = ['extract', 'report', 'prune'] as const;

const USAGE = [
  'Usage:',
  '  pnpm comply extract <lens.json>              write down the knowledge as found',
  '  pnpm comply report  <lens.json> [seed.json]  read it and say where it stands',
  '  pnpm comply prune   <lens.json> [keep]       drop what can be worked out again',
  '',
  `All three work on the shelf at ${SHELF}. Set COMPLY_SHELF to work on another.`,
].join('\n');

async function main(): Promise<void> {
  const [command, lensPath, third] = process.argv.slice(2);

  if (lensPath === undefined || !COMMANDS.includes(command as (typeof COMMANDS)[number])) {
    console.error(USAGE);
    process.exitCode = 2;
    return;
  }

  const shelf = shelfAt(SHELF);

  // Every failure this runner raises is already written as a sentence somebody can
  // act on — a Lens that cannot be followed, knowledge on the shelf written down in
  // an older form. Left to the runtime, each of those arrives underneath a stack
  // trace through this workspace's own internals, and the sentence somebody wrote
  // for a person to read is the one line they have to find in it.
  try {
    if (command === 'extract') console.log(await extractCommand(shelf, lensPath));
    else if (command === 'prune') console.log(await pruneCommand(shelf, lensPath, third));
    else console.log(await reportCommand(shelf, lensPath, third));
  } catch (failure) {
    console.error(failure instanceof Error ? failure.message : String(failure));
    process.exitCode = 1;
  }
}

await main();
