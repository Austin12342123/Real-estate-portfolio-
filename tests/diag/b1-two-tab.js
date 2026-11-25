/* B1 combined check on the real app: IndexedDB store, stale/second tab banner, and the 3-copy safety ring.
   1. tab A is the writer on IndexedDB; tab B (second tab) is read-only: its edit shows the stale line and writes nothing.
   2. four backup imports in tab A (each is a major change) leave exactly 3 safety copies in IndexedDB, the 3 newest, and the old localStorage key is untouched.
   NODE_PATH=/opt/node-tools/node_modules node tests/diag/b1-two-tab.js   (exit 1 on any FAIL) */
const { chromium } = require('playwright'), http = require('http'), fs = require('fs'), path = require('path');
const V4 = path.resolve(__dirname, '../../prototype/v4'), E = require(path.join(V4, 'engine.js'));
const DATA_V = +/const DATA_V = (\d+)/.exec(fs.readFileSync(path.join(V4, 'app.js'), 'utf8'))[1];
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/json' };
let bad = 0; const t = (ok, m) => { console.log((ok ? 'PASS ' : 'FAIL ') + m); if (!ok) bad++; };
const readDb = (pg) => pg.evaluate(() => new Promise((res) => { const r = indexedDB.open('rep-v4-store'); r.onsuccess = () => { const d = r.result, tx = d.transaction(['portfolio', 'snapshots'], 'readonly'), a = tx.objectStore('portfolio').get('current'), b = tx.objectStore('snapshots').getAll(); tx.oncomplete = () => { d.close(); res({ n: a.result ? a.result.data.assets.length : null, rev: a.result && a.result.rev, snaps: b.result.sort((x, y) => y.seq - x.seq).map((x) => ({ reason: x.reason, kind: x.kind, assets: x.assets })) }); }; }; }));
(async () => {
  const srv = http.createServer((q, rs) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(V4, path.normalize(p)); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); return rs.end(); } rs.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(rs); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const BASE = 'http://127.0.0.1:' + srv.address().port;
  const browser = await chromium.launch(), ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  const S5 = E.seedPlan(); S5.v = DATA_V; S5.houses = S5.houses.slice(0, 5); E.normalize(S5);
  const seed = await ctx.newPage(); await seed.goto(BASE + '/manifest.webmanifest');
  await seed.evaluate(([k, s]) => { localStorage.clear(); localStorage.setItem(k, JSON.stringify(s)); }, ['rep-v4', S5]); const ls0 = await seed.evaluate(() => localStorage.getItem('rep-v4')); await seed.close();
  const A = await ctx.newPage(); await A.goto(BASE + '/index.html'); await A.waitForSelector('#app > *'); await A.waitForTimeout(300);
  const ia = await A.evaluate(() => window.__app.idb); t(ia.mode === 'indexeddb' && ia.writer === true, 'tab A runs on IndexedDB and is the writer ' + JSON.stringify(ia));
  await A.evaluate(() => window.__app.whenSaved()); let db = await readDb(A); t(db.n === 5, 'the 5-asset portfolio was copied to IndexedDB (' + db.n + ')');
  t((await A.evaluate(() => localStorage.getItem('rep-v4'))) === ls0, 'the old localStorage key is untouched');
  const revA = db.rev; /* second tab */
  const B = await ctx.newPage(); await B.goto(BASE + '/index.html'); await B.waitForSelector('#app > *'); await B.waitForTimeout(1900);
  const ib = await B.evaluate(() => window.__app.idb); t(ib.mode === 'indexeddb' && ib.writer === false, 'tab B is read-only (another tab holds the write lock) ' + JSON.stringify(ib));
  await B.locator('[data-coll]').first().click(); await B.waitForTimeout(300);
  t((await B.locator('[data-testid=stale-note]').count()) === 1 && /Close the other tab, then reload\./.test(await B.locator('[data-testid=stale-note]').textContent()), 'tab B (read-only: another tab holds the write lock) shows the line "Close the other tab, then reload." with Reload');
  for (const h of ['#finances', '#assumptions', '#saved', '#order', '']) { await B.evaluate((h) => { location.hash = h; }, h); await B.waitForTimeout(250); t((await B.locator('[data-testid=stale-note]').count()) === 1, 'tab B shows the line on page ' + (h || 'planned')); }
  db = await readDb(A); t(db.n === 5 && db.rev === revA, 'tab B wrote nothing (5 assets, rev ' + db.rev + ' = ' + revA + ')'); const rev1 = db.rev;
  /* tab A saves: tab B (already stale) keeps its line; A's rev moves */
  await A.locator('[data-coll]').first().click(); await A.waitForTimeout(200); await A.evaluate(() => window.__app.whenSaved()); db = await readDb(A); t(db.rev > rev1 && db.n === 5, 'tab A saved normally (rev ' + db.rev + ')');
  await B.close();
  /* four major changes (backup imports) in tab A */
  const ex = async (p) => { await p.evaluate(() => { location.hash = '#assumptions'; }); await p.waitForTimeout(300); const b = p.locator('[data-coll=backup]'); if ((await b.getAttribute('aria-expanded')) !== 'true') { await b.click(); await p.waitForTimeout(80); } await p.click('[data-testid=export]'); return p.inputValue('#bkin'); };
  const sizes = [4, 6, 3, 7];
  for (let i = 0; i < 4; i++) {
    const X = E.seedPlan(); X.v = DATA_V; X.houses = X.houses.slice(0, sizes[i]); E.normalize(X);
    await ex(A); await A.fill('#bkin', JSON.stringify(X)); await A.click('[data-restore-text]'); await A.click('[data-import-yes]'); await A.waitForTimeout(400); await A.evaluate(() => window.__app.whenSaved());
    db = await readDb(A); t(db.snaps.length === Math.min(i + 1, 3), 'after major change ' + (i + 1) + ' there are ' + db.snaps.length + ' copies (want ' + Math.min(i + 1, 3) + ')');
  }
  t(db.snaps.length === 3 && db.snaps.every((s) => s.kind === 'backup import'), 'exactly 3 copies, all filed before a backup import');
  t(JSON.stringify(db.snaps.map((s) => s.assets)) === JSON.stringify([sizes[2], sizes[1], sizes[0]]), 'the 3 newest copies are the portfolios as they were BEFORE changes 4, 3 and 2 (changes 1 was pruned) ' + JSON.stringify(db.snaps.map((s) => s.assets)));
  t((await A.evaluate(() => localStorage.getItem('rep-v4'))) === ls0, 'the old localStorage key is still untouched');
  t((await A.evaluate(() => document.querySelectorAll('[data-testid=safety-item]').length)) <= 3, 'the Safety copies card lists at most 3');
  /* a fresh start (nothing stored anywhere): an edit is stored and survives a reload (regression: the first save threw because there was no meta yet) */
  const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' }), F = await ctx2.newPage();
  await F.goto(BASE + '/index.html#house-maple'); await F.waitForSelector('#app > *'); for (const b of await F.locator('[data-coll]').all()) if ((await b.getAttribute('aria-expanded')) !== 'true') await b.click();
  await F.locator('#app input[data-p="h.maple.extra"]').first().click(); await F.keyboard.press('Control+A'); await F.keyboard.insertText('1234'); await F.keyboard.press('Enter'); await F.evaluate(() => window.__app.whenSaved());
  await F.reload(); await F.waitForSelector('#app > *'); t((await F.evaluate(() => window.__app.state.houses.find((h) => h.id === 'maple').extra)) === 1234, 'fresh start: an edit is stored in IndexedDB and survives a reload');
  await browser.close(); srv.close(); process.exit(bad ? 1 : 0);
})();
