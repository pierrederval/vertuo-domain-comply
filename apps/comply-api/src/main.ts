import { buildServer } from './server.js';

/**
 * Where the shelf is. One directory holding a Lens per Corpus, the source those
 * Lenses point at, and the Seeds written down from it (spec §3.5).
 */
const SHELF = process.env['COMPLY_SHELF'] ?? '.comply';

/**
 * The product's two processes answer on neighbouring ports, so which is which is
 * remembered once rather than twice. 4000 and 5173 are both defaults something
 * else on a laptop already wants — the first is anything at all, the second is
 * every other Vite project — and a development server that quietly moved because
 * a port was taken is a person reading a stale answer and trusting it.
 */
const PORT = Number(process.env['COMPLY_PORT'] ?? 4301);

const server = buildServer(SHELF);
await server.listen({ port: PORT, host: '127.0.0.1' });
