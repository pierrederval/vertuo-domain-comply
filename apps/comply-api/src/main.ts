import { buildServer } from './server.js';

/**
 * Where the shelf is. One directory holding a Lens per Corpus, the source those
 * Lenses point at, and the Seeds written down from it (spec §3.5).
 */
const SHELF = process.env['COMPLY_SHELF'] ?? '.comply';
const PORT = Number(process.env['COMPLY_PORT'] ?? 4000);

const server = buildServer(SHELF);
await server.listen({ port: PORT, host: '127.0.0.1' });
