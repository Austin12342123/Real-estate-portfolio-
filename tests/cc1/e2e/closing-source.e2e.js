/* CC1b e2e: node tests/cc1/e2e/closing-source.e2e.js <v4 dir> <screenshot dir> [expect=pass|red]
   Checks the Closing costs source label, Reset to auto and the Assumptions note at 393 and 1280 px. Serves the v4 dir itself. */
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const [dir, shots] = [process.argv[2], process.argv[3]];
const E = require(path.join(dir, 'engine.js'));
fs.mkdirSync(shots, { recursive: true });
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webmanifest': 'application/json', '.png': 'image/png' };
const srv = http.createServer((q, r) => { let p = path.join(dir, q.url.split('?')[0].replace(/\/$/, '/index.html')); fs.readFile(p, (e, b) => { if (e) { r.statusCode = 404; r.end(); } else { r.setHeader('content-type', mime[path.extname(p)] || 'application/octet-stream'); r.end(b); } }); });
const mk = () => {
  const S = { v: 21, g: Object.assign({}, E.GDEF, { closing: 2 }), p: E.samplePersonal(), orderV: 2, added: E.ADDITIONS.map((a) => a.key),
    houses: [E.newAsset('house', 'k203', { id: 'ka', addr: 'Loan Home', price: 200000, rent: 2400 }), E.newAsset('house', 'custom', { id: 'nl', addr: 'No Loan Home', price: 200000, rent: 2400, closingPct: null }),
      Object.assign(E.newAsset('house', 'conv30', { id: 'ty', addr: 'Typed Home', price: 200000, rent: 2400 }), { closingPct: 1 })] };
  return S;
};
(async () => {
  await new Promise((r) => srv.listen(0, r)); const base = 'http://127.0.0.1:' + srv.address().port;
  const b = await chromium.launch({ headless: true, args: ['--no-sandbox'] }); let fails = 0;
  const t = (ok, m) => { console.log((ok ? 'PASS ' : 'FAIL ') + m); if (!ok) fails++; };
  for (const w of [393, 1280]) {
    const page = await (await b.newContext({ viewport: { width: w, height: 900 } })).newPage();
    await page.goto(base + '/manifest.webmanifest');
    await page.evaluate((s) => { localStorage.clear(); localStorage.setItem('rep-v4', JSON.stringify(s)); }, mk());
    await page.goto(base + '/index.html'); await page.waitForSelector('[data-testid=ledger-row]');
    const note = async (id) => {
      await page.evaluate((i) => { location.hash = '#house-' + i; }, id); await page.waitForTimeout(300);
      for (let k = 0; k < 8 && !(await page.$('[data-testid=closing-note]')); k++) { const c = page.locator('[data-coll][aria-expanded=false]').first(); if (!(await c.count())) break; await c.click().catch(() => {}); await page.waitForTimeout(150); }
      return page.locator('[data-testid=closing-note]').first().textContent({ timeout: 1500 }).catch(() => '');
    };
    const n1 = await note('ka'); t(/^From the loan: 5% \(FHA 203\(k\)/.test(n1), w + ' loan home: ' + n1);
    await page.locator('[data-testid=closing-note]').scrollIntoViewIfNeeded().catch(() => {});
    await page.screenshot({ path: path.join(shots, `loan-${w}.png`) });
    const n2 = await note('nl'); t(/^Portfolio setting: 2%/.test(n2), w + ' no-loan home: ' + n2);
    const n3 = await note('ty'); t(/^You set this: 1%/.test(n3), w + ' typed home: ' + n3);
    await page.locator('[data-testid=closing-note]').scrollIntoViewIfNeeded().catch(() => {});
    await page.screenshot({ path: path.join(shots, `typed-${w}.png`) });
    await page.click('[data-testid=closing-reset]', { timeout: 3000 }).catch((e) => console.log('CLICKERR ' + String(e).slice(0, 300)));
    await page.waitForTimeout(400); const st = await page.locator('[data-testid=closing-note]').first().textContent({ timeout: 1500 }).catch(() => ''); /* storage may be IndexedDB, so read the result from the screen */
    t(/^From the loan: 3%/.test(st), w + ' Reset to auto on a loan home goes back to the loan preset 3 (got ' + st + ')');
    await page.evaluate(() => { location.hash = '#assumptions'; }); await page.waitForTimeout(300);
    const g = await page.locator('[data-testid=closing-g-note]').first().textContent({ timeout: 3000 }).catch(() => '');
    t(/^Used by homes with no loan picked \(1 use it\)/.test(g), w + ' Assumptions note: ' + g.slice(0, 70));
    await page.screenshot({ path: path.join(shots, `assumptions-${w}.png`) });
    await page.close();
  }
  await b.close(); srv.close(); console.log(fails ? 'E2E FAILED ' + fails : 'E2E OK'); process.exit(fails ? 1 : 0);
})();
