/* Standalone RED/GREEN demo of the load race (agents/plans/diag-g6.md). Usage: node boot-selftest.js [old|new|both] [runs]
   old = the pre-fix helper (boot the app, write storage while it is alive, boot again); new = boot.js boot(). Exit 1 when the chosen mode shows mismatches.
   The context has the grader's AUTO_EXPAND observer (copied from grade.js) and a 4x CPU throttle. Never modifies the app. */
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const BOOT = require('./boot.js');
const V4 = path.resolve(__dirname, '../v4'), E = require(path.join(V4, 'engine.js'));
const DATA_V = +((/const DATA_V = (\d+)/.exec(fs.readFileSync(path.join(V4, 'app.js'), 'utf8')) || [0, 0])[1]);
const AUTO_EXPAND = () => {
  const open = () => { try { const b = [...document.querySelectorAll('#app [data-coll][aria-expanded=false]')].filter((e) => e.dataset.coll !== 'drivers' && e.dataset.coll !== 'tgt')[0]; if (b && !window.__noExpand) b.click(); } catch (e) {} };
  let q = false; const go = () => { if (q) return; q = true; setTimeout(() => { q = false; open(); }, 0); };
  const start = () => { const a = document.getElementById('app'); if (!a) return setTimeout(start, 5); new MutationObserver(go).observe(a, { childList: true, subtree: true }); go(); };
  start();
};
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
(async () => {
  const mode = process.argv[2] || 'both', runs = +(process.argv[3] || 30);
  const srv = http.createServer((q, r) => { const p = path.join(V4, decodeURIComponent(q.url.split('?')[0]).replace(/^\/$/, '/index.html')); fs.readFile(p, (e, d) => { if (e) { r.statusCode = 404; return r.end(); } r.setHeader('content-type', TYPES[path.extname(p)] || 'application/octet-stream'); r.end(d); }); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const base = 'http://127.0.0.1:' + srv.address().port;
  const browser = await chromium.launch(); let fail = 0;
  const S = Object.assign(JSON.parse(JSON.stringify(E.seed())), { v: DATA_V });
  const mk = async () => { const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block', reducedMotion: 'reduce' });
    await ctx.addInitScript(() => { window.REP_TODAY = '2026-11-12'; }); await ctx.addInitScript(AUTO_EXPAND); return { ctx, page: await ctx.newPage() }; };
  for (const m of mode === 'both' ? ['old', 'new'] : [mode]) {
    const o = { base, tag: 't', S, DATA_V, write: [BOOT.writeS, ['rep-v4', S]] };
    const r = await BOOT.raceSelfTest(mk, o, m === 'old' ? BOOT.oldLoad : BOOT.boot, runs, 4);
    console.log(`${m === 'old' ? 'OLD helper' : 'NEW helper'}: ${r.mismatches} of ${r.runs} loads started from a different portfolio ${r.detail}`);
    if (r.mismatches) fail = 1;
  }
  await browser.close(); srv.close(); process.exit(fail);
})().catch((e) => { console.error(e); process.exit(2); });
