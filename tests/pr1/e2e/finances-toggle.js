/* PR1 e2e: Finances Planned / Real toggle. Run: NODE_PATH=/opt/node-tools/node_modules PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node tests/pr1/e2e/finances-toggle.js [shotDir]
   Serves prototype/v4 itself (read-only). Checks at 393 and 1280 px: toggle switches the figures, persists after reload, nothing-owned shows the empty card. */
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const V4 = path.resolve(__dirname, '../../../prototype/v4');
const E = require(path.join(V4, 'engine.js'));
const DATA_V = +/const DATA_V = (\d+)/.exec(fs.readFileSync(path.join(V4, 'app.js'), 'utf8'))[1];
const SHOTS = process.argv[2];
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => {
  const f = path.join(V4, path.normalize(decodeURIComponent(q.url.split('?')[0])).replace(/^(\.\.[\/\\])+/, ''));
  if (!f.startsWith(V4) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end('nf'); }
  r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-cache' }); fs.createReadStream(f).pipe(r);
});
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
function portfolio(ownedCount) {
  const S = E.seedPlan(); if (!S.p) S.p = E.samplePersonal();
  S.houses.forEach((h, i) => { h.status = i < ownedCount ? 'owned' : 'planned'; });
  S.v = DATA_V; return S;
}
(async () => {
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + srv.address().port;
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  for (const [w, h] of [[393, 852], [1280, 900]]) for (const scheme of ['light', 'dark']) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: scheme });
    const page = await ctx.newPage();
    const errs = []; page.on('pageerror', (e) => errs.push(String(e)));
    const boot = async (S) => {
      await page.goto(base + '/manifest.webmanifest?x=' + Math.random());
      await page.evaluate(([k, s]) => { localStorage.clear(); localStorage.setItem(k, JSON.stringify(s)); }, ['rep-v4', S]);
      await page.goto(base + '/index.html?y=' + Math.random() + '#finances');
      await page.waitForSelector('[data-testid=fin-view]');
    };
    const tag = w + ' ' + scheme + ': ';
    const num = async () => (await page.locator('[data-testid=lowest-cash]').innerText()) + ' / ' + (await page.locator('[data-testid=monthly-picture]').innerText()).replace(/\s+/g, ' ') + ' / ' + (await page.locator('[data-testid=sync-cf]').innerText());
    const S = portfolio(2);
    const nPlanned = S.houses.filter((x) => x.status === 'planned').length;
    ok(nPlanned > 0, tag + 'fixture has planned assets (' + nPlanned + ')');
    await boot(S);
    ok(await page.locator('[data-testid=finview-plan].on').count() === 1, tag + 'default is Planned');
    const planned = await num();
    const sizes = await page.locator('[data-testid=fin-view] button').evaluateAll((bs) => bs.map((b) => b.getBoundingClientRect().height));
    ok(sizes.every((s) => s >= 44) && (await page.locator('[data-testid=fin-view]').getAttribute('role')) === 'radiogroup', tag + 'radiogroup, targets >= 44px');
    if (SHOTS && scheme) await page.screenshot({ path: `${SHOTS}/fin-planned-${w}-${scheme}.png` });
    await page.click('[data-testid=finview-real]');
    const real = await num();
    ok(real !== planned, tag + 'figures change (Planned ' + planned + ' vs Real ' + real + ')');
    ok((await page.locator('[data-testid=fin-view-note]').innerText()).includes('Only what you own'), tag + 'note says Real');
    ok(await page.locator('[data-testid=finview-real]').getAttribute('aria-checked') === 'true', tag + 'Real aria-checked');
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/fin-real-${w}-${scheme}.png` });
    await page.reload(); await page.waitForSelector('[data-testid=fin-view]');
    ok(await page.locator('[data-testid=finview-real].on').count() === 1 && (await num()) === real, tag + 'Real persists after reload');
    const ui = await page.evaluate(() => JSON.parse(localStorage.getItem('rep-v4-ui') || '{}'));
    ok(ui.finView === 'real', tag + 'saved in UI storage (finView)');
    const st = JSON.parse(await page.evaluate(() => localStorage.getItem('rep-v4')));
    ok(st.houses.length === S.houses.length && st.houses.filter((x) => x.status === 'planned').length === nPlanned, tag + 'portfolio data untouched');
    await page.click('[data-testid=finview-plan]');
    ok((await num()) === planned, tag + 'back to Planned gives the same figures');
    /* nothing owned */
    await boot(portfolio(0));
    await page.click('[data-testid=finview-real]');
    ok(await page.locator('[data-testid=real-empty]').count() === 1 && await page.locator('[data-testid=add-owned]').count() === 1 && (await page.locator('[data-testid=bought-empty]').innerText()) === 'Nothing bought yet', tag + 'nothing owned: empty card with + Add owned');
    ok(await page.locator('[data-testid=lowest-cash]').count() === 0, tag + 'no figures with nothing owned');
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/fin-empty-${w}-${scheme}.png` });
    await page.click('[data-testid=add-owned]');
    await page.waitForTimeout(300);
    ok(errs.length === 0, tag + 'no page errors ' + errs.join('|'));
    await ctx.close();
  }
  await browser.close(); srv.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
