import { chromium } from 'playwright';

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const jitter = (ms) => ms + Math.floor(Math.random() * ms * 0.5);

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

export async function withBrowser(fn) {
  const browser = await chromium.launch({ headless: true, args: [] });
  const context = await browser.newContext({
    userAgent: UA,
    locale: 'en-AU',
    timezoneId: 'Australia/Sydney',
    viewport: { width: 1366, height: 900 },
    extraHTTPHeaders: { 'Accept-Language': 'en-AU,en;q=0.9' },
  });
  try {
    return await fn(context);
  } finally {
    await browser.close();
  }
}

/**
 * Open a listing page, scroll it, and return every JSON payload the page loaded or embedded
 * (XHR/fetch responses, JSON-LD, __NEXT_DATA__). Works without knowing a site's private API.
 */
export async function captureJson(context, url, { scrolls = 8, waitMs = 1400 } = {}) {
  const page = await context.newPage();
  const payloads = [];
  page.on('response', async (res) => {
    try {
      if (res.status() !== 200) return;
      if (!(res.headers()['content-type'] || '').includes('json')) return;
      if (Number(res.headers()['content-length'] || 0) > 4_000_000) return;
      payloads.push(await res.json());
    } catch { /* body not available */ }
  });
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
    for (let i = 0; i < scrolls; i++) {
      await page.mouse.wheel(0, 2600);
      await sleep(jitter(waitMs));
    }
    const embedded = await page.evaluate(() =>
      [...document.querySelectorAll('script[type="application/ld+json"], script#__NEXT_DATA__')]
        .map((s) => { try { return JSON.parse(s.textContent || ''); } catch { return null; } })
        .filter(Boolean)
    );
    return [...payloads, ...embedded];
  } finally {
    await page.close();
  }
}
