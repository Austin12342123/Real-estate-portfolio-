/* Portfolio finance engine v4 — pure functions, no DOM. Browser: window.Engine. Node: module.exports.
   Asset = { id, addr, type:'house'|'commercial'|'business', status:'owned'|'planned', price, dp, rate, term(months), io, closingPct, loanId,
   extra, driver, wait, rent (monthly base rent, or monthly owner profit for a business), tax, ins, hoa (gross costs), nnn (% of tax+ins+hoa tenants repay), mat (months until the loan is due, 0 = none; io loans are due at their term), refiRate/refiTerm (null = Assumptions), liens, paid, buyIn (the earliest month it may be bought; the trust decides the real month), growth(%/yr or null), target (old links; ignored: every asset is funded by the trust of all assets before it) }.
   Percentages are plain numbers (85 = 85%). Money is dollars. Time is months. */
(function (root) {
  const GDEF = { cap: 85, capBiz: 50, haircut: 0, closing: 3, vac: 7, refiRate: 7.5, refiTerm: 300, mgmt: 8, maint: 1, appr: 0, hrate: 8.5, dti: 43,
    p1: 200000, p2: 200000, rentCount: 75, otherDebt: 0, horizon: 480, planYears: 20, autoPay: true };
  const TYPES = { house: { label: 'Single-family home', short: 'Home' }, commercial: { label: 'Commercial property', short: 'Commercial' }, business: { label: 'Business', short: 'Business' } };
  /* Loan options. term is in months. io = interest-only: the balance left at the end of the term is refinanced into a level-payment loan at the Assumptions refinance rate and term (loanPath). */
  const LOANS = [
    { id: 'conv30', types: ['house'], name: 'Conventional 30-year', dp: 20, rate: 7.5, term: 360, io: false, closing: 3, note: 'Standard investor mortgage. Rate is a little higher than for a home you live in.' },
    { id: 'conv15', types: ['house'], name: 'Conventional 15-year', dp: 20, rate: 7.0, term: 180, io: false, closing: 3, note: 'Higher payment, builds equity fast.' },
    { id: 'fha', types: ['house'], name: 'FHA 30-year (you live there)', dp: 3.5, rate: 6.9, term: 360, io: false, closing: 4, upfrontMip: 1.75, annualMip: 0.55, ownerOcc: true, note: 'Low down payment; adds mortgage insurance. Owner-occupied only.' },
    { id: 'k203', types: ['house'], name: 'FHA 203(k) rehab loan (you live there)', dp: 3.5, rate: 7.15, term: 360, io: false, closing: 5, upfrontMip: 1.75, annualMip: 0.55, ownerOcc: true, finRehab: true, rehabDefaults: { capex: 40000, capexMonths: 6, liftIncome: 8 }, note: 'Buy and renovate with one loan. The rehab budget is financed with the purchase (3.5% down on price + rehab). Limited 203(k): rehab up to $75,000, no consultant. Larger rehabs need a Standard 203(k) with a HUD consultant. You must live in it.' },
    { id: 'dscr', types: ['house'], name: 'DSCR investor loan', dp: 25, rate: 7.75, term: 360, io: false, closing: 4, note: 'Qualifies on the rent, not your income.' },
    { id: 'cashh', types: ['house'], name: 'Cash purchase', dp: 100, rate: 0, term: 360, io: false, closing: 2, note: 'No loan.' },
    { id: 'comm25', types: ['commercial'], name: 'Commercial bank, 25-year', dp: 25, rate: 7.25, term: 300, io: false, closing: 3, note: 'Typical bank loan on income property.' },
    { id: 'sba504', types: ['commercial'], name: 'SBA 504 (you operate in it)', dp: 10, rate: 6.75, term: 300, io: false, closing: 3.5, note: 'Low down payment. Needs owner-occupancy.' },
    { id: 'bridge', types: ['commercial'], name: 'Bridge loan, interest-only', dp: 30, rate: 9.5, term: 36, io: true, closing: 3, note: 'Payment covers interest only. At maturity the balance is refinanced at the Assumptions rate and term.' },
    { id: 'sellerc', types: ['commercial'], name: 'Seller financing', dp: 10, rate: 6.0, term: 240, io: false, closing: 2, note: 'Seller carries the loan. Terms vary, and sellers usually carry only part of the price.' },
    { id: 'sba7a', types: ['business'], name: 'SBA 7(a) loan (up to $5M)', dp: 10, rate: 9.75, term: 120, io: false, closing: 3, note: 'Common for buying a business. SBA caps 7(a) at $5M.' },
    { id: 'bankbiz', types: ['business'], name: 'Bank term loan', dp: 25, rate: 9.0, term: 84, io: false, closing: 2, note: 'Shorter term, bigger payment.' },
    { id: 'sellerb', types: ['business'], name: 'Seller note', dp: 20, rate: 7.0, term: 60, io: false, closing: 1.5, note: 'The seller finances part of the price. This preset has the seller carry 80%, which is aggressive; sellers usually carry 10% to 50%.' },
    { id: 'cashb', types: ['business'], name: 'Cash purchase', dp: 100, rate: 0, term: 360, io: false, closing: 1.5, note: 'No loan.' }];
  const loansFor = (type) => LOANS.filter((l) => l.types.indexOf(type) >= 0);
  let uid = 0;
  const DEFAULTS = {
    house: { addr: 'New home', price: 300000, rent: 2200, tax: 300, ins: 110, hoa: 0, nnn: 0, growth: 4, sellCost: 6 },
    commercial: { addr: 'New commercial property', price: 1500000, rent: 12500, tax: 940, ins: 375, hoa: 375, nnn: 85, growth: 4, sellCost: 5 },
    business: { addr: 'New business', price: 1000000, rent: 18000, tax: 0, ins: 0, hoa: 0, nnn: 0, growth: 4, sellCost: 8 } };
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
    const h = Object.assign({ id: 'h' + Date.now().toString(36) + (uid++), type, status: 'planned', extra: 0, driver: 'extra', wait: 24, liens: 0, paid: 0, buyIn: 0,
      target: '', growth: null, io: false, closingPct: null, loanId: '', dp: 20, rate: 6.75, term: 360, mat: 0, refiRate: null, refiTerm: null,
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
  const mipMonthly = (h) => ((h.mipAnn || 0) > 0 ? ((loan(h) / (1 + (h.mipUp || 0) / 100)) * h.mipAnn) / 100 / 12 : 0); /* annual MIP is on the loan WITHOUT the financed upfront premium (24 CFR 203.284) */
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
  /* cash a planned asset needs the day it is bought: down payment + closing costs + improvements paid in cash (a financed rehab is part of the loan) */
  const needFor = (S, h) => downAmt(h) + (h.price * clPct(S, h)) / 100 + (h.finCapex ? 0 : Math.max(0, h.capex || 0));
  const need = (S, h) => { const t = H(S, h.target); return t ? downAmt(t) + (t.price * clPct(S, t)) / 100 : 0; };
  /* operating income per month (rent or owner profit minus operating costs), before any loan payment */
  const reimbOf = (h) => ((h.type || 'house') === 'business' ? 0 : (Math.min(100, Math.max(0, +h.nnn || 0)) / 100) * ((+h.tax || 0) + (+h.ins || 0) + (+h.hoa || 0))); /* costs the tenants pay back (NNN leases) */
  const noiOf = (S, h) => { const g = S.g; if ((h.type || 'house') === 'business') return h.rent; const egi = (h.rent + reimbOf(h)) * (1 - g.vac / 100); return egi - (h.tax + h.ins + h.hoa + (g.maint / 100) * h.price / 12 + (g.mgmt / 100) * egi); };
  const capOf = (S, h) => ((h.type || 'house') === 'business' ? (isFinite(+S.g.capBiz) ? +S.g.capBiz : GDEF.capBiz) : S.g.cap); /* a credit line against a business is not backed by real estate: separate, lower cap */
  /* The home's own monthly cash flow (income minus costs, loan payment and mortgage insurance, before any extra payment) is saved toward the next down payment while it waits. Only a positive cash flow adds money. */
  const cfSaved = (S, h) => Math.max(0, noiOf(S, h) - payment(h) - mipMonthly(h));

  const refiRateOf = (S, h) => (h.refiRate == null || h.refiRate === '' || !isFinite(+h.refiRate) ? (isFinite(+S.g.refiRate) ? +S.g.refiRate : GDEF.refiRate) : +h.refiRate);
  const refiTermOf = (S, h) => (h.refiTerm == null || h.refiTerm === '' || !isFinite(+h.refiTerm) || +h.refiTerm < 1 ? (isFinite(+S.g.refiTerm) ? +S.g.refiTerm : GDEF.refiTerm) : +h.refiTerm);
  /* months from the purchase until the loan is due: an interest-only loan is due at the end of its term; any loan can also carry a balloon (mat > 0). 0 = fully amortizing. */
  const matOf = (h) => (+h.mat > 0 ? +h.mat : h.io ? h.term : 0);
  /* The balance and scheduled payment k months after the asset's start (today for an owned asset, the purchase for a planned one). When the loan comes due with a balance left,
     that balance is refinanced into an amortizing loan at the refinance rate and term, so the debt, payment and DSCR stay right after maturity. */
  function loanPath(S, h, X) {
    const B0 = balToday(h), i = mi(h), P = payment(h), m0 = matOf(h), m = m0 > 0 && B0 > 0.005 ? Math.max(0, m0 - age0(h)) : Infinity;
    const o = { B0, i, P, X, m, Bm: B0, ir: i, Pr: 0, refi: null };
    if (isFinite(m)) { o.Bm = balK(B0, i, P + X, m); o.ir = refiRateOf(S, h) / 1200; o.Pr = amort(o.Bm, o.ir, refiTermOf(S, h)); if (o.Bm > 0.005) o.refi = { month: m, balance: o.Bm, rate: refiRateOf(S, h), termMonths: refiTermOf(S, h), payment: o.Pr }; }
    o.bal = (k) => (k < m ? balK(B0, i, P + X, k) : balK(o.Bm, o.ir, o.Pr + X, k - m));
    o.rate = (k) => (k < m ? i : o.ir);
    o.pay = (k) => (k < m ? P : o.Pr);
    return o;
  }
  function payoffN(h, X, S) {
    const B0 = balToday(h), i = mi(h), A = payment(h) + X; if (B0 <= 0.005) return 0;
    const pth = loanPath(S || { g: GDEF }, h, X || 0), m = pth.m;
    const n1 = A <= i * B0 + 1e-9 ? Infinity : Math.ceil((i ? -Math.log(1 - (i * B0) / A) / Math.log(1 + i) : B0 / A) - 1e-7);
    if (n1 <= m) return n1;
    if (pth.Bm <= 0.005) return m;
    const A2 = pth.Pr + X, i2 = pth.ir; if (A2 <= i2 * pth.Bm + 1e-9) return Infinity;
    return m + Math.ceil((i2 ? -Math.log(1 - (i2 * pth.Bm) / A2) / Math.log(1 + i2) : pth.Bm / A2) - 1e-7);
  }
  /* growth of rent and costs k months from today (rent and costs grow with the value) */
  const gfAt = (S, h, k) => (h.price > 0 ? valK(S, h, k) / valK(S, h, 0) : 1);
  /* cash flow this asset can save in month k (grows with the asset's income; only a positive amount is saved) */
  const mipAt = (h, B) => ((h.mipAnn || 0) > 0 ? ((B / (1 + (h.mipUp || 0) / 100)) * h.mipAnn) / 100 / 12 : 0);
  const cfAt = (S, h, pth, k) => { const B = pth.bal(k); return Math.max(0, noiOf(S, h) * gfAt(S, h, k) - (B > 0.005 ? pth.pay(k) : 0) - (B > 0.005 ? mipAt(h, B) : 0)); };
  /* total cash flow saved in the first k months (a down payment only needs the need, so view() caps it) */
  const savedBy = (S, h, X, k) => { const pth = loanPath(S, h, X); let c = 0; for (let j = 0; j < k; j++) c += cfAt(S, h, pth, j); return c; };
  /* months (from the asset's own start) until the cash for its target is there: borrowing room (cap * value * (1 - appraisal cut) - balance - other liens)
     plus the cash flow this asset has saved up (it grows with the asset's income) reaches the cash needed. o.noCash leaves the saved cash flow out. */
  function locMonths(S, h, X, o) {
    if (!H(S, h.target)) return Infinity;
    const D = need(S, h), g = S.g, pth = loanPath(S, h, X), noCash = !!(o && o.noCash), cap = capOf(S, h); let cum = 0;
    for (let k = 0; k <= 600; k++) {
      const head = (cap / 100) * (1 - g.haircut / 100) * valAt(S, h, k) - pth.bal(k) - (h.liens || 0); /* the lender counts only (1 - cut) of the appraised value, then caps total debt at cap% of that */
      if (Math.max(0, head) + cum >= D) return k;
      if (!noCash) cum += cfAt(S, h, pth, k);
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
    const g = S.g, L = loan(h), P = payment(h), B0 = balToday(h), type = h.type || 'house';
    let X = h.extra, infeasible = false;
    if (h.driver === 'months' && H(S, h.target)) { const x = extraFor(S, h, h.wait); if (x == null) infeasible = true; else X = x; }
    let egi, escrow; const noi = noiOf(S, h), reimb = reimbOf(h);
    if (type === 'business') { egi = h.rent; escrow = 0; } else { egi = (h.rent + reimb) * (1 - g.vac / 100); escrow = h.tax + h.ins + h.hoa; }
    const pth = loanPath(S, h, X), lm = locMonths(S, h, X), A = P + X, Dn = need(S, h), cashDP = H(S, h.target) && isFinite(lm) ? Math.min(Dn, savedBy(S, h, X, lm)) : 0, draw = Dn - cashDP;
    const cltvAtLoc = H(S, h.target) && isFinite(lm) ? ((pth.bal(lm) + (h.liens || 0) + draw) / valAt(S, h, lm)) * 100 : null;
    const down = downAmt(h), closingCost = (h.price * clPct(S, h)) / 100, mip = mipMonthly(h), cap = capOf(S, h);
    return { cltvAtLoc, L, B0, P, mip, X, infeasible, egi, noi, reimb, cap, refi: pth.refi, cf: noi - P - mip, escrow, pitia: P + escrow + mip, path: pth, payment: P + X + escrow + mip,
      D: Dn, cashDP, draw, cfSaved: cfSaved(S, h), down, closingCost, invested: down + closingCost, payoff: payoffN(h, X, S), locM: lm,
      head0: Math.max(0, (cap / 100) * (1 - g.haircut / 100) * valAt(S, h, 0) - B0 - (h.liens || 0)), debtNow: B0 + (h.liens || 0),
      valueNow: valAt(S, h, 0), valueGain: +h.arv > 0 ? h.arv - h.price - (h.capex || 0) : 0, capRate: h.price > 0 ? ((noi * 12) / h.price) * 100 : NaN, multiple: noi > 0 ? h.price / (noi * 12) : NaN, growth: gr(S, h) };
  }

  /* ---------- personal finances: your jobs, savings and expenses ---------- */
  const samplePersonal = () => ({ cash: 45000, cashApy: 3, living: 3600, inflation: 3, emergencyMonths: 6, portfolioTaxPct: null, salesTaxPct: null, statePct: 0, landPct: 20, bizIntPct: 70, housing: 1400, operating: 1, gmMonthly: 8000, bizHours: 20,
    jobs: [{ id: 'job1', name: 'Day job (salary)', kind: 'salary', gross: 96000, raise: 3, tax: 24, hours: 40, start: 0, end: null }], planned: [], capital: [] });
  /* Rough U.S. single-filer estimate, tax year 2026 (IRS Rev. Proc. 2025-32: standard deduction $16,100, brackets below; IRS Pub. 15: Social Security 6.2% up to $184,500, Medicare 1.45%). No state tax, no 0.9% additional Medicare tax. It is only a starting point; the person can type their own rate. */
  const TAXY = { std: 16100, br: [[12400, 0.10], [50400, 0.12], [105700, 0.22], [201775, 0.24], [256225, 0.32], [640600, 0.35], [Infinity, 0.37]], ltcg0: 49450, ltcg15: 545500, niitMagi: 200000, niit: 0.038, rec1250: 0.25 };
  /* federal income tax on taxable income between lo and hi (single filer, 2026 brackets); cap limits the rate (the 25% ceiling on unrecaptured section 1250 gain) */
  function bracketTax(lo, hi, cap) { let t = 0, a = 0; for (const [b, r] of TAXY.br) { const x = Math.min(hi, b) - Math.max(lo, a); if (x > 0) t += x * Math.min(r, cap === undefined ? 1 : cap); a = b; } return t; }
  /* long-term capital gain tax on the slice of taxable income from lo to hi: 0% up to $49,450, 15% up to $545,500, 20% above (single, 2026, Rev. Proc. 2025-32) */
  function ltcgTax(lo, hi) { const z = Math.max(0, Math.min(hi, TAXY.ltcg0) - lo), f = Math.max(0, Math.min(hi, TAXY.ltcg15) - Math.max(lo, TAXY.ltcg0)), t = Math.max(0, hi - Math.max(lo, TAXY.ltcg15)); return f * 0.15 + t * 0.20 + z * 0; }
  function estTaxPct(gross) {
    if (!(gross > 0)) return 0;
    const taxable = Math.max(0, gross - TAXY.std), fed = bracketTax(0, taxable);
    const fica = Math.min(gross, 184500) * 0.062 + gross * 0.0145;
    return Math.round(((fed + fica) / gross) * 1000) / 10;
  }
  const num0 = (v, d) => (isFinite(+v) && v !== '' && v !== null ? +v : d);
  function normalizePersonal(p) {
    const d = samplePersonal(); p = Object.assign({}, d, p || {});
    ['cash', 'cashApy', 'living', 'inflation', 'emergencyMonths', 'statePct', 'landPct', 'bizIntPct', 'housing', 'operating', 'gmMonthly', 'bizHours'].forEach((k) => { p[k] = Math.max(0, num0(p[k], d[k])); });
    ['portfolioTaxPct', 'salesTaxPct'].forEach((k) => { p[k] = p[k] === null || p[k] === '' || p[k] === undefined || !isFinite(+p[k]) ? null : Math.min(70, Math.max(0, +p[k])); }); /* null = worked out from your income and the tax rules */
    p.statePct = Math.min(20, p.statePct); p.landPct = Math.min(100, p.landPct); p.bizIntPct = Math.min(100, p.bizIntPct);
    p.operating = Math.round(p.operating); p.bizHours = Math.min(168, p.bizHours); p.cashApy = Math.min(30, p.cashApy);
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

  const taxP = (S) => S.p || samplePersonal();
  /* your own rent or mortgage payment counts as a debt for lenders; it rises with the cost-increase rate like rent does */
  const housingAt = (S, t) => (S.p ? (S.p.housing || 0) * Math.pow(1 + (S.p.inflation || 0) / 100, t / 12) : 0);
  /* Depreciation taken after a months of ownership (a counts the months already owned). Homes and commercial buildings: straight line over 27.5 / 39 years on the building share of price + closing costs + improvements, first month half (mid-month convention); land is not depreciated (IRS Pub. 946, 551, 527).
     Businesses: the price is split into goodwill and other intangibles amortized over 15 years (section 197) and equipment over 7 years (IRS Pub. 535, 946, Form 8594). No bonus depreciation is assumed. */
  function depCum(S, h, a) {
    if (!(a > 0)) return 0; const p = taxP(S), closing = (h.price * clPct(S, h)) / 100;
    if ((h.type || 'house') === 'business') { const tot = h.price + closing, intang = (tot * p.bizIntPct) / 100, eq = tot - intang + (h.capex || 0); return Math.min(intang, (intang / 180) * a) + Math.min(eq, (eq / 84) * Math.max(0, a - 0.5)); }
    const base = ((h.price + closing + (h.capex || 0)) * (1 - p.landPct / 100)), n = (h.type || 'house') === 'house' ? 330 : 468;
    return Math.min(base, (base / n) * Math.max(0, a - 0.5));
  }
  const costBasis = (S, h) => h.price + (h.price * clPct(S, h)) / 100 + (h.capex || 0);
  /* Monthly income tax on portfolio profit: re / biz = this month's taxable profit (operating income - loan interest - depreciation) of real estate / businesses. Auto: the extra federal tax your wages + this profit owe over your wages alone (2026 brackets),
     3.8% net investment income tax on rental profit above $200,000 of total income, plus your state rate. A loss pays no tax (passive-loss carry-forward is not used). Override: your own flat rate on the profit. */
  function portTaxAt(S, t, re, biz) {
    const p = taxP(S), R = re + biz; if (!(R > 0)) return 0;
    if (p.portfolioTaxPct !== null && p.portfolioTaxPct !== undefined) return (R * p.portfolioTaxPct) / 100;
    const W = jobsGross(S, t) * 12, wt = Math.max(0, W - TAXY.std), fed = bracketTax(wt, Math.max(0, W + R * 12 - TAXY.std)), niit = TAXY.niit * Math.min(Math.max(0, re * 12), Math.max(0, W + R * 12 - TAXY.niitMagi));
    return (fed + niit) / 12 + (R * (p.statePct || 0)) / 100;
  }
  /* Tax on selling one asset (pl.exits[id]): gain = sale price less selling costs less (price + closing + improvements - depreciation taken). Held under a year: ordinary rates. Otherwise the depreciation part of a building's gain is unrecaptured section 1250 gain (rate up to 25%),
     the rest is long-term gain at 0/15/20% stacked on your other income, plus 3.8% NIIT on rental-property gains above $200,000 total income. A business's depreciation and amortization is ordinary income (section 1245). Override: your flat rate on the gain. */
  function saleTax(S, pl, h) {
    const ex = pl.exits[h.id]; if (!ex) return null; const p = taxP(S), t = Math.min(pl.T, ex.month), s = pl.series, biz = (h.type || 'house') === 'business';
    const gain = ex.net - (ex.cost - ex.dep), out = { gain, dep: ex.dep, tax: 0, ltcg: 0, rec1250: 0, ordinary: 0, niit: 0, state: 0, short: ex.age < 12, rate: 0 };
    if (!(gain > 0)) return out;
    if (p.salesTaxPct !== null && p.salesTaxPct !== undefined) { out.tax = (gain * p.salesTaxPct) / 100; out.rate = p.salesTaxPct; return out; }
    const W = jobsGross(S, t) * 12, R = Math.max(0, (s.txRE[t] + s.txBiz[t]) * 12), base = Math.max(0, W + R - TAXY.std), rec = Math.min(gain, ex.dep);
    let ord = 0, u = 0, lt = 0;
    if (out.short) ord = gain; else if (biz) { ord = rec; lt = gain - rec; } else { u = rec; lt = gain - rec; }
    let tx = bracketTax(base, base + ord); out.ordinary = tx;
    const u1 = bracketTax(base + ord, base + ord + u, TAXY.rec1250); out.rec1250 = u1; tx += u1;
    out.ltcg = ltcgTax(base + ord + u, base + ord + u + lt); tx += out.ltcg;
    if (!biz) { const nii = gain + Math.max(0, s.txRE[t] * 12); out.niit = TAXY.niit * Math.min(nii, Math.max(0, W + R + gain - TAXY.niitMagi)); tx += out.niit; }
    out.state = (gain * (p.statePct || 0)) / 100; tx += out.state; out.tax = tx; out.rate = (tx / gain) * 100; return out;
  }

  /* FHA annual mortgage insurance is charged on the outstanding balance (HUD Handbook 4000.1: annual MIP on the average outstanding balance), so the monthly amount falls as the loan is paid down. The first-month figure (view().mip) is on the starting loan. */
  const mipNow = (h, a) => ((h.mipAnn || 0) > 0 ? ((a.B / (1 + (h.mipUp || 0) / 100)) * h.mipAnn) / 100 / 12 : 0);
  /* The whole-portfolio plan: purchase months, sales, cash, month-by-month series, plan-level KPIs.
     THE TRUST MODEL. Every asset sits in one trust and the trust borrows against all of it. Walking the list in order, a planned asset is bought the first month the POOL of
     everything before it (assets owned today plus the planned assets above it that are already bought) can pay its cash need (down payment + closing + improvements):
       pool room   = sum over pool assets of max(0, cap% x (1 - appraisal cut) x value - loan balance - liens), minus what the trust has drawn on its line so far
       cash        = cash the trust is holding: the pool's cash flow reinvested (after the line is paid off) and sale proceeds
       bought when   max(0, room) + cash >= need   (and not before the asset's own "not before" month, buyIn)
     The purchase uses held cash first and draws the rest on the line (the draw is charged to the new asset, at the Assumptions line rate). Each month the pool's total cash flow (income minus costs,
     loan payments, insurance and line interest; only a positive total) is swept first into paying the line down, which raises the room, then into cash. Extra payments (owner money) only speed up loan principal.
     The first asset of the whole list, with nothing before it, is bought on its own month with outside cash. An asset the trust can never fund (within 50 years) is skipped and shows as not funded. */
  function plan(S) {
    const hs = S.houses, g = S.g, V = {};
    hs.forEach((h) => (V[h.id] = view(S, h)));
    const planM = Math.round(Math.max(1, g.planYears || 20) * 12), hz = isFinite(+g.horizon) ? +g.horizon : GDEF.horizon, TS = Math.max(600, Math.min(2400, Math.round(hz)));
    const queue0 = hs.filter((h) => h.status !== 'owned'), skipped = {}, hel = isFinite(+g.hrate) ? +g.hrate : GDEF.hrate;
    let P0, sellAt, mergeAt, dr, cur, exits, fund, readyAt, cashA, outsideA, reinv, bought, blocked, BAL, PAY, RAT, LS, AUTO, JOBX, CALLS, FUT = null, JS, JU, JLN, JC, JLO, LQ, SALET, best;
    const exitTimes = (h) => { const p = P0[h.id]; sellAt[h.id] = Infinity; mergeAt[h.id] = Infinity; if (!isFinite(p)) return;
      const m = Math.max(Math.round(h.exitMonth || 0), p + 1); if (h.exit === 'sell') sellAt[h.id] = m; else if (h.exit === 'merge') mergeAt[h.id] = m; };
    /* state of an asset at month t, ignoring whether it has been sold (hl = its line draw this month) */
    function st(h, t, hl) {
      const p = P0[h.id]; if (!isFinite(p) || t < p) return null;
      const v = V[h.id], age = t - p, B = BAL[h.id][t] || 0, live = B > 0.005; /* the balance is simulated month by month (scheduled payments, your extra, the profit and job money that go to the loan) */
      const improved = (+h.arv > 0 || h.liftIncome) && age >= Math.max(0, h.capexMonths || 0), merged = t >= mergeAt[h.id];
      const fv = merged ? 1 + (h.exitLift || 0) / 100 : 1;
      const fi = (improved ? 1 + (h.liftIncome || 0) / 100 : 1) * (merged ? 1 + (h.exitLift || 0) / 100 : 1);
      const val = valAt(S, h, age) * fv, heloc = hl === undefined ? (dr[h.id] ? dr[h.id][Math.min(t, TS)] : 0) : hl;
      return { v, age, live, B, val, heloc, depAge: age0(h) + age, gfi: (h.price > 0 ? valK(S, h, age) / valK(S, h, 0) : 1) * fi }; /* income and costs grow from TODAY's entered rent: growth since the purchase (paid months) is already in today's rent */
    }
    const held = (h, t) => t < sellAt[h.id];
    /* what the pool of held assets looks like at month t (draws are the trust's line balances, charged to the assets they bought) */
    function snapOf(t) {
      const out = [];
      for (const h of bought) { if (!held(h, t)) continue; const a = st(h, t, cur[h.id]); if (!a) continue;
        const v = a.v, hi = (cur[h.id] * hel) / 1200, sched = a.live ? PAY[h.id][t] + mipNow(h, a) : 0;
        const intr = (a.live ? a.B * RAT[h.id][t] : 0) + hi, dep = depCum(S, h, a.depAge + 1) - depCum(S, h, a.depAge), biz = (h.type || 'house') === 'business';
        out.push({ h, a, tx: v.noi * a.gfi - intr - dep, biz, live: t < mergeAt[h.id], inc: v.noi * a.gfi, sched, hi, draw: cur[h.id], room: Math.max(0, (capOf(S, h) / 100) * (1 - g.haircut / 100) * a.val - a.B - (h.liens || 0)) }); }
      return out;
    }
    /* pooled numbers for a snapshot at month t: room, line drawn, cash flow (income minus costs, loan payments and line interest), and the part of it the trust can reinvest: the trust pays the managers of businesses you do not run and the income tax on the portfolio's profit first (only when there is a personal profile) */
    const pp = S.p || null;
    const sumSnap = (sn, t) => { let room = 0, draw = 0, cf = 0, re = 0, bz = 0, nb = 0; sn.forEach((x) => { room += x.room; draw += x.draw; cf += x.inc - x.sched - x.hi; if (x.biz) { bz += x.tx; if (x.live) nb++; } else re += x.tx; });
      const tax = pp ? portTaxAt(S, t, re, bz) : 0, gm = pp ? Math.max(0, nb - (pp.operating || 0)) * (pp.gmMonthly || 0) * Math.pow(1 + (pp.inflation || 0) / 100, t / 12) : 0;
      return { n: sn.length, room, draw, head: room - draw, cf, tax, gm, re, bz, sweep: Math.max(0, cf - tax - gm) }; };
    /* equal (or weighted) split of x over loans, each limited to what is still owed; what no loan can take comes back */
    function spread(x, items) {
      const got = {}; let rem = x, act = items.filter((i) => i.cap > 0.005 && i.w > 0);
      for (let g2 = 0; g2 < 8 && rem > 0.005 && act.length; g2++) {
        const W = act.reduce((a2, i) => a2 + i.w, 0), nxt = []; let used = 0;
        act.forEach((i) => { const give = Math.min(i.cap - (got[i.id] || 0), (rem * i.w) / W); got[i.id] = (got[i.id] || 0) + give; used += give; if (i.cap - got[i.id] > 0.005) nxt.push(i); });
        rem -= used; act = nxt;
      }
      return { got, left: Math.max(0, rem) };
    }
    /* the loan of asset h at month t starts from balance B (and refinances when it comes due) */
    function setMonth(h, t, B) {
      const id = h.id, L = LS[id], age = t - P0[id];
      if (L.m === age && !L.refi && B > 0.005) { L.refi = true; L.ir = refiRateOf(S, h) / 1200; L.Pr = amort(B, L.ir, refiTermOf(S, h)); }
      BAL[id][t] = B; PAY[id][t] = B > 0.005 ? (L.refi ? L.Pr : L.P) : 0; RAT[id][t] = L.refi ? L.ir : L.i;
    }
    const startLoan = (h, t) => { const B0 = balToday(h), m0 = matOf(h); LS[h.id] = { P: payment(h), i: mi(h), m: m0 > 0 && B0 > 0.005 ? Math.max(0, m0 - age0(h)) : Infinity, refi: false, ir: 0, Pr: 0 };
      BAL[h.id] = new Array(TS + 2).fill(0); PAY[h.id] = new Array(TS + 2).fill(0); RAT[h.id] = new Array(TS + 2).fill(0); AUTO[h.id] = new Array(TS + 2).fill(0); JOBX[h.id] = new Array(TS + 2).fill(0); setMonth(h, t, B0); };
    /* balance after month t's scheduled payment and the owner's extra payment (before any automatic extra) */
    const nextBal = (h, t) => { const B = BAL[h.id][t]; return B > 0.005 ? Math.max(0, B * (1 + RAT[h.id][t]) - PAY[h.id][t] - V[h.id].X) : 0; };
    function run() {
      P0 = {}; sellAt = {}; mergeAt = {}; dr = {}; cur = {}; exits = {}; fund = {}; readyAt = {}; bought = []; blocked = null; best = {};
      BAL = {}; PAY = {}; RAT = {}; LS = {}; AUTO = {}; JOBX = {}; CALLS = new Array(TS + 1).fill(0);
      cashA = new Array(TS + 1).fill(0); outsideA = new Array(TS + 1).fill(0); reinv = new Array(TS + 1).fill(0);
      JS = new Array(TS + 1).fill(0); JU = new Array(TS + 1).fill(0); JLN = new Array(TS + 1).fill(0); JC = new Array(TS + 1).fill(0); JLO = new Array(TS + 1).fill(0); LQ = new Array(TS + 1).fill(0); SALET = new Array(TS + 1).fill(0);
      hs.forEach((h) => { cur[h.id] = 0; P0[h.id] = h.status === 'owned' ? 0 : Infinity; exitTimes(h); if (h.status === 'owned') { bought.push(h); dr[h.id] = new Array(TS + 1).fill(0); startLoan(h, 0); } });
      const queue = queue0.filter((h) => !skipped[h.id]); let C = 0, out = 0, qi = 0, L = pp ? +pp.cash || 0 : 0, outPrev = 0;
      const autoPay = g.autoPay !== false, infl = pp ? (pp.inflation || 0) / 100 : 0, apy = pp ? (pp.cashApy || 0) / 1200 : 0;
      for (let t = 0; t <= TS; t++) {
        if (t === 0) hs.forEach((h) => { if (h.status === 'owned' && !h.finCapex && h.capex > 0) out += h.capex; }); /* improvements on assets owned today are paid with outside money */
        /* 1) sales put net proceeds (after the sold asset's own line draw) in the trust's cash */
        for (const h of bought) if (sellAt[h.id] === t) {
          const a = st(h, t, cur[h.id]); if (!a) continue;
          const proceeds = a.val * (1 - (h.sellCost || 0) / 100) - a.B - (h.liens || 0);
          exits[h.id] = { month: t, proceeds, price: a.val, net: a.val * (1 - (h.sellCost || 0) / 100), age: a.depAge, dep: depCum(S, h, a.depAge), cost: costBasis(S, h) };
          if (pp) { const m0 = sumSnap(snapOf(t), t); SALET[t] += (saleTax(S, { exits, T: TS, series: { txRE: { [t]: m0.re }, txBiz: { [t]: m0.bz } } }, h) || { tax: 0 }).tax; } /* the tax on the sale comes out of your cash (used only to keep your reserve) */
          /* the proceeds (after the sold asset's own loan) go to the trust's cash; the sold asset's own line draw stays with the trust and moves to the oldest asset still held (with nothing left, cash pays it) */
          let x = proceeds; if (x < 0) { out += -x; x = 0; }
          const own = cur[h.id]; cur[h.id] = 0;
          if (own > 0.005) { const o = bought.find((q) => q !== h && held(q, t)); if (o) cur[o.id] += own; else { const p0 = Math.min(own, x); x -= p0; out += own - p0; } }
          C += x;
        }
        /* 2) the next planned asset in the list is bought when the pool can pay for it. Nothing is ever bought before an asset above it in the list: the queue is walked in list order and stops at the first one that is not ready. */
        let snap = snapOf(t);
        const rsv0 = pp ? (pp.emergencyMonths || 0) * ((pp.living || 0) * Math.pow(1 + infl, t / 12) + (g.otherDebt || 0)) : 0; /* the cash cushion stays in your savings */
        while (qi < queue.length) {
          const N = queue[qi], pool = bought.length > 0, bi = Math.max(0, Math.round(N.buyIn || 0)), base = downAmt(N) + (N.price * clPct(S, N)) / 100;
          const cap0 = N.finCapex ? 0 : Math.max(0, N.capex || 0), needAmt = base + cap0, sm = sumSnap(snap, t), avail = Math.max(0, sm.head) + C;
          const own = pp ? Math.max(0, L - rsv0) : Infinity; /* nothing is owned yet: the first purchase is paid from your savings above the cushion plus the job money saved since */
          if (pool && (!best[N.id] || avail > best[N.id].avail)) best[N.id] = { avail, month: t };
          if (!pool && pp && (!best[N.id] || own > best[N.id].avail)) best[N.id] = { avail: own, month: t };
          if (pool && readyAt[N.id] === undefined && avail >= needAmt - 1e-6) readyAt[N.id] = t;
          if (t < bi || (pool && readyAt[N.id] === undefined)) break;
          if (pool && avail < needAmt - 1e-6) break;
          if (!pool && pp && own < needAmt - 1e-6) break;
          P0[N.id] = t; exitTimes(N); dr[N.id] = new Array(TS + 1).fill(0); startLoan(N, t);
          if (pool) { const C0 = C, useC = Math.min(C, needAmt); C -= useC; cur[N.id] = needAmt - useC; fund[N.id] = { pool: true, n: sm.n, room: Math.max(0, sm.head), heldCash: C0, have: avail, cf: sm.sweep, gross: sm.cf, cash: useC, draw: needAmt - useC, need: needAmt }; }
          else { const nd = base + cap0; out += nd; fund[N.id] = { pool: false, n: 0, room: 0, cf: 0, cash: 0, draw: 0, need: nd, have: pp ? own : nd, savings: pp ? Math.min(nd, Math.max(0, (+pp.cash || 0) - rsv0)) : nd, rsv: rsv0 }; }
          bought.push(N); qi++; snap = snapOf(t);
        }
        /* 3) record the state and sweep the month's pooled cash flow. Order of use: (a) pay the trust's line down (oldest draw first); (b) while a planned asset is still waiting, hold the rest as cash for it; (c) once nothing is left to buy, the rest goes to each
           asset's own loan as an automatic extra payment, in proportion to the cash flow each asset earned. Your job money left after living costs and your cash cushion follows the same order, but is split equally across the loans. */
        snap.forEach((x) => { dr[x.h.id][t] = cur[x.h.id]; });
        cashA[t] = C; outsideA[t] = out;
        const sm1 = sumSnap(snap, t), cf = sm1.sweep, pending = qi < queue.length, cap = {}; let anyLoan = false;
        snap.forEach((x) => { const b = nextBal(x.h, t); if (b > 0.005) { cap[x.h.id] = b; anyLoan = true; } });
        const payLine = (amt) => { let y = amt; for (const h of bought) { if (y <= 0) break; if (!held(h, t) || !(cur[h.id] > 0)) continue; const pay = Math.min(cur[h.id], y); cur[h.id] -= pay; y -= pay; } return y; };
        let x = cf > 0 ? payLine(cf) : 0;
        if (cf > 0 && pending) { C += x; x = 0; } /* x = the part of the pooled cash flow left once the line is paid and nothing is waiting: it is yours unless it can go to a loan */
        let Xu = 0; snap.forEach((x2) => { if (x2.a.live) Xu += x2.a.v.X; });
        const liv = pp ? (pp.living || 0) * Math.pow(1 + infl, t / 12) : 0, dbt = pp ? g.otherDebt || 0 : 0, inc = jobsNet(S, t), port = sm1.cf - sm1.tax - sm1.gm;
        let intr = 0, cI = 0, oT = 0, pCand = x, jCand = 0, scale = autoPay ? 1 : 0;
        if (pp) {
          /* Your own month first: take-home pay minus living costs, other debts and your extra payments (a portfolio loss comes out of it too). If that is not enough to live on, the portfolio profit left over pays for living first. What is left after that
             goes to the loans (profit in proportion to what each asset earned, job money equally), as long as your cash stays at or above the emergency cushion. */
          intr = t > 0 ? Math.max(0, L + cashA[t - 1]) * apy : 0; cI = pp.capital.reduce((a2, c) => a2 + (c.month === t ? c.amount : 0), 0); oT = pp.planned.reduce((a2, c) => a2 + (c.month === t ? c.amount : 0), 0);
          const calls = out - outPrev + oT + SALET[t] - cI - intr, G = inc - liv - dbt - Xu + Math.min(0, port), rsv = (pp.emergencyMonths || 0) * (liv + dbt);
          CALLS[t] = Math.max(0, out - outPrev + oT + SALET[t]); /* one-time costs this month */
          const cand = pending ? (bought.length ? Math.max(0, G) : 0) : Math.max(0, G + x); /* with nothing owned yet there is no trust to send job money to: it stays in your cash for the first purchase */ pCand = pending ? 0 : Math.min(x, cand); jCand = cand - pCand;
          const flow = inc - liv - dbt - Xu + port - (t > 0 ? reinv[t - 1] : 0) + intr + cI - oT - (out - outPrev) - SALET[t]; /* what your cash does this month before the loan money; your cash after = L + flow - what moves, and the trust's cash (cashA[t]) counts in the cushion */
          scale = autoPay && cand > 0 ? Math.min(cand, Math.max(0, L + cashA[t] + flow - rsv - (FUT ? FUT[t] : 0))) / cand : 0; /* FUT = costs still to come (one-time expenses, sale taxes, outside cash for purchases): that money stays in your cash */ JS[t] = Math.max(0, G);
        }
        let pSpent = 0;
        if (!pending && pCand > 0.005 && scale > 0 && anyLoan) { const r = spread(pCand * scale, snap.map((x2) => ({ id: x2.h.id, w: Math.max(0, x2.inc - x2.sched - x2.hi), cap: cap[x2.h.id] || 0 }))); Object.keys(r.got).forEach((id) => { AUTO[id][t] = r.got[id]; cap[id] -= r.got[id]; pSpent += r.got[id]; }); }
        if (cf > 0) reinv[t] = cf - (x - pSpent);
        if (jCand * scale > 0.005) {
          const J = jCand * scale; let y = payLine(J); JLN[t] = J - y;
          if (pending) { C += y; JC[t] = y; y = 0; }
          else if (y > 0.005 && anyLoan) { const r = spread(y, snap.map((x2) => ({ id: x2.h.id, w: 1, cap: cap[x2.h.id] || 0 }))); Object.keys(r.got).forEach((id) => { JOBX[id][t] = r.got[id]; cap[id] -= r.got[id]; JLO[t] += r.got[id]; }); y = r.left; }
          JU[t] = J - y;
        }
        if (pp) { L += inc - liv - dbt - Xu + port - (t > 0 ? reinv[t - 1] : 0) - JU[t] + intr + cI - oT - (out - outPrev) - SALET[t]; LQ[t] = L; }
        outPrev = out;
        /* 4) next month's loan balances: the scheduled payment, your extra, and the automatic extra from the asset's own profit and from your job */
        for (const h of bought) { if (!held(h, t) || !(BAL[h.id][t] > 0.005) || t + 1 > TS) continue; /* a loan keeps running through the month an asset is sold: the sale pays off its balance */ setMonth(h, t + 1, Math.max(0, nextBal(h, t) - (AUTO[h.id][t] || 0) - (JOBX[h.id][t] || 0))); }
      }
      blocked = qi < queue.length ? queue[qi] : null;
    }
    const settle = () => { for (let i = 0; i <= queue0.length + 1; i++) { run(); if (!blocked) break; skipped[blocked.id] = 1; } };
    settle();
    if (pp && g.autoPay !== false && CALLS.some((c) => c > 0.5)) { /* second pass: now the costs still to come are known, so loan payments never use up the cash they need */
      FUT = new Array(TS + 2).fill(0); for (let t = TS - 1; t >= 0; t--) FUT[t] = FUT[t + 1] + CALLS[t + 1]; settle(); }
    const sellKeys = hs.map((h) => (isFinite(sellAt[h.id]) ? sellAt[h.id] : 0)), mergeKeys = hs.map((h) => (isFinite(mergeAt[h.id]) ? mergeAt[h.id] : 0));
    const finiteBuys = hs.map((h) => P0[h.id]).filter(isFinite);
    const lastEvent = Math.max(0, ...finiteBuys, ...sellKeys, ...mergeKeys);
    const lastBuy = finiteBuys.length ? Math.max.apply(null, finiteBuys) : 0;
    const T = Math.min(TS, g.horizon, Math.max(120, lastEvent + 60, planM));
    const keys = ['nw', 'monthly', 'extra', 'noi', 'ds', 'cf', 'cfx', 'debt', 'value', 'rent', 'dsti', 'dti', 'count', 'outside', 'cash', 'intr', 'dep', 'txRE', 'txBiz'];
    const s = {}; keys.forEach((k) => (s[k] = new Array(T + 1).fill(0)));
    const dpCash = new Array(T + 1).fill(0); for (let t = 1; t <= T; t++) dpCash[t] = reinv[Math.min(TS, t - 1)]; /* pooled cash flow that moved into the trust (line paydown or cash) is no longer yours to spend */
    for (let t = 0; t <= T; t++) {
      let incAdd = 0, debtAdd = 0;
      for (const h of hs) {
        if (!held(h, t)) continue; const a = st(h, t); if (!a) continue;
        const { v } = a, hi = (a.heloc * hel) / 1200, sched = a.live ? PAY[h.id][t] + mipNow(h, a) : 0, ex = a.live ? v.X : 0, rentG = h.rent * a.gfi, reimbG = v.reimb * a.gfi;
        const intr = (a.live ? a.B * RAT[h.id][t] : 0) + hi, dep = depCum(S, h, a.depAge + 1) - depCum(S, h, a.depAge), tx = v.noi * a.gfi - intr - dep;
        s.intr[t] += intr; s.dep[t] += dep; if ((h.type || 'house') === 'business') s.txBiz[t] += tx; else s.txRE[t] += tx;
        s.count[t]++; s.value[t] += a.val; s.debt[t] += a.B + (h.liens || 0) + a.heloc; s.nw[t] += a.val - a.B - (h.liens || 0) - a.heloc;
        s.noi[t] += v.noi * a.gfi; s.ds[t] += sched + hi; s.extra[t] += ex; s.rent[t] += rentG;
        s.monthly[t] += sched + ex + v.escrow + hi; s.dsti[t] += sched + v.escrow + hi;
        const net = (g.rentCount / 100) * (rentG + reimbG) - (sched + v.escrow + hi);
        if (net >= 0) incAdd += net; else debtAdd += -net;
      }
      s.nw[t] += cashA[t]; s.cash[t] = cashA[t]; s.outside[t] = outsideA[t];
      s.cf[t] = s.noi[t] - s.ds[t]; s.cfx[t] = s.cf[t] - s.extra[t];
      const inc = (g.p1 + g.p2) / 12 + jobsGross(S, t) + incAdd, debts = g.otherDebt + housingAt(S, t) + debtAdd;
      s.dti[t] = inc > 0 ? Math.min(999, (debts / inc) * 100) : debts > 0 ? 999 : 0;
    }
    const at = (t) => { t = Math.max(0, Math.min(T, Math.round(t))); const o = { month: t }; keys.forEach((k) => (o[k] = s[k][t]));
      o.cltv = o.value ? (o.debt / o.value) * 100 : 0; o.dscr = o.ds ? o.noi / o.ds : 0; return o; };
    /* every asset's contribution to the portfolio totals at month t; the entries sum exactly to the series values */
    const assetsAt = (t) => { t = Math.min(T, Math.round(t)); const list = hs.map((h) => { if (!held(h, t)) return null; const a = st(h, t); if (!a) return null;
      const v = a.v, hi = (a.heloc * hel) / 1200, sched = a.live ? PAY[h.id][t] + mipNow(h, a) : 0, ex = a.live ? v.X : 0, inc = v.noi * a.gfi;
      return { id: h.id, addr: h.addr, type: h.type || 'house', equity: a.val - a.B - (h.liens || 0) - a.heloc, value: a.val, debt: a.B + (h.liens || 0) + a.heloc,
        payment: sched + ex + v.escrow + hi, cf: inc - sched - hi, income: inc, extra: ex }; }).filter(Boolean);
      if (s.cash[t] > 0.5) list.push({ id: '__cash', addr: 'Cash in the trust', type: 'cash', equity: s.cash[t], value: s.cash[t], debt: 0, payment: 0, cf: 0, income: 0 }); return list; };
    /* the pool at the END of month t: how many assets, borrowing room, line drawn, room left, pooled monthly cash flow, cash held */
    const poolAt = (t) => { t = Math.max(0, Math.min(TS, Math.round(t))); const sn = []; for (const h of bought) { if (!held(h, t)) continue; const a = st(h, t); if (!a) continue; const v = a.v, hi = (a.heloc * hel) / 1200, sched = a.live ? PAY[h.id][t] + mipNow(h, a) : 0;
        sn.push({ inc: v.noi * a.gfi, sched, hi, draw: a.heloc, biz: (h.type || 'house') === 'business', live: t < mergeAt[h.id], tx: v.noi * a.gfi - ((a.live ? a.B * RAT[h.id][t] : 0) + hi) - (depCum(S, h, a.depAge + 1) - depCum(S, h, a.depAge)), room: Math.max(0, (capOf(S, h) / 100) * (1 - g.haircut / 100) * a.val - a.B - (h.liens || 0)) }); }
      const m = sumSnap(sn, t); return { month: t, n: m.n, room: m.room, drawn: m.draw, head: Math.max(0, m.head), cf: m.cf, tax: m.tax, gm: m.gm, sweep: m.sweep, cash: cashA[t] }; };
    const order = queue0.filter((h) => !skipped[h.id]).concat(queue0.filter((h) => skipped[h.id]));
    const funds = {}; hs.forEach((h) => { funds[h.id] = !!(fund[h.id] && fund[h.id].pool); });
    const trust = {}; let prevM = 0; hs.forEach((h) => { if (h.status === 'owned') return; const m = P0[h.id], f = fund[h.id] || null, bi = Math.max(0, Math.round(h.buyIn || 0)), rd = readyAt[h.id] === undefined ? Infinity : readyAt[h.id];
      /* month = the one clock everywhere: months from today. ready = the first month the pool could pay (room + cash >= need); month = ready, or the 'not before' month if that is later (held = true). */
      trust[h.id] = { month: m, ready: rd, held: isFinite(m) && isFinite(rd) && m > rd, buyIn: bi, ok: isFinite(m), pooled: funds[h.id], n: f ? f.n : 0, room: f ? f.room : 0, cf: f ? f.cf : 0, cash: f ? f.cash : 0, draw: f ? f.draw : 0, heldCash: f ? f.heldCash : 0, have: f ? f.have : 0, need: f ? f.need : needFor(S, h), savings: f ? f.savings || 0 : 0, rsv: f ? f.rsv || 0 : 0, gross: f ? f.gross : 0, best: best[h.id] || null };
    });
    /* loans: balance at any month, and the month each loan is paid off (with the extra from your own profit and your job); 0 = no loan, Infinity = not within the plan horizon */
    const loanEnd = {}, balAt = (id, t) => (BAL[id] ? BAL[id][Math.max(0, Math.min(TS, Math.round(t)))] || 0 : 0);
    hs.forEach((h) => { const p = P0[h.id]; if (!isFinite(p)) { loanEnd[h.id] = Infinity; return; } let e = Infinity; for (let t = p; t <= TS; t++) if (!(BAL[h.id][t] > 0.005)) { e = t; break; } loanEnd[h.id] = e; });
    const shareAt = (A) => (id, t) => (A[id] ? A[id][Math.max(0, Math.min(TS, Math.round(t)))] || 0 : 0);
    const firstPos = (A) => (id) => { const a = A[id]; if (!a) return -1; for (let t = 0; t <= TS; t++) if (a[t] > 0.005) return t; return -1; };
    const jobs = { surplus: JS.slice(0, T + 1), used: JU.slice(0, T + 1), line: JLN.slice(0, T + 1), cash: JC.slice(0, T + 1), loans: JLO.slice(0, T + 1), liquid: LQ.slice(0, T + 1) };
    const rows = queue0.map((h) => { const m = P0[h.id], r = { id: h.id, target: h.id, start: prevM, locM: isFinite(m) ? Math.max(0, m - prevM) : Infinity, end: m, ok: isFinite(m), funds: funds[h.id], ready: trust[h.id].ready }; if (isFinite(m)) prevM = Math.max(prevM, m); return r; });
    let worst = { dti: 0, month: 0 }; for (let t = 0; t <= T; t++) if (s.dti[t] > worst.dti) worst = { dti: s.dti[t], month: t };
    let extraLater = 0; hs.forEach((h) => { const v = V[h.id]; if (isFinite(P0[h.id]) && P0[h.id] > 0 && v.L > 0 && v.payoff > 0) extraLater += v.X; });
    const res = { dpCash, jobUsed: jobs.used, outsideTotal: s.outside[T], extraNow: s.extra[0], extraLater, purchase: P0, sellAt, mergeAt, exits, series: s, T, lastBuy, lastEvent, planM: Math.min(T, planM), today: at(0), final: at(Math.min(T, lastEvent)), horizon: at(Math.min(T, planM)),
      at, assetsAt, poolAt, snap: assetsAt(Math.min(T, planM)), rows, jobs, loanEnd, balAt, autoAt: shareAt(AUTO), jobAt: shareAt(JOBX), autoFrom: firstPos(AUTO), jobFrom: firstPos(JOBX), funds, fundedByLOC: funds, trust, V, worst, unfunded: hs.filter((h) => !isFinite(P0[h.id])).map((h) => h.id), skipped: Object.keys(skipped), queue: order.map((h) => h.id) };
    /* CASH PROFIT of a sold asset = what the sale leaves in cash (sale price - selling costs - the loan and liens paid off) - the tax on the sale - the cash you put in (down payment + closing costs + improvements paid in cash). exits[id].profit; a loss is negative. */
    hs.forEach((h) => { const ex = exits[h.id]; if (!ex) return; const sx = saleTax(S, res, h); ex.tax = sx ? sx.tax : 0; ex.cashIn = needFor(S, h); ex.profit = ex.proceeds - ex.tax - ex.cashIn; });
    return res;
  }


  /* "Lasts" stress test for one category (rows = plan-end snapshot rows of that category): if about 45% of the assets (the biggest earners) stop earning, rent/profit is gone but the
     fixed costs (tax, insurance, HOA) and the loan payments are still due. Everything is at plan-end values: the fixed costs grow with the asset exactly as its income does (income / today's NOI). */
  function stress(S, pl, rows, cash) {
    const income = rows.reduce((a, x) => a + x.income, 0), cf = rows.reduce((a, x) => a + x.cf, 0), worth = rows.reduce((a, x) => a + x.value, 0), ds = income - cf;
    const costOf = (x) => { const h = H(S, x.id), v = pl.V[x.id]; if (!h || !v) return 0; const g = Math.abs(v.noi) > 1e-9 ? x.income / v.noi : 1; return ((+h.tax || 0) + (+h.ins || 0) + (+h.hoa || 0)) * g; };
    const k = Math.max(1, Math.round(rows.length * 0.45)), lostOf = (x) => x.income + costOf(x), byLoss = rows.slice().sort((a, b) => lostOf(b) - lostOf(a));
    const partial = cf - byLoss.slice(0, k).reduce((a, x) => a + lostOf(x), 0), allFail = -(ds + rows.reduce((a, x) => a + costOf(x), 0));
    const useAll = partial >= 0, burn = useAll ? allFail : partial, c = Math.max(0, cash || 0);
    return { income, cf, worth, ds, dscr: ds > 0.5 ? income / ds : null, k, partial, allFail, useAll, burn, months: burn >= -0.5 ? Infinity : c <= 0 ? 0 : c / -burn };
  }

  /* Can you afford the plan? Rolls your personal cash forward month by month on top of the portfolio plan. */
  /* month N is written 'month N (Mon YYYY)' in the browser (the app supplies the calendar through window.RepDate); month 0 is always 'today' */
  const mAt = (m) => (m <= 0 ? 'today' : 'month ' + m + (root.RepDate && root.RepDate.dtm ? ' (' + root.RepDate.dtm(m) + ')' : '')), inM = (m) => (m <= 0 ? 'today' : 'in ' + mAt(m)), aroundM = (m) => (m <= 0 ? 'today' : 'around ' + mAt(m));
  function finance(S, pl) {
    const p = S.p; if (!p) return null; pl = pl || plan(S);
    const g = S.g, s = pl.series, T = pl.T, infl = (p.inflation || 0) / 100, apy = (p.cashApy || 0) / 1200;
    const N = (n) => new Array(n + 1).fill(0);
    const R = { dep: N(T), taxable: N(T), gm: N(T), hours: N(T), nBiz: N(T), income: N(T), portfolio: N(T), portTax: N(T), extra: N(T), living: N(T), debts: N(T), oneTime: N(T), capitalIn: N(T), jobSplit: N(T), jobSurplus: N(T), outsideCall: N(T), saleTax: N(T), interest: N(T), net: N(T), liquid: N(T), total: N(T), reserve: N(T), burn: N(T), runway: N(T) };
    const saleInfo = {}; S.houses.forEach((h) => { const ex = pl.exits[h.id]; if (ex && ex.month <= T) { const st0 = saleTax(S, pl, h); saleInfo[h.id] = st0; R.saleTax[ex.month] += st0.tax; } });
    p.planned.forEach((x) => { if (x.month <= T) R.oneTime[x.month] += x.amount; }); p.capital.forEach((x) => { if (x.month <= T) R.capitalIn[x.month] += x.amount; });
    S.houses.filter((h) => h.type === 'business').forEach((h) => { const a = pl.purchase[h.id], b = Math.min(T + 1, pl.sellAt[h.id], pl.mergeAt[h.id]); if (isFinite(a)) for (let t = a; t < b && t <= T; t++) R.nBiz[t]++; }); /* a business merged into another is one business afterwards: no second manager and no second set of hours */
    let liq = p.cash || 0;
    for (let t = 0; t <= T; t++) {
      const mgr = Math.max(0, R.nBiz[t] - (p.operating || 0)); R.gm[t] = mgr * (p.gmMonthly || 0) * Math.pow(1 + infl, t / 12);
      R.hours[t] = p.jobs.reduce((a, j) => a + (jobMonthly(j, t) > 0 ? j.hours || 0 : 0), 0) + Math.min(p.operating || 0, R.nBiz[t]) * (p.bizHours || 0);
      R.income[t] = jobsNet(S, t); R.portfolio[t] = s.cf[t]; R.dep[t] = s.dep[t]; R.taxable[t] = s.txRE[t] + s.txBiz[t]; R.portTax[t] = portTaxAt(S, t, s.txRE[t], s.txBiz[t]); R.extra[t] = s.extra[t];
      R.living[t] = (p.living || 0) * Math.pow(1 + infl, t / 12); R.debts[t] = g.otherDebt || 0;
      R.outsideCall[t] = t === 0 ? s.outside[0] : s.outside[t] - s.outside[t - 1];
      R.net[t] = R.income[t] + R.portfolio[t] - R.portTax[t] - R.gm[t] - R.extra[t] - R.living[t] - R.debts[t];
      R.interest[t] = t > 0 ? Math.max(0, liq + s.cash[t - 1]) * apy : 0;
      R.jobSplit[t] = (pl.jobUsed && pl.jobUsed[t]) || 0; R.jobSurplus[t] = (pl.jobs && pl.jobs.surplus[t]) || 0; /* job money that moved into the trust or the loans (never below your cash cushion) */
      liq += R.net[t] + R.interest[t] + R.capitalIn[t] - R.outsideCall[t] - R.oneTime[t] - R.saleTax[t] - (pl.dpCash[t] || 0) - R.jobSplit[t];
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
      reasons.push({ sev: 'bad', text: 'You run out of cash ' + inM(firstShort) + ' and would be about ' + money(short) + ' short at the lowest point, ' + mAt(minM) + '.' });
      fixes.push('Line up at least ' + money(short) + ' more (partners, investors, family) before ' + mAt(firstShort) + (c && c.assets.length ? ', when ' + c.assets.join(' and ') + ' closes' : '') + ', or push those purchases later.'); }
    if (R.net[0] < -0.5) { if (status === 'yes') status = 'tight'; reasons.push({ sev: 'warn', text: 'You spend ' + money(-R.net[0]) + ' a month more than you bring in right now.' }); reasons[reasons.length - 1].short = 'You spend more than you earn each month.'; fixes.push('Close the ' + money(-R.net[0]) + '/mo gap: raise income, cut living costs, or trim extra payments (' + money(R.extra[0]) + '/mo now).'); }
    else reasons.push({ sev: 'ok', short: 'saving ' + money(R.net[0]) + ' a month right now', text: 'You save about ' + money(R.net[0]) + ' a month after living costs, debts and extra payments.' });
    let peakH = 0, peakHM = 0; for (let t = 0; t <= T; t++) if (R.hours[t] > peakH) { peakH = R.hours[t]; peakHM = t; }
    const peakBiz = Math.max.apply(null, R.nBiz), gmMax = Math.max.apply(null, R.gm);
    if (peakH > 70) { if (status === 'yes') status = 'tight'; reasons.push({ sev: 'warn', short: 'The hours do not fit in a week ' + aroundM(peakHM) + '.', text: 'At the busiest point, ' + mAt(peakHM) + ', you would work about ' + Math.round(peakH) + ' hours a week between your job and running ' + Math.min(p.operating, peakBiz) + ' business(es) yourself.' }); fixes.push('Hire a general manager for a business, drop a job, or sell a business sooner. Each manager costs about ' + money(p.gmMonthly) + '/mo.'); }
    else if (peakBiz > 0) reasons.push({ sev: 'ok', short: 'about ' + Math.round(peakH) + ' hours a week', text: 'About ' + Math.round(peakH) + ' hours a week at the busiest point' + (gmMax > 0 ? ', with ' + money(gmMax) + '/mo of manager pay for businesses you do not run' : '') + '.' });
    const reserveGap = Math.max(0, gapM);
    if (short <= 0.5 && reserveGap > 0.5) { if (status === 'yes') status = 'tight'; reasons.push({ sev: 'warn', short: 'Your cash dips below your emergency reserve ' + inM(gapAt) + '.', text: 'Your cash falls ' + money(reserveGap) + ' below a ' + p.emergencyMonths + '-month emergency reserve, ' + mAt(gapAt) + '.' }); fixes.push('Hold about ' + money(reserveGap) + ' more cash to keep ' + p.emergencyMonths + ' months of expenses at all times.'); }
    else if (short <= 0.5) reasons.push({ sev: 'ok', short: 'reserve covered', text: 'Your cash never drops below a ' + p.emergencyMonths + '-month emergency reserve.' });
    if (pl.worst.dti > g.dti) { if (status === 'yes') status = 'tight'; reasons.push({ sev: 'warn', short: 'Lenders may decline a loan ' + aroundM(pl.worst.month) + '.', text: 'Lenders may decline: your debt payments reach ' + Math.round(pl.worst.dti) + '% of qualifying income ' + inM(pl.worst.month) + ' (limit ' + g.dti + '%).' }); fixes.push('Raise qualifying income, add a co-signer, or lower the loan sizes that close ' + aroundM(pl.worst.month) + '.'); }
    else reasons.push({ sev: 'ok', short: 'lenders should approve', text: 'Lenders should approve the loans: debt payments peak at ' + Math.round(pl.worst.dti) + '% of qualifying income (limit ' + g.dti + '%).' });
    if (isFinite(minRun) && minRun < 3 && short <= 0.5) { if (status === 'yes') status = 'tight'; reasons.push({ sev: 'warn', short: 'You have little cushion if your paycheck stops.', text: 'If your job income stopped ' + inM(minRunM) + ', your cash would last only ' + minRun.toFixed(1) + ' months.' }); fixes.push('Build cash or portfolio income so you could last at least 3 months without a paycheck.'); }
    if (pl.lastBuy > pl.planM) { if (status === 'yes') status = 'tight'; reasons.push({ sev: 'warn', short: 'The plan runs past its ' + Math.round(pl.planM / 12) + ' years: the last purchase is ' + inM(pl.lastBuy) + '.', text: 'The last purchase comes ' + inM(pl.lastBuy) + ', after the ' + Math.round(pl.planM / 12) + '-year plan ends, ' + mAt(pl.planM) + ', so the plan-end numbers leave out part of it. Your job money left over after living costs is ' + money(R.jobSurplus[0]) + '/mo; the default plan assumes about $2,000.' }); fixes.push('Raise the job money left after living costs, or lower the sizes of the early purchases, so the last one closes inside the plan.'); }
    const firstWarn = reasons.find((x) => x.sev === 'warn');
    const headline = status === 'yes' ? 'Yes. You can carry this plan.' : status === 'tight' ? 'Tight. ' + (firstWarn ? firstWarn.short || firstWarn.text : 'It works, but with thin margins.') : 'Not yet. You run short of cash ' + inM(firstShort) + '.';
    const totalOutside = s.outside[T], capitalTotal = p.capital.reduce((a, x) => a + x.amount, 0);
    return { series: R, T, status, headline, saleInfo, reasons, fixes, calls: callsAll,
      kpis: { planEnd: { month: pe, cfBefore: R.portfolio[pe], tax: R.portTax[pe], cfAfter: R.portfolio[pe] - R.portTax[pe], net: R.net[pe] }, peakHours: peakH, peakHoursMonth: peakHM, managerCost0: R.gm[0], managerCostMax: gmMax, peakBusinesses: peakBiz, takeHome: R.income[0], portfolioAfterTax: R.portfolio[0] - R.portTax[0], extra: R.extra[0], living: R.living[0], debts: R.debts[0], net0: R.net[0], worstNet, cash0: p.cash, reserveMonths0: R.living[0] + R.debts[0] > 0 ? p.cash / (R.living[0] + R.debts[0]) : Infinity,
        jobSurplus0: R.jobSurplus[0], jobSplit0: R.jobSplit[0], jobSurplusMax: Math.max.apply(null, R.jobSurplus), minLiquid: minT, minLiquidMonth: minM, shortAmount: short, firstShortMonth: firstShort, reserveTarget0: R.reserve[0], reserveGap, runway0: R.runway[0], minRunway: minRun, totalOutside, capitalTotal, savingsUsed: Math.min(p.cash, totalOutside), gap: Math.max(0, totalOutside - p.cash - capitalTotal), dtiPeak: pl.worst.dti } };
  }

  /* Can the lenders carry this purchase? Debt-to-income (including your own rent or mortgage) in the month the trust buys the asset. Assets owned today have nothing to afford. */
  function afford(S, h, pl) {
    pl = pl || plan(S);
    if (!h || h.status === 'owned') return { cls: 'na', txt: 'Owned', why: 'You already own this one.' };
    const m = pl.purchase[h.id];
    if (!isFinite(m)) return { cls: 'bad', txt: '✗ Not reachable', why: 'The trust (all the assets before it) cannot fund this within 50 years.' };
    const dti = pl.series.dti[Math.min(pl.T, m)], lim = S.g.dti;
    if (dti >= 999) return { cls: 'bad', dti, txt: '✗ Short', why: 'No qualifying income is set (see Assumptions).' };
    const cls = dti <= lim * 0.8 ? 'ok' : dti <= lim ? 'warn' : 'bad';
    return { cls, dti, txt: cls === 'ok' ? '✓ Afford' : cls === 'warn' ? '△ Tight' : '✗ Short', why: 'Debt-to-income ' + dti.toFixed(0) + '% (including your own rent or mortgage) vs ' + lim + '% limit when ' + h.addr + ' closes.' };
  }
  function normalize(S) {
    S.g = Object.assign({}, GDEF, S.g || {}); S.g.autoPay = S.g.autoPay !== false;
    ['cap', 'capBiz', 'vac', 'refiRate', 'refiTerm'].forEach((k) => { if (!isFinite(+S.g[k])) S.g[k] = GDEF[k]; });
    if (S.p) S.p = normalizePersonal(S.p);
    S.houses = (S.houses || []).filter((h) => h && h.id).map((h) => { const type = TYPES[h.type] ? h.type : 'house'; return Object.assign(newAsset(type, undefined, { id: h.id }), h, { type }); });
    S.houses.forEach((h) => {
      ['price', 'dp', 'rate', 'term', 'extra', 'rent', 'tax', 'ins', 'hoa', 'liens', 'paid', 'buyIn', 'wait', 'capex', 'capexMonths', 'arv', 'liftIncome', 'exitMonth', 'exitLift', 'sellCost', 'mat', 'nnn'].forEach((k) => { if (!isFinite(+h[k])) h[k] = newAsset(h.type, undefined)[k]; else h[k] = +h[k]; });
      if (+h.liftValue > 0 && !(+h.arv > 0)) { /* old data stored a % lift: convert it to a dollar appraisal at completion */
        const gv = h.growth == null || !isFinite(+h.growth) ? S.g.appr : +h.growth; h.arv = Math.round(h.price * Math.pow(1 + gv / 100, (h.capexMonths || 0) / 12) * (1 + h.liftValue / 100)); }
      delete h.liftValue; if (!(h.arv > 0)) h.arv = 0;
      h.arvAuto = !!h.arvAuto && +h.arv > 0;
      h.gain = h.gain !== null && h.gain !== '' && h.gain !== undefined && isFinite(+h.gain) ? +h.gain : null; /* if set, the appraisal follows price + rehab + gain */
      ['mipUp', 'mipAnn'].forEach((k) => { h[k] = isFinite(+h[k]) ? Math.max(0, +h[k]) : 0; }); h.finCapex = !!h.finCapex; h.ownerOcc = !!h.ownerOcc;
      if (h.term < 12 && !h.io) h.term = 360; h.io = !!h.io;
      if (h.growth != null && !isFinite(+h.growth)) h.growth = null;
      h.mat = Math.max(0, Math.round(h.mat || 0)); h.nnn = Math.min(100, Math.max(0, h.nnn || 0));
      ['refiRate', 'refiTerm'].forEach((k) => { h[k] = h[k] === null || h[k] === '' || h[k] === undefined || !isFinite(+h[k]) ? null : Math.max(0, +h[k]); });
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
  /* STRETCH scenario (listed in the order the assets are bought; the trust decides every purchase month): about $540M of net worth and +$1.5M/mo of cash flow after 20 years, and it buys 607 Siena Way, Bel Air, Los Angeles CA 90077 ("Villa Siena", about 35,000 sq ft; relisted at about $135,000,000 in December 2025, price may have changed) outright in month 170 (14 years in): $137.7M of cash (price plus 2% closing) = about $54M of cash the trust holds (sale proceeds and reinvested cash flow) + about $83M drawn on its line of credit against the other assets. Its rent is the amount the house would rent for ($520,000/mo), so the carry (tax $135,000, insurance $40,000, upkeep 1% of value a year) shows and the house never cash-flows negative; the line interest is paid from the portfolio's cash flow, which is still about $1.9M/mo after the purchase. It leans on two large business exits at 21-25%/yr growth. Not a forecast. */
  /* The older samples and scenarios list commercial costs net of what tenants repay, so their tenants repay 0% (their numbers are unchanged by the NNN field). */
  const netCosts = (S) => { S.houses.forEach((h) => { if (h.type === 'commercial') h.nnn = 0; }); return S; };
  const seedStretch = () => { const A = newAsset; return netCosts(normalize({ g: Object.assign({}, GDEF, { otherDebt: 450 }), p: samplePersonal(), houses: [
    A('house', 'conv30', { id: 'maple', addr: '1412 Maple Ridge Dr', status: 'owned', price: 185000, rate: 6.5, paid: 18, extra: 600, rent: 1900, tax: 215, ins: 90, growth: 4 }),
    A('house', 'conv30', { id: 'cedar', addr: '2207 Cedar Hollow Ln', status: 'owned', price: 165000, rate: 6.75, paid: 30, extra: 400, rent: 1750, tax: 180, ins: 85, growth: 4 }),
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
    A('commercial', 'comm25', { id: 'west', addr: 'Westfield Office Park', price: 11000000, rent: 112000, tax: 4200, ins: 3300, hoa: 2400, growth: 5, buyIn: 120 }),
    A('house', 'cashh', { id: 'siena', addr: '607 Siena Way, Los Angeles CA 90077', price: 135000000, rent: 520000, tax: 135000, ins: 40000, growth: 3.5, buyIn: 0 })] })); };
  /* $120M scenario: net worth about $120M at the end of the plan (it was tuned for $130M under the old per-asset funding chains), and the trust's own cash (sale proceeds and cash flow) buys a $35M waterfront estate in month 200. Business growth is capped at 8%/yr; partner capital is listed but the trust no longer needs it for purchases. */
  const seedBig = () => { const A = newAsset; const p = samplePersonal(); p.capital = [{ id: 'cap0', name: 'Family and friends', month: 11, amount: 100000 }, { id: 'cap1', name: 'Seed partners', month: 17, amount: 2850000 }, { id: 'cap2', name: 'Growth partners', month: 47, amount: 2910000 }, { id: 'cap3', name: 'Institutional partner', month: 79, amount: 6260000 }, { id: 'cap4', name: 'Follow-on partner', month: 119, amount: 1880000 }]; return netCosts(normalize({ g: Object.assign({}, GDEF, { otherDebt: 450 }), p, houses: [
    A('house', 'conv30', {id: 'maple', addr: '1412 Maple Ridge Dr', status: 'owned', price: 185000, rate: 6.5, paid: 18, extra: 600, rent: 1900, tax: 215, ins: 90, growth: 4}),
    A('house', 'conv30', {id: 'cedar', addr: '2207 Cedar Hollow Ln', status: 'owned', price: 165000, rate: 6.75, paid: 30, extra: 400, rent: 1750, tax: 180, ins: 85, growth: 4}),
    A('business', 'sba7a', {id: 'auto', addr: 'Precision Auto Care', status: 'owned', price: 1100000, paid: 12, rent: 34000, growth: 9}),
    A('house', 'conv30', {id: 'ridge', addr: '5521 Ridgeview Ct', price: 140000, buyIn: 12, rent: 1525, tax: 160, ins: 75, growth: 4, capex: 28000, capexMonths: 4, liftValue: 14, liftIncome: 8, exit: 'sell', exitMonth: 42}),
    A('commercial', 'comm25', {id: 'north', addr: 'Northgate Retail Strip', price: 1159000, rent: 11712, tax: 549, ins: 427, hoa: 305, growth: 5, buyIn: 18}),
    A('house', 'conv30', {id: 'birch', addr: '908 Birchwood Ct', price: 195000, rent: 2000, tax: 220, ins: 90, growth: 4, capex: 30000, capexMonths: 4, liftValue: 12, liftIncome: 8, exit: 'sell', exitMonth: 56}),
    A('business', 'sba7a', {id: 'bridgeway', addr: 'Bridgeway Software', price: 5490000, rent: 73200, growth: 8, buyIn: 24, exit: 'sell', exitMonth: 228}),
    A('business', 'bankbiz', {id: 'freight', addr: 'Summit Freight & Logistics', price: 3172000, rent: 57950, growth: 6.33, buyIn: 30}),
    A('house', 'dscr', {id: 'willow', addr: '3350 Willow Bend Rd', price: 210000, rent: 2125, tax: 235, ins: 95, growth: 4}),
    A('commercial', 'comm25', {id: 'harbor', addr: 'Harbor St Self-Storage', price: 2562000, rent: 25559, tax: 1098, ins: 915, hoa: 549, growth: 5, buyIn: 36}),
    A('business', 'sba7a', {id: 'keystone', addr: 'Keystone HVAC Services', price: 1342000, rent: 28060, growth: 10, buyIn: 36, exit: 'merge', exitMonth: 72, exitLift: 15, mergeInto: 'auto'}),
    A('house', 'conv30', {id: 'syc', addr: '7702 Sycamore Dr', price: 150000, buyIn: 40, rent: 1625, tax: 170, ins: 80, growth: 4, capex: 25000, capexMonths: 3, liftValue: 15, liftIncome: 9, exit: 'sell', exitMonth: 76}),
    A('business', 'sba7a', {id: 'apex', addr: 'Apex Property Services', price: 1708000, rent: 35380, growth: 12, buyIn: 48, exit: 'merge', exitMonth: 84, exitLift: 20, mergeInto: 'freight'}),
    A('commercial', 'comm25', {id: 'lake', addr: 'Lakeview Medical Office', price: 5185000, rent: 51118, tax: 1952, ins: 1586, hoa: 1098, growth: 5, buyIn: 60}),
    A('business', 'bankbiz', {id: 'meridian', addr: 'Meridian Staffing Group', price: 3965000, rent: 64050, growth: 8, buyIn: 60, capex: 300000, capexMonths: 9, liftValue: 25, liftIncome: 15, exit: 'sell', exitMonth: 204}),
    A('commercial', 'comm25', {id: 'east', addr: 'Eastgate Shopping Plaza', price: 3782000, rent: 37820, tax: 1586, ins: 1281, hoa: 854, growth: 5, buyIn: 80, capex: 800000, capexMonths: 12, liftValue: 20, liftIncome: 14, exit: 'sell', exitMonth: 150}),
    A('house', 'conv30', {id: 'linden', addr: '2914 Linden Way', price: 175000, buyIn: 90, rent: 1825, tax: 195, ins: 85, growth: 4}),
    A('commercial', 'bridge', {id: 'river', addr: 'Riverside Flex Industrial', price: 9760000, rent: 98698, tax: 3538, ins: 2745, hoa: 1525, growth: 5, buyIn: 96, capex: 1200000, capexMonths: 12, liftValue: 18, liftIncome: 12, exit: 'sell', exitMonth: 160}),
    A('commercial', 'comm25', {id: 'west', addr: 'Westfield Office Park', price: 6710000, rent: 68320, tax: 2562, ins: 2013, hoa: 1464, growth: 5, buyIn: 120}),
    A('house', 'cashh', {id: 'estate', addr: 'Lakeshore Waterfront Estate', price: 35000000, rent: 130000, tax: 32000, ins: 12000, growth: 3.5, buyIn: 200})] })); };
  /* $38.7M residence scenario (900 Stradella Rd, Los Angeles; Zestimate $38,731,700). Creative financing: seller financing, SBA 504 and 7(a), bridge loan, DSCR, bank term loans, seller notes, the trust's pooled line of credit, partner capital (listed, not needed for purchases). The portfolio's own cash buys the house outright; its rent is the amount the house would rent for, so the carry (tax, insurance, upkeep) is visible and the house never cash-flows negative. */
  const seedStradella = () => { const A = newAsset; const p = samplePersonal(); p.capital = [{ id: 'cap0', name: 'Family and friends', month: 11, amount: 100000 }, { id: 'cap1', name: 'Seed partners', month: 17, amount: 4400000 }, { id: 'cap2', name: 'Growth partners', month: 47, amount: 4170000 }, { id: 'cap3', name: 'Institutional partner', month: 79, amount: 7490000 }, { id: 'cap4', name: 'Follow-on partner', month: 119, amount: 2820000 }]; return netCosts(normalize({ g: Object.assign({}, GDEF, { otherDebt: 450 }), p, houses: [
    A('house', 'conv30', {id: 'maple', addr: '1412 Maple Ridge Dr', status: 'owned', price: 185000, rate: 6.5, paid: 18, extra: 600, rent: 1900, tax: 215, ins: 90, growth: 4}),
    A('house', 'conv30', {id: 'cedar', addr: '2207 Cedar Hollow Ln', status: 'owned', price: 165000, rate: 6.75, paid: 30, extra: 400, rent: 1750, tax: 180, ins: 85, growth: 4}),
    A('business', 'sba7a', {id: 'auto', addr: 'Precision Auto Care', status: 'owned', price: 1100000, paid: 12, rent: 34000, growth: 9}),
    A('house', 'conv30', {id: 'ridge', addr: '5521 Ridgeview Ct', price: 140000, buyIn: 12, rent: 1525, tax: 160, ins: 75, growth: 4, capex: 28000, capexMonths: 4, liftValue: 14, liftIncome: 8, exit: 'sell', exitMonth: 42}),
    A('commercial', 'sellerc', {id: 'north', addr: 'Northgate Retail Strip', price: 1159000, rent: 11712, tax: 549, ins: 427, hoa: 305, growth: 5, buyIn: 18}),
    A('house', 'conv30', {id: 'birch', addr: '908 Birchwood Ct', price: 195000, rent: 2000, tax: 220, ins: 90, growth: 4, capex: 30000, capexMonths: 4, liftValue: 12, liftIncome: 8, exit: 'sell', exitMonth: 56}),
    A('business', 'bankbiz', {id: 'bridgeway', addr: 'Bridgeway Software', price: 8235000, rent: 109800, growth: 8, buyIn: 24, exit: 'sell', exitMonth: 228}),
    A('business', 'bankbiz', {id: 'freight', addr: 'Summit Freight & Logistics', price: 4758000, rent: 86925, growth: 6.33, buyIn: 30}),
    A('house', 'dscr', {id: 'willow', addr: '3350 Willow Bend Rd', price: 210000, rent: 2125, tax: 235, ins: 95, growth: 4}),
    A('commercial', 'sba504', {id: 'harbor', addr: 'Harbor St Self-Storage', price: 3843000, rent: 38338, tax: 1647, ins: 1372, hoa: 824, growth: 5, buyIn: 36}),
    A('business', 'sba7a', {id: 'keystone', addr: 'Keystone HVAC Services', price: 1342000, rent: 28060, growth: 10, buyIn: 36, exit: 'merge', exitMonth: 72, exitLift: 15, mergeInto: 'auto'}),
    A('house', 'conv30', {id: 'syc', addr: '7702 Sycamore Dr', price: 150000, buyIn: 40, rent: 1625, tax: 170, ins: 80, growth: 4, capex: 25000, capexMonths: 3, liftValue: 15, liftIncome: 9, exit: 'sell', exitMonth: 76}),
    A('business', 'sellerb', {id: 'apex', addr: 'Apex Property Services', price: 2562000, rent: 53070, growth: 12, buyIn: 48, exit: 'merge', exitMonth: 84, exitLift: 20, mergeInto: 'freight'}),
    A('commercial', 'comm25', {id: 'lake', addr: 'Lakeview Medical Office', price: 7778000, rent: 76677, tax: 2928, ins: 2379, hoa: 1647, growth: 5, buyIn: 60}),
    A('business', 'sellerb', {id: 'meridian', addr: 'Meridian Staffing Group', price: 5948000, rent: 96075, growth: 8, buyIn: 60, capex: 300000, capexMonths: 9, liftValue: 25, liftIncome: 15, exit: 'sell', exitMonth: 204}),
    A('commercial', 'sellerc', {id: 'east', addr: 'Eastgate Shopping Plaza', price: 5673000, rent: 56730, tax: 2379, ins: 1922, hoa: 1281, growth: 5, buyIn: 80, capex: 800000, capexMonths: 12, liftValue: 20, liftIncome: 14, exit: 'sell', exitMonth: 150}),
    A('house', 'conv30', {id: 'linden', addr: '2914 Linden Way', price: 175000, buyIn: 90, rent: 1825, tax: 195, ins: 85, growth: 4}),
    A('commercial', 'bridge', {id: 'river', addr: 'Riverside Flex Industrial', price: 14640000, rent: 148047, tax: 5307, ins: 4118, hoa: 2288, growth: 5, buyIn: 96, capex: 1200000, capexMonths: 12, liftValue: 18, liftIncome: 12, exit: 'sell', exitMonth: 160}),
    A('commercial', 'comm25', {id: 'west', addr: 'Westfield Office Park', price: 10065000, rent: 102480, tax: 3843, ins: 3020, hoa: 2196, growth: 5, buyIn: 120}),
    A('house', 'cashh', {id: 'stradella', addr: '900 Stradella Rd residence', price: 38731700, rent: 150000, tax: 35500, ins: 11000, growth: 3.5, buyIn: 200})] })); };
  /* Default portfolio: NOTHING IS OWNED YET (every asset is planned; the Real page starts empty). Smooth growth (each purchase about 25% larger than the one before) to about $130.6M of net worth and $1.4M a month of cash flow (before tax) after 28 years (built by grader/logic/gen-plan.js: CFMIN=90 RENO=25000,30000,15000 DSCRX=0.3 BASE=61500 STEP=1.25 OUT=1 node gen-plan.js 27). The first asset has no trust to borrow from, so it is paid from your savings above the cash cushion plus the job money saved since; every later asset is paid by the trust (the borrowing room and reinvested cash flow of everything bought before it) plus your job money. The first two homes (and the fourth) get a renovation paid from that cash (not financed): the new appraisal adds 1.4x the rehab cost to the price and rent lifts 10%. Homes cash flow positive. Commercial and business loans carry a lender DSCR at least 0.3 above the minimum (a thick cushion: debt-to-income peaks near 16%). Businesses are priced at 3.6x or more of yearly owner profit; SBA 7(a) never above $5M outstanding. The trust decides every purchase month (each row's buyIn is 0 = as soon as the money is there). Commercial rows carry realistic gross tax, insurance and CAM that tenants repay under NNN leases (85%). Growth is 4%/yr for everything. No partner or investor money. It needs about $2,000 a month of job money left over after living costs; with much less, the early purchases come later and the plan ends well short (see the Checks block). */
  const seedPlan = () => { const A = newAsset; const p = samplePersonal(); p.capital = []; return orderByBuy(normalize({ g: Object.assign({}, GDEF, { otherDebt: 450, planYears: 28 }), p, houses: [
    A('house', 'conv30', {id: "maple", addr: "1412 Maple Ridge Dr", price: 60000, rent: 700, tax: 72, ins: 50, growth: 4, buyIn: 0, capex: 25000, capexMonths: 3, arv: 95000, liftIncome: 10}),
    A('house', 'conv30', {id: "cedar", addr: "2207 Cedar Hollow Ln", price: 75000, rent: 850, tax: 90, ins: 58, growth: 4, buyIn: 0, capex: 30000, capexMonths: 3, arv: 117000, liftIncome: 10}),
    A('house', 'dscr', {id: "birch", addr: "908 Birchwood Ct", price: 95000, rent: 1060, tax: 114, ins: 68, growth: 4, buyIn: 0, capex: 30000, capexMonths: 4, arv: 149000, liftIncome: 8, exit: "sell", exitMonth: 65}),
    A('house', 'conv30', {id: "willow", addr: "3350 Willow Bend Rd", price: 120000, rent: 1340, tax: 144, ins: 80, growth: 4, buyIn: 0, capex: 15000, capexMonths: 3, arv: 141000, liftIncome: 10}),
    A('house', 'conv30', {id: "linden", addr: "2914 Linden Way", price: 150000, rent: 1680, tax: 180, ins: 95, growth: 4, buyIn: 0}),
    A('house', 'dscr', {id: "ridge", addr: "5521 Ridgeview Ct", price: 190000, rent: 2130, tax: 228, ins: 115, growth: 4, buyIn: 0}),
    A('house', 'conv30', {id: "sycamore", addr: "7702 Sycamore Dr", price: 235000, rent: 2630, tax: 282, ins: 138, growth: 4, buyIn: 0}),
    A('house', 'conv30', {id: "elm", addr: "418 Elm Street", price: 295000, rent: 3300, tax: 354, ins: 168, growth: 4, buyIn: 0}),
    A('house', 'dscr', {id: "maplex", addr: "1412 Maple Ridge Dr #2", price: 365000, rent: 4090, tax: 438, ins: 203, growth: 4, buyIn: 0}),
    A('commercial', 'comm25', {id: "northgater", addr: "Northgate Retail Strip", price: 460000, growth: 4, dp: 50, rent: 3750, tax: 288, ins: 115, hoa: 115, nnn: 85, buyIn: 0}),
    A('commercial', 'comm25', {id: "harborstse", addr: "Harbor St Self-Storage", price: 575000, growth: 4, dp: 45, rent: 4970, tax: 359, ins: 144, hoa: 144, nnn: 85, buyIn: 0}),
    A('commercial', 'comm25', {id: "lakeviewme", addr: "Lakeview Medical Office", price: 715000, growth: 4, dp: 45, rent: 6520, tax: 447, ins: 179, hoa: 179, nnn: 85, buyIn: 0}),
    A('commercial', 'comm25', {id: "westfieldo", addr: "Westfield Office Park", price: 895000, growth: 4, dp: 50, rent: 7290, tax: 559, ins: 224, hoa: 224, nnn: 85, buyIn: 0}),
    A('commercial', 'comm25', {id: "eastgatesh", addr: "Eastgate Shopping Plaza", price: 1120000, growth: 4, dp: 45, rent: 9670, tax: 700, ins: 280, hoa: 280, nnn: 85, buyIn: 0}),
    A('business', 'sba7a', {id: "cornerston", addr: "Cornerstone Plumbing Co", price: 1400000, rent: 32410, growth: 4, buyIn: 0, dp: 10}),
    A('commercial', 'comm25', {id: "redwoodlog", addr: "Redwood Logistics Center", price: 1750000, growth: 4, dp: 50, rent: 14260, tax: 1094, ins: 438, hoa: 438, nnn: 85, buyIn: 0}),
    A('business', 'sba7a', {id: "summitfrei", addr: "Summit Freight & Logistics", price: 2185000, rent: 45520, growth: 4, buyIn: 0, dp: 10}),
    A('commercial', 'comm25', {id: "bayviewmed", addr: "Bayview Medical Plaza", price: 2730000, growth: 4, dp: 45, rent: 24910, tax: 1706, ins: 683, hoa: 683, nnn: 85, buyIn: 0}),
    A('business', 'bankbiz', {id: "keystonehv", addr: "Keystone HVAC Services", price: 3415000, rent: 71150, growth: 4, buyIn: 0, dp: 25}),
    A('commercial', 'comm25', {id: "summitbusi", addr: "Summit Business Park", price: 4265000, growth: 4, dp: 45, rent: 36840, tax: 2666, ins: 1066, hoa: 1066, nnn: 85, buyIn: 0}),
    A('business', 'bankbiz', {id: "apexproper", addr: "Apex Property Services", price: 5335000, rent: 96650, growth: 4, buyIn: 0, dp: 30}),
    A('commercial', 'comm25', {id: "crossroads", addr: "Crossroads Retail Center", price: 6670000, growth: 4, dp: 50, rent: 54360, tax: 4169, ins: 1668, hoa: 1668, nnn: 85, buyIn: 0}),
    A('business', 'bankbiz', {id: "meridianst", addr: "Meridian Staffing Group", price: 8335000, rent: 138920, growth: 4, buyIn: 0, dp: 35}),
    A('commercial', 'comm25', {id: "harborfron", addr: "Harborfront Industrial", price: 10420000, growth: 4, dp: 45, rent: 95080, tax: 6513, ins: 2605, hoa: 2605, nnn: 85, buyIn: 0}),
    A('business', 'bankbiz', {id: "ironwoodma", addr: "Ironwood Manufacturing", price: 13025000, rent: 193820, growth: 4, buyIn: 0, dp: 45}),
    A('commercial', 'comm25', {id: "gatewayoff", addr: "Gateway Office Tower", price: 16280000, growth: 4, dp: 45, rent: 140620, tax: 10175, ins: 4070, hoa: 4070, nnn: 85, buyIn: 0}),
    A('business', 'bankbiz', {id: "graniteind", addr: "Granite Industrial Supply", price: 20350000, rent: 302830, growth: 4, buyIn: 0, dp: 45}) ] })); };
  /* LEGACY small sample (the Load realistic sample button; the app's default is seedPlan above; listed in the order the assets are bought). Every loan, price, cap rate, multiple and growth rate is checked against
     the grader's benchmark file (prototype/grader). Homes cash flow positive. Recycles sale cash; needs about $1.3M of outside cash. */
  const seed = () => { const A = newAsset; return netCosts(normalize({ g: Object.assign({}, GDEF, { otherDebt: 450 }), p: Object.assign(samplePersonal(), { cash: 100000 }), houses: [
    A('house', undefined, { id: 'maple', status: 'owned', extra: 600, paid: 18, growth: 3.5, loanId: 'custom', rate: 6.5, addr: '1412 Maple Ridge Dr', price: 185000, rent: 1900, tax: 215, ins: 90 }),
    A('house', undefined, { id: 'cedar', status: 'owned', extra: 400, paid: 30, growth: 3.5, loanId: 'custom', rate: 6.75, addr: '2207 Cedar Hollow Ln', price: 165000, rent: 1750, tax: 180, ins: 85 }),
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
    A('commercial', undefined, { id: 'lake', buyIn: 100, loanId: 'custom', dp: 35, addr: 'Lakeview Medical Office', price: 1800000, rent: 17450, tax: 1000, ins: 800, hoa: 500 })] })); };
  /* ---------- list order = buy order; the trust (everything earlier in the list) funds each purchase ---------- */
  const catOf = (h) => h.type || 'house';
  /* Sort the list once into purchase order (owned first; ties keep their order). S.orderV marks it done so a saved order is never re-sorted. */
  function orderByBuy(S) {
    const pl = plan(S), rk = (h) => (h.status === 'owned' ? -(+h.paid || 0) : isFinite(pl.purchase[h.id]) ? pl.purchase[h.id] : 1e9); /* an owned asset was bought 'paid' months ago, so the oldest comes first */
    S.houses = S.houses.map((h, i) => [h, i]).sort((a, b) => rk(a[0]) - rk(b[0]) || a[1] - b[1]).map((x) => x[0]); S.orderV = 2; return S;
  }
  /* Funding no longer uses per-asset links: the trust (everything earlier in the list plus what is owned today) funds each purchase, so the list order IS the funding order and nothing needs relinking.
     The old h.target field is kept only so old saves load; it is ignored by plan(). relink() just clears it. */
  function relink(S) { S.houses.forEach((h) => { h.target = ''; }); return S; }
  /* creation sequence: the latest asset added in a category is the one with the highest seq (assets from before this feature have none: list position decides) */
  function register(S, h) { S.seq = (+S.seq || 0) + 1; h.seq = S.seq; h.created = Date.now(); return h; }
  function latestOf(list) { let best = null, bs = -Infinity; list.forEach((h) => { const q = h.seq != null && isFinite(+h.seq) ? +h.seq : -1; if (q >= bs) { bs = q; best = h; } }); return best; }
  function duplicate(S, id) {
    const i = S.houses.findIndex((h) => h.id === id); if (i < 0) return null;
    const o = S.houses[i], c = JSON.parse(JSON.stringify(o));
    c.id = 'h' + Date.now().toString(36) + (uid++); c.addr = o.addr + ' (copy)'; c.status = 'planned'; c.paid = 0; c.target = ''; c.fresh = false; c.listingUrl = '';
    register(S, c); S.houses.splice(i + 1, 0, c); return c;
  }
  /* move an asset one step inside its category (visible = ids shown in the category, in order); returns true if the order changed */
  function reorder(S, ids) {
    const set = new Set(ids), slots = []; S.houses.forEach((h, i) => { if (set.has(h.id)) slots.push(i); });
    const cur = slots.map((i) => S.houses[i].id); if (cur.join() === ids.join()) return false;
    const by = {}; S.houses.forEach((h) => { by[h.id] = h; }); ids.forEach((id, k) => { S.houses[slots[k]] = by[id]; }); return true;
  }
  const E = { depCum, costBasis, saleTax, portTaxAt, bracketTax, TAXY, loanPath, capOf, reimbOf, matOf, savedBy, needFor, housingAt, stress, seedPlan, seedStradella, seedBig, orderByBuy, relink, register, latestOf, duplicate, reorder, catOf, noiOf, cfSaved, estTaxPct, taxPctFor, finance, samplePersonal, normalizePersonal, jobsGross, jobsNet, jobMonthly, GDEF, TYPES, LOANS, downAmt, mipMonthly, loansFor, applyLoan, newAsset, newHouse, normalize, fromListing, seed, seedStretch, view, plan, afford, without, extraFor, locMonths, payoffN, pmt, payment, loan, balToday, need, H };
  if (typeof module !== 'undefined' && module.exports) module.exports = E; else root.Engine = E;
})(typeof window !== 'undefined' ? window : globalThis);
