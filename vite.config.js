import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  cacheDir: '.vite-cache',
  plugins: [react()],
  resolve: {
    alias: {
      // scribe.js-ocr is universal (Node + browser). Its Node path dynamically
      // imports a native skia canvas; in the browser it uses the DOM canvas and
      // never runs that import. Alias the Node-only package to an empty stub so
      // the bundler doesn't choke on the native .node binary.
      '@scribe.js/canvas': fileURLToPath(new URL('./src/lib/scribe-canvas-stub.js', import.meta.url)),
      // Node-only worker_threads — gated behind `typeof process` in scribe's
      // workers; the browser branch uses globalThis. Stub so the worker bundles.
      'node:worker_threads': fileURLToPath(new URL('./src/lib/node-stub.js', import.meta.url)),
    },
  },
  // Don't pre-bundle scribe with esbuild — let it load as ESM so its workers and
  // wasm assets resolve same-origin.
  optimizeDeps: { exclude: ['scribe.js-ocr'] },
  // Scribe's web workers reference Node builtins behind `typeof process` guards
  // that never run in the browser. Keep them external so the worker bundler does
  // not try to resolve them.
  worker: {
    format: 'es',
    rollupOptions: { external: [/^node:/] },
  },
  // Proxy the eligibility agent backend so the SPA calls same-origin /api and we
  // avoid CORS. Run the backend with `npm run server` (defaults to port 8787).
  server: {
    proxy: {
      '/api': { target: 'http://localhost:8787', changeOrigin: true },
    },
  },
})
