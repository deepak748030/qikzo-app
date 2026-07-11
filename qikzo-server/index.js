// Runtime entry. Works for both `node index.js` (prod, after `npm run build`)
// and Vercel serverless (which imports this file). In dev use `npm run dev`
// (tsx watch) — do NOT invoke this file directly for TS sources.
/* eslint-disable */
try {
    // Prefer compiled output when present.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    module.exports = require('./dist/src/app').default || require('./dist/src/app');
} catch (e) {
    // Fallback: register tsx at runtime (useful for Vercel builds that
    // haven't produced dist yet). Requires `tsx` in dependencies.
    require('tsx/cjs');
    module.exports = require('./src/app').default;
}

if (require.main === module) {
    // Delegate to the standalone server bootstrapper.
    try {
        require('./dist/src/server');
    } catch {
        require('tsx/cjs');
        require('./src/server');
    }
}
