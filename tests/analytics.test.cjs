const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'savehalf-analytics-'));
const file = path.join(dir, 'analytics.cjs');
require('esbuild').buildSync({ entryPoints: ['src/lib/analytics.ts'], bundle: true, platform: 'node', format: 'cjs', outfile: file });
const { analyticsAllowed, sanitiseAnalyticsEvent } = require(file);
fs.rmSync(dir, { recursive: true });

test('analytics excludes previews, auth callbacks and privacy opt-outs', () => {
  assert(analyticsAllowed('https://savehalf.vercel.app/'));
  assert(analyticsAllowed('https://savehalf-au.vercel.app/'));
  for (const url of ['http://localhost:5173/', 'https://savehalf-preview.vercel.app/', 'https://savehalf.vercel.app/?code=secret', 'https://savehalf.vercel.app/?token_hash=secret', 'https://savehalf.vercel.app/#access_token=secret', 'invalid']) assert.equal(analyticsAllowed(url), false);
  assert.equal(analyticsAllowed('https://savehalf.vercel.app/', '1'), false);
  assert.equal(analyticsAllowed('https://savehalf.vercel.app/', null, true), false);
});

test('pageview URLs contain no query, fragment or private paths; custom events are dropped', () => {
  assert.deepEqual(sanitiseAnalyticsEvent({ type: 'pageview', url: 'https://savehalf.vercel.app/?search=private#saved-list' }), { type: 'pageview', url: 'https://savehalf.vercel.app/' });
  for (const url of ['https://savehalf.vercel.app/account/private', 'https://savehalf.vercel.app/?code=secret', 'bad-url']) assert.equal(sanitiseAnalyticsEvent({ type: 'pageview', url }), null);
  assert.equal(sanitiseAnalyticsEvent({ type: 'event', url: 'https://savehalf.vercel.app/' }), null);
});
