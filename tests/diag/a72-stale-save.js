/* Forces the A72 race: a page open on the default plan, storage replaced meanwhile by a 5-asset portfolio, then the page saves (toggle a section).
   Before the fix the page wrote its 36 assets over the 5; after, the stored 5 stay. Exit 1 on failure.
   NODE_PATH=/opt/node-tools/node_modules node tests/diag/a72-stale-save.js */
const { chromium } = require('playwright'), http = require('http'), fs = require('fs'), path = require('path');
const V4 = path.resolve(__dirname, '../../prototype/v4'), E = require(path.join(V4, 'engine.js'));
const DATA_V = +/const DATA_V = (\d+)/.exec(fs.readFileSync(path.join(V4, 'app.js'), 'utf8'))[1];
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/json' };
(async () => {
  const srv = http.createServer((q, rs) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(V4, path.normalize(p)); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); return rs.end(); } rs.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(rs); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const BASE = 'http://127.0.0.1:' + srv.address().port;
  const browser = await chromium.launch(), ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' }), page = await ctx.newPage();
  const S5 = E.seedPlan(); S5.v = DATA_V; S5.houses = S5.houses.slice(0, 5); E.normalize(S5);
  await page.goto(BASE + '/index.html'); await page.waitForSelector('#app > *');
  await page.evaluate(([k, s]) => { localStorage.clear(); localStorage.setItem(k, JSON.stringify(s)); }, ['rep-v4', S5]);
  await page.locator('[data-coll]').first().click(); await page.waitForTimeout(200);
  const n = await page.evaluate(() => JSON.parse(localStorage.getItem('rep-v4')).houses.length);
  console.log(n === 5 ? 'PASS stored portfolio kept (5)' : 'FAIL stored portfolio overwritten, now ' + n);
  /* the line: visible after the skipped save, Reload brings back the stored 5 assets */
  await page.evaluate(() => { location.hash = ''; }); const vis = await page.locator('[data-testid=stale-note]').count();
  console.log(vis === 1 ? 'PASS the line is shown after the skipped save' : 'FAIL the line is missing (' + vis + ')');
  let ok2 = vis === 1; if (vis === 1) { await page.locator('[data-testid=stale-reload]').click(); await page.waitForSelector('#app > *'); await page.waitForTimeout(300); const after = await page.evaluate(() => ({ n: JSON.parse(localStorage.getItem('rep-v4')).houses.length, note: !!document.querySelector('[data-testid=stale-note]') })); ok2 = after.n === 5 && !after.note; console.log(ok2 ? 'PASS Reload shows the stored 5-asset portfolio, no line' : 'FAIL after Reload ' + JSON.stringify(after)); }
  /* storage event: a second tab saves; the first tab shows the line before any edit */
  const p1 = await ctx.newPage(); await p1.goto(BASE + '/index.html'); await p1.waitForSelector('#app > *'); const p2 = await ctx.newPage(); await p2.goto(BASE + '/index.html'); await p2.waitForSelector('#app > *');
  await p2.locator('[data-coll]').first().click(); await p2.evaluate(() => { const k = 'rep-v4', s = JSON.parse(localStorage.getItem(k)); s.houses = s.houses.slice(0, 3); localStorage.setItem(k, JSON.stringify(s)); }); await p1.waitForTimeout(400);
  const ev = await p1.locator('[data-testid=stale-note]').count(); console.log(ev === 1 ? 'PASS storage event shows the line in the other tab' : 'FAIL no line after another tab saved'); 
  /* later edits in the stale tab cannot overwrite; other pages; Reload shows the newer portfolio and the line goes */
  await p1.locator('[data-coll]').first().click().catch(() => {}); await p1.evaluate(() => { const i = document.querySelector('#app input'); if (i) { i.focus(); i.value = '123'; i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); i.blur(); } }); await p1.waitForTimeout(300);
  const kept = await p1.evaluate(() => JSON.parse(localStorage.getItem('rep-v4')).houses.length); console.log(kept === 3 ? 'PASS tab A edits after the line did not overwrite the newer data (3 assets kept)' : 'FAIL newer data overwritten, now ' + kept);
  const where = {}; for (const h of ['#finances', '#assumptions', '#saved', '']) { await p1.evaluate((h) => { location.hash = h; }, h); await p1.waitForTimeout(250); where[h || 'planned'] = await p1.locator('[data-testid=stale-note]').count(); } console.log('INFO line count per page (1 = shown):', JSON.stringify(where));
  await p2.close(); await page.close(); /* B1: only one tab writes (Web Lock); the tab that wrote is closed so the reloaded tab becomes the writer */
  await p1.locator('[data-testid=stale-reload]').click(); await p1.waitForSelector('#app > *'); await p1.waitForTimeout(300);
  const a2 = await p1.evaluate(() => ({ n: JSON.parse(localStorage.getItem('rep-v4')).houses.length, line: !!document.querySelector('[data-testid=stale-note]'), cards: document.querySelectorAll('[data-testid^=asset-],[data-house]').length })); const ok3 = a2.n === 3 && !a2.line; console.log(ok3 ? 'PASS Reload in tab A: newer portfolio (3 assets) loaded, line gone ' + JSON.stringify(a2) : 'FAIL after Reload ' + JSON.stringify(a2));
  await browser.close(); srv.close(); process.exit(n === 5 && ok2 && ev === 1 && kept === 3 && ok3 ? 0 : 1);
})();
