import { fileURLToPath } from 'node:url';
import tailwind from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/** Where the read-only surface answers from in development. */
const API = 'http://127.0.0.1:4301';

export default defineConfig({
  plugins: [react(), tailwind()],
  /*
   * `@/` is what the vendored components import each other by, which is the
   * convention they arrive with (ADR-0018). Kept identical here, in the test
   * runner, and in `tsconfig.json`, so a component resolves the same way
   * whether it is served, tested, or type-checked.
   */
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 4302,
    /*
     * Refused rather than moved. A Studio that quietly took the next free port
     * leaves two of itself running, and the one a person is reading is then the
     * one they did not just change — which reads as a change that did nothing.
     */
    strictPort: true,
    proxy: {
      /*
       * The Studio and the server answer at the same address on purpose: the
       * design gives both `/corpus` (spec §10), and a person navigating there
       * expects a page while the page itself expects the knowledge. What is being
       * asked for tells them apart — a request that wants a document gets the
       * Studio, and one that wants the knowledge gets the server.
       *
       * Whatever puts the two behind one address in production has to make the
       * same distinction. Deployment is not this slice's, but the rule is.
       */
      '/corpus': {
        target: API,
        bypass: (request) =>
          request.headers.accept?.includes('text/html') === true ? '/index.html' : undefined,
      },
    },
  },
});
