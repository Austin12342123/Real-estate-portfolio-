/* Shared page-boot helper for the graders (fix for the load race, agents/plans/diag-g6.md).
   OLD pattern (every load() helper): goto(app) with empty storage -> write the sample into localStorage while that app instance is ALIVE -> goto(app) again.
   The first app instance boots the default plan; its own saves (the AUTO_EXPAND observer clicking collapsed sections, pagehide/diag writes) can land after the grader's
   write and overwrite the sample with the default plan, so the test then runs on the wrong portfolio (G6 36 houses instead of 14).
   NEW pattern: write storage from a same-origin page that does NOT run the app (/manifest.webmanifest), then navigate to the app once.
   GUARD: after the boot, when the sample is a current-version save (v === DATA_V) every sample house id must be in the app's state, else throw. */
let n = 0;
const FILE = '/manifest.webmanifest';
async function guard(page, S, DATA_V) {
  if (!S || typeof S !== 'object' || !Array.isArray(S.houses) || !S.houses.length || S.v !== DATA_V) return;
  const want = S.houses.map((h) => h && h.id).filter((x) => typeof x === 'string');
  if (!want.length) return;
  await page.waitForFunction(() => window.__app && window.__app.state, null, { timeout: 4000 });
  const have = await page.evaluate(() => window.__app.state.houses.map((h) => h.id));
  const miss = want.filter((id) => have.indexOf(id) < 0);
  if (miss.length) throw new Error('app booted from a different portfolio: expected ' + want.length + ' houses, app has ' + have.length + ' (missing ' + miss.slice(0, 5).join(',') + (miss.length > 5 ? ',...' : '') + ')');
}
/* o: { base, tag, write: [fn, args] (runs on the file page), S, DATA_V, hash, ready (default '#app > *') } */
/* B1: the portfolio now lives in IndexedDB ('rep-v4-store'); clearing site data clears it too, so a test that seeds a portfolio through localStorage first removes the database (the app then migrates / adopts the seed at its next start) */
const wipeIdb = (page) => page.evaluate(() => new Promise((r) => { try { const q = indexedDB.deleteDatabase('rep-v4-store'); q.onsuccess = q.onerror = q.onblocked = () => r(); } catch (e) { r(); } }));
/* the portfolio as the app stored it (legacy shape), read from IndexedDB after the app's own save finished; falls back to localStorage when the app runs without IndexedDB */
const stored = async (page) => { try { await page.evaluate(() => (window.__app && window.__app.whenSaved ? window.__app.whenSaved() : null)); } catch (e) {} return page.evaluate(() => new Promise((res) => { const ls = () => { try { return JSON.parse(localStorage.getItem('rep-v4')); } catch (e) { return null; } }; if (!window.RepData || !window.__app || !window.__app.idb || window.__app.idb.mode !== 'indexeddb') return res(ls()); const r = indexedDB.open('rep-v4-store'); r.onerror = () => res(ls()); r.onsuccess = () => { const d = r.result, g = d.transaction('portfolio', 'readonly').objectStore('portfolio').get('current'); g.onsuccess = () => { d.close(); try { res(g.result ? window.RepData.fromV22(g.result.data) : null); } catch (e) { res(null); } }; }; })); };
async function boot(page, o) {
  const t = o.tag || 'b';
  await page.goto(o.base + FILE + '?' + t + '=' + n++);
  await wipeIdb(page);
  await page.evaluate(o.write[0], o.write[1]);
  await page.goto(o.base + '/index.html?' + t + '=' + n++ + (o.hash || ''));
  await page.waitForSelector(o.ready || '#app > *');
  await guard(page, o.S, o.DATA_V);
}
/* the writer most graders use: clear, then set the portfolio under key k */
const writeS = ([k, s]) => { try { localStorage.clear(); if (s) localStorage.setItem(k, JSON.stringify(s)); } catch (e) {} };
/* The OLD helper, kept verbatim in behaviour for the regression self-test only (never use it in a grader). */
async function oldLoad(page, o) {
  const t = o.tag || 'b';
  await page.goto(o.base + '/index.html?' + t + '=' + n++);
  await page.evaluate(o.write[0], o.write[1]);
  await page.goto(o.base + '/index.html?' + t + '=' + n++ + (o.hash || ''));
  await page.waitForSelector(o.ready || '#app > *');
}
/* Regression self-test: `runs` times, in a FRESH context (cold caches, so the first app instance renders slowly like in a busy full run) with a 4x CPU throttle, load the sample
   and count the loads whose app state lacks a sample house. `mk()` returns { ctx, page } (a context WITH the AUTO_EXPAND observer, i.e. mkCtx()/mkPage()); `load` is boot or oldLoad.
   Returns { runs, mismatches, detail }. */
async function raceSelfTest(mk, o, load, runs = 30, rate = 4) {
  let bad = 0; const detail = [];
  for (let i = 0; i < runs; i++) {
    const { ctx, page } = await mk();
    try {
      const cdp = await ctx.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate });
      await load(page, o);
      const want = o.S.houses.map((h) => h.id);
      await page.waitForFunction(() => window.__app && window.__app.state, null, { timeout: 8000 });
      const have = await page.evaluate(() => window.__app.state.houses.map((h) => h.id));
      if (want.some((id) => have.indexOf(id) < 0)) { bad++; if (detail.length < 5) detail.push('run ' + i + ': app has ' + have.length + ' houses, sample has ' + want.length); }
    } finally { try { await ctx.close(); } catch (e) {} }
  }
  return { runs, mismatches: bad, detail: detail.join('; ') };
}
module.exports = { boot, guard, writeS, oldLoad, raceSelfTest, wipeIdb, stored };
