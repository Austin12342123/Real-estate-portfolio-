/*STAMP*/globalThis.__BUILD=Object.assign(globalThis.__BUILD||{},{engine:'4cc16e3a'});/*ENDSTAMP*/
/* Portfolio finance engine v4 — pure functions, no DOM. Browser: window.Engine. Node: module.exports.
   Asset = { id, addr, type:'house'|'commercial'|'business', status:'owned'|'planned', price, dp, rate, term(months), io, closingPct, loanId,
   extra, driver, wait, rent (monthly base rent, or monthly owner profit for a business = revenue x margin/100), revenue (business only: monthly revenue, or null = rent / margin) and margin (business only: owner profit % of revenue, or null = 20), tax, ins, hoa (gross costs), nnn (% of tax+ins+hoa tenants repay), mat (months until the loan is due, 0 = none; io loans are due at their term), refiRate/refiTerm (null = Assumptions), liens, paid, buyIn (the earliest month it may be bought; the trust decides the real month), growth(%/yr or null), target (old links; ignored: every asset is funded by the trust of all assets before it) }.
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
  /* Multi-family loan options (2+ units). Same fields as LOANS (dp, rate, term in months, io, closing, mat = balloon month, upfrontMip / annualMip, ownerOcc) and read by applyLoan, loan() and loanPath() the same way.
     They live in their own list so the single-family, commercial and business lists stay exactly as they were. Rates and terms are TYPICAL (mid-2026 lender pages), not a quote.
     fit = size groups it suits: 'small' (2-4 units, residential loans), 'big' (5+ units, commercial / agency loans), 'pack' (a pack of houses bought together). minU / maxU = unit limits, only = the one-line reason shown when it does not fit.
     group = how the Add screen lists it. info = true for a structure the model cannot show faithfully: modelledAs names the closest modelled equivalent (said in its (i) text too). dscr = the DSCR a lender usually wants. */
  const MFLOANS = [
    { id: 'mfFha', types: ['multi'], group: 'live', name: 'FHA 203(b), 2-4 units (you live there)', dp: 3.5, rate: 6.9, term: 360, io: false, closing: 4, upfrontMip: 1.75, annualMip: 0.55, ownerOcc: true, fit: ['small'], only: 'Only for 2-4 units you live in', dscr: 1, note: 'House hack: live in one unit, rent the rest. Adds mortgage insurance.' },
    { id: 'mfVa', types: ['multi'], group: 'live', name: 'VA loan, 2-4 units (you live there)', dp: 0, rate: 6.5, term: 360, io: false, closing: 3, upfrontMip: 2.15, annualMip: 0, ownerOcc: true, fit: ['small'], only: 'Only for 2-4 units you live in', dscr: 1, note: 'For eligible veterans. No down payment. The VA funding fee is financed.' },
    { id: 'mfConvOO', types: ['multi'], group: 'live', name: 'Conventional 2-4 units (you live there)', dp: 10, rate: 6.9, term: 360, io: false, closing: 3, ownerOcc: true, fit: ['small'], only: 'Only for 2-4 units you live in', dscr: 1, note: 'Low down payment if you live in one unit: about 5% for 2 units, 10-25% for 3-4.' },
    { id: 'mfK203', types: ['multi'], group: 'live', name: 'FHA 203(k) rehab, 2-4 units (you live there)', dp: 3.5, rate: 7.15, term: 360, io: false, closing: 5, upfrontMip: 1.75, annualMip: 0.55, ownerOcc: true, finRehab: true, rehabDefaults: { capex: 40000, capexMonths: 6, liftIncome: 8 }, fit: ['small'], only: 'Only for 2-4 units you live in', dscr: 1, note: 'Buy and renovate with one loan. You must live in one unit.' },
    { id: 'mfConvInv', types: ['multi'], group: 'invest', name: 'Conventional 2-4 units (investor)', dp: 20, rate: 7.5, term: 360, io: false, closing: 3, fit: ['small'], only: 'Only for 2-4 units', dscr: 1, note: 'Standard investor mortgage on a duplex to fourplex: 15-25% down.' },
    { id: 'mfBlanket', types: ['multi'], group: 'invest', name: 'Blanket loan, pack of houses', dp: 25, rate: 7.9, term: 360, io: false, closing: 4, fit: ['pack'], only: 'Only for a pack of houses', dscr: 1.15, note: 'One loan over all the houses. Ask for release clauses to sell one house.' },
    { id: 'mfDscr', types: ['multi'], group: 'invest', name: 'DSCR investor loan, 1-4 units or a pack', dp: 25, rate: 7.75, term: 360, io: false, closing: 4, fit: ['small', 'pack'], only: 'For 2-4 units or a pack of houses', dscr: 1.1, note: 'Qualifies on the rent, not your income. Many lenders accept Section 8.' },
    { id: 'mfSbl', types: ['multi'], group: 'invest', name: 'Agency small-balance loan (5-50 units)', dp: 25, rate: 6.75, term: 360, mat: 120, io: false, closing: 2.5, fit: ['big'], minU: 5, maxU: 50, only: 'For buildings of 5 to 50 units', dscr: 1.25, note: '10-year term, 30-year schedule, usually no personal guarantee.' },
    { id: 'mfAgency', types: ['multi'], group: 'invest', name: 'Agency loan, Fannie Mae / Freddie Mac (5+ units)', dp: 25, rate: 6.4, term: 360, mat: 120, io: false, closing: 2.5, fit: ['big'], minU: 5, only: 'Only for 5+ unit buildings', dscr: 1.25, note: 'Best rates for stable buildings. 10-year term, 30-year schedule.' },
    { id: 'mfHud', types: ['multi'], group: 'invest', name: 'HUD / FHA 223(f), 35-year (20+ units)', dp: 15, rate: 6.0, term: 420, io: false, closing: 4.5, annualMip: 0.25, fit: ['big'], minU: 20, only: 'Needs about 20+ units ($2M+ loan)', dscr: 1.18, note: 'Longest term, highest loan share, fixed rate. Slow and paperwork heavy.' },
    { id: 'mfBank5', types: ['multi'], group: 'invest', name: 'Bank loan, 5-year balloon, 25-year schedule', dp: 25, rate: 7.0, term: 300, mat: 60, io: false, closing: 2, fit: ['small', 'big', 'pack'], only: 'Only for 2+ units', dscr: 1.25, note: 'Fast and flexible. The balance is due in year 5 and refinanced.' },
    { id: 'mfBank10', types: ['multi'], group: 'invest', name: 'Bank loan, 10-year fixed, 25-year schedule', dp: 25, rate: 7.25, term: 300, mat: 120, io: false, closing: 2, fit: ['small', 'big', 'pack'], only: 'Only for 2+ units', dscr: 1.25, note: 'Bank or credit-union portfolio loan. Often a full personal guarantee.' },
    { id: 'mfCmbs', types: ['multi'], group: 'invest', name: 'CMBS conduit loan (20+ units)', dp: 30, rate: 6.75, term: 360, mat: 120, io: false, closing: 4, fit: ['big'], minU: 20, only: 'Needs about 20+ units ($2M+ loan)', dscr: 1.25, note: 'Non-recourse, 10-year term. Costly to pay off early.' },
    { id: 'mfSba504', types: ['multi'], group: 'invest', name: 'SBA 504, mixed-use (you run a business there)', dp: 10, rate: 6.75, term: 300, io: false, closing: 3.5, fit: ['small', 'big'], only: 'Not for a pack of houses', dscr: 1.15, note: 'Only if your business uses 51%+ of the building. Not for pure rentals.' },
    { id: 'mfBridge', types: ['multi'], group: 'invest', name: 'Bridge loan, interest-only (value-add)', dp: 25, rate: 9.75, term: 24, io: true, closing: 4, fit: ['small', 'big', 'pack'], only: 'Only for 2+ units', dscr: 1, note: 'Renovate and fill the building, then refinance into an agency or HUD loan.' },
    { id: 'mfSeller', types: ['multi'], group: 'creative', name: 'Seller note with balloon', dp: 20, rate: 6.0, term: 300, mat: 60, io: false, closing: 2, fit: ['small', 'big', 'pack'], only: 'Only for 2+ units', dscr: 1, note: 'The seller carries the loan: 10-30% down, due in 3-10 years.' },
    { id: 'mfSellerIO', types: ['multi'], group: 'creative', name: 'Seller financing, interest-only', dp: 25, rate: 5.5, term: 60, io: true, closing: 1.5, fit: ['small', 'big', 'pack'], only: 'Only for 2+ units', dscr: 1, note: 'Seller carries the loan and you pay interest only for about 5 years.' },
    { id: 'mfAssume', types: ['multi'], group: 'creative', name: 'Assumable loan (take over the seller\'s loan)', dp: 35, rate: 4.5, term: 300, io: false, closing: 1.5, fit: ['small', 'big', 'pack'], only: 'Only for 2+ units', dscr: 1.2, note: 'Keep the seller\'s older, lower rate. You pay the gap in cash.' },
    { id: 'mfLease', types: ['multi'], group: 'creative', name: 'Master lease with option to buy', info: true, modelledAs: 'a 5-year interest-only seller loan with a 3% option fee', dp: 3, rate: 6.5, term: 60, io: true, closing: 1, fit: ['small', 'big', 'pack'], only: 'Only for 2+ units', dscr: 1, note: 'Info only. Modelled as a 5-year interest-only seller loan: option fee down, rent as payment.' },
    { id: 'mfSubTo', types: ['multi'], group: 'creative', name: 'Subject-to (seller\'s loan stays in place)', info: true, modelledAs: 'taking over the seller\'s loan, with the gap paid in cash', dp: 15, rate: 4.0, term: 300, io: false, closing: 1.5, fit: ['small', 'big', 'pack'], only: 'Only for 2+ units', dscr: 1, note: 'Info only. Modelled as taking over the seller\'s loan. The lender can call it due.' },
    { id: 'mfJv', types: ['multi'], group: 'creative', name: 'Equity partner / joint venture', info: true, modelledAs: 'a 75% bank loan with the partner funding the down payment', dp: 25, rate: 7.25, term: 300, mat: 120, io: false, closing: 2.5, fit: ['big', 'pack'], minU: 5, only: 'Best for 5+ units or a pack', dscr: 1.25, note: 'Info only. Modelled as a 75% bank loan. Record partner money under Finances.' },
    { id: 'mfCash', types: ['multi'], group: 'invest', name: 'Cash purchase', dp: 100, rate: 0, term: 360, io: false, closing: 2, fit: ['small', 'big', 'pack'], only: 'Only for 2+ units', dscr: 0, note: 'No loan.' }];
  MFLOANS.forEach((l) => { l.multi = true; });
  const loanById = (id) => LOANS.find((l) => l.id === id) || MFLOANS.find((l) => l.id === id);
  const loansFor = (type, h) => (type === 'house' && h && h.kind === 'multi' ? MFLOANS : LOANS.filter((l) => l.types.indexOf(type) >= 0));
  /* size group of a multi-family purchase: 2-4 units = residential loans, 5+ = commercial / agency loans, a pack of houses = portfolio (blanket) loans */
  const mfCat = (units, pack) => (pack ? 'pack' : units <= 4 ? 'small' : 'big');
  const mfFit = (l, units, pack) => { const c = mfCat(units, pack); if (l.fit.indexOf(c) < 0 || (l.minU && units < l.minU && !(pack && l.fit.indexOf('pack') >= 0)) || (l.maxU && units > l.maxU && !pack)) return { ok: false, why: l.only }; return { ok: true, why: '' }; };
  const mfLoans = (units, pack) => MFLOANS.map((l) => Object.assign({ loan: l }, mfFit(l, units, pack)));
  const mfFirst = (units, pack) => (mfLoans(units, pack).find((x) => x.ok) || { loan: MFLOANS[0] }).loan.id;
  /* typical starting numbers by size (the research brief, typical not a quote): price, rent, tax and insurance per unit, management %, repairs %, reserve per unit per year, other owner-paid costs per month (utilities, payroll).
     Packs: single houses bought together (10% management, older houses so 1.2% repairs). 5-19 units: 8%. 20-49: 6% plus a part-time maintenance tech. 50+: 5% plus an on-site manager. All editable. */
  function mfDefaults(units, pack) {
    units = Math.max(2, Math.min(500, Math.round(+units || 2))); const c = mfCat(units, pack), r5 = (x) => Math.round(x / 5) * 5, u = units;
    const t = pack ? { p: 120000, rent: 1400, tx: 1.1, ins: 105, mg: 10, mt: 1.2, oth: 0 } : c === 'small' ? { p: 150000, rent: 1700, tx: 1.1, ins: 80, mg: 8, mt: null, oth: 0 } : u < 20 ? { p: 110000, rent: 1250, tx: 1.2, ins: 75, mg: 8, mt: null, oth: 35 } : u < 50 ? { p: 100000, rent: 1100, tx: 1.2, ins: 65, mg: 6, mt: null, oth: 60 } : { p: 100000, rent: 1150, tx: 1.2, ins: 60, mg: 5, mt: null, oth: 95 };
    const price = Math.round(t.p * u / 1000) * 1000;
    return { price, rent: r5(t.rent * u), tax: Math.round(price * t.tx / 100 / 12), ins: r5(t.ins * u), hoa: 0, mgmtPct: t.mg, maintPct: t.mt, mfRes: 300, mfOther: r5(t.oth * u),
      addr: pack ? 'New pack of ' + u + ' houses' : u === 2 ? 'New duplex' : u === 3 ? 'New triplex' : u === 4 ? 'New fourplex' : 'New ' + u + '-unit building' };
  }
  let uid = 0;
  const DEFAULTS = {
    house: { addr: 'New home', price: 300000, rent: 2200, tax: 300, ins: 110, hoa: 0, nnn: 0, growth: 4, sellCost: 6 },
    commercial: { addr: 'New commercial property', price: 1500000, rent: 12500, tax: 940, ins: 375, hoa: 375, nnn: 85, growth: 4, sellCost: 5 },
    business: { addr: 'New business', price: 1000000, rent: 18000, revenue: 90000, margin: 20, tax: 0, ins: 0, hoa: 0, nnn: 0, growth: 4, sellCost: 8 } };
  function applyLoan(h, id) {
    const lo = loanById(id);
    if (!lo) { h.loanId = 'custom'; return h; }
    if (lo.multi) h.mat = lo.mat || 0; /* a multi-family loan sets its own balloon month (0 = none; an interest-only loan is due at its term anyway) */
    h.dp = lo.dp; h.rate = lo.rate; h.term = lo.term; h.io = !!lo.io; h.closingPct = lo.closing; h.loanId = lo.id;
    h.finCapex = !!lo.finRehab; h.mipUp = lo.upfrontMip || 0; h.mipAnn = lo.annualMip || 0; h.ownerOcc = !!lo.ownerOcc;
    if (lo.finRehab && lo.rehabDefaults && !(+h.capex > 0)) { Object.assign(h, lo.rehabDefaults); if (!(+h.arv > 0)) { h.arv = Math.round(((h.price + h.capex) * 1.15) / 1000) * 1000; h.arvAuto = true; } } /* auto-fill a typical rehab and a new appraisal 15% above total cost, only if none is set */
    return h;
  }
  function newAsset(type, loanId, o) {
    type = TYPES[type] ? type : 'house';
    const h = Object.assign({ id: 'h' + Date.now().toString(36) + (uid++), type, status: 'planned', extra: 0, driver: 'extra', wait: 24, liens: 0, paid: 0, buyIn: 0,
      target: '', growth: null, io: false, closingPct: null, loanId: '', dp: 20, rate: 6.75, term: 360, mat: 0, refiRate: null, refiTerm: null,
      capex: 0, capexMonths: 6, arv: 0, arvAuto: false, gain: null, liftIncome: 0, exit: 'hold', exitMonth: 60, exitLift: 0, mergeInto: '', finCapex: false, mipUp: 0, mipAnn: 0, ownerOcc: false,
      kind: 'single', units: 1, pack: false, mfRes: 300, mfOther: 0, mgmtPct: null, maintPct: null, boughtOn: null }, DEFAULTS[type]); /* kind 'multi' = a building or pack of houses with units >= 2 (still type 'house'); mfRes = replacement reserve per unit per year, mfOther = other owner-paid costs per month, mgmtPct / maintPct = this asset's own management / repairs % (null = the Assumptions rate) */
    applyLoan(h, loanId || (o && o.kind === 'multi' ? mfFirst(+o.units || 2, !!o.pack) : loansFor(type)[0].id));
    Object.assign(h, o || {});
    if (type === 'business' && o && o.rent !== undefined) { if (o.revenue === undefined) h.revenue = null; if (o.margin === undefined) h.margin = null; } /* a business made from its owner profit (the seeded ones) has no revenue of its own: the page shows rent / margin */
    if (h.finCapex && !(o && +o.arv > 0)) { h.arv = Math.round(((h.price + h.capex) * 1.15) / 1000) * 1000; h.arvAuto = true; } /* default appraisal from the FINAL price + rehab; it follows price/rehab until you type your own appraisal or gain */
    return h;
  }
  /* a business's owner profit per month (h.rent) = revenue per month x margin. revOf / marginOf give the revenue and margin the page shows: stored ones, else the margin default (20%) and the revenue it implies */
  const marginOf = (h) => (isFinite(+h.margin) && h.margin !== null && h.margin !== '' ? +h.margin : 20);
  const revOf = (h) => { if (isFinite(+h.revenue) && h.revenue !== null && h.revenue !== '') return +h.revenue; const m = marginOf(h); return m > 0 ? (+h.rent || 0) / (m / 100) : 0; };
  /* the new appraised value that follows the improvement budget: price + 1.4 x budget (the app's own convention: the first four homes are built on it). A 203(k) loan keeps its own older rule (15% above price + rehab). No budget = no new appraisal (0: the value does not change). */
  const ARV_K = 1.4;
  const autoArv = (h) => { const c = Math.max(0, +h.capex || 0); if (!(c > 0)) return 0; return h.finCapex ? Math.round(((h.price + c) * 1.15) / 1000) * 1000 : Math.round(h.price + ARV_K * c); };
  /* is the appraisal 'auto' (follows the budget) rather than typed by the user? true when the flag says so, when there is no appraisal and no budget, or when it is exactly what the rule gives (so the seeded homes, built on 1.4x, follow too). */
  const arvIsAuto = (h) => !!h.arvAuto || (!(+h.arv > 0) && !(+h.capex > 0)) || (+h.arv > 0 && +h.arv === autoArv(h) && !(h.gain !== null && h.gain !== undefined && isFinite(+h.gain)));
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
  /* multi-family costs: units, the replacement reserve (per unit per year) and other owner-paid costs (utilities, payroll) per month, and this asset's own management / repairs % when set */
  const isMulti = (h) => (h.type || 'house') === 'house' && h.kind === 'multi';
  const unitsOf = (h) => (isMulti(h) ? Math.max(2, Math.round(+h.units || 2)) : 1);
  const mfReserve = (h) => (isMulti(h) ? (unitsOf(h) * Math.max(0, +h.mfRes || 0)) / 12 : 0);
  const mfOther = (h) => (isMulti(h) ? Math.max(0, +h.mfOther || 0) : 0);
  const mgmtOf = (S, h) => ((h.type || 'house') !== 'business' && h.mgmtPct != null && h.mgmtPct !== '' && isFinite(+h.mgmtPct) ? +h.mgmtPct : S.g.mgmt); /* the property manager's % of rent collected: this asset's own (any home, building or commercial property; null = the Assumptions rate, which is what every asset used before). A business has no property manager: its owner profit is already after the people who run it, and a manager you pay when you do not run it is set in Finances. */
  const mgmtAmt = (S, h) => ((h.type || 'house') === 'business' ? 0 : (mgmtOf(S, h) / 100) * (h.rent + reimbOf(h)) * (1 - S.g.vac / 100)); /* the property manager per month in dollars */
  const maintOf = (S, h) => (isMulti(h) && h.maintPct != null && h.maintPct !== '' && isFinite(+h.maintPct) ? +h.maintPct : S.g.maint);
  const noiOf = (S, h) => { const g = S.g; if ((h.type || 'house') === 'business') return h.rent; const egi = (h.rent + reimbOf(h)) * (1 - g.vac / 100); return egi - (h.tax + h.ins + h.hoa + (maintOf(S, h) / 100) * h.price / 12 + (mgmtOf(S, h) / 100) * egi + mfReserve(h) + mfOther(h)); };
  /* the multi-family money picture per month: every line, per unit, and the operating-expense ratio (costs before the loan / income after vacancy) */
  function mfInfo(S, h) {
    const g = S.g, n = unitsOf(h), egi = (h.rent + reimbOf(h)) * (1 - g.vac / 100), gross = h.rent + reimbOf(h);
    const L = { vac: gross - egi, tax: h.tax, ins: h.ins, hoa: h.hoa, maint: (maintOf(S, h) / 100) * h.price / 12, mgmt: (mgmtOf(S, h) / 100) * egi, res: mfReserve(h), other: mfOther(h) };
    const opex = L.tax + L.ins + L.hoa + L.maint + L.mgmt + L.res + L.other, noi = noiOf(S, h), per = {}; Object.keys(L).forEach((k) => { per[k] = L[k] / n; });
    return { units: n, lines: L, perUnit: per, rentUnit: h.rent / n, egi, opex, noi, oer: egi > 0 ? (opex / egi) * 100 : NaN, cat: mfCat(n, !!h.pack) };
  }
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
      valueNow: valAt(S, h, 0), valueGain: +h.arv > 0 ? h.arv - h.price - (h.capex || 0) : 0, capRate: h.price > 0 ? ((noi * 12) / h.price) * 100 : NaN, capNow: valAt(S, h, 0) > 0 ? ((noi * 12) / valAt(S, h, 0)) * 100 : NaN, mgmtAmt: mgmtAmt(S, h), multiple: noi > 0 ? h.price / (noi * 12) : NaN, growth: gr(S, h) };
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
    if (pl.raw) { const o = saleTax(S, pl.raw, h); return o && scaleKeys(o, ['gain', 'dep', 'tax', 'ltcg', 'rec1250', 'ordinary', 'niit', 'state'], dfac(S, pl.raw.exits[h.id].month)); } /* a plan in today's dollars: work it out in future dollars, show it in today's */
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
    const keepBest = {}; /* the closest an unfunded asset got to its cash (recorded in the run where it blocked the queue; the final run leaves it out) */
    const settle = () => { for (let i = 0; i <= queue0.length + 1; i++) { run(); if (!blocked) break; if (best[blocked.id]) keepBest[blocked.id] = best[blocked.id]; skipped[blocked.id] = 1; } };
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
      trust[h.id] = { month: m, ready: rd, held: isFinite(m) && isFinite(rd) && m > rd, buyIn: bi, ok: isFinite(m), pooled: funds[h.id], n: f ? f.n : 0, room: f ? f.room : 0, cf: f ? f.cf : 0, cash: f ? f.cash : 0, draw: f ? f.draw : 0, heldCash: f ? f.heldCash : 0, have: f ? f.have : 0, need: f ? f.need : needFor(S, h), savings: f ? f.savings || 0 : 0, rsv: f ? f.rsv || 0 : 0, gross: f ? f.gross : 0, best: best[h.id] || keepBest[h.id] || null };
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


  /* ---------- TODAY'S DOLLARS ----------
     The engine always works in future (nominal) dollars: rents, values and living costs grow, loan payments are fixed, and a planned asset's price is TODAY'S price (nothing is inflated).
     For display, every figure that belongs to a future month is divided by (1 + cost-increase rate)^(months / 12), the same rate living costs rise at (Finances, "Cost increase"). Figures for month 0 are unchanged.
     realPlan() returns the plan with every dollar figure of a future month converted that way (totals and rows are converted with the same factor, so a total is still the sum of its rows). The plan itself stays in pl.raw. */
  const dfac = (S, m) => Math.pow(1 + (((S && S.p && S.p.inflation) || 0) / 100), Math.max(0, +m || 0) / 12);
  const PL_K = ['nw', 'monthly', 'extra', 'noi', 'ds', 'cf', 'cfx', 'debt', 'value', 'rent', 'dsti', 'outside', 'cash', 'intr', 'dep', 'txRE', 'txBiz'];
  const AS_K = ['equity', 'value', 'debt', 'payment', 'cf', 'income', 'extra'], PO_K = ['room', 'drawn', 'head', 'cf', 'tax', 'gm', 'sweep', 'cash'], EX_K = ['proceeds', 'price', 'net', 'dep', 'cost', 'tax', 'cashIn', 'profit'], JB_K = ['surplus', 'used', 'line', 'cash', 'loans', 'liquid'];
  const scaleKeys = (o, ks, f) => { const c = Object.assign({}, o); ks.forEach((k) => { if (typeof c[k] === 'number') c[k] = c[k] / f; }); return c; };
  function realPlan(S, pl) {
    if (!pl) pl = plan(S); if (pl.raw) return pl;
    const T = pl.T, f = (m) => dfac(S, m), r = Object.assign({}, pl, { raw: pl, real: true });
    r.series = Object.assign({}, pl.series); PL_K.forEach((k) => { r.series[k] = pl.series[k].map((v, t) => v / f(t)); });
    r.at = (t) => { const o = scaleKeys(pl.at(t), PL_K, f(Math.max(0, Math.min(T, Math.round(t))))); return o; };
    r.today = r.at(0); r.final = r.at(Math.min(T, pl.lastEvent)); r.horizon = r.at(Math.min(T, pl.planM));
    r.assetsAt = (t) => { const k = f(Math.max(0, Math.min(T, Math.round(t)))); return pl.assetsAt(t).map((x) => scaleKeys(x, AS_K, k)); };
    r.snap = r.assetsAt(Math.min(T, pl.planM));
    r.poolAt = (t) => scaleKeys(pl.poolAt(t), PO_K, f(Math.max(0, Math.min(T, Math.round(t)))));
    r.exits = {}; Object.keys(pl.exits).forEach((id) => { r.exits[id] = scaleKeys(pl.exits[id], EX_K, f(pl.exits[id].month)); });
    r.outsideTotal = pl.outsideTotal / f(T);
    r.balAt = (id, t) => pl.balAt(id, t) / f(t); r.autoAt = (id, t) => pl.autoAt(id, t) / f(t); r.jobAt = (id, t) => pl.jobAt(id, t) / f(t);
    r.jobs = Object.assign({}, pl.jobs); JB_K.forEach((k) => { if (pl.jobs[k]) r.jobs[k] = pl.jobs[k].map((v, t) => v / f(t)); });
    return r;
  }
  const planR = (S) => realPlan(S, plan(S));
  /* the same plan in future dollars or today's dollars: u = 'today' (default) | 'future' */
  const planIn = (S, u) => (u === 'future' ? plan(S) : planR(S));

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
  const mAt = (m) => (m <= 0 ? 'today' : m + (m === 1 ? ' month' : ' months') + ' from today' + (root.RepDate && root.RepDate.dtm ? ' (' + root.RepDate.dtm(m) + ')' : '')), inM = (m) => mAt(m), aroundM = (m) => (m <= 0 ? 'today' : 'around ' + mAt(m));
  function finance(S, pl) {
    const p = S.p; if (!p) return null; pl = pl || plan(S);
    const real = !!pl.raw; if (real) pl = pl.raw; /* a plan in today's dollars: work it all out in future dollars, then show every figure in today's (see the end of this function) */
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
    const dv = (v, t) => (real ? v / dfac(S, t) : v); /* in today's dollars the lowest cash is the lowest of the series as shown (each month in its own dollars) */
    for (let t = 0; t <= T; t++) { const tt = dv(R.total[t], t); if (tt < minT) { minT = tt; minM = t; } const gp = dv(R.reserve[t] - R.total[t], t); if (gp > gapM) { gapM = gp; gapAt = t; }
      if (R.runway[t] < minRun) { minRun = R.runway[t]; minRunM = t; } if (firstShort < 0 && R.total[t] < 0) firstShort = t; }
    const worstNet = Math.min.apply(null, R.net), callsAll = [];
    for (let t = 0; t <= T; t++) if (R.outsideCall[t] > 0.5) callsAll.push({ month: t, amount: R.outsideCall[t], assets: S.houses.filter((h) => pl.purchase[h.id] === t || (h.capex > 0 && h.status === 'owned' && t === 0)).map((h) => h.addr) });
    const pe = Math.min(T, pl.planM), reasons = [], fixes = [], money = (n, t) => '$' + Math.round(Math.abs(n) / (real && t > 0 ? dfac(S, t) : 1)).toLocaleString('en-US'); /* t = the month the amount belongs to (today's dollars divide by that month's factor) */
    let status = 'yes';
    const short = Math.max(0, -minT);
    if (short > 0.5) { status = 'no'; const c = callsAll.filter((x) => x.month <= firstShort).slice(-1)[0];
      reasons.push({ sev: 'bad', text: 'You run out of cash ' + inM(firstShort) + ' and would be about ' + money(short) + ' short at the lowest point, ' + mAt(minM) + '.' });
      fixes.push('Line up at least ' + money(short) + ' more (partners, investors, family) before ' + mAt(firstShort) + (c && c.assets.length ? ', when ' + c.assets.join(' and ') + ' closes' : '') + ', or push those purchases later.'); }
    if (R.net[0] < -0.5) { if (status === 'yes') status = 'tight'; reasons.push({ sev: 'warn', text: 'You spend ' + money(-R.net[0]) + ' a month more than you bring in right now.' }); reasons[reasons.length - 1].short = 'You spend more than you earn each month.'; fixes.push('Close the ' + money(-R.net[0]) + '/mo gap: raise income, cut living costs, or trim extra payments (' + money(R.extra[0]) + '/mo now).'); }
    else reasons.push({ sev: 'ok', short: 'saving ' + money(R.net[0]) + ' a month right now', text: 'You save about ' + money(R.net[0]) + ' a month after living costs, debts and extra payments.' });
    let peakH = 0, peakHM = 0; for (let t = 0; t <= T; t++) if (R.hours[t] > peakH) { peakH = R.hours[t]; peakHM = t; }
    const peakBiz = Math.max.apply(null, R.nBiz), gmMax = Math.max.apply(null, R.gm), gmMaxM = Math.max(0, R.gm.indexOf(gmMax));
    if (peakH > 70) { if (status === 'yes') status = 'tight'; reasons.push({ sev: 'warn', short: 'The hours do not fit in a week ' + aroundM(peakHM) + '.', text: 'At the busiest point, ' + mAt(peakHM) + ', you would work about ' + Math.round(peakH) + ' hours a week between your job and running ' + Math.min(p.operating, peakBiz) + ' business(es) yourself.' }); fixes.push('Hire a general manager for a business, drop a job, or sell a business sooner. Each manager costs about ' + money(p.gmMonthly) + '/mo.'); }
    else if (peakBiz > 0) reasons.push({ sev: 'ok', short: 'about ' + Math.round(peakH) + ' hours a week', text: 'About ' + Math.round(peakH) + ' hours a week at the busiest point' + (gmMax > 0 ? ', with ' + money(gmMax, gmMaxM) + '/mo of manager pay for businesses you do not run' : '') + '.' });
    const reserveGap = Math.max(0, gapM);
    if (short <= 0.5 && reserveGap > 0.5) { if (status === 'yes') status = 'tight'; reasons.push({ sev: 'warn', short: 'Your cash dips below your emergency reserve ' + inM(gapAt) + '.', text: 'Your cash falls ' + money(reserveGap) + ' below a ' + p.emergencyMonths + '-month emergency reserve, ' + mAt(gapAt) + '.' }); fixes.push('Hold about ' + money(reserveGap) + ' more cash to keep ' + p.emergencyMonths + ' months of expenses at all times.'); }
    else if (short <= 0.5) reasons.push({ sev: 'ok', short: 'reserve covered', text: 'Your cash never drops below a ' + p.emergencyMonths + '-month emergency reserve.' });
    if (pl.worst.dti > g.dti) { if (status === 'yes') status = 'tight'; reasons.push({ sev: 'warn', short: 'Lenders may decline a loan ' + aroundM(pl.worst.month) + '.', text: 'Lenders may decline: your debt payments reach ' + Math.round(pl.worst.dti) + '% of qualifying income ' + inM(pl.worst.month) + ' (limit ' + g.dti + '%).' }); fixes.push('Raise qualifying income, add a co-signer, or lower the loan sizes that close ' + aroundM(pl.worst.month) + '.'); }
    else reasons.push({ sev: 'ok', short: 'lenders should approve', text: 'Lenders should approve the loans: debt payments peak at ' + Math.round(pl.worst.dti) + '% of qualifying income (limit ' + g.dti + '%).' });
    if (isFinite(minRun) && minRun < 3 && short <= 0.5) { if (status === 'yes') status = 'tight'; reasons.push({ sev: 'warn', short: 'You have little cushion if your paycheck stops.', text: 'If your job income stopped ' + inM(minRunM) + ', your cash would last only ' + minRun.toFixed(1) + ' months.' }); fixes.push('Build cash or portfolio income so you could last at least 3 months without a paycheck.'); }
    if (pl.lastBuy > pl.planM) { if (status === 'yes') status = 'tight'; reasons.push({ sev: 'warn', short: 'The plan runs past its ' + Math.round(pl.planM / 12) + (Math.round(pl.planM / 12) === 1 ? ' year' : ' years') + ': the last purchase is ' + inM(pl.lastBuy) + '.', text: 'The last purchase comes ' + inM(pl.lastBuy) + ', after the ' + Math.round(pl.planM / 12) + '-year plan ends, ' + mAt(pl.planM) + ', so the plan-end numbers leave out part of it. Your job money left over after living costs is ' + money(R.jobSurplus[0]) + '/mo; the default plan assumes about $2,000.' }); fixes.push('Raise the job money left after living costs, or lower the sizes of the early purchases, so the last one closes inside the plan.'); }
    const firstWarn = reasons.find((x) => x.sev === 'warn');
    const headline = status === 'yes' ? 'Yes. You can carry this plan.' : status === 'tight' ? 'Tight. ' + (firstWarn ? firstWarn.short || firstWarn.text : 'It works, but with thin margins.') : 'Not yet. You run short of cash ' + inM(firstShort) + '.';
    const totalOutside = s.outside[T], capitalTotal = p.capital.reduce((a, x) => a + x.amount, 0);
    const out = { series: R, T, status, headline, saleInfo, reasons, fixes, calls: callsAll,
      kpis: { planEnd: { month: pe, cfBefore: R.portfolio[pe], tax: R.portTax[pe], cfAfter: R.portfolio[pe] - R.portTax[pe], net: R.net[pe] }, peakHours: peakH, peakHoursMonth: peakHM, managerCost0: R.gm[0], managerCostMax: gmMax, peakBusinesses: peakBiz, takeHome: R.income[0], portfolioAfterTax: R.portfolio[0] - R.portTax[0], extra: R.extra[0], living: R.living[0], debts: R.debts[0], net0: R.net[0], worstNet, cash0: p.cash, reserveMonths0: R.living[0] + R.debts[0] > 0 ? p.cash / (R.living[0] + R.debts[0]) : Infinity,
        jobSurplus0: R.jobSurplus[0], jobSplit0: R.jobSplit[0], jobSurplusMax: Math.max.apply(null, R.jobSurplus), minLiquid: minT, minLiquidMonth: minM, shortAmount: short, firstShortMonth: firstShort, reserveTarget0: R.reserve[0], reserveGap, runway0: R.runway[0], minRunway: minRun, totalOutside, capitalTotal, savingsUsed: Math.min(p.cash, totalOutside), gap: Math.max(0, totalOutside - p.cash - capitalTotal), dtiPeak: pl.worst.dti, reserveGapMonth: gapAt } };
    /* can-I-buy-this: the portfolio verdict is the worst of this one and the feasibility tests (a planned asset that cannot be funded or financed is 'no', never 'tight') */
    const feas = feasible(S, pl, out, true); out.feas = feas;
    const RK = { yes: 0, tight: 1, no: 2 };
    if (RK[feas.verdict] > RK[out.status]) { const wasNo = out.status === 'no'; out.status = feas.verdict; if (!wasNo) out.headline = feas.headline; }
    const lead = feas.reasons.filter((x) => x.asset || /^p-(funding|cltv|concentration|earners)$/.test(x.id)).map((x) => ({ sev: x.sev, text: x.text, short: x.short }));
    out.reasons = lead.concat(out.reasons);
    const topAsset = feas.reasons.find((x) => x.asset && x.sev === 'bad') || feas.reasons.find((x) => x.asset);
    if (topAsset) { const sf = shortfall(S, pl, out, topAsset.asset); if (sf) sf.changes.slice(0, 2).forEach((c) => out.fixes.push(c.text + '.')); }
    return real ? finToday(S, out, pl) : out;
  }
  /* a finance result in today's dollars: every money series is divided by the factor of its own month; an amount that belongs to one month (lowest cash, cash needed, ...) by that month's factor */
  const FN_K = ['dep', 'taxable', 'gm', 'income', 'portfolio', 'portTax', 'extra', 'living', 'debts', 'oneTime', 'capitalIn', 'jobSplit', 'jobSurplus', 'outsideCall', 'saleTax', 'interest', 'net', 'liquid', 'total', 'reserve', 'burn'];
  function finToday(S, f, pl) {
    const T = f.T, d = (m) => dfac(S, Math.min(T, m)), k = f.kpis, pe = k.planEnd.month, p = S.p;
    FN_K.forEach((n) => { f.series[n] = f.series[n].map((v, t) => v / d(t)); });
    f.calls = f.calls.map((c) => Object.assign({}, c, { amount: c.amount / d(c.month) }));
    Object.keys(f.saleInfo).forEach((id) => { f.saleInfo[id] = scaleKeys(f.saleInfo[id], ['gain', 'dep', 'tax', 'ltcg', 'rec1250', 'ordinary', 'niit', 'state'], d(pl.exits[id].month)); });
    const R = f.series, cap = p.capital.reduce((a, x) => a + x.amount / d(x.month), 0), tot = k.totalOutside / d(T);
    Object.assign(k, { planEnd: { month: pe, cfBefore: R.portfolio[pe], tax: R.portTax[pe], cfAfter: R.portfolio[pe] - R.portTax[pe], net: R.net[pe] },
      managerCost0: R.gm[0], managerCostMax: Math.max.apply(null, R.gm), takeHome: R.income[0], portfolioAfterTax: R.portfolio[0] - R.portTax[0], extra: R.extra[0], living: R.living[0], debts: R.debts[0], net0: R.net[0], worstNet: Math.min.apply(null, R.net),
      jobSurplus0: R.jobSurplus[0], jobSplit0: R.jobSplit[0], jobSurplusMax: Math.max.apply(null, R.jobSurplus), reserveTarget0: R.reserve[0],
      totalOutside: tot, capitalTotal: cap, savingsUsed: Math.min(p.cash, tot), gap: Math.max(0, tot - p.cash - cap) });
    return f;
  }

  /* Can the lenders carry this purchase? Debt-to-income (including your own rent or mortgage) in the month the trust buys the asset. Assets owned today have nothing to afford. */
  function afford(S, h, pl, fe) {
    pl = pl || plan(S);
    if (fe && h && fe.assets && fe.assets[h.id]) { const A = fe.assets[h.id]; /* the full can-I-buy-this result: the verdict, its kind (nofund / nolender / nocashflow) and the one short clause */
      const cls = A.verdict === 'no' ? 'bad' : A.verdict === 'tight' ? 'warn' : 'ok', b = afford(S, h, pl);
      return Object.assign({}, b, { cls, verdict: A.verdict, kind: A.kind, short: A.short, criteria: A.criteria, txt: cls === 'ok' ? '✓ Afford' : cls === 'warn' ? '△ Tight' : '✗ Short', why: A.top ? A.top.text : b.why }); }
    if (!h || h.status === 'owned') return { cls: 'na', txt: 'Owned', why: 'You already own this one.' };
    const m = pl.purchase[h.id];
    if (!isFinite(m)) return { cls: 'bad', txt: '✗ Not reachable', why: 'The trust (all the assets before it) cannot fund this within 50 years.' };
    const dti = pl.series.dti[Math.min(pl.T, m)], lim = S.g.dti;
    if (dti >= 999) return { cls: 'bad', dti, txt: '✗ Short', why: 'No qualifying income is set (see Assumptions).' };
    const cls = dti <= lim * 0.8 ? 'ok' : dti <= lim ? 'warn' : 'bad';
    return { cls, dti, txt: cls === 'ok' ? '✓ Afford' : cls === 'warn' ? '△ Tight' : '✗ Short', why: 'Debt-to-income ' + dti.toFixed(0) + '% (including your own rent or mortgage) vs ' + lim + '% limit when ' + h.addr + ' closes.' };
  }
  /* ---------- CAN I BUY THIS? One test list per planned asset and one for the whole portfolio ----------
     Every criterion is { id, label, status: 'ok' | 'caution' | 'fail', measured, limit, how, hard, kind, text, short }.
     hard = a fail that makes the verdict 'no' (cannot be funded in the plan, a lender test fails, the monthly money does not carry it, a home loses money). Any other caution or fail makes it 'tight'.
     Money for the funding test is exactly what the plan uses (pl.trust: the pool's borrowing room + the cash it holds, or your savings above the cushion for the first purchase), at the month the plan buys it;
     monthly figures are in today's dollars. Nothing here is stored: it is worked out again from the live state each time it is asked for. */
  const FEAS = { concCaution: 35, concFail: 60, concMin: 3, capMin: 4, vacPts: 10, ratePts: 2, dscrDefault: 1.25, dscrNear: 0.05, runCaution: 3, runFail: 1, dtiCaution: 0.85, pace: 0.9, lastsCaution: 3, lastsFail: 1, loanMax: { sba7a: 5000000 } };
  const fm = (n) => { const a = Math.abs(+n || 0); return '$' + (a >= 1e6 ? String(+(a / 1e6).toFixed(2)) + 'M' : Math.round(a).toLocaleString('en-US')); };
  const sgn = (n) => (n < -0.5 ? '−' : '') + fm(n);
  const dscrMinOf = (h) => { const l = loanById(h.loanId); return l || MINDSCR[h.loanId] != null ? minDscrOf(h.loanId) : FEAS.dscrDefault; };
  const mkC = (id, label, status, measured, limit, how, o) => Object.assign({ id, label, status, measured, limit, how, hard: false, kind: '', text: '', short: '' }, o || {});
  const worstOf = (cs) => cs.reduce((a, c) => (c.status === 'fail' ? 'fail' : c.status === 'caution' && a !== 'fail' ? 'caution' : a), 'ok');
  const FRANK = { fail: 0, caution: 1, ok: 2 }, KRANK = { nofund: 0, nolender: 1, nocashflow: 2, '': 3 };
  const sortC = (cs) => cs.slice().sort((a, b) => FRANK[a.status] - FRANK[b.status] || (b.hard ? 1 : 0) - (a.hard ? 1 : 0) || KRANK[a.kind || ''] - KRANK[b.kind || '']);
  function feasAsset(S, pl, fin, h, ctx) {
    const g = S.g, v = pl.V[h.id], tr = pl.trust[h.id], T = pl.T, planM = pl.planM, type = h.type || 'house', ok = tr.ok, m0 = ok ? tr.month : Infinity;
    const L = loan(h), pay = payment(h) + mipMonthly(h), noi = v.noi, need = tr.need, price = h.price, yrs = Math.round(planM / 12);
    const bm = ok ? m0 : tr.best ? tr.best.month : 0, mi2 = Math.max(0, Math.min(T, bm)), dfm = dfac(S, mi2), pa = pl.poolAt(mi2);
    let have = 0, room = 0, tcash = 0, sav = 0; const pooled = ok ? !!tr.pooled : pa.n > 0;
    if (ok) { have = tr.have; if (pooled) { room = tr.room; tcash = tr.heldCash || 0; } else sav = tr.have; } else if (tr.best) { have = tr.best.avail; if (pooled) { tcash = Math.min(pa.cash, have); room = have - tcash; } else sav = have; }
    const cashShort = Math.max(0, need - have), uncovered = Math.max(0, price - have), down = downAmt(h), closing = (price * clPct(S, h)) / 100, rehab = h.finCapex ? 0 : Math.max(0, h.capex || 0);
    const poolCf = Math.max(0, pa.cf) / dfm, personal = !pooled && fin ? Math.max(0, fin.kpis.net0 || 0) : 0, avail = poolCf + noi + personal, absorb = fin ? Math.max(0, fin.series.net[mi2] / dfm, poolCf + personal) : poolCf + personal; /* what you can absorb if the asset earns less: your whole monthly surplus (job + portfolio - living costs, extra payments) */
    const cs = [], add = (c) => { cs.push(c); return c; };
    /* 1) funding */
    const pc = Math.round(planM * FEAS.pace);
    const how1 = 'needs ' + fm(need) + ' (down ' + fm(down) + ' + closing ' + fm(closing) + (rehab > 0 ? ' + rehab ' + fm(rehab) : '') + '); can pull out ' + fm(have) + ' (' + (pooled ? 'room ' + fm(room) + ' + trust cash ' + fm(tcash) : 'savings above the cushion ' + fm(sav)) + ')' + (ok ? ' by ' + mAt(m0) : '');
    if (!ok) add(mkC('funding', 'Cash to close', 'fail', fm(have) + ' of ' + fm(need), 'needs ' + fm(need), how1 + ' - the plan never reaches it', { hard: true, kind: 'nofund', text: 'Not possible: needs ' + fm(need) + ', the plan never reaches it', short: 'Not possible - short ' + fm(cashShort) }));
    else if (m0 > planM) add(mkC('funding', 'Cash to close', 'fail', mAt(m0), 'by ' + mAt(planM), how1, { hard: true, kind: 'nofund', text: 'Not possible: funded only ' + inM(m0) + ', after the ' + yrs + '-year plan ends', short: 'Not possible - funded only ' + inM(m0) }));
    else if (m0 > pc) add(mkC('funding', 'Cash to close', 'caution', mAt(m0), 'by ' + mAt(pc), how1, { kind: 'nofund', text: 'Late: funded only ' + inM(m0) + ', near the end of the ' + yrs + '-year plan', short: 'Late - funded ' + inM(m0) }));
    else add(mkC('funding', 'Cash to close', 'ok', fm(have) + ' of ' + fm(need), 'needs ' + fm(need), how1));
    /* 2) lender tests */
    const dmin = dscrMinOf(h), hasLoan = L > 0.5 && pay > 0.5, dscr = hasLoan ? noi / pay : Infinity;
    if (!hasLoan) add(mkC('dscr', 'Loan DSCR', 'ok', 'no loan', '', 'No loan on this asset, so no lender test.'));
    else add(mkC('dscr', 'Loan DSCR', dscr < dmin - FEAS.dscrNear ? 'fail' : dscr < dmin + FEAS.dscrNear ? 'caution' : 'ok', dscr.toFixed(2), 'min ' + dmin, 'income ' + fm(noi) + '/mo / loan payment ' + fm(pay) + '/mo = ' + dscr.toFixed(2) + ' vs the ' + dmin + ' this loan wants',
      { hard: dscr < dmin - FEAS.dscrNear, kind: 'nolender', text: (dscr < dmin - FEAS.dscrNear ? 'Not possible: ' : '') + "the loan's DSCR is " + dscr.toFixed(2) + (dscr < dmin ? ', under the ' : ', close to the ') + dmin + ' the lender wants', short: (dscr < dmin - FEAS.dscrNear ? 'Not possible - ' : 'Tight - ') + 'DSCR ' + dscr.toFixed(2) + ' vs ' + dmin }));
    const pre = loanById(h.loanId), ltv = baseAmt(h) > 0 && hasLoan ? ((L / (1 + (h.mipUp || 0) / 100)) / baseAmt(h)) * 100 : 0, ltvMax = pre && pre.dp < 100 ? 100 - pre.dp : null;
    if (ltvMax === null || !hasLoan) add(mkC('ltv', 'Loan-to-value', 'ok', hasLoan ? ltv.toFixed(0) + '%' : 'no loan', '', hasLoan ? 'Custom loan: no program limit to test.' : 'No loan on this asset.'));
    else add(mkC('ltv', 'Loan-to-value', ltv > ltvMax + 0.01 ? 'fail' : 'ok', ltv.toFixed(0) + '%', 'max ' + ltvMax + '%', 'loan ' + fm(L) + ' / price ' + fm(baseAmt(h)) + ' = ' + ltv.toFixed(0) + '% vs the ' + ltvMax + '% the ' + pre.name + ' lends', { hard: ltv > ltvMax + 0.01, kind: 'nolender', text: 'Not possible: the loan is ' + ltv.toFixed(0) + '% of the price, over the ' + ltvMax + '% this loan lends', short: 'Not possible - LTV ' + ltv.toFixed(0) + '% over ' + ltvMax + '%' }));
    const cap = FEAS.loanMax[h.loanId];
    add(cap ? mkC('loanmax', 'Loan size limit', L > cap ? 'fail' : 'ok', fm(L), 'max ' + fm(cap), 'loan ' + fm(L) + ' vs the ' + fm(cap) + ' this program stops at', { hard: L > cap, kind: 'nolender', text: 'Not possible: the loan is ' + fm(L) + ', over the ' + fm(cap) + ' limit of this program', short: 'Not possible - loan over ' + fm(cap) }) : mkC('loanmax', 'Loan size limit', 'ok', hasLoan ? fm(L) : 'no loan', 'none', 'This loan has no program size limit in the app.'));
    const dti = pl.series.dti[mi2], dl = g.dti;
    add(mkC('dti', 'Total debt-to-income', dti >= 999 ? 'fail' : dti > dl ? 'fail' : dti > FEAS.dtiCaution * dl ? 'caution' : 'ok', dti >= 999 ? 'no income' : dti.toFixed(0) + '%', 'max ' + dl + '%', 'all debt payments incl. this loan and your own housing / qualifying income = ' + (dti >= 999 ? 'no qualifying income set' : dti.toFixed(0) + '%') + ' ' + (ok ? 'when it closes' : 'at the closest month') + ' vs ' + dl + '%',
      { hard: dti > dl, kind: 'nolender', text: dti >= 999 ? 'Not possible: no qualifying income is set' : (dti > dl ? 'Not possible: ' : '') + 'debt-to-income reaches ' + dti.toFixed(0) + '% with this loan (limit ' + dl + '%)', short: dti >= 999 ? 'Not possible - no income set' : (dti > dl ? 'Not possible - ' : 'Tight - ') + 'debt-to-income ' + dti.toFixed(0) + '%' }));
    /* 3) reserves after closing, 4) income fit */
    if (fin) {
      const tot = fin.series.total[mi2], rsv = fin.series.reserve[mi2], runw = fin.series.runway[mi2];
      add(mkC('reserve', 'Reserves after closing', tot < 0 ? 'fail' : tot < rsv - 0.5 ? 'caution' : 'ok', fm(tot / dfm), 'keep ' + fm(rsv / dfm), 'cash after closing ' + fm(tot / dfm) + ' vs the ' + ((S.p && S.p.emergencyMonths) || 0) + '-month reserve ' + fm(rsv / dfm) + ' (today\'s dollars)', { kind: 'nocashflow', text: tot < 0 ? 'Cash runs out around closing' : 'Cash after closing is below the ' + ((S.p && S.p.emergencyMonths) || 0) + '-month reserve', short: 'Tight - cash below your reserve' }));
      add(mkC('runway', 'If the paycheck stops', runw < FEAS.runFail ? 'fail' : runw < FEAS.runCaution ? 'caution' : 'ok', isFinite(runw) ? runw.toFixed(1) + ' mo' : 'covered', 'at least ' + FEAS.runCaution + ' mo', isFinite(runw) ? 'cash ' + fm(tot / dfm) + ' / monthly burn without the job = ' + runw.toFixed(1) + ' months of runway' : 'portfolio income covers your bills without the job', { kind: 'nocashflow', text: 'If your paycheck stopped, cash would last only ' + (isFinite(runw) ? runw.toFixed(1) : '0') + ' months', short: 'Tight - thin runway' }));
    }
    add(mkC('carry', 'Monthly: carry the payment', hasLoan && avail < pay - 0.5 ? 'fail' : 'ok', fm(avail) + '/mo', 'needs ' + fm(pay) + '/mo', 'payment ' + fm(pay) + '/mo; available ' + fm(avail) + '/mo = asset income ' + fm(noi) + ' + pool cash flow ' + fm(poolCf) + (personal > 0 ? ' + your monthly surplus ' + fm(personal) : ''),
      { hard: hasLoan && avail < pay - 0.5, kind: 'nocashflow', text: 'Not possible: the loan payment is ' + fm(pay) + '/mo but only ' + fm(avail) + '/mo is available to carry it', short: 'Not possible - short ' + fm(pay - avail) + '/mo' }));
    /* 5) deal quality */
    const lose = v.cf < -0.5, absorbed = -v.cf <= absorb + 0.5;
    if (type === 'house' && lose) add(mkC('cashflow', 'Cash flow after the loan', 'fail', sgn(v.cf) + '/mo', 'not below $0', 'income ' + fm(noi) + ' - payment ' + fm(pay) + ' = ' + sgn(v.cf) + '/mo', { hard: true, kind: 'nocashflow', text: 'Not possible: a home must never lose money, and this one is ' + sgn(v.cf) + '/mo after the loan', short: 'Not possible - loses ' + fm(-v.cf) + '/mo' }));
    else add(mkC('cashflow', 'Cash flow after the loan', lose && !absorbed ? 'caution' : 'ok', sgn(v.cf) + '/mo', type === 'house' ? 'not below $0' : 'covered by the pool', 'income ' + fm(noi) + ' - payment ' + fm(pay) + ' = ' + sgn(v.cf) + '/mo' + (lose ? '; the pool (' + fm(absorb) + '/mo) ' + (absorbed ? 'covers it' : 'cannot cover it') : ''), { kind: 'nocashflow', text: 'The asset loses ' + fm(-v.cf) + '/mo after its loan and the pool cannot cover it', short: 'Tight - loses ' + fm(-v.cf) + '/mo' }));
    const capR = v.capRate;
    add(mkC('cap', 'Cap rate vs price', price > 0 && !(capR >= FEAS.capMin) ? 'caution' : 'ok', isFinite(capR) ? capR.toFixed(1) + '%' : '-', 'at least ' + FEAS.capMin + '%', 'income ' + fm(noi * 12) + '/yr / price ' + fm(price) + ' = ' + (isFinite(capR) ? capR.toFixed(1) : '0') + '% yield', { kind: 'nocashflow', text: 'The price is rich: it earns only ' + (isFinite(capR) ? capR.toFixed(1) : '0') + '% a year on its price', short: 'Tight - low yield' }));
    const mat = matOf(h), rf = v.refi;
    add(mat > 0 && hasLoan ? mkC('balloon', 'Balloon / refinance', rf && noi < rf.payment ? 'caution' : 'ok', rf ? fm(rf.payment) + '/mo refi' : 'paid off', 'income covers it', 'due in ' + mat + ' months' + (rf ? '; the ' + fm(rf.balance) + ' left is refinanced at ' + rf.rate + '%: payment ' + fm(rf.payment) + '/mo vs income ' + fm(noi) + '/mo' : '; nothing is left to refinance'), { kind: 'nocashflow', text: 'After the loan comes due, the refinance payment is more than the income', short: 'Tight - refinance risk' }) : mkC('balloon', 'Balloon / refinance', 'ok', 'none', '', 'No balloon: the loan pays off on schedule.'));
    /* 6) stress tests */
    const lossV = type === 'business' ? 0 : (FEAS.vacPts / 100) * (h.rent + reimbOf(h)) * (1 - mgmtOf(S, h) / 100), cfV = v.cf - lossV, okV = cfV >= -0.5 || -cfV <= absorb + 0.5;
    add(mkC('stress-vac', 'Stress: vacancy +' + FEAS.vacPts + ' pts', okV ? 'ok' : 'caution', type === 'business' ? 'n/a' : sgn(cfV) + '/mo', 'not below what the pool covers', type === 'business' ? 'Owner profit already is the net; no vacancy test.' : 'cash flow ' + sgn(v.cf) + ' - ' + FEAS.vacPts + ' pts of income ' + fm(lossV) + ' = ' + sgn(cfV) + '/mo', { kind: 'nocashflow', text: 'With ' + FEAS.vacPts + ' more points of vacancy it loses ' + fm(-cfV) + '/mo', short: 'Tight - weak if vacancy rises' }));
    const payR = hasLoan ? (h.io ? (L * (h.rate + FEAS.ratePts)) / 1200 : amort(L, (h.rate + FEAS.ratePts) / 1200, h.term)) + mipMonthly(h) : 0, cfR = noi - payR, okR = cfR >= -0.5 || -cfR <= absorb + 0.5;
    add(mkC('stress-rate', 'Stress: rate +' + FEAS.ratePts + ' pts', okR ? 'ok' : 'caution', hasLoan ? sgn(cfR) + '/mo' : 'no loan', 'not below what the pool covers', hasLoan ? 'income ' + fm(noi) + ' - payment at ' + (h.rate + FEAS.ratePts) + '% ' + fm(payR) + ' = ' + sgn(cfR) + '/mo' : 'No loan, so a higher rate changes nothing.', { kind: 'nocashflow', text: 'If the rate were ' + FEAS.ratePts + ' points higher it would lose ' + fm(-cfR) + '/mo', short: 'Tight - weak if rates rise' }));
    /* 7) concentration */
    const totP = S.houses.reduce((a, q) => a + (+q.price || 0), 0), share = totP > 0 ? (price / totP) * 100 : 0, nA = S.houses.length;
    add(mkC('concentration', 'Concentration', nA >= FEAS.concMin && share > FEAS.concFail ? 'fail' : nA >= FEAS.concMin && share > FEAS.concCaution ? 'caution' : 'ok', share.toFixed(0) + '% of value', 'under ' + FEAS.concCaution + '%', 'price ' + fm(price) + ' / all assets ' + fm(totP) + ' = ' + share.toFixed(0) + '%' + (nA < FEAS.concMin ? ' (not tested with fewer than ' + FEAS.concMin + ' assets)' : ''), { kind: 'nocashflow', text: 'One asset is ' + share.toFixed(0) + '% of the portfolio by value', short: 'Tight - ' + share.toFixed(0) + '% of the portfolio' }));
    const hard = cs.filter((c) => c.hard && c.status === 'fail'), bad = sortC(cs).filter((c) => c.status !== 'ok'), top = bad[0] || null;
    const verdict = hard.length ? 'no' : bad.length ? 'tight' : 'yes', kind = hard.length ? sortC(hard)[0].kind : '';
    const reasons = bad.map((c) => ({ id: c.id, sev: c.status === 'fail' ? 'bad' : 'warn', text: c.text, short: c.short }));
    return { id: h.id, addr: h.addr, verdict, kind, criteria: cs, reasons, top: top, short: top ? top.short : '', month: m0,
      cash: { need, down, closing, rehab, have, savings: sav, trustCash: tcash, room, pooled, short: cashShort, uncovered, month: ok ? m0 : bm, closest: !ok, price },
      monthly: { payment: pay, poolCf, asset: noi, personal, available: avail, short: avail - pay, covered: avail >= pay - 0.5 } };
  }
  function feasible(S, pl, fin, inner) {
    if (!inner) { if (pl && pl.raw) pl = pl.raw; pl = pl || plan(S); fin = fin || finance(S, pl); if (fin && fin.feas) return fin.feas; }
    const planned = S.houses.filter((h) => h.status !== 'owned'), assets = {}, g = S.g, T = pl.T, pe = Math.min(T, pl.planM), cs = [];
    planned.forEach((h) => { assets[h.id] = feasAsset(S, pl, fin, h); });
    const add = (c) => { cs.push(c); return c; }, nPl = planned.length, nUn = pl.unfunded.length, late = pl.lastBuy > pl.planM;
    add(nUn ? mkC('p-funding', 'Every planned asset can be funded', 'fail', nUn + ' of ' + nPl + ' cannot', 'all funded', nUn + ' planned asset' + (nUn === 1 ? '' : 's') + ' never reach the cash they need within the plan', { hard: true, kind: 'nofund', text: nUn + ' of ' + nPl + ' planned asset' + (nUn === 1 ? '' : 's') + ' cannot be funded in the plan', short: nUn + ' cannot be funded' }) : mkC('p-funding', 'Every planned asset can be funded', late ? 'fail' : pl.lastBuy > FEAS.pace * pl.planM ? 'caution' : 'ok', nPl ? 'last ' + inM(pl.lastBuy) : 'none planned', 'by ' + mAt(pl.planM), 'the last purchase is ' + inM(pl.lastBuy) + '; the plan runs ' + pl.planM + ' months', { hard: late, kind: 'nofund', text: late ? 'The last purchase comes ' + inM(pl.lastBuy) + ', after the plan ends' : 'The last purchase comes late in the plan, ' + inM(pl.lastBuy), short: late ? 'Not possible - last purchase after the plan' : 'Late purchases' }));
    add(mkC('p-dti', 'Debt-to-income peak', pl.worst.dti > g.dti ? 'fail' : pl.worst.dti > FEAS.dtiCaution * g.dti ? 'caution' : 'ok', pl.worst.dti.toFixed(0) + '%', 'max ' + g.dti + '%', 'highest debt payments / qualifying income = ' + pl.worst.dti.toFixed(0) + '% ' + inM(pl.worst.month), { hard: false, kind: 'nolender', text: 'Lenders may decline: debt payments reach ' + pl.worst.dti.toFixed(0) + '% of income ' + inM(pl.worst.month) + ' (limit ' + g.dti + '%)', short: 'Lenders may decline' }));
    const cl = pl.at(Math.min(T, pl.lastBuy)).cltv;
    add(mkC('p-cltv', 'Debt vs value', cl > g.cap + 0.5 ? 'fail' : 'ok', cl.toFixed(0) + '%', 'max ' + g.cap + '%', 'all debt / all value when the last asset is bought = ' + cl.toFixed(0) + '% vs the ' + g.cap + '% cap', { hard: cl > g.cap + 0.5, kind: 'nolender', text: 'Total debt is ' + cl.toFixed(0) + '% of value, over the ' + g.cap + '% cap', short: 'Debt over the cap' }));
    if (fin) { const k = fin.kpis;
      add(mkC('p-cash', 'Cash never runs out', k.minLiquid < 0 ? 'fail' : k.reserveGap > 0.5 ? 'caution' : 'ok', k.minLiquid < 0 ? 'short ' + fm(-k.minLiquid) : 'lowest ' + fm(Math.max(0, k.minLiquid)), 'above the reserve', k.minLiquid < 0 ? 'your cash is about ' + fm(-k.minLiquid) + ' short at its lowest point, ' + mAt(k.minLiquidMonth) : 'lowest cash ' + fm(k.minLiquid) + '; reserve gap ' + fm(k.reserveGap), { hard: k.minLiquid < 0, kind: 'nocashflow', text: k.minLiquid < 0 ? 'You run out of cash ' + inM(k.firstShortMonth) : 'Your cash dips below your emergency reserve', short: k.minLiquid < 0 ? 'Cash runs out' : 'Cash below reserve' }));
      add(mkC('p-runway', 'If the paycheck stops', k.minRunway < FEAS.runFail ? 'fail' : k.minRunway < FEAS.runCaution ? 'caution' : 'ok', isFinite(k.minRunway) ? k.minRunway.toFixed(1) + ' mo' : 'covered', 'at least ' + FEAS.runCaution + ' mo', 'lowest runway over the plan', { kind: 'nocashflow', text: 'Little cushion if your paycheck stops', short: 'Thin runway' }));
      add(mkC('p-hours', 'Hours in a week', k.peakHours > 70 ? 'caution' : 'ok', Math.round(k.peakHours) + ' h', 'under 70 h', 'job + businesses you run at the busiest month', { kind: 'nocashflow', text: 'The hours do not fit in a week around ' + mAt(k.peakHoursMonth), short: 'Too many hours' })); }
    const cats = ['house', 'commercial', 'business'], lasts = [];
    cats.forEach((tp) => { const rows = pl.snap.filter((x) => x.type === tp && S.houses.some((q) => q.id === x.id && q.status !== 'owned')); if (!rows.length) return; const cash = fin ? Math.max(0, fin.series.total[pe] || 0) : 0, st = stress(S, pl, rows, cash); lasts.push({ tp, months: st.burn >= -0.5 ? Infinity : st.months }); });
    const w = lasts.sort((a, b) => a.months - b.months)[0];
    if (w) add(mkC('p-earners', 'Stress: biggest earners lost', w.months < FEAS.lastsFail ? 'fail' : w.months < FEAS.lastsCaution ? 'caution' : 'ok', isFinite(w.months) ? w.months.toFixed(1) + ' mo' : 'covered', 'at least ' + FEAS.lastsCaution + ' mo', 'cash lasts this long if about 45% of the biggest ' + w.tp + ' earners stop paying', { kind: 'nocashflow', text: 'If your biggest earners stopped, cash would last ' + (isFinite(w.months) ? w.months.toFixed(1) : 0) + ' months', short: 'Weak if big earners stop' }));
    const totP = S.houses.reduce((a, q) => a + (+q.price || 0), 0), big = S.houses.slice().sort((a, b) => b.price - a.price)[0], sh = big && totP > 0 ? (big.price / totP) * 100 : 0;
    add(mkC('p-concentration', 'Concentration', S.houses.length >= FEAS.concMin && sh > FEAS.concFail ? 'fail' : S.houses.length >= FEAS.concMin && sh > FEAS.concCaution ? 'caution' : 'ok', sh.toFixed(0) + '% in one', 'under ' + FEAS.concCaution + '%', big ? 'biggest asset ' + fm(big.price) + ' / all assets ' + fm(totP) + ' = ' + sh.toFixed(0) + '%' : 'no assets', { kind: 'nocashflow', text: (big ? big.addr : 'One asset') + ' is ' + sh.toFixed(0) + '% of the portfolio by value', short: 'Concentrated' }));
    const aList = planned.map((h) => assets[h.id]), rank = { yes: 0, tight: 1, no: 2 };
    const pHard = cs.filter((c) => c.hard && c.status === 'fail'), pBad = sortC(cs).filter((c) => c.status !== 'ok');
    let verdict = pHard.length ? 'no' : pBad.length ? 'tight' : 'yes'; aList.forEach((a) => { if (rank[a.verdict] > rank[verdict]) verdict = a.verdict; });
    /* reasons: the most important first. A planned asset that cannot be funded or financed leads, in buy order, then the portfolio checks, then the assets that are only tight */
    const reasons = [], seen = {}, push = (r) => { const k = r.text; if (!seen[k]) { seen[k] = 1; reasons.push(r); } };
    aList.filter((a) => a.verdict === 'no').sort((a, b) => KRANK[a.kind] - KRANK[b.kind]).forEach((a) => { const c = sortC(a.criteria).find((x) => x.hard && x.status === 'fail'); push({ sev: 'bad', id: c.id, asset: a.id, text: (a.addr ? a.addr + ' - ' : '') + c.text, short: c.short, kind: a.kind }); });
    pBad.filter((c) => c.status === 'fail').forEach((c) => push({ sev: 'bad', id: c.id, text: c.text, short: c.short, kind: c.kind }));
    aList.filter((a) => a.verdict === 'tight').forEach((a) => { const c = a.top; if (c) push({ sev: 'warn', id: c.id, asset: a.id, text: (a.addr ? a.addr + ' - ' : '') + c.text, short: c.short, kind: c.kind }); });
    pBad.filter((c) => c.status === 'caution').forEach((c) => push({ sev: 'warn', id: c.id, text: c.text, short: c.short, kind: c.kind }));
    const first = reasons[0] || null, nNo = aList.filter((a) => a.verdict === 'no').length;
    const headline = verdict === 'yes' ? 'Yes. You can carry this plan.' : verdict === 'no' ? 'Not yet. ' + (first ? first.text + (nNo > 1 ? ' (' + nNo + ' planned assets are not possible)' : '') + '.' : 'The plan does not work yet.') : 'Tight. ' + (first ? (first.short || first.text).replace(/^Tight - /, '').replace(/^./, (c) => c.toUpperCase()) + '.' : 'It works, but with thin margins.');
    return { verdict, headline, reasons, criteria: sortC(cs), assets, planned: planned.map((h) => h.id), unfunded: pl.unfunded.slice(), nNo, top: first };
  }

  /* ---------- TODAY'S TERMS for the main page: the assets' own numbers at month 0 (2026*: today's dollars, no inflation, nothing grown). One function feeds the Planned and Real pages; ids = the assets to add up. ---------- */
  function todayTotals(S, pl, ids) {
    if (pl && pl.raw) pl = pl.raw; pl = pl || plan(S);
    const o = { n: 0, cf: 0, payment: 0, noi: 0, ds: 0, price: 0, rent: 0, dscr: null };
    (ids || S.houses.map((h) => h.id)).forEach((id) => { const v = pl.V[id], h = H(S, id); if (!v || !h) return; o.n++; o.cf += v.cf; o.payment += v.payment; o.noi += v.noi; o.ds += v.P + v.mip; o.price += +h.price || 0; o.rent += +h.rent || 0; });
    o.dscr = o.ds > 0.5 ? o.noi / o.ds : null; /* DSCR = income before the loan / loan payment (principal + interest + mortgage insurance), the same ratio the asset page shows */
    return o;
  }

  /* ---------- THE CHECKS CARD: every check the app runs, in one list. The card on the main page is generated from this list, so it cannot drift: the portfolio tests of E.feasible, plus the two roll-ups (assets you can buy, cash beyond savings).
     Each item: { id (the row's test id), key, label, status: 'ok' | 'caution' | 'fail', value, limit, how, info (glossary key) }. fin = the finance result the page already has (or null without a personal profile). ---------- */
  const CHK_ORDER = ['p-funding', 'p-cash', 'p-runway', 'p-hours', 'p-dti', 'p-cltv', 'p-earners', 'p-concentration'];
  const CHK_ID = { 'p-funding': 'check-pace', 'p-cash': 'check-cushion', 'p-runway': 'check-runway', 'p-hours': 'check-hours', 'p-dti': 'check-dti', 'p-cltv': 'check-cltv', 'p-earners': 'check-lasts', 'p-concentration': 'check-concentration' };
  const CHK_INFO = { 'p-funding': 'planpace', 'p-cash': 'cushion', 'p-runway': 'runway', 'p-hours': 'hours', 'p-dti': 'dti', 'p-cltv': 'cltv', 'p-earners': 'lasts', 'p-concentration': 'concentration' };
  const CHK_LABEL = { 'p-funding': 'Plan timing', 'p-cash': 'Cash cushion', 'p-runway': 'If the paycheck stops', 'p-hours': 'Hours in a week', 'p-dti': 'Debt-to-income peak', 'p-cltv': 'Debt vs value', 'p-earners': 'If big earners stop', 'p-concentration': 'Concentration' }; /* short labels: a row label never wraps at 320px */
  function checkList(S, pl, fin) {
    const real = !!(pl && pl.raw), plIn = pl; /* plIn = the plan as the page shows it (today's dollars or future): money totals come from it */
    if (pl && pl.raw) pl = pl.raw; pl = pl || plan(S); if (fin === undefined) fin = S.p ? finance(S, pl) : null;
    const fe = feasible(S, pl, fin), out = [], planned = fe.planned.map((id) => fe.assets[id]), nPl = planned.length, noStart = nPl > 0 && pl.unfunded.length === nPl, anyOwned = S.houses.some((h) => h.status === 'owned'), kp = fin ? fin.kpis : null, g = S.g;
    CHK_ORDER.forEach((k) => { const c = fe.criteria.find((x) => x.id === k); if (!c) return;
      if (k === 'p-dti' && noStart && !anyOwned) return; /* nothing can be funded: there is no debt peak to measure */
      let value = c.measured, how = c.how, limit = c.limit;
      if (k === 'p-funding' && !noStart && c.status !== 'fail' && isFinite(pl.lastBuy) && !pl.unfunded.length) value = 'last ' + pl.lastBuy + ' mo'; /* short value (the date is in the line under it): the value never overflows a row at 320px */
      if (k === 'p-funding' && noStart) { value = 'cannot start'; how = 'None of the ' + nPl + ' planned asset' + (nPl === 1 ? '' : 's') + ' can be funded under the current numbers, so the plan cannot start. The first purchase needs your savings above the cushion plus your job money, and they do not reach it.'; }
      if (k === 'p-cash' && kp) { const cash0 = +S.p.cash || 0, low = Math.min(kp.minLiquid, cash0), lowM = kp.minLiquid > cash0 ? 0 : kp.minLiquidMonth, rsvLow = fin.series.reserve[Math.min(fin.T, kp.minLiquidMonth)] || kp.reserveTarget0, short = Math.max(0, -kp.minLiquid); /* the lowest cash is never above the cash you have today */
        value = kp.minLiquid < 0 ? 'short ' + fm(short) : 'lowest ' + fm(low);
        how = kp.minLiquid < 0 ? 'Your cash runs out ' + inM(kp.firstShortMonth) + ' and would be about ' + fm(short) + ' short at the lowest point, ' + mAt(kp.minLiquidMonth) + '.' : 'Lowest cash is ' + fm(low) + (lowM <= 0 ? ' today' + (root.RepDate && root.RepDate.dt ? ' (' + root.RepDate.dt(0) + ')' : '') : ', ' + mAt(lowM)) + '; your cushion at that point is ' + fm(rsvLow) + (real ? ' (both in today\'s dollars)' : ' (the cushion grows with inflation)') + '.'; limit = 'above your ' + (S.p.emergencyMonths || 0) + '-month cushion'; }
      if (k === 'p-dti') how = c.status === 'fail' ? 'Peaks at ' + pl.worst.dti.toFixed(0) + '% of qualifying income ' + inM(pl.worst.month) + ', over the ' + g.dti + '% limit: a lender may decline a loan then.' : 'Highest debt payments are ' + pl.worst.dti.toFixed(0) + '% of qualifying income, ' + inM(pl.worst.month) + '; lenders should approve every loan (limit ' + g.dti + '%).';
      out.push({ id: CHK_ID[k], key: k, label: CHK_LABEL[k], status: c.status, value, limit, how, info: CHK_INFO[k] }); });
    const notYes = planned.filter((x) => x.verdict !== 'yes'), top = notYes.slice().sort((a, b) => (b.verdict === 'no') - (a.verdict === 'no'))[0];
    out.push({ id: 'check-buy', key: 'buy', label: 'Assets you can buy', status: notYes.some((x) => x.verdict === 'no') ? 'fail' : notYes.length ? 'caution' : 'ok', value: nPl ? nPl - notYes.length + ' of ' + nPl : 'none planned', limit: nPl ? 'all ' + nPl : 'none planned', how: top ? top.addr + ': ' + (top.top ? top.top.text : '') + (notYes.length > 1 ? ' (+' + (notYes.length - 1) + ' more)' : '') : 'every planned asset passes its own tests', info: 'buyscore' });
    const cash0 = S.p ? +S.p.cash || 0 : 0, hasCap = !!(S.p && S.p.capital.some((c) => c.amount > 0)), outT = plIn.outsideTotal;
    if (outT > 0) out.push({ id: 'outside-cash', key: 'outside', label: hasCap ? 'Cash beyond the trust' : 'Paid from your own pocket', status: kp && kp.shortAmount > 0.5 ? 'fail' : kp && (outT > cash0 || kp.reserveGap > 0.5) ? 'caution' : 'ok', value: fm(outT), limit: S.p ? 'your savings ' + fm(cash0) : 'none set', how: hasCap ? 'Needs this much cash beyond what the trust funds (partners, investors, savings).' : 'Your own cash for the down payments the trust cannot fund (the first purchase and anything beyond it)' + (S.p ? (outT <= cash0 ? '. Your ' + fm(cash0) + ' of savings covers it.' : '. That is more than your ' + fm(cash0) + ' of savings.') : '.'), info: 'outsidecash' });
    return out;
  }

  /* The shortfall panel for one planned asset: the cash lines, the monthly lines and what would have to change, every number from the live plan. opts.sim = also try the plan with the asset moved to the end of the buy order (one extra plan run). */
  function shortfall(S, pl, fin, id, opts) {
    if (pl && pl.raw) pl = pl.raw; pl = pl || plan(S); fin = fin || finance(S, pl);
    const h = H(S, id); if (!h || h.status === 'owned') return null;
    const F = fin && fin.feas ? fin.feas : feasible(S, pl, fin), A = F.assets[id]; if (!A) return null;
    const c = A.cash, mo = A.monthly, v = pl.V[id], tr = pl.trust[id], g = S.g, type = h.type || 'house', ch = [];
    const cfNow = tr && tr.ok && tr.pooled ? Math.max(0, tr.cf || 0) / dfac(S, tr.month) : mo.poolCf + mo.personal, perMo = cfNow > 0.5 ? cfNow : 0;
    const fund = A.criteria.find((x) => x.id === 'funding'), dsc = A.criteria.find((x) => x.id === 'dscr'), car = A.criteria.find((x) => x.id === 'carry');
    const needAt = (price) => needFor(S, Object.assign({}, h, { price }));
    if (c.short > 0.5) {
      ch.push({ id: 'cash', text: 'Raise ' + fm(c.short) + ' more cash' + (perMo > 0 ? ' (about ' + Math.ceil(c.short / perMo) + ' months at ' + fm(perMo) + '/mo of cash flow)' : ' (the portfolio has no spare monthly cash flow to build it)'), amount: c.short, months: perMo > 0 ? Math.ceil(c.short / perMo) : null });
      const n1 = needAt(1e6), n0 = needAt(0), slope = (n1 - n0) / 1e6;
      if (slope > 0 && c.have > n0) { const P = Math.floor((c.have - n0) / slope); if (P > 0 && P < h.price) ch.push({ id: 'price', text: 'Lower the price to ' + fm(P) + ' or less (now ' + fm(h.price) + ')', price: P }); }
      const fits = loansFor(type, h).filter((l) => l.id !== h.loanId && !l.ownerOcc && !l.finRehab && !l.info && (type !== 'house' || !h.kind || h.kind !== 'multi' || mfFit(l, unitsOf(h), !!h.pack).ok)).filter((l) => !FEAS.loanMax[l.id] || (h.price * (100 - l.dp)) / 100 <= FEAS.loanMax[l.id]).map((l) => ({ id: l.id, name: l.name, need: (h.price * (l.dp + l.closing)) / 100 + (h.finCapex ? 0 : Math.max(0, h.capex || 0)), dp: l.dp })).sort((a, b) => a.need - b.need);
      const ok2 = fits.filter((l) => l.need <= c.have + 0.5);
      if (ok2.length) ch.push({ id: 'loan', text: 'Pick a loan that needs less down: ' + ok2.slice(0, 3).map((l) => l.name + ' (' + fm(l.need) + ' to close)').join('; '), loans: ok2.slice(0, 3) });
      else if (fits.length && fits[0].need < c.need - 0.5) ch.push({ id: 'loan', text: 'No loan in the app fits what you can pull out; the lowest is ' + fits[0].name + ', ' + fm(fits[0].need) + ' to close', loans: fits.slice(0, 1) });
    }
    if (!mo.covered) { const need2 = -mo.short; ch.push({ id: 'cashflow', text: 'Add ' + fm(need2) + '/mo of cash flow to carry the payment', amount: need2 }); }
    if (tr && tr.ok && (fund.status !== 'ok') && fund.status !== 'fail') ch.push({ id: 'wait', text: 'Wait: the plan funds it ' + inM(tr.month), month: tr.month });
    if (dsc && dsc.status === 'fail') { const min = dscrMinOf(h), want = min * mo.payment - v.noi, k = type === 'business' ? 1 : (1 - g.vac / 100) * (1 - mgmtOf(S, h) / 100); if (want > 0) ch.push({ id: 'rent', text: 'Raise ' + (type === 'business' ? 'profit' : 'rent') + ' by ' + fm(want / k) + '/mo so the loan reaches DSCR ' + min, amount: want / k }); }
    else if (!mo.covered) { const k = type === 'business' ? 1 : (1 - g.vac / 100) * (1 - mgmtOf(S, h) / 100); ch.push({ id: 'rent', text: 'Raise ' + (type === 'business' ? 'profit' : 'rent') + ' by ' + fm(-mo.short / k) + '/mo', amount: -mo.short / k }); }
    const after = S.houses.slice(S.houses.indexOf(h) + 1).filter((q) => q.status !== 'owned' && pl.trust[q.id] && pl.trust[q.id].ok && pl.V[q.id].cf > 0), z = after.reduce((a, q) => a + pl.V[q.id].cf, 0);
    if (c.short > 0.5 && after.length && z > 0.5) {
      const o = { id: 'earlier', text: 'Buy the ' + after.length + ' assets after it first (they add ' + fm(z) + '/mo of cash flow) by moving it down the buy order', amount: z, n: after.length };
      if (opts && opts.sim) { const S2 = JSON.parse(JSON.stringify(S)), ids = S2.houses.filter((q) => q.status !== 'owned').map((q) => q.id).filter((q) => q !== id).concat([id]); reorder(S2, ids); const p2 = plan(S2), m2 = p2.purchase[id]; o.simMonth = isFinite(m2) ? m2 : null; o.text += isFinite(m2) ? ': then it is bought ' + inM(m2) : ': it still cannot be funded in the plan'; }
      ch.push(o);
    }
    return { id, verdict: A.verdict, cash: c, monthly: mo, changes: ch, lines: {
      cashNeeded: { label: 'Cash needed to close', value: c.need, how: 'down ' + fm(c.down) + ' + closing ' + fm(c.closing) + (c.rehab > 0 ? ' + cash rehab ' + fm(c.rehab) : '') + ' = ' + fm(c.need) },
      savings: { label: 'Your savings above the cushion', value: c.savings, how: c.pooled ? 'savings fund only the first purchase; later ones come from the trust' : 'cash on hand above the ' + ((S.p && S.p.emergencyMonths) || 0) + '-month reserve, plus job money saved by then' },
      trustCash: { label: 'Cash the trust holds', value: c.trustCash, how: 'cash held by the assets above it' + (c.closest ? ' at the closest month, ' + mAt(c.month) : c.pooled ? ' ' + inM(c.month) : '') },
      room: { label: 'Borrowing room', value: c.room, how: g.cap + '% of the assets\' value (a business ' + g.capBiz + '%) less their loans and what is already drawn' },
      pull: { label: 'Cash you can pull out then', value: c.have, how: fm(c.savings) + ' + ' + fm(c.trustCash) + ' + ' + fm(c.room) + ' = ' + fm(c.have) },
      downShort: { label: 'Down payment short', value: -c.short, how: fm(c.have) + ' can pull out - ' + fm(c.need) + ' needed = ' + sgn(c.have - c.need) },
      uncovered: { label: 'Money still uncovered', value: -c.uncovered, how: fm(c.have) + ' can pull out - price ' + fm(c.price) + ' = ' + sgn(c.have - c.price) },
      payment: { label: 'New loan payment', value: mo.payment, how: 'principal + interest' + (mipMonthly(h) > 0 ? ' + mortgage insurance' : '') + ' on ' + fm(loan(h)) + ' at ' + h.rate + '%' },
      available: { label: 'Cash flow available to carry it', value: mo.available, how: 'asset income ' + fm(mo.asset) + ' + pool ' + fm(mo.poolCf) + (mo.personal > 0 ? ' + your surplus ' + fm(mo.personal) : '') + ' per month, today\'s dollars' },
      monthShort: { label: mo.covered ? 'Monthly cash flow covered' : 'Monthly cash flow short', value: mo.short, how: fm(mo.available) + ' available - ' + fm(mo.payment) + ' payment = ' + sgn(mo.short) + '/mo' } } };
  }

  function normalize(S) {
    S.g = Object.assign({}, GDEF, S.g || {}); S.g.autoPay = S.g.autoPay !== false;
    ['cap', 'capBiz', 'vac', 'refiRate', 'refiTerm'].forEach((k) => { if (!isFinite(+S.g[k])) S.g[k] = GDEF[k]; });
    if (S.p) S.p = normalizePersonal(S.p);
    if (Array.isArray(S.added)) S.added = S.added.filter((k, i, a) => typeof k === 'string' && a.indexOf(k) === i); else delete S.added; /* keys of ADDITIONS already applied to this portfolio */
    S.houses = (S.houses || []).filter((h) => h && h.id).map((h) => { const type = TYPES[h.type] ? h.type : 'house'; const b = Object.assign(newAsset(type, undefined, { id: h.id }), h, { type }); if (type === 'business') { if (!('revenue' in h)) b.revenue = null; if (!('margin' in h)) b.margin = null; } return b; }); /* an old business without revenue / margin keeps them empty (its revenue is shown as owner profit / margin; nothing is rewritten) */
    S.houses.forEach((h) => {
      ['price', 'dp', 'rate', 'term', 'extra', 'rent', 'tax', 'ins', 'hoa', 'liens', 'paid', 'buyIn', 'wait', 'capex', 'capexMonths', 'arv', 'liftIncome', 'exitMonth', 'exitLift', 'sellCost', 'mat', 'nnn'].forEach((k) => { if (!isFinite(+h[k])) h[k] = newAsset(h.type, undefined)[k]; else h[k] = +h[k]; });
      ['revenue', 'margin'].forEach((k) => { h[k] = h[k] === null || h[k] === '' || h[k] === undefined || !isFinite(+h[k]) ? null : Math.max(0, +h[k]); }); if (h.margin !== null) h.margin = Math.min(100, h.margin); if (h.type !== 'business') { h.revenue = null; h.margin = null; }
      if (+h.liftValue > 0 && !(+h.arv > 0)) { /* old data stored a % lift: convert it to a dollar appraisal at completion */
        const gv = h.growth == null || !isFinite(+h.growth) ? S.g.appr : +h.growth; h.arv = Math.round(h.price * Math.pow(1 + gv / 100, (h.capexMonths || 0) / 12) * (1 + h.liftValue / 100)); }
      delete h.liftValue; if (!(h.arv > 0)) h.arv = 0;
      h.arvAuto = !!h.arvAuto && +h.arv > 0;
      h.gain = h.gain !== null && h.gain !== '' && h.gain !== undefined && isFinite(+h.gain) ? +h.gain : null; /* if set, the appraisal follows price + rehab + gain */
      h.kind = h.type === 'house' && h.kind === 'multi' ? 'multi' : 'single'; h.units = h.kind === 'multi' ? Math.min(500, Math.max(2, Math.round(+h.units || 2))) : 1; h.pack = h.kind === 'multi' && !!h.pack;
      h.mfRes = isFinite(+h.mfRes) && h.mfRes !== null && h.mfRes !== '' ? Math.max(0, +h.mfRes) : 300; h.mfOther = isFinite(+h.mfOther) && h.mfOther !== null && h.mfOther !== '' ? Math.max(0, +h.mfOther) : 0;
      ['mgmtPct', 'maintPct'].forEach((k) => { h[k] = h[k] === null || h[k] === '' || h[k] === undefined || !isFinite(+h[k]) ? null : Math.max(0, +h[k]); });
      h.boughtOn = h.status === 'owned' && typeof h.boughtOn === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(h.boughtOn) && isFinite(Date.parse(h.boughtOn)) ? h.boughtOn : null; /* the day the user marked it bought (YYYY-MM-DD); old owned assets have none: the page says 'date not recorded' */
      if (h.type === 'business') h.mgmtPct = null;
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
  const seedStretch = () => { const A = newAsset; return netCosts(normalize({ added: ak(), g: Object.assign({}, GDEF, { otherDebt: 450 }), p: samplePersonal(), houses: [
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
  const seedBig = () => { const A = newAsset; const p = samplePersonal(); p.capital = [{ id: 'cap0', name: 'Family and friends', month: 11, amount: 100000 }, { id: 'cap1', name: 'Seed partners', month: 17, amount: 2850000 }, { id: 'cap2', name: 'Growth partners', month: 47, amount: 2910000 }, { id: 'cap3', name: 'Institutional partner', month: 79, amount: 6260000 }, { id: 'cap4', name: 'Follow-on partner', month: 119, amount: 1880000 }]; return netCosts(normalize({ added: ak(), g: Object.assign({}, GDEF, { otherDebt: 450 }), p, houses: [
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
  const seedStradella = () => { const A = newAsset; const p = samplePersonal(); p.capital = [{ id: 'cap0', name: 'Family and friends', month: 11, amount: 100000 }, { id: 'cap1', name: 'Seed partners', month: 17, amount: 4400000 }, { id: 'cap2', name: 'Growth partners', month: 47, amount: 4170000 }, { id: 'cap3', name: 'Institutional partner', month: 79, amount: 7490000 }, { id: 'cap4', name: 'Follow-on partner', month: 119, amount: 2820000 }]; return netCosts(normalize({ added: ak(), g: Object.assign({}, GDEF, { otherDebt: 450 }), p, houses: [
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
  /* Default portfolio: NOTHING IS OWNED YET (every asset is planned; the Real page starts empty). Smooth growth (each purchase about 23% larger than the one before). TARGETS ARE IN TODAY'S DOLLARS: $125M of net worth and $1.3M a month of cash flow AFTER TAX (the user's target) at the end of the 28 years, i.e. about $286M and $2.98M a month after tax in future dollars at 3% a year of cost increase. This plan reaches about $131.7M of net worth and $1.38M a month AFTER TAX ($1.95M before tax) in today's dollars with 36 assets (the 35 generated ones plus 704 Lost Creek Cir; the last purchase is bought in month 271). Prices here are TODAY'S prices (nothing is inflated). Built by grader/logic/gen-plan.js: SBAMAX=2.2e6 BIZMOD=4 CFMIN=60 RENO=25000,30000,15000,10000 TX=0.0017 INSF=35 HY=0.0108 CAP0=7.0 DSCRX=0.25 MULTS=2.9,3.4,3.9,4.7,5.1 BASE=35000 STEP=1.23 OUT=1 node gen-plan.js 35 (BIZMOD=4: one in four of the big purchases is a business, the rest are commercial buildings, which carry more cash flow per dollar of net worth). The first asset has no trust to borrow from, so it is paid from your savings above the cash cushion plus the job money saved since; every later asset is paid by the trust (the borrowing room and reinvested cash flow of everything bought before it) plus your job money. The first four homes get a renovation paid from that cash (not financed): the new appraisal adds 1.4x the rehab cost to the price and rent lifts 10%. Homes cash flow positive. Commercial and business loans carry a lender DSCR at least 0.25 above the minimum. Businesses are priced at 2.9x to 5.1x of yearly owner profit; the SBA 7(a) loans never pass $5M outstanding at once. The trust decides every purchase month (each row's buyIn is 0 = as soon as the money is there). Commercial rows carry realistic gross tax, insurance and CAM that tenants repay under NNN leases (85%), at cap rates of 7 to 8%. Growth is 4%/yr for everything. No partner or investor money. It needs about $2,000 a month of job money left over after living costs; with much less, the early purchases come later and the plan ends well short (see the Checks block). (The last business, Lighthouse Security, is hand-set to $655,500/mo of owner profit, 5.07x, instead of the generator's $651,800.) Existing devices keep their own saved portfolio: this default is only for a fresh install or a reset. */
  /* 704 Lost Creek Cir, Stone Mountain GA (prototype/listing-import/704-lost-creek-cir.house.json): built with fromListing, the same helper the importer uses, plus the user's own renovation ($17,000, after-repair value $245,000) */
  const lostCreek = () => { const L = fromListing({ schema: 'house-listing/1', address: '704 Lost Creek Cir, Stone Mountain, GA 30088', price: { value: 140000 }, rentMonthly: { value: 1887 }, taxAnnual: { value: 2070 }, insuranceAnnual: { value: 2400 }, hoaMonthly: { value: null } });
    return newAsset('house', 'conv30', Object.assign({ id: 'lostcreek' }, L.patch, { growth: 4, buyIn: 0, capex: 17000, capexMonths: 3, arv: 245000 })); };
  /* ADDITIONS: assets a release adds to EVERY device's own planned portfolio, once (never replacing it). S.added lists the keys already applied (or deliberately excluded, as in the seeds), so a removed asset never comes back.
     To add an asset: append { key, make } here and bump DATA_V in app.js. NEVER replace users' portfolios in a migration. */
  /* Premier Florida General Contractor (BizBuySell #2564259; prototype/listing-import/premier-florida-general-contractor.business.json). Asking price was supplied by the user (not visible in the listing screenshots). Revenue about $50M/yr and EBITDA about $4M/yr (8%) come from the listing: owner profit = revenue x margin. Bank term loan with 25% down. Real estate is leased from the seller's entity, not included. */
  const premierGC = () => newAsset('business', 'bankbiz', { id: 'premierflgc', addr: 'Premier Florida General Contractor', price: 27000000, revenue: 50000000 / 12, margin: 8, rent: Math.round(50000000 / 12 * 0.08), dp: 25, buyIn: 0 });
  const ADDITIONS = [{ key: 'lost-creek-704', make: lostCreek }, { key: 'premier-fl-gc-bizbuysell-2564259', make: premierGC }];
  const ak = () => ADDITIONS.map((a) => a.key);
  function applyAdditions(S) {
    if (!Array.isArray(S.added)) { S.added = ak(); return S; } /* a state without S.added (v19 or an old backup) already has whatever it wants: add nothing */
    ADDITIONS.forEach((a) => {
      if (S.added.indexOf(a.key) >= 0) return;
      const h = a.make(), norm = (s) => String(s || '').trim().toLowerCase();
      if (!S.houses.some((x) => x.id === h.id || norm(x.addr) === norm(h.addr))) { h.status = 'planned'; S.houses.push(h); register(S, h); relink(S); }
      S.added.push(a.key);
    });
    return S;
  }
  const seedPlan = () => { const A = newAsset; const p = samplePersonal(); p.capital = []; return orderByBuy(normalize({ added: ak(), g: Object.assign({}, GDEF, { otherDebt: 450, planYears: 28 }), p, houses: [
    A('house', 'conv30', {id: "maple", addr: "1412 Maple Ridge Dr", price: 35000, rent: 470, tax: 60, ins: 53, growth: 4, buyIn: 0, capex: 25000, capexMonths: 3, arv: 70000, liftIncome: 10}),
    A('house', 'conv30', {id: "cedar", addr: "2207 Cedar Hollow Ln", price: 45000, rent: 570, tax: 77, ins: 58, growth: 4, buyIn: 0, capex: 30000, capexMonths: 3, arv: 87000, liftIncome: 10}),
    A('house', 'dscr', {id: "birch", addr: "908 Birchwood Ct", price: 55000, rent: 660, tax: 94, ins: 63, growth: 4, buyIn: 0, capex: 30000, capexMonths: 4, arv: 109000, liftIncome: 8, exit: "sell", exitMonth: 57}),
    A('house', 'conv30', {id: "willow", addr: "3350 Willow Bend Rd", price: 65000, rent: 770, tax: 111, ins: 68, growth: 4, buyIn: 0, capex: 15000, capexMonths: 3, arv: 86000, liftIncome: 10}),
    A('house', 'conv30', {id: "linden", addr: "2914 Linden Way", price: 80000, rent: 920, tax: 136, ins: 75, growth: 4, buyIn: 0, capex: 10000, capexMonths: 3, arv: 94000, liftIncome: 10}),
    A('house', 'dscr', {id: "ridge", addr: "5521 Ridgeview Ct", price: 100000, rent: 1170, tax: 170, ins: 85, growth: 4, buyIn: 0}),
    A('house', 'conv30', {id: "sycamore", addr: "7702 Sycamore Dr", price: 120000, rent: 1330, tax: 204, ins: 95, growth: 4, buyIn: 0}),
    A('house', 'conv30', {id: "elm", addr: "418 Elm Street", price: 150000, rent: 1630, tax: 255, ins: 110, growth: 4, buyIn: 0}),
    A('house', 'dscr', {id: "maplex", addr: "1412 Maple Ridge Dr #2", price: 185000, rent: 2120, tax: 315, ins: 128, growth: 4, buyIn: 0}),
    A('house', 'conv30', {id: "cedarx", addr: "2207 Cedar Hollow Ln #2", price: 225000, rent: 2430, tax: 383, ins: 148, growth: 4, buyIn: 0}),
    A('house', 'conv30', {id: "birchx", addr: "908 Birchwood Ct #2", price: 275000, rent: 2970, tax: 468, ins: 173, growth: 4, buyIn: 0}),
    A('house', 'dscr', {id: "willowx", addr: "3350 Willow Bend Rd #2", price: 340000, rent: 3860, tax: 578, ins: 205, growth: 4, buyIn: 0}),
    A('commercial', 'comm25', {id: "northgater", addr: "Northgate Retail Strip", price: 420000, growth: 4, dp: 50, rent: 3420, tax: 263, ins: 105, hoa: 105, nnn: 85, buyIn: 0}),
    A('commercial', 'comm25', {id: "harborstse", addr: "Harbor St Self-Storage", price: 515000, growth: 4, dp: 45, rent: 4450, tax: 322, ins: 129, hoa: 129, nnn: 85, buyIn: 0}),
    A('commercial', 'comm25', {id: "lakeviewme", addr: "Lakeview Medical Office", price: 635000, growth: 4, dp: 40, rent: 5790, tax: 397, ins: 159, hoa: 159, nnn: 85, buyIn: 0}),
    A('commercial', 'comm25', {id: "westfieldo", addr: "Westfield Office Park", price: 780000, growth: 4, dp: 50, rent: 6360, tax: 488, ins: 195, hoa: 195, nnn: 85, buyIn: 0}),
    A('commercial', 'comm25', {id: "eastgatesh", addr: "Eastgate Shopping Plaza", price: 960000, growth: 4, dp: 45, rent: 8290, tax: 600, ins: 240, hoa: 240, nnn: 85, buyIn: 0}),
    A('business', 'sba7a', {id: "cornerston", addr: "Cornerstone Plumbing Co", price: 1180000, rent: 33910, growth: 4, buyIn: 0, dp: 10}),
    A('business', 'sba7a', {id: "summitfrei", addr: "Summit Freight & Logistics", price: 1455000, rent: 41810, growth: 4, buyIn: 0, dp: 10}),
    A('business', 'sba7a', {id: "keystonehv", addr: "Keystone HVAC Services", price: 1790000, rent: 51440, growth: 4, buyIn: 0, dp: 10}),
    A('commercial', 'comm25', {id: "redwoodlog", addr: "Redwood Logistics Center", price: 2200000, growth: 4, dp: 40, rent: 20070, tax: 1375, ins: 550, hoa: 550, nnn: 85, buyIn: 0}),
    A('business', 'bankbiz', {id: "apexproper", addr: "Apex Property Services", price: 2705000, rent: 66300, growth: 4, buyIn: 0, dp: 25}),
    A('business', 'bankbiz', {id: "meridianst", addr: "Meridian Staffing Group", price: 3325000, rent: 81500, growth: 4, buyIn: 0, dp: 25}),
    A('business', 'bankbiz', {id: "ironwoodma", addr: "Ironwood Manufacturing", price: 4090000, rent: 87390, growth: 4, buyIn: 0, dp: 25}),
    A('commercial', 'comm25', {id: "bayviewmed", addr: "Bayview Medical Plaza", price: 5035000, growth: 4, dp: 50, rent: 41040, tax: 3147, ins: 1259, hoa: 1259, nnn: 85, buyIn: 0}),
    A('business', 'bankbiz', {id: "graniteind", addr: "Granite Industrial Supply", price: 6190000, rent: 109750, growth: 4, buyIn: 0, dp: 30}),
    A('business', 'bankbiz', {id: "bayviewden", addr: "Bayview Dental Group", price: 7615000, rent: 135020, growth: 4, buyIn: 0, dp: 30}),
    A('business', 'bankbiz', {id: "pioneerhea", addr: "Pioneer Healthcare Staffing", price: 9365000, rent: 166050, growth: 4, buyIn: 0, dp: 30}),
    A('commercial', 'comm25', {id: "summitbusi", addr: "Summit Business Park", price: 11520000, growth: 4, dp: 45, rent: 99500, tax: 7200, ins: 2880, hoa: 2880, nnn: 85, buyIn: 0}),
    A('business', 'bankbiz', {id: "atlasdistr", addr: "Atlas Distribution Group", price: 14170000, rent: 231540, growth: 4, buyIn: 0, dp: 35}),
    A('business', 'bankbiz', {id: "beaconengi", addr: "Beacon Engineering Services", price: 17425000, rent: 284720, growth: 4, buyIn: 0, dp: 35}),
    A('business', 'bankbiz', {id: "northstarp", addr: "Northstar Packaging", price: 21435000, rent: 350250, growth: 4, buyIn: 0, dp: 35}),
    A('commercial', 'comm25', {id: "crossroads", addr: "Crossroads Retail Center", price: 26365000, growth: 4, dp: 40, rent: 240560, tax: 16478, ins: 6591, hoa: 6591, nnn: 85, buyIn: 0}),
    A('business', 'bankbiz', {id: "harvestfoo", addr: "Harvest Foods Wholesale", price: 32430000, rent: 529900, growth: 4, buyIn: 0, dp: 35}),
    A('business', 'bankbiz', {id: "lighthouse", addr: "Lighthouse Security Services", price: 39890000, rent: 655500, growth: 4, buyIn: 0, dp: 35}),
    lostCreek() ] })); };
  /* LEGACY small sample (the Load realistic sample button; the app's default is seedPlan above; listed in the order the assets are bought). Every loan, price, cap rate, multiple and growth rate is checked against
     the grader's benchmark file (prototype/grader). Homes cash flow positive. Recycles sale cash; needs about $1.3M of outside cash. */
  const seed = () => { const A = newAsset; return netCosts(normalize({ added: ak(), g: Object.assign({}, GDEF, { otherDebt: 450 }), p: Object.assign(samplePersonal(), { cash: 100000 }), houses: [
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
  /* Sort key of purchase order: an owned asset was bought 'paid' months ago, so the oldest comes first; a planned one goes by its purchase month (unfunded last). */
  const buyKey = (h, pl) => (h.status === 'owned' ? -(+h.paid || 0) : isFinite(pl.purchase[h.id]) ? pl.purchase[h.id] : 1e9);
  /* THE numbering policy, the one source of truth for every '#N' and buy-number badge. Numbers are contiguous from 1 in purchase order inside the portfolio view an asset belongs to:
     Planned view = every asset that is not owned (sold-in-plan ones keep their place), counted in list order, because the trust buys in list order and an asset is never bought before one above it
     (so list order IS purchase order; an unfunded asset keeps its list place instead of jumping to the end). Real view = every owned asset, oldest first (ties keep list order).
     Nothing is stored on the asset; numbers are recomputed from the list on every render, so removing an asset shifts every later number down by one at once.
     Returns { num: {id: n}, view: {id: 'planned' | 'owned'}, count: {planned, owned} }. pl is the plan (kept as a parameter so a future rule can use purchase months). */
  function numbering(S, pl) {
    const num = {}, view = {}, count = { planned: 0, owned: 0 };
    ['planned', 'owned'].forEach((v) => {
      const own = v === 'owned', list = S.houses.map((h, i) => [h, i]).filter(([h]) => (h.status === 'owned') === own);
      if (own) list.sort((a, b) => buyKey(a[0], pl) - buyKey(b[0], pl) || a[1] - b[1]);
      list.forEach(([h], k) => { num[h.id] = k + 1; view[h.id] = v; }); count[v] = list.length;
    });
    return { num, view, count };
  }
  function orderByBuy(S) {
    const pl = plan(S), rk = (h) => buyKey(h, pl);
    S.houses = S.houses.map((h, i) => [h, i]).sort((a, b) => rk(a[0]) - rk(b[0]) || a[1] - b[1]).map((x) => x[0]); S.orderV = 2; return S;
  }
  /* Funding no longer uses per-asset links: the trust (everything earlier in the list plus what is owned today) funds each purchase, so the list order IS the funding order and nothing needs relinking.
     The old h.target field is kept only so old saves load; it is ignored by plan(). relink() just clears it. */
  function relink(S) { S.houses.forEach((h) => { h.target = ''; }); return S; }
  /* creation sequence: the latest asset added in a category is the one with the highest seq (assets from before this feature have none: list position decides) */
  function register(S, h) { S.seq = (+S.seq || 0) + 1; h.seq = S.seq; h.created = Date.now(); return h; }
  function latestOf(list) { let best = null, bs = -Infinity; list.forEach((h) => { const q = h.seq != null && isFinite(+h.seq) ? +h.seq : -1; if (q >= bs) { bs = q; best = h; } }); return best; }
  /* copy names: "<base> (copy)", "<base> (copy1)", "<base> (copy2)" ...; <base> is the name without a trailing (copy) / (copyN); the first suffix no asset uses is taken; the whole suffix survives the 80-character limit */
  function copyName(S, name) {
    const base = String(name == null ? '' : name).replace(/\s*\(copy\d*\)\s*$/, '').replace(/\s+$/, ''), used = new Set(S.houses.map((h) => h.addr));
    for (let n = 0; ; n++) { const suf = ' (copy' + (n ? n : '') + ')', nm = base.slice(0, Math.max(0, 80 - suf.length)).replace(/\s+$/, '') + suf; if (!used.has(nm)) return nm; }
  }
  function duplicate(S, id) {
    const i = S.houses.findIndex((h) => h.id === id); if (i < 0) return null;
    const o = S.houses[i], c = JSON.parse(JSON.stringify(o));
    c.id = 'h' + Date.now().toString(36) + (uid++); c.addr = copyName(S, o.addr); c.status = 'planned'; c.paid = 0; c.target = ''; c.fresh = false; c.listingUrl = '';
    register(S, c); S.houses.splice(i + 1, 0, c); return c;
  }
  /* move an asset one step inside its category (visible = ids shown in the category, in order); returns true if the order changed */
  function reorder(S, ids) {
    const set = new Set(ids), slots = []; S.houses.forEach((h, i) => { if (set.has(h.id)) slots.push(i); });
    const cur = slots.map((i) => S.houses[i].id); if (cur.join() === ids.join()) return false;
    const by = {}; S.houses.forEach((h) => { by[h.id] = h; }); ids.forEach((id, k) => { S.houses[slots[k]] = by[id]; }); return true;
  }
  /* the buy order = the list order of the planned (not owned) assets, across categories. moveTo puts asset id at position n (1 = first), clamping to 1..count; returns { changed, pos, clamped, ids }. */
  const plannedIds = (S) => S.houses.filter((h) => h.status !== 'owned').map((h) => h.id);
  function moveTo(S, id, n) {
    const ids = plannedIds(S), i = ids.indexOf(id); if (i < 0) return { changed: false, pos: 0, clamped: false, ids };
    const want = Math.round(+n), bad = !isFinite(want), pos = bad ? i + 1 : Math.max(1, Math.min(ids.length, want)), clamped = bad || pos !== want;
    ids.splice(i, 1); ids.splice(pos - 1, 0, id); const changed = reorder(S, ids); return { changed, pos, clamped, ids };
  }
  /* ---------- purchase EXAMPLES: four typical purchases in each category, one per cost and quality tier (typical, not a quote; research brief in grader/multifamily-research.md).
     One table. To add an example, append one entry: { id, cat: 'house'|'multi'|'commercial'|'business', tier 1-4, tierName, name, type, loanId, units/pack (multi only), f: fields that go on the new asset, why(m) -> [basis text, arithmetic text] }.
     An example is applied through the SAME path as the Add screen (newAsset + applyLoan, plus mfDefaults for multi-family), so the asset it makes is a normal asset the user edits afterwards. */
  const usd = (n) => '$' + Math.round(n).toLocaleString('en-US');
  const pc = (n, d = 1) => String(+(+n).toFixed(d)) + '%';
  const MINDSCR = { comm25: 1.25, bankbiz: 1.25, sba504: 1.15, sba7a: 1.15, bridge: 1, sellerc: 1, sellerb: 1, dscr: 1, conv30: 1, conv15: 1, cashh: 0, cashb: 0 }; /* the DSCR a lender usually wants for each single-asset loan (multi-family loans carry their own in MFLOANS) */
  const minDscrOf = (id) => { const l = loanById(id); return l && l.multi ? l.dscr : MINDSCR[id] != null ? MINDSCR[id] : 1; };
  const TYP = 'All figures are typical, not a quote. ';
  const EXAMPLES = [
    { id: 'home-s8', cat: 'house', tier: 1, tierName: 'Budget', name: 'Section 8 fixer, 3 bed', type: 'house', loanId: 'dscr', arvRule: 70, scope: 21000, cont: 15, fmr: 2182,
      f: { price: 110000, rent: 1985, tax: 192, ins: 150, hoa: 0, capex: Math.round(21000 * 1.15), capexMonths: 4, arv: 192000 },
      why: (m, x) => [TYP + 'A dated 3-bedroom bought well below its repaired value, fixed up, rented to a Section 8 voucher holder and refinanced on the new value. The buy price follows the 70% rule (most you should pay = repaired value x 70% less the rehab). The rehab is a typical scope plus a 15% contingency. Rent sits under the HUD Fair Market Rent that caps a voucher. A DSCR investor loan qualifies on the rent and many lenders accept vouchers. Tax, insurance and the rehab scope are the app\'s own assumptions. The app counts rent from the purchase month, so the rehab months are not shown as vacancy.',
        '70% rule: ' + usd(m.arv) + ' x 70% = ' + usd(m.arv * 0.7) + ' less rehab ' + usd(m.capex) + ' = ' + usd(m.arv * 0.7 - m.capex) + ' most to pay; the price is ' + usd(m.price) + ' (' + pc(m.price / m.arv * 100, 0) + ' of repaired value). Rehab ' + usd(x.scope) + ' x 1.15 = ' + usd(m.capex) + '. All in ' + usd(m.price + m.capex) + ' = ' + pc((m.price + m.capex) / m.arv * 100, 0) + ' of repaired value. Rent ' + usd(m.rent) + ' is ' + pc(m.rent / x.fmr * 100, 0) + ' of the Atlanta FY2026 3-bed Fair Market Rent ' + usd(x.fmr) + '. Cash needed ' + usd(m.down) + ' down + ' + usd(m.closing) + ' closing + ' + usd(m.capex) + ' rehab = ' + usd(m.cash) + '. Cash flow after the loan ' + usd(m.cf) + '/mo.'] },
    { id: 'home-va', cat: 'house', tier: 2, tierName: 'Value-add', name: 'Cosmetic update, 3 bed', type: 'house', loanId: 'dscr', scope: 18000, cont: 15,
      f: { price: 232000, rent: 2300, tax: 242, ins: 142, hoa: 0, capex: Math.round(18000 * 1.15), capexMonths: 3, arv: 262000, liftIncome: 6 },
      why: (m, x) => [TYP + 'A mid-priced house in a steady market (the national median single-family price is about $360,000; affordable and Midwest medians run $150,000-$280,000). A light cosmetic update (floors, paint, kitchen and bath refresh) lifts the appraisal and the rent. No 70% rule here: the deal is the gap between the cost of the work and the value it adds. A DSCR investor loan with 25% down. Scope, tax and insurance are the app\'s own assumptions.',
        'Rehab ' + usd(x.scope) + ' x 1.15 = ' + usd(m.capex) + '. New appraisal ' + usd(m.arv) + ' = price ' + usd(m.price) + ' + ' + usd(m.arv - m.price) + ' (' + (Math.round((m.arv - m.price) / m.capex * 100) / 100) + ' x the rehab). Rent ' + usd(m.rent) + ' rises ' + pc(m.lift, 0) + ' to ' + usd(m.rentAfter) + ' after the work. DSCR ' + m.dscr.toFixed(2) + ' on today\'s rent, ' + m.dscrAfter.toFixed(2) + ' after the lift. Cash needed ' + usd(m.down) + ' down + ' + usd(m.closing) + ' closing + ' + usd(m.capex) + ' rehab = ' + usd(m.cash) + '. Cash flow after the loan ' + usd(m.cf) + '/mo.'] },
    { id: 'home-turnkey', cat: 'house', tier: 3, tierName: 'Turnkey', name: 'Move-in-ready rental', type: 'house', loanId: 'conv30', alt: 20,
      f: { price: 245000, rent: 2300, tax: 245, ins: 125, hoa: 0, dp: 30 },
      why: (m, x) => [TYP + 'A near move-in-ready house in a solid neighborhood with a tenant ready to go. You pay close to full market price, so there is no repair margin and no 70% rule: you are buying steady rent and slow growth. At about 7.5% a loan with only 20% down leaves almost nothing, so the example puts 30% down for a safer margin. Tax and insurance are the app\'s own assumptions.',
        'Rent ' + usd(m.rent) + ' is ' + pc(m.rent / m.price * 100, 2) + ' of the price. Income after vacancy, tax, insurance, repairs and management ' + usd(m.noi) + '/mo. Loan ' + usd(m.loan) + ' at 7.5% = ' + usd(m.pay) + '/mo, so cash flow ' + usd(m.cf) + '/mo (DSCR ' + m.dscr.toFixed(2) + '). With 20% down it would be ' + usd(m.altCf) + '/mo. Cash needed ' + usd(m.down) + ' down + ' + usd(m.closing) + ' closing = ' + usd(m.cash) + '.'] },
    { id: 'home-exec', cat: 'house', tier: 4, tierName: 'Premium', name: 'Executive home', type: 'house', loanId: 'cashh',
      f: { price: 620000, rent: 4300, tax: 568, ins: 250, hoa: 120 },
      why: (m, x) => [TYP + 'A higher-end house in a strong school district rented to a long-stay tenant. Rent is a small share of the price, so the yield is low and most of the return is value growth. At today\'s rates a loan would cost more than the house earns, so the example is bought with cash and the trust can borrow against it later. Tax, insurance and HOA are the app\'s own assumptions; the research found no reliable luxury-rental data.',
        'Rent ' + usd(m.rent) + ' is ' + pc(m.rent / m.price * 100, 2) + ' of the price. Income after vacancy, tax, insurance, HOA, repairs and management ' + usd(m.noi) + '/mo = ' + pc(m.cap, 1) + ' a year on the price. A 20%-down loan would cost ' + usd(m.altPay) + '/mo, more than the income, so cash flow would be ' + usd(m.altCf) + '/mo. Cash needed ' + usd(m.price) + ' + ' + usd(m.closing) + ' closing = ' + usd(m.cash) + '.'] },

    { id: 'multi-hack', cat: 'multi', tier: 1, tierName: 'House hack', name: 'Fourplex, live in one unit', type: 'house', loanId: 'mfFha', units: 4, pack: false,
      f: { price: 520000, rent: 6200 },
      why: (m, x) => [TYP + 'A fourplex where you live in one unit and rent the other three. FHA allows 3.5% down on 2-4 units you live in (580+ score, move in within about 60 days, stay a year) and adds mortgage insurance. The unit you live in is counted at market rent, because it replaces the rent you would pay elsewhere. Tax, insurance, management, repairs and reserves are the app\'s per-unit multi-family defaults.',
        m.units + ' units x ' + usd(m.rent / m.units) + ' = ' + usd(m.rent) + '/mo; price ' + usd(m.price) + ' = ' + usd(m.price / m.units) + ' a unit. Income after vacancy and costs ' + usd(m.noi) + '/mo. Loan ' + usd(m.loan) + ' (3.5% down, 1.75% mortgage insurance financed) plus insurance = ' + usd(m.pay) + '/mo, so cash flow ' + usd(m.cf) + '/mo (DSCR ' + m.dscr.toFixed(2) + ', FHA looks for 1.0). Cash needed ' + usd(m.down) + ' down + ' + usd(m.closing) + ' closing = ' + usd(m.cash) + '.'] },
    { id: 'multi-s8pack', cat: 'multi', tier: 2, tierName: 'Section 8 pack', name: 'Pack of 8 houses', type: 'house', loanId: 'mfBlanket', units: 8, pack: true,
      f: { price: 944000, rent: 12000 },
      why: (m, x) => [TYP + 'Eight older single-family houses bought together and financed on one blanket (portfolio) loan, rented to voucher holders. Rent is set well under the Atlanta FY2026 3-bedroom Fair Market Rent of $2,182 because the houses are older and in a lower-cost area. Management is 10% (scattered houses and voucher paperwork cost more). Tax, insurance and repairs are the app\'s per-house pack defaults. Ask for release clauses so you can sell one house at a time.',
        m.units + ' houses x ' + usd(m.price / m.units) + ' = ' + usd(m.price) + '; rent ' + usd(m.rent / m.units) + ' each = ' + pc(m.rent / m.units / 2182 * 100, 0) + ' of $2,182. Income after vacancy and costs ' + usd(m.noi) + '/mo. Blanket loan ' + usd(m.loan) + ' (75%) = ' + usd(m.pay) + '/mo, so cash flow ' + usd(m.cf) + '/mo (DSCR ' + m.dscr.toFixed(2) + ', needs 1.15). Cash needed ' + usd(m.down) + ' down + ' + usd(m.closing) + ' closing = ' + usd(m.cash) + '.'] },
    { id: 'multi-20va', cat: 'multi', tier: 3, tierName: 'Value-add', name: '20-unit building', type: 'house', loanId: 'mfBank5', units: 20, pack: false, perUnitWork: 6000, cont: 15, capRate: 7,
      f: { price: 1960000, rent: 22000, capex: Math.round(20 * 6000 * 1.15), capexMonths: 9, arv: 2520000, liftIncome: 11, dp: 30 },
      why: (m, x) => [TYP + 'A tired 20-unit building with below-market rents. You renovate units as they turn over, raise rents and later refinance into an agency or HUD loan. A bank loan fits the work period: 5-year balloon, 25-year schedule. Banks size it to a 1.25 DSCR on today\'s rent, so it lends 70% rather than 75%. Per-unit costs are the app\'s multi-family defaults for 20-49 units (6% management, a part-time maintenance tech).',
        'Work ' + usd(x.perUnitWork) + ' a unit x 20 x 1.15 = ' + usd(m.capex) + '. Rent today ' + usd(m.rent) + ' (' + usd(m.rent / m.units) + ' a unit) rises ' + pc(m.lift, 0) + ' to ' + usd(m.rentAfter) + '. Income ' + usd(m.noi) + '/mo today, ' + usd(m.noiAfter) + ' after. New value = ' + usd(m.noiAfter) + ' x 12 / ' + x.capRate + '% cap = ' + usd(m.noiAfter * 12 / (x.capRate / 100)) + ', stated ' + usd(m.arv) + '. Loan ' + usd(m.loan) + ' (70%) = ' + usd(m.pay) + '/mo: DSCR ' + m.dscr.toFixed(2) + ' today, ' + m.dscrAfter.toFixed(2) + ' after (needs 1.25). Cash needed ' + usd(m.down) + ' down + ' + usd(m.closing) + ' closing + ' + usd(m.capex) + ' work = ' + usd(m.cash) + '.'] },
    { id: 'multi-50', cat: 'multi', tier: 4, tierName: 'Stabilized', name: '50-unit building', type: 'house', loanId: 'mfAgency', units: 50, pack: false,
      f: { price: 6000000, rent: 63750 },
      why: (m, x) => [TYP + 'A full, well-run 50-unit building financed with a Fannie Mae / Freddie Mac loan: about 75% of the price, 10-year term, 30-year schedule, usually no personal guarantee, DSCR of about 1.25. At this size it needs professional management (5% fee plus an on-site manager in other costs). Per-unit tax, insurance, reserves and other costs are the app\'s multi-family defaults for 50+ units.',
        m.units + ' units x ' + usd(m.rent / m.units) + ' = ' + usd(m.rent) + '/mo; price ' + usd(m.price) + ' = ' + usd(m.price / m.units) + ' a unit. Income after vacancy and costs ' + usd(m.noi) + '/mo = ' + pc(m.cap, 1) + ' cap rate. Loan ' + usd(m.loan) + ' at 6.4% = ' + usd(m.pay) + '/mo, so cash flow ' + usd(m.cf) + '/mo (DSCR ' + m.dscr.toFixed(2) + ', needs 1.25). Cash needed ' + usd(m.down) + ' down + ' + usd(m.closing) + ' closing = ' + usd(m.cash) + '.'] },

    { id: 'comm-nnn', cat: 'commercial', tier: 1, tierName: 'Net lease', name: 'Small net-lease building', type: 'commercial', loanId: 'comm25', capTarget: 6.8, capBand: [6, 9],
      f: { price: 1650000, rent: 12775, tax: 1100, ins: 350, hoa: 0, nnn: 100, dp: 40 },
      why: (m, x) => [TYP + 'A small single-tenant building (a quick-service or pharmacy-type pad) on a long triple-net lease: the tenant repays all tax and insurance. CBRE\'s H1 2026 survey puts single-tenant net lease cap rates near 6.8%. The price comes from income / cap rate. The app deducts its own 7% vacancy, 8% management and 1% yearly repairs, so the cap rate it shows (' + pc(m.cap, 1) + ') is after those. Banks size to a 1.25 DSCR, so the loan is 60% and you put 40% down.',
        'Income after the app\'s costs ' + usd(m.noi) + '/mo x 12 = ' + usd(m.noi * 12) + ' / price ' + usd(m.price) + ' = ' + pc(m.cap, 2) + ' cap. Loan ' + usd(m.loan) + ' at 7.25% over 25 years = ' + usd(m.pay) + '/mo: DSCR ' + m.dscr.toFixed(2) + ' (bank wants 1.25), cash flow ' + usd(m.cf) + '/mo. Cash needed ' + usd(m.down) + ' down + ' + usd(m.closing) + ' closing = ' + usd(m.cash) + '.'] },
    { id: 'comm-strip', cat: 'commercial', tier: 2, tierName: 'Strip center', name: 'Neighborhood strip center', type: 'commercial', loanId: 'comm25', capTarget: 6.6, capBand: [6, 9],
      f: { price: 3800000, rent: 29400, tax: 2500, ins: 800, hoa: 1400, nnn: 90, dp: 40 },
      why: (m, x) => [TYP + 'A small neighborhood strip center with several tenants (services, food, a convenience anchor). Leases are mostly triple net: tenants repay 90% of tax, insurance and common-area costs. CBRE\'s H1 2026 survey shows small strip centers at about 6.4-6.6%. Price = income / cap rate, using the app\'s own cap rate after vacancy, management and repairs. A bank loan at 60% to meet a 1.25 DSCR.',
        'Income after the app\'s costs ' + usd(m.noi) + '/mo x 12 = ' + usd(m.noi * 12) + ' / price ' + usd(m.price) + ' = ' + pc(m.cap, 2) + ' cap. Loan ' + usd(m.loan) + ' at 7.25% over 25 years = ' + usd(m.pay) + '/mo: DSCR ' + m.dscr.toFixed(2) + ' (bank wants 1.25), cash flow ' + usd(m.cf) + '/mo. Cash needed ' + usd(m.down) + ' down + ' + usd(m.closing) + ' closing = ' + usd(m.cash) + '.'] },
    { id: 'comm-flex', cat: 'commercial', tier: 3, tierName: 'Industrial', name: 'Industrial flex building', type: 'commercial', loanId: 'comm25', capTarget: 6.2, capBand: [5, 8],
      f: { price: 6000000, rent: 44475, tax: 3500, ins: 1200, hoa: 1800, nnn: 80, dp: 45 },
      why: (m, x) => [TYP + 'A multi-tenant light-industrial / flex building (small bays with an office front) in a secondary market. CBRE\'s H1 2026 survey shows industrial at about 5.2% nationally; this example uses a wider 6.2% (the app\'s own assumption) for a smaller secondary-market building. Tenants repay 80% of tax, insurance and common-area costs. A bank loan at 55% to meet a 1.25 DSCR.',
        'Income after the app\'s costs ' + usd(m.noi) + '/mo x 12 = ' + usd(m.noi * 12) + ' / price ' + usd(m.price) + ' = ' + pc(m.cap, 2) + ' cap. Loan ' + usd(m.loan) + ' at 7.25% over 25 years = ' + usd(m.pay) + '/mo: DSCR ' + m.dscr.toFixed(2) + ' (bank wants 1.25), cash flow ' + usd(m.cf) + '/mo. Cash needed ' + usd(m.down) + ' down + ' + usd(m.closing) + ' closing = ' + usd(m.cash) + '.'] },
    { id: 'comm-office', cat: 'commercial', tier: 4, tierName: 'Office', name: 'Office building', type: 'commercial', loanId: 'comm25', capTarget: 7.9, capBand: [7, 10],
      f: { price: 8800000, rent: 82650, tax: 6000, ins: 1800, hoa: 3400, nnn: 60, dp: 30 },
      why: (m, x) => [TYP + 'A larger multi-tenant office building. CBRE\'s H1 2026 survey shows office at about 7.9% (Class A about 6.0%), so the buyer is paid more income for more leasing risk. Tenants repay 60% of tax, insurance and common-area costs (gross-style leases repay less). Price = income / cap rate, using the app\'s own cap rate after vacancy, management and repairs. A bank loan at 70% meets a 1.25 DSCR at this higher cap rate.',
        'Income after the app\'s costs ' + usd(m.noi) + '/mo x 12 = ' + usd(m.noi * 12) + ' / price ' + usd(m.price) + ' = ' + pc(m.cap, 2) + ' cap. Loan ' + usd(m.loan) + ' at 7.25% over 25 years = ' + usd(m.pay) + '/mo: DSCR ' + m.dscr.toFixed(2) + ' (bank wants 1.25), cash flow ' + usd(m.cf) + '/mo. Cash needed ' + usd(m.down) + ' down + ' + usd(m.closing) + ' closing = ' + usd(m.cash) + '.'] },

    { id: 'biz-vend', cat: 'business', tier: 1, tierName: 'Route', name: 'Vending route', type: 'business', loanId: 'sellerb', multRange: [2, 3],
      f: { price: 58000, rent: 2000, revenue: 4000, margin: 50, dp: 50 },
      why: (m, x) => [TYP + 'A small route of vending machines, mostly run by one owner. Small vending businesses sell for about 1.2 times yearly revenue and 2.3-2.5 times the owner\'s earnings (the median sale is about $47,500). The owner profit here is before any pay to yourself, as in broker listings (SDE). The seller carries half the price on a note, which is common for a business this size (sellers usually carry 10-50%).',
        'Revenue ' + usd(m.revenue) + '/mo x 12 = ' + usd(m.revenue * 12) + ' a year; margin ' + m.margin + '% gives owner profit ' + usd(m.rent) + '/mo = ' + usd(m.rent * 12) + ' a year. Price ' + usd(m.price) + ' = ' + m.mult.toFixed(1) + ' x profit and ' + (m.price / (m.revenue * 12)).toFixed(1) + ' x revenue. Seller note ' + usd(m.loan) + ' at 7% over 5 years = ' + usd(m.pay) + '/mo: DSCR ' + m.dscr.toFixed(1) + ', cash flow ' + usd(m.cf) + '/mo. Cash needed ' + usd(m.down) + ' down + ' + usd(m.closing) + ' closing = ' + usd(m.cash) + '.'] },
    { id: 'biz-laundry', cat: 'business', tier: 2, tierName: 'Laundromat', name: 'Laundromat', type: 'business', loanId: 'sba7a', multRange: [3, 5],
      f: { price: 335000, rent: 7000, revenue: 20000, margin: 35 },
      why: (m, x) => [TYP + 'A single-store laundromat with newer machines and a long lease. Laundromats usually sell for 3-5 times yearly owner profit (2-3 times when the machines are old or the lease is short). Buyers often use an SBA 7(a) loan: 10% down, about 10 years. SBA lenders also look at what you pay yourself, so treat the DSCR below as a rough check.',
        'Revenue ' + usd(m.revenue) + '/mo x 35% margin = owner profit ' + usd(m.rent) + '/mo = ' + usd(m.rent * 12) + ' a year. Price ' + usd(m.price) + ' = ' + m.mult.toFixed(1) + ' x profit and ' + (m.price / (m.revenue * 12)).toFixed(2) + ' x revenue. Loan ' + usd(m.loan) + ' at 9.75% over 10 years = ' + usd(m.pay) + '/mo: DSCR ' + m.dscr.toFixed(2) + ' (SBA wants 1.15), cash flow ' + usd(m.cf) + '/mo. Cash needed ' + usd(m.down) + ' down + ' + usd(m.closing) + ' closing = ' + usd(m.cash) + '.'] },
    { id: 'biz-hvac', cat: 'business', tier: 3, tierName: 'Services', name: 'HVAC service company', type: 'business', loanId: 'sba7a', multRange: [2.5, 5],
      f: { price: 1075000, rent: 27930, revenue: 133000, margin: 21 },
      why: (m, x) => [TYP + 'A home-services company (heating and air) with a crew of technicians, a customer list and a service-agreement base. Home-services businesses with under $1 million of owner profit sell for about 2.5-5 times that profit. Buyers often use an SBA 7(a) loan. The seller usually stays a few months to hand over the customers. SBA lenders also look at what you pay yourself, so treat the DSCR below as a rough check.',
        'Revenue ' + usd(m.revenue) + '/mo x 21% margin = owner profit ' + usd(m.rent) + '/mo = ' + usd(m.rent * 12) + ' a year. Price ' + usd(m.price) + ' = ' + m.mult.toFixed(1) + ' x profit and ' + (m.price / (m.revenue * 12)).toFixed(2) + ' x revenue. Loan ' + usd(m.loan) + ' at 9.75% over 10 years = ' + usd(m.pay) + '/mo: DSCR ' + m.dscr.toFixed(2) + ' (SBA wants 1.15), cash flow ' + usd(m.cf) + '/mo. Cash needed ' + usd(m.down) + ' down + ' + usd(m.closing) + ' closing = ' + usd(m.cash) + '.'] },
    { id: 'biz-sba', cat: 'business', tier: 4, tierName: 'Established', name: 'Established company, SBA 7(a)', type: 'business', loanId: 'sba7a', multRange: [4, 7],
      f: { price: 5250000, rent: 105000, revenue: 750000, margin: 14 },
      why: (m, x) => [TYP + 'A larger established company (about $9 million of yearly revenue, a management team under the owner) bought with an SBA 7(a) loan. Businesses above $1 million of owner profit sell for about 4-7 times that profit (EBITDA). The SBA 7(a) loan caps at $5 million, so the price is set so the loan stays under it. SBA lenders also look at what you pay yourself, so treat the DSCR below as a rough check.',
        'Revenue ' + usd(m.revenue) + '/mo x 14% margin = owner profit ' + usd(m.rent) + '/mo = ' + usd(m.rent * 12) + ' a year. Price ' + usd(m.price) + ' = ' + m.mult.toFixed(1) + ' x profit and ' + (m.price / (m.revenue * 12)).toFixed(2) + ' x revenue. Loan ' + usd(m.loan) + ' (90%, under the $5,000,000 cap) at 9.75% over 10 years = ' + usd(m.pay) + '/mo: DSCR ' + m.dscr.toFixed(2) + ' (SBA wants 1.15), cash flow ' + usd(m.cf) + '/mo. Cash needed ' + usd(m.down) + ' down + ' + usd(m.closing) + ' closing = ' + usd(m.cash) + '.'] }];
  const exCat = (type, multi) => (type === 'house' ? (multi ? 'multi' : 'house') : type);
  /* ---------- editable examples. EXAMPLES above is the shipped table and is never changed. The user's own edits are a separate map of overrides { <example id>: { field: value } } (EXOV below, kept in localStorage 'rep-v4-examples' by the app).
     EVERY consumer reads an example through exEff(): shipped fields merged with the overrides. A field the user never edited follows the shipped value; an edited field wins. Overrides are not part of any portfolio, Saved portfolio or Undo snapshot. ---------- */
  const EXKEY = 'rep-v4-examples', EXV = 1;
  const ALLC = ['house', 'multi', 'commercial', 'business'], RECATS = ['house', 'multi'], PROPC = ['house', 'multi', 'commercial'];
  /* the editable fields: kind usd / pct / int, the allowed range, and the categories that have the field */
  const EXF = { price: { kind: 'usd', min: 1, max: 1e10, cats: ALLC }, rent: { kind: 'usd', min: 0, max: 1e9, cats: PROPC }, revenue: { kind: 'usd', min: 0, max: 1e10, cats: ['business'] }, margin: { kind: 'pct', min: 0, max: 100, cats: ['business'] },
    tax: { kind: 'usd', min: 0, max: 1e9, cats: PROPC }, ins: { kind: 'usd', min: 0, max: 1e9, cats: PROPC }, hoa: { kind: 'usd', min: 0, max: 1e9, cats: PROPC }, nnn: { kind: 'pct', min: 0, max: 100, cats: ['commercial'] },
    capex: { kind: 'usd', min: 0, max: 1e10, cats: RECATS }, arv: { kind: 'usd', min: 0, max: 1e10, cats: RECATS }, capexMonths: { kind: 'int', min: 0, max: 120, cats: RECATS },
    growth: { kind: 'pct', min: -50, max: 100, cats: ALLC }, sellCost: { kind: 'pct', min: 0, max: 50, cats: ALLC }, dp: { kind: 'pct', min: 0, max: 100, cats: ALLC }, units: { kind: 'int', min: 2, max: 500, cats: ['multi'] } };
  const EXORDER = { house: ['price', 'capex', 'arv', 'capexMonths', 'rent', 'tax', 'ins', 'hoa', 'growth', 'sellCost', 'dp'], multi: ['units', 'price', 'capex', 'arv', 'capexMonths', 'rent', 'tax', 'ins', 'hoa', 'growth', 'sellCost', 'dp'],
    commercial: ['price', 'rent', 'tax', 'ins', 'hoa', 'nnn', 'growth', 'sellCost', 'dp'], business: ['price', 'revenue', 'margin', 'growth', 'sellCost', 'dp'] };
  const exFields = (cat) => (EXORDER[cat] || []).slice();
  const EXLBL = { price: 'Price', rent: 'Monthly rent', revenue: 'Total revenue', margin: 'Profit margin', tax: 'Property tax / mo', ins: 'Insurance / mo', hoa: 'HOA / mo', nnn: 'Tenants pay costs (NNN)', capex: 'Improvement budget', arv: 'New appraised value', capexMonths: 'Months to finish', growth: 'Growth / yr', sellCost: 'Selling costs', dp: 'Down payment', units: 'Number of units', loanId: 'Loan' };
  const exLabel = (k, cat) => (k === 'price' && (cat === 'commercial' || cat === 'business') ? 'Purchase price' : k === 'rent' && cat === 'multi' ? 'Total rent / mo' : k === 'rent' && cat === 'commercial' ? 'Monthly rent (all tenants)' : k === 'hoa' && cat === 'commercial' ? 'CAM & operating / mo' : k === 'growth' ? (cat === 'house' || cat === 'multi' ? 'Appreciation / yr' : cat === 'commercial' ? 'Value growth / yr' : 'Business growth / yr') : EXLBL[k] || k);
  const exLoanOk = (cat, type, id) => typeof id === 'string' && (cat === 'multi' ? MFLOANS.some((l) => l.id === id) : LOANS.some((l) => l.id === id && l.types.indexOf(type) >= 0));
  /* the ONE validation function: a value the user typed (number or text) for one field -> { ok, v } or { ok:false, msg }. Blocking only for impossible values (not a number, negative, out of range); the last good value is kept by the caller. */
  function exCheck(cat, k, raw) {
    const sp = EXF[k]; if (!sp || sp.cats.indexOf(cat) < 0) return { ok: false, msg: 'Not an editable number' };
    let v = raw;
    if (typeof v === 'string') { const t = v.replace(/[,\s$]/g, ''); if (t === '') return { ok: false, msg: "Can't be blank" }; v = /^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(t) ? Number(t) : NaN; } else if (typeof v !== 'number') return { ok: false, msg: 'Enter a number' };
    if (!isFinite(v)) return { ok: false, msg: 'Enter a number' };
    if (k === 'units') { if (v !== Math.round(v) || v < 2 || v > 500) return { ok: false, msg: 'Use a whole number, 2 to 500' }; return { ok: true, v }; }
    if (v < 0 && sp.min >= 0) return { ok: false, msg: "Can't be negative" };
    if (v < sp.min) return { ok: false, msg: sp.min > 0 && sp.min < 2 ? 'Must be more than 0' : 'At least ' + sp.min + '%' };
    if (v > sp.max) return { ok: false, msg: sp.kind === 'pct' ? 'At most ' + sp.max + '%' : 'Too large' };
    v = sp.kind === 'int' ? Math.round(v) : sp.kind === 'usd' ? Math.round(v * 100) / 100 : Math.round(v * 1e4) / 1e4;
    return { ok: true, v };
  }
  /* shipped fields merged with the overrides -> the effective example every consumer uses (a new object; the shipped one is never touched). A different loan drops the shipped down payment, so the loan's own terms apply unless the user typed one. */
  function exEff(ex, ov) {
    ov = ov || {}; const f = Object.assign({}, ex.f), cat = ex.cat;
    ['price', 'rent', 'tax', 'ins', 'hoa', 'nnn', 'capex', 'arv', 'capexMonths', 'growth', 'sellCost', 'dp'].forEach((k) => { if (ov[k] !== undefined && EXF[k].cats.indexOf(cat) >= 0) f[k] = ov[k]; });
    const loanId = ov.loanId !== undefined && exLoanOk(cat, ex.type, ov.loanId) ? ov.loanId : ex.loanId;
    if (loanId !== ex.loanId && ov.dp === undefined) delete f.dp;
    if (cat === 'business' && (ov.revenue !== undefined || ov.margin !== undefined)) { const rv = ov.revenue !== undefined ? ov.revenue : f.revenue, mg = ov.margin !== undefined ? ov.margin : f.margin; f.revenue = rv; f.margin = mg; f.rent = Math.round(rv * mg / 100); } /* owner profit = revenue x margin */
    const units = cat === 'multi' && ov.units !== undefined ? ov.units : ex.units;
    return Object.assign({}, ex, { f, loanId, units, shipped: ex.shipped || ex, edited: Object.keys(ov).filter((k) => ov[k] !== undefined && (k === 'loanId' || (EXF[k] && EXF[k].cats.indexOf(cat) >= 0))), ov: Object.assign({}, ov) });
  }
  /* what a field holds on the asset an example makes (the value the editor shows) */
  const exVal = (ex, k) => { const h = exampleAsset(ex); return k === 'units' ? unitsOf(h) : k === 'loanId' ? ex.loanId : h[k]; };
  /* drop overrides that equal what the example would have anyway, so 'Edited' means different from the shipped example and a later shipped change flows through */
  function exPrune(ex, ov) {
    const sh = ex.shipped || ex, o = Object.assign({}, ov);
    if (o.loanId !== undefined && (o.loanId === sh.loanId || !exLoanOk(sh.cat, sh.type, o.loanId))) delete o.loanId;
    Object.keys(o).forEach((k) => { if (o[k] === undefined) { delete o[k]; return; } if (k === 'loanId') return; const t = Object.assign({}, o); delete t[k]; if (exVal(exEff(sh, t), k) === o[k]) delete o[k]; });
    return o;
  }
  /* cleaning stored overrides: unknown ids and fields dropped, bad types ignored, numbers clamped */
  function exClean(raw) {
    const out = { v: EXV, ov: {} }; if (!raw || typeof raw !== 'object' || Array.isArray(raw) || !raw.ov || typeof raw.ov !== 'object' || Array.isArray(raw.ov)) return out;
    Object.keys(raw.ov).forEach((id) => { const ex = EXAMPLES.find((x) => x.id === id), src = raw.ov[id]; if (!ex || !src || typeof src !== 'object' || Array.isArray(src)) return; const o = {};
      Object.keys(src).forEach((k) => { const x = src[k];
        if (k === 'loanId') { if (exLoanOk(ex.cat, ex.type, x)) o.loanId = x; return; }
        const sp = EXF[k]; if (!sp || sp.cats.indexOf(ex.cat) < 0 || typeof x !== 'number' || !isFinite(x)) return;
        let v = Math.min(sp.max, Math.max(sp.min, x)); v = sp.kind === 'int' ? Math.round(v) : sp.kind === 'usd' ? Math.round(v * 100) / 100 : Math.round(v * 1e4) / 1e4; o[k] = v; });
      const p = exPrune(ex, o); if (Object.keys(p).length) out.ov[id] = p; });
    return out;
  }
  let EXOV = {};
  const exOverrides = () => EXOV;
  const exSet = (map) => { EXOV = exClean({ v: EXV, ov: map }).ov; return EXOV; };
  const exEffective = (id, ov) => { const ex = EXAMPLES.find((x) => x.id === id); return ex ? exEff(ex, ov !== undefined ? ov : EXOV[id]) : null; };
  const examplesFor = (type, multi) => EXAMPLES.filter((x) => x.cat === exCat(type, multi)).sort((a, b) => a.tier - b.tier).map((x) => exEff(x, EXOV[x.id]));
  const exampleById = (id) => exEffective(id);
  const exampleShipped = (id) => EXAMPLES.find((x) => x.id === id) || null;
  /* storage helpers: storage = anything with getItem / setItem (the app passes localStorage; tests pass a stub). Every call is wrapped; failure keeps the overrides in memory. */
  function exRead(storage) { try { const t = storage.getItem(EXKEY); if (t == null) return { ok: true, ov: {} }; let j; try { j = JSON.parse(t); } catch (e) { return { ok: true, ov: {}, bad: true }; } return { ok: true, ov: exClean(j).ov }; } catch (e) { return { ok: false, ov: null }; } }
  function exWrite(storage) { try { storage.setItem(EXKEY, JSON.stringify({ v: EXV, ov: EXOV })); return true; } catch (e) { return false; } }
  function exLoad(storage) { const r = exRead(storage); if (r.ov) EXOV = r.ov; return r.ok; }
  /* save ONE example's overrides (empty = reset it). Re-reads the stored map first so another tab's edits to other examples are kept. Returns true when it reached storage. */
  function exCommit(storage, id, ov) {
    const ex = EXAMPLES.find((x) => x.id === id); if (!ex) return false;
    const r = exRead(storage), base = r.ov || EXOV, next = Object.assign({}, base), p = exPrune(ex, exClean({ v: EXV, ov: { [id]: ov || {} } }).ov[id] || {});
    if (Object.keys(p).length) next[id] = p; else delete next[id]; EXOV = next; return exWrite(storage);
  }
  const exExport = () => ({ v: EXV, ov: JSON.parse(JSON.stringify(EXOV)) });
  function exImport(obj, storage) { EXOV = exClean(obj).ov; return exWrite(storage); }
  const exClearAll = (storage) => { EXOV = {}; try { storage.removeItem(EXKEY); return true; } catch (e) { return false; } };
  /* editing a draft (a plain overrides object). Returns { ok, draft } or { ok:false, msg }; a draft is never stored until exCommit. Units rescale the money fields like the asset page does, so the per-unit figures stay the same. */
  function exDraftSet(ex0, draft, k, raw) {
    const sh = ex0.shipped || ex0, cat = sh.cat, d = Object.assign({}, draft);
    if (k === 'loanId') { if (!exLoanOk(cat, sh.type, raw)) return { ok: false, msg: 'Pick a loan from the list' }; d.loanId = raw; delete d.dp; return { ok: true, draft: d }; }
    const c = exCheck(cat, k, raw); if (!c.ok) return c;
    if (k === 'units') { const cur = exEff(sh, d), a0 = exampleAsset(cur), f = c.v / unitsOf(a0);
      ['price', 'rent', 'capex', 'arv'].forEach((q) => { if (q === 'price' || q === 'rent' || a0[q] > 0) d[q] = Math.max(EXF[q].min, Math.min(EXF[q].max, Math.round(a0[q] * f))); });
      ['tax', 'ins', 'hoa'].forEach((q) => { if (d[q] !== undefined) d[q] = Math.max(0, Math.min(EXF[q].max, Math.round(d[q] * f))); }); }
    d[k] = c.v; return { ok: true, draft: d };
  }
  const exDirty = (ex0, a, b) => JSON.stringify(sortKeys(exPrune(ex0.shipped || ex0, a || {}))) !== JSON.stringify(sortKeys(exPrune(ex0.shipped || ex0, b || {})));
  const sortKeys = (o) => Object.keys(o).sort().reduce((q, k) => { q[k] = o[k]; return q; }, {});
  /* the example's own sanity rules; each fires exactly when its rule is broken. Non-blocking: the app shows them as warnings. m = exampleMetrics(S, ex). */
  function exWarnings(S, ex, m) {
    m = m || exampleMetrics(S, ex); const w = [], l = loanById(ex.loanId);
    if (m.cf < 0) w.push({ id: 'cf', text: 'Cash flow is negative: ' + usd(m.cf).replace('$-', '-$') + ' a month.' });
    if (m.pay > 0.5 && m.minDscr > 0 && m.dscr < m.minDscr) w.push({ id: 'dscr', text: 'DSCR ' + m.dscr.toFixed(2) + ' is below the ' + m.minDscr + ' this loan usually wants.' });
    if (ex.cat === 'multi' && l && !mfFit(l, ex.units, !!ex.pack).ok) w.push({ id: 'elig', text: 'This loan is not for ' + ex.units + (ex.pack ? ' houses' : ' units') + ': ' + l.only.charAt(0).toLowerCase() + l.only.slice(1) + '.' });
    if (ex.loanId === 'sba7a' && m.loan > 5e6) w.push({ id: 'sba', text: 'An SBA 7(a) loan tops out at $5,000,000; this one is ' + usd(m.loan) + '.' });
    if (ex.multRange && (m.mult < ex.multRange[0] || m.mult > ex.multRange[1])) w.push({ id: 'mult', text: 'Price is ' + m.mult.toFixed(1) + '× yearly profit; typical is ' + ex.multRange[0] + ' to ' + ex.multRange[1] + '×.' });
    if (ex.capBand && (m.cap < ex.capBand[0] || m.cap > ex.capBand[1])) w.push({ id: 'cap', text: 'Cap rate ' + m.cap.toFixed(1) + '% is outside the typical ' + ex.capBand[0] + ' to ' + ex.capBand[1] + '%.' });
    if (ex.arvRule && m.price > m.arv * ex.arvRule / 100 - m.capex) w.push({ id: 'rule', text: 'Price is above the ' + ex.arvRule + '% rule (most to pay ' + usd(m.arv * ex.arvRule / 100 - m.capex) + ').' });
    return w;
  }
  const exFmt = (k, v) => (k === 'loanId' ? (loanById(v) || { name: String(v) }).name : EXF[k].kind === 'usd' ? usd(v) : EXF[k].kind === 'pct' ? pc(v, 2) : k === 'capexMonths' ? v + ' mo' : String(v));
  /* the options the Add screen passes to newAsset for an example (multi-family: the per-unit defaults for that size first, then the example's own numbers) */
  const exampleOpts = (ex) => Object.assign({ addr: ex.name }, ex.cat === 'multi' ? Object.assign({ kind: 'multi', units: ex.units, pack: !!ex.pack }, mfDefaults(ex.units, !!ex.pack)) : {}, { addr: ex.name }, ex.f);
  const exampleAsset = (ex) => newAsset(ex.type, ex.loanId, Object.assign({ fresh: true }, exampleOpts(ex)));
  /* what the example makes, in numbers (S = the user's assumptions for vacancy, management, repairs and closing): used for the one-line summary, the preview and the tests */
  function exampleMetrics(S, ex) {
    S = S || { g: GDEF }; const h = exampleAsset(ex), noi = noiOf(S, h), pay = payment(h) + mipMonthly(h), lift = +h.liftIncome || 0, h2 = Object.assign({}, h, { rent: h.rent * (1 + lift / 100) }), noi2 = noiOf(S, h2);
    const m = { h, type: h.type, price: h.price, capex: h.capex || 0, arv: +h.arv || 0, rent: h.rent, lift, rentAfter: h2.rent, revenue: h.type === 'business' ? revOf(h) : 0, margin: h.type === 'business' ? marginOf(h) : 0, units: unitsOf(h),
      dp: h.dp, down: downAmt(h), closing: (h.price * clPct(S, h)) / 100, loan: loan(h), pay, noi, noiAfter: noi2, cf: noi - pay, cfAfter: noi2 - pay, dscr: pay > 0.5 ? noi / pay : Infinity, dscrAfter: pay > 0.5 ? noi2 / pay : Infinity, minDscr: minDscrOf(h.loanId),
      cash: needFor(S, h), cap: (noi * 12 / h.price) * 100, mult: h.rent > 0 ? h.price / (h.rent * 12) : 0, loanId: h.loanId };
    if (ex.alt) { const a = newAsset(ex.type, ex.loanId, Object.assign({ fresh: true }, exampleOpts(ex), { dp: ex.alt })); m.altCf = noiOf(S, a) - payment(a) - mipMonthly(a); }
    if (ex.id === 'home-exec') { const a = newAsset('house', 'conv30', Object.assign({ fresh: true }, exampleOpts(ex))); m.altPay = payment(a); m.altCf = noiOf(S, a) - payment(a); }
    return m;
  }
  /* the (i) text: the shipped example's own research basis and derivation, always worked out on the SHIPPED numbers so it stays true; when the user changed fields it starts with 'Original / Yours' for each one and shows the numbers the edited example makes */
  function exampleInfo(S, ex) {
    const sh = ex.shipped || ex, m0 = exampleMetrics(S, sh), w = sh.why(m0, sh), ed = ex.edited || []; let b = w[0], e = w[1];
    if (ed.length) { const a0 = exampleAsset(sh), a1 = exampleAsset(ex), m = exampleMetrics(S, ex), lines = ed.map((k) => exLabel(k, sh.cat) + ': Original ' + exFmt(k, exVal(sh, k)) + ' / Yours ' + exFmt(k, exVal(ex, k)));
      b = 'You changed this example. ' + lines.join('. ') + '. With your numbers: cash needed ' + usd(m.cash) + ', cash flow ' + usd(m.cf).replace('$-', '-$') + ' a month' + (m.pay > 0.5 ? ', DSCR ' + m.dscr.toFixed(2) : '') + ' (original: ' + usd(m0.cash) + ', ' + usd(m0.cf).replace('$-', '-$') + ' a month). Original: ' + w[0]; e = 'Original derivation: ' + w[1]; void a0; void a1; }
    return { t: sh.tierName + ': ' + sh.name + (ed.length ? ' (edited)' : ''), b, e };
  }
  /* ---------- diagnostics: safety copies, anomaly checks and the bug report. All of it stays on this device; nothing here sends anything anywhere. ---------- */
  const Diag = (function () {
    const SAFEKEY = 'rep-v4-safety', DIAGKEY = 'rep-v4-diag', SAFE_MAX = 5, SAFE_BYTES = 700000, EV_MAX = 60, ACT_MAX = 10, DIAG_BYTES = 30000, REPORT_MAX = 8000, URL_MAX = 7400;
    const ISSUE = 'https://github.com/Austin12342123/Real-estate-portfolio-/issues/new';
    const hash = (s) => { s = String(s); let x = 0x811c9dc5; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 0x01000193) >>> 0; } return ('0000000' + x.toString(16)).slice(-8); }; /* FNV-1a, 8 hex: a stable short fingerprint of a text (ids are hashed this way in reports) */
    const okState = (s) => !!(s && typeof s === 'object' && Array.isArray(s.houses) && s.g && typeof s.g === 'object');
    const idsHash = (S) => hash(((S && S.houses) || []).map((h) => h.id).join('|'));
    const fingerprint = (S, now) => { const hs = (S && S.houses) || []; return { ids: idsHash(S), n: hs.length, own: hs.filter((h) => h.status === 'owned').length, ts: now || Date.now(), v: S ? S.v : null }; };
    /* ----- safety copies: a ring of the last SAFE_MAX snapshots under their own key { v:1, items:[{ ts, reason, build, state }] }, newest first. storage = anything with getItem / setItem. Nothing here throws. ----- */
    function safeRead(st) {
      try { const j = JSON.parse(st.getItem(SAFEKEY)); if (!j || j.v !== 1 || !Array.isArray(j.items)) return [];
        return j.items.filter((x) => x && isFinite(+x.ts) && typeof x.reason === 'string' && (okState(x.state) || typeof x.raw === 'string')).slice(0, SAFE_MAX).map((x) => { const o = { ts: +x.ts, reason: x.reason.slice(0, 80), build: String(x.build || '').slice(0, 16), state: okState(x.state) ? x.state : null }; if (typeof x.raw === 'string') o.raw = x.raw; return o; }); } catch (e) { return []; }
    }
    /* write the ring: too big or over quota drops the OLDEST copy and tries again; returns the items kept, or false when nothing could be stored */
    function safeWrite(st, items) {
      let it = items.slice(0, SAFE_MAX);
      for (let guard = 0; guard < 12 && it.length; guard++) {
        let txt; try { txt = JSON.stringify({ v: 1, items: it }); } catch (e) { return false; }
        if (txt.length > SAFE_BYTES) { if (it.length <= 1) return false; it = it.slice(0, -1); continue; }
        try { st.setItem(SAFEKEY, txt); return it; } catch (e) { if (it.length <= 1) return false; it = it.slice(0, -1); }
      }
      return false;
    }
    function safeAdd(st, state, reason, build, now, raw) {
      try {
        const item = { ts: now || Date.now(), reason: String(reason).slice(0, 80), build: String(build || '').slice(0, 16) };
        if (okState(state)) item.state = JSON.parse(JSON.stringify(state)); else if (typeof raw === 'string' && raw) { item.state = null; item.raw = raw.slice(0, 200000); } else return false;
        return safeWrite(st, [item].concat(safeRead(st)));
      } catch (e) { return false; }
    }
    const dayOf = (t) => { const d = new Date(t); return d.getFullYear() * 10000 + d.getMonth() * 100 + d.getDate(); };
    /* at most one copy a day: only when nothing else took one today and the newest copy is not already the same portfolio */
    function safeDaily(st, state, build, now) {
      try { now = now || Date.now(); const it = safeRead(st); if (it.some((x) => dayOf(x.ts) === dayOf(now))) return null;
        if (it.length && it[0].state && JSON.stringify(it[0].state) === JSON.stringify(state)) return null;
        return safeAdd(st, state, 'daily copy', build, now); } catch (e) { return null; }
    }
    const safeInfo = (s) => { const hs = (s && s.houses) || []; return { n: hs.length, own: hs.filter((h) => h.status === 'owned').length, planned: hs.filter((h) => h.status !== 'owned').length }; };
    /* ----- 'portfolio replaced' detection: the stored last-known fingerprint against this start. Flags only when the portfolio now is the shipped default plan, it is a different set of assets than before, and no logged migration, sample, restore, import or open explains it. ----- */
    const EXPLAIN = ['migration', 'scenario', 'restore', 'import', 'open-saved', 'clear-planned', 'undo', 'removed'];
    function replacedCheck(S, fp, events) {
      try { if (!fp || !fp.ids || !okState(S)) return false; const cur = idsHash(S); if (cur === fp.ids) return false;
        if (cur !== idsHash(E.seedPlan())) return false;
        return !(events || []).some((e) => e && EXPLAIN.indexOf(e.k) >= 0 && +e.t >= (fp.ts || 0) - 2000); } catch (e) { return false; }
    }
    /* the newest safety copy that is a different portfolio from the one on screen */
    const restoreCandidate = (items, S) => { const cur = idsHash(S); return (items || []).find((x) => x.state && idsHash(x.state) !== cur) || null; };
    /* ----- invariants: each returns { code, ok, m (measured, no dollar amounts), n (the same with amounts, shown only when numbers are included) } ----- */
    const BADRE = /(^|[^A-Za-z])(NaN|-?Infinity|undefined|\[object)([^A-Za-z]|$)/;
    const plannedParts = (S, pl) => { const own = {}; S.houses.forEach((h) => { if (h.status === 'owned') own[h.id] = 1; }); const sn = pl.snap.filter((x) => x.type !== 'cash'), sum = (a) => a.reduce((s, x) => s + (+x.cf || 0), 0); return { top: pl.horizon.cf - sum(sn.filter((x) => own[x.id])), rows: sum(sn.filter((x) => !own[x.id])), today: E.todayTotals(S, pl, sn.filter((x) => !own[x.id]).map((x) => x.id)).cf }; }; /* top / rows: the plan-end total and the sum of its rows (engine consistency); today: the Planned total shown on screen is in today's terms (2026*) */
    function checks(c) {
      const out = [], add = (code, ok, m, n) => out.push({ code, ok: !!ok, m: String(m), n: n === undefined ? '' : String(n) }), S = c.S;
      try { const a = JSON.parse(JSON.stringify(S)); E.normalize(a); const ja = JSON.stringify(a), b = JSON.parse(ja); E.normalize(b); const idem = JSON.stringify(b) === ja;
        add('state-shape', okState(S) && idem && S.v === c.dataV, 'S.v ' + S.v + ' of DATA_V ' + c.dataV + ', ' + S.houses.length + ' assets, normalize ' + (idem ? 'idempotent' : 'NOT idempotent')); } catch (e) { add('state-shape', false, 'threw: ' + String(e && e.message).slice(0, 80)); }
      try { const pl = c.pl, bad = []; if (pl && pl.horizon) ['nw', 'monthly', 'cf', 'noi', 'debt', 'value'].forEach((k) => { if (typeof pl.horizon[k] !== 'number' || !isFinite(pl.horizon[k])) bad.push(k); });
        (c.kpiTexts || []).forEach((t, i) => { if (BADRE.test(t)) bad.push('kpi text ' + (i + 1)); });
        add('kpi-finite', !bad.length, !pl && !(c.kpiTexts || []).length ? 'skipped: the plan is not on screen' : bad.length ? 'not finite or unreadable: ' + bad.join(', ') : 'plan fields finite' + (c.kpiTexts && c.kpiTexts.length ? ', ' + c.kpiTexts.length + ' KPI texts clean' : '')); } catch (e) { add('kpi-finite', false, 'threw: ' + String(e && e.message).slice(0, 80)); }
      try { if (!c.pl) add('total-equals-rows', true, 'skipped: the plan is not on screen'); else { const p = plannedParts(S, c.pl), tol = 1 + 0.002 * Math.abs(p.rows), d1 = Math.abs(p.top - p.rows); let ok = d1 <= tol, m = 'Planned total matches the sum of its rows (diff ' + (Math.abs(p.rows) > 1 ? (d1 / Math.abs(p.rows) * 100).toFixed(3) : '0') + '%)';
          if (isFinite(c.domCf)) { const d2 = Math.abs(c.domCf - p.today), t2 = 1 + 0.003 * Math.abs(p.today); if (d2 > t2) { ok = false; m = 'the total shown on screen differs from the engine (diff ' + (Math.abs(p.today) > 1 ? (d2 / Math.abs(p.today) * 100).toFixed(2) : '0') + '%)'; } }
          if (!ok && d1 > tol) m = 'Planned total differs from the sum of its rows (diff ' + (Math.abs(p.rows) > 1 ? (d1 / Math.abs(p.rows) * 100).toFixed(2) : '0') + '%)'; add('total-equals-rows', ok, m, 'top ' + Math.round(p.top) + ', rows ' + Math.round(p.rows) + (isFinite(c.domCf) ? ', today ' + Math.round(p.today) + ', shown ' + Math.round(c.domCf) : '')); } } catch (e) { add('total-equals-rows', false, 'threw: ' + String(e && e.message).slice(0, 80)); }
      { const rw = c.rw; add('storage-readback', !rw || rw.ok !== false, !rw || rw.ok === null ? 'no write yet this session' : rw.ok ? 'last save read back equal (' + rw.chars + ' chars)' : 'last save did NOT read back equal' + (rw.err ? ': ' + String(rw.err).slice(0, 60) : '')); }
      { const s = c.stamps || {}, v = [s.engine, s.info, s.app, s.css], agree = !!s.app && v.every((x) => x === s.app), cn = (c.swCaches || []), swOk = !cn.length || cn.some((n) => String(n).slice(-8) === s.app);
        add('build-stamps', agree && swOk, 'engine ' + (s.engine || 'none') + ', info ' + (s.info || 'none') + ', app ' + (s.app || 'none') + ', css ' + (s.css || 'none') + (cn.length ? ', cache ' + cn.map((n) => String(n).slice(-8)).join('/') : '') + (agree && swOk ? ': all agree' : ': MISMATCH')); }
      add('portfolio-not-replaced', !c.replaced, c.replaced ? 'now the default plan with different assets than the last known portfolio, and no logged migration, sample, restore or import explains it' : 'matches the last known portfolio or has an explanation');
      { const n = c.errCount || 0; add('no-runtime-errors', n === 0, n + ' error / rejection / service-worker / storage event(s) captured this session'); }
      return out;
    }
    const CODE = { 'state-shape': 'state-shape', 'kpi-finite': 'kpi-nonfinite', 'total-equals-rows': 'total-mismatch', 'storage-readback': 'storage-readback', 'build-stamps': 'build-mismatch', 'portfolio-not-replaced': 'state-replaced', 'no-runtime-errors': 'runtime-error' };
    const anomalies = (cs) => cs.filter((x) => !x.ok).map((x) => CODE[x.code] || x.code);
    /* ----- the bug report ----- */
    const scrub = (s, names) => { s = String(s == null ? '' : s); (names || []).forEach((n) => { if (n && String(n).length >= 3) s = s.split(String(n)).join('[address]'); }); return s.replace(/[−-]?\$\s?\d[\d,]*(?:\.\d+)?\s?[KkMmBb]?\b/g, '$#'); };
    const one = (s) => String(s == null ? '' : s).replace(/\s*[\r\n]+\s*/g, ' / ').trim();
    const iso = (t) => { try { return new Date(t).toISOString().slice(0, 19) + 'Z'; } catch (e) { return String(t); } };
    function stateLines(S, o) {
      const hs = S.houses || [], L = [], pc = hs.filter((h) => h.status !== 'owned').length;
      L.push(['assets_total', hs.length], ['planned', pc], ['owned', hs.length - pc]);
      ['house', 'commercial', 'business'].forEach((t) => { const a = hs.filter((h) => (h.type || 'house') === t); L.push([t + '_planned', a.filter((h) => h.status !== 'owned').length], [t + '_owned', a.filter((h) => h.status === 'owned').length]); });
      const mf = hs.filter(isMulti); L.push(['multifamily_assets', mf.length], ['multifamily_units_total', mf.reduce((a, h) => a + unitsOf(h), 0)], ['sold_in_plan', o.sold == null ? 'n/a' : o.sold]);
      const ad = Array.isArray(S.added) ? S.added : []; L.push(['added_keys', ad.length + (ad.length ? ' (' + ad.map((k) => 'h:' + hash(k)).join(', ') + ')' : '')], ['additions_shipped', ADDITIONS.length], ['saved_portfolios', o.saved], ['example_overrides', o.exov], ['unit_setting', o.unit], ['page', o.page], ['asset_ids_hash', idsHash(S)]);
      if (o.numbers) { if (o.nw != null) L.push(['net_worth_plan_end', Math.round(o.nw)], ['cash_flow_per_month_plan_end', Math.round(o.cf)]); hs.forEach((h, i) => L.push(['asset_' + (i + 1), (h.type || 'house') + ' ' + (h.status === 'owned' ? 'owned' : 'planned') + ' price=' + Math.round(+h.price || 0) + ' rent=' + Math.round(+h.rent || 0)])); }
      return L;
    }
    const FORCLAUDE = 'Paste this whole report into the Claude chat for the Real-estate-portfolio- repo. Claude: (1) read section 2: the four stamps must be equal (if not, the phone ran mixed files; the app heals itself once, so look at the events), then section 4 (failed invariants) and sections 5-7 (events, errors, last actions); (2) reproduce it with Playwright against prototype/v4 with the state described in section 3 (graders in prototype/grader show how to load a state); (3) fix the root cause in v4/engine.js, app.js, info.js or style.css and run python3 prototype/v4/stamp.py; (4) add a regression check to the graders (ux-grade.js J, design-grade.js K); (5) follow CLAUDE.md: never replace a user\'s portfolio in a migration, run the full grader, push to main and publish the Artifact as usual. Ids are shown as h:xxxxxxxx = Engine.Diag.hash(text). The app cannot send this report by itself: the person copies it and pastes it into the chat.';
    function report(inp) {
      const nums = !!inp.numbers, names = nums ? [] : (inp.names || []), sc = (s) => (nums ? String(s == null ? '' : s) : scrub(s, names)), kv = (k, v) => '- ' + k + ': ' + one(v);
      const b = inp.build || {}, st = b.stamps || {}, cs = inp.checks || [], an = inp.anomalies || [], strip = (s) => String(s || '').replace(/https?:\/\/[^\s)]*\//g, '');
      const sec = (n, t, lines) => '## ' + n + '. ' + t + '\n' + lines.join('\n') + '\n';
      const build = (nEv, nErr, nAct, stackLines) => {
        const evs = (inp.events || []).slice(-nEv), errs = (inp.events || []).filter((e) => ['error', 'unhandledrejection', 'sw', 'storage'].indexOf(e.k) >= 0).slice(-nErr), acts = (inp.actions || []).slice(-nAct);
        return '<!-- rep-bug-report v1 | generated ' + iso(inp.now || Date.now()) + ' -->\n# Portfolio app bug report\n\n' +
          sec(1, 'Summary', [kv('anomalies', an.length ? an.join(', ') : 'none detected'), kv('description', inp.desc ? sc(inp.desc).slice(0, 500) : '(none)'), kv('numbers_included', nums ? 'yes' : 'no (counts and hashes only)')]) + '\n' +
          sec(2, 'Build', [kv('stamp_engine', st.engine || 'none'), kv('stamp_info', st.info || 'none'), kv('stamp_app', st.app || 'none'), kv('stamp_css', st.css || 'none'), kv('stamps_agree', st.app && [st.engine, st.info, st.css].every((x) => x === st.app) ? 'yes' : 'NO'), kv('data_v', b.dataV), kv('state_v', b.stateV),
            kv('sw_cache', (b.swCaches && b.swCaches.length ? b.swCaches.join(', ') : 'none')), kv('sw_controller', b.swCtl ? 'yes' : 'no'), kv('display_mode', b.mode), kv('route', nums ? b.route : b.routeSafe), kv('user_agent', b.ua), kv('viewport', b.vw + 'x' + b.vh), kv('dpr', b.dpr), kv('language', b.lang), kv('timezone', b.tz), kv('online', b.online ? 'yes' : 'no'), kv('storage_local', b.ls ? 'ok' : 'unavailable'), kv('storage_session', b.ss ? 'ok' : 'unavailable')].concat((b.keys || []).map((x) => kv('bytes_' + x[0], x[1])))) + '\n' +
          sec(3, 'State summary', stateLines(inp.S, inp.sum || {}).map((x) => kv(x[0], x[1]))) + '\n' +
          sec(4, 'Invariants', cs.map((x) => '- [' + (x.ok ? 'PASS' : 'FAIL') + '] ' + x.code + ': ' + one(x.m) + (nums && x.n ? ' (' + one(x.n) + ')' : ''))) + '\n' +
          sec(5, 'Events (last ' + evs.length + ')', evs.length ? evs.map((e) => '- ' + iso(e.t) + ' ' + e.k + ': ' + sc(strip(e.m))) : ['- none']) + '\n' +
          sec(6, 'Errors', errs.length ? errs.map((e) => '- ' + iso(e.t) + ' ' + e.k + ': ' + sc(strip(e.m)) + (e.s && stackLines ? '\n' + String(e.s).split('\n').slice(0, stackLines).map((l) => '    ' + sc(strip(l)).slice(0, 140)).join('\n') : '')) : ['- none']) + '\n' +
          sec(7, 'Last user actions (oldest first; button ids and routes only, never typed text)', acts.length ? acts.map((a) => '- ' + iso(a.t).slice(11) + ' ' + one(a.a)) : ['- none']) + '\n' +
          sec(8, 'For Claude', [FORCLAUDE]);
      };
      let nEv = 30, nErr = 6, nAct = 10, sl = 4, txt = build(nEv, nErr, nAct, sl);
      while (txt.length > REPORT_MAX && nEv > 4) { nEv -= 4; txt = build(nEv, nErr, nAct, sl); } /* events are trimmed first, then error stacks, then actions */
      while (txt.length > REPORT_MAX && sl > 0) { sl--; txt = build(nEv, nErr, nAct, sl); }
      while (txt.length > REPORT_MAX && nAct > 3) { nAct--; txt = build(nEv, nErr, nAct, sl); }
      if (txt.length > REPORT_MAX) txt = txt.slice(0, REPORT_MAX - 60) + '\n[trimmed to fit ' + REPORT_MAX + ' characters]\n';
      return txt;
    }
    /* turn a report back into { sections: { 1: { title, lines, kv } ... } } (the format is stable so Claude and the graders can parse it) */
    function parseReport(t) {
      const out = { version: null, sections: {} }, m = /<!-- rep-bug-report v(\d+)/.exec(t); out.version = m ? +m[1] : null; let cur = null;
      String(t).split('\n').forEach((l) => { const h = /^## (\d+)\. (.*)$/.exec(l); if (h) { cur = out.sections[+h[1]] = { title: h[2], lines: [], kv: {} }; return; } if (!cur || !l.trim()) return; cur.lines.push(l); const k = /^- ([A-Za-z0-9_\-]+): (.*)$/.exec(l); if (k) cur.kv[k[1]] = k[2]; });
      return out;
    }
    /* the prefilled GitHub issue link: the body is cut so the whole address stays under URL_MAX characters */
    function issueUrl(title, body) {
      const foot = '\n\nFull report was copied to the clipboard.', t = String(title || 'In-app bug report').slice(0, 100), mk = (x) => ISSUE + '?title=' + encodeURIComponent(t) + '&body=' + encodeURIComponent(x + foot);
      let b = String(body || ''), trimmed = false, u = mk(b);
      for (let i = 0; i < 60 && u.length > URL_MAX && b.length > 100; i++) { b = b.slice(0, Math.max(100, b.length - Math.ceil((u.length - URL_MAX) / 3) - 20)); if (/[\ud800-\udbff]$/.test(b)) b = b.slice(0, -1); trimmed = true; u = mk(b + '\n[trimmed]'); }
      if (u.length > URL_MAX) u = mk('');
      return { url: u, trimmed };
    }
    return { SAFEKEY, DIAGKEY, SAFE_MAX, SAFE_BYTES, EV_MAX, ACT_MAX, DIAG_BYTES, REPORT_MAX, URL_MAX, ISSUE, hash, idsHash, fingerprint, okState, safeRead, safeWrite, safeAdd, safeDaily, safeInfo, replacedCheck, restoreCandidate, EXPLAIN, checks, anomalies, plannedParts, scrub, report, parseReport, issueUrl, CODE };
  })();
  const CF_TARGET = 1300000; /* the user's cash-flow target: $1.3M a month AFTER TAX, in today's dollars (2026*), at the plan end */
  const E = { CF_TARGET, Diag, FEAS, feasible, todayTotals, checkList, shortfall, moveTo, plannedIds, numbering, buyKey, EXAMPLES, EXKEY, EXV, EXF, exFields, exLabel, exLoanOk, exCheck, exEff, exEffective, exVal, exPrune, exClean, exOverrides, exSet, exRead, exWrite, exLoad, exCommit, exExport, exImport, exClearAll, exDraftSet, exDirty, exWarnings, exFmt, exampleShipped, MINDSCR, minDscrOf, exCat, examplesFor, exampleById, exampleOpts, exampleAsset, exampleMetrics, exampleInfo, ADDITIONS, applyAdditions, dfac, realPlan, planR, planIn, depCum, costBasis, saleTax, portTaxAt, bracketTax, TAXY, loanPath, capOf, revOf, marginOf, reimbOf, matOf, savedBy, needFor, housingAt, stress, seedPlan, seedStradella, seedBig, orderByBuy, relink, register, latestOf, duplicate, reorder, catOf, noiOf, cfSaved, estTaxPct, taxPctFor, finance, samplePersonal, normalizePersonal, jobsGross, jobsNet, jobMonthly, GDEF, TYPES, LOANS, MFLOANS, loanById, mfCat, mfFit, mfLoans, mfFirst, mfDefaults, mfInfo, unitsOf, isMulti, mgmtOf, mgmtAmt, ARV_K, autoArv, arvIsAuto, maintOf, mfReserve, mfOther, downAmt, mipMonthly, loansFor, applyLoan, newAsset, newHouse, normalize, fromListing, seed, seedStretch, view, plan, afford, without, extraFor, locMonths, payoffN, pmt, payment, loan, balToday, need, H };
  if (typeof module !== 'undefined' && module.exports) module.exports = E; else root.Engine = E;
})(typeof window !== 'undefined' ? window : globalThis);
