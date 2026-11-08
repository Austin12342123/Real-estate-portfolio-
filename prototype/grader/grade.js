#!/usr/bin/env node
/* Automated prototype grader (85 pts). Run:  NODE_PATH=$(npm root -g) node grade.js
   Serves ../v3 on a free localhost port, drives it with Playwright/Chromium, unit-tests engine.js in node.
   Writes report.md + result.json next to this file. Never modifies the app. */
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const { spawnSync } = require('child_process');
const { chromium } = require('playwright');

const V3 = path.resolve(__dirname, '../v3');
const E = require(path.join(V3, 'engine.js'));
const results = [];
const cats = { A: 'Requirement / propagation', B: 'Engine correctness', C: 'UX conciseness & usability', D: 'PWA / local-first', E: 'Robustness & accessibility' };
const CATMAX = { A: 30, B: 20, C: 15, D: 10, E: 10 };

/* ---------------------------------------------------------------- helpers */
class Parts {
  constructor() { this.items = []; }
  t(ok, label, w = 1, info) { this.items.push({ ok: !!ok, label, w, info }); return !!ok; }
  get ratio() { const tw = this.items.reduce((s, i) => s + i.w, 0); return tw ? this.items.reduce((s, i) => s + (i.ok ? i.w : 0), 0) / tw : 0; }
  get detail() {
    const bad = this.items.filter((i) => !i.ok);
    const ok = this.items.length - bad.length;
    return `${ok}/${this.items.length} sub-checks pass` + (bad.length ? '. FAIL: ' + bad.map((i) => i.label + (i.info !== undefined ? ' [' + i.info + ']' : '')).join('; ') : '');
  }
}
async function check(id, cat, name, points, repro, fn) {
  let r;
  try { r = await fn(); } catch (e) { r = { ratio: 0, detail: 'CRASH in check: ' + (e && e.message || e) }; }
  if (r instanceof Parts) r = { ratio: r.ratio, detail: r.detail };
  if (typeof r === 'boolean') r = { ratio: r ? 1 : 0, detail: r ? 'ok' : 'failed' };
  const ratio = Math.max(0, Math.min(1, r.ratio));
  const rec = { id, category: cat, name, points, earned: Math.round(points * ratio * 100) / 100, detail: r.detail || '', repro };
  results.push(rec);
  console.log(`  [${rec.earned.toFixed(2)}/${points}] ${id} ${name}${ratio < 1 ? '  <-- ' + String(rec.detail).slice(0, 160) : ''}`);
}
const money = (s) => { if (s == null) return NaN; const m = /([−\-+])?\s*\$?\s*([\d,]+(?:\.\d+)?)/.exec(String(s)); if (!m) return NaN; const v = parseFloat(m[2].replace(/,/g, '')); return m[1] === '−' || m[1] === '-' ? -v : v; };
const months = (s) => { s = String(s || ''); if (/never|unfunded|not reach/i.test(s)) return Infinity; if (/\bnow\b/.test(s)) return 0; let m = /(\d+)y\s*(\d+)m/.exec(s); if (m) return +m[1] * 12 + +m[2]; m = /(\d+)\s*mo/.exec(s); if (m) return +m[1]; return NaN; };
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const BAD = /(^|[^A-Za-z])(NaN|-?Infinity|undefined|\[object)([^A-Za-z]|$)/;
const pmt = E.pmt;

/* ---------------------------------------------------------------- static server */
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.json': 'application/json', '.svg': 'image/svg+xml' };
function startServer() {
  return new Promise((res) => {
    const srv = http.createServer((q, r) => {
      let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
      const f = path.join(V3, path.normalize(p).replace(/^(\.\.[\/\\])+/, ''));
      if (!f.startsWith(V3) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end('nf'); }
      r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-cache' }); fs.createReadStream(f).pipe(r);
    });
    srv.listen(0, '127.0.0.1', () => res({ srv, port: srv.address().port }));
  });
}

/* ---------------------------------------------------------------- browser plumbing */
let BASE, browser;
const collect = { errors: [], requests: [], paused: false };
const INIT = () => {
  window.__persist = 0; window.__cls = 0;
  try { const o = navigator.storage && navigator.storage.persist; if (o) navigator.storage.persist = function () { window.__persist++; return o.apply(this, arguments); }; } catch (e) {}
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); } catch (e) {}
};
async function mkCtx(o = {}) {
  const ctx = await browser.newContext(Object.assign({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, serviceWorkers: 'block', acceptDownloads: true, reducedMotion: 'reduce' }, o));
  await ctx.addInitScript(INIT);
  ctx.on('request', (r) => collect.requests.push(r.url()));
  return ctx;
}
let pageSeq = 0;
async function mkPage(ctx, label) {
  const page = await ctx.newPage(); page.setDefaultTimeout(4000); page.__d = []; const tag = label || 'p' + pageSeq++;
  page.on('console', (m) => { if (m.type() === 'error' && !collect.paused) collect.errors.push(`[${tag}] console: ${m.text()}`); });
  page.on('pageerror', (e) => collect.errors.push(`[${tag}] pageerror: ${e.message}`));
  page.on('dialog', (d) => { page.__d.push(d.message()); d.accept().catch(() => {}); });
  return page;
}
let rn = 0;
async function reset(page, hash) {
  await page.goto(BASE + '/index.html?r=' + rn++);
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await page.goto(BASE + '/index.html?r=' + rn++ + (hash || ''));
  await page.waitForSelector('#app > *');
}
async function goHash(page, h) {
  await page.evaluate((h) => { if (location.hash !== h) location.hash = h; else window.dispatchEvent(new Event('hashchange')); }, h);
  await page.waitForTimeout(60);
}
const goMain = async (page) => { await goHash(page, '#/'); await page.waitForSelector('[data-testid=summary],.empty'); };
/* Set a field like a user finishing an edit: native value set + 'input' event, then blur. (page.fill is avoided because the app
   re-renders in a tight loop while an input is focused in Chromium, which detaches the element under Playwright - see check E08.) */
async function setVal(page, sel, val) {
  await page.waitForSelector(sel);
  await page.evaluate(([sel, val]) => { const el = document.querySelector(sel); el.focus(); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, val); el.dispatchEvent(new Event('input', { bubbles: true })); if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); }, [sel, String(val)]);
  await page.waitForTimeout(60);
}
async function edit(page, p, val) {
  const route = p.startsWith('g.') ? '#/settings' : '#/h/' + p.split('.')[1];
  await goHash(page, route);
  await setVal(page, `[data-p="${p}"]`, val);
}
const store = (page) => page.evaluate(() => { try { const j = JSON.parse(localStorage.getItem('rep-v3')); if (j) return j; } catch (e) {} try { return JSON.parse(JSON.stringify(window.__app.state)); } catch (e) { return null; } });
async function snap(page) {
  await goMain(page);
  const d = await page.evaluate(() => {
    const txt = (s) => { const e = document.querySelector(s); return e ? e.textContent.trim() : null; };
    const rows = [...document.querySelectorAll('[data-testid=ledger-row]')].map((r) => { const loc = r.querySelector('[data-testid=loc-line]'), st = r.querySelector('[data-testid=afford-status]'), inp = r.querySelector('input');
      return { id: (r.dataset.go || '').replace('h/', ''), addr: (r.querySelector('.addr') || {}).textContent, tag: (r.querySelector('.tag') || {}).textContent, pay: (r.querySelector('[data-testid=row-payment]') || {}).textContent,
        extra: inp ? inp.value : null, loc: loc && loc.firstChild ? loc.firstChild.textContent.trim() : null, st: st ? st.textContent.trim() : null, stCls: st ? st.className : null }; });
    const plan = {}; document.querySelectorAll('[data-testid=plan-card] tbody tr').forEach((tr) => { const c = [...tr.children].map((x) => x.textContent.trim()); plan[c[0]] = c.slice(1); });
    const pn = document.querySelector('[data-testid=plan-card] .note');
    return { nw: txt('[data-testid=kpi-networth]'), mon: txt('[data-testid=kpi-monthly]'), cf: txt('[data-testid=kpi-cashflow]'), dscr: txt('[data-testid=kpi-dscr]'), totX: txt('[data-testid=total-extra]'),
      rows, plan, planNote: pn ? pn.textContent.trim() : '', body: document.getElementById('app').innerText, inputs: [...document.querySelectorAll('#app input')].map((i) => i.value) };
  });
  const s = { raw: d, nw: money(d.nw), mon: money(d.mon), cf: money(d.cf), dscr: parseFloat(d.dscr), totX: money(d.totX), rows: d.rows, body: d.body, planNote: d.planNote };
  const pl = d.plan || {};
  s.nwF = money((pl['Net worth'] || [])[1]); s.monF = money((pl['Monthly payments'] || [])[1]); s.cfF = money((pl['Cash flow / mo'] || [])[1]);
  s.debtF = money((pl['Debt'] || [])[1]); s.housesF = money((pl['Houses'] || [])[1]); s.housesT = money((pl['Houses'] || [])[0]);
  const m = /(\d+) of (\d+) houses by (.*)/.exec(d.planNote); s.sched = m ? { done: +m[1], n: +m[2], by: m[3] } : null;
  s.rows.forEach((r) => { r.payN = money(r.pay); r.exN = money(r.extra); r.buy = /owned/.test(r.tag || '') ? 0 : months(r.tag); });
  s.row = (id) => s.rows.find((r) => r.id === id);
  return s;
}
const scanBad = async (page) => {
  const out = [];
  for (const h of ['#/', '#/h/oak', '#/h/elm', '#/settings']) {
    await goHash(page, h);
    const t = await page.evaluate(() => { const a = document.getElementById('app'); return a.innerText + ' ' + [...a.querySelectorAll('input')].map((i) => i.value).join(' | ') + ' ' + document.title; });
    if (BAD.test(t)) out.push(h + ': ' + (BAD.exec(t) || [])[2] + ' near "' + t.slice(Math.max(0, t.search(BAD) - 40), t.search(BAD) + 40).replace(/\s+/g, ' ') + '"');
  }
  return out;
};

/* ================================================================ B: ENGINE (node) */
function mk(g, houses) { return { g: Object.assign({}, E.GDEF, { closing: 0, appr: 0, cap: 85, haircut: 0 }, g || {}), houses: houses.map((h) => E.newHouse(h)) }; }
const SRC = { id: 'a', addr: 'A', status: 'owned', price: 300000, dp: 20, rate: 6.5, term: 360, extra: 0, paid: 0, rent: 2000, tax: 0, ins: 0, target: 'b' };
const TGT = { id: 'b', addr: 'B', status: 'planned', price: 300000, dp: 20, rate: 6.5, term: 360, rent: 2000, tax: 0, ins: 0, target: '' };
function simLoc(g, h, t, X) {
  const L = h.price * (1 - h.dp / 100), i = h.rate / 1200, P = i ? L * i / (1 - Math.pow(1 + i, -h.term)) : L / h.term, k0 = h.status === 'owned' ? (h.paid || 0) : 0;
  let bal = L; for (let m = 0; m < k0; m++) bal = bal * (1 + i) - P; bal = Math.max(0, bal);
  const D = t.price * (t.dp / 100 + g.closing / 100);
  for (let k = 0; k <= 600; k++) { const val = h.price * Math.pow(1 + g.appr / 100, (k0 + k) / 12); const head = Math.max(0, g.cap / 100 * val - bal - (h.liens || 0)) * (1 - g.haircut / 100); if (head >= D) return k; bal = Math.max(0, bal * (1 + i) - (P + X)); }
  return Infinity;
}
function simBal(h, X, k) { const L = h.price * (1 - h.dp / 100), i = h.rate / 1200, P = i ? L * i / (1 - Math.pow(1 + i, -h.term)) : L / h.term; let b = L; const k0 = h.status === 'owned' ? h.paid || 0 : 0; for (let m = 0; m < k0; m++) b = b * (1 + i) - P; for (let m = 0; m < k; m++) b = Math.max(0, b * (1 + i) - P - X); return Math.max(0, b); }
let seedR = 12345; const rnd = () => ((seedR = (seedR * 1664525 + 1013904223) % 4294967296) / 4294967296);

async function engineChecks() {
  console.log('B. Engine');
  const S0 = mk({}, [Object.assign({}, SRC, { status: 'planned', buyIn: 0, target: '' })]);
  await check('B01', 'B', 'P&I for 240k @6.5% 30y = 1516.96', 1, 'node: Engine.view(S,h).P', () => { const v = E.view(S0, S0.houses[0]); return { ratio: near(v.P, 1516.96, 0.01) ? 1 : 0, detail: 'got ' + v.P }; });
  await check('B02', 'B', 'Scheduled balance after 60 mo = 224666.35', 1, 'owned paid=60 -> Engine.balToday; and plan series debt[60]', () => {
    const o = mk({}, [Object.assign({}, SRC, { paid: 60, target: '' })]); const a = E.balToday(o.houses[0]);
    const p = E.plan(mk({}, [Object.assign({}, SRC, { status: 'planned', buyIn: 0, target: '' })])).series.debt[60];
    const P = new Parts(); P.t(near(a, 224666.35, 0.05), 'balToday(paid 60)', 1, a); P.t(near(p, 224666.35, 0.05), 'plan series debt[60]', 1, p); return P; });
  await check('B03', 'B', 'Balance after 60 mo with +500 extra = 189329.36', 1, 'plan series debt[60] with extra 500', () => {
    const p = E.plan(mk({}, [Object.assign({}, SRC, { status: 'planned', buyIn: 0, target: '', extra: 500 })])).series.debt[60]; return { ratio: near(p, 189329.36, 0.05) ? 1 : 0, detail: 'got ' + p }; });
  await check('B04', 'B', 'Payoff months with +500 extra = 192', 1, 'Engine.payoffN(h,500)', () => { const v = E.payoffN(S0.houses[0], 500); return { ratio: v === 192 ? 1 : 0, detail: 'got ' + v + ' (scheduled: ' + E.payoffN(S0.houses[0], 0) + ')' }; });
  const chain = (g, X, extra) => mk(g, [Object.assign({}, SRC, { extra: X }, extra || {}), TGT]);
  await check('B05', 'B', 'LOC months (D=60k) extra 0/500/1000 = 140/55/34', 2, 'Engine.locMonths', () => {
    const P = new Parts(); [[0, 140], [500, 55], [1000, 34]].forEach(([x, e]) => { const S = chain({}, x); const g = E.locMonths(S, S.houses[0], x); P.t(g === e, 'extra ' + x, 1, 'got ' + g + ' want ' + e); }); return P; });
  await check('B06', 'B', 'extraFor 24 mo = 1543.87, 36 mo = 918.49', 2, 'Engine.extraFor(S,h,24|36)', () => {
    const S = chain({}, 0), P = new Parts(); [[24, 1543.87], [36, 918.49]].forEach(([m, e]) => { const g = E.extraFor(S, S.houses[0], m); P.t(g != null && near(g, e, 0.05), 'months ' + m, 1, 'got ' + g + ' want ' + e); });
    const sol = E.extraFor(S, S.houses[0], 24); if (sol != null) P.t(simLoc(S.g, S.houses[0], S.houses[1], sol + 0.5) <= 24 && simLoc(S.g, S.houses[0], S.houses[1], sol - 3) > 24, 'independent simulation confirms minimality', 1);
    return P; });
  await check('B07', 'B', 'Appreciation 3%: LOC months extra 0/500 = 50/32', 1.5, 'Engine.locMonths with g.appr=3', () => {
    const P = new Parts(); [[0, 50], [500, 32]].forEach(([x, e]) => { const S = chain({ appr: 3 }, x); const g = E.locMonths(S, S.houses[0], x); P.t(g === e, 'extra ' + x, 1, 'got ' + g + ' want ' + e); }); return P; });
  await check('B08', 'B', 'More extra never delays LOC (monotone, 0..3000 step 50)', 1, 'loop Engine.locMonths over X', () => {
    const P = new Parts(); const S = E.seed(); let prev = Infinity, okm = true, bad = ''; for (let x = 0; x <= 3000; x += 50) { const m = E.locMonths(S, S.houses[0], x); if (m > prev) { okm = false; bad = 'x=' + x + ' ' + m + '>' + prev; } prev = m; }
    P.t(okm, 'seed house oak monotone', 1, bad);
    const S2 = chain({ appr: 3, haircut: 10 }, 0, { liens: 20000 }); prev = Infinity; okm = true; for (let x = 0; x <= 3000; x += 50) { const m = E.locMonths(S2, S2.houses[0], x); if (m > prev) okm = false; prev = m; } P.t(okm, 'with liens/haircut/appr', 1); return P; });
  await check('B09', 'B', 'Purchase order respects chain (A->B->C->D, LOC month additive)', 1.5, 'Engine.plan on 4-house chain', () => {
    const hs = [Object.assign({}, SRC, { id: 'a', target: 'b', extra: 800 }), Object.assign({}, TGT, { id: 'b', target: 'c', price: 250000, extra: 300 }), Object.assign({}, TGT, { id: 'c', target: 'd', price: 220000 }), Object.assign({}, TGT, { id: 'd', price: 200000 })];
    const S = mk({ closing: 3 }, hs), pl = E.plan(S), P = new Parts(), p = pl.purchase;
    P.t(p.a === 0 && p.b === pl.V.a.locM && p.c === p.b + pl.V.b.locM && p.d === p.c + pl.V.c.locM, 'purchase month = source purchase + source locM', 1, JSON.stringify(p));
    P.t(p.a <= p.b && p.b <= p.c && p.c <= p.d && isFinite(p.d), 'monotone & finite', 1);
    P.t(pl.series.count[pl.T] === 4 && pl.series.count[Math.max(0, p.b - 1)] === 1, 'count series steps 1..4', 1);
    P.t(pl.funds.a && pl.funds.b && pl.funds.c && !pl.funds.d, 'funds flags along chain', 0.5);
    const S2 = mk({ closing: 3 }, hs.map((h) => (h.id === 'b' ? Object.assign({}, h, { liens: 60000 }) : h))); P.t(E.plan(S2).purchase.c > p.c, 'liens on B delay C (and D)', 1); return P; });
  const scen = [['price0', { price: 0 }], ['dp100', { dp: 100 }], ['rate0', { rate: 0 }], ['term12', { term: 12 }], ['huge price', { price: 1e12 }], ['huge extra', { extra: 1e12 }], ['neg price', { price: -1000 }], ['cap0', null, { cap: 0 }], ['cap1000', null, { cap: 1000 }], ['zero income', null, { p1: 0, p2: 0, rentCount: 0 }], ['rent0 zero income', { rent: 0 }, { p1: 0, p2: 0, rentCount: 0 }], ['dp>100', { dp: 150 }], ['closing 100', null, { closing: 100 }], ['driver months wait0', { driver: 'months', wait: 0 }], ['driver months infeasible', { driver: 'months', wait: 1 }, { cap: 10 }]];
  await check('B10', 'B', 'No NaN/Infinity leaks in plan series & KPIs (15 edge scenarios)', 2, 'node: Engine.plan on edge states; scan series/today/final', () => {
    const P = new Parts();
    scen.forEach(([n, h, g]) => { const S = E.seed(); Object.assign(S.g, g || {}); if (h) Object.assign(S.houses[0], h); let bad = null;
      try { const pl = E.plan(S); for (const k in pl.series) for (let t = 0; t < pl.series[k].length; t++) if (!isFinite(pl.series[k][t])) { bad = k + '[' + t + ']=' + pl.series[k][t]; break; }
        for (const o of [pl.today, pl.final]) for (const k in o) if (typeof o[k] === 'number' && !isFinite(o[k])) bad = bad || ('kpi ' + k + '=' + o[k]);
        S.houses.forEach((hh) => { const a = E.afford(S, hh, pl); if (BAD.test(a.txt + ' ' + a.why)) bad = bad || ('afford text: ' + a.why); }); } catch (e) { bad = 'threw ' + e.message; }
      P.t(!bad, n, 1, bad); }); return P; });
  await check('B11', 'B', 'Funding cycles (A<->B, A->A, 3-cycle) do not hang or throw', 1, 'node child process with 5s timeout', () => {
    const code = `const E=require(${JSON.stringify(path.join(V3, 'engine.js'))});const mk=(l)=>({g:Object.assign({},E.GDEF),houses:l.map(h=>E.newHouse(h))});
      const A=(id,t,s)=>({id,target:t,status:s||'planned',buyIn:0});
      const sc=[[A('a','b'),A('b','a')],[A('a','a')],[A('a','b','owned'),A('b','c'),A('c','a')],[A('a','b'),A('b','a','owned')]];
      let out=[];for(const l of sc){const S=mk(l);const pl=E.plan(S);S.houses.forEach(h=>E.afford(S,h,pl));out.push(Object.values(pl.purchase).join(','));}console.log(out.join('|'));`;
    const r = spawnSync(process.execPath, ['-e', code], { timeout: 5000, encoding: 'utf8' });
    return { ratio: r.status === 0 ? 1 : 0, detail: r.status === 0 ? 'ok ' + r.stdout.trim() : 'status ' + r.status + ' ' + (r.error ? r.error.message : '') + (r.stderr || '').slice(0, 200) }; });
  await check('B12', 'B', 'Net worth at t=0 = sum(value - balance - liens) of owned/bought houses', 1, 'node: compare plan.today.nw with independent sum', () => {
    const P = new Parts();
    [{ appr: 0 }, { appr: 3 }].forEach((g) => { const S = mk(g, [Object.assign({}, SRC, { paid: 24, liens: 10000, target: 'b' }), Object.assign({}, TGT, { buyIn: 0, price: 150000, id: 'b', target: 'c' }), Object.assign({}, TGT, { id: 'c', price: 99000, target: '' })]);
      const pl = E.plan(S); let exp = 0; S.houses.forEach((h) => { if (pl.purchase[h.id] === 0) { const k0 = h.status === 'owned' ? h.paid : 0; exp += h.price * Math.pow(1 + S.g.appr / 100, k0 / 12) - simBal(h, 0, 0) - (h.liens || 0); } });
      P.t(near(pl.today.nw, exp, 1), 'appr ' + g.appr, 1, 'got ' + pl.today.nw + ' want ' + exp); }); return P; });
  await check('B13', 'B', 'plan() under 100ms for 10 houses (median of 7)', 0.5, 'node timing', () => {
    const hs = []; for (let i = 0; i < 10; i++) hs.push({ id: 'h' + i, status: i ? 'planned' : 'owned', price: 250000 - i * 5000, extra: i * 50, target: i < 9 ? 'h' + (i + 1) : '' });
    const S = mk({ closing: 3 }, hs), ts = []; for (let i = 0; i < 7; i++) { const t0 = process.hrtime.bigint(); E.plan(S); ts.push(Number(process.hrtime.bigint() - t0) / 1e6); } ts.sort((a, b) => a - b); const med = ts[3];
    return { ratio: med < 100 ? 1 : med < 300 ? 0.5 : 0, detail: 'median ' + med.toFixed(1) + 'ms' }; });
  await check('B14', 'B', 'locMonths matches independent month-by-month simulation (60 random scenarios incl. liens/haircut/appr/paid)', 1.5, 'node: random states vs simLoc()', () => {
    let exact = 0, close = 0; const N = 60, bad = [];
    for (let n = 0; n < N; n++) { const g = { cap: 60 + Math.floor(rnd() * 30), haircut: Math.floor(rnd() * 20), closing: Math.floor(rnd() * 6), appr: Math.floor(rnd() * 5) };
      const a = { id: 'a', status: rnd() < 0.5 ? 'owned' : 'planned', price: 150000 + Math.floor(rnd() * 400000), dp: 10 + Math.floor(rnd() * 30), rate: 3 + rnd() * 6, term: [180, 240, 360][Math.floor(rnd() * 3)], paid: Math.floor(rnd() * 120), liens: rnd() < 0.5 ? Math.floor(rnd() * 80000) : 0, target: 'b' };
      const b = { id: 'b', price: 100000 + Math.floor(rnd() * 300000), dp: 15 + Math.floor(rnd() * 15) }; const S = mk(g, [a, b]), X = Math.floor(rnd() * 1500);
      const e = E.locMonths(S, S.houses[0], X), s = simLoc(S.g, S.houses[0], S.houses[1], X); if (e === s) exact++; if (e === s || Math.abs(e - s) <= 1) close++; else bad.push(`#${n} eng ${e} sim ${s}`); }
    return { ratio: close === N ? (exact === N ? 1 : 0.8) : close / N * 0.6, detail: `exact ${exact}/${N}, within1 ${close}/${N} ${bad.slice(0, 3).join('; ')}` }; });
  await check('B15', 'B', '85% cap counts loan + liens + drawn LOC for every house in a 3-chain (and totals add up)', 2, 'node: seed + liens, final month debt per house vs cap', () => {
    const S = E.seed(); S.houses[1].liens = 20000; S.houses[0].liens = 15000; const pl = E.plan(S), P = new Parts(), f = pl.lastBuy, p = pl.purchase;
    let sumDebt = 0, sumNw = 0, worst = 0;
    S.houses.forEach((h) => { const v = pl.V[h.id], age = f - p[h.id], X = v.X; const bal = age < v.payoff ? simBal(h, X, age) : 0; const heloc = pl.funds[h.id] && age >= v.locM ? v.D : 0; const val = h.price * Math.pow(1 + S.g.appr / 100, (age + (h.status === 'owned' ? h.paid : 0)) / 12);
      const debt = bal + (h.liens || 0) + heloc; sumDebt += debt; sumNw += val - debt; worst = Math.max(worst, debt - S.g.cap / 100 * val); });
    P.t(worst <= 1, 'no house exceeds cap incl. drawn LOC + liens at plan end', 1, 'worst excess $' + worst.toFixed(0));
    P.t(near(pl.final.debt, sumDebt, 1), 'plan.final.debt = sum of loans+liens+drawn LOC', 1, pl.final.debt + ' vs ' + sumDebt);
    P.t(near(pl.final.nw, sumNw, 1), 'plan.final.nw = value - all debt', 1, pl.final.nw + ' vs ' + sumNw);
    P.t(pl.funds.oak && pl.funds.elm && !pl.funds.pine, '3-chain funds flags oak->elm->pine', 1); return P; });
}

/* ================================================================ A: REQUIREMENTS / PROPAGATION */
async function reqChecks(page) {
  console.log('A. Requirements / propagation');
  await page.setViewportSize({ width: 390, height: 844 });
  await check('A01', 'A', 'Add house: appears in ledger with extra field, all loan inputs shown, plan counts update', 3, 'Main > "+ House"; inspect house page + main ledger + Plan card', async () => {
    await reset(page); const b = await snap(page); const P = new Parts();
    await page.click('[data-testid=add-house]'); await page.waitForTimeout(80);
    const hash = await page.evaluate(() => location.hash); P.t(/#\/h\//.test(hash), 'opens new house page', 0.3, hash);
    const need = ['price', 'dp', 'down', 'rate', 'termY', 'extra', 'payoff', 'liens', 'rent', 'tax', 'ins', 'hoa', 'buyIn'];
    const have = await page.evaluate((n) => n.map((k) => { const el = document.querySelector('[data-p$=".' + k + '"]'); return [k, !!el, el ? !el.readOnly : false]; }), need);
    P.t(have.every((x) => x[1] && x[2]), 'house page shows all loan/rent inputs editable', 0.9, have.filter((x) => !(x[1] && x[2])).map((x) => x[0]).join(','));
    const loan = await page.evaluate(() => !!document.querySelector('[data-p$=".loan"]')); P.t(loan, 'loan amount shown', 0.2);
    const id = hash.replace('#/h/', ''); await goMain(page); const a = await snap(page);
    P.t(a.rows.length === b.rows.length + 1 && !!a.row(id), 'new house in ledger (' + b.rows.length + ' -> ' + a.rows.length + ')', 0.5);
    P.t(a.row(id) && a.row(id).exN != null && !isNaN(a.row(id).payN), 'ledger row has extra input + monthly payment', 0.3, JSON.stringify(a.row(id)));
    P.t(a.sched && a.sched.n === b.sched.n + 1, 'plan "x of n houses" n increments', 0.2, JSON.stringify(a.sched));
    P.t(a.housesF === b.housesF + 1, 'Plan complete: Houses count +1', 0.2, b.housesF + '->' + a.housesF);
    P.t(a.monF !== b.monF || a.nwF !== b.nwF, 'Plan complete net worth/monthly change', 0.2, `monF ${b.monF}->${a.monF}`);
    await edit(page, 'h.' + id + '.buyIn', '240'); const c = await snap(page);
    P.t(c.sched && a.sched && c.sched.by !== a.sched.by, 'editing buy-in months moves plan completion date', 0.2, a.sched && a.sched.by + ' -> ' + (c.sched && c.sched.by));
    return P; });
  await check('A02', 'A', 'Remove house: ledger, plan counts, overview figures update; stale target refs cleared', 3, 'House page > Remove house', async () => {
    await reset(page); const b = await snap(page); const P = new Parts();
    await goHash(page, '#/h/oak'); await page.click('[data-testid=h-delete]'); await page.waitForTimeout(100);
    const a = await snap(page);
    P.t(a.rows.length === b.rows.length - 1 && !a.row('oak'), 'row removed', 1);
    P.t(a.sched && a.sched.n === b.sched.n - 1, 'plan "of n" decrements', 0.5, JSON.stringify(a.sched));
    P.t(a.housesF === b.housesF - 1 || a.housesT === b.housesT - 1 || a.housesF < b.housesF, 'plan Houses figure decrements', 0.5, `${b.housesF}->${a.housesF}`);
    P.t(a.nw < b.nw - 1000 && a.mon < b.mon - 500 && a.cf !== b.cf, 'net worth/monthly/cash flow change after removing owned house', 1, `nw ${b.nw}->${a.nw} mon ${b.mon}->${a.mon} cf ${b.cf}->${a.cf}`);
    return P; });

  /* --- edit matrix --- */
  const pm = (price, dp, rate, termM) => pmt(price * (1 - dp / 100), rate / 1200, termM);
  const base = pm(300000, 20, 6.5, 360);
  const M = [
    ['oak price 300k->400k', [['h.oak.price', 400000]], (b, a) => near(a.nw - b.nw, 20000, 2) && near(a.mon - b.mon, pm(400000, 20, 6.5, 360) - base, 2), 'nw +20000, monthly +P&I diff'],
    ['oak down 20%->40%', [['h.oak.dp', 40]], (b, a) => near(a.nw - b.nw, 60000, 2) && near(a.mon - b.mon, pm(300000, 40, 6.5, 360) - base, 2), 'nw +60000, monthly drops'],
    ['oak rate 6.5->8%', [['h.oak.rate', 8]], (b, a) => near(a.mon - b.mon, pm(300000, 20, 8, 360) - base, 2) && near(a.cf - b.cf, -(pm(300000, 20, 8, 360) - base), 2), 'monthly & cash flow move by P&I diff'],
    ['oak term 30y->15y', [['h.oak.termY', 15]], (b, a) => near(a.mon - b.mon, pm(300000, 20, 6.5, 180) - base, 2), 'monthly up'],
    ['oak extra 1000->2000', [['h.oak.extra', 2000]], (b, a) => near(a.mon - b.mon, 1000, 2) && near(a.totX - b.totX, 1000, 1) && a.row('oak').exN === 2000, 'monthly +1000, total extra +1000'],
    ['oak rent 2100->3000', [['h.oak.rent', 3000]], (b, a) => near(a.cf - b.cf, 900 * 0.95 * 0.92, 1.5), 'cash flow +786.6'],
    ['oak tax 300->500', [['h.oak.tax', 500]], (b, a) => near(a.cf - b.cf, -200, 1.5) && near(a.mon - b.mon, 200, 1.5), 'cf -200 & monthly +200'],
    ['oak insurance 100->200', [['h.oak.ins', 200]], (b, a) => near(a.cf - b.cf, -100, 1.5) && near(a.mon - b.mon, 100, 1.5), 'cf -100 & monthly +100'],
    ['oak hoa 0->150', [['h.oak.hoa', 150]], (b, a) => near(a.cf - b.cf, -150, 1.5) && near(a.mon - b.mon, 150, 1.5), 'cf -150 & monthly +150'],
    ['oak other liens 0->60000', [['h.oak.liens', 60000]], (b, a) => near(a.nw - b.nw, -60000, 2) && a.row('elm').buy > b.row('elm').buy, 'nw -60000 and elm bought later'],
    ['oak months paid 0->60', [['h.oak.paid', 60]], (b, a) => near(a.nw - b.nw, 240000 - 224666.35, 3) && a.row('elm').buy < b.row('elm').buy, 'nw up by principal paid, elm sooner'],
    ['elm price 240k->300k', [['h.elm.price', 300000]], (b, a) => a.nwF !== b.nwF && a.row('elm').buy > b.row('elm').buy && a.row('elm').payN > b.row('elm').payN, 'elm later, bigger payment, final nw changes'],
    ['g.cap 85->60', [['g.cap', 60]], (b, a) => a.row('elm').buy > b.row('elm').buy || a.row('elm').tag !== b.row('elm').tag, 'LOC later => plan changes'],
    ['g.appr 0->3', [['g.appr', 3]], (b, a) => a.nwF > b.nwF + 1000 && near(a.nw, b.nw, 1), 'plan-complete nw up, today unchanged'],
    ['g.vac 5->20', [['g.vac', 20]], (b, a) => near(a.cf - b.cf, -0.15 * 2100 * 0.92, 1.5), 'cf -289.8'],
    ['g.mgmt 8->20', [['g.mgmt', 20]], (b, a) => near(a.cf - b.cf, -0.12 * 1995, 1.5), 'cf -239.4'],
    ['g.maint 1->3', [['g.maint', 3]], (b, a) => near(a.cf - b.cf, -500, 1.5), 'cf -500'],
    ['g.closing 3->10', [['g.closing', 10]], (b, a) => a.row('elm').buy > b.row('elm').buy, 'elm later'],
    ['g.haircut 0->20', [['g.haircut', 20]], (b, a) => a.row('elm').buy > b.row('elm').buy, 'elm later'],
    ['g.hrate 8.5->15', [['g.hrate', 15]], (b, a) => a.monF > b.monF && near(a.mon, b.mon, 1), 'plan-complete monthly up (LOC interest)'],
    ['co-signer income 200k+200k -> 0+0 (affordability)', [['g.p1', 0], ['g.p2', 0]], (b, a) => a.row('oak').stCls !== b.row('oak').stCls || a.row('oak').st !== b.row('oak').st, 'oak affordability status changes'],
    ['g.dti 43->5', [['g.dti', 5]], (b, a) => a.rows.some((r) => r.st !== b.row(r.id).st), 'affordability statuses change'],
    ['g.otherDebt 0->20000/mo', [['g.otherDebt', 20000]], (b, a) => a.rows.some((r) => r.st !== b.row(r.id).st), 'affordability statuses change'],
  ];
  await check('A03', 'A', 'Edit matrix: each input changes the plan/summary figures it should (23 edits, exact deltas)', 12, 'Edit each field; compare main-page KPIs/plan/ledger before vs after', async () => {
    const P = new Parts();
    for (const [n, edits, t, why] of M) {
      let ok = false, info = '';
      try { await reset(page); const b = await snap(page); for (const [p, v] of edits) await edit(page, p, v); const a = await snap(page);
        ok = !!t(b, a); if (!ok) info = `want ${why}; nw ${b.nw}->${a.nw} mon ${b.mon}->${a.mon} cf ${b.cf}->${a.cf} nwF ${b.nwF}->${a.nwF} monF ${b.monF}->${a.monF} elm ${(b.row('elm') || {}).tag}->${(a.row('elm') || {}).tag}`;
        const bad = BAD.test(a.body); if (bad) { ok = false; info += ' NaN/Infinity text on main'; } } catch (e) { info = 'threw ' + e.message; }
      P.t(ok, n, 1, info); }
    return P; });

  await check('A04', 'A', 'Two-way back-solves: wait-months->extra, payoff->extra, down$->%', 5, 'House page: type in "Months until LOC", "Paid off in", "Down payment $"', async () => {
    const P = new Parts(); await reset(page);
    const S1 = await store(page), oak = S1.houses[0];
    await edit(page, 'h.oak.wait', '24'); const ex24 = money(await page.inputValue('[data-p="h.oak.extra"]'));
    const Sx = Object.assign({}, S1, { g: Object.assign({}, E.GDEF, S1.g) }); const want = E.extraFor(Sx, E.H(Sx, 'oak'), 24);
    P.t(near(ex24, want, 1.01), 'wait=24 -> extra field = back-solved value', 1.0, `extra field ${ex24}, engine ${want && want.toFixed(2)}`);
    const tgt = E.H(Sx, 'elm'); P.t(simLoc(Sx.g, oak, tgt, ex24 + 1) <= 24 && simLoc(Sx.g, oak, tgt, ex24 - 3) > 24, 'independent simulation: that extra opens LOC in <=24 and 3$ less does not', 0.5, 'sim ' + simLoc(Sx.g, oak, tgt, ex24));
    const m = await snap(page); P.t(m.row('oak').exN === Math.round(ex24) && near(m.mon, money((await snap(page)).raw.mon), 0) && m.row('oak').loc && /2y 0m/.test(m.row('oak').loc), 'main page: extra input + "LOC opens 2y 0m" reflect wait=24', 0.3, m.row('oak').exN + ' / ' + m.row('oak').loc);
    await edit(page, 'h.oak.wait', '12'); const ex12 = money(await page.inputValue('[data-p="h.oak.extra"]')); P.t(ex12 > ex24, 'shorter wait -> bigger extra', 0.2, ex12 + ' vs ' + ex24);
    /* payoff */
    await reset(page); await edit(page, 'h.oak.payoff', '120'); const exP = money(await page.inputValue('[data-p="h.oak.extra"]'));
    const wantP = pmt(240000, 0.065 / 12, 120) - base; P.t(near(exP, wantP, 1.01), 'payoff=120 -> extra = amortization solve (~' + wantP.toFixed(0) + ')', 1.0, 'extra field ' + exP);
    const pf = parseInt(await page.inputValue('[data-p="h.oak.payoff"]')); P.t(pf >= 119 && pf <= 120, 'payoff field stays ~120', 0.3, pf);
    const m2 = await snap(page); P.t(m2.row('oak').exN === Math.round(exP), 'main page extra input shows solved extra', 0.4, m2.row('oak').exN);
    P.t(near(m2.mon - 0, m2.row('oak').payN, 3), 'total monthly (today) follows solved extra', 0.3, m2.mon + ' vs row ' + m2.row('oak').payN);
    /* down */
    await reset(page); await edit(page, 'h.oak.down', '90000'); const dp = parseFloat(await page.inputValue('[data-p="h.oak.dp"]')); const ln = money(await page.inputValue('[data-p="h.oak.loan"]'));
    P.t(near(dp, 30, 0.01), 'down$ 90,000 on 300k -> 30%', 0.5, dp); P.t(near(ln, 210000, 1), 'loan amount updates to 210,000', 0.25, ln);
    await edit(page, 'h.oak.dp', '25'); const d2 = money(await page.inputValue('[data-p="h.oak.down"]')); P.t(near(d2, 75000, 1), 'dp% 25 -> down$ 75,000', 0.25, d2);
    return P; });

  await check('A05', 'A', 'Chain timing monotonic; raising source extra never delays; 4th house extends chain', 2, 'Main page: buy-month tags; raise Oak extra; add a house, make Pine fund it', async () => {
    await reset(page); const P = new Parts(); const b = await snap(page); const e = b.row('elm').buy, p = b.row('pine').buy;
    P.t(isFinite(e) && isFinite(p) && 0 < e && e < p, 'oak(0) < elm < pine, all finite', 0.5, `elm ${e} pine ${p}`);
    await edit(page, 'h.oak.extra', '3000'); const a = await snap(page);
    P.t(a.row('elm').buy < e && a.row('pine').buy <= p, 'more oak extra -> elm sooner and pine not later', 1, `elm ${e}->${a.row('elm').buy} pine ${p}->${a.row('pine').buy}`);
    await reset(page); await page.click('[data-testid=add-house]'); const id = (await page.evaluate(() => location.hash)).replace('#/h/', ''); await edit(page, 'h.' + id + '.price', '150000');
    await goHash(page, '#/h/pine'); await page.selectOption('[data-sel=pine]', id); await page.waitForTimeout(60); const c = await snap(page);
    P.t(isFinite(c.row(id).buy) && c.row(id).buy > c.row('pine').buy && c.row('pine').buy === p, 'new 4th house bought after pine (chain of 4)', 0.5, `pine ${c.row('pine').buy} new ${c.row(id).buy}`);
    return P; });

  await check('A06', 'A', 'Liens / drawn LOC reduce headroom: later LOC; debt line counts liens + LOC', 2, 'Add other liens on Elm; read "Debt on this house" note on Elm page', async () => {
    await reset(page); const P = new Parts(); const b = await snap(page);
    await goHash(page, '#/h/elm'); const n0 = await page.evaluate(() => [...document.querySelectorAll('.note')].map((x) => x.textContent).find((t) => /Debt on this house/.test(t)) || '');
    await edit(page, 'h.elm.liens', '50000'); const a = await snap(page);
    P.t(a.row('pine').buy > b.row('pine').buy, 'liens on elm delay pine purchase', 1, `pine ${b.row('pine').buy}->${a.row('pine').buy}`);
    await goHash(page, '#/h/elm'); const n1 = await page.evaluate(() => [...document.querySelectorAll('.note')].map((x) => x.textContent).find((t) => /Debt on this house/.test(t)) || '');
    const pct = (s) => { const m = /= ([\d.]+)% of value/.exec(s); return m ? +m[1] : NaN; };
    P.t(pct(n1) > pct(n0) && /line of credit/.test(n1), 'house page debt% includes liens and drawn LOC', 0.5, n0.slice(-90) + ' => ' + n1.slice(-90));
    P.t(pct(n1) <= 85.5, 'house debt% (loan+liens+LOC) does not exceed cap 85%', 0.5, 'pct ' + pct(n1)); return P; });

  await check('A07', 'A', 'Main page shows per-house total monthly payment, total monthly, net worth; totals = sum of rows; row edit propagates', 3, 'Main page: compare Total monthly payments KPI with sum of row payments', async () => {
    await reset(page); const P = new Parts(); const b = await snap(page);
    P.t(b.rows.length === 3 && b.rows.every((r) => !isNaN(r.payN) && r.payN > 0), 'every ledger row shows $/mo payment', 0.6, b.rows.map((r) => r.pay).join(' | '));
    P.t(!isNaN(b.nw) && !isNaN(b.mon) && !isNaN(b.cf), 'net worth, total monthly payments, cash flow KPIs shown', 0.4);
    const owned = b.rows.filter((r) => r.tag === 'owned').reduce((s, r) => s + r.payN, 0); P.t(near(b.mon, owned, 3), 'Total monthly (today) = sum of owned-house payments', 0.6, `${b.mon} vs ${owned}`);
    const ex = b.rows.reduce((s, r) => s + r.exN, 0); P.t(near(b.totX, ex, 2), 'Total extra = sum of extra fields', 0.4, `${b.totX} vs ${ex}`);
    await setVal(page, '[data-testid=extra-input]', '1500'); const a = await snap(page);
    P.t(near(a.row('oak').payN - b.row('oak').payN, 500, 1.5) && near(a.mon - b.mon, 500, 1.5) && near(a.totX - b.totX, 500, 1.5), 'editing a row extra on main updates row payment, total monthly, total extra by delta', 1, `row ${b.row('oak').payN}->${a.row('oak').payN} mon ${b.mon}->${a.mon} totX ${b.totX}->${a.totX}`);
    return P; });
}

/* ================================================================ C: UX */
async function uxChecks(page) {
  console.log('C. UX');
  await check('C01', 'C', 'At 390x844 all 3 ledger rows (incl. extra field + LOC info) fit in first viewport', 2, 'Open main at 390x844; no scrolling', async () => {
    await page.setViewportSize({ width: 390, height: 844 }); await reset(page); await goMain(page);
    const r = await page.evaluate(() => [...document.querySelectorAll('[data-testid=ledger-row]')].map((e) => { const b = e.getBoundingClientRect(); return { top: b.top, bottom: b.bottom }; }));
    const bar = await page.evaluate(() => { const b = document.querySelector('.bottom'); return b ? b.getBoundingClientRect().top : 844; });
    const vis = r.filter((x) => x.bottom <= Math.min(844, bar + 1)).length; return { ratio: r.length ? vis / r.length : 0, detail: `${vis}/${r.length} rows fully visible above fold/bottom bar; last row bottom ${r.length ? r[r.length - 1].bottom.toFixed(0) : '-'}px, bar top ${bar.toFixed(0)}px` }; });
  await check('C02', 'C', 'Main page (plan collapsed) has only per-house extra fields as text inputs (3 and 6 houses)', 2, 'Count visible <input> on main', async () => {
    const P = new Parts(); await reset(page); const c3 = await page.evaluate(() => [...document.querySelectorAll('#app input')].filter((i) => i.type !== 'hidden' && i.offsetParent).length); P.t(c3 <= 3, '3 houses -> inputs', 1, c3);
    for (let i = 0; i < 3; i++) { await page.click('[data-testid=add-house]'); await goMain(page); }
    const c6 = await page.evaluate(() => [...document.querySelectorAll('#app input')].filter((i) => i.type !== 'hidden' && i.offsetParent).length); P.t(c6 <= 6, '6 houses -> inputs', 1, c6); return P; });
  const routes = [['main', '#/'], ['house', '#/h/oak'], ['settings', '#/settings']];
  await check('C03', 'C', 'No horizontal overflow at 320/390/430 on main, house, settings', 2, 'Resize, check scrollWidth and element rects', async () => {
    const P = new Parts(); await reset(page);
    for (const w of [320, 390, 430]) { await page.setViewportSize({ width: w, height: 844 });
      for (const [n, h] of routes) { await goHash(page, h); const r = await page.evaluate(() => { const W = window.innerWidth; const sw = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth); const off = [...document.querySelectorAll('#app *')].filter((e) => { const b = e.getBoundingClientRect(); return b.width > 0 && (b.right > W + 1 || b.left < -1) && getComputedStyle(e).position !== 'fixed'; }).slice(0, 3).map((e) => e.tagName + '.' + e.className + ' r=' + Math.round(e.getBoundingClientRect().right)); return { sw, W, off }; });
        P.t(r.sw <= r.W && !r.off.length, `${n}@${w}`, 1, `scrollWidth ${r.sw}/${r.W} ${r.off.join(',')}`); } }
    await page.setViewportSize({ width: 390, height: 844 }); return P; });
  await check('C04', 'C', 'Tap targets >= 44x44 (buttons, selects, inputs; label counts for inputs)', 2, 'Measure interactive elements on main/house/settings', async () => {
    await reset(page); let tot = 0, ok = 0; const bad = [];
    for (const [n, h] of routes) { await goHash(page, h); const r = await page.evaluate(() => [...document.querySelectorAll('#app button, #app select, #app input, #app a[href], #app [role=button]')].filter((e) => !e.hidden && e.type !== 'hidden' && e.offsetParent).map((e) => { let b = e.getBoundingClientRect(); if (e.tagName === 'INPUT') { const l = e.closest('label'); if (l) b = l.getBoundingClientRect(); } return { w: b.width, h: b.height, d: e.tagName + (e.className ? '.' + String(e.className).split(' ')[0] : '') + '"' + (e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 18) + '"' }; }));
      r.forEach((x) => { tot++; if (x.w >= 43.5 && x.h >= 43.5) ok++; else bad.push(`${n}:${x.d} ${Math.round(x.w)}x${Math.round(x.h)}`); }); }
    const uniq = [...new Set(bad)]; return { ratio: tot ? ok / tot : 0, detail: `${ok}/${tot} targets >=44px. Small: ${uniq.slice(0, 8).join('; ')}` }; });
  await check('C05', 'C', 'All inputs/selects use font-size >= 16px (no iOS zoom)', 1, 'computed font-size', async () => {
    await reset(page); let tot = 0, ok = 0; const bad = [];
    for (const [n, h] of routes) { await goHash(page, h); const r = await page.evaluate(() => [...document.querySelectorAll('#app input, #app select, #app textarea')].filter((e) => e.type !== 'hidden' && e.offsetParent).map((e) => parseFloat(getComputedStyle(e).fontSize))); r.forEach((f) => { tot++; if (f >= 16) ok++; else bad.push(n + ':' + f); }); }
    return { ratio: tot ? ok / tot : 0, detail: `${ok}/${tot} ok ${bad.slice(0, 5).join(',')}` }; });
  await check('C06', 'C', 'House page reachable in 1 tap, back in 1 tap', 1.5, 'Tap row, then back', async () => {
    await reset(page); await goMain(page); const P = new Parts();
    await page.locator('[data-testid=ledger-row] .addr').first().click(); await page.waitForTimeout(100); const h1 = await page.evaluate(() => location.hash); P.t(/#\/h\/oak/.test(h1), 'tap house name -> house page', 0.75, h1);
    await page.locator('[aria-label=Back]').first().click(); await page.waitForTimeout(100); const h2 = await page.evaluate(() => location.hash); P.t(/^#\/?$|^$/.test(h2) && (await page.locator('[data-testid=summary]').count()) === 1, 'one Back tap -> main', 0.75, h2);
    return P; });
  await check('C07', 'C', 'Main page height with 6 houses is reasonable (<= ~2 screens)', 1, 'Add 3 houses, measure scrollHeight', async () => {
    await reset(page); for (let i = 0; i < 3; i++) { await page.click('[data-testid=add-house]'); await goMain(page); }
    const h = await page.evaluate(() => document.documentElement.scrollHeight); const r = h <= 1700 ? 1 : h <= 2600 ? 1 - (h - 1700) / 900 : 0; return { ratio: r, detail: 'scrollHeight ' + h + 'px (' + (h / 844).toFixed(1) + ' screens)' }; });
  const contrast = async (scheme) => {
    await page.emulateMedia({ colorScheme: scheme }); const fails = []; let tot = 0, ok = 0;
    const pages = [['main', '#/'], ['main+chart', '#/'], ['house', '#/h/oak'], ['settings', '#/settings']];
    for (const [n, h] of pages) { await goHash(page, h); if (n === 'main+chart') { const tg = page.locator('[data-testid=networth-toggle]'); if (await tg.count()) { await tg.click(); await page.waitForTimeout(80); } }
      const r = await page.evaluate(() => {
        const cv = document.createElement('canvas'); cv.width = cv.height = 1; const cx = cv.getContext('2d', { willReadFrequently: true });
        const px = (c) => { cx.clearRect(0, 0, 1, 1); cx.fillStyle = '#000'; cx.fillStyle = c; cx.fillRect(0, 0, 1, 1); const d = cx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
        const over = (f, b) => [0, 1, 2].map((i) => f[i] * f[3] + b[i] * (1 - f[3]));
        const bgOf = (el) => { const layers = []; for (let e = el; e; e = e.parentElement) { const c = px(getComputedStyle(e).backgroundColor); if (c[3] > 0) { layers.push(c); if (c[3] >= 0.999) break; } } let bg = [255, 255, 255]; if (!layers.length || layers[layers.length - 1][3] < 0.999) bg = [255, 255, 255]; else bg = layers.pop().slice(0, 3); while (layers.length) bg = over(layers.pop(), bg); return bg; };
        const lum = (c) => { const f = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2]; };
        const out = []; const seen = new Set();
        document.querySelectorAll('#app *, .bottom *').forEach((el) => { const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()); const isInp = el.tagName === 'INPUT' && el.value; if (!hasText && !isInp) return; const b = el.getBoundingClientRect(); if (b.width < 1 || b.height < 1) return; const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none') return;
          let fg = px(el instanceof SVGElement ? cs.fill : cs.color); const bg = bgOf(el); const f = fg[3] < 1 ? over(fg, bg) : fg.slice(0, 3); const L1 = lum(f), L2 = lum(bg); const cr = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
          const key = el.tagName + el.className + (el.textContent || el.value).trim().slice(0, 12); if (seen.has(key)) return; seen.add(key); out.push({ k: key, cr, fs: cs.fontSize }); });
        return out; });
      r.forEach((x) => { tot++; if (x.cr >= 4.5) ok++; else fails.push(`${scheme}/${n}: ${x.k} ${x.cr.toFixed(2)}`); }); }
    await page.emulateMedia({ colorScheme: 'light' }); return { tot, ok, fails };
  };
  await check('C08', 'C', 'Text contrast >= 4.5:1 in light and dark mode (all text on main, chart, house, settings)', 2, 'emulate prefers-color-scheme; compute WCAG ratio for every text element', async () => {
    await reset(page); const l = await contrast('light'), d = await contrast('dark'); const tot = l.tot + d.tot, ok = l.ok + d.ok; const f = l.fails.concat(d.fails);
    return { ratio: tot ? Math.pow(ok / tot, 3) : 0, detail: `${ok}/${tot} text elements pass (light ${l.ok}/${l.tot}, dark ${d.ok}/${d.tot}). ${f.slice(0, 6).join('; ')}` }; });
  await check('C09', 'C', 'Summary-first: KPIs above fold, concise text (<1000 chars), primary Add action in thumb zone', 1.5, 'Main page at 390x844', async () => {
    await reset(page); await goMain(page); const P = new Parts();
    const r = await page.evaluate(() => { const k = (id) => { const e = document.querySelector('[data-testid=' + id + ']'); return e ? e.getBoundingClientRect().bottom : 9999; }; const a = document.querySelector('[data-testid=add-house]'); const ab = a ? a.getBoundingClientRect() : null; return { nw: k('kpi-networth'), mon: k('kpi-monthly'), cf: k('kpi-cashflow'), len: document.getElementById('app').innerText.length, add: ab ? ab.top : 0 }; });
    P.t(r.nw < 844 && r.mon < 844 && r.cf < 844, 'net worth/monthly/cash-flow KPIs in first viewport', 0.5, JSON.stringify(r)); P.t(r.len < 1000, 'concise main page text (' + r.len + ' chars)', 0.5, r.len); P.t(r.add > 844 * 0.55, '+House button in lower half', 0.5, r.add); return P; });
}

/* ================================================================ D: PWA */
async function pwaChecks(page, ctxFactory) {
  console.log('D. PWA / local-first');
  await check('D01', 'D', 'Manifest valid; icons load with true declared dimensions', 1.5, 'GET manifest.webmanifest, GET each icon, read PNG header', async () => {
    const P = new Parts(); await page.goto(BASE + '/index.html?r=' + rn++); const href = await page.evaluate(() => { const l = document.querySelector('link[rel=manifest]'); return l ? l.getAttribute('href') : null; }); P.t(!!href, '<link rel=manifest>', 0.2);
    const res = await page.request.get(BASE + '/' + (href || 'manifest.webmanifest')); let mf = null; try { mf = await res.json(); } catch (e) {} P.t(!!mf, 'manifest parses as JSON', 0.2);
    if (mf) { P.t(mf.name && mf.short_name, 'name + short_name', 0.1); P.t(mf.display === 'standalone' || mf.display === 'fullscreen', 'display standalone', 0.15); P.t(mf.start_url && (await page.request.get(new URL(mf.start_url, BASE + '/').href)).ok(), 'start_url resolves 200', 0.15); P.t(mf.theme_color && mf.background_color, 'theme/background colour', 0.1);
      const icons = mf.icons || []; const sizes = [];
      for (const ic of icons) { const r = await page.request.get(new URL(ic.src, BASE + '/').href); if (!r.ok()) { sizes.push('404 ' + ic.src); continue; } const b = await r.body(); const w = b.readUInt32BE(16), h = b.readUInt32BE(20); sizes.push(w + 'x' + h + (ic.sizes === w + 'x' + h ? '' : '!=' + ic.sizes)); }
      P.t(icons.length >= 2 && sizes.every((s) => !/!=|404/.test(s)), 'icons load & match declared sizes', 0.3, sizes.join(','));
      P.t(icons.some((i) => /192/.test(i.sizes)) && icons.some((i) => /512/.test(i.sizes)), '192 and 512 icons', 0.2);
      }
    return P; });
  await check('D02', 'D', 'Service worker registers, activates, controls page after reload; precache complete', 1.5, 'Chromium with SW allowed: navigator.serviceWorker.controller', async () => {
    const ctx = await ctxFactory(); const pg = await mkPage(ctx, 'sw'); const P = new Parts();
    await pg.goto(BASE + '/index.html'); const ready = await pg.evaluate(() => navigator.serviceWorker.ready.then((r) => !!r.active)).catch(() => false); P.t(ready, 'SW registers and becomes active', 0.6);
    await pg.reload(); await pg.waitForSelector('#app > *'); const ctl = await pg.evaluate(() => !!navigator.serviceWorker.controller); P.t(ctl, 'page controlled after reload', 0.5);
    const cached = await pg.evaluate(async () => { const ks = await caches.keys(); const out = []; for (const k of ks) { const c = await caches.open(k); out.push(...(await c.keys()).map((r) => new URL(r.url).pathname)); } return out; });
    const need = ['/index.html', '/app.js', '/engine.js', '/style.css', '/manifest.webmanifest', '/icon-180.png', '/icon-192.png', '/icon-512.png']; const miss = need.filter((n) => !cached.includes(n)); P.t(!miss.length, 'all shell files precached', 0.4, 'missing ' + miss.join(','));
    pg.__ctx = ctx; global.__swctx = { ctx, pg }; return P; });
  await check('D03', 'D', 'Works offline: reload, deep-link, and edit with network off', 2, 'DevTools offline; reload', async () => {
    const { ctx, pg } = global.__swctx; const P = new Parts(); collect.paused = true;
    await pg.evaluate(() => { localStorage.clear(); }); await pg.reload(); await pg.waitForSelector('[data-testid=ledger-row]');
    await ctx.setOffline(true);
    try { await pg.reload(); await pg.waitForSelector('[data-testid=ledger-row]', { timeout: 4000 }); P.t((await pg.locator('[data-testid=ledger-row]').count()) === 3, 'offline reload renders ledger', 1); } catch (e) { P.t(false, 'offline reload renders ledger', 1, e.message.slice(0, 80)); }
    try { await pg.goto(BASE + '/', { timeout: 4000 }); await pg.waitForSelector('[data-testid=summary]', { timeout: 3000 }); P.t(true, 'offline start URL "/" works', 0.3); } catch (e) { P.t(false, 'offline start URL "/" works', 0.3, e.message.slice(0, 80)); }
    try { await pg.goto(BASE + '/index.html#/settings', { timeout: 4000 }); await pg.waitForSelector('[data-testid=export]', { timeout: 3000 }); P.t(true, 'offline deep link', 0.3); } catch (e) { P.t(false, 'offline deep link', 0.3, e.message.slice(0, 80)); }
    try { await pg.goto(BASE + '/index.html#/h/oak'); await setVal(pg, '[data-p="h.oak.extra"]', '4321'); await pg.reload(); await pg.waitForSelector('[data-p="h.oak.extra"]'); P.t((await pg.inputValue('[data-p="h.oak.extra"]')).replace(/\D/g, '') === '4321', 'edits persist while offline', 0.4); } catch (e) { P.t(false, 'edits persist while offline', 0.4, e.message.slice(0, 80)); }
    await ctx.setOffline(false); collect.paused = false; return P; });
  await check('D05', 'D', 'Data persists across reload and new tab; no server round-trip', 1.5, 'Edit extra + address + add house, reload', async () => {
    const P = new Parts(); await reset(page); await edit(page, 'h.oak.extra', '1234'); await edit(page, 'h.oak.addr', 'Zed Lane'); await page.click('[data-testid=add-house]').catch(async () => { await goMain(page); await page.click('[data-testid=add-house]'); });
    await page.reload(); await goMain(page); const s = await snap(page); P.t(s.row('oak') && s.row('oak').exN === 1234 && /Zed Lane/.test(s.row('oak').addr), 'edits survive reload', 0.6, JSON.stringify(s.row('oak')));
    P.t(s.rows.length === 4, 'added house survives reload', 0.4, s.rows.length); const st = await store(page); P.t(st && st.houses.length === 4, 'stored in localStorage/IndexedDB (rep-v3 key)', 0.2);
    const pg2 = await page.context().newPage(); pg2.setDefaultTimeout(4000); await pg2.goto(BASE + '/index.html'); await pg2.waitForSelector('[data-testid=ledger-row]'); P.t((await pg2.locator('[data-testid=ledger-row]').count()) === 4, 'second tab sees same data', 0.3); await pg2.close(); return P; });
  await check('D06', 'D', 'Export gives valid JSON; import restores state; invalid file rejected without damage', 1.5, 'Settings > Export; modify; Settings > Import (setInputFiles)', async () => {
    const P = new Parts(); await reset(page); await goHash(page, '#/settings');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-testid=export]')]); const f = await dl.path(); let j = null; try { j = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) {}
    P.t(j && Array.isArray(j.houses) && j.houses.length === 3 && j.g && j.houses[0].extra === 1000, 'export = valid JSON with all houses + assumptions', 0.5, dl.suggestedFilename());
    const keep = path.join(os.tmpdir(), 'rep-backup-' + process.pid + '.json'); fs.copyFileSync(f, keep);
    await edit(page, 'h.oak.extra', '7777'); await edit(page, 'h.elm.price', '999999'); await goHash(page, '#/settings');
    await page.setInputFiles('[data-testid=import-file]', keep); await page.waitForTimeout(250); const s = await store(page);
    P.t(s && s.houses[0].extra === 1000 && s.houses[1].price === 240000, 'import restores exported state', 0.6, s && s.houses[0].extra + '/' + s.houses[1].price);
    await goMain(page); const sn = await snap(page); P.t(sn.row('oak').exN === 1000, 'UI reflects imported data', 0.2);
    const bad = path.join(os.tmpdir(), 'rep-bad-' + process.pid + '.json'); fs.writeFileSync(bad, '{"nope":1'); const nd = page.__d.length; await goHash(page, '#/settings'); await page.setInputFiles('[data-testid=import-file]', bad); await page.waitForTimeout(250);
    const s2 = await store(page); P.t(s2 && s2.houses.length === 3 && page.__d.length > nd, 'corrupt file rejected with message, data untouched', 0.2);
    try { fs.unlinkSync(keep); fs.unlinkSync(bad); } catch (e) {} return P; });
  await check('D07', 'D', 'iOS install meta: apple-touch-icon loads, viewport-fit=cover, apple-mobile-web-app-capable, theme-color', 0.5, 'inspect <head>', async () => {
    const P = new Parts(); await page.goto(BASE + '/index.html?r=' + rn++);
    const h = await page.evaluate(() => ({ ati: (document.querySelector('link[rel=apple-touch-icon]') || {}).href, vp: (document.querySelector('meta[name=viewport]') || {}).content, cap: (document.querySelector('meta[name=apple-mobile-web-app-capable]') || {}).content, th: (document.querySelector('meta[name=theme-color]') || {}).content }));
    let ok = false; if (h.ati) { const r = await page.request.get(h.ati); ok = r.ok() && (await r.body()).readUInt32BE(16) >= 180; } P.t(ok, 'apple-touch-icon >=180px loads', 0.25, h.ati); P.t(/viewport-fit=cover/.test(h.vp || ''), 'viewport-fit=cover', 0.25); P.t(h.cap === 'yes', 'apple-mobile-web-app-capable', 0.25); P.t(!!h.th, 'theme-color', 0.25); return P; });
  await check('D08', 'D', 'navigator.storage.persist() requested on load', 0.5, 'spy on StorageManager.persist', async () => { await page.goto(BASE + '/index.html?r=' + rn++); await page.waitForTimeout(200); const n = await page.evaluate(() => window.__persist); return { ratio: n >= 1 ? 1 : 0, detail: 'persist() calls: ' + n }; });
}

/* ================================================================ E: robustness */
async function robustChecks(page) {
  console.log('E. Robustness / accessibility');
  await page.setViewportSize({ width: 390, height: 844 });
  const cases = [['h.oak.price', '0'], ['h.oak.dp', '100'], ['h.oak.dp', '150'], ['h.oak.dp', '-20'], ['h.oak.rate', '0'], ['h.oak.rate', '1000'], ['h.oak.termY', '0'], ['h.oak.price', ''], ['h.oak.price', 'abc'], ['h.oak.price', '-500'], ['h.oak.price', '1e12'], ['h.oak.price', '1000000000000'],
    ['h.oak.extra', '1000000000000'], ['h.oak.rent', '1000000000000'], ['h.oak.tax', '-100'], ['h.oak.wait', '0'], ['h.oak.wait', '-5'], ['h.oak.wait', '999999'], ['h.oak.payoff', '0'], ['h.oak.payoff', '1'], ['h.oak.payoff', '9999'], ['h.oak.down', '0'], ['h.oak.down', '99999999'],
    ['h.oak.paid', '5000'], ['h.oak.liens', '99999999999'], ['g.cap', '0'], ['g.cap', '100'], ['g.cap', '1000'], ['g.dti', '0'], ['g.hrate', '0'], ['g.closing', '1000'], ['g.vac', '100'], ['g.vac', '1000'], ['g.mgmt', '1000'], ['g.appr', '1000'], ['g.appr', '-50'], ['g.haircut', '100'], ['g.haircut', '1000'], ['g.p1', '0'], ['g.rentCount', '1000']];
  await check('E01', 'E', 'Edge inputs (40 cases: 0, 100% down, 0% rate, blank, garbage, negative, 1e12, caps) leave no NaN/Infinity/undefined in main/house/settings DOM or crash', 3, 'Type each value into the field; scan text + input values on all pages', async () => {
    const P = new Parts(); await reset(page);
    for (const [p, v] of cases) { let bad = []; try { const e0 = collect.errors.length; await edit(page, p, v); bad = await scanBad(page); if (collect.errors.length > e0) bad.push('JS error: ' + collect.errors[collect.errors.length - 1].slice(0, 100)); } catch (e) { bad = ['threw ' + e.message.slice(0, 80)]; }
      P.t(!bad.length, p + '=' + JSON.stringify(v), 1, bad[0]); }
    /* compound cases */
    await reset(page); await edit(page, 'h.oak.price', '0'); await edit(page, 'h.oak.down', '5000'); let b = await scanBad(page); P.t(!b.length, 'price 0 then down$ 5000 (0-division)', 1, b[0]);
    await reset(page); await edit(page, 'g.p1', '0'); await edit(page, 'g.p2', '0'); await edit(page, 'g.rentCount', '0'); await edit(page, 'h.oak.rent', '0'); await edit(page, 'h.elm.rent', '0'); await edit(page, 'h.pine.rent', '0'); b = await scanBad(page); P.t(!b.length, 'zero income everywhere', 1, b[0]);
    await reset(page); await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('rep-v3')); s.houses.push({ id: 'x1', addr: 'Sparse' }); s.houses[0].target = 'ghost'; localStorage.setItem('rep-v3', JSON.stringify(s)); }); await page.reload(); await page.waitForSelector('#app > *'); b = await scanBad(page); P.t(!b.length, 'stored/imported state with missing fields + dangling target', 1, b[0]);
    await reset(page); await page.evaluate(() => localStorage.setItem('rep-v3', '{not json')); await page.reload(); await page.waitForSelector('#app > *'); P.t((await page.locator('[data-testid=summary]').count()) === 1, 'corrupt localStorage falls back to sample data', 1);
    return P; });
  await check('E02', 'E', 'Delete all houses -> clean empty state; can add again', 1, 'Remove each house on its page', async () => {
    await reset(page); const P = new Parts();
    for (const id of ['oak', 'elm', 'pine']) { await goHash(page, '#/h/' + id); await page.click('[data-testid=h-delete]'); await page.waitForTimeout(100); }
    const t = await page.evaluate(() => document.getElementById('app').innerText); P.t(/no houses/i.test(t) && !BAD.test(t), 'empty state message, no NaN', 0.6, t.slice(0, 80).replace(/\n/g, ' '));
    P.t((await page.locator('[data-testid=add-house]').count()) === 1, 'Add house action available', 0.2); await page.click('[data-testid=add-house]'); await page.waitForTimeout(80); await goMain(page); P.t((await page.locator('[data-testid=ledger-row]').count()) === 1, 'add after empty works', 0.2); return P; });
  await check('E03', 'E', 'Deleting a funding target clears references (select, storage, plan)', 1, 'Delete Elm; Oak target must reset', async () => {
    await reset(page); const P = new Parts(); await goHash(page, '#/h/elm'); await page.click('[data-testid=h-delete]'); await page.waitForTimeout(100);
    const s = await store(page); P.t(s.houses.every((h) => h.target !== 'elm'), 'no house still targets deleted id', 0.4, JSON.stringify(s.houses.map((h) => h.target)));
    await goHash(page, '#/h/oak'); const v = await page.inputValue('[data-sel=oak]'); P.t(v === '', 'Oak funding select reset', 0.3, v); const m = await snap(page); P.t(!/elm/i.test(m.body), 'no mention of deleted house on main', 0.3);
    return P; });
  await check('E04', 'E', 'Every input/select/button has an accessible name', 1, 'aria-label / label / text on all pages', async () => {
    await reset(page); let tot = 0, ok = 0; const bad = [];
    for (const h of ['#/', '#/h/oak', '#/h/pine', '#/settings']) { await goHash(page, h); const r = await page.evaluate(() => [...document.querySelectorAll('#app input, #app select, #app button, #app textarea')].filter((e) => e.type !== 'hidden' && !e.hidden).map((e) => { const al = e.getAttribute('aria-label'), lb = e.getAttribute('aria-labelledby'), l = e.labels && e.labels.length ? [...e.labels].map((x) => x.textContent).join('').trim() : '', tx = e.tagName === 'BUTTON' ? e.textContent.trim() : '', ti = e.getAttribute('title'); return { n: !!((al && al.trim()) || lb || l || tx || ti), d: e.tagName + (e.dataset.p || e.dataset.testid || '') }; }));
      r.forEach((x) => { tot++; if (x.n) ok++; else bad.push(h + ' ' + x.d); }); }
    return { ratio: tot ? ok / tot : 0, detail: `${ok}/${tot} named. unnamed: ${bad.slice(0, 5).join(', ')}` }; });
  await check('E05', 'E', 'Typing 5 digits sequentially keeps focus + full value (re-render safe) on main, house, settings, text field', 1, 'page.keyboard.type("12345") with delay', async () => {
    await reset(page); const P = new Parts();
    const tryType = async (route, sel, txt, want, label) => { await goHash(page, route); const el = page.locator(sel).first(); await el.click({ clickCount: 3 }); await page.keyboard.press('Backspace'); await page.keyboard.type(txt, { delay: 60 }); await page.waitForTimeout(120);
      const r = await page.evaluate((s) => { const a = document.activeElement; return { same: !!(a && a.matches && a.matches(s)), v: a ? a.value : null }; }, sel); P.t(r.same && String(r.v).replace(/[,$\s]/g, '') === want, label, 1, `focus kept=${r.same} value=${r.v}`); };
    await tryType('#/', '[data-testid=extra-input]', '12345', '12345', 'main extra field'); await tryType('#/h/oak', '[data-p="h.oak.price"]', '12345', '12345', 'house price'); await tryType('#/settings', '[data-p="g.cap"]', '1234', '1234', 'settings field');
    await tryType('#/h/oak', '[data-p="h.oak.addr"]', 'Abcde', 'Abcde', 'address text'); return P; });
  await check('E08', 'E', 'No render storm: DOM settles when an input is focused (no endless re-render loop)', 1, 'Focus any input, count #app mutations over 600ms (Chromium)', async () => {
    const P = new Parts(); await reset(page);
    for (const [n, h, sel] of [['main extra', '#/', '[data-testid=extra-input]'], ['house price', '#/h/oak', '[data-p="h.oak.price"]'], ['settings cap', '#/settings', '[data-p="g.cap"]']]) {
      await goHash(page, h); await page.waitForSelector(sel);
      const r = await page.evaluate(async (sel) => { const el = document.querySelector(sel); el.focus(); await new Promise((r) => setTimeout(r, 50)); let n = 0; const mo = new MutationObserver((m) => { n += m.length; }); mo.observe(document.getElementById('app'), { childList: true, subtree: true }); await new Promise((r) => setTimeout(r, 600)); mo.disconnect(); const a = document.activeElement; if (a && a.blur) a.blur(); return n; }, sel);
      P.t(r <= 20, n + ' (mutations in 600ms while focused)', 1, r); } return P; });
  await check('E06', 'E', 'No layout shift while navigating and editing (CLS <= 0.05)', 0.5, 'PerformanceObserver layout-shift', async () => {
    await reset(page); await page.waitForTimeout(300); for (const h of ['#/h/oak', '#/settings', '#/', '#/h/elm', '#/']) await goHash(page, h); await edit(page, 'h.oak.rent', '2500'); await goMain(page); await page.locator('[data-testid=networth-toggle]').click().catch(() => {}); await page.waitForTimeout(300);
    const c = await page.evaluate(() => window.__cls); return { ratio: c <= 0.05 ? 1 : c <= 0.1 ? 0.5 : 0, detail: 'CLS ' + c.toFixed(4) }; });
}

/* ================================================================ main */
(async () => {
  const t0 = Date.now(); const { srv, port } = await startServer(); BASE = 'http://127.0.0.1:' + port;
  console.log('Serving', V3, 'on', BASE);
  browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    await engineChecks();
    const ctx = await mkCtx(); const page = await mkPage(ctx, 'main');
    await reqChecks(page); await uxChecks(page); await robustChecks(page);
    await pwaChecks(page, () => mkCtx({ serviceWorkers: 'allow' }));
    await check('D04', 'D', 'Zero external (non-localhost) network requests across every flow', 1, 'Log all requests from all contexts', () => {
      const ext = collect.requests.filter((u) => !/^(http:\/\/127\.0\.0\.1|http:\/\/localhost|data:|blob:|about:)/.test(u)); return { ratio: ext.length ? 0 : 1, detail: `${collect.requests.length} requests, ${ext.length} external ${ext.slice(0, 3).join(',')}` }; });
    await check('E07', 'E', 'No console errors or page errors during all flows', 1.5, 'Collected over the whole run', () => { const n = collect.errors.length; return { ratio: n === 0 ? 1 : n <= 2 ? 0.5 : 0, detail: n + ' errors: ' + [...new Set(collect.errors)].slice(0, 4).join(' || ') }; });
  } finally { await browser.close(); srv.close(); }

  /* ---- report ---- */
  results.sort((a, b) => a.id.localeCompare(b.id));
  const per = {}; Object.keys(cats).forEach((c) => (per[c] = { earned: 0, max: 0 })); results.forEach((r) => { per[r.category].earned += r.earned; per[r.category].max += r.points; });
  const total = results.reduce((s, r) => s + r.earned, 0), max = results.reduce((s, r) => s + r.points, 0);
  const f2 = (n) => (Math.round(n * 100) / 100).toFixed(2);
  let md = `# Prototype grader report\n\nTarget: \`prototype/v3\`  |  Run: ${new Date().toISOString()}  |  ${((Date.now() - t0) / 1000).toFixed(0)}s\n\n## Score: **${f2(total)} / ${max}**\n\n| Category | Score |\n|---|---|\n`;
  Object.keys(cats).forEach((c) => (md += `| ${c}. ${cats[c]} | ${f2(per[c].earned)} / ${per[c].max} |\n`));
  md += `\n## All checks\n\n| ID | Check | Pts | Earned | Detail |\n|---|---|---|---|---|\n`;
  results.forEach((r) => (md += `| ${r.id} | ${r.name} | ${r.points} | ${f2(r.earned)} | ${String(r.detail).replace(/\|/g, '/').replace(/\n/g, ' ').slice(0, 400)} |\n`));
  const fails = results.filter((r) => r.earned < r.points - 0.001).sort((a, b) => (b.points - b.earned) - (a.points - a.earned));
  md += `\n## Top failures\n\n`; if (!fails.length) md += 'None.\n'; fails.slice(0, 15).forEach((r, i) => (md += `${i + 1}. **${r.id} ${r.name}** (-${f2(r.points - r.earned)})\n   - Detail: ${String(r.detail).slice(0, 500)}\n   - Reproduce: ${r.repro}\n`));
  fs.writeFileSync(path.join(__dirname, 'report.md'), md);
  fs.writeFileSync(path.join(__dirname, 'result.json'), JSON.stringify({ total: +f2(total), max, categories: per, results }, null, 2));
  console.log('\nCategory scores:'); Object.keys(cats).forEach((c) => console.log(`  ${c}  ${f2(per[c].earned)} / ${per[c].max}  ${cats[c]}`));
  console.log(`\nTOTAL ${f2(total)} / ${max}`);
})().catch((e) => { console.error('GRADER CRASH', e); process.exit(2); });
