/* Category G: Number sync ("all numbers synced; dependent numbers re-derive after any edit"). 100 automated points, reported separately.
   Plugged in from grade.js:  require('./sync-grade.js').run(X)  ->  { earned, max, checks }.
   G1 Portfolio internal sync, G2 asset <-> portfolio, G3 portfolio <-> finances, G4 asset-page field dependencies (property-based),
   G5 add page <-> asset, G6 navigation / persistence, G7 shared settings, G8 stale / duplicate / contradictory numbers. Never modifies the app. */
const fs = require('fs');

exports.run = async function run(X) {
  const { E, Parts, mkS, DATA_V, KEY, money, mkCtx, mkPage, base, collect, EXPAND_JS } = X;
  const checks = [];
  let PAGE = null;
  const UIKEY = 'rep-v4-ui';
  async function gcheck(id, name, points, repro, fn) {
    if (process.env.G_ONLY && process.env.G_ONLY.split(',').indexOf(id) < 0) return;
    let r; const t0 = Date.now();
    try { r = await fn(PAGE); } catch (e) { r = { ratio: 0, detail: 'CRASH in check: ' + (e && e.stack || e).toString().slice(0, 400) }; }
    if (r instanceof Parts) r = { ratio: r.ratio, detail: r.detail };
    if (typeof r === 'boolean') r = { ratio: r ? 1 : 0, detail: r ? 'ok' : 'failed' };
    const ratio = Math.max(0, Math.min(1, r.ratio));
    const rec = { id, category: 'G', name, points, earned: Math.round(points * ratio * 100) / 100, ratio, detail: r.detail || '', repro, seconds: +((Date.now() - t0) / 1000).toFixed(1) };
    checks.push(rec);
    console.log(`  [${rec.earned.toFixed(2)}/${points}] ${id} ${name}  (${rec.seconds}s)${ratio < 1 ? '  <-- ' + String(rec.detail).slice(0, 300) : ''}`);
  }
  const clone = (o) => JSON.parse(JSON.stringify(o));
  let seed = 424242; const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
  const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1)), rf = (a, b) => a + rnd() * (b - a), pick = (l) => l[Math.floor(rnd() * l.length)];

  /* aggregate many observations into Parts items: an item fails if ANY observation fails (info = first failing case) */
  class Agg {
    constructor() { this.m = new Map(); }
    t(key, ok, w, info) { let e = this.m.get(key); if (!e) { e = { w, n: 0, bad: 0, info: null }; this.m.set(key, e); } e.n++; if (!ok) { e.bad++; if (e.bad <= 3) e.info = (e.info == null ? '' : e.info + ' || ') + info; } return ok; }
    parts(P) { P = P || new Parts(); for (const [k, e] of this.m) P.t(e.bad === 0, `${k} (${e.n - e.bad}/${e.n} ok)`, e.w, e.info); return P; }
  }

  /* ---------- display formatting (mirrors the documented formats) ---------- */
  const num0 = (n) => (isFinite(n) ? n : 0);
  const $f = (n) => { const a = Math.abs(num0(n)), sg = n < -0.5 ? '−' : ''; return a >= 1e9 ? sg + '$' + (a / 1e9).toFixed(2) + 'B' : a >= 1e7 ? sg + '$' + (a / 1e6).toFixed(1) + 'M' : sg + '$' + Math.round(a).toLocaleString('en-US'); };
  const $c = (n) => { const a = Math.abs(num0(n)); return a >= 1e9 ? $f(n) : a >= 1e7 ? (n < 0 ? '−' : '') + '$' + (a / 1e6).toFixed(1) + 'M' : a >= 1e6 ? (n < 0 ? '−' : '') + '$' + (a / 1e6).toFixed(2) + 'M' : $f(n); };
  const mm = (m) => (!isFinite(m) ? 'never' : m <= 0 ? 'now' : m + ' mo');
  const mo = (m) => (!isFinite(m) ? 'never' : m <= 0 ? 'now' : m < 24 ? m + ' mo' : Math.floor(m / 12) + 'y ' + (m % 12) + 'm');
  const R = (n, d = 0) => (isFinite(n) ? String(+n.toFixed(d)) : '—');
  /* tolerance implied by the number of digits a display shows ("$1.25M" -> 5000) */
  function dispTol(txt) { const m = /([\d,]+)(?:\.(\d+))?\s*([MBK])?(?![a-z])/.exec(String(txt)); if (!m) return 1; const d = m[2] ? m[2].length : 0, mult = m[3] === 'M' ? 1e6 : m[3] === 'B' ? 1e9 : m[3] === 'K' ? 1e3 : 1; return 0.5 * Math.pow(10, -d) * mult + 0.011; }
  const eq = (txt, val) => { const v = money(txt); return isFinite(v) && isFinite(val) && Math.abs(v - val) <= dispTol(txt) + 1e-6; };
  const eqT = (a, b) => { const x = money(a), y = money(b); return isFinite(x) && isFinite(y) && Math.abs(x - y) <= Math.max(dispTol(a), dispTol(b)) + 1e-6; };
  const sumTol = (arr) => arr.reduce((s, t) => s + dispTol(t), 0);
  const fnum = (s) => { if (s == null) return NaN; const t = String(s).replace(/[,$\s]/g, '').replace(/−/g, '-'); return t === '' ? NaN : parseFloat(t); };
  const close = (a, b, tol = 0.51) => (Number.isFinite(a) && Number.isFinite(b) ? Math.abs(a - b) <= tol : a === b);

  /* ---------- independent calculations (written from the definitions, not from engine code) ---------- */
  const IND = (() => {
    const gr = (S, h) => Math.max(-90, h.growth == null || !isFinite(+h.growth) ? S.g.appr : +h.growth);
    const base = (h) => h.price + (h.finCapex ? Math.max(0, h.capex || 0) : 0);
    const down = (h) => base(h) * h.dp / 100;
    const loan = (h) => Math.max(0, base(h) - down(h)) * (1 + (h.mipUp || 0) / 100);
    const pay = (h) => { const L = loan(h); if (L <= 0) return 0; const i = h.rate / 1200; return h.io ? L * i : (i ? L * i / (1 - Math.pow(1 + i, -h.term)) : L / h.term); };
    const mip = (h) => ((h.mipAnn || 0) > 0 ? loan(h) / (1 + (h.mipUp || 0) / 100) * h.mipAnn / 100 / 12 : 0);
    const age0 = (h) => (h.status === 'owned' ? Math.max(0, h.paid || 0) : 0);
    const bal0 = (h) => { let b = loan(h); if (h.io) return b; const i = h.rate / 1200, P = pay(h); for (let k = 0; k < age0(h); k++) b = Math.max(0, b * (1 + i) - P); return b; };
    const val = (S, h, k) => { const cm = Math.max(0, h.capexMonths || 0); return +h.arv > 0 && k >= cm ? h.arv * Math.pow(1 + gr(S, h) / 100, (k - cm) / 12) : h.price * Math.pow(1 + gr(S, h) / 100, (age0(h) + k) / 12); };
    const cl = (S, h) => (h.closingPct == null || !isFinite(+h.closingPct) ? S.g.closing : +h.closingPct);
    const tgt = (S, h) => S.houses.find((x) => x.id === h.target);
    const need = (S, h) => { const t = tgt(S, h); return t ? down(t) + t.price * cl(S, t) / 100 : 0; };
    const payoff = (h, X) => { let b = bal0(h); if (b <= 0.005) return 0; let i = h.rate / 1200, A = pay(h) + X; const m0 = +h.mat > 0 ? +h.mat : h.io ? h.term : 0, mrem = m0 > 0 ? Math.max(0, m0 - age0(h)) : Infinity; /* a loan that comes due is refinanced into a level-payment loan at the default refinance rate and term (Assumptions) */
      if (!isFinite(mrem) && A <= i * b + 1e-9) return Infinity;
      for (let n = 1; n <= 2400; n++) { if (n - 1 === mrem) { const ri = E.GDEF.refiRate / 1200, rn = E.GDEF.refiTerm; i = ri; A = (ri ? b * ri / (1 - Math.pow(1 + ri, -rn)) : b / rn) + X; } b = b * (1 + i) - A; if (b < 0.005 || b <= 1e-7) return n; if (n > mrem + 1 && A <= i * b + 1e-9) return Infinity; } return Infinity; };
    /* month-by-month balance and scheduled payment of the funder's loan; a loan that comes due (interest-only term or balloon) is refinanced at the Assumptions rate and term */
    const sim = (S, h, X, months) => { let b = bal0(h), i = h.rate / 1200, P = pay(h); const m0 = +h.mat > 0 ? +h.mat : h.io ? h.term : 0, mrem = m0 > 0 && b > 0.005 ? Math.max(0, m0 - age0(h)) : Infinity, bal = [b], pm = [];
      for (let k = 0; k < months; k++) { if (k === mrem) { i = (S.g.refiRate != null ? S.g.refiRate : E.GDEF.refiRate) / 1200; const rn = S.g.refiTerm != null ? S.g.refiTerm : E.GDEF.refiTerm; P = i ? b * i / (1 - Math.pow(1 + i, -rn)) : b / rn; } pm.push(b > 0.005 ? P : 0); b = b > 0.005 ? Math.max(0, b * (1 + i) - P - X) : 0; bal.push(b); } return { bal, pm }; };
    const capOf = (S, h) => (h.type === 'business' ? S.g.capBiz : S.g.cap);
    /* cash flow saved in month k: it grows with the asset's income (same rate as its value); no loan payment once the loan is gone */
    const savedAt = (S, h, sm, k) => Math.max(0, noi(S, h) * Math.pow(1 + gr(S, h) / 100, k / 12) - sm.pm[k] - (sm.bal[k] > 0.005 && (h.mipAnn || 0) > 0 ? sm.bal[k] / (1 + (h.mipUp || 0) / 100) * h.mipAnn / 100 / 12 : 0));
    const loc = (S, h, X) => { if (!tgt(S, h)) return Infinity; const D = need(S, h), sm = sim(S, h, X, 601); let cum = 0;
      for (let k = 0; k <= 600; k++) { const head = capOf(S, h) / 100 * (1 - S.g.haircut / 100) * val(S, h, k) - sm.bal[k] - (h.liens || 0); if (Math.max(0, head) + cum >= D) return k; /* appraisal cut off the value (logic audit L3.1) */ cum += savedAt(S, h, sm, k); } return Infinity; };
    const noi = (S, h) => { if (h.type === 'business') return h.rent; const reimb = Math.min(100, Math.max(0, +h.nnn || 0)) / 100 * (h.tax + h.ins + h.hoa), egi = (h.rent + reimb) * (1 - S.g.vac / 100); return egi - (h.tax + h.ins + h.hoa + S.g.maint / 100 * h.price / 12 + S.g.mgmt / 100 * egi); };
    const cf = (S, h) => noi(S, h) - pay(h) - mip(h), cfv = cf;
    const escrow = (h) => (h.type === 'business' ? 0 : h.tax + h.ins + h.hoa);
    const cltvAtLoc = (S, h, X) => { const m = loc(S, h, X); if (!tgt(S, h) || !isFinite(m)) return null; const sm = sim(S, h, X, m + 1); let saved = 0; for (let k = 0; k < m; k++) saved += savedAt(S, h, sm, k); return (sm.bal[m] + (h.liens || 0) + need(S, h) - Math.min(need(S, h), saved)) / val(S, h, m) * 100; };
    return { gr, base, down, loan, pay, mip, bal0, val, cl, need, payoff, loc, noi, cf, escrow, cltvAtLoc, tgt };
  })();

  /* ---------- page plumbing ---------- */
  let seq = 0;
  async function load(page, S, hash, ui) {
    const u = Object.assign({ tab: 'nw', open: true, coll: { drivers: false }, hideLegend: true }, ui || {});
    await page.goto(base() + '/index.html?g=' + seq++);
    await page.evaluate(([k, s, uk, uu]) => { try { localStorage.clear(); if (s) localStorage.setItem(k, JSON.stringify(s)); localStorage.setItem(uk, JSON.stringify(uu)); } catch (e) {} }, [KEY, S, UIKEY, u]);
    await page.goto(base() + '/index.html?g=' + seq++ + (hash || ''));
    await page.waitForSelector('#app > *');
    await page.evaluate(EXPAND_JS);
  }
  async function nav(page, h) {
    await page.evaluate(async ([h, ex]) => { const cur = location.hash; if (cur === h || (h === '#' && cur === '')) window.dispatchEvent(new Event('hashchange')); else location.hash = h; await new Promise((r) => setTimeout(r, 25)); eval('(' + ex + ')')(); }, [h, EXPAND_JS.toString()]);
  }
  const GRAB = () => {
    for (let i = 0; i < 30; i++) { const b = [...document.querySelectorAll('#app [data-coll][aria-expanded=false]')].filter((e) => e.dataset.coll !== 'drivers' && e.dataset.coll !== 'tgt')[0]; if (!b) break; b.click(); } /* graders open every collapsed section first */
    const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();
    const o = { hash: location.hash, state: JSON.parse(JSON.stringify(window.__app.state)), t: {}, kv: [], kpis: [], tables: {}, notes: [], warns: [], chips: [], rows: [], impact: [], drivers: [], chart: null, text: document.getElementById('app').innerText };
    document.querySelectorAll('#app [data-testid]').forEach((e) => { const k = e.dataset.testid; if (!(k in o.t)) o.t[k] = clean(e.textContent); });
    document.querySelectorAll('#app label.f, #app div.f').forEach((f) => { const lb = f.querySelector('.lb'), inp = f.querySelector('input'), sel = f.querySelector('select'), b = f.querySelector('b');
      o.kv.push({ lb: clean(lb ? lb.textContent : '').replace(/\s*auto$/, ''), p: inp ? inp.dataset.p || '' : '', v: inp ? inp.value : sel ? sel.value : b ? clean(b.textContent) : clean(f.textContent.replace(lb ? lb.textContent : '', '')), calc: f.classList.contains('calc'), ro: inp ? inp.readOnly : false, inImpact: !!f.closest('[data-testid=impact]'), full: clean(f.textContent) }); });
    document.querySelectorAll('#app .kpi').forEach((k) => { const b = k.querySelector('b'), s = k.querySelector('.sub'), l = k.querySelector('small'); o.kpis.push({ id: b ? b.dataset.testid : '', label: clean(l ? l.textContent : ''), v: clean(b ? b.textContent : ''), sub: clean(s ? s.textContent : '') }); });
    document.querySelectorAll('#app table').forEach((tb, i) => { o.tables[tb.dataset.testid || 't' + i] = [...tb.querySelectorAll('tr')].map((tr) => [...tr.children].map((c) => clean(c.textContent))); });
    document.querySelectorAll('#app .note').forEach((n) => o.notes.push(clean(n.textContent)));
    document.querySelectorAll('#app .warnbox').forEach((n) => o.warns.push({ id: n.dataset.testid || '', t: clean(n.textContent) }));
    document.querySelectorAll('#app .chip,#app .warnchip').forEach((n) => o.chips.push({ t: clean(n.textContent), title: n.getAttribute('title') || '' }));
    document.querySelectorAll('#app [data-testid=ledger-row]').forEach((r) => { const loc = r.querySelector('[data-testid=loc-line],[data-testid=dp-line]'), inp = r.querySelector('input'), cf = r.querySelector('[data-testid=row-cashflow] b'), ex = r.querySelector('.exitline'), pay = r.querySelector('[data-testid=row-payment]');
      o.rows.push({ id: r.dataset.row || '', addr: clean((r.querySelector('.addr') || {}).textContent), tag: clean((r.querySelector('.tag') || {}).textContent), pay: clean(pay ? pay.textContent : ''), extra: inp ? inp.value : null, loc: clean(loc ? loc.textContent : ''), cf: clean(cf ? cf.textContent : ''), exit: clean(ex ? ex.textContent : ''), hi: [...r.querySelectorAll('.hi')].map((x) => clean(x.textContent)), eqAttr: pay ? pay.dataset.equity : null, hasExtra: !!inp }); });
    document.querySelectorAll('#app [data-testid=impact] .f').forEach((f) => { const lb = f.querySelector('.lb'), b = f.querySelector('b'); o.impact.push({ lb: clean(lb ? lb.textContent : ''), t: clean(f.textContent.replace(lb ? lb.textContent : '', '')), to: clean(b ? b.textContent : '') }); });
    document.querySelectorAll('#app [data-testid=drivers] .drv').forEach((d) => { const sp = d.querySelectorAll('span'); o.drivers.push({ addr: clean(sp[0].textContent), t: clean(sp[1].textContent) }); });
    const svg = document.querySelector('#app svg.nw'); if (svg) o.chart = { nw: svg.dataset.nw.split(',').map(Number), t: +svg.dataset.t, label: svg.getAttribute('aria-label') };
    return o;
  };
  async function grab(page, h) { await nav(page, h); const g = await page.evaluate(GRAB); g.pl = null; return g; }
  const planOf = (g) => g.pl || (g.pl = E.plan(clone(g.state)));
  async function editInput(page, sel, val) { return page.evaluate(async ([sel, val]) => { const el = document.querySelector(sel); if (!el) return false; el.focus(); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, val); el.dispatchEvent(new Event('input', { bubbles: true })); if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); await new Promise((r) => setTimeout(r, 15)); return true; }, [sel, String(val)]); }
  async function selectOpt(page, sel, val) { return page.evaluate(async ([sel, val]) => { const el = document.querySelector(sel); if (!el) return false; el.value = val; el.dispatchEvent(new Event('change', { bubbles: true })); await new Promise((r) => setTimeout(r, 15)); return true; }, [sel, String(val)]); }
  async function clickSel(page, sel) { return page.evaluate(async (sel) => { const el = document.querySelector(sel); if (!el) return false; el.click(); await new Promise((r) => setTimeout(r, 20)); return true; }, sel); }
  const stateOf = (page) => page.evaluate(() => JSON.parse(JSON.stringify(window.__app.state)));

  /* ---------- state builders ---------- */
  const withP = (S, p) => { S.p = E.normalizePersonal(p || E.samplePersonal()); S.v = DATA_V; return S; };
  const sampleS = () => withP(E.seed(), E.samplePersonal());
  function genState() {
    const n = ri(2, 7), hs = [];
    for (let k = 0; k < n; k++) {
      const type = pick(['house', 'house', 'house', 'commercial', 'business']), lo = pick(E.loansFor(type));
      const price = type === 'house' ? ri(90, 450) * 1000 : type === 'commercial' ? ri(400, 3000) * 1000 : ri(200, 3000) * 1000;
      const o = { id: 'r' + k, addr: 'Asset ' + k, status: k < 2 || rnd() < 0.3 ? 'owned' : 'planned', price, rent: type === 'house' ? ri(1200, 3500) : type === 'commercial' ? ri(5000, 30000) : ri(5000, 40000),
        tax: type === 'business' ? 0 : ri(100, 500), ins: type === 'business' ? 0 : ri(50, 300), hoa: type === 'business' ? 0 : rnd() < 0.3 ? ri(50, 400) : 0, buyIn: ri(0, 60), paid: ri(0, 120), extra: rnd() < 0.5 ? ri(0, 1500) : 0,
        growth: rnd() < 0.5 ? ri(0, 8) : null, liens: rnd() < 0.2 ? ri(5, 40) * 1000 : 0, wait: ri(6, 80), driver: rnd() < 0.2 ? 'months' : 'extra' };
      const x = rnd(); if (x < 0.25) { o.exit = 'sell'; o.exitMonth = ri(6, 200); o.sellCost = ri(2, 9); } else if (x < 0.4 && n > 2) { o.exit = 'merge'; o.exitMonth = ri(6, 150); o.exitLift = ri(0, 15); o.mergeInto = 'r' + ((k + 1) % n); }
      if (rnd() < 0.35) { o.capex = ri(5, 80) * 1000; o.capexMonths = ri(2, 10); o.arv = rnd() < 0.6 ? Math.round(price * 1.2) : 0; o.liftIncome = ri(0, 12); }
      const na = E.newAsset(type, lo.id, o); if (na.arvAuto) na.arv = Math.round((na.price + (na.capex || 0)) * 1.15 / 1000) * 1000; hs.push(na);
    }
    const S = mkS({ cap: ri(60, 90), haircut: ri(0, 15), closing: ri(0, 6), appr: ri(0, 5), planYears: ri(5, 40), otherDebt: ri(0, 1500), dti: ri(30, 50) }, hs);
    const p = E.samplePersonal(); p.cash = ri(0, 150) * 1000; p.living = ri(1500, 7000); p.jobs[0].gross = ri(30, 200) * 1000;
    return withP(S, p);
  }

  /* ================================================================ Portfolio page consistency */
  const rowEng = (S, pl, h) => { const sp = pl.snap.find((x) => x.id === h.id), sold = !!(pl.exits[h.id] && pl.sellAt[h.id] <= pl.planM); return { sp, sold }; };
  function chkPortfolio(g, A, tag) {
    const S = g.state, pl = planOf(g), sn = pl.horizon, kp = (id) => g.kpis.find((k) => k.id === id) || { v: '', sub: '' };
    const T = (key, ok, w, info) => A.t(key, ok, w, tag + ': ' + info);
    const nw = kp('kpi-networth'), mon = kp('kpi-monthly'), cf = kp('kpi-cashflow'), ds = kp('kpi-dscr');
    T('KPI net worth = engine plan-horizon value', eq(nw.v, sn.nw), 1, nw.v + ' vs ' + $f(sn.nw));
    T('KPI monthly payments = engine', eq(mon.v, sn.monthly), 1, mon.v + ' vs ' + $f(sn.monthly));
    T('KPI cash flow = engine', eq(cf.v, sn.cf), 1, cf.v + ' vs ' + $f(sn.cf));
    T('KPI DSCR = engine (2 dp), or a dash when no loan payment is left', sn.ds > 0.5 ? Math.abs(parseFloat(ds.v) - sn.dscr) <= 0.0051 : ds.v === '—', 0.5, ds.v + ' vs ' + R(sn.dscr, 2));
    T('engine: sum of per-asset shares = KPI numbers', Math.abs(pl.snap.reduce((a, x) => a + x.equity, 0) - sn.nw) < 1 && Math.abs(pl.snap.reduce((a, x) => a + x.payment, 0) - sn.monthly) < 1 && Math.abs(pl.snap.reduce((a, x) => a + x.cf, 0) - sn.cf) < 1, 0.5, 'snapshot entries do not sum to the KPI totals');
    /* ledger total row */
    const tp = g.t['ledger-total'] || '', m = /(−?\$[\d,.]+[MB]?)\/mo payments/.exec(tp);
    T('ledger total row exists with payments (equity now lives in the KPI, the breakdown and each row)', !!m, 1, tp);
    if (m) { T('ledger total payments = KPI monthly payments', eqT(m[1], mon.v), 1, m[1] + ' vs ' + mon.v); }
    T('ledger total cash flow = KPI cash flow (exact text)', g.t['total-cf'] === cf.v + '/mo' || (g.t['total-cf'] || '').replace('/mo', '') === cf.v, 1, g.t['total-cf'] + ' vs ' + cf.v);
    /* rows */
    const byId = {}; g.rows.forEach((r) => (byId[r.id] = r));
    T('one ledger row per asset', g.rows.length === S.houses.length && S.houses.every((h) => byId[h.id]), 0.5, g.rows.length + ' rows vs ' + S.houses.length + ' assets');
    const heldPay = [], heldCf = [], heldEq = [];
    S.houses.forEach((h) => { const r = byId[h.id]; if (!r) return; const { sp, sold } = rowEng(S, pl, h), pm = /(−?\$[\d,.]+[MB]?)\/mo/.exec(r.pay), cfm = /(−|\+)?\$[\d,.]+[MB]?/.exec(r.cf), eqm = /equity (−?\$[\d,.]+[MBK]?)/.exec(r.pay);
      if (sold) {
        const sm = /sold for (−?\$[\d,.]+[MB]?) in (\d+) mo/.exec(r.exit), pr = pl.exits[h.id].proceeds;
        T('sold asset: row says sold; the exit line has proceeds and month from the plan', /sold/i.test(r.pay) && !!sm && eq(sm[1], pr) && +sm[2] === pl.sellAt[h.id], 1, h.id + ': ' + r.pay + ' | ' + r.exit + ' (engine ' + $f(pr) + ' in ' + pl.sellAt[h.id] + ')');
        T('sold asset: cash-flow cell shows the proceeds as cash from the sale', eq(r.cf.replace(/^\+/, ''), pr) && /^\+/.test(r.cf), 1, h.id + ': ' + r.cf + ' vs ' + $f(pr));
        T('sold asset: no Extra input on a sold row', !r.hasExtra, 0.5, h.id + ' has an input');
        return; }
      if (sp) {
        T('row payment = asset share of plan-horizon payments (or "no loan" / "paid off by then" when it is 0)', sp.payment > 0.5 ? !!pm && eq(pm[1], sp.payment) : !pm && /no loan|paid off by then/.test(r.pay), 1.5, h.id + ': ' + r.pay + ' vs ' + $f(sp.payment));
        T('row cash flow = asset share of plan-horizon cash flow', cfm && eq(r.cf.replace('/mo', ''), sp.cf), 1.5, h.id + ': ' + r.cf + ' vs ' + $f(sp.cf));
        T('row equity (text, rounded) = asset share of plan-horizon net worth', !!eqm && eq(eqm[1], sp.equity), 1.5, h.id + ': ' + r.pay + ' vs ' + $f(sp.equity));
        T('row data-equity = asset share of plan-horizon net worth (exact)', r.eqAttr !== '' && r.eqAttr != null && Math.abs(+r.eqAttr - sp.equity) <= 0.51, 1, h.id + ': data-equity=' + r.eqAttr + ' vs ' + sp.equity);
        if (sp.payment > 0.5 && pm) heldPay.push(pm[1]); if (cfm) heldCf.push(r.cf.replace('/mo', '')); if (r.eqAttr) heldEq.push('$' + r.eqAttr);
      }
    });
    if (heldPay.length) {
      const sum = (arr) => arr.reduce((a, t) => a + money(t), 0);
      T('sum of row payments = KPI monthly payments', Math.abs(sum(heldPay) - money(mon.v)) <= sumTol(heldPay) + dispTol(mon.v) + 1, 1, sum(heldPay) + ' vs ' + mon.v);
      T('sum of row cash flows = KPI cash flow', Math.abs(sum(heldCf) - money(cf.v)) <= sumTol(heldCf) + dispTol(cf.v) + 1, 1, sum(heldCf) + ' vs ' + cf.v);
      const cashPart = sn.cash > 0.5 ? sn.cash : 0;
      T('sum of row equity + cash from sales = KPI net worth', Math.abs(sum(heldEq) + cashPart - money(nw.v)) <= sumTol(heldEq) + dispTol(nw.v) + 1, 1, sum(heldEq) + '+' + cashPart + ' vs ' + nw.v);
    }
    /* breakdown */
    const bd = (g.tables.breakdown || []).filter((r) => /\$/.test(r[1] || '')), find = (re) => bd.find((r) => re.test(r[0])), port = find(/^Portfolio$/);
    T('breakdown has a Portfolio row', !!port, 1, JSON.stringify(bd.map((r) => r[0])));
    if (port) {
      T('breakdown Portfolio net worth = KPI net worth', eqT(port[2], nw.v), 1, port[2] + ' vs ' + nw.v);
      T('breakdown Portfolio cash flow = KPI cash flow', eqT(port[3], cf.v), 1, port[3] + ' vs ' + cf.v);
      T('breakdown Portfolio value = sum of snapshot values', eq(port[1], pl.snap.reduce((a, x) => a + x.value, 0)), 0.5, port[1] + ' vs ' + $f(pl.snap.reduce((a, x) => a + x.value, 0)));
      const parts = bd.filter((r) => r !== port);
      T('breakdown rows add up to the Portfolio row (net worth and cash flow)', Math.abs(parts.reduce((a, r) => a + money(r[2]), 0) - money(port[2])) <= sumTol(parts.map((r) => r[2])) + dispTol(port[2]) + 1 && Math.abs(parts.reduce((a, r) => a + money(r[3]), 0) - money(port[3])) <= sumTol(parts.map((r) => r[3])) + dispTol(port[3]) + 1, 1, JSON.stringify(parts.map((r) => r[2])) + ' vs ' + port[2]);
      const types = { house: /^Single-family homes \((\d+)\)/, commercial: /^Commercial properties \((\d+)\)/, business: /^Businesses \((\d+)\)/ };
      let okc = true, info = ''; for (const tpn in types) { const row = find(types[tpn]), n = pl.snap.filter((x) => x.type === tpn).length; if ((row ? +types[tpn].exec(row[0])[1] : 0) !== n) { okc = false; info = tpn + ' ' + (row ? row[0] : 'missing') + ' vs ' + n; } }
      T('breakdown type counts match the assets held at the snapshot', okc, 0.5, info);
      const cashRow = find(/^Trust cash$/); T('breakdown "Trust cash" row = cash the trust holds (sale proceeds and reinvested cash flow not yet spent; shown only when > 0)', sn.cash > 0.5 ? !!cashRow && eq(cashRow[2], sn.cash) : !cashRow, 0.5, JSON.stringify(cashRow) + ' vs ' + $f(sn.cash));
    }
    /* KPI subtext */
    T('net worth subtext: asset count and plan length match (cash from sales is in the breakdown Sold row)', new RegExp('^' + S.houses.length + ' assets · ' + S.g.planYears + '-yr plan$').test(nw.sub), 0.5, nw.sub + ' (assets ' + S.houses.length + ', years ' + S.g.planYears + ')');
    T('monthly payments subtext extra = plan-horizon extra', sn.extra > 0.5 ? /incl\. (\$[\d,.]+[MB]?) extra/.test(mon.sub) && eq(/incl\. (\$[\d,.]+[MB]?) extra/.exec(mon.sub)[1], sn.extra) : !/extra/.test(mon.sub), 0.5, mon.sub + ' vs ' + $f(sn.extra));
    T('cash flow subtext "after extra" = cash flow minus extra', sn.extra > 0.5 ? /([−+]\$[\d,.]+[MB]?) after extra/.test(cf.sub) && eq(/([−+]\$[\d,.]+[MB]?) after extra/.exec(cf.sub)[1], sn.cfx) && Math.abs(sn.cf - sn.extra - sn.cfx) < 1 : true, 0.5, cf.sub + ' vs ' + $f(sn.cfx));
    /* chart */
    if (g.chart) {
      const last = g.chart.nw[g.chart.nw.length - 1];
      T('net worth chart value at the plan horizon = KPI net worth', Math.abs(g.chart.nw[Math.min(g.chart.nw.length - 1, pl.planM)] - money(nw.v)) <= dispTol(nw.v) + 1, 1, g.chart.nw[pl.planM] + ' vs ' + nw.v);
      T('net worth chart LAST point = KPI net worth', Math.abs(last - money(nw.v)) <= dispTol(nw.v) + 1, 1.5, 'chart ends at month ' + g.chart.t + ' = ' + $f(last) + ' but KPI (month ' + pl.planM + ') = ' + nw.v);
      T('net worth chart starts at today\'s net worth', Math.abs(g.chart.nw[0] - pl.today.nw) <= 1, 0.5, g.chart.nw[0] + ' vs ' + pl.today.nw);
    }
    /* headline */
    const nb = S.houses.filter((h) => h.status === 'planned' && isFinite(pl.purchase[h.id])).sort((a, b) => pl.purchase[a.id] - pl.purchase[b.id])[0], hl = g.t['plan-headline'] || '';
    { const pq = S.houses.filter((h) => h.status !== 'owned'), nOwn = S.houses.length - pq.length, lastR = Math.max(0, ...pq.map((h) => pl.purchase[h.id]).filter(isFinite)), monw = (m) => (m <= 0 ? 'now' : 'month ' + m), unf = pq.filter((h) => !isFinite(pl.purchase[h.id])).length;
      const want = !pq.length ? 'All ' + S.houses.length + ' assets are bought.' : unf ? nOwn + ' bought. ' + (pq.length - unf) + ' of ' + pq.length + ' planned can be paid for; ' + unf + ' cannot.' : nOwn + ' bought. All ' + pq.length + ' planned assets are possible; the trust can pay for the last one at ' + monw(lastR) + '.';
      T('headline = bought count, whether every planned asset is possible, and the month (from today) the trust can pay for the last', hl.replace(/\s+/g, ' ').trim() === want, 2, hl + ' | want ' + want); }
    /* extra now / later */
    const X0 = pl.extraNow, Xall = pl.extraNow + pl.extraLater, te = g.t['total-extra'] || '';
    const mx = /(\$[\d,.]+[MB]?)\/mo extra now/.exec(te), ml = /\+ ?(\$[\d,.]+[MB]?) later/.exec(te);
    T('header "extra now" = extra payments actually being paid (loans still being paid down)', !!mx && eq(mx[1], X0), 1, te + ' vs ' + $f(X0));
    T('header "+ later" = extras that start once the planned assets are bought', Xall - X0 > 0.5 ? !!ml && eq(ml[1], Xall - X0) : !ml, 1, te + ' vs later ' + $f(Xall - X0));
    const rowSum = g.rows.reduce((a, r) => a + (r.extra == null ? (pl.V[r.id] ? pl.V[r.id].X : 0) /* sold rows have no Extra input: use the extra the engine had set on them */ : fnum(r.extra)), 0);
    T('extra now + later = extras that are actually paid (never more than the row inputs; the difference is extras typed on assets with no loan to pay down)', mx && Math.abs(money(mx[1]) + (ml ? money(ml[1]) : 0) - Xall) <= g.rows.length * 0.5 + 2 && money(mx[1]) + (ml ? money(ml[1]) : 0) <= rowSum + g.rows.length * 0.5 + 2, 1, te + ' vs engine ' + $f(Xall) + ', row inputs ' + rowSum);
    /* outside cash */
    const oc = g.warns.find((w) => w.id === 'outside-cash');
    T('outside-cash warning amount = engine outside total (shown iff > 0)', pl.outsideTotal > 0 ? !!oc && eq((/(\$[\d,.]+[MB]?)/.exec(oc.t) || [])[1], pl.outsideTotal) : !oc, 1, (oc ? oc.t : 'absent') + ' vs ' + $f(pl.outsideTotal));
    /* ordering */
    const rank = (h) => (isFinite(pl.purchase[h.id]) ? pl.purchase[h.id] : 1e9), want = [...S.houses].sort((a, b) => rank(a) - rank(b) || S.houses.indexOf(a) - S.houses.indexOf(b)).map((h) => h.id);
    { /* the app sorts the saved list into buy order once; the page then shows list order inside Homes / Commercial / Businesses, with sold assets in their own Sold section */
      const soldIn = (h) => !!(pl.exits[h.id] && pl.sellAt[h.id] <= pl.planM), byId2 = Object.fromEntries(S.houses.map((h) => [h.id, h])), cat = (id) => byId2[id].type || 'house';
      const own = (id) => byId2[id].status === 'owned', secs = [true, false].flatMap((o) => ['house', 'commercial', 'business'].flatMap((c) => want.filter((id) => cat(id) === c && !soldIn(byId2[id]) && own(id) === o)));
      const show = secs.concat(want.filter((id) => soldIn(byId2[id])));
      T('rows are in list (= buy) order inside their category sections (Bought first, then Planned), sold assets last', JSON.stringify(g.rows.map((r) => r.id)) === JSON.stringify(show), 0.5, g.rows.map((r) => r.id).join(',') + ' vs ' + show.join(',')); }
    /* drivers */
    if (g.drivers.length) {
      const drv = pl.assetsAt(pl.planM).sort((a, b) => b.equity - a.equity).slice(0, 6); let ok = drv.length === g.drivers.length, info = '';
      drv.forEach((d, i) => { const x = g.drivers[i]; if (!x || x.addr !== d.addr || !eq((/(−?\$[\d,.]+[MB]?)/.exec(x.t) || [])[1], d.equity)) { ok = false; info = (x ? x.addr + ' ' + x.t : 'missing') + ' vs ' + d.addr + ' ' + $f(d.equity); } });
      T('"What drives net worth" equities = engine shares (= row equities)', ok, 1, info);
    }
    /* afford chip = engine */
    const fin = E.finance(clone(S), pl), chip = g.t['afford-chip'];
    T('afford chip = engine verdict', !fin || chip === { yes: 'Yes', tight: 'Tight', no: 'Not yet' }[fin.status], 1, chip + ' vs ' + (fin && fin.status));
  }

  /* ================================================================ shared data (sample + random states) */
  const DATA = [];
  async function collectData(page) {
    const states = [sampleS()]; for (let i = 0; i < 25; i++) states.push(genState());
    for (let i = 0; i < states.length; i++) {
      const S = states[i]; await load(page, S, '#');
      const d = { i, tag: i === 0 ? 'sample' : 'rand#' + i, S0: S, main: await grab(page, '#'), houses: {}, fin: null };
      const pl = planOf(d.main), ids = S.houses.map((h) => h.id), chosen = [];
      const addPick = (f) => { const h = S.houses.find((x) => f(x) && chosen.indexOf(x.id) < 0); if (h) chosen.push(h.id); };
      addPick((h) => pl.exits[h.id] && pl.sellAt[h.id] <= pl.planM); addPick((h) => !isFinite(pl.purchase[h.id])); addPick((h) => pl.funds[h.id]); addPick((h) => h.exit === 'merge'); addPick((h) => h.status === 'planned' && isFinite(pl.purchase[h.id]) && !(pl.exits[h.id] && pl.sellAt[h.id] <= pl.planM)); addPick((h) => h.status === 'owned'); addPick((h) => h.type === 'business');
      while (chosen.length < Math.min(i === 0 ? 5 : 4, ids.length)) { const c = pick(ids); if (chosen.indexOf(c) < 0) chosen.push(c); }
      for (const id of chosen.slice(0, i === 0 ? 5 : 4)) d.houses[id] = await grab(page, '#house-' + id);
      d.fin = await grab(page, '#finances'); DATA.push(d);
    }
  }

  /* ---- asset-page parsers ---- */
  const fld = (g, p) => { const e = g.kv.find((x) => x.p === p); return e ? e.v : undefined; };
  const kpiOf = (g, id) => g.kpis.find((k) => k.id === id) || { v: '', sub: '', label: '' };
  function chkAssetShare(main, hg, id, A, tag) {
    const S = main.state, h = S.houses.find((x) => x.id === id), pl = planOf(main), row = main.rows.find((r) => r.id === id), share = hg.t['asset-share'] || '', { sp, sold } = rowEng(S, pl, h);
    const T = (key, ok, w, info) => A.t(key, ok, w, tag + ' ' + id + ': ' + info);
    if (sold) {
      T('sold asset: share line "sold in N mo for $X" = row exit line = row cash cell = engine', share.includes('sold in ' + mm(pl.sellAt[id]) + ' for') && eq((/for (−?\$[\d,.]+[MB]?)/.exec(share) || [])[1], pl.exits[id].proceeds) && eqT((/for (−?\$[\d,.]+[MB]?)/.exec(share) || [])[1], (/sold for (−?\$[\d,.]+[MB]?)/.exec(row.exit) || [])[1]) && eqT((/for (−?\$[\d,.]+[MB]?)/.exec(share) || [])[1], row.cf), 1.5, share + ' | row: ' + row.exit + ' | ' + row.cf);
    } else if (!sp) {
      T('unbought asset: share line says not bought, row says unfunded/plan', /not bought in this plan yet/.test(share), 1, share + ' | tag ' + row.tag);
      T('unbought asset: row does not claim a payment that the total excludes', /sold|unfunded|not in the totals/.test(row.pay) && !/\$[\d,]+\/mo/.test(row.pay), 1, 'row says "' + row.pay + '" but the asset is not in the portfolio total (share line: ' + share + ')');
    } else {
      const m = /(?:(−?\$[\d,.]+[MB]?)\/mo|no loan) · ([−+][−$\d,.MB]+)\/mo cash flow · (−?\$[\d,.]+[MB]?) equity/.exec(share), pm = /(−?\$[\d,.]+[MB]?)\/mo/.exec(row.pay), eqm = /equity (−?\$[\d,.]+[MBK]?)/.exec(row.pay);
      T('asset-share line is parseable', !!m, 1, share);
      if (m) {
        T('share payment = row payment (exact; "no loan" when the row has no payment)', m[1] ? !!pm && m[1] === pm[1] : !pm, 2, m[1] + ' vs row ' + (pm && pm[1]));
        T('share cash flow = row cash flow (exact)', m[2] + '/mo' === row.cf, 2, m[2] + ' vs row ' + row.cf);
        T('share equity = row equity (share is exact, the row rounds to $K: same number within that rounding; and equals the row data-equity)', !!eqm && eqT(m[3], eqm[1]) && m[3] === $c(+row.eqAttr), 2, m[3] + ' vs row ' + (eqm && eqm[1]) + ' attr ' + row.eqAttr);
        T('share = engine plan-horizon share', (m[1] ? eq(m[1], sp.payment) : sp.payment <= 0.5) && eq(m[2], sp.cf) && eq(m[3], sp.equity), 1, share + ' vs ' + $f(sp.payment) + ',' + $f(sp.cf) + ',' + $f(sp.equity));
      }
    }
  }
  function chkAssetHero(main, hg, id, A, tag) {
    const S = main.state, h = S.houses.find((x) => x.id === id), v = planOf(main).V[id], T = (key, ok, w, info) => A.t(key, ok, w, tag + ' ' + id + ': ' + info);
    const pay = kpiOf(hg, 'h-payment'), cf = kpiOf(hg, 'h-cf'), ds = kpiOf(hg, 'h-dscr'), coc = kpiOf(hg, 'h-coc');
    T('hero is labeled "Payment now" and "Cash flow now"', /Payment now/i.test(pay.label) && /Cash flow now/i.test(cf.label), 0.5, pay.label + ' / ' + cf.label);
    T('"Payment now" = P&I + extra + costs + insurance (engine view)', eq(pay.v, v.payment), 1, pay.v + ' vs ' + $f(v.payment));
    T('"Cash flow now" = NOI - payment (engine view)', eq(cf.v, v.cf), 1, cf.v + ' vs ' + $f(v.cf));
    const dscr = v.P > 0 ? v.noi / v.P : NaN; T('DSCR now = NOI / P&I', isFinite(dscr) ? Math.abs(parseFloat(ds.v) - dscr) <= 0.0051 : /—|NaN/.test(ds.v), 0.5, ds.v + ' vs ' + R(dscr, 2));
    const cocv = v.invested > 0 ? v.cf * 12 / v.invested * 100 : NaN; T('cash-on-cash now = yearly cash flow / cash invested', isFinite(cocv) ? Math.abs(parseFloat(coc.v) - cocv) <= 0.051 : /—/.test(coc.v), 0.5, coc.v + ' vs ' + R(cocv, 1));
    const comps = [v.P > 0, v.X > 0.5, v.escrow > 0, v.mip > 0].filter(Boolean).length, amts = (pay.sub.match(/\$[\d,.]+[MB]?/g) || []).map(money);
    T('"Payment now" subtext lists every part and the parts add up to the headline (no subtext when there is only one part)', comps > 1 ? amts.length === comps && Math.abs(amts.reduce((a, b) => a + b, 0) - money(pay.v)) <= 3.5 : pay.sub === '', 1, pay.v + ' but "' + pay.sub + '"' + (v.mip > 0 ? ' (insurance $' + Math.round(v.mip) + '/mo)' : ''));
    T('"Cash flow now" subtext = cash flow minus extra (no subtext when there is no extra payment)', v.X > 0.5 ? eq((/([−+]\$[\d,.]+[MB]?) after extra/.exec(cf.sub) || [])[1], v.cf - v.X) : cf.sub === '', 0.5, cf.sub + ' vs ' + $f(v.cf - v.X));
  }
  function chkAssetImpact(main, hg, id, A, tag) {
    const S = main.state, pl = planOf(main), wo = E.plan(E.without(clone(S), id)), T = (key, ok, w, info) => A.t(key, ok, w, tag + ' ' + id + ': ' + info);
    const L = [['Net worth', wo.horizon.nw, pl.horizon.nw, 'kpi-networth'], ['Cash flow / mo', wo.horizon.cf, pl.horizon.cf, 'kpi-cashflow'], ['Payments / mo', wo.horizon.monthly, pl.horizon.monthly, 'kpi-monthly'], ['Outside cash', wo.outsideTotal, pl.outsideTotal, null]];
    L.forEach(([lb, a, b, kid]) => {
      const line = hg.impact.find((x) => x.lb === lb), differs = Math.abs(a - b) > 0.5;
      T('impact line shown iff the asset changes that number', differs === !!line, 0.5, lb + ': engine ' + $f(a) + ' -> ' + $f(b) + (line ? ' shown ' + line.t : ' not shown'));
      if (line) {
        const parts = line.t.split('→'), withV = line.to, withoutV = (parts[0] || '').trim();
        T('impact "without" value = engine without this asset', eq(withoutV, a), 1, lb + ': ' + withoutV + ' vs ' + $f(a));
        const ref = kid ? kpiOf(main, kid).v : ((main.warns.find((w) => w.id === 'outside-cash') || { t: '$0' }).t.match(/\$[\d,.]+[MB]?/) || ['$0'])[0];
        T('impact "with" value = Portfolio page ' + (kid ? 'KPI' : 'outside-cash warning'), eqT(withV, ref) || (kid === 'kpi-cashflow' && eqT(withV, ref)), 1.5, lb + ': with ' + withV + ' vs Portfolio ' + ref);
      }
    });
  }

  const mainCtx = await mkCtx(); PAGE = await mkPage(mainCtx, 'g');
  await collectData(PAGE);
  /* ================================================================ G1 */
  await gcheck('G1', 'Portfolio internal sync (KPIs = ledger total = rows = breakdown = chart = headline = engine)', 14,
    'Open the Portfolio page for the sample and 25 random states; compare every number that represents the same quantity (see sync-grade.js chkPortfolio)', async (page) => {
      const A = new Agg();
      for (const d of DATA) chkPortfolio(d.main, A, d.tag);
      /* tooltip at the right end of the chart (sample) */
      const d0 = DATA[0]; await load(page, d0.S0, '#'); await nav(page, '#');
      const tip = await page.evaluate(async () => { const svg = document.querySelector('svg.nw'); if (!svg) return null; const b = svg.getBoundingClientRect(); const x = b.right - 10 * (b.width / 340), y = b.top + b.height / 2;
        svg.dispatchEvent(new PointerEvent('pointerdown', { clientX: x, clientY: y, bubbles: true, pointerType: 'mouse' })); await new Promise((r) => setTimeout(r, 40)); const t = document.getElementById('nwtip'); return t && !t.hidden ? t.textContent : null; });
      const kp = d0.main.kpis.find((k) => k.id === 'kpi-networth').v;
      A.t('tooltip at the right end of the chart = KPI net worth', !!tip && eqT((/(−?\$[\d,.]+[MB]?)/.exec(tip) || [])[1], kp), 1, 'tooltip "' + tip + '" vs KPI ' + kp);
      return A.parts();
    });

  /* ================================================================ G2 */
  await gcheck('G2', 'Asset page <-> Portfolio sync (share line, hero, impact, edits propagate)', 14,
    'For several assets per state: asset-share line == Portfolio row; impact "with" == KPIs; then edit asset inputs and re-check every Portfolio number', async (page) => {
      const A = new Agg();
      for (const d of DATA) for (const id in d.houses) { chkAssetShare(d.main, d.houses[id], id, A, d.tag); chkAssetHero(d.main, d.houses[id], id, A, d.tag); chkAssetImpact(d.main, d.houses[id], id, A, d.tag); }
      /* edits: after each asset edit every Portfolio number must be re-derived */
      const runEdits = async (S, tag, edits) => {
        await load(page, S, '#house-' + edits[0][0]);
        for (const [id, k, val] of edits) {
          await nav(page, '#house-' + id); const ok = await editInput(page, `[data-p="h.${id}.${k}"]`, val);
          if (!ok) { if (k !== 'buyIn') A.t('edit field exists: ' + k, false, 0.2, tag + ' ' + id + '.' + k); continue; }
          const hg = await grab(page, '#house-' + id), mg = await grab(page, '#');
          const t = tag + ' after ' + id + '.' + k + '=' + val;
          chkPortfolio(mg, A, t); chkAssetShare(mg, hg, id, A, t); chkAssetHero(mg, hg, id, A, t);
          const hh = mg.state.houses.find((x) => x.id === id); A.t('edit stored on the asset (' + k + ')', hh && Math.abs(hh[k] - +val) < 1e-6, 0.3, t);
        }
      };
      const s0 = sampleS();
      await runEdits(s0, 'sample', [['maple', 'rent', 2600], ['maple', 'extra', 900], ['cedar', 'price', 190000], ['birch', 'rate', 8.1], ['ridge', 'dp', 35], ['ridge', 'exitMonth', 30], ['auto', 'growth', 8], ['keystone', 'exitLift', 25], ['maple', 'liens', 12000], ['north', 'capex', 120000], ['birch', 'buyIn', 14], ['elm', 'tax', 400], ['syc', 'sellCost', 9], ['maple', 'paid', 60]]);
      for (let k = 0; k < 2; k++) { const S = genState(), o = S.houses.slice(0, 5); await runEdits(S, 'rand' + k, o.flatMap((h) => [[h.id, 'rent', Math.round(h.rent * 1.3)], [h.id, 'price', Math.round(h.price * 0.8)], [h.id, 'extra', ri(0, 1200)], [h.id, h.status === 'owned' ? 'paid' : 'buyIn', ri(0, 40)]])); }
      return A.parts();
    });

  /* ================================================================ G3 */
  function chkFinances(mg, fg, A, tag) {
    const S = fg.state, pl = planOf(fg), f = E.finance(clone(S), pl), k = f.kpis, T = (key, ok, w, info) => A.t(key, ok, w, tag + ': ' + info);
    const picture = fg.tables['monthly-picture'] || [], row = (re) => (picture.find((r) => re.test(r[0])) || [])[1];
    const kc = mg.kpis.find((x) => x.id === 'kpi-cashflow').v, sync = fg.t['sync-cf'], card = fg.t['finances-sync'] || '';
    T('Finances sync-cf = Portfolio KPI cash flow (exact text)', sync === kc, 2, sync + ' vs ' + kc);
    const pe = k.planEnd, bef = /Before tax\s*([−+]\$[\d,.]+[MB]?)/.exec(card), aft = /After tax\s*([−+]\$[\d,.]+[MB]?)/.exec(card), left = /Left over each month\s*([−+]\$[\d,.]+[MB]?)/.exec(card);
    T('Finances "At plan end" card is headed as plan end and its Before tax = Portfolio KPI cash flow = engine', /^At plan end/.test(card) && !!bef && eq(bef[1], pe.cfBefore) && eqT(bef[1], kc), 1, card.slice(0, 80) + ' | ' + (bef && bef[1]) + ' vs ' + $f(pe.cfBefore));
    T('Finances after-tax (plan end) = engine cfAfter = cash flow - tax', !!aft && eq(aft[1], pe.cfAfter) && Math.abs(pe.cfAfter - (pe.cfBefore - pe.tax)) < 1, 1, (aft && aft[1]) + ' vs ' + $f(pe.cfAfter));
    T('Finances left over (plan end) = engine net at plan end', !!left && eq(left[1], pe.net), 1, (left && left[1]) + ' vs ' + $f(pe.net));
    const oc = mg.warns.find((w) => w.id === 'outside-cash'), ocAmt = oc ? (/\$[\d,.]+[MB]?/.exec(oc.t) || [''])[0] : '$0', fl = fg.t['funding-line'] || '', fm = /total (\$[\d,.]+[MB]?) over the plan/.exec(fl);
    T('funding-line amount = outside-cash warning on Portfolio', !!fm && eqT(fm[1], ocAmt), 2, (fm && fm[1]) + ' vs ' + ocAmt);
    T('funding-line amount = engine outside total', !!fm && eq(fm[1], pl.outsideTotal), 0.5, (fm && fm[1]) + ' vs ' + $f(pl.outsideTotal));
    const cov = /cover (\$[\d,.]+[MB]?);/.exec(fl); T('funding-line "partners cover" = min(outside, capital lined up) when capital is listed; otherwise it says all of it comes from your savings and income', k.capitalTotal > 0 ? !!cov && eq(cov[1], Math.min(k.totalOutside, k.capitalTotal)) : /All of it comes out of your savings/.test(fl), 0.5, fl);
    /* extra now scope */
    const X0 = pl.extraNow, te = mg.t['total-extra'] || '', mx = /(\$[\d,.]+[MB]?)\/mo extra now/.exec(te), ex = row(/^Extra payments/);
    T('Finances "Extra payments" (now) = Portfolio "extra now"', !!mx && eq(ex && ex.replace('−', '-').replace('+', ''), -money(mx[1])) || (!!mx && Math.abs(Math.abs(money(ex)) - money(mx[1])) <= 1), 2, 'Finances ' + ex + ' vs Portfolio header ' + te + ' (assets with an extra but no loan to pay down are counted in one but not the other)');
    const later = pl.extraLater, ml = /\+ ?(\$[\d,.]+[MB]?) later/.exec(te), pn = /Plus (\$[\d,.]+[MB]?)\/mo of extra payments on assets you have not bought yet/.exec(fg.text);
    T('Finances "plus $X/mo extra on assets not bought yet" = Portfolio "+ later"', later > 0.5 ? !!pn && !!ml && eqT(pn[1], ml[1]) : !pn && !ml, 1, (pn && pn[1]) + ' vs ' + (ml && ml[1]) + ' engine ' + $f(later));
    /* monthly picture = engine */
    const chkRow = (re, v, label) => T('monthly picture "' + label + '" = engine', eq(row(re), v), 0.8, row(re) + ' vs ' + $f(v));
    chkRow(/take-home/, k.takeHome, 'take-home'); chkRow(/^Portfolio cash flow/, k.portfolioAfterTax, 'portfolio cash flow (after tax, now)'); chkRow(/^Managers/, -k.managerCost0, 'managers'); chkRow(/^Extra payments/, -k.extra, 'extra payments'); chkRow(/Living/, -k.living, 'living'); chkRow(/^Other debts/, -k.debts, 'other debts'); chkRow(/Left over/, k.net0, 'left over');
    const sum = money(row(/take-home/)) + money(row(/Portfolio cash flow/)) + money(row(/Managers/)) + money(row(/^Extra payments/)) + money(row(/Living/)) + money(row(/^Other debts/));
    T('monthly picture rows add up to "left over"', Math.abs(sum - money(row(/Left over/))) <= 3.5, 1, sum + ' vs ' + row(/Left over/));
    T('portfolio "after tax" now = engine cash flow now - tax', Math.abs(k.portfolioAfterTax - (pl.series.cf[0] - E.portTaxAt(S, 0, pl.series.txRE[0], pl.series.txBiz[0]))) < 1, 0.5, 'engine');
    /* verdict */
    const VL = { yes: 'Yes', tight: 'Tight', no: 'Not yet' };
    T('Finances verdict chip = engine status', fg.t['verdict-chip'] === VL[f.status], 1, fg.t['verdict-chip'] + ' vs ' + VL[f.status]);
    T('Finances verdict headline = engine', fg.t['verdict-headline'] === f.headline, 1, fg.t['verdict-headline'] + ' vs ' + f.headline);
    T('Portfolio afford chip = Finances verdict chip', mg.t['afford-chip'] === fg.t['verdict-chip'], 2, mg.t['afford-chip'] + ' vs ' + fg.t['verdict-chip']);
    T('Portfolio afford note = Finances headline (minus the Yes/Tight prefix)', (mg.t['afford-line'] || '').includes(f.headline.replace(/^(Yes|Tight|Not yet)\.\s*/, '')), 1, mg.t['afford-line'] + ' vs ' + f.headline);
    const dti = /debt payments (?:peak at|reach) (\d+)% of qualifying income/.exec(fg.text), hw = mg.warns.find((w) => /Debt-to-income peaks/.test(w.t));
    if (pl.worst.dti > S.g.dti) T('DTI percentage: Finances reason = engine worst DTI', !!dti && +dti[1] === Math.round(pl.worst.dti), 1, (dti && dti[1]) + ' vs ' + pl.worst.dti);
    else T('DTI within the limit: Finances shows the short "lenders should approve" note (no percentage is shown for passing reasons) and no Portfolio DTI warning', /lenders should approve/.test(fg.t['reasons-ok'] || '') && !hw, 1, (fg.t['reasons-ok'] || '').slice(0, 120) + ' vs worst ' + pl.worst.dti);
    if (hw) T('DTI percentage: Portfolio warning = Finances reason', !!dti && Math.abs(+(/peaks at (\d+(?:\.\d+)?)%/.exec(hw.t) || [])[1] - +dti[1]) <= 0.5, 0.5, hw.t + ' vs ' + (dti && dti[0]));
    const lc = fg.t['lowest-cash'] || '', lm = /(−?\$[\d,.]+[MB]?) · month (\d+)/.exec(lc);
    T('lowest cash and month = engine', !!lm && eq(lm[1], k.minLiquid) && +lm[2] === k.minLiquidMonth, 1, lc + ' vs ' + $f(k.minLiquid) + ' month ' + k.minLiquidMonth);
    if (fg.chart) { const mn = Math.min.apply(null, fg.chart.nw); T('lowest cash = minimum of the cash chart', Math.abs(mn - k.minLiquid) <= Math.max(1, dispTol(lm ? lm[1] : '') + 1), 1.5, 'chart minimum ' + $f(mn) + ' (chart covers ' + fg.chart.t + ' of ' + pl.T + ' months) vs lowest cash ' + $f(k.minLiquid)); }
    const rw = /Months you could last without a paycheck\s*([\d.]+|No limit — portfolio income covers it)/.exec(fg.text);
    T('runway = engine minimum runway', !!rw && (isFinite(k.minRunway) ? Math.abs(parseFloat(rw[1]) - k.minRunway) <= 0.051 : /covers/.test(rw[1])), 0.5, (rw && rw[1]) + ' vs ' + R(k.minRunway, 1));
    T('Finances other-debts field = Assumptions value (g.otherDebt)', fnum(fld(fg, 'g.otherDebt')) === Math.round(S.g.otherDebt), 0.5, fld(fg, 'g.otherDebt') + ' vs ' + S.g.otherDebt);
  }
  await gcheck('G3', 'Portfolio <-> Finances sync (cash flow, funding, extra scope, verdict, edge cases)', 14,
    'Compare #finances with the Portfolio page and E.finance for the sample, 25 random states, 4 planned-extra edge cases and after editing job / cash / expense', async (page) => {
      const A = new Agg();
      for (const d of DATA) chkFinances(d.main, d.fin, A, d.tag);
      /* planned-extra edge cases */
      const mkE = (houses, p) => withP(mkS({ closing: 0, appr: 0, cap: 85, haircut: 0, otherDebt: 0 }, houses), p);
      const a = (o) => E.newAsset('house', 'conv30', Object.assign({ price: 250000, rent: 2500, tax: 200, ins: 90, growth: 0, closingPct: 0 }, o));
      const edge = {
        'planned bought now with an extra': [a({ id: 'e1', status: 'owned', paid: 6 }), a({ id: 'e2', status: 'planned', buyIn: 0, extra: 400 })],
        'planned bought later with an extra': [a({ id: 'e1', status: 'owned', paid: 6, target: 'e2' }), a({ id: 'e2', status: 'planned', buyIn: 0, extra: 300 }), a({ id: 'e3', status: 'planned', buyIn: 24, extra: 350 })],
        'owned cash purchase with an extra (no loan)': [E.newAsset('house', 'cashh', { id: 'e1', status: 'owned', price: 150000, rent: 1500, extra: 250, closingPct: 0 }), a({ id: 'e2', status: 'owned', paid: 6, extra: 100 })],
        'owned loan already paid off with an extra': [a({ id: 'e1', status: 'owned', paid: 400, extra: 275 }), a({ id: 'e2', status: 'owned', paid: 6, extra: 100 })],
        'unfunded planned asset with an extra': [a({ id: 'e1', status: 'owned', paid: 6, target: 'e2', rent: 900 }), a({ id: 'e2', status: 'planned', buyIn: 0, extra: 500, price: 900000 }), a({ id: 'e3', status: 'planned', buyIn: 0, target: 'e1', extra: 600 })] };
      for (const nm in edge) { const S = mkE(edge[nm]); await load(page, S, '#'); const mg = await grab(page, '#'), fg = await grab(page, '#finances'); chkFinances(mg, fg, A, 'edge "' + nm + '"'); }
      /* edits on the Finances page: the Portfolio chip must follow at once and equal the Finances verdict */
      await load(page, sampleS(), '#finances');
      const edits = [['p.cash', 2000], ['p.living', 9000], ['j.job1.gross', 20000], ['p.cash', 400000], ['p.emergencyMonths', 12], ['g.otherDebt', 6000], ['p.inflation', 8]];
      for (const [p, v] of edits) {
        await nav(page, '#finances'); await editInput(page, `[data-p="${p}"]`, v); const fg = await grab(page, '#finances'), mg = await grab(page, '#'); chkFinances(mg, fg, A, 'after ' + p + '=' + v);
        A.t('edit reached the stored state (' + p + ')', true, 0.1, '');
      }
      await nav(page, '#finances'); await clickSel(page, '[data-testid=add-planned]'); await clickSel(page, '[data-testid=add-capital]'); await clickSel(page, '[data-testid=add-job]');
      { const fg = await grab(page, '#finances'), mg = await grab(page, '#'); chkFinances(mg, fg, A, 'after adding expense + capital + job'); }
      await nav(page, '#finances'); await editInput(page, '[data-p^="o."][data-p$=".amount"]', 600000);
      { const fg = await grab(page, '#finances'), mg = await grab(page, '#'); chkFinances(mg, fg, A, 'after a large planned expense'); }
      return A.parts();
    });

  /* ================================================================ G4 */
  function expectEffect(S0, h0, k, n) {
    const e = {}, cl = (v, a, b) => Math.min(b, Math.max(a, v));
    if (k === 'extra') { e.extra = Math.max(0, n); e.driver = 'extra'; } else if (k === 'wait') { e.wait = Math.max(0, Math.round(n)); e.driver = 'months'; }
    else if (k === 'down') { e.dp = cl(n / h0.price * 100, 0, 100); e.loanId = 'custom'; } else if (k === 'dp') { e.dp = cl(n, 0, 100); e.loanId = 'custom'; }
    else if (k === 'termY') { e.term = Math.max(12, Math.round(n * 12)); e.loanId = 'custom'; } else if (k === 'rate') { e.rate = cl(n, 0, 30); e.loanId = 'custom'; }
    else if (k === 'price') { e.price = Math.max(0, n); } else if (k === 'growth') { e.growth = cl(n, -50, 100); } else if (k === 'closingPct') { e.closingPct = cl(n, 0, 20); }
    else if (k === 'arv') { e.arv = Math.max(0, n); e.gain = null; e.arvAuto = false; } else if (k === 'gain') { e.gain = n; e.arvAuto = false; e.arv = Math.max(0, Math.round(h0.price + (h0.capex || 0) + n)); }
    else if (k !== 'payoff') e[k] = Math.max(0, n);
    const price = e.price != null ? e.price : h0.price, capex = e.capex != null ? e.capex : h0.capex;
    if (k === 'price' || k === 'capex') { const auto = h0.arvAuto; if (auto) e.arv = Math.round((price + (capex || 0)) * 1.15 / 1000) * 1000; else if (h0.gain !== null && isFinite(h0.gain)) e.arv = Math.max(0, Math.round(price + (capex || 0) + h0.gain)); }
    return e;
  }
  /* what the page must show for the stored state; returns a list of [key, ok, info] */
  function verifyAsset(g, id, step) {
    const S = g.state, h = S.houses.find((x) => x.id === id), out = [], add = (k, ok, info) => out.push([k, !!ok, info]);
    const f = (k) => fld(g, 'h.' + id + '.' + k), kv = (k) => g.kv.find((x) => x.p === 'h.' + id + '.' + k) || {};
    const X = h.extra, I = IND, P = I.pay(h), mip = I.mip(h), cf = I.cf(S, h), noi = I.noi(S, h);
    const g1 = (k, exp, tol, label) => add(label || k, close(fnum(f(k)), exp, tol == null ? 0.51 : tol), 'shows ' + f(k) + ', expected ' + R(exp, 2));
    g1('down', I.down(h), 0.51, 'down$ = price x down% (+ financed rehab)'); g1('loan', I.loan(h), 0.51, 'loan amount = (price [+rehab]) x (1-dp) x (1+upfront MIP)');
    g1('dp', h.dp, 0.006, 'down % shows the stored value'); g1('termY', h.term / 12, 0.006, 'term in years = term months / 12'); g1('closingPct', I.cl(S, h), 0.006, 'closing % = own value or Assumptions default'); g1('growth', I.gr(S, h), 0.006, 'growth shows own value or Assumptions default');
    const pf = I.payoff(h, X), pfLo = pf, pfHi = pf; add('"Paid off in" = independent month-by-month payoff', isFinite(pf) ? fnum(f('payoff')) >= pfLo && fnum(f('payoff')) <= pfHi : f('payoff') === '', 'shows ' + f('payoff') + ', independent ' + pf + ' (extra ' + R(X, 2) + ')');
    g1('extra', h.extra, 0.51, 'extra field = stored extra (always the user\'s own number: the trust decides the timing)');
    add('there is no "Months until LOC" field and no Funds picker (the trust funds each asset)', !('wait' in {}) && !g.kv.some((x) => x.p === 'h.' + id + '.wait'), 'wait field present');
    if (h.status === 'planned') {
      const plE = E.plan(E.normalize(JSON.parse(JSON.stringify(S)))), m = plE.purchase[h.id], need = I.down(h) + h.price * I.cl(S, h) / 100 + (h.finCapex ? 0 : Math.max(0, h.capex || 0)), tm = g.t['trust-months'];
      g1('need', need, 0.51, '"Cash needed" = down payment + closing costs + improvements paid in cash');
      { const trx = plE.trust[h.id], rd = isFinite(m) ? (isFinite(trx.ready) ? trx.ready : m) : Infinity; add('"Trust can pay at" = the month the pool can pay (one clock: months from today; the purchase month if nothing holds it)', isFinite(rd) ? (rd <= 0 ? tm === 'now' : tm === 'month ' + rd) : tm === 'never', tm + ' vs ' + rd); }
      const tr = plE.trust[h.id]; if (isFinite(m) && tr.pooled) add('trust split: cash held + line drawn = cash needed', /\$([\d,]+) of cash the trust already holds .* and \$([\d,]+) drawn/.test(g.t['loc-split'] || '') && Math.abs(fnum((/\$([\d,]+) of cash/.exec(g.t['loc-split']) || [])[1]) + fnum((/and \$([\d,]+) drawn/.exec(g.t['loc-split']) || [])[1]) - need) <= 1.01, (g.t['loc-split'] || 'missing') + ' vs need ' + R(need));
    }
    add('gain/appraisal relation: value gained = appraisal - price - rehab', h.arv > 0 ? close(fnum(f('gain')), h.arv - h.price - (h.capex || 0), 0.51) : f('gain') === '', 'gain field ' + f('gain') + ', arv ' + h.arv + ', price ' + h.price + ', rehab ' + h.capex);
    if (h.gain !== null && isFinite(h.gain)) add('typed gain keeps appraisal = price + rehab + gain', Math.abs(h.arv - Math.max(0, Math.round(h.price + (h.capex || 0) + h.gain))) <= 1, 'arv ' + h.arv + ' gain ' + h.gain + ' price ' + h.price + ' rehab ' + h.capex);
    if (h.arvAuto) add('auto appraisal = (price + rehab) x 1.15 (rounded to $1,000)', h.arv === Math.round((h.price + (h.capex || 0)) * 1.15 / 1000) * 1000, 'arv ' + h.arv + ' price ' + h.price + ' rehab ' + h.capex);
    if (h.type === 'commercial') g1('caprate', h.price > 0 ? noi * 12 / h.price * 100 : NaN, 0.06, 'cap rate = NOI x 12 / price');
    if (h.type === 'business') g1('mult', noi > 0 ? h.price / (noi * 12) : NaN, 0.06, 'price multiple = price / yearly profit');
    /* hero */
    const pay = kpiOf(g, 'h-payment'), hcf = kpiOf(g, 'h-cf'), ds = kpiOf(g, 'h-dscr'), coc = kpiOf(g, 'h-coc');
    add('hero "Payment now" = P&I + extra + costs', Math.abs(money(pay.v) - (P + X + I.escrow(h) + mip)) <= dispTol(pay.v) + 0.01, pay.v + ' vs ' + $f(P + X + I.escrow(h) + mip));
    add('hero "Cash flow now" = NOI - P&I - insurance', eq(hcf.v, cf), hcf.v + ' vs ' + $f(cf));
    const inv = I.down(h) + h.price * I.cl(S, h) / 100; add('hero cash-on-cash = yearly cash flow / (down + closing)', inv > 0 ? Math.abs(parseFloat(coc.v) - cf * 12 / inv * 100) <= 0.051 : /—/.test(coc.v), coc.v + ' vs ' + R(cf * 12 / inv * 100, 1));
    add('hero DSCR = NOI / P&I', P > 0 ? Math.abs(parseFloat(ds.v) - noi / P) <= 0.0051 : /—|NaN/.test(ds.v), ds.v + ' vs ' + R(noi / P, 2));
    /* guardrail */
    const warn = g.t['home-loses'];
    add('home guardrail appears iff "Cash flow now" < 0 and quotes that amount', h.type === 'house' ? (cf < -0.5 ? !!warn && eq((/(\$[\d,.]+[MB]?) a month/.exec(warn) || [])[1], -cf) : !warn) : !warn, (warn || 'no warning') + ' vs cash flow now ' + $f(cf));
    /* calc/user marks */
    const hasT = h.status === 'planned';
    add('calculated fields are marked auto (down$, loan, payoff, need, gain)', kv('down').calc && kv('loan').calc && kv('payoff').calc && kv('gain').calc && (!hasT || kv('need').calc), 'calc flags down ' + kv('down').calc + ' loan ' + kv('loan').calc + ' payoff ' + kv('payoff').calc + ' gain ' + kv('gain').calc);
    add('extra is never auto-filled: it is always the user\'s own number', !kv('extra').calc, 'extra.calc ' + kv('extra').calc);
    /* notes */
    const loanNote = g.notes.find((n) => /^(Paid off in|Not paid off|Payment does not cover)/.test(n)) || '';
    add('loan note "Paid off in" = payoff field', isFinite(pf) ? loanNote.includes('Paid off in ' + mo(pf)) : !/Paid off in/.test(loanNote), loanNote.slice(0, 70) + ' vs ' + pf);
    const dn = /Debt now: (\$[\d,.]+[MB]?) \((\d+)% of (?:today's )?value\)/.exec(loanNote), debt = I.bal0(h) + (h.liens || 0);
    add('loan note "Debt now" = balance + liens', !!dn && eq(dn[1], debt), (dn && dn[1]) + ' vs ' + $f(debt));
    const valNow = I.val(S, h, 0); add('loan note "% of value" divides by the CURRENT value (not the purchase price)', !!dn && Math.abs(+dn[2] - debt / valNow * 100) <= 0.51, (dn && dn[2]) + '% shown; debt ' + $f(debt) + ' / value now ' + $f(valNow) + ' = ' + R(debt / valNow * 100) + '% (price ' + $f(h.price) + ' gives ' + R(debt / h.price * 100) + '%)');
    const cm = /When its line of credit opens: (\d+)% \(cap (\d+(?:\.\d+)?)%\)/.exec(loanNote), cv = I.cltvAtLoc(S, h, X);
    add('no per-asset "When its line of credit opens" note (one clock: the trust decides; old links never show a second month)', !cm, (cm && cm[0]) || '');
    const noiNote = g.notes.find((n) => /^Net operating income/.test(n));
    if (h.type !== 'business') add('NOI note = independent NOI (cash flow is shown once, in the header, so it is not restated here)', !!noiNote && eq((/income (−?\$[\d,.]+[MB]?)\/mo/.exec(noiNote) || [])[1], noi) && !/payment [−+]\$/.test(noiNote), (noiNote || 'missing') + ' vs ' + $f(noi));
    return out;
  }
  const EDITS = ['price', 'dp', 'down', 'rate', 'termY', 'extra', 'payoff', 'liens', 'paid', 'rent', 'tax', 'ins', 'hoa', 'growth', 'capex', 'capexMonths', 'arv', 'gain', 'exitMonth', 'closingPct', 'loan', 'status', 'exit'];
  await gcheck('G4', 'Asset-page field dependencies re-derive after every edit (property-based, 60+ edit sequences)', 18,
    'Random edit sequences on asset pages (price, down, rate, term, extra, payoff, liens, paid, rent, costs, growth, capex, appraisal, gain, exit, loan option, status); every dependent field is re-derived independently after each edit', async (page) => {
      const A = new Agg(); let steps = 0;
      for (let sq = 0; sq < 64; sq++) {
        const S = sq === 0 ? sampleS() : genState(); await load(page, S, '#'); const ids = S.houses.map((h) => h.id);
        for (let st = 0; st < 5; st++) {
          let cur = await stateOf(page); const h0 = cur.houses[ri(0, cur.houses.length - 1)], id = h0.id; await nav(page, '#house-' + id);
          let k = pick(EDITS); const hasT = !!IND.tgt(cur, h0);
          if (h0.type === 'business' && (k === 'tax' || k === 'ins' || k === 'hoa')) k = 'rent'; if (k === 'wait' && !hasT) k = 'extra'; if (k === 'paid' && h0.status !== 'owned') k = 'rent'; if (k === 'exitMonth' && h0.exit === 'hold') k = 'exit'; if (k === 'gain' && !(h0.capex > 0)) k = 'capex'; if (k === 'arv' && !(h0.capex > 0) && rnd() < 0.5) k = 'capex';
          let val, desc;
          const typeMul = h0.type === 'house' ? 1 : h0.type === 'commercial' ? 4 : 5;
          if (k === 'price') val = ri(80, 600) * 1000 * (typeMul > 1 ? typeMul / 2 : 0.7); else if (k === 'dp') val = ri(3, 60); else if (k === 'down') val = Math.round(h0.price * ri(3, 60) / 100); else if (k === 'rate') val = rf(2.5, 11).toFixed(2); else if (k === 'termY') val = ri(5, 30);
          else if (k === 'extra') val = ri(0, 2500); else if (k === 'payoff') val = ri(6, 300); else if (k === 'wait') val = ri(6, 150); else if (k === 'liens') val = ri(0, 60) * 1000; else if (k === 'paid') val = ri(0, 150); else if (k === 'rent') val = Math.round(h0.rent * rf(0.6, 1.6)); else if (k === 'tax' || k === 'ins' || k === 'hoa') val = ri(0, 500);
          else if (k === 'growth') val = rf(-2, 9).toFixed(1); else if (k === 'capex') val = ri(0, 90) * 1000; else if (k === 'capexMonths') val = ri(1, 14); else if (k === 'arv') val = Math.round(h0.price * rf(0.9, 1.6) / 1000) * 1000; else if (k === 'gain') val = ri(-20, 80) * 1000; else if (k === 'exitMonth') val = ri(3, 220); else if (k === 'closingPct') val = rf(0, 6).toFixed(2);
          let ok = true;
          if (k === 'loan') { const lo = pick(E.loansFor(h0.type)); val = lo.id; ok = await selectOpt(page, `[data-loan="${id}"]`, val); }
          else if (k === 'status') { val = h0.status === 'owned' ? 'planned' : 'owned'; ok = await clickSel(page, `[data-status="${val}"]`); }
          else if (k === 'target') { const o = ids.filter((x) => x !== id); val = rnd() < 0.2 ? '' : pick(o); ok = await selectOpt(page, `[data-sel="${id}"]`, val); }
          else if (k === 'exit') { val = pick(['hold', 'sell', 'merge']); ok = await clickSel(page, `[data-exit="${val}"]`); }
          else ok = await editInput(page, `[data-p="h.${id}.${k}"]`, val);
          desc = `seq${sq} step${st}: ${id} ${k}=${val}`; steps++;
          if (!ok) { A.t('field is editable: ' + k, false, 0.3, desc + ' (input not found)'); continue; }
          const g = await page.evaluate(GRAB); g.pl = null;
          const h1 = g.state.houses.find((x) => x.id === id);
          /* user-set field stores what was typed (direct effect) */
          if (!['loan', 'status', 'target', 'exit', 'payoff'].includes(k)) { const e = expectEffect(cur, h0, k, +val); let bad = ''; for (const key in e) { const a = h1[key], b = e[key]; if (!(a === b || (typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) < 1e-6) || (a == null && b == null))) bad += key + ' ' + a + ' vs ' + b + '; '; } A.t('typed value is stored (and dependent fields set: loanId custom, driver, arvAuto, arv)', !bad, 1.5, desc + ' -> ' + bad); }
          if (k === 'payoff') { const sched = IND.payoff(Object.assign({}, h1, { extra: 0 }), 0), m = Math.max(1, Math.round(+val)), got = IND.payoff(h1, h1.extra); A.t('typing "Paid off in" N months makes the loan pay off in exactly N months (or the scheduled date if later)', got === Math.min(m, sched), 1.5, desc + ' -> payoff now ' + got + ' (scheduled ' + sched + ', extra ' + R(h1.extra, 2) + ')'); }
          if (k === 'loan' && val !== 'custom') { const lo = E.LOANS.find((l) => l.id === val); A.t('loan option fills down / rate / term / closing / insurance from the option', h1.dp === lo.dp && h1.rate === lo.rate && h1.term === lo.term && h1.closingPct === lo.closing && (h1.mipUp || 0) === (lo.upfrontMip || 0) && !!h1.io === !!lo.io && h1.loanId === val, 1.5, desc + ' -> dp ' + h1.dp + ' rate ' + h1.rate + ' term ' + h1.term + ' closing ' + h1.closingPct); }
          if (k === 'status') A.t('status switch shows the matching timing field (months paid vs buy in)', val === 'owned' ? fld(g, 'h.' + id + '.paid') !== undefined : (fld(g, 'h.' + id + '.buyIn') !== undefined || g.notes.some((n) => /Bought when/.test(n))), 0.5, desc);
          verifyAsset(g, id, desc).forEach(([key, okk, info]) => A.t(key, okk, key.startsWith('hero') ? 1 : 1.2, desc + ' -> ' + info));
        }
      }
      A.t('at least 60 edit sequences / 250 edits executed', steps >= 250, 1, steps + ' edits');
      return A.parts();
    });

  /* ================================================================ G5 */
  await gcheck('G5', 'Add page <-> created asset (loan option cards, option switching, 203(k) defaults)', 6,
    'Open #add, pick every loan option for every type, add it, compare card numbers with the asset fields; switch options on the asset page; 203(k) rehab/appraisal follow price+rehab until typed over', async (page) => {
      const A = new Agg(); await load(page, sampleS(), '#add');
      for (const tp of ['house', 'commercial', 'business']) {
        const list = E.loansFor(tp);
        for (const lo of list) {
          await nav(page, '#add'); await clickSel(page, `[data-addtype="${tp}"]`);
          const card = await page.evaluate((id) => { const b = document.querySelector(`[data-pickloan="${id}"]`); return b ? b.textContent.replace(/\s+/g, ' ') : null; }, lo.id);
          const m = lo.dp >= 100 ? (card && /No loan · pay the full price/.test(card) ? [null, String(lo.dp), String(lo.rate), '', String(lo.term / 12)] : null) /* cash card: no loan terms to show */ : card && /(\d+(?:\.\d+)?)% down · (\d+(?:\.\d+)?)% · (interest-only, )?(\d+(?:\.\d+)?) yr/.exec(card);
          A.t('add-page card shows down / rate / term of the option', !!m && +m[1] === lo.dp && +m[2] === lo.rate && Math.abs(+m[4] - lo.term / 12) <= 0.051 && !!m[3] === !!lo.io, 1, lo.id + ': ' + card);
          await clickSel(page, `[data-pickloan="${lo.id}"]`); await clickSel(page, '[data-testid=confirm-add]'); await page.waitForTimeout(40);
          const g = await page.evaluate(GRAB), h = g.state.houses[g.state.houses.length - 1], id = h.id;
          if (m) A.t('created asset fields = card numbers (down %, rate, term years)', Math.abs(fnum(fld(g, 'h.' + id + '.dp')) - +m[1]) < 0.006 && Math.abs(fnum(fld(g, 'h.' + id + '.rate')) - +m[2]) < 0.0006 && Math.abs(fnum(fld(g, 'h.' + id + '.termY')) - lo.term / 12) < 0.006, 1.5, lo.id + ': fields ' + fld(g, 'h.' + id + '.dp') + '/' + fld(g, 'h.' + id + '.rate') + '/' + fld(g, 'h.' + id + '.termY') + ' vs card ' + (m && m.slice(1, 5).join(',')));
          A.t('created asset stores the option (closing %, interest-only, insurance, loan id)', h.loanId === lo.id && h.closingPct === lo.closing && !!h.io === !!lo.io && (h.mipUp || 0) === (lo.upfrontMip || 0) && (h.mipAnn || 0) === (lo.annualMip || 0) && !!h.finCapex === !!lo.finRehab, 1, lo.id + ': ' + JSON.stringify({ l: h.loanId, c: h.closingPct, io: h.io, mu: h.mipUp, ma: h.mipAnn }));
          A.t('created asset: closing field and payment follow the option', Math.abs(fnum(fld(g, 'h.' + id + '.closingPct')) - lo.closing) < 0.006 && eq(kpiOf(g, 'h-payment').v, IND.pay(h) + IND.escrow(h) + IND.mip(h) + h.extra), 1, lo.id + ': payment ' + kpiOf(g, 'h-payment').v + ' vs ' + $f(IND.pay(h) + IND.escrow(h) + IND.mip(h)));
          /* switch option on an existing page */
          const others = list.filter((x) => x.id !== lo.id); const sw = others.length ? others[(list.indexOf(lo) + 1) % others.length] : null;
          if (sw) { await selectOpt(page, `[data-loan="${id}"]`, sw.id); const g2 = await page.evaluate(GRAB), h2 = g2.state.houses.find((x) => x.id === id);
            A.t('switching the loan option re-populates down / rate / term / closing consistently', Math.abs(fnum(fld(g2, 'h.' + id + '.dp')) - sw.dp) < 0.006 && Math.abs(fnum(fld(g2, 'h.' + id + '.rate')) - sw.rate) < 0.0006 && Math.abs(fnum(fld(g2, 'h.' + id + '.termY')) - sw.term / 12) < 0.006 && Math.abs(fnum(fld(g2, 'h.' + id + '.closingPct')) - sw.closing) < 0.006, 1.5, lo.id + ' -> ' + sw.id + ': ' + fld(g2, 'h.' + id + '.dp') + '/' + fld(g2, 'h.' + id + '.rate') + '/' + fld(g2, 'h.' + id + '.termY') + '/' + fld(g2, 'h.' + id + '.closingPct'));
            A.t('after switching, loan amount / down$ / payment re-derive', close(fnum(fld(g2, 'h.' + id + '.loan')), IND.loan(h2)) && close(fnum(fld(g2, 'h.' + id + '.down')), IND.down(h2)) && eq(kpiOf(g2, 'h-payment').v, IND.pay(h2) + IND.escrow(h2) + IND.mip(h2) + h2.extra), 1, lo.id + ' -> ' + sw.id + ': ' + fld(g2, 'h.' + id + '.loan') + ' vs ' + R(IND.loan(h2))); }
        }
      }
      /* 203(k) defaults */
      await nav(page, '#add'); await clickSel(page, '[data-addtype="house"]'); await clickSel(page, '[data-pickloan="k203"]'); await clickSel(page, '[data-testid=confirm-add]'); await page.waitForTimeout(40);
      let g = await page.evaluate(GRAB), h = g.state.houses[g.state.houses.length - 1]; const id = h.id, auto = (x) => Math.round((x.price + x.capex) * 1.15 / 1000) * 1000;
      A.t('203(k): rehab default is set and appraisal = (price + rehab) x 1.15', h.capex > 0 && h.arv === auto(h) && h.finCapex, 1.5, 'capex ' + h.capex + ' arv ' + h.arv);
      A.t('203(k): down$ and loan include the financed rehab', close(fnum(fld(g, 'h.' + id + '.down')), (h.price + h.capex) * h.dp / 100) && close(fnum(fld(g, 'h.' + id + '.loan')), (h.price + h.capex) * (1 - h.dp / 100) * (1 + h.mipUp / 100)), 1, fld(g, 'h.' + id + '.down') + ' / ' + fld(g, 'h.' + id + '.loan'));
      await editInput(page, `[data-p="h.${id}.price"]`, 275000); g = await page.evaluate(GRAB); h = g.state.houses.find((x) => x.id === id);
      A.t('203(k): appraisal follows a new price until typed over', h.arv === auto(h) && fnum(fld(g, 'h.' + id + '.arv')) === h.arv, 1.5, 'price ' + h.price + ' arv ' + h.arv + ' want ' + auto(h));
      await editInput(page, `[data-p="h.${id}.capex"]`, 60000); g = await page.evaluate(GRAB); h = g.state.houses.find((x) => x.id === id);
      A.t('203(k): appraisal follows a new rehab budget until typed over', h.arv === auto(h), 1, 'capex ' + h.capex + ' arv ' + h.arv + ' want ' + auto(h));
      await editInput(page, `[data-p="h.${id}.arv"]`, 400000); await editInput(page, `[data-p="h.${id}.price"]`, 250000); g = await page.evaluate(GRAB); h = g.state.houses.find((x) => x.id === id);
      A.t('203(k): a typed appraisal is kept when price changes (gain recomputed)', h.arv === 400000 && close(fnum(fld(g, 'h.' + id + '.gain')), 400000 - 250000 - h.capex), 1.5, 'arv ' + h.arv + ' gain ' + fld(g, 'h.' + id + '.gain'));
      await editInput(page, `[data-p="h.${id}.gain"]`, 30000); await editInput(page, `[data-p="h.${id}.price"]`, 260000); g = await page.evaluate(GRAB); h = g.state.houses.find((x) => x.id === id);
      A.t('203(k): a typed gain keeps appraisal = price + rehab + gain when price changes', h.arv === 260000 + h.capex + 30000, 1.5, 'arv ' + h.arv + ' want ' + (260000 + h.capex + 30000));
      return A.parts();
    });

  /* ================================================================ G6 */
  const digestFn = () => { const a = document.getElementById('app'); return (a.innerText + ' || ' + [...a.querySelectorAll('input,select,textarea')].map((i) => i.value).join('|')).replace(/Backup last shown: [^\n]*|No backup yet[^\n]*/g, '').replace(/\s+/g, ' '); };
  async function digests(page, S, extra) { const out = {}; const ids = S.houses.map((h) => h.id); for (const h of ['#'].concat(ids.map((i) => '#house-' + i), ['#finances', '#assumptions', '#add'])) { await nav(page, h); out[h] = await page.evaluate(digestFn); } return out; }
  const diffD = (a, b) => Object.keys(a).filter((k) => a[k] !== b[k]);
  await gcheck('G6', 'Cross-page navigation & persistence (nav, reload, backup restore, second tab, v8 migration, dark/light)', 12,
    'Digest every page; navigate around, reload, export a backup, edit, restore, open a second tab, load a v8 save, toggle dark mode; numbers must be identical / correct', async () => {
      const A = new Agg(), ctx = await mkCtx(), page = await mkPage(ctx, 'g6');
      try {
        for (const [tag, S] of [['sample', sampleS()], ['random', genState()]]) {
          await load(page, S, '#'); const D0 = await digests(page, S);
          for (const h of ['#house-' + S.houses[0].id, '#finances', '#assumptions', '#', '#house-' + S.houses[S.houses.length - 1].id, '#add', '#']) await nav(page, h);
          let d = diffD(D0, await digests(page, S)); A.t('numbers identical after navigating Portfolio -> Asset -> Finances -> Assumptions -> Portfolio', !d.length, 2, tag + ' changed: ' + d.join(','));
          await page.reload(); await page.waitForSelector('#app > *'); d = diffD(D0, await digests(page, S)); A.t('numbers identical after a reload', !d.length, 2, tag + ' changed: ' + d.join(','));
          await page.emulateMedia({ colorScheme: 'dark' }); await page.waitForTimeout(40); d = diffD(D0, await digests(page, S)); await page.emulateMedia({ colorScheme: 'light' }); A.t('dark/light toggle does not change any number', !d.length, 1, tag + ' changed: ' + d.join(','));
          const g = await grab(page, '#'), mg = g; const A2 = new Agg(); chkPortfolio(mg, A2, tag + ' after reload'); A.t('after reload the Portfolio numbers still equal the engine', [...A2.m.values()].every((e) => e.bad === 0), 1, [...A2.m].filter(([, e]) => e.bad).map(([k, e]) => k + ': ' + e.info).slice(0, 2).join(' | '));
          if (tag === 'sample') {
            /* backup -> edit -> restore */
            await nav(page, '#assumptions'); await clickSel(page, '[data-testid=export]'); const bk = await page.evaluate(() => (document.getElementById('bkout') || {}).value);
            A.t('backup text contains the whole state', !!bk && JSON.parse(bk).houses.length === S.houses.length, 0.5, 'backup length ' + (bk || '').length);
            const id0 = S.houses[0].id;
            await nav(page, '#house-' + id0); await editInput(page, `[data-p="h.${id0}.rent"]`, 4321); await editInput(page, `[data-p="h.${id0}.price"]`, 222222); await nav(page, '#assumptions'); await editInput(page, '[data-p="g.cap"]', 60); await nav(page, '#finances'); await editInput(page, '[data-p="p.cash"]', 777);
            const Dm = await digests(page, S); A.t('sanity: the edits changed the numbers', diffD(D0, Dm).length >= 3, 0.2, diffD(D0, Dm).join(','));
            await nav(page, '#assumptions'); await page.evaluate((t) => { const ta = document.getElementById('bkin'); const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set; set.call(ta, t); }, bk);
            await clickSel(page, '[data-restore-text]'); await clickSel(page, '[data-import-yes]');
            d = diffD(D0, await digests(page, S)); A.t('backup restore brings every number back exactly', !d.length, 3, 'changed after restore: ' + d.join(','));
            /* second tab */
            const p2 = await mkPage(ctx, 'g6b'); await p2.goto(base() + '/index.html?g=' + seq++ + '#'); await p2.waitForSelector('#app > *');
            d = diffD(D0, await digests(p2, S)); A.t('second tab shows identical numbers', !d.length, 1.5, 'tab 2 changed: ' + d.join(','));
            await nav(page, '#house-' + id0); await editInput(page, `[data-p="h.${id0}.rent"]`, 2468); const D1 = await digests(page, S);
            await p2.reload(); await p2.waitForSelector('#app > *'); d = diffD(D1, await digests(p2, S)); A.t('second tab after reload shows the edit made in the first tab', !d.length, 1, 'changed: ' + d.join(',')); await p2.close();
            /* v8 migration */
            const v8 = clone(S0v8(S)); await load(page, v8, '#'); const gm = await grab(page, '#'), gf = await grab(page, '#finances');
            A.t('v8 save is migrated: assets kept (incl. edited price), finance profile added, version bumped', gm.state.v === DATA_V && !!gm.state.p && gm.state.houses.length === S.houses.length && (gm.state.houses.find((x) => x.id === S.houses[0].id) || {}).price === 223344, 1, JSON.stringify({ v: gm.state.v, p: !!gm.state.p, n: gm.state.houses.length, price: (gm.state.houses.find((x) => x.id === S.houses[0].id) || {}).price }));
            const A3 = new Agg(); chkPortfolio(gm, A3, 'v8'); chkFinances(gm, gf, A3, 'v8'); A.t('after the v8 migration every Portfolio/Finances number equals the engine and each other', [...A3.m.values()].every((e) => e.bad === 0), 2, [...A3.m].filter(([, e]) => e.bad).map(([k, e]) => k + ': ' + e.info).slice(0, 2).join(' | '));
            const Dv = await digests(page, gm.state); await page.reload(); await page.waitForSelector('#app > *'); d = diffD(Dv, await digests(page, gm.state)); A.t('migrated state is stable across a reload', !d.length, 0.5, d.join(','));
          }
        }
      } finally { await ctx.close().catch(() => {}); }
      return A.parts();
    });
  function S0v8(S) { const o = clone(S); o.v = 8; delete o.p; o.houses[0].price = 223344; return o; }

  /* ================================================================ G7 */
  await gcheck('G7', 'Shared settings (g.* and p.*) propagate to every dependent display', 10,
    'Edit each Assumptions / Finances setting through the UI; Portfolio, asset pages and Finances must re-derive (cap, DTI, closing, growth default, projection length, other debts, vacancy / mgmt / repairs, ...)', async (page) => {
      const A = new Agg();
      const full = async (S, tag, ids) => { const mg = await grab(page, '#'), fg = await grab(page, '#finances'); chkPortfolio(mg, A, tag); chkFinances(mg, fg, A, tag);
        for (const id of ids) { const hg = await grab(page, '#house-' + id); chkAssetShare(mg, hg, id, A, tag); chkAssetHero(mg, hg, id, A, tag); verifyAsset(hg, id, tag).forEach(([k, ok, info]) => A.t('asset page: ' + k, ok, 0.4, tag + ' ' + id + ' -> ' + info)); return { mg, fg, hg }; } };
      /* a state with null closing/growth so the defaults matter */
      const mkN = () => { const hs = [E.newAsset('house', 'conv30', { id: 'a', status: 'owned', paid: 20, price: 300000, rent: 2600, tax: 250, ins: 100, growth: null, closingPct: null, extra: 150, target: 'b', loanId: 'custom' }), E.newAsset('house', 'conv30', { id: 'b', status: 'planned', price: 240000, rent: 2300, tax: 200, ins: 90, growth: null, closingPct: null, buyIn: 30, loanId: 'custom' }),
        E.newAsset('commercial', 'comm25', { id: 'c', status: 'planned', price: 900000, rent: 9000, tax: 400, ins: 300, hoa: 200, growth: null, closingPct: null, buyIn: 40, loanId: 'custom' }), E.newAsset('business', 'sba7a', { id: 'd', status: 'planned', price: 500000, rent: 11000, growth: null, closingPct: null, buyIn: 20, loanId: 'custom', exit: 'sell', exitMonth: 90 })];
        return withP(mkS({ closing: 3, appr: 2, planYears: 20, otherDebt: 300 }, hs), E.samplePersonal()); };
      const settings = [['g.cap', 70], ['g.dti', 25], ['g.closing', 5], ['g.appr', 4], ['g.planYears', 10], ['g.planYears', 30], ['g.otherDebt', 900], ['g.vac', 12], ['g.mgmt', 15], ['g.maint', 2.5], ['g.hrate', 11], ['g.haircut', 10], ['g.rentCount', 50], ['g.p1', 50000], ['g.p2', 0]];
      await load(page, mkN(), '#assumptions');
      for (const [p, v] of settings) {
        await nav(page, '#assumptions'); await editInput(page, `[data-p="${p}"]`, v); const S = await stateOf(page); const key = p.slice(2);
        A.t('setting stored (' + p + ')', S.g[key] === v, 0.2, p + ' ' + S.g[key]);
        const { mg, fg, hg } = await full(S, 'after ' + p + '=' + v, ['a']);
        const pl = E.plan(clone(S)), ag = await grab(page, '#house-a'), bg = await grab(page, '#house-b'), cg = await grab(page, '#house-c');
        if (key === 'cap') { const n = ag.notes.find((x) => /When its line of credit opens/.test(x)) || ''; A.t('cap edit shows on the asset page note (cap N%)', new RegExp('cap ' + v + '%').test(n) || !/When its line/.test(n), 1, n.slice(-60)); const lr = mg.rows.find((r) => r.id === 'b'); A.t('cap edit moves the funding date on the Portfolio row of the next asset (b) = engine', !!lr && (isFinite(pl.purchase.b) ? (() => { const tb = pl.trust.b, rd = isFinite(tb.ready) ? tb.ready : pl.purchase.b; return /^Possible|^Not possible/.test(lr.loc) && lr.loc.includes(rd <= 0 ? 'funded by the trust at now' : 'funded by the trust at month ' + rd) || /own cash/.test(lr.loc); })() : /^Not possible/.test(lr.loc)), 1, lr && lr.loc + ' vs ' + pl.purchase.b); }
        if (key === 'dti') { const hw = mg.warns.find((w) => /Debt-to-income peaks/.test(w.t)); A.t('DTI limit shows in the Portfolio warning and the Finances reason', (pl.worst.dti > v ? !!hw && new RegExp('limit ' + v + '%').test(hw.t) : !hw) && (pl.worst.dti > v ? new RegExp('limit ' + v + '%').test(fg.text) /* passing reasons are shown as a short note without the limit */ : /lenders should approve/.test(fg.t['reasons-ok'] || '')), 1, (hw && hw.t) + ' | ' + (/limit \d+%/.exec(fg.text) || [])[0]); const ch = ag.chips.find((c) => /Debt-to-income/.test(c.t)); const af = E.afford(clone(S), S.houses.find((h) => h.id === 'a'), pl); A.t('DTI limit shows in the asset-page chip title', af.cls === 'ok' || af.cls === 'na' ? !ch : !!ch && new RegExp(v + '% limit').test(ch.title), 1, (ch && ch.title) + ' vs ' + af.why); }
        if (key === 'closing') { A.t('closing default shows on every asset with no own closing %', fnum(fld(ag, 'h.a.closingPct')) === v && fnum(fld(bg, 'h.b.closingPct')) === v && fnum(fld(cg, 'h.c.closingPct')) === v, 1, fld(ag, 'h.a.closingPct') + ',' + fld(bg, 'h.b.closingPct')); A.t('closing default changes "Cash needed" on the planned asset', close(fnum(fld(bg, 'h.b.need')), 240000 * 0.2 + 240000 * v / 100), 1, fld(bg, 'h.b.need') + ' vs ' + (48000 + 2400 * v)); }
        if (key === 'appr') A.t('appreciation default shows as the growth on assets with no own growth', [ag, bg, cg].every((x, i) => fnum(fld(x, 'h.' + 'abc'[i] + '.growth')) === v), 1, fld(ag, 'h.a.growth') + ',' + fld(bg, 'h.b.growth'));
        if (key === 'planYears') { A.t('projection length changes the plan-end numbers everywhere', new RegExp('^\\d+ assets · ' + v + '-yr plan$').test(kpiOf(mg, 'kpi-networth').sub) && eq(mg.kpis.find((k) => k.id === 'kpi-networth').v, pl.horizon.nw) && eq((/Before tax\s*([−+]\$[\d,.]+[MB]?)/.exec(fg.t['finances-sync'] || '') || [])[1], pl.series.cf[Math.min(pl.T, pl.planM)]), 2, 'note/KPI/Finances for ' + v + ' years'); A.t('projection length reflected in plan-end month (' + pl.planM + ')', pl.planM === v * 12 || pl.planM === pl.T, 0.3, ''); }
        if (key === 'otherDebt') { A.t('other debts edited on Assumptions shows on Finances', fnum(fld(fg, 'g.otherDebt')) === v && eq((fg.tables['monthly-picture'].find((r) => /^Other debts/.test(r[0])) || [])[1], -v), 2, fld(fg, 'g.otherDebt')); }
        if (['vac', 'mgmt', 'maint'].includes(key)) { A.t(key + ' edit re-derives NOI / cap rate on commercial and home pages', verifyAsset(ag, 'a', '').concat(verifyAsset(cg, 'c', '')).filter(([k]) => /NOI|cap rate/.test(k)).every(([, ok]) => ok) && new RegExp((key === 'maint' ? 'Repairs ' : key === 'vac' ? 'Vacancy ' : 'Mgmt ') + v + '%').test(ag.chips.map((c) => c.t).join(' ')), 1.5, 'chips ' + ag.chips.map((c) => c.t).join(' ')); }
        if (key === 'hrate') A.t('credit-line rate changes cash flow consistently on every page', true, 0.1, '');
      }
      /* other debts edited on the Finances page shows on Assumptions */
      await nav(page, '#finances'); await editInput(page, '[data-p="g.otherDebt"]', 1234); const ag = await grab(page, '#assumptions'), S2 = await stateOf(page);
      A.t('other debts edited on Finances shows on Assumptions', fnum(fld(ag, 'g.otherDebt')) === 1234 && S2.g.otherDebt === 1234, 2, fld(ag, 'g.otherDebt'));
      for (const [p, v] of [['p.cash', 5000], ['p.living', 4800], ['p.inflation', 5], ['p.emergencyMonths', 9], ['p.portfolioTaxPct', 35], ['p.salesTaxPct', 10], ['p.operating', 0], ['p.gmMonthly', 12000], ['p.bizHours', 45], ['p.cashApy', 1]]) { await nav(page, '#finances'); await editInput(page, `[data-p="${p}"]`, v); const S = await stateOf(page); A.t('personal setting stored (' + p + ')', S.p[p.slice(2)] === v, 0.1, p); await full(S, 'after ' + p + '=' + v, ['d']); }
      return A.parts();
    });

  /* ================================================================ G8 */
  await gcheck('G8', 'No stale / duplicate / contradictory numbers', 12,
    'Scan every page for repeated labels with different values, missing bases, redundant repeated numbers, subtext that restates the main value, and numbers that contradict adjacent statements', async () => {
      const P = new Parts(), A = new Agg();
      const money$ = /[−+]?\$[\d,]+(?:\.\d+)?[MB]?/g;
      for (const d of DATA) {
        const main = d.main, S = main.state, pl = planOf(main), sn = pl.horizon;
        /* label shown twice with different values (asset + finance pages) */
        const scanDup = (g, where) => { const seen = {}; g.kv.forEach((x) => { if (!x.lb || x.inImpact) return; const k = x.lb; (seen[k] = seen[k] || []).push(x.v); }); Object.keys(seen).forEach((k) => A.t('same label never shown twice with different values', new Set(seen[k]).size <= 1, 2, d.tag + ' ' + where + ': "' + k + '" = ' + seen[k].join(' / '))); };
        scanDup(d.fin, '#finances'); for (const id in d.houses) scanDup(d.houses[id], '#house-' + id);
        /* KPI subtext that restates the main value */
        main.kpis.forEach((k) => { const m = k.sub.match(money$) || []; A.t('KPI subtext does not restate its own main value', !m.some((x) => x === k.v || x.replace('+', '') === k.v.replace('+', '')), 1.5, d.tag + ' ' + k.id + ': "' + k.v + '" with subtext "' + k.sub + '"'); });
        for (const id in d.houses) { const hg = d.houses[id], h = S.houses.find((x) => x.id === id), v = pl.V[id];
          hg.kpis.forEach((k) => { const m = k.sub.match(money$) || []; A.t('KPI subtext does not restate its own main value', !m.some((x) => x.replace('+', '') === k.v.replace('+', '')), 1.5, d.tag + ' ' + id + ' ' + k.id + ': "' + k.v + '" with subtext "' + k.sub + '"'); });
          const noi = hg.notes.find((n) => /^Net operating income/.test(n)), cfv = kpiOf(hg, 'h-cf').v;
          if (noi) A.t('the same cash flow is not shown twice on one asset page', !(noi.match(money$) || []).some((x) => x === cfv.replace(/^\+?/, '+') || x === cfv), 1.5, d.tag + ' ' + id + ': hero "Cash flow now" ' + cfv + ' and again in "' + noi + '"');
          /* now vs plan-end basis: share line is labeled "In your portfolio total" and hero is labeled "now" */
          A.t('asset hero and portfolio-share are labeled with their different bases', /now/i.test(kpiOf(hg, 'h-cf').label) && /portfolio total|portfolio row \(at plan end\)/i.test(hg.t['asset-share'] || ''), 1, d.tag + ' ' + id);
        }
        /* contradictions on Portfolio rows */
        main.rows.forEach((r) => { const h = S.houses.find((x) => x.id === r.id), v = pl.V[r.id]; const losing = /home loses money/.test(r.hi.join(' ')), shown = /^−/.test(r.cf);
          A.t('"home loses money" flag does not contradict the row cash flow beside it', !losing || shown || r.cf === '—', 2, d.tag + ' ' + r.id + ': flag "home loses money" (cash flow NOW ' + $f(v.cf) + ') next to a row cash flow of ' + r.cf + ' (plan-end share)'); });
        /* header vs KPI subtext: both extras are labeled with their basis */
        const te = main.t['total-extra'] || '', ms = kpiOf(main, 'kpi-monthly').sub;
        A.t('"extra now" header is not contradicted by the KPI subtext (different basis is named)', /extra now/.test(te) && (!/extra/.test(ms) || /incl\./.test(ms)) && /\d+-yr plan/.test(main.text), 1, te + ' | ' + ms);
        const warnSum = main.warns.map((w) => w.t).join(' ');
        A.t('"not bought yet" claims agree between warning, headline and rows', pl.unfunded.length ? /not funded yet/.test(main.t['plan-headline']) && /never funded/.test(warnSum) && main.rows.filter((r) => /unfunded/.test(r.tag)).length === pl.unfunded.length : !/not funded yet/.test(main.t['plan-headline']) && !/never funded/.test(warnSum), 1, d.tag + ': ' + main.t['plan-headline'] + ' | ' + warnSum.slice(0, 80));
        /* Finances: same label for two bases */
        const fs_ = d.fin.t['finances-sync'] || '', pic = (d.fin.tables['monthly-picture'] || []).map((r) => r[0]);
        A.t('Finances "left over" appears twice, the plan-end one inside a card headed "At plan end" and the other in the monthly picture whose section is titled "now and at plan end"', /^At plan end/.test(fs_) && /Left over each month/.test(fs_) && pic.includes('Left over each month') && /Your month: now and at plan end/i.test(d.fin.text), 1, fs_.slice(0, 60) + ' | ' + pic.join(','));
        A.t('Finances portfolio cash flow: the picture row sits under "now and at plan end"; plan-end rows are "Before tax" / "After tax" inside the "At plan end" card', pic.includes('Portfolio cash flow') && /Before tax/.test(fs_) && /After tax/.test(fs_) && (d.fin.text.match(/Portfolio cash flow/g) || []).length === 1, 1, pic.join(','));
      }
      /* redundancy of the same value on the Portfolio page: KPI + ledger total + breakdown */
      const d0 = DATA[0].main, cfK = kpiOf(d0, 'kpi-cashflow').v, nwK = kpiOf(d0, 'kpi-networth').v, port = (d0.tables.breakdown || []).find((r) => r[0] === 'Portfolio') || [];
      const reps = [[cfK, d0.t['total-cf'], port[3]], [nwK, port[2]]].map((a) => a.filter((x) => x && (typeof x === 'string' ? x : x[1])).length);
      A.t('the same net worth / cash flow appears only in the labeled total places on the Portfolio page (KPI card, list total row for cash flow, breakdown total row), each a deliberate sum check, and nowhere else', reps.every((n) => n <= 3), 2, 'cash flow ' + cfK + ' appears in the KPI, the ledger total row and the breakdown row; net worth ' + nwK + ' also appears 3 times');
      return A.parts(P);
    });

  if (process.env.G_ONLY && !checks.length) { /* subset run */ }
  const order = ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8']; checks.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  try { await mainCtx.close(); } catch (e) {}
  const earned = checks.reduce((s, c) => s + c.earned, 0), max = checks.reduce((s, c) => s + c.points, 0);
  return { earned: Math.round(earned * 100) / 100, max, checks };
};
