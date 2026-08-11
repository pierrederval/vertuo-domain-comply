import { createConnection } from 'node:net';

/**
 * Refuses to start the pair when something is already answering on their ports,
 * and says what is probably true rather than printing a stack trace.
 *
 * Both processes already refuse to move (`strictPort`, and the API's fixed port),
 * for a good reason: a development server that quietly took the next free port
 * leaves two of itself running, and the one being read is then the one that was
 * not just changed — which reads as a change that did nothing.
 *
 * What they did not do is say so usefully. Vite's refusal is an unhandled error
 * with a stack trace through its own internals, and Turborepo then kills the API
 * beside it, so the last thing on screen is two failures and no hint that the
 * cause is a pair somebody left running in another terminal. This runs first and
 * names it.
 */

/** `COMPLY_PORT` moves the API deliberately; the Studio's port is fixed in its Vite config. */
const WANTED = [
  { port: Number(process.env.COMPLY_PORT ?? 4301), what: 'the API' },
  { port: 4302, what: 'the Studio' },
];

/** How long to wait for a connection before deciding nothing is there. */
const PATIENCE = 300;

/**
 * Whether something is already answering there.
 *
 * Asked by connecting rather than by trying to bind. The two processes listen on
 * different address families — the Studio on `::1`, the API on `127.0.0.1` — and a
 * bind test has to guess which, where a connection attempt against both settles it.
 */
function answering(port, host) {
  return new Promise((resolve) => {
    const socket = createConnection({ port, host });
    const settle = (taken) => {
      socket.destroy();
      resolve(taken);
    };

    socket.setTimeout(PATIENCE, () => settle(false));
    socket.once('connect', () => settle(true));
    socket.once('error', () => settle(false));
  });
}

async function taken({ port }) {
  const found = await Promise.all([answering(port, '127.0.0.1'), answering(port, '::1')]);
  return found.some(Boolean);
}

const held = [];
for (const wanted of WANTED) {
  if (await taken(wanted)) held.push(wanted);
}

if (held.length > 0) {
  const each = held.map(({ port, what }) => `  ${port} — ${what}`).join('\n');
  const list = WANTED.map(({ port }) => `-iTCP:${port}`).join(' ');

  process.stderr.write(
    `\nSomething is already answering here:\n\n${each}\n\n` +
      'Almost certainly a pair you started earlier and left running. Neither port\n' +
      'moves when it is taken, on purpose: a server that quietly took the next one\n' +
      'leaves two of itself running, and the one you read is then the one you did\n' +
      'not just change.\n\n' +
      'Stop the other pair, or find what is holding these:\n\n' +
      `  lsof -nP ${list} -sTCP:LISTEN\n\n`,
  );
  process.exit(1);
}
