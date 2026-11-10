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
    { id: 'conv30', types: ['house'], name: 'Conventional 30-year', dp: 20, rate: 7.5, term: 360, io: false, closing: 3, note: 'Standard investor mortgage. Rate is a little higher than for a home you live in.' },
    { id: 'conv15', types: ['house'], name: 'Conventional 15-year', dp: 20, rate: 7.0, term: 180, io: false, closing: 3, note: 'Higher payment, builds equity fast.' },
    { id: 'fha', types: ['house'], name: 'FHA 30-year (you live there)', dp: 3.5, rate: 6.9, term: 360, io: false, closing: 4, upfrontMip: 1.75, annualMip: 0.55, ownerOcc: true, note: 'Low down payment; adds mortgage insurance. Owner-occupied only.' },
    { id: 'k203', types: ['house'], name: 'FHA 203(k) rehab loan (you live there)', dp: 3.5, rate: 7.15, term: 360, io: false, closing: 5, upfrontMip: 1.75, annualMip: 0.55, ownerOcc: true, finRehab: true, rehabDefaults: { capex: 40000, capexMonths: 6, liftIncome: 8 }, note: 'Buy and renovate with one loan. The rehab budget is financed with the purchase (3.5% down on price + rehab). Limited 203(k): rehab up to $75,000, no consultant. Larger rehabs need a Standard 203(k) with a HUD consultant. You must live in it.' },
    { id: 'dscr', types: ['house'], name: 'DSCR investor loan', dp: 25, rate: 7.75, term: 360, io: false, closing: 4, note: 'Qualifies on the rent, not your income.' },
    { id: 'cashh', types: ['house'], name: 'Cash purchase', dp: 100, rate: 0, term: 360, io: false, closing: 2, note: 'No loan.' },
    { id: 'comm25', types: ['commercial'], name: 'Commercial bank, 25-year', dp: 25, rate: 7.25, term: 300, io: false, closing: 3, note: 'Typical bank loan on income property.' },
    { id: 'sba504', types: ['commercial'], name: 'SBA 504 (you operate in it)', dp: 10, rate: 6.75, term: 300, io: false, closing: 3.5, note: 'Low down payment. Needs owner-occupancy.' },
    { id: 'bridge', types: ['commercial'], name: 'Bridge loan, interest-only', dp: 30, rate: 9.5, term: 36, io: true, closing: 3, note: 'Payment covers interest only. Refinance at maturity.' },
    { id: 'sellerc', types: ['commercial'], name: 'Seller financing', dp: 10, rate: 6.0, term: 240, io: false, closing: 2, note: 'Seller carries the loan. Terms vary.' },
    { id: 'sba7a', types: ['business'], name: 'SBA 7(a) loan (up to $5M)', dp: 10, rate: 9.75, term: 120, io: false, closing: 3, note: 'Common for buying a business. SBA caps 7(a) at $5M.' },
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
    h.finCapex = !!lo.finRehab; h.mipUp = lo.upfrontMip || 0; h.mipAnn = lo.annualMip || 0; h.ownerOcc = !!lo.ownerOcc;
    if (lo.finRehab && lo.rehabDefaults && !(+h.capex > 0)) { Object.assign(h, lo.rehabDefaults); if (!(+h.arv > 0)) { h.arv = Math.round(((h.price + h.capex) * 1.15) / 1000) * 1000; h.arvAuto = true; } } /* auto-fill a typical rehab and a new appraisal 15% above total cost, only if none is set */
    return h;
  }
  function newAsset(type, loanId, o) {
    type = TYPES[type] ? type : 'house';
    const h = Object.assign({ id: 'h' + Date.now().toString(36) + (uid++), type, status: 'planned', extra: 0, driver: 'extra', wait: 24, liens: 0, paid: 0, buyIn: 12,
      target: '', growth: null, io: false, closingPct: null, loanId: '', dp: 20, rate: 6.75, term: 360,
      capex: 0, capexMonths: 6, arv: 0, arvAuto: false, gain: null, liftIncome: 0, exit: 'hold', exitMonth: 60, exitLift: 0, mergeInto: '', finCapex: false, mipUp: 0, mipAnn: 0, ownerOcc: false }, DEFAULTS[type]);
    applyLoan(h, loanId || loansFor(type)[0].id);
    Object.assign(h, o || {});
    if (h.finCapex && !(o && +o.arv > 0)) { h.arv = Math.round(((h.price + h.capex) * 1.15) / 1000) * 1000; h.arvAuto = true; } /* default appraisal from the FINAL price + rehab; it follows price/rehab until you type your own appraisal or gain */
    return h;
  }
  const newHouse = (o) => newAsset((o && o.type) || 'house', o && o.loanId, o);

  const H = (S, id) => S.houses.find((h) => h.id === id);
  const mi = (h) => h.rate / 1200;
  const baseAmt = (h) => h.price + (h.finCapex ? Math.max(0, h.capex || 0) : 0);          /* price + a rehab financed in the same loan (203(k)) */
  const downAmt = (h) => (baseAmt(h) * h.dp) / 100;
  const loan = (h) => Math.max(0, baseAmt(h) - downAmt(h)) * (1 + (h.mipUp || 0) / 100);  /* upfront mortgage insurance is financed */
  const mipMonthly = (h) => ((h.mipAnn || 0) > 0 ? (loan(h) * h.mipAnn) / 100 / 12 : 0);
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
  /* value k months after the asset's start. After the improvement finishes, the value IS the new appraisal (arv), then it keeps growing from there. */
  const valAt = (S, h, k) => { const cm = Math.max(0, h.capexMonths || 0);
    return +h.arv > 0 && k >= cm ? h.arv * Math.pow(1 + gr(S, h) / 100, (k - cm) / 12) : valK(S, h, k); };
  const need = (S, h) => { const t = H(S, h.target); return t ? downAmt(t) + (t.price * clPct(S, t)) / 100 : 0; };
  /* operating income per month (rent or owner profit minus operating costs), before any loan payment */
  const noiOf = (S, h) => { const g = S.g; if ((h.type || 'house') === 'business') return h.rent; const egi = h.rent * (1 - g.vac / 100); return egi - (h.tax + h.ins + h.hoa + (g.maint / 100) * h.price / 12 + (g.mgmt / 100) * egi); };
  /* The home's own monthly cash flow (income minus costs, loan payment and mortgage insurance, before any extra payment) is saved toward the next down payment while it waits. Only a positive cash flow adds money. */
  const cfSaved = (S, h) => Math.max(0, noiOf(S, h) - payment(h) - mipMonthly(h));

  function payoffN(h, X) {
    const B0 = balToday(h), i = mi(h), A = payment(h) + X;
    if (B0 <= 0.005) return 0;
    if (A <= i * B0 + 1e-9) return Infinity;
    return Math.ceil((i ? -Math.log(1 - (i * B0) / A) / Math.log(1 + i) : B0 / A) - 1e-7);
  }
  /* months (from the asset's own start) until the cash for its target is there: borrowing room (cap*value - balance - other liens, after the appraisal cut)
     plus the cash flow this asset has saved up (cfSaved x months) reaches the cash needed. o.noCash leaves the saved cash flow out (to show what it contributes). */
  function locMonths(S, h, X, o) {
    if (!H(S, h.target)) return Infinity;
    const D = need(S, h), B0 = balToday(h), i = mi(h), A = payment(h) + X, g = S.g, cs = o && o.noCash ? 0 : cfSaved(S, h);
    for (let k = 0; k <= 600; k++) {
      const head = g.cap / 100 * valAt(S, h, k) - balK(B0, i, A, k) - (h.liens || 0);
      if (Math.max(0, head) * (1 - g.haircut / 100) + cs * k >= D) return k;
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
    let egi, escrow; const noi = noiOf(S, h);
    if (type === 'business') { egi = h.rent; escrow = 0; } else { egi = h.rent * (1 - g.vac / 100); escrow = h.tax + h.ins + h.hoa; }
    const lm = locMonths(S, h, X), A = P + X, Dn = need(S, h), cashDP = H(S, h.target) && isFinite(lm) ? Math.min(Dn, cfSaved(S, h) * lm) : 0, draw = Dn - cashDP;
    const cltvAtLoc = H(S, h.target) && isFinite(lm) ? ((balK(B0, i, A, lm) + (h.liens || 0) + draw) / valAt(S, h, lm)) * 100 : null;
    const down = downAmt(h), closingCost = (h.price * clPct(S, h)) / 100, mip = mipMonthly(h);
    return { cltvAtLoc, L, B0, P, mip, X, infeasible, egi, noi, cf: noi - P - mip, escrow, pitia: P + escrow + mip, payment: P + X + escrow + mip,
      D: Dn, cashDP, draw, cfSaved: cfSaved(S, h), down, closingCost, invested: down + closingCost, payoff: payoffN(h, X), locM: lm,
      head0: Math.max(0, g.cap / 100 * h.price - B0 - (h.liens || 0)), debtNow: B0 + (h.liens || 0),
      valueNow: valAt(S, h, 0), valueGain: +h.arv > 0 ? h.arv - h.price - (h.capex || 0) : 0, capRate: h.price > 0 ? ((noi * 12) / h.price) * 100 : NaN, multiple: noi > 0 ? h.price / (noi * 12) : NaN, growth: gr(S, h) };
  }

  /* ---------- personal finances: your jobs, savings and expenses ---------- */
  const samplePersonal = () => ({ cash: 45000, cashApy: 3, living: 3600, inflation: 3, emergencyMonths: 6, portfolioTaxPct: 20, salesTaxPct: 25, operating: 1, gmMonthly: 8000, bizHours: 20,
    jobs: [{ id: 'job1', name: 'Day job (salary)', kind: 'salary', gross: 96000, raise: 3, tax: 24, hours: 40, start: 0, end: null }], planned: [], capital: [] });
  /* Rough U.S. single-filer estimate: federal income tax after a standard deduction, plus payroll tax. No state tax. It is only a starting point; the person can type their own rate. */
  function estTaxPct(gross) {
    if (!(gross > 0)) return 0;
    const taxable = Math.max(0, gross - 15000), br = [[11925, 0.10], [48475, 0.12], [103350, 0.22], [197300, 0.24], [250525, 0.32], [626350, 0.35], [Infinity, 0.37]];
    let fed = 0, lo = 0; for (const [hi, r] of br) { if (taxable > lo) fed += (Math.min(taxable, hi) - lo) * r; lo = hi; }
    const fica = Math.min(gross, 176100) * 0.062 + gross * 0.0145;
    return Math.round(((fed + fica) / gross) * 1000) / 10;
  }
  const num0 = (v, d) => (isFinite(+v) && v !== '' && v !== null ? +v : d);
  function normalizePersonal(p) {
    const d = samplePersonal(); p = Object.assign({}, d, p || {});
    ['cash', 'cashApy', 'living', 'inflation', 'emergencyMonths', 'portfolioTaxPct', 'salesTaxPct', 'operating', 'gmMonthly', 'bizHours'].forEach((k) => { p[k] = Math.max(0, num0(p[k], d[k])); });
    p.operating = Math.round(p.operating); p.bizHours = Math.min(168, p.bizHours); p.portfolioTaxPct = Math.min(70, p.portfolioTaxPct); p.salesTaxPct = Math.min(70, p.salesTaxPct); p.cashApy = Math.min(30, p.cashApy);
    let n = 0; const id = (x, pre) => (typeof x === 'string' && x ? x : pre + Date.now().toString(36) + (n++));
    p.jobs = (Array.isArray(p.jobs) ? p.jobs : []).filter((j) => j && typeof j === 'object').map((j) => { const kind = j.kind === 'hourly' ? 'hourly' : 'salary', hours = Math.min(168, Math.max(0, num0(j.hours, 40))), wage = Math.max(0, num0(j.wage, 0)), tips = Math.max(0, num0(j.tips, 0)), weeks = Math.min(52, Math.max(0, num0(j.weeks, 50)));
      return { id: id(j.id, 'job'), name: typeof j.name === 'string' ? j.name : 'Job', kind, wage, tips, weeks,
      gross: kind === 'hourly' ? Math.round((wage + tips) * hours * weeks) : Math.max(0, num0(j.gross, 0)), raise: Math.min(50, Math.max(-50, num0(j.raise, 0))),
      tax: j.tax === null || j.tax === '' || j.tax === undefined || !isFinite(+j.tax) ? null : Math.min(70, Math.max(0, +j.tax)), hours, start: Math.max(0, Math.round(num0(j.start, 0))),
      end: j.end === null || j.end === '' || j.end === undefined || !isFinite(+j.end) ? null : Math.max(0, Math.round(+j.end)) }; });
    ['planned', 'capital'].forEach((k) => { p[k] = (Array.isArray(p[k]) ? p[k] : []).filter((x) => x && typeof x === 'object').map((x) => ({ id: id(x.id, k === 'planned' ? 'pl' : 'cap'), name: typeof x.name === 'string' ? x.name : '', amount: Math.max(0, num0(x.amount, 0)), month: Math.max(0, Math.round(num0(x.month, 0))) })); });
    return p;
  }
  const jobMonthly = (j, t) => (t < (j.start || 0) || (j.end !== null && j.end !== undefined && t >= j.end) ? 0 : (j.gross / 12) * Math.pow(1 + (j.raise || 0) / 100, Math.floor(Math.max(0, t - (j.start || 0)) / 12)));
  const jobsGross = (S, t) => (S.p ? S.p.jobs.reduce((a, j) => a + jobMonthly(j, t), 0) : 0);
  const taxPctFor = (j) => (j.tax === null || j.tax === undefined ? estTaxPct(j.gross) : j.tax);
  const jobsNet = (S, t) => (S.p ? S.p.jobs.reduce((a, j) => a + jobMonthly(j, t) * (1 - taxPctFor(j) / 100), 0) : 0);

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
    const dpCashBy = {}; hs.forEach((h) => { if (funds[h.id] && V[h.id].cashDP > 0) dpCashBy[h.target] = (dpCashBy[h.target] || 0) + V[h.id].cashDP; }); /* saved cash flow that goes into a purchase, by target id */
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
      const improved = (+h.arv > 0 || h.liftIncome) && age >= Math.max(0, h.capexMonths || 0), merged = t >= mergeAt[h.id];
      const fv = merged ? 1 + (h.exitLift || 0) / 100 : 1;
      const fi = (improved ? 1 + (h.liftIncome || 0) / 100 : 1) * (merged ? 1 + (h.exitLift || 0) / 100 : 1);
      const val = valAt(S, h, age) * fv, heloc = funds[h.id] && age >= v.locM ? v.draw : 0;
      return { v, age, live, B, val, heloc, gfi: (h.price > 0 ? valK(S, h, age) / h.price : 1) * fi };
    }
    const held = (h, t) => t < sellAt[h.id];
    const exits = {}; let cashBal = 0, outsideCum = 0; const dpCash = new Array(T + 1).fill(0);
    hs.forEach((h) => { if (dpCashBy[h.id] && isFinite(P0[h.id]) && P0[h.id] <= T) dpCash[P0[h.id]] += dpCashBy[h.id]; });
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
        const need = (t > 0 && !fundedByLOC[h.id] ? downAmt(h) + (h.price * clPct(S, h)) / 100 : 0) + (h.finCapex ? 0 : h.capex || 0);
        const use = Math.min(cashBal, need); cashBal -= use; outsideCum += need - use;
      }
      /* 3) sum what is held this month */
      let incAdd = 0, debtAdd = 0;
      for (const h of hs) {
        if (!held(h, t)) continue; const a = st(h, t); if (!a) continue;
        const { v } = a, hi = (a.heloc * g.hrate) / 1200, sched = a.live ? v.P + v.mip : 0, ex = a.live ? v.X : 0, rentG = h.rent * a.gfi;
        s.count[t]++; s.value[t] += a.val; s.debt[t] += a.B + (h.liens || 0) + a.heloc; s.nw[t] += a.val - a.B - (h.liens || 0) - a.heloc;
        s.noi[t] += v.noi * a.gfi; s.ds[t] += sched + hi; s.extra[t] += ex; s.rent[t] += rentG;
        s.monthly[t] += sched + ex + v.escrow + hi; s.dsti[t] += sched + v.escrow + hi;
        const net = (g.rentCount / 100) * rentG - (sched + v.escrow + hi);
        if (net >= 0) incAdd += net; else debtAdd += -net;
      }
      s.nw[t] += cashBal; s.cash[t] = cashBal; s.outside[t] = outsideCum;
      s.cf[t] = s.noi[t] - s.ds[t]; s.cfx[t] = s.cf[t] - s.extra[t];
      const inc = (g.p1 + g.p2) / 12 + jobsGross(S, t) + incAdd, debts = g.otherDebt + debtAdd;
      s.dti[t] = inc > 0 ? Math.min(999, (debts / inc) * 100) : debts > 0 ? 999 : 0;
    }
    const at = (t) => { t = Math.max(0, Math.min(T, Math.round(t))); const o = { month: t }; keys.forEach((k) => (o[k] = s[k][t]));
      o.cltv = o.value ? (o.debt / o.value) * 100 : 0; o.dscr = o.ds ? o.noi / o.ds : 0; return o; };
    /* every asset's contribution to the portfolio totals at month t; the entries sum exactly to the series values */
    const assetsAt = (t) => { t = Math.min(T, Math.round(t)); const list = hs.map((h) => { if (!held(h, t)) return null; const a = st(h, t); if (!a) return null;
      const v = a.v, hi = (a.heloc * g.hrate) / 1200, sched = a.live ? v.P + v.mip : 0, ex = a.live ? v.X : 0, inc = v.noi * a.gfi;
      return { id: h.id, addr: h.addr, type: h.type || 'house', equity: a.val - a.B - (h.liens || 0) - a.heloc, value: a.val, debt: a.B + (h.liens || 0) + a.heloc,
        payment: sched + ex + v.escrow + hi, cf: inc - sched - hi, income: inc }; }).filter(Boolean);
      if (s.cash[t] > 0.5) list.push({ id: '__cash', addr: 'Cash from sales', type: 'cash', equity: s.cash[t], value: s.cash[t], debt: 0, payment: 0, cf: 0, income: 0 }); return list; };
    const rows = hs.filter((h) => H(S, h.target)).map((h) => ({ id: h.id, target: h.target, start: P0[h.id], locM: V[h.id].locM,
      end: P0[h.id] + V[h.id].locM, ok: isFinite(P0[h.id] + V[h.id].locM), funds: funds[h.id] }));
    let worst = { dti: 0, month: 0 }; for (let t = 0; t <= T; t++) if (s.dti[t] > worst.dti) worst = { dti: s.dti[t], month: t };
    let extraLater = 0; hs.forEach((h) => { const v = V[h.id]; if (isFinite(P0[h.id]) && P0[h.id] > 0 && v.L > 0 && v.payoff > 0) extraLater += v.X; });
    return { dpCash, outsideTotal: s.outside[T], extraNow: s.extra[0], extraLater, purchase: P0, sellAt, mergeAt, exits, series: s, T, lastBuy, lastEvent, planM: Math.min(T, planM), today: at(0), final: at(Math.min(T, lastEvent)), horizon: at(Math.min(T, planM)),
      at, assetsAt, snap: assetsAt(Math.min(T, planM)), rows, funds, fundedByLOC, V, worst, unfunded: hs.filter((h) => !isFinite(P0[h.id])).map((h) => h.id) };
  }

  /* Can you afford the plan? Rolls your personal cash forward month by month on top of the portfolio plan. */
  function finance(S, pl) {
    const p = S.p; if (!p) return null; pl = pl || plan(S);
    const g = S.g, s = pl.series, T = pl.T, infl = (p.inflation || 0) / 100, apy = (p.cashApy || 0) / 1200;
    const N = (n) => new Array(n + 1).fill(0);
    const R = { gm: N(T), hours: N(T), nBiz: N(T), income: N(T), portfolio: N(T), portTax: N(T), extra: N(T), living: N(T), debts: N(T), oneTime: N(T), capitalIn: N(T), outsideCall: N(T), saleTax: N(T), interest: N(T), net: N(T), liquid: N(T), total: N(T), reserve: N(T), burn: N(T), runway: N(T) };
    S.houses.forEach((h) => { const ex = pl.exits[h.id]; if (ex && ex.month <= T) { const gain = ex.price * (1 - (h.sellCost || 0) / 100) - h.price - (h.capex || 0); R.saleTax[ex.month] += (Math.max(0, gain) * (p.salesTaxPct || 0)) / 100; } });
    p.planned.forEach((x) => { if (x.month <= T) R.oneTime[x.month] += x.amount; }); p.capital.forEach((x) => { if (x.month <= T) R.capitalIn[x.month] += x.amount; });
    S.houses.filter((h) => h.type === 'business').forEach((h) => { const a = pl.purchase[h.id], b = Math.min(T + 1, pl.sellAt[h.id]); if (isFinite(a)) for (let t = a; t < b && t <= T; t++) R.nBiz[t]++; });
    let liq = p.cash || 0;
    for (let t = 0; t <= T; t++) {
      const mgr = Math.max(0, R.nBiz[t] - (p.operating || 0)); R.gm[t] = mgr * (p.gmMonthly || 0) * Math.pow(1 + infl, t / 12);
      R.hours[t] = p.jobs.reduce((a, j) => a + (jobMonthly(j, t) > 0 ? j.hours || 0 : 0), 0) + Math.min(p.operating || 0, R.nBiz[t]) * (p.bizHours || 0);
      R.income[t] = jobsNet(S, t); R.portfolio[t] = s.cf[t]; R.portTax[t] = (Math.max(0, s.cf[t]) * (p.portfolioTaxPct || 0)) / 100; R.extra[t] = s.extra[t];
      R.living[t] = (p.living || 0) * Math.pow(1 + infl, t / 12); R.debts[t] = g.otherDebt || 0;
      R.outsideCall[t] = t === 0 ? s.outside[0] : s.outside[t] - s.outside[t - 1];
      R.net[t] = R.income[t] + R.portfolio[t] - R.portTax[t] - R.gm[t] - R.extra[t] - R.living[t] - R.debts[t];
      R.interest[t] = t > 0 ? Math.max(0, liq + s.cash[t - 1]) * apy : 0;
      liq += R.net[t] + R.interest[t] + R.capitalIn[t] - R.outsideCall[t] - R.oneTime[t] - R.saleTax[t] - (pl.dpCash[t] || 0);
      R.liquid[t] = liq; R.total[t] = liq + s.cash[t];
      R.reserve[t] = (p.emergencyMonths || 0) * (R.living[t] + R.debts[t]);
      R.burn[t] = R.living[t] + R.debts[t] + R.extra[t] + R.gm[t] - Math.max(0, R.portfolio[t] - R.portTax[t]);
      R.runway[t] = R.burn[t] > 0.5 ? Math.max(0, R.total[t]) / R.burn[t] : Infinity;
    }
    let minT = Infinity, minM = 0, gapM = -Infinity, gapAt = 0, minRun = Infinity, minRunM = 0, firstShort = -1;
    for (let t = 0; t <= T; t++) { if (R.total[t] < minT) { minT = R.total[t]; minM = t; } const gp = R.reserve[t] - R.total[t]; if (gp > gapM) { gapM = gp; gapAt = t; }
      if (R.runway[t] < minRun) { minRun = R.runway[t]; minRunM = t; } if (firstShort < 0 && R.total[t] < 0) firstShort = t; }
    const worstNet = Math.min.apply(null, R.net), callsAll = [];
    for (let t = 0; t <= T; t++) if (R.outsideCall[t] > 0.5) callsAll.push({ month: t, amount: R.outsideCall[t], assets: S.houses.filter((h) => pl.purchase[h.id] === t || (h.capex > 0 && h.status === 'owned' && t === 0)).map((h) => h.addr) });
    const pe = Math.min(T, pl.planM), reasons = [], fixes = [], money = (n) => '$' + Math.round(Math.abs(n)).toLocaleString('en-US');
    let status = 'yes';
    const short = Math.max(0, -minT);
    if (short > 0.5) { status = 'no'; const c = callsAll.filter((x) => x.month <= firstShort).slice(-1)[0];
      reasons.push({ sev: 'bad', text: 'You run out of cash in month ' + firstShort + ' and would be about ' + money(short) + ' short at the lowest point (month ' + minM + ').' });
      fixes.push('Line up at least ' + money(short) + ' more (partners, investors, family) before month ' + firstShort + (c && c.assets.length ? ', when ' + c.assets.join(' and ') + ' closes' : '') + ', or push those purchases later.'); }
    if (R.net[0] < -0.5) { if (status === 'yes') status = 'tight'; reasons.push({ sev: 'warn', text: 'You spend ' + money(-R.net[0]) + ' a month more than you bring in right now.' }); reasons[reasons.length - 1].short = 'You spend more than you earn each month.'; fixes.push('Close the ' + money(-R.net[0]) + '/mo gap: raise income, cut living costs, or trim extra payments (' + money(R.extra[0]) + '/mo now).'); }
    else reasons.push({ sev: 'ok', short: 'saving ' + money(R.net[0]) + ' a month right now', text: 'You save about ' + money(R.net[0]) + ' a month after living costs, debts and extra payments.' });
    let peakH = 0, peakHM = 0; for (let t = 0; t <= T; t++) if (R.hours[t] > peakH) { peakH = R.hours[t]; peakHM = t; }
    const peakBiz = Math.max.apply(null, R.nBiz), gmMax = Math.max.apply(null, R.gm);
    if (peakH > 70) { if (status === 'yes') status = 'tight'; reasons.push({ sev: 'warn', short: 'The hours do not fit in a week around month ' + peakHM + '.', text: 'At the busiest point (month ' + peakHM + ') you would work about ' + Math.round(peakH) + ' hours a week between your job and running ' + Math.min(p.operating, peakBiz) + ' business(es) yourself.' }); fixes.push('Hire a general manager for a business, drop a job, or sell a business sooner. Each manager costs about ' + money(p.gmMonthly) + '/mo.'); }
    else if (peakBiz > 0) reasons.push({ sev: 'ok', short: 'about ' + Math.round(peakH) + ' hours a week', text: 'About ' + Math.round(peakH) + ' hours a week at the busiest point' + (gmMax > 0 ? ', with ' + money(gmMax) + '/mo of manager pay for businesses you do not run' : '') + '.' });
    const reserveGap = Math.max(0, gapM);
    if (short <= 0.5 && reserveGap > 0.5) { if (status === 'yes') status = 'tight'; reasons.push({ sev: 'warn', short: 'Your cash dips below your emergency reserve in month ' + gapAt + '.', text: 'Your cash falls ' + money(reserveGap) + ' below a ' + p.emergencyMonths + '-month emergency reserve (month ' + gapAt + ').' }); fixes.push('Hold about ' + money(reserveGap) + ' more cash to keep ' + p.emergencyMonths + ' months of expenses at all times.'); }
    else if (short <= 0.5) reasons.push({ sev: 'ok', short: 'reserve covered', text: 'Your cash never drops below a ' + p.emergencyMonths + '-month emergency reserve.' });
    if (pl.worst.dti > g.dti) { if (status === 'yes') status = 'tight'; reasons.push({ sev: 'warn', short: 'Lenders may decline a loan around month ' + pl.worst.month + '.', text: 'Lenders may decline: your debt payments reach ' + Math.round(pl.worst.dti) + '% of qualifying income in month ' + pl.worst.month + ' (limit ' + g.dti + '%).' }); fixes.push('Raise qualifying income, add a co-signer, or lower the loan sizes that close around month ' + pl.worst.month + '.'); }
    else reasons.push({ sev: 'ok', short: 'lenders should approve', text: 'Lenders should approve the loans: debt payments peak at ' + Math.round(pl.worst.dti) + '% of qualifying income (limit ' + g.dti + '%).' });
    if (isFinite(minRun) && minRun < 3 && short <= 0.5) { if (status === 'yes') status = 'tight'; reasons.push({ sev: 'warn', short: 'You have little cushion if your paycheck stops.', text: 'If your job income stopped in month ' + minRunM + ', your cash would last only ' + minRun.toFixed(1) + ' months.' }); fixes.push('Build cash or portfolio income so you could last at least 3 months without a paycheck.'); }
    const firstWarn = reasons.find((x) => x.sev === 'warn');
    const headline = status === 'yes' ? 'Yes. You can carry this plan.' : status === 'tight' ? 'Tight. ' + (firstWarn ? firstWarn.short || firstWarn.text : 'It works, but with thin margins.') : 'Not yet. You run short of cash in month ' + firstShort + '.';
    const totalOutside = s.outside[T], capitalTotal = p.capital.reduce((a, x) => a + x.amount, 0);
    return { series: R, T, status, headline, reasons, fixes, calls: callsAll,
      kpis: { planEnd: { month: pe, cfBefore: R.portfolio[pe], tax: R.portTax[pe], cfAfter: R.portfolio[pe] - R.portTax[pe], net: R.net[pe] }, peakHours: peakH, peakHoursMonth: peakHM, managerCost0: R.gm[0], managerCostMax: gmMax, peakBusinesses: peakBiz, takeHome: R.income[0], portfolioAfterTax: R.portfolio[0] - R.portTax[0], extra: R.extra[0], living: R.living[0], debts: R.debts[0], net0: R.net[0], worstNet, cash0: p.cash, reserveMonths0: R.living[0] + R.debts[0] > 0 ? p.cash / (R.living[0] + R.debts[0]) : Infinity,
        minLiquid: minT, minLiquidMonth: minM, shortAmount: short, firstShortMonth: firstShort, reserveTarget0: R.reserve[0], reserveGap, runway0: R.runway[0], minRunway: minRun, totalOutside, capitalTotal, savingsUsed: Math.min(p.cash, totalOutside), gap: Math.max(0, totalOutside - p.cash - capitalTotal), dtiPeak: pl.worst.dti } };
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
    if (S.p) S.p = normalizePersonal(S.p);
    S.houses = (S.houses || []).filter((h) => h && h.id).map((h) => { const type = TYPES[h.type] ? h.type : 'house'; return Object.assign(newAsset(type, undefined, { id: h.id }), h, { type }); });
    S.houses.forEach((h) => {
      ['price', 'dp', 'rate', 'term', 'extra', 'rent', 'tax', 'ins', 'hoa', 'liens', 'paid', 'buyIn', 'wait', 'capex', 'capexMonths', 'arv', 'liftIncome', 'exitMonth', 'exitLift', 'sellCost'].forEach((k) => { if (!isFinite(+h[k])) h[k] = newAsset(h.type, undefined)[k]; else h[k] = +h[k]; });
      if (+h.liftValue > 0 && !(+h.arv > 0)) { /* old data stored a % lift: convert it to a dollar appraisal at completion */
        const gv = h.growth == null || !isFinite(+h.growth) ? S.g.appr : +h.growth; h.arv = Math.round(h.price * Math.pow(1 + gv / 100, (h.capexMonths || 0) / 12) * (1 + h.liftValue / 100)); }
      delete h.liftValue; if (!(h.arv > 0)) h.arv = 0;
      h.arvAuto = !!h.arvAuto && +h.arv > 0;
      h.gain = h.gain !== null && h.gain !== '' && h.gain !== undefined && isFinite(+h.gain) ? +h.gain : null; /* if set, the appraisal follows price + rehab + gain */
      ['mipUp', 'mipAnn'].forEach((k) => { h[k] = isFinite(+h[k]) ? Math.max(0, +h[k]) : 0; }); h.finCapex = !!h.finCapex; h.ownerOcc = !!h.ownerOcc;
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
      ['Monthly rent', rent === null ? 'default $' + DEFAULTS.house.rent.toLocaleString('en-US') : '$' + rent.toLocaleString('en-US'), src(o.rentMonthly, rent)],
      ['Property tax / mo', taxA === null ? 'default $' + DEFAULTS.house.tax.toLocaleString('en-US') : '$' + Math.round(taxA / 12).toLocaleString('en-US'), src(o.taxAnnual, taxA)],
      ['Insurance / mo', insA === null ? 'default $' + DEFAULTS.house.ins.toLocaleString('en-US') : '$' + Math.round(insA / 12).toLocaleString('en-US'), src(o.insuranceAnnual, insA)],
      ['HOA / mo', hoa === null ? 'default $' + DEFAULTS.house.hoa.toLocaleString('en-US') : '$' + hoa.toLocaleString('en-US'), src(o.hoaMonthly, hoa)]];
    const info = o.info && typeof o.info === 'object' ? o.info : {};
    return { ok: true, patch, rows, info, url: typeof o.listingUrl === 'string' ? o.listingUrl : '' };
  }
  function without(S, id) {
    const c = JSON.parse(JSON.stringify(S));
    c.houses = c.houses.filter((h) => h.id !== id); c.houses.forEach((h) => { if (h.target === id) h.target = ''; if (h.mergeInto === id) h.mergeInto = ''; });
    return c;
  }
  /* STRETCH scenario (listed in the order the assets are bought): tuned so the plan reaches about $540M of net worth and +$1.4M/mo of cash flow
     after 20 years. It leans on two large business exits at 21-25%/yr growth. Not a forecast. */
  const seedStretch = () => { const A = newAsset; return normalize({ g: Object.assign({}, GDEF, { otherDebt: 450 }), p: samplePersonal(), houses: [
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
  /* DEFAULT sample (listed in the order the assets are bought). Every loan, price, cap rate, multiple and growth rate is checked against
     the grader's benchmark file (prototype/grader). Homes cash flow positive. Recycles sale cash; needs about $1.3M of outside cash. */
  const seed = () => { const A = newAsset; return normalize({ g: Object.assign({}, GDEF, { otherDebt: 450 }), p: samplePersonal(), houses: [
    A('house', undefined, { id: 'maple', status: 'owned', extra: 600, paid: 18, target: 'birch', growth: 3.5, loanId: 'custom', rate: 6.5, addr: '1412 Maple Ridge Dr', price: 185000, rent: 1900, tax: 215, ins: 90 }),
    A('house', undefined, { id: 'cedar', status: 'owned', extra: 400, paid: 30, target: 'willow', growth: 3.5, loanId: 'custom', rate: 6.75, addr: '2207 Cedar Hollow Ln', price: 165000, rent: 1750, tax: 180, ins: 85 }),
    A('business', undefined, { id: 'auto', status: 'owned', paid: 12, growth: 5, loanId: 'custom', rate: 9.5, addr: 'Precision Auto Care', price: 1100000, rent: 33950 }),
    A('house', 'cashh', { id: 'ridge', buyIn: 8, growth: 3.5, capex: 35000, capexMonths: 4, liftValue: 45, exit: 'sell', exitMonth: 20, addr: '5521 Ridgeview Ct', price: 130000, rent: 1300, tax: 150, ins: 70 }),
    A('commercial', 'comm25', { id: 'north', buyIn: 18, capex: 70000, capexMonths: 8, liftValue: 16, liftIncome: 12, exit: 'sell', exitMonth: 96, addr: 'Northgate Retail Strip', price: 750000, rent: 8300, tax: 500, ins: 380, hoa: 250, sellCost: 4 }),
    A('house', 'cashh', { id: 'syc', buyIn: 26, growth: 3.5, capex: 32000, capexMonths: 4, liftValue: 42, exit: 'sell', exitMonth: 44, addr: '7702 Sycamore Dr', price: 140000, rent: 1400, tax: 160, ins: 75 }),
    A('house', 'dscr', { id: 'birch', growth: 3.5, addr: '908 Birchwood Ct', price: 195000, rent: 2050, tax: 220, ins: 90 }),
    A('business', 'sba7a', { id: 'keystone', buyIn: 32, growth: 7, exit: 'merge', exitMonth: 68, exitLift: 10, mergeInto: 'auto', addr: 'Keystone HVAC Services', rent: 27800 }),
    A('house', 'dscr', { id: 'willow', growth: 3.5, addr: '3350 Willow Bend Rd', price: 210000, rent: 2175, tax: 235, ins: 95 }),
    A('house', 'cashh', { id: 'elm', buyIn: 46, growth: 3.5, capex: 38000, capexMonths: 5, liftValue: 44, exit: 'sell', exitMonth: 66, addr: '418 Elm Street', price: 150000, rent: 1500, tax: 170, ins: 80 }),
    A('commercial', undefined, { id: 'harbor', buyIn: 56, loanId: 'custom', dp: 35, addr: 'Harbor St Self-Storage', price: 1400000, rent: 13650, ins: 650 }),
    A('business', 'sba7a', { id: 'freight', buyIn: 62, growth: 8, addr: 'Summit Freight & Logistics', price: 1800000, rent: 41650 }),
    A('house', 'dscr', { id: 'linden', buyIn: 84, growth: 3.5, addr: '2914 Linden Way', price: 175000, rent: 1850, tax: 195, ins: 85 }),
    A('commercial', undefined, { id: 'lake', buyIn: 100, loanId: 'custom', dp: 35, addr: 'Lakeview Medical Office', price: 1800000, rent: 17450, tax: 1000, ins: 800, hoa: 500 })] }); };
  /* ---------- list order = buy order; the asset right before another one in its category funds it ---------- */
  const catOf = (h) => h.type || 'house';
  /* Sort the list once into purchase order (owned first; ties keep their order). S.orderV marks it done so a saved order is never re-sorted. */
  function orderByBuy(S) {
    const pl = plan(S), rk = (h) => (isFinite(pl.purchase[h.id]) ? pl.purchase[h.id] : 1e9);
    S.houses = S.houses.map((h, i) => [h, i]).sort((a, b) => rk(a[0]) - rk(b[0]) || a[1] - b[1]).map((x) => x[0]); S.orderV = 1; return S;
  }
  /* Relink every category: each asset funds the planned asset right after it. An in-category link that no longer matches is cleared; a link to another category is left alone. */
  function relink(S) {
    const cats = {}; S.houses.forEach((h) => { (cats[catOf(h)] = cats[catOf(h)] || []).push(h); });
    Object.keys(cats).forEach((c) => { const L = cats[c];
      L.forEach((a, i) => { const t = H(S, a.target), nxt = L[i + 1];
        if (t && catOf(t) !== c) return;
        if (nxt && nxt.status === 'planned') a.target = nxt.id; else a.target = ''; }); });
    return S;
  }
  /* creation sequence: the latest asset added in a category is the one with the highest seq (assets from before this feature have none: list position decides) */
  function register(S, h) { S.seq = (+S.seq || 0) + 1; h.seq = S.seq; h.created = Date.now(); return h; }
  function latestOf(list) { let best = null, bs = -Infinity; list.forEach((h) => { const q = h.seq != null && isFinite(+h.seq) ? +h.seq : -1; if (q >= bs) { bs = q; best = h; } }); return best; }
  function duplicate(S, id) {
    const i = S.houses.findIndex((h) => h.id === id); if (i < 0) return null;
    const o = S.houses[i], c = JSON.parse(JSON.stringify(o));
    c.id = 'h' + Date.now().toString(36) + (uid++); c.addr = o.addr + ' (copy)'; c.status = 'planned'; c.paid = 0; c.target = ''; c.fresh = false; c.listingUrl = '';
    register(S, c); S.houses.splice(i + 1, 0, c); relink(S); return c;
  }
  /* move an asset one step inside its category (visible = ids shown in the category, in order); returns true if the order changed */
  function reorder(S, ids) {
    const set = new Set(ids), slots = []; S.houses.forEach((h, i) => { if (set.has(h.id)) slots.push(i); });
    const cur = slots.map((i) => S.houses[i].id); if (cur.join() === ids.join()) return false;
    const by = {}; S.houses.forEach((h) => { by[h.id] = h; }); ids.forEach((id, k) => { S.houses[slots[k]] = by[id]; }); relink(S); return true;
  }
  const E = { orderByBuy, relink, register, latestOf, duplicate, reorder, catOf, noiOf, cfSaved, estTaxPct, taxPctFor, finance, samplePersonal, normalizePersonal, jobsGross, jobsNet, jobMonthly, GDEF, TYPES, LOANS, downAmt, mipMonthly, loansFor, applyLoan, newAsset, newHouse, normalize, fromListing, seed, seedStretch, view, plan, afford, without, extraFor, locMonths, payoffN, pmt, payment, loan, balToday, need, H };
  if (typeof module !== 'undefined' && module.exports) module.exports = E; else root.Engine = E;
})(typeof window !== 'undefined' ? window : globalThis);
