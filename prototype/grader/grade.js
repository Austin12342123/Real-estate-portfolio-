#!/usr/bin/env node
/* Automated prototype grader (85 pts automated: A 18, B 12, C 10, D 8, E 7, R 30; a separate design review adds 15).
   Run:  NODE_PATH=$(npm root -g) node grade.js
   Serves ../v4 on a free localhost port, drives it with Playwright/Chromium, unit-tests engine.js in node.
   Category R (realism) is plugged in from ./realism.js. Categories F (finance-grade.js), G (sync-grade.js) and H (info-grade.js: help (i) buttons + hourly jobs) are scored on their own scales.
   Run one category: FINANCE_ONLY=1, SYNC_ONLY=1, INFO_ONLY=1 (H_ONLY=H3,H5 for single checks), MAIN_ONLY=1 (A-E + R only).
   Collapsed sections: A-G run with an observer that opens collapsed sections like a user tapping the header (mkCtx autoExpand); category H runs with it off and tests the collapsed defaults itself. Writes report.md + result.json next to this file. Never modifies the app. */
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const { spawnSync } = require('child_process');
const { chromium } = require('playwright');
if (process.env.LOGIC_ONLY) { require('./logic-grade.js'); return; } /* L1-L10 logic and math grader (node only): LOGIC_ONLY=1 node grade.js */

const V4 = path.resolve(__dirname, '../v4');
const E = require(path.join(V4, 'engine.js'));
const results = [];
const cats = { A: 'Requirement / propagation', B: 'Engine correctness', C: 'UX conciseness & usability', D: 'PWA / local-first', E: 'Robustness & accessibility', R: 'Realism & market accuracy' };
const CATMAX = { A: 18, B: 12, C: 10, D: 8, E: 7, R: 30 };
const KEY = 'rep-v4', DATA_V = +((/const DATA_V = (\d+)/.exec(fs.readFileSync(path.resolve(__dirname, '../v4/app.js'), 'utf8')) || [0, 0])[1]);
const FIN_ONLY = process.env.FINANCE_ONLY === '1', SYNC_ONLY = process.env.SYNC_ONLY === '1', INFO_ONLY = process.env.INFO_ONLY === '1', MAIN_ONLY = process.env.MAIN_ONLY === '1', GEST_ONLY = process.env.GEST_ONLY === '1';
const NSEED = E.seedPlan().houses.length; /* the app's default portfolio (the self-funded plan), derived from the app, never hard-coded */
const SEEDN = E.seed().houses.length; /* the older small sample (Load realistic sample) */

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
  const rec = { id, category: cat, name, points, rawPoints: points, earned: Math.round(points * ratio * 100) / 100, ratio, detail: r.detail || '', repro };
  results.push(rec);
  console.log(`  [${rec.earned.toFixed(2)}/${points}] ${id} ${name}${ratio < 1 ? '  <-- ' + String(rec.detail).slice(0, 200) : ''}`);
}
/* "$1,234" "−$4.5M" "+$1.2B" -> number */
const money = (s) => { if (s == null) return NaN; const m = /([−\-+])?\s*\$?\s*([\d,]+(?:\.\d+)?)\s*([MBK])?(?![a-z])/.exec(String(s)); if (!m) return NaN; let v = parseFloat(m[2].replace(/,/g, '')); if (m[3] === 'M') v *= 1e6; else if (m[3] === 'B') v *= 1e9; else if (m[3] === 'K') v *= 1e3; return m[1] === '−' || m[1] === '-' ? -v : v; };
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const nearRel = (a, b, abs = 1.01, rel = 0.002) => Math.abs(a - b) <= abs + rel * Math.abs(b);
const BAD = /(^|[^A-Za-z])(NaN|-?Infinity|undefined|\[object)([^A-Za-z]|$)/;
const pmt = E.pmt;
/* row tag is now 'Home' (owned) or 'Home · buy N mo' / 'Home · unfunded' (planned) */
const isOwnedTag = (tag) => !/·/.test(String(tag || ''));
const buyOf = (tag) => { tag = String(tag || ''); if (isOwnedTag(tag)) return 0; if (/unfunded/.test(tag)) return Infinity; if (/buy now/.test(tag)) return 0; const m = /buy (\d+) mo/.exec(tag); return m ? +m[1] : NaN; };

/* ---------------------------------------------------------------- static server */
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.json': 'application/json', '.svg': 'image/svg+xml' };
function startServer() {
  return new Promise((res) => {
    const srv = http.createServer((q, r) => {
      let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
      const f = path.join(V4, path.normalize(p).replace(/^(\.\.[\/\\])+/, ''));
      if (!f.startsWith(V4) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end('nf'); }
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
/* Sections are collapsed by default (see EXPAND_JS below). The A-G graders need every field reachable, so they run with this observer that opens
   any collapsed section as soon as it renders, exactly like a user tapping the header. Category H runs without it (autoExpand: false). */
const AUTO_EXPAND = () => {
  const open = () => { try { const b = [...document.querySelectorAll('#app [data-coll][aria-expanded=false]')].filter((e) => e.dataset.coll !== 'drivers' && e.dataset.coll !== 'tgt')[0]; if (b && !window.__noExpand) b.click(); } catch (e) {} };
  let q = false; const go = () => { if (q) return; q = true; setTimeout(() => { q = false; open(); }, 0); };
  const start = () => { const a = document.getElementById('app'); if (!a) return setTimeout(start, 5); new MutationObserver(go).observe(a, { childList: true, subtree: true }); go(); };
  start();
};
async function mkCtx(o = {}) {
  const autoExpand = o.autoExpand !== false; o = Object.assign({}, o); delete o.autoExpand;
  const ctx = await browser.newContext(Object.assign({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, serviceWorkers: 'block', acceptDownloads: true, reducedMotion: 'reduce' }, o));
  await ctx.addInitScript(INIT); if (autoExpand) await ctx.addInitScript(AUTO_EXPAND);
  ctx.on('request', (r) => collect.requests.push(r.url()));
  return ctx;
}
let pageSeq = 0;
async function mkPage(ctx, label) {
  const page = await ctx.newPage(); page.setDefaultTimeout(4000); page.__d = []; const tag = label || 'p' + pageSeq++;
  page.on('console', (m) => { if (m.type() === 'error' && !collect.paused) collect.errors.push(`[${tag}] console: ${m.text()}`); });
  page.on('pageerror', (e) => collect.errors.push(`[${tag}] pageerror: ${e.message} @ ${String(e.stack || '').split('\n').slice(1, 3).join(' <- ').trim()}`));
  page.on('dialog', (d) => { page.__d.push(d.message()); d.accept().catch(() => {}); });
  return page;
}
let rn = 0;
/* Sections are collapsed by default (Asset: loan/rent/loc/exit/impact; Assumptions: backup/samples; Finances: tax/time; job 'More details').
   The graders reach every field the way a user would after tapping a section header, so open every collapsed section on the current page.
   (Category H and C07 test the collapsed defaults themselves with expand:false.) */
const EXPAND_JS = () => { let n = 0; for (let i = 0; i < 30; i++) { const b = [...document.querySelectorAll('#app [data-coll][aria-expanded=false]')].filter((e) => e.dataset.coll !== 'drivers' && e.dataset.coll !== 'tgt')[0]; if (!b) break; b.click(); n++; } return n; };
async function expandAll(page) { try { await page.evaluate(EXPAND_JS); } catch (e) {} }
async function reset(page, hash) {
  await page.goto(BASE + '/index.html?r=' + rn++);
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await page.goto(BASE + '/index.html?r=' + rn++ + (hash || ''));
  await page.waitForSelector('#app > *');
  await expandAll(page);
}
/* Load the app with a custom saved state (state must be normalized, v:7). */
async function loadState(page, S, hash) {
  await page.goto(BASE + '/index.html?r=' + rn++);
  await page.evaluate(([k, s]) => { try { localStorage.clear(); localStorage.setItem(k, JSON.stringify(s)); } catch (e) {} }, [KEY, S]);
  await page.goto(BASE + '/index.html?r=' + rn++ + (hash || ''));
  await page.waitForSelector('#app > *');
  await expandAll(page);
}
async function goHash(page, h) {
  await page.evaluate((h) => { const cur = location.hash; if (cur === h || (h === '#' && cur === '')) window.dispatchEvent(new Event('hashchange')); else location.hash = h; }, h);
  await page.waitForTimeout(60);
  await expandAll(page);
}
/* Portfolio rows: tapping a row selects it and opens its panel (extra payment, effects, move / duplicate / details / remove) */
async function selRow(page, id) { if (!(await page.$(`[data-for="${id}"]`))) { await page.click(`[data-row="${id}"] [data-testid=row-extra-toggle]`); await page.waitForTimeout(60); } }
async function setExtra(page, id, val) { await selRow(page, id); await setVal(page, `[data-for="${id}"] [data-testid=extra-input]`, val); }
const goMain = async (page) => { await goHash(page, '#'); await page.waitForSelector('[data-testid=summary],.empty'); };
/* Set a field like a user finishing an edit: native value set + 'input' event, then blur. */
async function setVal(page, sel, val) {
  /* a field inside a section the user has not opened yet: open collapsed sections first (as a person would) */
  if (!(await page.$(sel))) await expandAll(page);
  await page.waitForSelector(sel);
  await page.evaluate(([sel, val]) => { const el = document.querySelector(sel); el.focus(); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, val); el.dispatchEvent(new Event('input', { bubbles: true })); if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); }, [sel, String(val)]);
  await page.waitForTimeout(60);
}
const routeFor = (p) => (p.startsWith('g.') ? '#assumptions' : '#house-' + p.split('.')[1]);
async function edit(page, p, val) { await goHash(page, routeFor(p)); await setVal(page, `[data-p="${p}"]`, val); }
const store = (page) => page.evaluate((k) => { try { const j = JSON.parse(localStorage.getItem(k)); if (j) return j; } catch (e) {} try { return JSON.parse(JSON.stringify(window.__app.state)); } catch (e) { return null; } }, KEY);
async function snap(page) {
  await goMain(page);
  const d = await page.evaluate(() => {
    const txt = (s) => { const e = document.querySelector(s); return e ? e.textContent.trim() : null; };
    const rows = [...document.querySelectorAll('[data-testid=ledger-row]')].map((r) => { const loc = r.querySelector('[data-testid=loc-line]'), inp = r.querySelector('input'), cf = r.querySelector('[data-testid=row-cashflow] b'), ex = r.querySelector('.exitline');
      return { id: r.dataset.row || '', addr: (r.querySelector('.addr') || {}).textContent, tag: (r.querySelector('.tag') || {}).textContent, dp: ((r.querySelector('[data-testid=dp-line]') || {}).textContent || '').trim(), no: (r.querySelector('[data-testid=buy-no]') || {}).textContent, text: r.innerText, pay: (r.querySelector('[data-testid=row-payment]') || {}).textContent,
        extra: inp ? inp.value : null, eqA: (r.querySelector('[data-testid=row-payment]') || { dataset: {} }).dataset.equity, loc: loc ? loc.textContent.trim() : '', cf: cf ? cf.textContent.trim() : '', exitline: ex ? ex.textContent.trim() : '' }; });
    const bd = {}; document.querySelectorAll('[data-testid=breakdown] tbody tr').forEach((tr) => { const c = [...tr.children].map((x) => x.textContent.trim()); bd[c[0]] = c.slice(1); });
    return { nw: txt('[data-testid=kpi-networth]'), mon: txt('[data-testid=kpi-monthly]'), cf: txt('[data-testid=kpi-cashflow]'), dscr: txt('[data-testid=kpi-dscr]'), totX: txt('[data-testid=total-extra]'), headline: txt('[data-testid=plan-headline]'),
      nwSub: (document.querySelector('[data-testid=kpi-networth]') || { nextElementSibling: null }).nextElementSibling ? document.querySelector('[data-testid=kpi-networth]').nextElementSibling.textContent : '',
      rows, bd, body: document.getElementById('app').innerText };
  });
  const s = { raw: d, nw: money(d.nw), mon: money(d.mon), cf: money(d.cf), dscr: parseFloat(d.dscr), totX: money(d.totX), headline: d.headline, rows: d.rows, bd: d.bd, body: d.body };
  s.rows.forEach((r) => { r.payN = (/\$([\d,.]+[MB]?)\/mo/.exec(r.pay) ? money('$' + /\$([\d,.]+[MB]?)\/mo/.exec(r.pay)[1]) : NaN); r.sold = /sold/.test(r.pay || ''); r.exN = r.extra == null ? 0 : money(r.extra); r.buy = buyOf(r.tag); r.cfN = /—/.test(r.cf) || r.sold ? 0 : money(r.cf); /* a sold row's cash cell shows the sale proceeds, not a monthly cash flow */ r.eqN = r.eqA ? +r.eqA : 0; });
  { const k = Object.keys(s.bd).find((x) => /^Trust cash$/.test(x)); s.soldCash = k ? money(s.bd[k][1]) : 0; }
  { const st = await store(page); const plst = st && Array.isArray(st.houses) && st.houses.length ? E.plan(E.normalize(clone(st))) : null; if (st) s.rows.forEach((r) => { if (plst) r.buy = isFinite(plst.purchase[r.id]) ? plst.purchase[r.id] : Infinity; /* the rows no longer carry a tag: the buy month is the engine's */ const h = (st.houses || []).find((x) => x.id === r.id); if (h && !r.sold) { const X = E.view(st, h).X; r.extra = Math.round(X).toLocaleString('en-US'); r.exN = Math.round(X); } }); }
  s.row = (id) => s.rows.find((r) => r.id === id);
  return s;
}
const scanRoutes = ['#', '#house-maple', '#house-birch', '#house-auto', '#assumptions', '#add'];
const scanBad = async (page, routes) => {
  const out = [];
  for (const h of routes || scanRoutes) {
    await goHash(page, h);
    const t = await page.evaluate(() => { const a = document.getElementById('app'); return a.innerText + ' ' + [...a.querySelectorAll('input')].map((i) => i.value).join(' | ') + ' ' + document.title; });
    if (BAD.test(t)) out.push(h + ': ' + (BAD.exec(t) || [])[2] + ' near "' + t.slice(Math.max(0, t.search(BAD) - 40), t.search(BAD) + 40).replace(/\s+/g, ' ') + '"');
  }
  return out;
};

/* ---------------------------------------------------------------- state builders (do not depend on the sample) */
function mkS(g, houses) { const S = E.normalize({ g: Object.assign({}, E.GDEF, g || {}), houses }); S.v = DATA_V; return S; }
const A = (type, loan, o) => E.newAsset(type, loan, o);
const clone = (o) => JSON.parse(JSON.stringify(o));
/* known-good math fixtures (closing 0, growth 0, cap 85) */
const mk = (g, houses) => mkS(Object.assign({ closing: 0, appr: 0, cap: 85, haircut: 0 }, g || {}), houses);
const SRC = (o) => A('house', 'conv30', Object.assign({ id: 'a', addr: 'A', status: 'owned', price: 300000, dp: 20, rate: 6.5, term: 360, io: false, closingPct: 0, growth: 0, extra: 0, paid: 0, rent: 2000, tax: 0, ins: 0, target: 'b', loanId: 'custom' }, o || {}));
const TGT = (o) => A('house', 'conv30', Object.assign({ id: 'b', addr: 'B', status: 'planned', price: 300000, dp: 20, rate: 6.5, term: 360, closingPct: 0, growth: 0, rent: 2000, tax: 0, ins: 0, target: '', loanId: 'custom', buyIn: 0 }, o || {}));
/* the default plan with one business set to merge, so every exit field exists for the edge-input sweep */
function EDGE() { const S = E.seedPlan(); const k = S.houses.find((h) => h.id === 'keystonehv'); Object.assign(k, { exit: 'merge', exitMonth: 200, exitLift: 10, mergeInto: 'auto' }); S.v = DATA_V; return S; }
/* small mixed portfolio used for UI propagation checks */
function SB() {
  const S = mkS({}, [
    A('house', 'conv30', { id: 'a', addr: 'Alpha House', status: 'owned', price: 300000, paid: 12, extra: 200, rent: 3000, tax: 250, ins: 100, growth: 3 }),
    A('house', 'conv30', { id: 'b', addr: 'Bravo House', price: 250000, rent: 2600, tax: 220, ins: 90, growth: null }),
    A('commercial', 'comm25', { id: 'c', addr: 'Charlie Plaza', price: 800000, rent: 8500, tax: 400, ins: 300, hoa: 200, growth: null }),
    A('business', 'sba7a', { id: 'd', addr: 'Delta Biz', price: 400000, rent: 9000, buyIn: 24, growth: 6, exit: 'sell', exitMonth: 100, sellCost: 8 }),
    A('house', 'conv30', { id: 'e', addr: 'Echo House', price: 200000, rent: 2300, tax: 200, ins: 80, buyIn: 6, growth: 3, capex: 15000, capexMonths: 4, arv: 220000, liftIncome: 8, exit: 'merge', exitMonth: 80, exitLift: 10, mergeInto: 'a' })]);
  S.p = E.samplePersonal(); /* the app adds a finance profile on load; the pooled plan nets managers and taxes out of the cash it reinvests, so the engine reference needs the same profile */
  return S;
}

/* independent simulations */
function simBal(h, X, k) { const L = h.price * (1 - h.dp / 100), i = h.rate / 1200, P = i ? L * i / (1 - Math.pow(1 + i, -h.term)) : L / h.term; let b = L; const k0 = h.status === 'owned' ? h.paid || 0 : 0; for (let m = 0; m < k0; m++) b = b * (1 + i) - P; for (let m = 0; m < k; m++) b = Math.max(0, b * (1 + i) - P - X); return Math.max(0, b); }
function simLoc(S, h, t, X) {
  const g = S.g, gr = h.growth == null ? g.appr : h.growth, cl = t.closingPct == null ? g.closing : t.closingPct;
  const L = h.price * (1 - h.dp / 100), i = h.rate / 1200, P = i ? L * i / (1 - Math.pow(1 + i, -h.term)) : L / h.term, k0 = h.status === 'owned' ? (h.paid || 0) : 0;
  let bal = L; for (let m = 0; m < k0; m++) bal = bal * (1 + i) - P; bal = Math.max(0, bal);
  const D = t.price * (t.dp / 100 + cl / 100);
  /* the funder's own monthly cash flow (income after costs and loan payment, before extra) is saved toward the down payment */
  const egi = h.rent * (1 - g.vac / 100), noi = h.type === 'business' ? h.rent : egi - (h.tax + h.ins + h.hoa + g.maint / 100 * h.price / 12 + g.mgmt / 100 * egi);
  let cum = 0; const cap = (h.type === 'business' ? g.capBiz : g.cap) / 100;
  for (let k = 0; k <= 600; k++) { const val = h.price * Math.pow(1 + gr / 100, (k0 + k) / 12); const head = Math.max(0, cap * (1 - g.haircut / 100) * val - bal - (h.liens || 0)); /* appraisal cut is taken off the VALUE; the business cap differs from the real-estate cap */ if (head + cum >= D) return k; /* the saved cash flow GROWS with the asset's income (same rate as its value) and stops while no loan payment is due */ cum += Math.max(0, noi * Math.pow(1 + gr / 100, k / 12) - (bal > 0.005 ? P + (h.mipAnn > 0 ? bal / (1 + (h.mipUp || 0) / 100) * h.mipAnn / 1200 : 0) : 0)); bal = Math.max(0, bal * (1 + i) - (P + X)); }
  return Infinity;
}
let seedR = 12345; const rnd = () => ((seedR = (seedR * 1664525 + 1013904223) % 4294967296) / 4294967296);

/* ================================================================ B: ENGINE (node) */
async function engineChecks() {
  console.log('B. Engine');
  const S0 = mk({}, [TGT({ id: 'a', target: '' })]);
  await check('B01', 'B', 'P&I for 240k @6.5% 30y = 1516.96', 1, 'node: Engine.view(S,h).P', () => { const v = E.view(S0, S0.houses[0]); return { ratio: near(v.P, 1516.96, 0.01) ? 1 : 0, detail: 'got ' + v.P }; });
  await check('B02', 'B', 'Scheduled balance after 60 mo = 224666.35', 1, 'owned paid=60 -> Engine.balToday; and plan series debt[60]', () => {
    const o = mk({}, [SRC({ paid: 60, target: '' })]); const a = E.balToday(o.houses[0]);
    const p = E.plan(mk({}, [TGT({ id: 'a', target: '' })])).series.debt[60];
    const P = new Parts(); P.t(near(a, 224666.35, 0.05), 'balToday(paid 60)', 1, a); P.t(near(p, 224666.35, 0.05), 'plan series debt[60]', 1, p); return P; });
  await check('B03', 'B', 'Balance after 60 mo with +500 extra = 189329.36', 1, 'plan series debt[60] with extra 500', () => {
    const p = E.plan(mk({}, [TGT({ id: 'a', target: '', extra: 500 })])).series.debt[60]; return { ratio: near(p, 189329.36, 0.05) ? 1 : 0, detail: 'got ' + p }; });
  await check('B04', 'B', 'Payoff months with +500 extra = 192', 1, 'Engine.payoffN(h,500)', () => { const v = E.payoffN(S0.houses[0], 500); return { ratio: v === 192 ? 1 : 0, detail: 'got ' + v + ' (scheduled: ' + E.payoffN(S0.houses[0], 0) + ')' }; });
  const chain = (g, X, extra) => mk(g, [SRC(Object.assign({ extra: X }, extra || {})), TGT()]);
  await check('B05', 'B', 'LOC months (D=60k) extra 0/500/1000 = 140/55/34', 2, 'Engine.locMonths', () => {
    const P = new Parts(); [[0, 140], [500, 55], [1000, 34]].forEach(([x, e]) => { const S = chain({}, x); const g = E.locMonths(S, S.houses[0], x); P.t(g === e, 'extra ' + x, 1, 'got ' + g + ' want ' + e); }); return P; });
  await check('B06', 'B', 'extraFor 24 mo = 1543.87, 36 mo = 918.49', 2, 'Engine.extraFor(S,h,24|36)', () => {
    const S = chain({}, 0), P = new Parts(); [[24, 1543.87], [36, 918.49]].forEach(([m, e]) => { const g = E.extraFor(S, S.houses[0], m); P.t(g != null && near(g, e, 0.05), 'months ' + m, 1, 'got ' + g + ' want ' + e); });
    const sol = E.extraFor(S, S.houses[0], 24); if (sol != null) P.t(simLoc(S.g ? S : S, S.houses[0], S.houses[1], sol + 0.5) <= 24 && simLoc(S, S.houses[0], S.houses[1], sol - 3) > 24, 'independent simulation confirms minimality', 1);
    return P; });
  await check('B07', 'B', 'Growth 3%: LOC months extra 0/500 = 48/32 (growth on asset, or g.appr with growth null; the home\'s saved cash flow grows with its rent, so it starts saving once rent growth passes the payment)', 1.5, 'Engine.locMonths with growth=3', () => {
    const P = new Parts(); [[0, 48], [500, 32]].forEach(([x, e]) => { const S = chain({}, x, { growth: 3 }); const g = E.locMonths(S, S.houses[0], x); P.t(g === e, 'asset growth, extra ' + x, 1, 'got ' + g + ' want ' + e);
      const S2 = chain({ appr: 3 }, x, { growth: null }); const g2 = E.locMonths(S2, S2.houses[0], x); P.t(g2 === e, 'g.appr, extra ' + x, 1, 'got ' + g2 + ' want ' + e); }); return P; });
  await check('B08', 'B', 'More extra never delays LOC (monotone, 0..3000 step 50)', 1, 'loop Engine.locMonths over X', () => {
    const P = new Parts(); const S = E.seed(); const h = S.houses.find((x) => x.id === 'maple'); let prev = Infinity, okm = true, bad = ''; for (let x = 0; x <= 3000; x += 50) { const m = E.locMonths(S, h, x); if (m > prev) { okm = false; bad = 'x=' + x + ' ' + m + '>' + prev; } prev = m; }
    P.t(okm, 'sample maple monotone', 1, bad);
    const S2 = chain({ appr: 3, haircut: 10 }, 0, { liens: 20000, growth: null }); prev = Infinity; okm = true; for (let x = 0; x <= 3000; x += 50) { const m = E.locMonths(S2, S2.houses[0], x); if (m > prev) okm = false; prev = m; } P.t(okm, 'with liens/haircut/appr', 1); return P; });
  await check('B09', 'B', 'Purchase order follows the list (A, B, C, D): the trust buys each when the pool of everything before it can pay; months never go backwards; later purchases wait for earlier ones; liens on an earlier asset delay the later ones', 1.5, 'Engine.plan on a 4-asset list', () => {
    const hs = [SRC({ id: 'a', extra: 800, closingPct: null }), TGT({ id: 'b', price: 250000, extra: 300, closingPct: null }), TGT({ id: 'c', price: 220000, closingPct: null }), TGT({ id: 'd', price: 200000, closingPct: null })];
    const S = mk({ closing: 3 }, hs), pl = E.plan(S), P = new Parts(), p = pl.purchase;
    P.t(p.a === 0 && p.b > 0 && p.b <= p.c && p.c <= p.d && isFinite(p.d), 'purchase months finite and nondecreasing down the list', 1, JSON.stringify(p));
    P.t(pl.trust.b.ready === p.b && pl.trust.c.ready === p.c && pl.trust.d.ready === p.d && pl.trust.b.n === 1 && pl.trust.c.n === 2 && pl.trust.d.n === 3, 'each purchase is the first month the pool of the assets before it can pay (pool sizes 1, 2, 3)', 1, JSON.stringify(pl.trust.d));
    P.t(pl.series.count[pl.T] === 4 && pl.series.count[Math.max(0, p.b - 1)] === 1, 'count series steps 1..4', 0.5);
    P.t(pl.funds.b && pl.funds.c && pl.funds.d && !pl.funds.a, 'funds flags: every planned asset is funded by the trust, the owned one is not', 0.5);
    const S2 = mk({ closing: 3 }, hs.map((h) => (h.id === 'b' ? Object.assign({}, h, { liens: 60000 }) : h))); P.t(E.plan(S2).purchase.c > p.c, 'liens on B delay C (and D)', 1); return P; });
  const scen = [['price0', { price: 0 }], ['dp100', { dp: 100 }], ['rate0', { rate: 0 }], ['term12', { term: 12 }], ['huge price', { price: 1e12 }], ['huge extra', { extra: 1e12 }], ['neg price', { price: -1000 }], ['cap0', null, { cap: 0 }], ['cap1000', null, { cap: 1000 }], ['zero income', null, { p1: 0, p2: 0, rentCount: 0 }], ['rent0 zero income', { rent: 0 }, { p1: 0, p2: 0, rentCount: 0 }], ['dp>100', { dp: 150 }], ['closing 100', null, { closing: 100 }], ['driver months wait0', { driver: 'months', wait: 0 }], ['driver months infeasible', { driver: 'months', wait: 1 }, { cap: 10 }],
    ['io rate0', { io: true, rate: 0 }], ['capex huge', { capex: 1e10, arv: 1e10 }], ['sell month 0', { exit: 'sell', exitMonth: 0 }], ['sell neg month + 100% cost', { exit: 'sell', exitMonth: -5, sellCost: 100 }], ['merge nonexistent', { exit: 'merge', mergeInto: 'ghost', exitLift: 500 }], ['lift -100', { arv: -100, liftIncome: -100, capexMonths: -3 }], ['growth -90', { growth: -90 }], ['growth huge', { growth: 1e4 }]];
  await check('B10', 'B', 'No NaN/Infinity leaks in plan series & KPIs (23 edge scenarios)', 2, 'node: Engine.plan on edge states; scan series/today/final/horizon', () => {
    const P = new Parts();
    scen.forEach(([n, h, g]) => { const S = E.seed(); Object.assign(S.g, g || {}); if (h) Object.assign(S.houses[0], h); let bad = null;
      try { const pl = E.plan(S); for (const k in pl.series) for (let t = 0; t < pl.series[k].length; t++) if (!isFinite(pl.series[k][t])) { bad = k + '[' + t + ']=' + pl.series[k][t]; break; }
        for (const o of [pl.today, pl.final, pl.horizon]) for (const k in o) if (typeof o[k] === 'number' && !isFinite(o[k])) bad = bad || ('kpi ' + k + '=' + o[k]);
        pl.snap.forEach((x) => { for (const k of ['equity', 'value', 'debt', 'payment', 'cf']) if (!isFinite(x[k])) bad = bad || ('snap ' + x.id + '.' + k); });
        S.houses.forEach((hh) => { const a = E.afford(S, hh, pl); if (BAD.test(a.txt + ' ' + a.why)) bad = bad || ('afford text: ' + a.why); }); } catch (e) { bad = 'threw ' + e.message; }
      P.t(!bad, n, 1, bad); }); return P; });
  await check('B11', 'B', 'Funding cycles (A<->B, A->A, 3-cycle) do not hang or throw', 1, 'node child process with 5s timeout', () => {
    const code = `const E=require(${JSON.stringify(path.join(V4, 'engine.js'))});const mk=(l)=>({g:Object.assign({},E.GDEF),houses:l.map(h=>E.newHouse(h))});
      const A=(id,t,s)=>({id,target:t,status:s||'planned',buyIn:0});
      const sc=[[A('a','b'),A('b','a')],[A('a','a')],[A('a','b','owned'),A('b','c'),A('c','a')],[A('a','b'),A('b','a','owned')]];
      let out=[];for(const l of sc){const S=mk(l);const pl=E.plan(S);S.houses.forEach(h=>E.afford(S,h,pl));out.push(Object.values(pl.purchase).join(','));}console.log(out.join('|'));`;
    const r = spawnSync(process.execPath, ['-e', code], { timeout: 5000, encoding: 'utf8' });
    return { ratio: r.status === 0 ? 1 : 0, detail: r.status === 0 ? 'ok ' + r.stdout.trim() : 'status ' + r.status + ' ' + (r.error ? r.error.message : '') + (r.stderr || '').slice(0, 200) }; });
  await check('B12', 'B', 'Net worth at t=0 = sum(value - balance - liens) of assets held at t=0', 1, 'node: compare plan.today.nw with independent sum', () => {
    const P = new Parts();
    [{ appr: 0 }, { appr: 3 }].forEach((g) => { const S = mk(g, [SRC({ paid: 24, liens: 10000, target: 'b', growth: null }), TGT({ id: 'b', price: 150000, target: 'c', growth: null }), TGT({ id: 'c', price: 99000, target: '', growth: null })]);
      const pl = E.plan(S); let exp = 0; S.houses.forEach((h) => { if (pl.purchase[h.id] === 0) { const k0 = h.status === 'owned' ? h.paid : 0; exp += h.price * Math.pow(1 + S.g.appr / 100, k0 / 12) - simBal(h, 0, 0) - (h.liens || 0); } });
      P.t(near(pl.today.nw, exp, 1), 'appr ' + g.appr, 1, 'got ' + pl.today.nw + ' want ' + exp); }); return P; });
  await check('B13', 'B', 'plan() under 100ms for the sample and 10-asset chain (median of 7)', 0.5, 'node timing', () => {
    const hs = []; for (let i = 0; i < 10; i++) hs.push(TGT({ id: 'h' + i, status: i ? 'planned' : 'owned', price: 250000 - i * 5000, extra: i * 50, closingPct: null, target: i < 9 ? 'h' + (i + 1) : '' }));
    const time = (S) => { const ts = []; for (let i = 0; i < 7; i++) { const t0 = process.hrtime.bigint(); E.plan(S); ts.push(Number(process.hrtime.bigint() - t0) / 1e6); } ts.sort((a, b) => a - b); return ts[3]; };
    const med = Math.max(time(mk({ closing: 3 }, hs)), time(E.seed()));
    return { ratio: med < 100 ? 1 : med < 300 ? 0.5 : 0, detail: 'median ' + med.toFixed(1) + 'ms' }; });
  await check('B14', 'B', 'locMonths matches independent month-by-month simulation (60 random scenarios incl. liens/haircut/appr/paid)', 1.5, 'node: random states vs simLoc()', () => {
    let exact = 0, close = 0; const N = 60, bad = [];
    for (let n = 0; n < N; n++) { const g = { cap: 60 + Math.floor(rnd() * 30), haircut: Math.floor(rnd() * 20), closing: Math.floor(rnd() * 6), appr: Math.floor(rnd() * 5) };
      const a = SRC({ status: rnd() < 0.5 ? 'owned' : 'planned', price: 150000 + Math.floor(rnd() * 400000), dp: 10 + Math.floor(rnd() * 30), rate: 3 + rnd() * 6, term: [180, 240, 360][Math.floor(rnd() * 3)], paid: Math.floor(rnd() * 120), liens: rnd() < 0.5 ? Math.floor(rnd() * 80000) : 0, growth: null, closingPct: null });
      const b = TGT({ price: 100000 + Math.floor(rnd() * 300000), dp: 15 + Math.floor(rnd() * 15), closingPct: null }); const S = mk(g, [a, b]), X = Math.floor(rnd() * 1500);
      const e = E.locMonths(S, S.houses[0], X), s = simLoc(S, S.houses[0], S.houses[1], X); if (e === s) exact++; if (e === s || Math.abs(e - s) <= 1) close++; else bad.push(`#${n} eng ${e} sim ${s}`); }
    return { ratio: close === N ? (exact === N ? 1 : 0.8) : close / N * 0.6, detail: `exact ${exact}/${N}, within1 ${close}/${N} ${bad.slice(0, 3).join('; ')}` }; });
  await check('B15', 'B', 'Debt cap: the trust never draws more than its pool room (cap% of each asset\'s value less its loan and liens), at every purchase and every month', 1.5, 'node: seed + liens, poolAt(month)', () => {
    const S = E.seed(); S.houses.find((x) => x.id === 'maple').liens = 15000; S.houses.find((x) => x.id === 'cedar').liens = 20000; const pl = E.plan(S), P = new Parts();
    let worst = 0, n = 0; S.houses.forEach((h) => { const tr = pl.trust[h.id]; if (!tr || !tr.pooled) return; n++; worst = Math.max(worst, tr.draw - tr.room); }); let worstM = 0; for (let t = 0; t <= pl.T; t += 6) { const q = pl.poolAt(t); worstM = Math.max(worstM, q.drawn - q.room); }
    P.t(n >= 5 && worst <= 0.01, 'no purchase draws more than the pool room (' + n + ' pooled purchases)', 1, 'worst excess $' + worst.toFixed(0));
    P.t(worstM <= 1, 'the line drawn stays within the pool room in every sampled month', 0.5, 'worst excess $' + worstM.toFixed(0));
    P.t(pl.funds.ridge && pl.funds.north, 'sample purchases are funded by the trust', 0.25);
    P.t(pl.snap.every((x) => x.equity === x.value - x.debt), 'equity = value - debt per asset', 0.5); return P; });
  /* ---- v4 features ---- */
  await check('B16', 'B', 'Loan options: every option listed, per-type lists, applyLoan fills dp/rate/term/io/closing; payment follows', 2, 'node: Engine.LOANS, loansFor, applyLoan, newAsset', () => {
    const P = new Parts(); P.t(E.LOANS.length >= 13 && E.LOANS.some((l) => l.id === 'k203'), E.LOANS.length + ' loan options including FHA 203(k)', 0.5, E.LOANS.length);
    P.t(['house', 'commercial', 'business'].every((t) => E.loansFor(t).length === E.LOANS.filter((l) => l.types.indexOf(t) >= 0).length && E.loansFor(t).length >= 4) && E.loansFor('house').some((l) => l.id === 'k203'), 'every type lists its own options (homes include the FHA 203(k))', 0.5);
    let ok = true, bad = ''; E.LOANS.forEach((l) => { const tp = l.types[0], a = E.newAsset(tp, l.id); if (!(a.dp === l.dp && a.rate === l.rate && a.term === l.term && !!a.io === !!l.io && a.closingPct === l.closing && a.loanId === l.id)) { ok = false; bad += l.id + ' '; } });
    P.t(ok, 'newAsset(type, loanId) applies every option', 1, bad);
    const h = E.newAsset('house', 'conv30', { price: 300000 }), p1 = E.payment(h); E.applyLoan(h, 'conv15'); P.t(h.term === 180 && E.payment(h) > p1, 'applyLoan(conv15) shortens term and raises payment', 0.5);
    E.applyLoan(h, 'cashh'); P.t(E.payment(h) === 0 && E.loan(h) === 0, 'cash purchase has no loan payment', 0.5); return P; });
  await check('B17', 'B', 'Improvements raise value/income only after capexMonths; capex is paid from cash/outside money', 2, 'node: plan with capex 20000, new appraisal 330000, income lift 10, capexMonths 6', () => {
    const P = new Parts(), base = SRC({ target: '', status: 'owned', rent: 3000, tax: 200, ins: 100 }), imp = Object.assign({}, base, { capex: 20000, capexMonths: 6, arv: 330000, liftIncome: 10 });
    const b = E.plan(mk({}, [base])), i = E.plan(mk({}, [imp]));
    const va = (pl, t) => pl.assetsAt(t)[0];
    P.t(near(va(i, 5).value, va(b, 5).value, 0.01) && near(va(i, 5).income, va(b, 5).income, 0.01), 'no change before capexMonths (month 5)', 1);
    P.t(near(va(i, 6).value, 330000, 0.5) && near(va(i, 6).income, va(b, 6).income * 1.1, 0.5), 'value becomes the new appraisal ($330,000) and income +10% from month 6', 1, va(i, 6).value + ' vs ' + va(b, 6).value);
    P.t(near(va(i, 18).value / va(i, 6).value, va(b, 18).value / va(b, 6).value, 1e-6), 'after the appraisal, value keeps growing at the asset growth rate', 0.5);
    const br = (arv) => mk({}, [SRC({ target: 'b', status: 'owned', rent: 3000, tax: 200, ins: 100, growth: 0, capex: 20000, capexMonths: 6, arv }), SRC({ id: 'b', target: '', status: 'planned', buyIn: 200, growth: 0 })]);
    P.t(E.plan(br(330000)).V.a.locM < E.plan(br(0)).V.a.locM, 'a higher appraisal lets the credit line open sooner (value borrowed against)', 0.5, E.plan(br(330000)).V.a.locM + ' vs ' + E.plan(br(0)).V.a.locM);
    P.t(i.horizon.nw > b.horizon.nw - 20001 && i.horizon.outside >= 20000 - 0.5, 'capex counted as outside cash needed (20000)', 1, 'outside ' + i.horizon.outside);
    P.t(i.horizon.cf > b.horizon.cf, 'cash flow higher at horizon', 0.5); return P; });
  const sellS = (extra) => mk({}, [SRC({ target: '', status: 'owned', growth: 3, paid: 0, extra: 0, exit: 'sell', exitMonth: 60, sellCost: 6, liens: 5000, rent: 3000, tax: 200, ins: 100 }), ...(extra || [])]);
  await check('B18', 'B', 'Sale: proceeds = value*(1-cost) - balance - liens - LOC; asset and its cash flow vanish; cash counts in net worth', 3, 'node: exit sell at month 60', () => {
    const P = new Parts(), S = sellS(), pl = E.plan(S), h = S.houses[0], ex = pl.exits.a;
    const val = 300000 * Math.pow(1.03, 5), bal = simBal(h, 0, 60), want = val * 0.94 - bal - 5000;
    P.t(!!ex && ex.month === 60 && near(ex.proceeds, want, 2), 'exits.a.proceeds = value*(1-6%) - balance - liens', 1.2, (ex && ex.proceeds) + ' vs ' + want);
    P.t(near(pl.series.cash[60], want, 2) && near(pl.series.cash[61], want, 2), 'sale cash enters the cash balance', 0.6, pl.series.cash[61]);
    P.t(pl.assetsAt(59).some((x) => x.id === 'a') && !pl.assetsAt(60).some((x) => x.id === 'a'), 'asset held through month 59, gone at 60', 0.5);
    P.t(pl.series.cf[59] > 0 && near(pl.series.cf[61], 0, 0.01) && near(pl.series.monthly[61], 0, 0.01) && near(pl.series.debt[61], 0, 0.01), 'cash flow, payments and debt end after sale', 0.8, pl.series.cf[61]);
    P.t(near(pl.series.nw[61], want, 2) && pl.assetsAt(61).some((x) => x.id === '__cash'), 'net worth afterwards = cash from sale', 0.6, pl.series.nw[61]);
    const sellEarly = E.plan(mk({}, [SRC({ target: '', growth: 3, exit: 'sell', exitMonth: 1, sellCost: 6, liens: 5000 })])).exits.a; P.t(sellEarly && sellEarly.month === 1, 'exit month clamps to after purchase', 0.3);
    return P; });
  await check('B19', 'B', 'Sale cash stays in the trust and funds a later purchase before any borrowing; outside cash only for a true shortfall', 2, 'node: sell a at 60, buy b at 90 for 20000 down', () => {
    const buy = TGT({ id: 'b', price: 100000, dp: 20, buyIn: 90, closingPct: 0 }), P = new Parts();
    const S = sellS([buy]), pl = E.plan(S), proceeds = pl.exits.a.proceeds;
    P.t(proceeds > 20000 && pl.series.cash[89] >= proceeds - 2 && near(pl.series.cash[89] - pl.series.cash[90], 20000, 2), 'cash drops by the down payment at the purchase month (cash = sale proceeds plus cash flow the trust kept)', 1, pl.series.cash[90] + ' from ' + pl.series.cash[89] + ' (proceeds ' + proceeds + ')');
    P.t(near(pl.horizon.outside, 0, 0.5) && pl.trust.b.draw === 0 && near(pl.trust.b.cash, 20000, 0.01), 'no outside cash and no line draw needed: the held cash pays', 0.7, pl.horizon.outside);
    const big = mk({}, [SRC({ growth: 3, exit: 'sell', exitMonth: 60, sellCost: 6, liens: 5000 }), TGT({ id: 'b', price: 2000000, dp: 20, buyIn: 90, closingPct: 0 })]), pb = E.plan(big);
    P.t(!isFinite(pb.purchase.b) && near(pb.horizon.outside, 0, 0.5) && pb.unfunded.join() === 'b', 'a purchase the pool and its cash cannot pay is not funded (never silently paid with outside money)', 0.6, JSON.stringify(pb.purchase));
    const without = E.plan(mk({}, [SRC({ growth: 3, liens: 5000 }), buy])); P.t(near(without.horizon.outside, 0, 0.5) && without.trust.b.pooled && without.trust.b.draw > 0, 'without the sale the same purchase is drawn on the trust line instead', 0.4, without.horizon.outside + ' ' + JSON.stringify(without.trust.b));
    P.t(pl.series.cash[Math.min(pl.T, 100)] > 0 && pl.horizon.nw > E.plan(mk({}, [SRC({ growth: 3, liens: 5000, exit: 'hold' }), buy])).horizon.nw - 1e9, 'cash stays in net worth', 0.3); return P; });
  await check('B20', 'B', 'Merge applies exitLift to value and income at exitMonth; asset stays held', 1.5, 'node: exit merge at 60, lift 20%', () => {
    const P = new Parts(), a = SRC({ target: '', growth: 0, status: 'owned', rent: 3000, tax: 200, ins: 100 }), m = Object.assign({}, a, { exit: 'merge', exitMonth: 60, exitLift: 20, mergeInto: 'z' }), z = TGT({ id: 'z', status: 'owned', target: '' });
    const b = E.plan(mk({}, [a, z])), p = E.plan(mk({}, [m, z])); const v = (pl, t) => pl.assetsAt(t).find((x) => x.id === 'a');
    P.t(near(v(p, 59).value, v(b, 59).value, 0.01) && near(v(p, 60).value, v(b, 60).value * 1.2, 0.5), 'value x1.2 at month 60 only', 1, v(p, 60).value + ' vs ' + v(b, 60).value);
    P.t(near(v(p, 60).income, v(b, 60).income * 1.2, 0.5), 'income x1.2 at month 60', 0.7);
    P.t(p.series.count[100] === 2 && p.mergeAt.a === 60 && !isFinite(p.sellAt.a), 'still held after merge', 0.3); return P; });
  await check('B21', 'B', 'Interest-only loan: balance stays flat, payment = interest; extra payments reduce it', 1.5, 'node: bridge loan', () => {
    const P = new Parts(), io = A('commercial', 'bridge', { id: 'a', price: 1000000, status: 'planned', buyIn: 0, closingPct: 0, growth: 0, rent: 12000, tax: 0, ins: 0, hoa: 0, target: '' });
    const pl = E.plan(mk({}, [io])), L = 700000;
    P.t(io.io === true && near(E.payment(io), L * 0.095 / 12, 0.01), 'payment = interest only', 0.5, E.payment(io));
    let rb = L; const ir = 7.5 / 1200, rp = ir * Math.pow(1 + ir, 300) / (Math.pow(1 + ir, 300) - 1) * L; for (let m = 36; m < 100; m++) rb = rb * (1 + ir) - rp; /* the loan comes due at its 36-month term: the balance is refinanced at 7.5% over 25 years */
    P.t([0, 12, 35, 36].every((t) => near(pl.series.debt[t], L, 0.01)) && near(pl.series.debt[100], rb, 0.05), 'balance flat until the loan comes due at month 36, then amortizes after the refinance (month 100 = ' + rb.toFixed(0) + ')', 1, [0, 12, 36, 100].map((t) => pl.series.debt[t].toFixed(0)).join(','));
    const ex = E.plan(mk({}, [Object.assign({}, io, { extra: 1000 })])); P.t(ex.series.debt[12] < L - 11000 && ex.series.debt[24] < ex.series.debt[12], 'extra payment reduces balance', 0.5, ex.series.debt[12]); return P; });
  await check('B22', 'B', 'Portfolio rule: per-asset shares (snap/assetsAt) sum exactly to series nw/cf/monthly/debt/value at many months', 2, 'node: sample + small states', () => {
    const P = new Parts(); const tests = [['sample', E.seed()], ['small', SB()], ['sell+merge', sellS([TGT({ id: 'b', price: 100000, buyIn: 90, target: '' })])]];
    tests.forEach(([n, S]) => { const pl = E.plan(S); let worst = 0; const ts = [0, 1, 12, 36, 60, 61, 100, 150, 200, pl.planM, pl.T].map((t) => Math.min(pl.T, t));
      ts.forEach((t) => { const l = pl.assetsAt(t), sum = (k) => l.reduce((a, x) => a + x[k], 0), s = pl.series; const asset = l.filter((x) => x.id !== '__cash');
        const pairs = [[sum('equity'), s.nw[t]], [sum('cf'), s.cf[t]], [sum('payment'), s.monthly[t]], [sum('debt'), s.debt[t]], [asset.reduce((a, x) => a + x.value, 0), s.value[t]]];
        pairs.forEach(([a, b]) => { worst = Math.max(worst, Math.abs(a - b) / (1 + Math.abs(b) * 1e-9)); }); });
      const sn = pl.snap, h = pl.horizon; P.t(worst < 0.5, n + ': assetsAt(t) sums = series at 11 months', 0.8, 'worst diff ' + worst.toFixed(3));
      P.t(near(sn.reduce((a, x) => a + x.equity, 0), h.nw, 0.5) && near(sn.reduce((a, x) => a + x.cf, 0), h.cf, 0.5) && near(sn.reduce((a, x) => a + x.payment, 0), h.monthly, 0.5) && near(sn.reduce((a, x) => a + x.debt, 0), h.debt, 0.5), n + ': snap sums = horizon nw/cf/monthly/debt', 1.2); }); return P; });
  await check('B24', 'B', 'FHA 203(k): rehab is financed in the loan (down payment on price + rehab), upfront MIP financed, monthly MIP in cash flow, owner-occupied flag, closing cash excludes rehab', 2, 'node: newAsset(house,k203) vs hand calculation', () => {
    const P = new Parts(), lo = E.LOANS.find((l) => l.id === 'k203'); P.t(!!lo && lo.finRehab && lo.ownerOcc && lo.dp === 3.5, 'k203 option: finRehab, ownerOcc, 3.5% down', 0.3);
    if (!lo) return P;
    const S = mkS({ closing: 3 }, [E.newAsset('house', 'k203', { id: 'k', price: 150000, rent: 1900, tax: 170, ins: 80, growth: 0, buyIn: 12 })]), h = S.houses[0], v = E.view(S, h);
    P.t(h.capex > 0 && h.arv > 0 && h.finCapex === true && h.ownerOcc === true, 'choosing the loan auto-fills a typical rehab and sets financed/owner-occupied flags', 0.4, h.capex + '/' + h.liftValue);
    const L = (150000 + h.capex) * (1 - 0.035) * 1.0175; P.t(near(v.L, L, 1), 'loan = (price + rehab) x 96.5% x 1.0175 = ' + Math.round(L), 0.5, Math.round(v.L));
    P.t(near(v.down, (150000 + h.capex) * 0.035, 0.5), 'down payment = 3.5% of price + rehab', 0.3, Math.round(v.down));
    const mip = (v.L / 1.0175 * 0.55) / 100 / 12; P.t(near(v.mip, mip, 0.5) && near(v.cf, v.noi - v.P - v.mip, 0.5), 'monthly MIP (0.55%/yr of the loan without the financed upfront premium, 24 CFR 203.284) is deducted from cash flow', 0.4, v.mip.toFixed(1));
    const pl = E.plan(S), cash = (150000 * (h.closingPct / 100)) + v.down; P.t(near(pl.horizon.outside, cash, 1), 'cash at closing = down + closing costs only (rehab is financed)', 0.5, Math.round(pl.horizon.outside) + ' vs ' + Math.round(cash));
    const C = mkS({ closing: 3 }, [E.newAsset('house', 'conv30', { id: 'c', price: 150000, rent: 1900, tax: 170, ins: 80, growth: 0, buyIn: 12, capex: h.capex, capexMonths: h.capexMonths, arv: h.arv })]);
    P.t(E.plan(C).horizon.outside > pl.horizon.outside + h.capex * 0.9, 'same house on a conventional loan needs far more cash (rehab paid in cash)', 0.3);
    const f = E.newAsset('house', 'fha', { id: 'f', price: 150000 }); P.t(f.mipUp === 1.75 && f.mipAnn === 0.55 && f.ownerOcc === true && f.finCapex === false, 'FHA now carries mortgage insurance and the owner-occupied flag but does not finance rehab', 0.3);
    return P; });
  await check('B23', 'B', 'Sample portfolio: finite plan, none unfunded, DTI peak below limit, homes cash-flow positive, 20-year numbers sane', 2, 'node: Engine.seed() + plan', () => {
    const P = new Parts(), S = E.seed(), pl = E.plan(S); const ids = E.seed().houses.map((h) => h.id);
    P.t(S.houses.length === SEEDN && ids.every((i) => E.H(S, i)), SEEDN + ' assets with the documented ids', 0.4, S.houses.map((h) => h.id).join(','));
    P.t(['house', 'commercial', 'business'].every((t) => S.houses.some((h) => h.type === t)), 'all three types present', 0.2);
    P.t(!pl.unfunded.length, 'no unfunded assets', 0.4, pl.unfunded.join(','));
    P.t(pl.worst.dti < S.g.dti, 'DTI peak ' + pl.worst.dti.toFixed(1) + ' below limit ' + S.g.dti, 0.4);
    const fin = [pl.horizon.nw, pl.horizon.cf, pl.horizon.monthly, pl.horizon.debt, pl.horizon.dscr, pl.horizon.cltv].every(isFinite); P.t(fin && pl.horizon.nw > 0 && pl.horizon.month === 240, 'horizon (20y) KPIs finite, month 240', 0.3, pl.horizon.nw);
    const homes = S.houses.filter((h) => h.type === 'house'), bad = homes.filter((h) => E.view(S, h).cf < 0).map((h) => h.id); P.t(!bad.length, 'every sample home cash flows >= 0', 0.4, bad.join(','));
    P.t(pl.horizon.cltv <= S.g.cap + 0.5, 'portfolio debt/value within cap', 0.2, pl.horizon.cltv); return P; });
}

/* ================================================================ A: REQUIREMENTS / PROPAGATION */
async function reqChecks(page) {
  console.log('A. Requirements / propagation');
  await page.setViewportSize({ width: 390, height: 844 });
  await check('A01', 'A', 'Add flow: each type x each loan option auto-fills dp/rate/term/closing, opens the asset page, adds a ledger row and changes plan numbers', 4, 'Main > + Add > pick type > pick loan > Add; inspect asset page + main', async () => {
    await reset(page); const P = new Parts(); await goMain(page);
    const b0 = await snap(page); await page.click('[data-testid=add-house]'); await page.waitForTimeout(80);
    P.t((await page.evaluate(() => location.hash)) === '#add' && (await page.locator('[data-testid=loan-options]').count()) === 1 && (await page.locator('[data-addtype]').count()) === 3, '+ Add opens #add page with type segment and loan options', 0.6);
    let prev = b0, nOk = 0, nAll = 0, badFill = [], noChange = [];
    for (const tp of ['house', 'commercial', 'business']) {
      for (const lo of E.loansFor(tp)) {
        nAll++;
        await goHash(page, '#add'); await page.click(`[data-addtype=${tp}]`); const cnt = await page.locator('[data-pickloan]').count();
        if (cnt !== E.loansFor(tp).length) badFill.push(tp + ' options ' + cnt);
        await page.click(`[data-pickloan=${lo.id}]`); await page.click('[data-testid=confirm-add]'); await page.waitForTimeout(100);
        const hash = await page.evaluate(() => location.hash); const id = hash.replace('#house-', '');
        const f = await page.evaluate((id) => { const g = (k) => { const e = document.querySelector(`[data-p="h.${id}.${k}"]`); return e ? parseFloat(e.value.replace(/,/g, '')) : NaN; }; const sel = document.querySelector('[data-loan]'); return { dp: g('dp'), rate: g('rate'), termY: g('termY'), cl: g('closingPct'), loan: sel ? sel.value : null, io: /Interest-only/.test(document.getElementById('app').innerText) }; }, id);
        const okFill = /^#house-/.test(hash) && near(f.dp, lo.dp, 0.01) && near(f.rate, lo.rate, 0.001) && near(f.termY, lo.term / 12, 0.01) && near(f.cl, lo.closing, 0.01) && f.loan === lo.id && f.io === !!lo.io;
        if (!okFill) badFill.push(tp + '/' + lo.id + ' ' + JSON.stringify(f));
        const a = await snap(page);
        const changed = a.rows.length === prev.rows.length + 1 && !!a.row(id) && (a.nw !== prev.nw || a.mon !== prev.mon || a.cf !== prev.cf || /Funded|Bought in|In the trust today|Not funded/.test(a.row(id).dp || '')); /* an add after the chain tail can be unfunded (waits for the previous asset's credit line): then the row says so */
        if (!changed) noChange.push(lo.id + ' rows ' + prev.rows.length + '->' + a.rows.length + ' nw ' + prev.nw + '->' + a.nw);
        if (okFill && changed) nOk++; prev = a;
      } }
    P.t(nOk === nAll, `all ${nAll} type/loan combinations fill terms, open page, add row, change plan (${nOk} ok)`, 3, badFill.concat(noChange).slice(0, 3).join(' | '));
    const st = await store(page); P.t(st && st.houses.length === NSEED + nAll && st.houses.slice(NSEED).every((h) => h.status === 'planned'), 'new assets stored as planned', 0.4, st && st.houses.length);
    return P; });
  await check('A02', 'A', 'Changing an asset\'s loan option re-populates dp/rate/term/closing and changes the plan numbers', 2.5, 'Asset page > Loan option select', async () => {
    await loadState(page, SB(), '#house-b'); const P = new Parts(); const b = await snap(page);
    await goHash(page, '#house-b'); const before = await page.evaluate(() => ({ rate: document.querySelector('[data-p="h.b.rate"]').value, dp: document.querySelector('[data-p="h.b.dp"]').value }));
    const S = SB(), exp = {}; for (const lo of ['dscr', 'conv15', 'fha', 'cashh', 'conv30']) { await goHash(page, '#house-b'); await page.selectOption('[data-loan=b]', lo); await page.waitForTimeout(60);
      const f = await page.evaluate(() => { const g = (k) => parseFloat(document.querySelector(`[data-p="h.b.${k}"]`).value.replace(/,/g, '')); return { dp: g('dp'), rate: g('rate'), termY: g('termY'), cl: g('closingPct') }; }); const L = E.LOANS.find((l) => l.id === lo);
      P.t(near(f.dp, L.dp, 0.01) && near(f.rate, L.rate, 0.001) && near(f.termY, L.term / 12, 0.01) && near(f.cl, L.closing, 0.01), lo + ' fields re-populate', 0.4, JSON.stringify(f));
      const a = await snap(page); const h = E.H(S, 'b'); E.applyLoan(h, lo); const want = E.plan(S).horizon; exp[lo] = a;
      P.t(nearRel(a.nw, want.nw) && nearRel(a.mon, want.monthly) && nearRel(a.cf, want.cf), lo + ' main KPIs equal engine for that loan', 0.4, `ui ${a.nw}/${a.mon} eng ${Math.round(want.nw)}/${Math.round(want.monthly)}`); }
    P.t(exp.dscr.mon !== exp.cashh.mon || exp.dscr.nw !== exp.cashh.nw, 'plan numbers differ between loan options', 0.5);
    await goHash(page, '#house-b'); await setVal(page, '[data-p="h.b.rate"]', '9'); const sel = await page.inputValue('[data-loan=b]'); P.t(sel === 'custom', 'editing the rate switches loan option to Custom', 0.3, sel);
    return P; });

  /* --- edit matrix (UI vs engine on a custom state) --- */
  const setIn = (S, p, v) => { const [t, x, k] = p.split('.'); if (t === 'g') { S.g[x] = v; return; } const h = E.H(S, x); if (k === 'termY') h.term = Math.round(v * 12); else h[k] = v; h.loanId = ['dp', 'rate', 'termY'].includes(k) ? 'custom' : h.loanId; };
  const M = [['h.a.price', 400000], ['h.a.dp', 35], ['h.a.rate', 8], ['h.a.termY', 15], ['h.a.extra', 900], ['h.a.rent', 3600], ['h.a.tax', 500], ['h.a.ins', 200], ['h.a.hoa', 150], ['h.a.liens', 40000], ['h.a.paid', 60], ['h.a.growth', 6], ['h.a.closingPct', 5],
    ['h.b.price', 320000], ['h.b.dp', 30], ['h.c.price', 1200000], ['h.c.rent', 12000], ['h.d.price', 600000], ['h.d.rent', 14000], ['h.d.buyIn', 48], ['h.d.sellCost', 15], ['h.d.exitMonth', 150], ['h.d.growth', 12],
    ['h.e.capex', 40000], ['h.e.capexMonths', 12], ['h.e.arv', 260000], ['h.e.liftIncome', 15], ['h.e.exitLift', 30], ['h.e.exitMonth', 120], ['h.e.buyIn', 30],
    ['g.cap', 60], ['g.vac', 20], ['g.mgmt', 20], ['g.maint', 3], ['g.closing', 10], ['g.haircut', 20], ['g.hrate', 15], ['g.appr', 3], ['g.planYears', 10], ['g.rentCount', 50], ['g.p1', 0], ['g.dti', 5], ['g.otherDebt', 20000]];
  await check('A13', 'A', 'FHA 203(k) through the UI: add flow auto-fills rehab + terms, owner-occupied notice, financed-rehab note, Limited cap warning, switching loan option resets', 2, 'Add page > Home > FHA 203(k)', async () => {
    const P = new Parts(); await reset(page); await goHash(page, '#add'); await page.click('[data-addtype=house]'); await page.waitForTimeout(40);
    P.t((await page.locator('[data-pickloan=k203]').count()) === 1, 'add page lists the 203(k) option for homes', 0.3);
    P.t((await page.locator('[data-pickloan=k203]').innerText()).toLowerCase().includes('rehab') && await page.evaluate(() => { const lo = document.querySelector('[data-testid=loan-options]'), h = [...lo.querySelectorAll('b')].find((b) => /If you will live there/i.test(b.textContent)), k = lo.querySelector('[data-pickloan=k203]'), f = lo.querySelector('[data-pickloan=fha]'); return !!h && !!(h.compareDocumentPosition(k) & Node.DOCUMENT_POSITION_FOLLOWING) && !!(h.compareDocumentPosition(f) & Node.DOCUMENT_POSITION_FOLLOWING) && !!(lo.querySelector('[data-pickloan=conv30]').compareDocumentPosition(h) & Node.DOCUMENT_POSITION_FOLLOWING); }), 'card says rehab financed; FHA and 203(k) are grouped under "If you will live there"', 0.3);
    await page.click('[data-pickloan=k203]'); await page.click('[data-testid=confirm-add]'); await page.waitForSelector('[data-testid=h-payment]');
    const g = (k) => page.inputValue('[data-p$=".' + k + '"]'); const num = (t) => parseFloat(String(t).replace(/[^0-9.\-]/g, ''));
    P.t(num(await g('dp')) === 3.5 && num(await g('rate')) === 7.15 && num(await g('capex')) === 40000 && num(await g('arv')) > 0, 'dp 3.5, rate 7.15, rehab 40,000 and a new appraised value are auto-filled', 0.5, [await g('dp'), await g('rate'), await g('capex')].join('/'));
    P.t((await page.locator('[data-testid=owner-occ]').count()) === 1 && (await page.locator('[data-testid=rehab-financed]').count()) === 1, 'owner-occupied notice and "rehab financed" note shown', 0.4);
    await setVal(page, '[data-p$=".price"]', '200000'); await setVal(page, '[data-p$=".capex"]', '40000'); const arv0 = num(await g('arv'));
    P.t(near(arv0, 276000, 1) && num(await g('gain')) === arv0 - 240000, 'auto-filled appraisal follows price + rehab (200,000 + 40,000 -> 276,000) and shows the value gained', 0.4, arv0 + '/' + await g('gain'));
    await setVal(page, '[data-p$=".gain"]', '70000'); P.t(num(await g('arv')) === 310000, 'typing a value gain of 70,000 sets the appraisal to price + rehab + gain = 310,000', 0.5, await g('arv'));
    await setVal(page, '[data-p$=".capex"]', '50000'); P.t(num(await g('arv')) === 320000 && num(await g('gain')) === 70000, 'the typed gain holds when the rehab changes (appraisal 320,000)', 0.4, await g('arv') + '/' + await g('gain'));
    await setVal(page, '[data-p$=".arv"]', '300000'); P.t(num(await g('gain')) === 300000 - 200000 - 50000, 'typing the appraisal updates the value gained (50,000)', 0.4, await g('gain'));
    await setVal(page, '[data-p$=".gain"]', '-15000'); P.t(num(await g('arv')) === 235000 && (await page.locator('[data-testid=arv-low]').count()) === 1, 'a negative gain gives an appraisal below cost and shows the warning', 0.3, await g('arv'));
    await setVal(page, '[data-p$=".gain"]', '70000'); await setVal(page, '[data-p$=".capex"]', '40000');
    await setVal(page, '[data-p$=".capex"]', '90000'); P.t((await page.locator('[data-testid=k203-cap]').count()) === 1, 'rehab over $75,000 shows the Limited 203(k) cap warning', 0.3);
    await setVal(page, '[data-p$=".capex"]', '40000'); await page.locator('[data-loan]').selectOption('conv30'); await page.waitForTimeout(60);
    P.t(num(await g('dp')) === 20 && (await page.locator('[data-testid=owner-occ]').count()) === 0 && (await page.locator('[data-testid=rehab-financed]').count()) === 0, 'switching to Conventional resets terms and removes the 203(k) notices', 0.4);
    return P; });
  await check('A03', 'A', 'Edit matrix: every input (' + M.length + ' edits incl. improvements/exit/loan/assumptions) moves the main-page KPIs exactly as the engine says', 6, 'Edit field on asset/assumptions page; compare main KPIs with Engine.plan(S).horizon on the edited state', async () => {
    const P = new Parts(); const baseS = SB(), base = E.plan(baseS).horizon; let changing = 0;
    for (const [p, v] of M) {
      let ok = false, info = '';
      try { await loadState(page, SB()); await edit(page, p, v); const a = await snap(page);
        const S = clone(baseS); setIn(S, p, v); E.normalize(S); const w = E.plan(S).horizon;
        const diff = Math.abs(w.nw - base.nw) > 1 || Math.abs(w.monthly - base.monthly) > 1 || Math.abs(w.cf - base.cf) > 1; if (diff) changing++;
        ok = nearRel(a.nw, w.nw) && nearRel(a.mon, w.monthly) && nearRel(a.cf, w.cf); if (!ok) info = `ui nw ${a.nw} mon ${a.mon} cf ${a.cf}; engine ${Math.round(w.nw)} ${Math.round(w.monthly)} ${Math.round(w.cf)}`;
        if (/^g\.(p1|dti|otherDebt)$/.test(p)) { await goHash(page, '#house-a'); const chip = await page.locator('.warnchip').count(); const af = E.afford(S, E.H(S, 'a'), E.plan(S)); const wantChip = af.cls === 'warn' || af.cls === 'bad'; if (p !== 'g.p1' && chip > 0 !== wantChip) { ok = false; info += ' DTI chip ' + chip + ' vs afford ' + af.cls; } }
        if (BAD.test(a.body)) { ok = false; info += ' NaN text'; } } catch (e) { info = 'threw ' + e.message.slice(0, 80); }
      P.t(ok, p + '=' + v, 1, info); }
    P.t(changing >= M.length - 15, 'matrix is meaningful: most edits change the 20-year numbers (' + changing + '/' + M.length + ')', 1.5);
    return P; });

  await check('A04', 'A', 'Two-way back-solves: payoff->extra, down$->%, and main page follows', 3, 'Asset page: type in "Paid off in", "Down payment $"', async () => {
    const P = new Parts(); await loadState(page, SB());
    const S = SB(), a = E.H(S, 'a');
    await loadState(page, SB()); await edit(page, 'h.a.payoff', '120'); const exP = money(await page.inputValue('[data-p="h.a.extra"]'));
    const wantP = pmt(E.balToday(a), a.rate / 1200, 120) - E.payment(a); P.t(near(exP, wantP, 1.01), 'payoff=120 -> extra = amortization solve (~' + wantP.toFixed(0) + ')', 1.6, 'ui ' + exP);
    const pf = parseInt(await page.inputValue('[data-p="h.a.payoff"]')); P.t(pf >= 119 && pf <= 120, 'payoff field stays ~120', 0.4, pf);
    const m = await snap(page); P.t(m.row('a').exN === Math.round(exP), 'main shows the back-solved extra on the row', 0.4, m.row('a').exN + ' vs ' + exP);
    P.t((await page.locator('[data-p="h.a.wait"]').count()) === 0, 'no "Months until LOC" field any more (the trust decides when each asset is funded)', 0.3);
    await loadState(page, SB()); await edit(page, 'h.a.down', '90000'); const dp = parseFloat(await page.inputValue('[data-p="h.a.dp"]')); const ln = money(await page.inputValue('[data-p="h.a.loan"]'));
    P.t(near(dp, 30, 0.01) && near(ln, 210000, 1), 'down$ 90,000 on 300k -> 30%, loan 210,000', 1, dp + ' / ' + ln);
    await edit(page, 'h.a.dp', '25'); const d2 = money(await page.inputValue('[data-p="h.a.down"]')); P.t(near(d2, 75000, 1), 'dp% 25 -> down$ 75,000', 0.5, d2); return P; });

  await check('A05', 'A', 'Remove from the MAIN page: Edit mode, confirm, Undo, totals update; removing a funding source leaves the target listed', 4, 'Main > Edit > Remove > Yes; Undo', async () => {
    await loadState(page, SB()); const P = new Parts(); await goMain(page); const b = await snap(page);
    P.t((await page.locator('[data-testid=row-remove]').count()) === 0, 'no Remove buttons until a row is selected', 0.3);
    await selRow(page, 'a'); const nb = await page.locator('[data-testid=row-remove]').count(); P.t(nb === 1 && (await page.locator('[data-for="a"] [data-testid=row-remove]').count()) === 1, 'selecting a row reveals its Remove button in the row panel (' + nb + ')', 0.5);
    await page.click('[data-for="a"] [data-testid=row-remove]'); await page.waitForTimeout(60);
    const conf = await page.locator('[data-for="a"] .confirm [data-del-yes]').count(); P.t(conf === 1 && (await page.locator('.confirm [data-ask-cancel]').count()) >= 1, 'in-page confirm with Yes / Cancel', 0.5);
    await page.click('.confirm [data-ask-cancel]'); P.t((await page.locator('[data-testid=ledger-row]').count()) === b.rows.length, 'Cancel keeps the asset', 0.3);
    await page.click('[data-for="a"] [data-testid=row-remove]'); await page.click('[data-for="a"] [data-del-yes]'); await page.waitForTimeout(100);
    const a = await snap(page); const S = clone(SB()); E.orderByBuy(S); const Sw = E.without(S, 'a'); E.relink(Sw); const w = E.plan(Sw).horizon; /* the app sorts into buy order once, then relinks funding around the removed asset */
    P.t(a.rows.length === b.rows.length - 1 && !a.row('a'), 'row removed', 0.5);
    P.t(!!a.row('b') && /Bravo/.test(a.row('b').addr), 'funding source removed: its target "Bravo House" is still listed', 0.6);
    P.t(nearRel(a.nw, w.nw) && nearRel(a.mon, w.monthly) && nearRel(a.cf, w.cf) && a.nw !== b.nw, 'KPIs now equal the engine on the portfolio without it', 0.6, `${a.nw} vs ${Math.round(w.nw)}`);
    const st = await store(page); P.t(st.houses.every((h) => h.target !== 'a' && h.mergeInto !== 'a'), 'no stored reference to the removed asset', 0.3);
    P.t((await page.locator('[data-testid=undo-banner]').count()) === 1 && (await page.locator('[data-undo]').count()) === 1, 'Undo banner shown', 0.3);
    await page.click('[data-undo]'); await page.waitForTimeout(80); const u = await snap(page);
    P.t(u.rows.length === b.rows.length && !!u.row('a') && u.nw === b.nw && u.mon === b.mon, 'Undo restores the asset and the totals', 0.6, `${u.rows.length} rows nw ${u.nw} vs ${b.nw}`);
    return P; });
  await check('A06', 'A', 'Main rows follow list order = buy order (sorted once on first load, owned first); each row carries its buy number; no row says owned or planned; the first asset in the list has no wait line and every later one has', 1.5, 'Main ledger on the default plan and on a small state', async () => {
    const P = new Parts(); await reset(page); const s = await snap(page); const st = await store(page), plS = E.plan(E.normalize(clone(st)));
    const cats = ['house', 'commercial', 'business'], byCat = (rows) => cats.map((c) => rows.filter((r) => { const h = st.houses.find((x) => x.id === r.id); return h && h.type === c && !r.sold; }));
    P.t(byCat(s.rows).every((q) => q.every((r, i) => i === 0 || q[i - 1].buy <= r.buy)), 'rows in each category are nondecreasing by purchase month', 0.4, s.rows.map((r) => r.buy).join(','));
    const q = st.houses.map((h) => plS.purchase[h.id]); P.t(st.orderV === 2 && q.every((v, i) => i === 0 || (isFinite(q[i - 1]) ? q[i - 1] <= v || !isFinite(v) : !isFinite(v))), 'saved list is in buy order and flagged (orderV = 2)', 0.2, q.join(','));
    const ordr = st.houses.map((h, i) => [h.id, i]).sort((a, b) => (isFinite(plS.purchase[a[0]]) ? plS.purchase[a[0]] : 1e9) - (isFinite(plS.purchase[b[0]]) ? plS.purchase[b[0]] : 1e9) || a[1] - b[1]).map((x) => x[0]), noOf = {}; ordr.forEach((id, k) => { noOf[id] = k + 1; });
    P.t(s.rows.every((r) => +r.no === noOf[r.id]) && s.rows.length === st.houses.length, 'every row shows its buy number (badge before the name) = its place in buy order', 0.3, s.rows.map((r) => r.no).join(','));
    P.t(s.rows.every((r) => !/\b(owned|planned)\b/i.test(r.text)) && (await page.locator('[data-row] [data-sel], [data-row] .tag').count()) === 0, 'no row says owned or planned, and rows have no Funds picker', 0.3);
    const firstId = st.houses[0].id, others = s.rows.filter((r) => r.id !== firstId && !r.sold);
    P.t(s.row(firstId).dp === '' && others.length > 10 && others.every((r) => /^((\d+ mo after|bought \d+ mo before|bought the same month as)[^·]*· )?(Funded (in \d+ mo|now) by the trust|In the trust|Bought in|Not funded)/.test(r.dp)), 'the very first asset in the list shows no wait line; every later asset shows one (Funded in N mo by the trust / Owned today / Bought in / Not funded)', 0.5, 'first: ' + s.row(firstId).dp.slice(0, 30) + ' later without: ' + others.filter((r) => !r.dp).map((r) => r.id).join(','));
    await loadState(page, SB()); const t = await snap(page), pb = E.plan(SB()); P.t(t.rows.every((r) => r.buy === (isFinite(pb.purchase[r.id]) ? pb.purchase[r.id] : Infinity)) && byCat(t.rows).length > 0, 'small state: buy months follow the engine', 0.2); return P; });
  await check('A07', 'A', 'No "Today" / "20 years" view toggle anywhere (single portfolio snapshot)', 1, 'Scan buttons on main, asset, assumptions, add pages', async () => {
    await reset(page); const P = new Parts(); let toggles = [], dv = 0;
    for (const h of ['#', '#house-maple', '#assumptions', '#add']) { await goHash(page, h); const r = await page.evaluate(() => ({ dv: document.querySelectorAll('[data-view]').length, b: [...document.querySelectorAll('#app button, #app [role=tab]')].map((e) => e.textContent.trim()).filter((t) => /^(today|now|20 ?y(ears?)?|20-year|in 20 years|20 yr)$/i.test(t)) })); dv += r.dv; toggles = toggles.concat(r.b); }
    P.t(dv === 0, 'no [data-view] buttons', 0.5, dv); P.t(!toggles.length, 'no Today/20-year toggle buttons', 0.5, toggles.join(','));
    const m = await snap(page); P.t(/ONE|projected \d+ years|years out/i.test(m.body) || true, 'summary shown once', 0); return P; });
  await check('A08', 'A', 'Homes cannot cash-flow negative: warning on the asset page and on the main page; clears when fixed; not shown for non-homes', 2.5, 'Add default home (negative), inspect both pages; raise rent', async () => {
    await reset(page); const P = new Parts(); const s0 = await snap(page); P.t((await page.locator('[data-testid=home-warning]').count()) === 0, 'sample: no home warning on main', 0.3);
    await goHash(page, '#add'); await page.click('[data-testid=confirm-add]'); await page.waitForTimeout(100); const id = (await page.evaluate(() => location.hash)).replace('#house-', ''); const v = E.view(mkS({}, [E.newAsset('house', 'conv30')]), E.newAsset('house', 'conv30'));
    P.t(v.cf < 0, 'default new home loses money (engine cf ' + v.cf.toFixed(0) + ') - precondition', 0.2);
    P.t((await page.locator('[data-testid=home-loses]').count()) === 1, 'asset page shows home-loses warning', 0.8);
    await goMain(page); const w = await page.locator('[data-testid=home-warning]').count(); const wt = w ? await page.locator('[data-testid=home-warning]').innerText() : ''; P.t(w === 1 && /New home/.test(wt), 'main page shows home-warning naming the home', 0.8, wt.slice(0, 80));
    await edit(page, 'h.' + id + '.rent', '6000'); P.t((await page.locator('[data-testid=home-loses]').count()) === 0, 'asset warning clears when rent raised', 0.3); await goMain(page); P.t((await page.locator('[data-testid=home-warning]').count()) === 0, 'main warning clears', 0.3);
    await goHash(page, '#add'); await page.click('[data-addtype=business]'); await page.click('[data-testid=confirm-add]'); await page.waitForTimeout(80); P.t((await page.locator('[data-testid=home-loses]').count()) === 0, 'business page never shows the home warning', 0.2); return P; });
  await check('A09', 'A', 'Per-row numbers sum to the portfolio headline (cash flow, monthly payments, net worth) on the sample, and match the engine', 3, 'Main page: sum row cash flows / payments / equity vs KPIs', async () => {
    await reset(page); const P = new Parts(); const s = await snap(page); const pl = E.plan(E.seedPlan()), h = pl.horizon;
    P.t(nearRel(s.nw, h.nw, 1, 0.004) && nearRel(s.mon, h.monthly, 1, 0.002) && nearRel(s.cf, h.cf, 1, 0.002), 'KPIs equal Engine.plan(default plan).horizon (net worth shown to $0.1M)', 0.7, `nw ${s.nw} vs ${Math.round(h.nw)}; mon ${s.mon} vs ${Math.round(h.monthly)}; cf ${s.cf} vs ${Math.round(h.cf)}`);
    const cfSum = s.rows.reduce((a, r) => a + (r.cfN || 0), 0); P.t(near(cfSum, s.cf, 0.5 * s.rows.length + 1 + Math.abs(s.cf) * 0.001), 'sum of row cash flows = Cash flow / mo KPI', 0.8, `${Math.round(cfSum)} vs ${s.cf}`);
    const paySum = s.rows.reduce((a, r) => a + (r.sold || !isFinite(r.payN) ? 0 : r.payN), 0); P.t(near(paySum, s.mon, 0.5 * s.rows.length + 1 + Math.abs(s.mon) * 0.001), 'sum of row payments = Total monthly payments KPI', 0.8, `${Math.round(paySum)} vs ${s.mon}`);
    const eq = s.rows.reduce((a, r) => a + r.eqN, 0), cash = s.soldCash; const tot = eq + cash; /* row equity from data-equity; cash kept from sales is the breakdown Sold row */
    P.t(near(tot, s.nw, Math.abs(s.nw) * 0.004 + 1000), 'sum of row equity (+ cash from sales) = Net worth KPI', 0.8, `${Math.round(tot)} vs ${s.nw}`);
    const pr = s.bd['Portfolio']; P.t(!!pr && nearRel(money(pr[1]), s.nw, 1, 0.003) && nearRel(money(pr[2]), s.cf, 1, 0.003), 'breakdown table Portfolio row = KPIs', 0.4, JSON.stringify(pr));
    const exSum = s.rows.reduce((a, r) => a + r.exN, 0); P.t(near(exSum, s.totX, s.rows.length), 'total extra = sum of extra inputs', 0.3, `${exSum} vs ${s.totX}`);
    await setExtra(page, 'maple', '1500'); const a = await snap(page); const S = E.seedPlan(); E.H(S, 'maple').extra = 1500; const w = E.plan(S).horizon;
    P.t(near(a.totX - s.totX, 900, 1) && nearRel(a.mon, w.monthly, 1, 0.006) && nearRel(a.nw, w.nw, 1, 0.006), 'editing a row extra on main updates totals like the engine', 0.5, `monthly ${s.mon}->${a.mon} (engine ${Math.round(w.monthly)})`); return P; });
  await check('A10', 'A', 'Exit and improvements through the UI: Hold/Sell/Merge buttons and fields propagate to rows, KPIs and breakdown', 3.5, 'Asset page > Value-add & exit', async () => {
    await loadState(page, SB(), '#house-b'); const P = new Parts(); const S = SB();
    P.t((await page.locator('[data-testid=exit-section]').count()) === 1 && (await page.locator('[data-exit]').count()) === 3, 'exit section with Hold/Sell/Merge', 0.4);
    await page.click('[data-exit=sell]'); await page.waitForTimeout(50); E.H(S, 'b').exit = 'sell';
    P.t((await page.locator('[data-p="h.b.exitMonth"]').count()) === 1 && (await page.locator('[data-p="h.b.sellCost"]').count()) === 1, 'Sell shows exit month + selling costs', 0.4);
    await setVal(page, '[data-p="h.b.exitMonth"]', '120'); E.H(S, 'b').exitMonth = 120; await setVal(page, '[data-p="h.b.sellCost"]', '7'); E.H(S, 'b').sellCost = 7;
    const pl = E.plan(S); const proceeds = await page.inputValue('[data-p="h.b.proceeds"]').catch(() => ''); P.t(pl.exits.b && near(money(proceeds), pl.exits.b.proceeds, 2), 'Net proceeds field = engine proceeds', 0.8, proceeds + ' vs ' + (pl.exits.b && Math.round(pl.exits.b.proceeds)));
    const s = await snap(page); P.t(nearRel(s.nw, pl.horizon.nw) && /sells in|sold for/.test(s.row('b').exitline) && /sold for/.test(s.row('b').exitline + s.row('d').exitline + s.row('b').pay), 'main KPIs follow; row shows sale', 0.6, s.row('b').exitline);
    const cashRow = Object.keys(s.bd).find((k) => /^Trust cash$/.test(k)); P.t(!!cashRow && s.soldCash > 0 && /Trust cash = cash the trust holds/.test(s.body), 'breakdown shows a "Trust cash" row with the cash the trust holds and the note explains it', 0.4, cashRow);
    await goHash(page, '#house-a'); await page.click('[data-exit=merge]'); await page.waitForTimeout(50); E.H(S, 'a').exit = 'merge'; await page.selectOption('[data-merge=a]', 'e'); E.H(S, 'a').mergeInto = 'e'; await setVal(page, '[data-p="h.a.exitLift"]', '25'); E.H(S, 'a').exitLift = 25; await setVal(page, '[data-p="h.a.exitMonth"]', '90'); E.H(S, 'a').exitMonth = 90;
    const s2 = await snap(page), pl2 = E.plan(S); P.t(nearRel(s2.nw, pl2.horizon.nw) && nearRel(s2.cf, pl2.horizon.cf) && /merges into Echo House/.test(s2.row('a').exitline), 'merge: KPIs follow engine, row shows "merges into"', 0.8, s2.row('a').exitline);
    await goHash(page, '#house-a'); await page.click('[data-exit=hold]'); E.H(S, 'a').exit = 'hold'; const s3 = await snap(page); P.t(nearRel(s3.nw, E.plan(S).horizon.nw), 'back to Hold restores numbers', 0.3);
    await goHash(page, '#house-c'); await setVal(page, '[data-p="h.c.capex"]', '50000'); await setVal(page, '[data-p="h.c.arv"]', '400000'); await setVal(page, '[data-p="h.c.capexMonths"]', '3'); const hc = E.H(S, 'c'); hc.capex = 50000; hc.arv = 400000; hc.capexMonths = 3;
    const s4 = await snap(page); P.t(nearRel(s4.nw, E.plan(S).horizon.nw) && /improve/.test(s4.row('c').exitline), 'improvement budget/lift propagate and show on the row', 0.8, s4.row('c').exitline); return P; });
  await check('A11', 'A', 'Sample portfolio on screen: all rows, three types, sane finite headline, no unfunded warning, no DTI warning', 2, 'Fresh load', async () => {
    await reset(page); const P = new Parts(); const s = await snap(page);
    P.t(s.rows.length === NSEED, NSEED + ' ledger rows', 0.4, s.rows.length); { const stt = await store(page); P.t(['house', 'commercial', 'business'].every((t) => stt.houses.some((h) => h.type === t && s.rows.some((r) => r.id === h.id))) && (await page.locator('[data-testid=cat-count-house]').count()) === 1 && (await page.locator('[data-testid=cat-count-commercial]').count()) === 1 && (await page.locator('[data-testid=cat-count-business]').count()) === 1, 'Home / Commercial / Business rows and category strips present', 0.3); }
    P.t(isFinite(s.nw) && isFinite(s.mon) && isFinite(s.cf) && isFinite(s.dscr) && s.nw > 0 && !BAD.test(s.body), 'KPIs finite and positive, no NaN text', 0.4, `${s.raw.nw} ${s.raw.mon} ${s.raw.cf} ${s.raw.dscr}`);
    P.t(!/never funded|Debt-to-income peaks/.test(s.body), 'no unfunded / DTI-peak warning', 0.5); P.t(/Next: buy/.test(s.headline || '') && /by/.test(s.headline || ''), 'plan headline names the next purchase and completion', 0.2, s.headline);
    P.t((await page.locator('[data-testid=outside-cash]').count()) <= 1, 'outside-cash warning renders at most once', 0.2); return P; });
  await check('A12', 'A', 'Trust funding on screen: every row after the first shows "Funded in N mo by the trust: cash flow $X/mo + borrowing room $Y) · pool of K assets", the numbers match the engine; raising an earlier asset\'s extra opens later purchases sooner', 2, 'Main rows on small state', async () => {
    await loadState(page, SB()); const P = new Parts(); const s = await snap(page), S = SB(), pl = E.plan(S), n0 = (x) => Math.round(x).toLocaleString('en-US');
    const okLoc = ['b', 'c'].every((id) => { const tr = pl.trust[id], m = pl.purchase[id], d = s.row(id).dp; return tr.pooled ? d.includes('Funded in ' + m + ' mo by the trust') && d.includes('cash flow $' + n0(tr.cf) + '/mo') && d.includes('borrowing room $' + n0(tr.room)) && d.includes('pool of ' + tr.n + ' assets') : /^Bought in/.test(d); });
    P.t(okLoc, 'dp-line on each later asset equals the engine trust numbers (month, pooled cash flow, borrowing room, pool size)', 1, s.row('b').dp + ' | ' + s.row('c').dp); P.t(s.row('b').buy === pl.purchase.b && s.row('c').buy === pl.purchase.c, 'buy months equal engine', 0.5);
    await setExtra(page, 'a', '2000'); const a = await snap(page); P.t(a.row('b').buy <= s.row('b').buy && a.row('c').buy <= s.row('c').buy && (a.row('b').buy < s.row('b').buy || a.row('c').buy < s.row('c').buy), 'more extra on an earlier asset -> later assets bought sooner', 0.5, `b ${s.row('b').buy}->${a.row('b').buy} c ${s.row('c').buy}->${a.row('c').buy}`); return P; });
}

/* ================================================================ C: UX */
const routesC = [['main', '#'], ['asset', '#house-maple'], ['assumptions', '#assumptions'], ['add', '#add']];
async function uxChecks(page) {
  console.log('C. UX');
  await check('C01', 'C', 'At 390x844: summary KPIs, plan headline and the first ledger rows are visible without scrolling', 2, 'Open main at 390x844', async () => {
    await page.setViewportSize({ width: 390, height: 844 }); await reset(page); await goMain(page); const P = new Parts();
    const r = await page.evaluate(() => { const b = (s) => { const e = document.querySelector(s); return e ? e.getBoundingClientRect().bottom : 9999; }; return { nw: b('[data-testid=kpi-networth]'), mon: b('[data-testid=kpi-monthly]'), cf: b('[data-testid=kpi-cashflow]'), dscr: b('[data-testid=kpi-dscr]'), head: b('[data-testid=plan-headline]'), row1: b('[data-testid=ledger-row]') }; });
    P.t(r.nw < 844 && r.mon < 844 && r.cf < 844 && r.dscr < 844, 'four KPIs in first viewport', 0.8, JSON.stringify(r)); P.t(r.head < 844, 'plan headline visible', 0.5); P.t(r.row1 < 844, 'first ledger row visible', 0.7); return P; });
  await check('C02', 'C', 'Main page keeps text inputs out of the list: no inputs until a row is selected, then exactly one extra field (none for a sold row)', 1.5, 'Count visible <input> on main before / after selecting a row (sample, and after adding 3)', async () => {
    const P = new Parts(); await reset(page); const cnt = () => page.evaluate(() => [...document.querySelectorAll('#app input')].filter((i) => i.type !== 'hidden' && i.offsetParent).length);
    const plS = E.plan(E.seedPlan()), sold = E.seedPlan().houses.filter((h) => plS.exits[h.id] && plS.sellAt[h.id] <= plS.planM)[0];
    P.t((await cnt()) === 0, 'no text input anywhere on the Portfolio page until a row is selected', 0.6, await cnt());
    await selRow(page, 'maple'); P.t((await cnt()) === 1 && (await page.locator('[data-for=maple] [data-testid=extra-input]').count()) === 1, 'selecting an asset shows exactly one extra-payment field, inside its panel', 0.6);
    await selRow(page, 'maple'); await page.click('[data-row=maple] [data-testid=row-extra-toggle]'); await page.waitForTimeout(50); P.t((await cnt()) === 0, 'tapping the row again closes the panel', 0.2);
    if (sold) { P.t((await page.locator(`[data-row=${sold.id}] [data-testid=row-extra-toggle]`).count()) === 0 && (await cnt()) === 0, 'a sold asset has no Extra button and no extra field', 0.2); }
    for (let i = 0; i < 3; i++) { await goHash(page, '#add'); await page.click('[data-testid=confirm-add]'); await goMain(page); } P.t((await page.locator('[data-testid=ledger-row]').count()) === NSEED + 3, (NSEED + 3) + ' rows after adding 3', 0.2); return P; });
  await check('C03', 'C', 'No horizontal overflow at 320/390/430 on main, asset, assumptions, add, import', 2, 'Resize, check scrollWidth and element rects', async () => {
    const P = new Parts(); await reset(page);
    for (const w of [320, 390, 430]) { await page.setViewportSize({ width: w, height: 844 });
      for (const [n, h] of routesC.concat([['import', '#import-new']])) { await goHash(page, h); const r = await page.evaluate(() => { const W = window.innerWidth; const sw = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth); const off = [...document.querySelectorAll('#app *')].filter((e) => { const b = e.getBoundingClientRect(); return b.width > 0 && (b.right > W + 1 || b.left < -1) && getComputedStyle(e).position !== 'fixed'; }).slice(0, 3).map((e) => e.tagName + '.' + e.className + ' r=' + Math.round(e.getBoundingClientRect().right)); return { sw, W, off }; });
        P.t(r.sw <= r.W && !r.off.length, `${n}@${w}`, 1, `scrollWidth ${r.sw}/${r.W} ${r.off.join(',')}`); } }
    await page.setViewportSize({ width: 390, height: 844 }); return P; });
  await check('C04', 'C', 'Tap targets >= 44x44 (buttons, selects, inputs; label counts for inputs)', 2, 'Measure interactive elements on main/asset/assumptions/add', async () => {
    await reset(page); let tot = 0, ok = 0; const bad = [];
    for (const [n, h] of routesC) { await goHash(page, h); if (n === 'main') { await selRow(page, 'maple'); } const r = await page.evaluate(() => [...document.querySelectorAll('#app button, #app select, #app input, #app a[href], #app [role=button]')].filter((e) => !e.hidden && e.type !== 'hidden' && e.offsetParent).map((e) => { let b = e.getBoundingClientRect(); if (e.tagName === 'INPUT') { const l = e.closest('label'); if (l) b = l.getBoundingClientRect(); } return { w: b.width, h: b.height, d: e.tagName + (e.className ? '.' + String(e.className).split(' ')[0] : '') + '"' + (e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 18) + '"' }; }));
      r.forEach((x) => { tot++; if (x.w >= 43.5 && x.h >= 43.5) ok++; else bad.push(`${n}:${x.d} ${Math.round(x.w)}x${Math.round(x.h)}`); }); }
    const uniq = [...new Set(bad)]; return { ratio: tot ? Math.pow(ok / tot, 1.5) : 0, detail: `${ok}/${tot} targets >=44px. Small: ${uniq.slice(0, 8).join('; ')}` }; });
  await check('C05', 'C', 'All inputs/selects use font-size >= 16px (no iOS zoom)', 1, 'computed font-size', async () => {
    await reset(page); let tot = 0, ok = 0; const bad = [];
    for (const [n, h] of routesC) { await goHash(page, h); const r = await page.evaluate(() => [...document.querySelectorAll('#app input, #app select, #app textarea')].filter((e) => e.type !== 'hidden' && e.offsetParent).map((e) => parseFloat(getComputedStyle(e).fontSize))); r.forEach((f) => { tot++; if (f >= 16) ok++; else bad.push(n + ':' + f); }); }
    return { ratio: tot ? ok / tot : 0, detail: `${ok}/${tot} ok ${bad.slice(0, 5).join(',')}` }; });
  await check('C06', 'C', 'Asset page reachable in 1 tap, back in 1 tap; adding an asset takes <= 3 taps', 2, 'Tap row, Back; Add > Add (defaults)', async () => {
    await reset(page); await goMain(page); const P = new Parts();
    await page.locator('[data-testid=ledger-row] .addr').first().click(); await page.waitForTimeout(100); const h1 = await page.evaluate(() => location.hash); const firstId = (await store(page)).houses[0].id; P.t(h1 === '#house-' + firstId || h1.endsWith('house-' + firstId), 'one tap on the row opens its asset page', 0.5, h1);
    await page.locator('[aria-label=Back]').first().click(); await page.waitForTimeout(100); const h2 = await page.evaluate(() => location.hash); P.t(/^#?$/.test(h2) && (await page.locator('[data-testid=summary]').count()) === 1, 'one Back tap -> main', 0.5, h2);
    const n0 = (await store(page)).houses.length; await page.click('[data-testid=add-house]'); await page.click('[data-testid=confirm-add]'); await page.waitForTimeout(100); P.t((await store(page)).houses.length === n0 + 1 && /#house-/.test(await page.evaluate(() => location.hash)), 'Add + confirm = 2 taps to a new asset', 1); return P; });
  await check('C07', 'C', 'Main page stays compact: <= 150px per ledger row (sample), plan below the ledger', 1, 'Measure ledger rows', async () => {
    await reset(page); await goMain(page); const r = await page.evaluate(() => { const rows = [...document.querySelectorAll('[data-testid=ledger-row]')].map((e) => e.getBoundingClientRect().height); return { avg: rows.reduce((a, b) => a + b, 0) / (rows.length || 1), n: rows.length, h: document.documentElement.scrollHeight }; });
    return { ratio: r.avg <= 150 ? 1 : r.avg <= 220 ? 1 - (r.avg - 150) / 70 : 0, detail: `avg row ${r.avg.toFixed(0)}px x ${r.n}, page ${r.h}px` }; });
  const contrast = async (scheme) => {
    await page.emulateMedia({ colorScheme: scheme }); const fails = []; let tot = 0, ok = 0;
    const pages = [['main', '#'], ['main+chart', '#'], ['asset', '#house-birch'], ['assumptions', '#assumptions'], ['add', '#add']];
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
  await check('C08', 'C', 'Text contrast >= 4.5:1 in light and dark mode (main, chart, asset, assumptions, add)', 2, 'emulate prefers-color-scheme; compute WCAG ratio for every text element', async () => {
    await reset(page); const l = await contrast('light'), d = await contrast('dark'); const tot = l.tot + d.tot, ok = l.ok + d.ok; const f = l.fails.concat(d.fails);
    return { ratio: tot ? Math.pow(ok / tot, 3) : 0, detail: `${ok}/${tot} text elements pass (light ${l.ok}/${l.tot}, dark ${d.ok}/${d.tot}). ${f.slice(0, 6).join('; ')}` }; });
  await check('C09', 'C', 'Summary-first: one concise summary card (single snapshot, short text), plan card collapsible', 1.5, 'Main page at 390x844', async () => {
    await reset(page); await goMain(page); const P = new Parts();
    const r = await page.evaluate(() => { const c = document.querySelector('[data-testid=summary]'); return { len: c ? c.innerText.length : 9999, n: document.querySelectorAll('[data-testid=summary]').length, tg: document.querySelectorAll('[data-testid=timeline-toggle],[data-testid=networth-toggle]').length }; });
    P.t(r.n === 1 && r.len < 600, 'summary card text under 600 chars (' + r.len + ')', 0.7); P.t(r.tg === 2, 'timeline and net-worth charts are opt-in toggles', 0.4);
    const before = await page.evaluate(() => document.querySelectorAll('svg.nw').length); await page.click('[data-testid=networth-toggle]'); const after = await page.evaluate(() => document.querySelectorAll('svg.nw').length); P.t(before === 0 && after === 1, 'net-worth chart opens on demand', 0.4); return P; });
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
      P.t(icons.some((i) => /192/.test(i.sizes)) && icons.some((i) => /512/.test(i.sizes)), '192 and 512 icons', 0.2); }
    return P; });
  await check('D02', 'D', 'Service worker (index.html) registers, activates, controls page after reload; precache complete', 1.5, 'Chromium with SW allowed: navigator.serviceWorker.controller', async () => {
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
    try { await pg.reload(); await pg.waitForSelector('[data-testid=ledger-row]', { timeout: 4000 }); P.t((await pg.locator('[data-testid=ledger-row]').count()) === NSEED, 'offline reload renders the ' + NSEED + '-row ledger', 1); } catch (e) { P.t(false, 'offline reload renders ledger', 1, e.message.slice(0, 80)); }
    try { await pg.goto(BASE + '/', { timeout: 4000 }); await pg.waitForSelector('[data-testid=summary]', { timeout: 3000 }); P.t(true, 'offline start URL "/" works', 0.3); } catch (e) { P.t(false, 'offline start URL "/" works', 0.3, e.message.slice(0, 80)); }
    try { await pg.goto(BASE + '/index.html#assumptions', { timeout: 4000 }); await pg.waitForSelector('[data-testid=export]', { timeout: 3000 }); P.t(true, 'offline deep link', 0.3); } catch (e) { P.t(false, 'offline deep link', 0.3, e.message.slice(0, 80)); }
    try { await pg.goto(BASE + '/index.html#house-maple'); await setVal(pg, '[data-p="h.maple.extra"]', '4321'); await pg.reload(); await pg.waitForSelector('[data-p="h.maple.extra"]'); P.t((await pg.inputValue('[data-p="h.maple.extra"]')).replace(/\D/g, '') === '4321', 'edits persist while offline', 0.4); } catch (e) { P.t(false, 'edits persist while offline', 0.4, e.message.slice(0, 80)); }
    await ctx.setOffline(false); collect.paused = false; return P; });
  await check('D05', 'D', 'Data persists across reload and new tab (localStorage rep-v4, v7); no server round-trip', 1.5, 'Edit extra + address + add asset via the add flow, reload', async () => {
    const P = new Parts(); await reset(page); await edit(page, 'h.maple.extra', '1234'); await edit(page, 'h.maple.addr', 'Zed Lane'); await goHash(page, '#add'); await page.click('[data-testid=confirm-add]'); await page.waitForTimeout(100);
    await page.reload(); await goMain(page); const s = await snap(page); P.t(s.row('maple') && s.row('maple').exN === 1234 && /Zed Lane/.test(s.row('maple').addr), 'edits survive reload', 0.6, JSON.stringify(s.row('maple') && { e: s.row('maple').exN, a: s.row('maple').addr }));
    P.t(s.rows.length === NSEED + 1, 'added asset survives reload', 0.4, s.rows.length); const st = await store(page); P.t(st && st.houses.length === NSEED + 1 && st.v === DATA_V, 'stored in localStorage key rep-v4 with v:7', 0.2, st && st.v);
    const pg2 = await page.context().newPage(); pg2.setDefaultTimeout(4000); await pg2.goto(BASE + '/index.html'); await pg2.waitForSelector('[data-testid=ledger-row]'); P.t((await pg2.locator('[data-testid=ledger-row]').count()) === NSEED + 1, 'second tab sees same data', 0.3); await pg2.close();
    await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('rep-v4')); s.v = 1; localStorage.setItem('rep-v4', JSON.stringify(s)); }); await page.reload(); await goMain(page); P.t((await page.locator('[data-testid=ledger-row]').count()) === NSEED, 'stale data version is replaced by the current sample', 0.2); return P; });
  await check('D06', 'D', 'Backup: Show backup gives valid JSON text; pasted text and file restore state (with confirm); invalid text rejected without damage', 2, 'Assumptions > Show backup; modify; Restore from pasted text / file', async () => {
    const P = new Parts(); await reset(page); await goHash(page, '#assumptions'); await page.click('[data-testid=export]'); await page.waitForTimeout(60);
    const txt = await page.inputValue('[data-testid=backup-text]').catch(() => ''); let j = null; try { j = JSON.parse(txt); } catch (e) {}
    P.t(j && Array.isArray(j.houses) && j.houses.length === NSEED && j.g && j.v === DATA_V && j.houses.find((h) => h.id === 'maple').extra === 600, 'backup text = valid JSON with all ' + NSEED + ' assets + assumptions', 0.6, txt.slice(0, 40));
    await edit(page, 'h.maple.extra', '7777'); await edit(page, 'g.cap', '60'); await goHash(page, '#assumptions');
    await page.fill('#bkin', txt); await page.click('[data-restore-text]'); await page.waitForTimeout(60); P.t((await page.locator('.confirm [data-import-yes]').count()) === 1, 'restore asks for confirmation', 0.3);
    await page.click('[data-import-yes]'); await page.waitForTimeout(100); const s = await store(page); P.t(s && s.houses.find((h) => h.id === 'maple').extra === 600 && s.g.cap === 85, 'pasted backup restores exported state', 0.6, s && s.houses.find((h) => h.id === 'maple').extra + '/' + s.g.cap);
    await goMain(page); const sn = await snap(page); P.t(sn.row('maple').exN === 600, 'UI reflects restored data', 0.2);
    const keep = path.join(os.tmpdir(), 'rep4-backup-' + process.pid + '.json'); fs.writeFileSync(keep, txt); await edit(page, 'h.maple.extra', '5555'); await goHash(page, '#assumptions'); await page.setInputFiles('[data-testid=import-file]', keep); await page.waitForTimeout(250);
    if (await page.locator('[data-import-yes]').count()) await page.click('[data-import-yes]'); await page.waitForTimeout(100); const s3 = await store(page); P.t(s3 && s3.houses.find((h) => h.id === 'maple').extra === 600, 'backup file restores state', 0.5, s3 && s3.houses.find((h) => h.id === 'maple').extra);
    await goHash(page, '#assumptions'); await page.fill('#bkin', '{"nope":1'); await page.click('[data-restore-text]'); await page.waitForTimeout(80); const s2 = await store(page); const body = await page.evaluate(() => document.getElementById('app').innerText);
    P.t(s2 && s2.houses.length === NSEED && /not a valid backup/i.test(body) && (await page.locator('[data-import-yes]').count()) === 0, 'corrupt text rejected with message, data untouched', 0.4);
    try { fs.unlinkSync(keep); } catch (e) {} return P; });
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
  const cases = [['h.maple.price', '0'], ['h.maple.dp', '100'], ['h.maple.dp', '150'], ['h.maple.dp', '-20'], ['h.maple.rate', '0'], ['h.maple.rate', '1000'], ['h.maple.termY', '0'], ['h.maple.price', ''], ['h.maple.price', 'abc'], ['h.maple.price', '-500'], ['h.maple.price', '1e12'], ['h.maple.price', '1000000000000'],
    ['h.maple.extra', '1000000000000'], ['h.maple.rent', '1000000000000'], ['h.maple.tax', '-100'], ['h.maple.payoff', '0'], ['h.maple.payoff', '1'], ['h.maple.payoff', '9999'], ['h.maple.down', '0'], ['h.maple.down', '99999999'],
    ['h.maple.paid', '5000'], ['h.maple.liens', '99999999999'], ['h.maple.growth', '1000'], ['h.maple.growth', '-100'], ['h.maple.closingPct', '1000'],
    ['h.birch.capex', '1000000000000'], ['h.birch.capexMonths', '-5'], ['h.birch.capexMonths', '99999'], ['h.birch.arv', '1000000000000'], ['h.birch.arv', '-100'], ['h.birch.liftIncome', '-1000'], ['h.birch.exitMonth', '0'], ['h.birch.exitMonth', '-9'], ['h.birch.exitMonth', '99999'], ['h.birch.sellCost', '100'], ['h.birch.sellCost', '1000'],
    ['h.keystonehv.exitLift', '10000'], ['h.keystonehv.exitLift', '-50'], ['h.keystonehv.exitMonth', '1'],
    ['g.cap', '0'], ['g.cap', '100'], ['g.cap', '1000'], ['g.dti', '0'], ['g.hrate', '0'], ['g.closing', '1000'], ['g.vac', '100'], ['g.vac', '1000'], ['g.mgmt', '1000'], ['g.appr', '1000'], ['g.appr', '-50'], ['g.haircut', '100'], ['g.haircut', '1000'], ['g.p1', '0'], ['g.rentCount', '1000'], ['g.planYears', '0'], ['g.planYears', '1000'], ['g.planYears', '-4']];
  await check('E01', 'E', 'Edge inputs (' + cases.length + ' cases + compound: zero, 100% down, blanks, garbage, negatives, 1e12, caps, sale/merge/improvement fields) leave no NaN/Infinity/undefined in any page or crash', 3, 'Type each value into the field; scan text + input values on all pages', async () => {
    const P = new Parts(); await loadState(page, EDGE());
    for (const [p, v] of cases) { let bad = []; try { const e0 = collect.errors.length; await edit(page, p, v); bad = await scanBad(page, ['#', '#house-maple', '#house-birch', '#assumptions']); if (collect.errors.length > e0) bad.push('JS error: ' + collect.errors[collect.errors.length - 1].slice(0, 100)); } catch (e) { bad = ['threw ' + e.message.slice(0, 80)]; }
      P.t(!bad.length, p + '=' + JSON.stringify(v), 1, bad[0]); }
    await loadState(page, EDGE()); await edit(page, 'h.maple.price', '0'); await edit(page, 'h.maple.down', '5000'); let b = await scanBad(page); P.t(!b.length, 'price 0 then down$ 5000 (0-division)', 1, b[0]);
    await loadState(page, EDGE()); await edit(page, 'g.p1', '0'); await edit(page, 'g.p2', '0'); await edit(page, 'g.rentCount', '0'); for (const id of ['maple', 'cedar', 'auto']) await edit(page, 'h.' + id + '.rent', '0'); b = await scanBad(page); P.t(!b.length, 'zero income everywhere', 1, b[0]);
    await loadState(page, EDGE()); await edit(page, 'h.maple.price', '300000'); await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('rep-v4')); s.houses.push({ id: 'x1', addr: 'Sparse' }, { id: 'x2', type: 'spaceship', exit: 'nuke', loanId: 5, price: 'abc' }); s.houses[0].target = 'ghost'; s.houses[1].mergeInto = 'ghost'; localStorage.setItem('rep-v4', JSON.stringify(s)); }); await page.reload(); await page.waitForSelector('#app > *'); b = await scanBad(page, ['#', '#house-x1', '#house-x2', '#assumptions']); P.t(!b.length, 'stored/imported state with missing/garbage fields + dangling refs', 1, b[0]);
    await reset(page); await page.evaluate(() => localStorage.setItem('rep-v4', '{not json')); await page.reload(); await page.waitForSelector('#app > *'); P.t((await page.locator('[data-testid=summary]').count()) === 1, 'corrupt localStorage falls back to sample data', 1);
    await loadState(page, EDGE()); await goHash(page, '#house-nonexistent'); P.t((await page.evaluate(() => document.getElementById('app').innerText.length)) > 0 && !BAD.test(await page.evaluate(() => document.getElementById('app').innerText)), 'unknown asset route renders something sane', 0.5);
    return P; });
  await check('E02', 'E', 'Remove all assets (main page) -> clean empty state with add action; can add again', 1.5, 'Edit > Remove each row', async () => {
    await loadState(page, SB()); const P = new Parts(); await goMain(page); let guard = 0;
    while ((await page.locator('[data-testid=ledger-row]').count()) && guard++ < 12) { if (await page.locator('[data-testid=ledger-row] [data-testid=row-extra-toggle]').count()) { await page.locator('[data-testid=ledger-row] [data-testid=row-extra-toggle]').first().click(); await page.locator('[data-testid=row-remove]').first().click(); } else { /* a sold row has no Extra button: tapping it opens its page, which has Remove */ await page.locator('[data-testid=ledger-row] .addr').first().click(); await page.waitForTimeout(80); await page.locator('[data-testid=h-delete]').click(); } await page.locator('[data-del-yes]').first().click(); await page.waitForTimeout(60); await goHash(page, '#'); }
    const t = await page.evaluate(() => document.getElementById('app').innerText); P.t(/none yet/i.test(t) && (await page.locator('[data-testid^=cat-header-]').count()) === 3 && !BAD.test(t) && (await page.locator('[data-testid=ledger-row]').count()) === 0, 'empty state message, no NaN', 0.6, t.slice(0, 80).replace(/\n/g, ' '));
    P.t((await page.locator('[data-testid=add-house]').count()) === 1 && (await page.locator('[data-testid=undo-banner]').count()) === 1, 'Add action and Undo available', 0.3);
    await page.click('[data-testid=add-house]'); await page.click('[data-testid=confirm-add]'); await page.waitForTimeout(80); await goMain(page); P.t((await page.locator('[data-testid=ledger-row]').count()) === 1, 'add after empty works', 0.3); return P; });
  await check('E03', 'E', 'Deleting a funding target clears references (select, storage, plan, merge-into)', 1.5, 'Remove Bravo; Alpha target must reset', async () => {
    await loadState(page, SB()); const P = new Parts(); await goMain(page); await selRow(page, 'b'); await page.click('[data-for="b"] [data-testid=row-remove]'); await page.click('[data-for="b"] [data-del-yes]'); await page.waitForTimeout(100);
    const s = await store(page); P.t(s.houses.every((h) => h.target !== 'b'), 'no asset still targets the deleted id', 0.4, JSON.stringify(s.houses.map((h) => h.target)));
    const s3 = await store(page); const v = (s3.houses.find((h) => h.id === 'a').target || ''); P.t(v !== 'b' && v === (s3.houses.find((h) => h.id === 'a').target || ''), 'Alpha funding select no longer points at the deleted asset (relinked to the next home or cleared)', 0.3, v); const m = await snap(page); P.t(!/Bravo/.test(m.body.replace(/Removed Bravo House\./, '')), 'no mention of deleted asset on main (besides Undo banner)', 0.3);
    await goHash(page, '#house-e'); await page.click('[data-del=e]'); await page.click('[data-del-yes=e]'); await page.waitForTimeout(80); const s2 = await store(page); P.t(s2.houses.every((h) => h.mergeInto !== 'e'), 'merge-into reference cleared too', 0.2);
    await goHash(page, '#house-b'); P.t(!BAD.test(await page.evaluate(() => document.getElementById('app').innerText)), 'visiting a deleted asset URL is safe', 0.3); return P; });
  await check('E04', 'E', 'Every input/select/button has an accessible name (main, asset, assumptions, add, import)', 1, 'aria-label / label / text on all pages', async () => {
    await reset(page); let tot = 0, ok = 0; const bad = [];
    for (const h of ['#', '#house-maple', '#house-birch', '#house-keystonehv', '#assumptions', '#add', '#import-new']) { await goHash(page, h); if (h === '#') await selRow(page, 'maple'); const r = await page.evaluate(() => [...document.querySelectorAll('#app input, #app select, #app button, #app textarea')].filter((e) => e.type !== 'hidden' && !e.hidden).map((e) => { const al = e.getAttribute('aria-label'), lb = e.getAttribute('aria-labelledby'), l = e.labels && e.labels.length ? [...e.labels].map((x) => x.textContent).join('').trim() : '', tx = e.tagName === 'BUTTON' ? e.textContent.trim() : '', ti = e.getAttribute('title'); return { n: !!((al && al.trim()) || lb || l || tx || ti), d: e.tagName + (e.dataset.p || e.dataset.testid || '') }; })); 
      r.forEach((x) => { tot++; if (x.n) ok++; else bad.push(h + ' ' + x.d); }); }
    const names = await page.evaluate(() => 0); return { ratio: tot ? ok / tot : 0, detail: `${ok}/${tot} named. unnamed: ${bad.slice(0, 5).join(', ')}` }; });
  await check('E05', 'E', 'Typing 5 digits sequentially keeps focus + full value (re-render safe) on main, asset, assumptions, text field', 1, 'page.keyboard.type("12345") with delay', async () => {
    await reset(page); const P = new Parts();
    const tryType = async (route, sel, txt, want, label) => { try { await goHash(page, route); if (route === '#') await selRow(page, 'maple'); await page.waitForSelector(sel); await page.evaluate((s) => document.querySelector(s).scrollIntoView({ block: 'center' }), sel); const bb = await page.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, sel);
        await page.mouse.click(bb.x, bb.y); await page.keyboard.press('Control+A'); await page.keyboard.press('Backspace'); await page.keyboard.type(txt, { delay: 60 }); await page.waitForTimeout(150);
        const r = await page.evaluate((s) => { const a = document.activeElement; return { same: !!(a && a.matches && a.matches(s)), v: a ? a.value : null }; }, sel); P.t(r.same && String(r.v).replace(/[,$\s]/g, '') === want, label, 1, `focus kept=${r.same} value=${r.v}`);
        await page.evaluate(() => document.activeElement && document.activeElement.blur()); } catch (e) { P.t(false, label, 1, 'threw ' + e.message.slice(0, 60)); } };
    await tryType('#', '[data-testid=extra-input]', '12345', '12345', 'main extra field'); await tryType('#house-maple', '[data-p="h.maple.price"]', '12345', '12345', 'asset price'); await tryType('#assumptions', '[data-p="g.cap"]', '1234', '1234', 'assumptions field');
    await tryType('#house-maple', '[data-p="h.maple.addr"]', 'Abcde', 'Abcde', 'address text'); await tryType('#house-birch', '[data-p="h.birch.capex"]', '12345', '12345', 'improvement budget'); return P; });
  await check('E08', 'E', 'No render storm: DOM settles when an input is focused (no endless re-render loop)', 1, 'Type one char into any input (no blur), count #app mutations over 600ms (Chromium)', async () => {
    const P = new Parts(); await reset(page);
    for (const [n, h, sel] of [['main extra', '#', '[data-testid=extra-input]'], ['asset price', '#house-maple', '[data-p="h.maple.price"]'], ['assumptions cap', '#assumptions', '[data-p="g.cap"]'], ['exit field', '#house-birch', '[data-p="h.birch.exitMonth"]']]) {
      await goHash(page, h); if (h === '#') await selRow(page, 'maple'); await page.waitForSelector(sel);
      const r = await page.evaluate(async (sel) => { const el = document.querySelector(sel); el.focus(); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, el.value.replace(/,/g, '') || '1'); el.dispatchEvent(new Event('input', { bubbles: true })); await new Promise((r) => setTimeout(r, 80)); let n = 0; const mo = new MutationObserver((m) => { n += m.length; }); mo.observe(document.getElementById('app'), { childList: true, subtree: true }); await new Promise((r) => setTimeout(r, 600)); mo.disconnect(); const a = document.activeElement; if (a && a.blur) a.blur(); return n; }, sel);
      P.t(r <= 20, n + ' (mutations in 600ms while focused)', 1, r); } return P; });
  await check('E06', 'E', 'No layout shift while navigating and editing (CLS <= 0.05)', 0.5, 'PerformanceObserver layout-shift', async () => {
    await reset(page); await page.waitForTimeout(300); for (const h of ['#house-maple', '#assumptions', '#', '#house-cedar', '#add', '#']) await goHash(page, h); await edit(page, 'h.maple.rent', '2500'); await goMain(page); await page.locator('[data-testid=networth-toggle]').click().catch(() => {}); await page.waitForTimeout(300);
    const c = await page.evaluate(() => window.__cls); return { ratio: c <= 0.05 ? 1 : c <= 0.1 ? 0.5 : 0, detail: 'CLS ' + c.toFixed(4) }; });
}

/* ================================================================ main */
(async () => {
  const t0 = Date.now(); const { srv, port } = await startServer(); BASE = 'http://127.0.0.1:' + port;
  console.log('Serving', V4, 'on', BASE);
  browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  let finance = null, sync = null, info = null, gest = null;
  try {
    if (!FIN_ONLY && !SYNC_ONLY && !INFO_ONLY && !GEST_ONLY) {
    await engineChecks();
    const ctx = await mkCtx(); const page = await mkPage(ctx, 'main');
    await reqChecks(page); await uxChecks(page); await robustChecks(page);
    await pwaChecks(page, () => mkCtx({ serviceWorkers: 'allow' }));
    await check('D04', 'D', 'Zero external (non-localhost) network requests across every flow', 1, 'Log all requests from all contexts', () => {
      const ext = collect.requests.filter((u) => !/^(http:\/\/127\.0\.0\.1|http:\/\/localhost|data:|blob:|about:)/.test(u)); return { ratio: ext.length ? 0 : 1, detail: `${collect.requests.length} requests, ${ext.length} external ${ext.slice(0, 3).join(',')}` }; });
    await check('E07', 'E', 'No console errors or page errors during all flows', 1.5, 'Collected over the whole run', () => { const n = collect.errors.length; return { ratio: n === 0 ? 1 : n <= 2 ? 0.5 : 0, detail: n + ' errors: ' + [...new Set(collect.errors)].slice(0, 4).join(' || ') }; });
    /* Category R: realism & market accuracy, written separately */
    try { const R = require('./realism.js'); await R.run({ E, check, Parts, results, benchDir: path.join(__dirname, 'benchmarks'), appDir: V4 }); }
    catch (e) { results.push({ id: 'R00', category: 'R', name: 'Realism module failed to run', points: 30, rawPoints: 30, earned: 0, ratio: 0, detail: 'ERROR: ' + (e && e.message || e), repro: 'node -e "require(\'./realism.js\')"' }); console.log('  [0.00/30] R00 realism module error: ' + (e && e.message)); }
    }
    /* Category F: personal finances, scored separately on its own 90-point scale (does not touch the A-E + R total) */
    if (!SYNC_ONLY && !INFO_ONLY && !MAIN_ONLY && !GEST_ONLY) {
    console.log('F. Personal finances');
    try { finance = await require('./finance-grade.js').run({ E, Parts, mkS, DATA_V, KEY, money, near, nearRel, BAD, mkCtx, mkPage, reset, loadState, goHash, goMain, setVal, store, collect, expandAll, EXPAND_JS }); }
    catch (e) { finance = { earned: 0, max: 90, checks: [{ id: 'F00', category: 'F', name: 'Finance module failed to run', points: 90, earned: 0, ratio: 0, detail: 'ERROR: ' + (e && e.stack || e), repro: 'node -e "require(\'./finance-grade.js\')"' }] }; console.log('  [0.00/90] F00 finance module error: ' + (e && e.message)); }
    }
    /* Category G: number sync, scored separately on its own 100-point scale (does not touch the A-E + R total or F) */
    if (!FIN_ONLY && !INFO_ONLY && !MAIN_ONLY && !GEST_ONLY) {
    console.log('G. Number sync');
    try { sync = await require('./sync-grade.js').run({ E, Parts, mkS, DATA_V, KEY, money, near, nearRel, BAD, mkCtx, mkPage, reset, loadState, goHash, goMain, setVal, store, collect, expandAll, EXPAND_JS, base: () => BASE }); }
    catch (e) { sync = { earned: 0, max: 100, checks: [{ id: 'G00', category: 'G', name: 'Sync module failed to run', points: 100, earned: 0, ratio: 0, detail: 'ERROR: ' + (e && e.stack || e), repro: 'node -e "require(\'./sync-grade.js\')"' }] }; console.log('  [0.00/100] G00 sync module error: ' + (e && e.message)); }
    }
    /* Category H: plain-language help and hourly jobs, scored on its own 100-point scale (does not touch A-E + R, F or G) */
    if (!FIN_ONLY && !SYNC_ONLY && !MAIN_ONLY && !GEST_ONLY) {
    console.log('H. Help (i) buttons and hourly jobs');
    try { info = await require('./info-grade.js').run({ E, Parts, mkS, DATA_V, KEY, money, near, nearRel, BAD, mkCtx, mkPage, reset, loadState, goHash, goMain, setVal, store, collect, expandAll, EXPAND_JS, base: () => BASE }); }
    catch (e) { info = { earned: 0, max: 100, checks: [{ id: 'H00', category: 'H', name: 'Info module failed to run', points: 100, earned: 0, ratio: 0, detail: 'ERROR: ' + (e && e.stack || e), repro: 'node -e "require(\'./info-grade.js\')"' }] }; console.log('  [0.00/100] H00 info module error: ' + (e && e.message || e)); }
    }
    /* Category I: Portfolio sections, reorder, auto-funding, duplicate, extra panel, loan line, swipe back, keyboard dismiss (own 100-point scale) */
    if (!FIN_ONLY && !SYNC_ONLY && !INFO_ONLY && !MAIN_ONLY) {
    console.log('I. Portfolio sections, gestures and funding order');
    try { gest = await require('./gesture-grade.js').run({ E, Parts, mkS, DATA_V, KEY, money, near, nearRel, BAD, mkCtx, mkPage, collect, base: () => BASE }); }
    catch (e) { gest = { earned: 0, max: 100, checks: [{ id: 'I00', category: 'I', name: 'Gesture module failed to run', points: 100, earned: 0, ratio: 0, detail: 'ERROR: ' + (e && e.stack || e), repro: 'node -e "require(\'./gesture-grade.js\')"' }] }; console.log('  I module failed: ' + (e && e.message)); }
    }
  } finally { await browser.close(); srv.close(); }

  const fmt2 = (n) => (Math.round(n * 100) / 100).toFixed(2);
  const finMd = () => { if (!finance) return ''; let m = `\n## F. Personal finances: **${fmt2(finance.earned)} / ${finance.max}** (separate scale; a design review adds 10 later; not included in the A-E + R total)\n\n| ID | Check | Pts | Earned | Detail |\n|---|---|---|---|---|\n`;
    finance.checks.forEach((r) => (m += `| ${r.id} | ${r.name} | ${fmt2(r.points)} | ${fmt2(r.earned)} | ${String(r.detail).replace(/\|/g, '/').replace(/\n/g, ' ').slice(0, 900)} |\n`));
    const ff = finance.checks.filter((r) => r.earned < r.points - 0.001); m += `\n### F failures\n\n`; if (!ff.length) m += 'None.\n'; ff.forEach((r) => (m += `- **${r.id} ${r.name}** (-${fmt2(r.points - r.earned)}): ${String(r.detail).slice(0, 900)}\n  - Reproduce: ${r.repro}\n`)); return m; };
  const syncMd = () => { if (!sync) return ''; let m = `\n## G. Number sync: **${fmt2(sync.earned)} / ${sync.max}** (separate scale; not included in the A-E + R total or in F)\n\n| ID | Check | Pts | Earned | Detail |\n|---|---|---|---|---|\n`;
    sync.checks.forEach((r) => (m += `| ${r.id} | ${r.name} | ${fmt2(r.points)} | ${fmt2(r.earned)} | ${String(r.detail).replace(/\|/g, '/').replace(/\n/g, ' ').slice(0, 1500)} |\n`));
    const ff = sync.checks.filter((r) => r.earned < r.points - 0.001); m += `\n### G failures\n\n`; if (!ff.length) m += 'None.\n'; ff.forEach((r) => (m += `- **${r.id} ${r.name}** (-${fmt2(r.points - r.earned)}): ${String(r.detail).slice(0, 1500)}\n  - Reproduce: ${r.repro}\n`)); return m; };
  const infoMd = () => { if (!info) return ''; let m = `\n## H. Help buttons and hourly jobs: **${fmt2(info.earned)} / ${info.max}** (separate scale; not included in the A-E + R total, F or G)\n\n| ID | Check | Pts | Earned | Detail |\n|---|---|---|---|---|\n`;
    info.checks.forEach((r) => (m += `| ${r.id} | ${r.name} | ${fmt2(r.points)} | ${fmt2(r.earned)} | ${String(r.detail).replace(/\|/g, '/').replace(/\n/g, ' ').slice(0, 1500)} |\n`));
    const ff = info.checks.filter((r) => r.earned < r.points - 0.001); m += `\n### H failures\n\n`; if (!ff.length) m += 'None.\n'; ff.forEach((r) => (m += `- **${r.id} ${r.name}** (-${fmt2(r.points - r.earned)}): ${String(r.detail).slice(0, 1500)}\n  - Reproduce: ${r.repro}\n`)); return m; };
  const gestMd = () => { if (!gest) return ''; let m = `\n## I. Portfolio sections, gestures and funding order: **${fmt2(gest.earned)} / ${gest.max}** (separate scale; not included in A-E + R, F, G or H)\n\n| ID | Check | Pts | Earned | Detail |\n|---|---|---|---|---|\n`;
    gest.checks.forEach((r) => (m += `| ${r.id} | ${r.name} | ${fmt2(r.points)} | ${fmt2(r.earned)} | ${String(r.detail).replace(/\|/g, '/').replace(/\n/g, ' ').slice(0, 1500)} |\n`));
    const ff = gest.checks.filter((r) => r.earned < r.points - 0.001); m += `\n### I failures\n\n`; if (!ff.length) m += 'None.\n'; ff.forEach((r) => (m += `- **${r.id} ${r.name}** (-${fmt2(r.points - r.earned)}): ${String(r.detail).slice(0, 1500)}\n  - Reproduce: ${r.repro}\n`)); return m; };
  if (GEST_ONLY) {
    fs.writeFileSync(path.join(__dirname, 'report-gesture.md'), `# Portfolio gestures grader (GEST_ONLY)\n\nRun: ${new Date().toISOString()}  |  ${((Date.now() - t0) / 1000).toFixed(0)}s\n` + gestMd());
    fs.writeFileSync(path.join(__dirname, 'result-gesture.json'), JSON.stringify({ gest }, null, 2));
    console.log(`\nI Portfolio sections and gestures: ${fmt2(gest.earned)}/${gest.max}  (${((Date.now() - t0) / 1000).toFixed(0)}s)`); return;
  }
  if (INFO_ONLY) {
    fs.writeFileSync(path.join(__dirname, 'report-info.md'), `# Help / hourly-job grader (INFO_ONLY)\n\nRun: ${new Date().toISOString()}  |  ${((Date.now() - t0) / 1000).toFixed(0)}s\n` + infoMd());
    fs.writeFileSync(path.join(__dirname, 'result-info.json'), JSON.stringify({ info }, null, 2));
    console.log(`\nH Help and hourly jobs: ${fmt2(info.earned)}/${info.max}  (${((Date.now() - t0) / 1000).toFixed(0)}s)`); return;
  }
  if (SYNC_ONLY) {
    fs.writeFileSync(path.join(__dirname, 'report-sync.md'), `# Number-sync grader (SYNC_ONLY)\n\nRun: ${new Date().toISOString()}  |  ${((Date.now() - t0) / 1000).toFixed(0)}s\n` + syncMd());
    fs.writeFileSync(path.join(__dirname, 'result-sync.json'), JSON.stringify({ sync }, null, 2));
    console.log(`\nG Number sync: ${fmt2(sync.earned)}/${sync.max}  (${((Date.now() - t0) / 1000).toFixed(0)}s)`); return;
  }
  if (FIN_ONLY) {
    fs.writeFileSync(path.join(__dirname, 'report-finance.md'), `# Finance grader (FINANCE_ONLY)\n\nRun: ${new Date().toISOString()}  |  ${((Date.now() - t0) / 1000).toFixed(0)}s\n` + finMd());
    fs.writeFileSync(path.join(__dirname, 'result-finance.json'), JSON.stringify({ finance }, null, 2));
    console.log(`\nF Personal finances: ${fmt2(finance.earned)}/${finance.max}  (${((Date.now() - t0) / 1000).toFixed(0)}s)`); return;
  }
  /* ---- rescale A-E raw weights proportionally to their category maxima (R keeps its own weights) ---- */
  const rawSum = {}; results.forEach((r) => { rawSum[r.category] = (rawSum[r.category] || 0) + (r.rawPoints != null ? r.rawPoints : r.points); });
  results.forEach((r) => { if (r.category === 'R' || !CATMAX[r.category]) return; const k = CATMAX[r.category] / rawSum[r.category]; r.points = Math.round(r.rawPoints * k * 1000) / 1000; r.earned = Math.round(r.points * (r.ratio != null ? r.ratio : r.earned / r.points) * 1000) / 1000; });

  /* ---- report ---- */
  results.sort((a, b) => a.category.localeCompare(b.category) || a.id.localeCompare(b.id));
  const per = {}; Object.keys(cats).forEach((c) => (per[c] = { earned: 0, max: 0 })); results.forEach((r) => { per[r.category] = per[r.category] || { earned: 0, max: 0 }; per[r.category].earned += r.earned; per[r.category].max += r.points; });
  const total = results.reduce((s, r) => s + r.earned, 0), max = results.reduce((s, r) => s + r.points, 0);
  const f2 = (n) => (Math.round(n * 100) / 100).toFixed(2);
  let md = `# Prototype grader report\n\nTarget: \`prototype/v4\`  |  Run: ${new Date().toISOString()}  |  ${((Date.now() - t0) / 1000).toFixed(0)}s\n\n## Automated score: **${f2(total)} / ${max}** (a separate design review adds 15)\n\n| Category | Score |\n|---|---|\n`;
  Object.keys(cats).forEach((c) => (md += `| ${c}. ${cats[c]} | ${f2(per[c].earned)} / ${f2(per[c].max)} |\n`));
  md += `\n## All checks\n\n| ID | Check | Pts | Earned | Detail |\n|---|---|---|---|---|\n`;
  results.forEach((r) => (md += `| ${r.id} | ${r.name} | ${f2(r.points)} | ${f2(r.earned)} | ${String(r.detail).replace(/\|/g, '/').replace(/\n/g, ' ').slice(0, 400)} |\n`));
  const fails = results.filter((r) => r.earned < r.points - 0.001).sort((a, b) => (b.points - b.earned) - (a.points - a.earned));
  md += `\n## Top failures\n\n`; if (!fails.length) md += 'None.\n'; fails.slice(0, 15).forEach((r, i) => (md += `${i + 1}. **${r.id} ${r.name}** (-${f2(r.points - r.earned)})\n   - Detail: ${String(r.detail).slice(0, 500)}\n   - Reproduce: ${r.repro}\n`));
  md += finMd() + syncMd() + infoMd() + gestMd();
  fs.writeFileSync(path.join(__dirname, 'report.md'), md);
  fs.writeFileSync(path.join(__dirname, 'result.json'), JSON.stringify({ total: +f2(total), max, categories: per, results, finance, sync, info, gest }, null, 2));
  console.log('\nCategory scores:'); Object.keys(cats).forEach((c) => console.log(`  ${c}  ${f2(per[c].earned)} / ${f2(per[c].max)}  ${cats[c]}`));
  console.log(`\nTOTAL ${f2(total)} / ${max}`);
  if (finance) console.log(`\nF Personal finances: ${fmt2(finance.earned)}/${finance.max}`);
  if (sync) console.log(`\nG Number sync: ${fmt2(sync.earned)}/${sync.max}`);
  if (info) console.log(`\nH Help and hourly jobs: ${fmt2(info.earned)}/${info.max}`);
  if (gest) console.log(`\nI Portfolio sections and gestures: ${fmt2(gest.earned)}/${gest.max}`);
  try { delete require.cache[require.resolve('./logic-grade.js')]; const L = require('./logic-grade.js'); console.log(`\nL Logic and math: ${fmt2(L.total)}/${L.max} (details: grader/logic/report.md)`); } catch (e) { console.log('\nL Logic grader failed: ' + e.message); }
})().catch((e) => { console.error('GRADER CRASH', e); process.exit(2); });
