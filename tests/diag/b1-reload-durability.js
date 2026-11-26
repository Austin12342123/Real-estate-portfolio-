/* B1: can a reload right after an edit lose that edit? For each real UI action, N times: do the action, reload after a 0, 50, 100 or 300 ms (cycled), then compare the portfolio the app
   shows after the reload (loaded from the store) with the one it held just before the reload. Exit 1 when any edit is lost.
   NODE_PATH=/opt/node-tools/node_modules node tests/diag/b1-reload-durability.js [N=30] [action] */
const { chromium } = require('playwright'), http = require('http'), fs = require('fs'), path = require('path');
const V4 = path.resolve(__dirname, '../../prototype/v4'), E = require(path.join(V4, 'engine.js'));
const DATA_V = +/const DATA_V = (\d+)/.exec(fs.readFileSync(path.join(V4, 'app.js'), 'utf8'))[1];
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/json' };
const N = +process.argv[2] || 30, ONLY = process.argv[3] || '';
const sig = (pg) => pg.evaluate(() => { const S = window.__app.state; return S.houses.map((h) => h.id + ':' + h.extra + ':' + h.addr).join('|') + '#' + S.p.cash; });
const expand = async (p) => { for (const b of await p.locator('[data-coll]').all()) if ((await b.getAttribute('aria-expanded')) !== 'true') await b.click(); };
const ACTIONS = {
  'type a number': async (p, i) => { await p.goto(p.__B + '/index.html#house-maple'); await p.waitForSelector('#app > *'); await expand(p); const q = '#app input[data-p="h.maple.extra"]'; await p.locator(q).first().click(); await p.keyboard.press('Control+A'); await p.keyboard.insertText(String(1000 + i)); await p.keyboard.press('Enter'); },
  'store write never lands': async (p, i) => { await p.evaluate(() => { const o = IDBObjectStore.prototype.put; IDBObjectStore.prototype.put = function (v) { if (v && v.id === 'current') throw new DOMException('write failed', 'DataError'); return o.apply(this, arguments); }; }); await ACTIONS['type a number'](p, i + 500); }, /* deterministic: the IndexedDB write fails (as when the page is torn down before it commits); the edit must still survive the reload */
  'type 500 characters': async (p, i) => { await p.goto(p.__B + '/index.html#house-maple'); await p.waitForSelector('#app > *'); await expand(p); const q = '#app input[data-p="h.maple.addr"]'; await p.locator(q).first().click(); await p.keyboard.press('Control+A'); await p.keyboard.insertText(('Q' + i).repeat(250)); await p.keyboard.press('Enter'); },
  'add an asset, then edit a field': async (p, i) => { await ACTIONS['add an asset'](p, i); await p.waitForSelector('[data-coll]'); await expand(p); await p.waitForSelector('#app input[data-p$=".rent"]'); const q = p.locator('#app input[data-p$=".rent"]').first(); await q.click(); await p.keyboard.press('Control+A'); await p.keyboard.insertText(String(1500 + i)); await p.keyboard.press('Enter'); },
  'add an asset': async (p) => { await p.goto(p.__B + '/index.html#add'); await p.waitForSelector('[data-testid=confirm-add]'); await p.click('[data-testid=confirm-add]'); },
  'delete an asset': async (p) => { await p.goto(p.__B + '/index.html#'); await p.waitForSelector('[data-row="maple"] [data-testid=row-toggle]'); await p.click('[data-row="maple"] [data-testid=row-toggle]'); await p.click('[data-del="maple"]'); await p.click('[data-del-yes="maple"]'); },
  'restore a backup': async (p) => { const X = E.seedPlan(); X.v = DATA_V; X.houses = X.houses.slice(0, 6); E.normalize(X); await p.goto(p.__B + '/index.html#assumptions'); await p.waitForSelector('[data-coll=backup]'); await p.click('[data-coll=backup]'); await p.click('[data-testid=export]'); await p.fill('#bkin', JSON.stringify(X)); await p.click('[data-restore-text]'); await p.click('[data-import-yes]'); },
};
(async () => {
  const srv = http.createServer((q, rs) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(V4, path.normalize(p)); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); return rs.end(); } rs.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(rs); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const BASE = 'http://127.0.0.1:' + srv.address().port;
  const browser = await chromium.launch(); let anyLost = 0;
  for (const [name, act] of Object.entries(ACTIONS)) {
    if (ONLY && ONLY !== name) continue;
    let lost = 0, err = 0; const lates = [];
    for (let i = 0; i < N; i++) {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' }), p = await ctx.newPage(); p.__B = BASE;
      try {
        await p.goto(BASE + '/index.html'); await p.waitForSelector('#app > *'); await p.waitForTimeout(150); /* booted and the first save done */
        await act(p, i); const before = await sig(p), d = [0, 50, 100, 300][i % 4]; await p.waitForTimeout(d);
        await p.reload(); await p.waitForSelector('#app > *'); await p.waitForTimeout(100);
        const after = await sig(p); if (after !== before) { lost++; lates.push(d); if (process.env.DBG) console.log('   before', before.split('|').length, before.split('|').slice(-2).join('|'), ' after', after.split('|').length, after.split('|').slice(-2).join('|')); }
      } catch (e) { err++; console.log('  error', name, i, String(e.message).split('\n')[0]); }
      await ctx.close();
    }
    anyLost += lost + err; console.log((lost ? 'LOST ' : 'OK   ') + name + ': edit lost in ' + lost + ' of ' + N + ' reloads' + (err ? ', ' + err + ' errors' : '') + (lost ? ' (delays ms: ' + lates.join(',') + ')' : ''));
  }
  await browser.close(); srv.close(); process.exit(anyLost ? 1 : 0);
})();
