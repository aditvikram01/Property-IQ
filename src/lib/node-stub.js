// Empty stub for Node-only builtins (e.g. node:worker_threads) that scribe.js
// dynamically imports ONLY under Node. In the browser those branches are gated by
// `typeof process === 'undefined'` and never run, but the bundler still tries to
// resolve the import — so we alias it to this empty module. parentPort etc. are
// read off the namespace at runtime only in Node, so an empty default is enough.
export default {};
export const parentPort = undefined;
