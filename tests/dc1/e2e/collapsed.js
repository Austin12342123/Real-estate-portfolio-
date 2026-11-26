/* DC1: every dropdown starts collapsed. node tests/dc1/e2e/collapsed.js [v4dir]   (default prototype/v4; 393 and 1280 px)
   open sections -> open within the page; switch page and come back -> collapsed; reload -> collapsed;
   old saved coll/open keys ignored; saved UI state has no open/closed keys; typed values survive;
   Health collapsed header carries a one-line verdict. */
const { chromium } = require('playwright'), http = require('http'), fs = require('fs'), path = require('path');
const V4 = path.resolve(process.argv[2] || path.join(__dirname, '../../../prototype/v4'));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/json' };
const nOpen = (page) => page.evaluate(() => document.querySelectorAll('[aria-expanded="true"], details[open]').length);
(async () => {
  const srv = http.createServer((q, rs) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
    try { rs.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); rs.end(fs.readFileSync(path.join(V4, p))); } catch (e) { rs.writeHead(404); rs.end(); } });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const BASE = 'http://127.0.0.1:' + srv.address().port + '/';
  const browser = await chromium.launch(); let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
  for (const w of [393, 1280]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, serviceWorkers: 'block' }); await ctx.addInitScript(() => { window.REP_TODAY = '2026-11-12'; });
    const page = await ctx.newPage(); await page.goto(BASE); await page.waitForTimeout(1000);
    ok((await nOpen(page)) === 0, w + ': fresh open: nothing expanded');
    const hv = await page.evaluate(() => { const e = document.querySelector('[data-testid=checks-ok],[data-testid=checks-flag]'); return e ? e.textContent : ''; });
    ok(/afford this portfolio|Tight:|Not affordable:/.test(hv), w + ': Health collapsed verdict line: ' + hv.slice(0, 70));
    for (const b of await page.$$('[data-coll][aria-expanded="false"]')) { try { await b.click({ timeout: 800 }); } catch (e) {} }
    ok((await nOpen(page)) > 0, w + ': sections open within the visit');
    await page.evaluate(() => { const o = JSON.parse(localStorage.getItem('rep-v4-ui') || '{}'); o.coll = { more: false, afford: false, checks: false }; o.open = true; localStorage.setItem('rep-v4-ui', JSON.stringify(o)); });
    for (const r of ['#finances', '#assumptions', '#']) { await page.evaluate((h) => { location.hash = h; }, r); await page.waitForTimeout(500); }
    ok((await nOpen(page)) === 0, w + ': switch page and come back: collapsed');
    await page.reload(); await page.waitForTimeout(1000);
    ok((await nOpen(page)) === 0, w + ': reload: collapsed (old saved open state ignored)');
    const ui = await page.evaluate(() => JSON.parse(localStorage.getItem('rep-v4-ui') || '{}'));
    const bad = ['coll', 'open', 'addLoanOpen', 'addMore'].filter((k) => k in ui);
    ok(bad.length === 0, w + ': saved UI state has no open/closed keys' + (bad.length ? ' (' + bad + ')' : ''));
    const raw0 = await page.evaluate(() => localStorage.getItem('rep-v4'));
    ok(!!raw0 && raw0.length > 100, w + ': portfolio data still saved');
    await ctx.close();
  }
  await browser.close(); srv.close(); console.log(fails ? 'DC1 E2E FAILED ' + fails : 'DC1 E2E PASS'); process.exit(fails ? 1 : 0);
})();
