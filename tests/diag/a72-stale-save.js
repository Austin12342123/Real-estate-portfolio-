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
  await browser.close(); srv.close(); process.exit(n === 5 ? 0 : 1);
})();
