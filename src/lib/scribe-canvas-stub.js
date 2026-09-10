// Stub for @scribe.js/canvas — a Node-only native (skia) canvas that scribe.js
// dynamically imports ONLY when running under Node. In the browser, scribe uses
// the DOM/OffscreenCanvas and never executes that import. We alias the package to
// this empty module (see vite.config.js) so the bundler does not try to load the
// native .node binary, which would break the browser build.
export default {};
