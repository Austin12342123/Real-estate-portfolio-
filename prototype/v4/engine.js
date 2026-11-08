/* Portfolio finance engine v4 — pure functions, no DOM. Browser: window.Engine. Node: module.exports.
   Asset = { id, addr, type:'house'|'commercial'|'business', status:'owned'|'planned', price, dp, rate, term(months), io, closingPct, loanId,
   extra, driver, wait, rent (monthly rent, or monthly owner profit for a business), tax, ins, hoa, liens, paid, buyIn, growth(%/yr or null), target }.
   Percentages are plain numbers (85 = 85%). Money is dollars. Time is months. */
(function (root) {
  const GDEF = { cap: 85, haircut: 0, closing: 3, vac: 5, mgmt: 8, maint: 1, appr: 0, hrate: 8.5, dti: 43,
    p1: 200000, p2: 200000, rentCount: 75, otherDebt: 0, horizon: 480, planYears: 20 };
  const TYPES = { house: { label: 'Single-family home', short: 'Home' }, commercial: { label: 'Commercial property', short: 'Commercial' }, business: { label: 'Business', short: 'Business' } };
  /* Loan options. term is in months. io = interest-only (balloon at maturity is not modeled; refinance is assumed). */
  const LOANS = [
    { id: 'conv30', types: ['house'], name: 'Conventional 30-year', dp: 20, rate: 6.75, term: 360, io: false, closing: 3, note: 'Standard investor mortgage.' },
    { id: 'conv15', types: ['house'], name: 'Conventional 15-year', dp: 20, rate: 6.0, term: 180, io: false, closing: 3, note: 'Higher payment, builds equity fast.' },
    { id: 'fha', types: ['house'], name: 'FHA 30-year (you live there)', dp: 3.5, rate: 6.25, term: 360, io: false, closing: 4, note: 'Low down payment. Owner-occupied only.' },
    { id: 'dscr', types: ['house'], name: 'DSCR investor loan', dp: 25, rate: 7.5, term: 360, io: false, closing: 4, note: 'Qualifies on the rent, not your income.' },
    { id: 'cashh', types: ['house'], name: 'Cash purchase', dp: 100, rate: 0, term: 360, io: false, closing: 2, note: 'No loan.' },
    { id: 'comm25', types: ['commercial'], name: 'Commercial bank, 25-year', dp: 25, rate: 7.0, term: 300, io: false, closing: 3, note: 'Typical bank loan on income property.' },
    { id: 'sba504', types: ['commercial'], name: 'SBA 504 (you operate in it)', dp: 10, rate: 6.5, term: 300, io: false, closing: 3.5, note: 'Low down payment. Needs owner-occupancy.' },
    { id: 'bridge', types: ['commercial'], name: 'Bridge loan, interest-only', dp: 30, rate: 9.5, term: 36, io: true, closing: 3, note: 'Payment covers interest only. Refinance at maturity.' },
    { id: 'sellerc', types: ['commercial'], name: 'Seller financing', dp: 10, rate: 6.0, term: 240, io: false, closing: 2, note: 'Seller carries the loan. Terms vary.' },
    { id: 'sba7a', types: ['business'], name: 'SBA 7(a) loan', dp: 10, rate: 10.5, term: 120, io: false, closing: 3, note: 'Common for buying a business.' },
    { id: 'bankbiz', types: ['business'], name: 'Bank term loan', dp: 25, rate: 9.0, term: 84, io: false, closing: 2, note: 'Shorter term, bigger payment.' },
    { id: 'sellerb', types: ['business'], name: 'Seller note', dp: 20, rate: 7.0, term: 60, io: false, closing: 1.5, note: 'The seller finances part of the price.' },
    { id: 'cashb', types: ['business'], name: 'Cash purchase', dp: 100, rate: 0, term: 360, io: false, closing: 1.5, note: 'No loan.' }];
  const loansFor = (type) => LOANS.filter((l) => l.types.indexOf(type) >= 0);
  let uid = 0;
  const DEFAULTS = {
    house: { addr: 'New home', price: 300000, rent: 2200, tax: 300, ins: 110, hoa: 0, growth: 4, sellCost: 6 },
    commercial: { addr: 'New commercial property', price: 1500000, rent: 12500, tax: 800, ins: 600, hoa: 400, growth: 4, sellCost: 5 },
    business: { addr: 'New business', price: 1000000, rent: 18000, tax: 0, ins: 0, hoa: 0, growth: 10, sellCost: 8 } };
  function applyLoan(h, id) {
    const lo = LOANS.find((l) => l.id === id);
    if (!lo) { h.loanId = 'custom'; return h; }
    h.dp = lo.dp; h.rate = lo.rate; h.term = lo.term; h.io = !!lo.io; h.closingPct = lo.closing; h.loanId = lo.id;
    return h;
  }
  function newAsset(type, loanId, o) {
    type = TYPES[type] ? type : 'house';
    const h = Object.assign({ id: 'h' + Date.now().toString(36) + (uid++), type, status: 'planned', extra: 0, driver: 'extra', wait: 24, liens: 0, paid: 0, buyIn: 12,
      target: '', growth: null, io: false, closingPct: null, loanId: '', dp: 20, rate: 6.75, term: 360,
      capex: 0, capexMonths: 6, liftValue: 0, liftIncome: 0, exit: 'hold', exitMonth: 60, exitLift: 0, mergeInto: '' }, DEFAULTS[type]);
    applyLoan(h, loanId || loansFor(type)[0].id);
    return Object.assign(h, o || {});
  }
  const newHouse = (o) => newAsset((o && o.type) || 'house', o && o.loanId, o);

  const H = (S, id) => S.houses.find((h) => h.id === id);
  const mi = (h) => h.rate / 1200;
  const loan = (h) => h.price * (1 - h.dp / 100);
  const amort = (L, i, n) => (L <= 0 ? 0 : i ? (L * i) / (1 - Math.pow(1 + i, -n)) : L / n);
  const pmt = amort; /* kept for callers that back-solve a payoff */
  const payment = (h) => { const L = loan(h), i = mi(h); return L <= 0 ? 0 : h.io ? L * i : amort(L, i, h.term); };
  const age0 = (h) => (h.status === 'owned' ? Math.max(0, h.paid || 0) : 0);
  const gr = (S, h) => { const v = h.growth == null || !isFinite(+h.growth) ? S.g.appr : +h.growth; return Math.max(-90, v); };
  const clPct = (S, h) => (h.closingPct == null || !isFinite(+h.closingPct) ? S.g.closing : +h.closingPct);
  function balToday(h) {
    const L = loan(h), i = mi(h), P = payment(h), k = age0(h);
    if (!k || h.io) return L;
    return Math.max(0, i ? L * Math.pow(1 + i, k) - P * (Math.pow(1 + i, k) - 1) / i : L - P * k);
  }
  const balK = (B0, i, A, k) => Math.max(0, i ? B0 * Math.pow(1 + i, k) - A * (Math.pow(1 + i, k) - 1) / i : B0 - A * k);
  const valK = (S, h, k) => h.price * Math.pow(1 + gr(S, h) / 100, (age0(h) + k) / 12);
  const need = (S, h) => { const t = H(S, h.target); return t ? t.price * (t.dp / 100 + clPct(S, t) / 100) : 0; };

  function payoffN(h, X) {
    const B0 = balToday(h), i = mi(h), A = payment(h) + X;
    if (B0 <= 0.005) return 0;
    if (A <= i * B0 + 1e-9) return Infinity;
    return Math.ceil(i ? -Math.log(1 - (i * B0) / A) / Math.log(1 + i) : B0 / A);
  }
  /* months (from the asset's own start) until cap*value - balance - other liens >= cash needed for its target */
  function locMonths(S, h, X) {
    if (!H(S, h.target)) return Infinity;
    const D = need(S, h), B0 = balToday(h), i = mi(h), A = payment(h) + X, g = S.g;
    for (let k = 0; k <= 600; k++) {
      const head = g.cap / 100 * valK(S, h, k) - balK(B0, i, A, k) - (h.liens || 0);
      if (Math.max(0, head) * (1 - g.haircut / 100) >= D) return k;
    }
    return Infinity;
  }
  function extraFor(S, h, m) {
    if (locMonths(S, h, 0) <= m) return 0;
    let lo = 0, hi = balToday(h) + 1;
    if (locMonths(S, h, hi) > m) return null;
    for (let j = 0; j < 50; j++) { const mid = (lo + hi) / 2; locMonths(S, h, mid) <= m ? (hi = mid) : (lo = mid); }
    return hi;
  }
  function view(S, h) {
    const g = S.g, L = loan(h), P = payment(h), B0 = balToday(h), i = mi(h), type = h.type || 'house';
    let X = h.extra, infeasible = false;
    if (h.driver === 'months' && H(S, h.target)) { const x = extraFor(S, h, h.wait); if (x == null) infeasible = true; else X = x; }
    let egi, noi, escrow;
    if (type === 'business') { egi = h.rent; noi = h.rent; escrow = 0; }
    else {
      egi = h.rent * (1 - g.vac / 100); escrow = h.tax + h.ins + h.hoa;
      noi = egi - (escrow + (g.maint / 100) * h.price / 12 + (g.mgmt / 100) * egi);
    }
    const lm = locMonths(S, h, X), A = P + X;
    const cltvAtLoc = H(S, h.target) && isFinite(lm) ? ((balK(B0, i, A, lm) + (h.liens || 0) + need(S, h)) / valK(S, h, lm)) * 100 : null;
    const down = (h.price * h.dp) / 100, closingCost = (h.price * clPct(S, h)) / 100;
    return { cltvAtLoc, L, B0, P, X, infeasible, egi, noi, cf: noi - P, escrow, pitia: P + escrow, payment: P + X + escrow,
      D: need(S, h), down, closingCost, invested: down + closingCost, payoff: payoffN(h, X), locM: lm,
      head0: Math.max(0, g.cap / 100 * h.price - B0 - (h.liens || 0)), debtNow: B0 + (h.liens || 0),
      capRate: h.price > 0 ? ((noi * 12) / h.price) * 100 : NaN, multiple: noi > 0 ? h.price / (noi * 12) : NaN, growth: gr(S, h) };
  }

  /* The whole-portfolio plan: purchase months, sales, cash, month-by-month series, plan-level KPIs. */
  function plan(S) {
    const hs = S.houses, g = S.g, V = {};
    hs.forEach((h) => (V[h.id] = view(S, h)));
    const memo = {}, stack = {};
    function pm(h) {
      if (memo[h.id] !== undefined) return memo[h.id];
      if (h.status === 'owned') return (memo[h.id] = 0);
      if (stack[h.id]) return Infinity;
      stack[h.id] = 1;
      const srcs = hs.filter((x) => x.target === h.id && x.id !== h.id);
      let r;
      if (!srcs.length) r = Math.max(0, Math.round(h.buyIn || 0));
      else { r = Infinity; srcs.forEach((s) => { const a = pm(s) + V[s.id].locM; if (a < r) r = a; }); }
      stack[h.id] = 0;
      return (memo[h.id] = r);
    }
    const P0 = {}; hs.forEach((h) => (P0[h.id] = pm(h)));
    const funds = {}; hs.forEach((h) => { const t = H(S, h.target);
      funds[h.id] = !!(t && t.status === 'planned' && isFinite(P0[h.id] + V[h.id].locM) && P0[t.id] === P0[h.id] + V[h.id].locM); });
    const fundedByLOC = {}; hs.forEach((h) => { if (funds[h.id]) fundedByLOC[h.target] = true; });
    /* exits: a sale ends ownership at sellAt; a merge applies a synergy lift at mergeAt */
    const sellAt = {}, mergeAt = {};
    hs.forEach((h) => { sellAt[h.id] = Infinity; mergeAt[h.id] = Infinity; const p = P0[h.id]; if (!isFinite(p)) return;
      const m = Math.max(Math.round(h.exitMonth || 0), p + 1);
      if (h.exit === 'sell') sellAt[h.id] = m; else if (h.exit === 'merge') mergeAt[h.id] = m; });
    const finiteBuys = hs.map((h) => P0[h.id]).filter(isFinite);
    const lastEvent = Math.max(0, ...finiteBuys, ...hs.map((h) => (isFinite(sellAt[h.id]) ? sellAt[h.id] : 0)), ...hs.map((h) => (isFinite(mergeAt[h.id]) ? mergeAt[h.id] : 0)));
    const lastBuy = finiteBuys.length ? Math.max.apply(null, finiteBuys) : 0;
    const planM = Math.round(Math.max(1, g.planYears || 20) * 12);
    const T = Math.min(g.horizon, Math.max(120, lastEvent + 60, planM));
    const keys = ['nw', 'monthly', 'extra', 'noi', 'ds', 'cf', 'cfx', 'debt', 'value', 'rent', 'dsti', 'dti', 'count', 'outside', 'cash'];
    const s = {}; keys.forEach((k) => (s[k] = new Array(T + 1).fill(0)));
    /* state of an asset at month t, ignoring whether it has been sold */
    function st(h, t) {
      const p = P0[h.id]; if (!isFinite(p) || t < p) return null;
      const v = V[h.id], age = t - p, i = mi(h), live = age < v.payoff;
      const B = live ? balK(v.B0, i, v.P + v.X, age) : 0;
      const improved = (h.liftValue || h.liftIncome) && age >= Math.max(0, h.capexMonths || 0), merged = t >= mergeAt[h.id];
      const fv = (improved ? 1 + (h.liftValue || 0) / 100 : 1) * (merged ? 1 + (h.exitLift || 0) / 100 : 1);
      const fi = (improved ? 1 + (h.liftIncome || 0) / 100 : 1) * (merged ? 1 + (h.exitLift || 0) / 100 : 1);
      const val = valK(S, h, age) * fv, heloc = funds[h.id] && age >= v.locM ? v.D : 0;
      return { v, age, live, B, val, heloc, gfi: (h.price > 0 ? valK(S, h, age) / h.price : 1) * fi };
    }
    const held = (h, t) => t < sellAt[h.id];
    const exits = {}; let cashBal = 0, outsideCum = 0;
    for (let t = 0; t <= T; t++) {
      /* 1) sales put net proceeds in cash */
      for (const h of hs) if (sellAt[h.id] === t) {
        const a = st(h, t); if (!a) continue;
        const proceeds = a.val * (1 - (h.sellCost || 0) / 100) - a.B - (h.liens || 0) - a.heloc;
        exits[h.id] = { month: t, proceeds, price: a.val };
        if (proceeds >= 0) cashBal += proceeds; else outsideCum += -proceeds;
      }
      /* 2) purchases and improvements use cash first, then outside money */
      for (const h of hs) if (P0[h.id] === t) {
        const need = (t > 0 && !fundedByLOC[h.id] ? (h.price * (h.dp + clPct(S, h))) / 100 : 0) + (h.capex || 0);
        const use = Math.min(cashBal, need); cashBal -= use; outsideCum += need - use;
      }
      /* 3) sum what is held this month */
      let incAdd = 0, debtAdd = 0;
      for (const h of hs) {
        if (!held(h, t)) continue; const a = st(h, t); if (!a) continue;
        const { v } = a, hi = (a.heloc * g.hrate) / 1200, sched = a.live ? v.P : 0, ex = a.live ? v.X : 0, rentG = h.rent * a.gfi;
        s.count[t]++; s.value[t] += a.val; s.debt[t] += a.B + (h.liens || 0) + a.heloc; s.nw[t] += a.val - a.B - (h.liens || 0) - a.heloc;
        s.noi[t] += v.noi * a.gfi; s.ds[t] += sched + hi; s.extra[t] += ex; s.rent[t] += rentG;
        s.monthly[t] += sched + ex + v.escrow + hi; s.dsti[t] += sched + v.escrow + hi;
        const net = (g.rentCount / 100) * rentG - (sched + v.escrow + hi);
        if (net >= 0) incAdd += net; else debtAdd += -net;
      }
      s.nw[t] += cashBal; s.cash[t] = cashBal; s.outside[t] = outsideCum;
      s.cf[t] = s.noi[t] - s.ds[t]; s.cfx[t] = s.cf[t] - s.extra[t];
      const inc = (g.p1 + g.p2) / 12 + incAdd, debts = g.otherDebt + debtAdd;
      s.dti[t] = inc > 0 ? Math.min(999, (debts / inc) * 100) : debts > 0 ? 999 : 0;
    }
    const at = (t) => { t = Math.max(0, Math.min(T, Math.round(t))); const o = { month: t }; keys.forEach((k) => (o[k] = s[k][t]));
      o.cltv = o.value ? (o.debt / o.value) * 100 : 0; o.dscr = o.ds ? o.noi / o.ds : 0; return o; };
    /* every asset's contribution to the portfolio totals at month t; the entries sum exactly to the series values */
    const assetsAt = (t) => { t = Math.min(T, Math.round(t)); const list = hs.map((h) => { if (!held(h, t)) return null; const a = st(h, t); if (!a) return null;
      const v = a.v, hi = (a.heloc * g.hrate) / 1200, sched = a.live ? v.P : 0, ex = a.live ? v.X : 0, inc = v.noi * a.gfi;
      return { id: h.id, addr: h.addr, type: h.type || 'house', equity: a.val - a.B - (h.liens || 0) - a.heloc, value: a.val, debt: a.B + (h.liens || 0) + a.heloc,
        payment: sched + ex + v.escrow + hi, cf: inc - sched - hi, income: inc }; }).filter(Boolean);
      if (s.cash[t] > 0.5) list.push({ id: '__cash', addr: 'Cash from sales', type: 'cash', equity: s.cash[t], value: s.cash[t], debt: 0, payment: 0, cf: 0, income: 0 }); return list; };
    const rows = hs.filter((h) => H(S, h.target)).map((h) => ({ id: h.id, target: h.target, start: P0[h.id], locM: V[h.id].locM,
      end: P0[h.id] + V[h.id].locM, ok: isFinite(P0[h.id] + V[h.id].locM), funds: funds[h.id] }));
    let worst = { dti: 0, month: 0 }; for (let t = 0; t <= T; t++) if (s.dti[t] > worst.dti) worst = { dti: s.dti[t], month: t };
    return { purchase: P0, sellAt, mergeAt, exits, series: s, T, lastBuy, lastEvent, planM: Math.min(T, planM), today: at(0), final: at(Math.min(T, lastEvent)), horizon: at(Math.min(T, planM)),
      at, assetsAt, snap: assetsAt(Math.min(T, planM)), rows, funds, fundedByLOC, V, worst, unfunded: hs.filter((h) => !isFinite(P0[h.id])).map((h) => h.id) };
  }
  function afford(S, h, pl) {
    pl = pl || plan(S);
    const t = H(S, h.target);
    if (!t) return { cls: 'na', txt: 'No target', why: 'Pick the asset this line of credit will fund.' };
    const m = pl.purchase[t.id];
    if (!isFinite(m)) return { cls: 'bad', txt: '✗ Not reachable', why: 'The debt cap leaves no room within 50 years.' };
    const dti = pl.series.dti[Math.min(pl.T, m)], lim = S.g.dti;
    if (dti >= 999) return { cls: 'bad', dti, txt: '✗ Short', why: 'No qualifying income is set (see Assumptions).' };
    const cls = dti <= lim * 0.8 ? 'ok' : dti <= lim ? 'warn' : 'bad';
    return { cls, dti, txt: cls === 'ok' ? '✓ Afford' : cls === 'warn' ? '△ Tight' : '✗ Short', why: 'Debt-to-income ' + dti.toFixed(0) + '% vs ' + lim + '% limit when ' + t.addr + ' closes.' };
  }
  function normalize(S) {
    S.g = Object.assign({}, GDEF, S.g || {});
    S.houses = (S.houses || []).filter((h) => h && h.id).map((h) => { const type = TYPES[h.type] ? h.type : 'house'; return Object.assign(newAsset(type, undefined, { id: h.id }), h, { type }); });
    S.houses.forEach((h) => {
      ['price', 'dp', 'rate', 'term', 'extra', 'rent', 'tax', 'ins', 'hoa', 'liens', 'paid', 'buyIn', 'wait', 'capex', 'capexMonths', 'liftValue', 'liftIncome', 'exitMonth', 'exitLift', 'sellCost'].forEach((k) => { if (!isFinite(+h[k])) h[k] = newAsset(h.type, undefined)[k]; else h[k] = +h[k]; });
      if (h.term < 12 && !h.io) h.term = 360; h.io = !!h.io;
      if (h.growth != null && !isFinite(+h.growth)) h.growth = null;
      if (h.closingPct != null && !isFinite(+h.closingPct)) h.closingPct = null;
      if (typeof h.loanId !== 'string') h.loanId = '';
      if (['hold', 'sell', 'merge'].indexOf(h.exit) < 0) h.exit = 'hold';
      if (typeof h.mergeInto !== 'string') h.mergeInto = '';
    });
    return S;
  }
  function fromListing(o) {
    const err = (m) => ({ ok: false, error: m });
    if (!o || typeof o !== 'object') return err('That file is not a listing file.');
    if (o.schema !== 'house-listing/1') return err('Unrecognized file. Expected schema "house-listing/1".');
    const val = (f) => (f && typeof f === 'object' && f.value !== null && isFinite(+f.value) && +f.value >= 0 ? +f.value : null);
    const src = (f, v) => (v === null ? 'missing' : f && ['listing', 'estimate'].includes(f.source) ? f.source : 'estimate');
    const price = val(o.price); if (!price) return err('The file has no purchase price.');
    const rent = val(o.rentMonthly), taxA = val(o.taxAnnual), insA = val(o.insuranceAnnual), hoa = val(o.hoaMonthly);
    const patch = { price, addr: typeof o.address === 'string' && o.address.trim() ? o.address.trim().slice(0, 80) : 'Imported house' };
    if (rent !== null) patch.rent = rent; if (taxA !== null) patch.tax = Math.round(taxA / 12); if (insA !== null) patch.ins = Math.round(insA / 12); if (hoa !== null) patch.hoa = hoa;
    const rows = [['Address', patch.addr, 'listing'], ['Price', '$' + price.toLocaleString('en-US'), src(o.price, price)],
      ['Monthly rent', rent === null ? 'keeps default' : '$' + rent.toLocaleString('en-US'), src(o.rentMonthly, rent)],
      ['Property tax / mo', taxA === null ? 'keeps default' : '$' + Math.round(taxA / 12).toLocaleString('en-US'), src(o.taxAnnual, taxA)],
      ['Insurance / mo', insA === null ? 'keeps default' : '$' + Math.round(insA / 12).toLocaleString('en-US'), src(o.insuranceAnnual, insA)],
      ['HOA / mo', hoa === null ? 'keeps default' : '$' + hoa.toLocaleString('en-US'), src(o.hoaMonthly, hoa)]];
    const info = o.info && typeof o.info === 'object' ? o.info : {};
    return { ok: true, patch, rows, info, url: typeof o.listingUrl === 'string' ? o.listingUrl : '' };
  }
  function without(S, id) {
    const c = JSON.parse(JSON.stringify(S));
    c.houses = c.houses.filter((h) => h.id !== id); c.houses.forEach((h) => { if (h.target === id) h.target = ''; if (h.mergeInto === id) h.mergeInto = ''; });
    return c;
  }
  /* Sample scenario (listed in the order the assets are bought): tuned so the plan reaches about $540M of net worth and +$1.4M/mo of cash flow
     after 20 years. It leans on two large business exits at 21-25%/yr growth. Not a forecast. */
  const seed = () => { const A = newAsset; return normalize({ g: Object.assign({}, GDEF), houses: [
    A('house', 'conv30', { id: 'maple', addr: '1412 Maple Ridge Dr', status: 'owned', price: 185000, rate: 6.5, paid: 18, extra: 600, rent: 1900, tax: 215, ins: 90, growth: 4, target: 'birch' }),
    A('house', 'conv30', { id: 'cedar', addr: '2207 Cedar Hollow Ln', status: 'owned', price: 165000, rate: 6.75, paid: 30, extra: 400, rent: 1750, tax: 180, ins: 85, growth: 4, target: 'willow' }),
    A('business', 'sba7a', { id: 'auto', addr: 'Precision Auto Care', status: 'owned', price: 1100000, paid: 12, rent: 34000, growth: 9 }),
    A('house', 'conv30', { id: 'ridge', addr: '5521 Ridgeview Ct', price: 140000, buyIn: 12, rent: 1525, tax: 160, ins: 75, growth: 4, capex: 28000, capexMonths: 4, liftValue: 14, liftIncome: 8, exit: 'sell', exitMonth: 42 }),
    A('commercial', 'comm25', { id: 'north', addr: 'Northgate Retail Strip', price: 1900000, rent: 19200, tax: 900, ins: 700, hoa: 500, growth: 5, buyIn: 18 }),
    A('house', 'conv30', { id: 'birch', addr: '908 Birchwood Ct', price: 195000, rent: 2000, tax: 220, ins: 90, growth: 4, capex: 30000, capexMonths: 4, liftValue: 12, liftIncome: 8, exit: 'sell', exitMonth: 56 }),
    A('business', 'sba7a', { id: 'bridgeway', addr: 'Bridgeway Software', price: 9000000, rent: 120000, growth: 24.78, buyIn: 24, exit: 'sell', exitMonth: 228 }),
    A('business', 'bankbiz', { id: 'freight', addr: 'Summit Freight & Logistics', price: 5200000, rent: 95000, growth: 6.33, buyIn: 30 }),
    A('house', 'dscr', { id: 'willow', addr: '3350 Willow Bend Rd', price: 210000, rent: 2125, tax: 235, ins: 95, growth: 4 }),
    A('commercial', 'comm25', { id: 'harbor', addr: 'Harbor St Self-Storage', price: 4200000, rent: 41900, tax: 1800, ins: 1500, hoa: 900, growth: 5, buyIn: 36 }),
    A('business', 'sba7a', { id: 'keystone', addr: 'Keystone HVAC Services', price: 2200000, rent: 46000, growth: 10, buyIn: 36, exit: 'merge', exitMonth: 72, exitLift: 15, mergeInto: 'auto' }),
    A('house', 'conv30', { id: 'syc', addr: '7702 Sycamore Dr', price: 150000, buyIn: 40, rent: 1625, tax: 170, ins: 80, growth: 4, capex: 25000, capexMonths: 3, liftValue: 15, liftIncome: 9, exit: 'sell', exitMonth: 76 }),
    A('business', 'sba7a', { id: 'apex', addr: 'Apex Property Services', price: 2800000, rent: 58000, growth: 12, buyIn: 48, exit: 'merge', exitMonth: 84, exitLift: 20, mergeInto: 'freight' }),
    A('commercial', 'comm25', { id: 'lake', addr: 'Lakeview Medical Office', price: 8500000, rent: 83800, tax: 3200, ins: 2600, hoa: 1800, growth: 5, buyIn: 60 }),
    A('business', 'bankbiz', { id: 'meridian', addr: 'Meridian Staffing Group', price: 6500000, rent: 105000, growth: 20.78, buyIn: 60, capex: 300000, capexMonths: 9, liftValue: 25, liftIncome: 15, exit: 'sell', exitMonth: 204 }),
    A('commercial', 'comm25', { id: 'east', addr: 'Eastgate Shopping Plaza', price: 6200000, rent: 62000, tax: 2600, ins: 2100, hoa: 1400, growth: 5, buyIn: 80, capex: 800000, capexMonths: 12, liftValue: 20, liftIncome: 14, exit: 'sell', exitMonth: 150 }),
    A('house', 'conv30', { id: 'linden', addr: '2914 Linden Way', price: 175000, buyIn: 90, rent: 1825, tax: 195, ins: 85, growth: 4 }),
    A('commercial', 'bridge', { id: 'river', addr: 'Riverside Flex Industrial', price: 16000000, rent: 161800, tax: 5800, ins: 4500, hoa: 2500, growth: 5, buyIn: 96, capex: 1200000, capexMonths: 12, liftValue: 18, liftIncome: 12, exit: 'sell', exitMonth: 160 }),
    A('commercial', 'comm25', { id: 'west', addr: 'Westfield Office Park', price: 11000000, rent: 112000, tax: 4200, ins: 3300, hoa: 2400, growth: 5, buyIn: 120 })] }); };
  const E = { GDEF, TYPES, LOANS, loansFor, applyLoan, newAsset, newHouse, normalize, fromListing, seed, view, plan, afford, without, extraFor, locMonths, payoffN, pmt, payment, loan, balToday, need, H };
  if (typeof module !== 'undefined' && module.exports) module.exports = E; else root.Engine = E;
})(typeof window !== 'undefined' ? window : globalThis);
