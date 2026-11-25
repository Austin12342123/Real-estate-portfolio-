/* A72 setup repeater: node tests/diag/a72-loop.js [maxRuns=50] [maxFails=3] [--fixed]
   Repeats only A72's setup (store 5 assets, reload, read the fingerprint).
   Logs every Storage read/write/remove/clear (key, asset count, stack, time) into window.__bootLog via an init script (no app change needed). */
const { chromium } = require('playwright'), http = require('http'), fs = require('fs'), path = require('path');
const V4 = path.resolve(__dirname, '../../prototype/v4');
const E = require(path.join(V4, 'engine.js'));
const DATA_V = +/const DATA_V = (\d+)/.exec(fs.readFileSync(path.join(V4, 'app.js'), 'utf8'))[1];
const MAX = +process.argv[2] || 50, MAXF = +process.argv[3] || 3, FIXED = process.argv.includes('--fixed');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/json' };
const LOG = () => {
  window.REP_TODAY = '2026-11-12'; window.__bootLog = []; const t0 = performance.now();
  const n = (v) => { try { const j = JSON.parse(v); return j && j.houses ? j.houses.length : j && j.fp ? 'fp.n=' + j.fp.n : '?'; } catch (e) { return '?'; } };
  const P = Storage.prototype, g = P.getItem, s = P.setItem, r = P.removeItem, c = P.clear;
  const rec = (op, k, v) => { try { const e = ({ t: Math.round(performance.now() - t0), op, k, n: v == null ? null : n(v), stack: (new Error().stack || '').split('\n').slice(3, 6).map((x) => x.trim().replace(/https?:\/\/[^/]+/, '')).join(' | '), url: location.search, wall: Date.now() }); window.__bootLog.push(e); if (window.__sink) window.__sink(JSON.stringify(e)); } catch (e) {} };
  P.getItem = function (k) { const v = g.call(this, k); if (/^rep-v4/.test(k)) rec('get', k, v); return v; };
  P.setItem = function (k, v) { if (/^rep-v4/.test(k)) rec('set', k, v); return s.call(this, k, v); };
  P.removeItem = function (k) { rec('remove', k); return r.call(this, k); };
  P.clear = function () { rec('clear', '*'); return c.call(this); };
};
(async () => {
  const srv = http.createServer((q, rs) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(V4, path.normalize(p)); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); return rs.end(); } rs.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-cache' }); fs.createReadStream(f).pipe(rs); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const BASE = 'http://127.0.0.1:' + srv.address().port;
  const browser = await chromium.launch(); let fails = 0, rn = 0, i = 0;
  const S5 = E.seedPlan(); S5.v = DATA_V; S5.houses = S5.houses.slice(0, 5); E.normalize(S5);
  for (; i < MAX && fails < MAXF; i++) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block', reducedMotion: 'reduce' });
    const ALL = []; await ctx.exposeFunction('__sink', (x) => { ALL.push(JSON.parse(x)); }); await ctx.addInitScript(LOG); const page = await ctx.newPage(); page.setDefaultTimeout(4000);
    if (process.env.PRE) { await page.goto(BASE + '/index.html?r=' + rn++); await page.waitForSelector('#app > *'); await page.waitForTimeout(1200); } /* PRE=1: an earlier check already left a 36-asset default plan and its fingerprint in storage, as in the grader's shared context */
    /* A72's setup as in the grader */
    await page.goto(BASE + '/index.html?r=' + rn++);
    if (process.env.DELAY) await page.waitForTimeout(+process.env.DELAY); /* forces the race: the first page's 500 ms monitor fires before the test seeds storage (on a loaded machine this just happens) */
    await page.evaluate(() => window.__bootLog.push({ op: 'TEST-CLEAR+SET' }));
    await page.evaluate(([k, s]) => { localStorage.clear(); localStorage.setItem(k, JSON.stringify(s)); }, ['rep-v4', S5]);
    await page.goto(BASE + '/index.html?r=' + rn++);
    if (FIXED) await page.waitForFunction(() => { try { const d = JSON.parse(localStorage.getItem('rep-v4-diag')); return d && d.fp && d.fp.n === 5; } catch (e) { return false; } }, null, { timeout: 4000 }).catch(() => {});
    await page.waitForSelector('#app > *'); await page.waitForTimeout(1400);
    const fp = await page.evaluate(() => { try { const d = JSON.parse(localStorage.getItem('rep-v4-diag')); return d && d.fp && d.fp.n; } catch (e) { return null; } });
    const stored = await page.evaluate(() => { try { return JSON.parse(localStorage.getItem('rep-v4')).houses.length; } catch (e) { return null; } });
    if (fp !== 5 || process.env.ALWAYS) { fails++; const log = ALL; fs.writeFileSync(path.join(__dirname, 'fail-' + Date.now() + '.json'), JSON.stringify({ fp, stored, log }, null, 1)); console.log('FAIL run', i, 'fp', fp, 'stored', stored); }
    await ctx.close();
  }
  console.log('runs', i, 'fails', fails); await browser.close(); srv.close();
})();
