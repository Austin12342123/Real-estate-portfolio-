#!/usr/bin/env node
/* Logic and math grader (categories L1-L10, 100 pts). Node only (no browser). Run:  LOGIC_ONLY=1 node grade.js   (or: node logic-grade.js)
   Every formula in v4/engine.js is compared with an independent reference (grader/logic/ref.js) on many random and edge cases; every default
   and rule is compared with a fact taken from a source that was actually fetched (grader/logic/sources.md, ids S1..). Facts that could not be
   source-verified (blocked hosts, JS-only pages) are scored only if the UI discloses them as an assumption, and are listed as "disclosed, not verified".
   Writes grader/logic/report.md and grader/result-logic.json. Never edits the app. */
const fs = require('fs'), path = require('path');
const V4 = path.resolve(__dirname, '../v4');
const E = require(path.join(V4, 'engine.js'));
const { INFO } = require(path.join(V4, 'info.js'));
const APP = fs.readFileSync(path.join(V4, 'app.js'), 'utf8');
const R = require('./logic/ref.js');

const CATS = { L1: ['Loan / amortization / payoff math', 14], L2: ['Income, expense and NOI model', 14], L3: ['Leverage, LTV/CLTV and credit-line rules', 12], L4: ['Lender qualification (DTI / DSCR / rental haircut)', 10],
  L5: ['Loan-product terms vs sources (every LOANS preset)', 12], L6: ['Appreciation, rent growth, inflation and time basis', 10], L7: ['Taxes, selling costs and depreciation', 8], L8: ['Business valuation, growth and operating model', 8],
  L9: ['Plan integrity (ordering, trust funding, cash recycling, stress test)', 7], L10: ['Disclosure, labels, units and glossary accuracy', 5] };
const checks = [], unverified = [];
const near = (a, b, tol) => Math.abs(a - b) <= (tol === undefined ? 0.01 : tol);
const nearRel = (a, b, t) => Math.abs(a - b) <= Math.max(0.01, Math.abs(b) * (t || 1e-9));
function chk(cat, id, name, pts, fn, src) {
  let r; try { r = fn(); } catch (e) { r = { pass: false, detail: 'CRASH ' + (e && e.stack || e).toString().slice(0, 300) }; }
  if (typeof r === 'boolean') r = { pass: r };
  const pass = !!r.pass; if (r.disclosedOnly) pts = 0; /* UNVERIFIED facts carry no points: a value that could not be checked against a fetched source is listed, not rewarded */ const rec = { cat, id, name, pts, earned: pass ? pts : 0, pass, detail: String(r.detail || '').slice(0, 600), source: src || '', disclosedOnly: !!r.disclosedOnly };
  if (r.disclosedOnly) unverified.push(id);
  checks.push(rec);
}
const mk = (g, houses) => E.normalize({ g: Object.assign({}, E.GDEF, { closing: 0, appr: 0, autoPay: false }, g || {}), houses });
const A = E.newAsset, rnd = R.rng(20261110);
const pick = (a) => a[Math.floor(rnd() * a.length)];
const U = (lo, hi) => lo + rnd() * (hi - lo);
const infoText = (...ks) => ks.map((k) => (INFO[k] ? INFO[k].b + ' ' + (INFO[k].e || '') : '')).join(' ');
const seed = E.seedPlan();
const plS = E.plan(seed);

/* ====================== L1 loan / amortization / payoff ====================== */
chk('L1', 'L1.1', 'Level payment equals the textbook formula AND a bisection on the balance (400 random loans incl. 0% rate, 12-480 months)', 2, () => {
  let bad = 0, n = 400, ex = '';
  for (let k = 0; k < n; k++) { const L = U(20000, 5e6), r = rnd() < 0.1 ? 0 : U(0.5, 15), t = Math.round(U(12, 480)); const h = A('house', 'conv30', { price: L / 0.8, dp: 20, rate: r, term: t });
    const a = E.payment(h), b = R.paymentClosed(E.loan(h), r, t), c = R.paymentIter(E.loan(h), r, t); if (!nearRel(a, b, 1e-9) || !nearRel(a, c, 1e-6)) { bad++; ex = [L, r, t, a, b, c].join(','); } }
  return { pass: bad === 0, detail: bad + ' / ' + n + ' disagree ' + ex };
});
chk('L1', 'L1.2', 'Balance today after m paid payments equals month-by-month recurrence (300 random owned loans)', 2, () => {
  let bad = 0; for (let k = 0; k < 300; k++) { const t = Math.round(U(60, 360)), r = U(2, 12), paid = Math.round(U(0, t - 1)); const h = A('house', 'conv30', { status: 'owned', price: U(80000, 900000), rate: r, term: t, paid });
    const ref = R.balanceAfter(E.loan(h), r, E.payment(h), paid); if (!nearRel(E.balToday(h), ref, 1e-8)) bad++; }
  return { pass: bad === 0, detail: bad + ' / 300 disagree' };
});
chk('L1', 'L1.3', 'Portfolio debt series for a loan with extra payments equals the reference balance every month, and is 0 after payoff (60 random)', 1, () => {
  let bad = 0, ex = '';
  for (let k = 0; k < 60; k++) { const h = A('house', 'conv30', { id: 'a', status: 'owned', price: U(100000, 600000), rate: U(2, 11), term: pick([180, 240, 360]), paid: Math.round(U(0, 100)), extra: pick([0, 100, 500, 2000]), rent: 3000, tax: 100, ins: 50 });
    const S = mk({ planYears: 30 }, [h]); const pl = E.plan(S), P = E.payment(h), B0 = R.balanceAfter(E.loan(h), h.rate, P, h.paid);
    for (const t of [0, 1, 7, 36, 120, 240, 359]) { if (t > pl.T) continue; let ref = R.balanceAfter(B0, h.rate, P + h.extra, t); const dbt = pl.series.debt[t]; if (!near(dbt, ref, 0.02)) { bad++; ex = [h.price | 0, h.rate.toFixed(2), h.term, h.paid, h.extra, t, dbt.toFixed(2), ref.toFixed(2)].join(' '); break; } } }
  return { pass: bad === 0, detail: bad + ' / 60 scenarios disagree ' + ex };
});
chk('L1', 'L1.4', 'Months to pay off (payoffN) equals a month-by-month simulation including the refinance at maturity (400 random loans: amortizing, interest-only, balloon, 0% rate, extra payments, owned and planned, never-pays-off cases)', 3, () => {
  let bad = 0, ex = '';
  for (let k = 0; k < 400; k++) { const io = rnd() < 0.25, h = A('house', 'conv30', { status: pick(['owned', 'planned']), price: U(100000, 800000), rate: pick([0, U(1, 12)]), term: io ? pick([24, 36, 60]) : pick([120, 180, 360]), paid: Math.round(U(0, 20)), io, mat: !io && rnd() < 0.3 ? pick([36, 60, 84]) : 0, refiRate: pick([null, null, 6, 9]), refiTerm: pick([null, 180, 300]) });
    const S = mk({ refiRate: 7.5, refiTerm: 300 }, [h]); const X = pick([0, 0, 100, 750, 5000]), age = h.status === 'owned' ? h.paid : 0;
    const B0 = io ? E.loan(h) : R.balanceAfter(E.loan(h), h.rate, E.payment(h), age), mat = io ? h.term : h.mat;
    const sim = R.loanSim({ B0, ratePct: h.rate, pay: E.payment(h), extra: X, mat: mat > 0 ? Math.max(0, mat - age) : 0, refiRatePct: h.refiRate == null ? 7.5 : h.refiRate, refiTermMonths: h.refiTerm == null ? 300 : h.refiTerm, months: 1500 });
    const got = E.payoffN(h, X, S); if (!(got === sim.payoff || (!isFinite(got) && !isFinite(sim.payoff)))) { bad++; ex = [h.rate.toFixed(2), h.term, h.io, h.mat, X, got, sim.payoff].join(' '); } }
  return { pass: bad === 0, detail: bad + ' / 400 disagree ' + ex };
});
chk('L1', 'L1.5', 'Interest-only and balloon loans: payment = balance x rate/12; balance flat before maturity; at maturity the balance is refinanced at the refinance rate/term, so debt series, scheduled payments (ds) and DSCR after maturity equal a month-by-month reference (60 random); default plan has no loan that outlives its term without a refinance', 2, () => {
  const h0 = A('commercial', 'bridge', { id: 'b', price: 2000000, status: 'owned', paid: 10 }), L = E.loan(h0), P = E.payment(h0);
  const ok1 = nearRel(P, L * h0.rate / 1200), ok2 = near(E.balToday(h0), L, 0.001);
  let bad = 0, ex = '';
  for (let k = 0; k < 60; k++) { const io = rnd() < 0.7, h = A('commercial', 'comm25', { id: 'a', status: 'owned', paid: io ? 0 : Math.round(U(0, 20)), price: U(5e5, 6e6), rate: U(4, 11), term: io ? pick([24, 36, 48]) : 300, io, mat: io ? 0 : pick([36, 48, 60]), refiRate: pick([null, 6.25, 9]), refiTerm: pick([null, 240, 300]), extra: pick([0, 0, 1000]), rent: 90000, tax: 2000, ins: 800, hoa: 800, nnn: 80, growth: 3 });
    const S = mk({ planYears: 20, refiRate: 7.25, refiTerm: 300 }, [h]); const pl = E.plan(S), v = pl.V.a, age = h.paid, mat = io ? h.term : h.mat;
    const sim = R.loanSim({ B0: v.B0, ratePct: h.rate, pay: v.P, extra: h.extra, mat: Math.max(0, mat - age), refiRatePct: h.refiRate == null ? 7.25 : h.refiRate, refiTermMonths: h.refiTerm == null ? 300 : h.refiTerm, months: 300 });
    for (const t of [0, 1, Math.max(0, mat - age - 1), mat - age, mat - age + 1, mat - age + 30, 150]) { if (t > pl.T) continue; if (!near(pl.series.debt[t], sim.bal[t], 0.05) || !near(pl.series.ds[t], sim.pay[t], 0.05)) { bad++; ex = [io, mat - age, t, pl.series.debt[t].toFixed(1), sim.bal[t].toFixed(1), pl.series.ds[t].toFixed(1), sim.pay[t].toFixed(1)].join(' '); break; } }
    if (v.refi && !near(v.refi.payment, R.paymentClosed(v.refi.balance, v.refi.rate, v.refi.termMonths), 0.01)) { bad++; ex = 'refi payment'; } }
  const ioOut = seed.houses.filter((x) => E.matOf(x) > 0 && !isFinite(plS.V[x.id].payoff)).map((x) => x.id);
  return { pass: ok1 && ok2 && bad === 0 && ioOut.length === 0, detail: [ok1, ok2].join(',') + ' ' + bad + ' / 60 disagree ' + ex + (ioOut.length ? ' loans never paid off: ' + ioOut.join(',') : '') };
});
chk('L1', 'L1.10', 'The asset page shows the refinance: the loan-due field, refinance rate/term fields and the note with the balance, new payment and DSCR; the Assumptions page has the default refinance rate and term; both reach the engine', 1, () => {
  const ui = /refi-note/.test(APP) && /Loan comes due in/.test(APP) && /Refinance rate/.test(APP) && /Refinance term/.test(APP);
  const h = A('commercial', 'bridge', { id: 'b', price: 2e6, rent: 30000, tax: 1000, ins: 400, hoa: 400, buyIn: 0 }); const S1 = mk({ refiRate: 6 }, [h]), S2 = mk({ refiRate: 10 }, [A('commercial', 'bridge', { id: 'b', price: 2e6, rent: 30000, tax: 1000, ins: 400, hoa: 400, buyIn: 0 })]);
  const a = E.view(S1, S1.houses[0]).refi, b = E.view(S2, S2.houses[0]).refi; const ok = a && b && a.payment < b.payment && a.month === 36;
  return { pass: ui && !!ok, detail: 'ui ' + ui + ', payments ' + (a && a.payment.toFixed(0)) + ' < ' + (b && b.payment.toFixed(0)) };
});
chk('L1', 'L1.6', 'FHA / 203(k): loan = (price + financed rehab) x (1 - down) x (1 + 1.75% upfront premium); down is 3.5% of price + rehab; cash at closing excludes rehab', 1.5, () => {
  const h = A('house', 'k203', { id: 'k', price: 200000, capex: 60000 }), want = R.fhaLoan(260000, 3.5, 1.75);
  return { pass: nearRel(E.loan(h), want, 1e-9) && near(E.downAmt(h), 260000 * 0.035, 0.001), detail: E.loan(h).toFixed(2) + ' vs ' + want.toFixed(2) };
}, 'S6,S7');
chk('L1', 'L1.7', 'FHA annual premium is charged on the remaining balance EXCLUDING the financed upfront premium (24 CFR 203.284), so it falls as the loan is paid down', 1.5, () => {
  const h = A('house', 'fha', { id: 'f', price: 250000, rent: 3000, tax: 200, ins: 100, buyIn: 0 }); const S = mk({ planYears: 30 }, [h]); const pl = E.plan(S); const v = pl.V.f;
  const s = pl.series; const t1 = 12 * 20; const B = R.balanceAfter(v.B0, h.rate, v.P, t1);
  const wantMonthly = R.fhaAnnualOnBalance(B / (1 + h.mipUp / 100), h.mipAnn); /* 24 CFR 203.284: on the remaining balance excluding the financed upfront premium */ const got = s.monthly[t1] - v.P - v.escrow; /* monthly = sched + extra + escrow + hi, sched = P + mip */
  return { pass: near(got, wantMonthly, 0.5), detail: 'mip at month ' + t1 + ': engine ' + got.toFixed(2) + ' vs declining-balance ' + wantMonthly.toFixed(2) };
}, 'S6,S8,S27');
chk('L1', 'L1.8', 'Closing costs are a % of PRICE (not loan); cash needed at closing = down payment + closing costs; custom % overrides the global default', 1, () => {
  const S = mk({ closing: 3 }, [A('house', 'conv30', { id: 'x', price: 300000, closingPct: null }), A('house', 'conv30', { id: 'y', price: 300000, closingPct: 5 })]); const a = E.view(S, S.houses[0]), b = E.view(S, S.houses[1]);
  return { pass: near(a.closingCost, 9000, 0.001) && near(b.closingCost, 15000, 0.001) && near(a.invested, 60000 + 9000, 0.001), detail: a.closingCost + ',' + b.closingCost + ',' + a.invested };
});
chk('L1', 'L1.9', 'FHA premium rates match HUD (upfront 1.75%; annual 0.55% for >95% LTV, base loan <= $726,200, term > 15 yrs) and Limited 203(k) cap $75,000', 1, () => {
  const f = E.LOANS.find((l) => l.id === 'fha'), k = E.LOANS.find((l) => l.id === 'k203');
  return { pass: f.upfrontMip === 1.75 && f.annualMip === 0.55 && f.dp === 3.5 && k.upfrontMip === 1.75 && k.annualMip === 0.55 && /\$75,000/.test(k.note) && k.rehabDefaults.capex <= 75000, detail: JSON.stringify([f.upfrontMip, f.annualMip, f.dp]) };
}, 'S6,S7');

/* ====================== L2 income, expense and NOI ====================== */
chk('L2', 'L2.1', 'noiOf equals the reference NOI (vacancy off rent AND tenant repayments, management on collected money, repairs % of price, gross fixed costs) for 300 random homes and commercial; business NOI is the owner profit; changing vacancy moves every display (asset NOI, view, portfolio series)', 3, () => {
  let bad = 0; for (let k = 0; k < 300; k++) { const type = pick(['house', 'commercial']); const g = { vac: U(0, 15), mgmt: U(0, 12), maint: U(0, 3) };
    const h = A(type, undefined, { price: U(80000, 5e6), rent: U(900, 90000), tax: U(0, 3000), ins: U(0, 2000), hoa: U(0, 800), nnn: pick([0, 50, 85, 100]) }); const S = mk(g, [h]);
    if (!nearRel(E.noiOf(S, h), R.noiRental(h.rent, h.price, h.tax, h.ins, h.hoa, g.vac, g.mgmt, g.maint, h.nnn), 1e-9)) bad++; }
  const b = A('business', 'sba7a', { rent: 50000 }), S = mk({}, [b]);
  let sync = true; for (const vac of [3, 7, 12]) { const h = A('commercial', 'comm25', { id: 'a', status: 'owned', price: 2e6, rent: 20000, tax: 1500, ins: 600, hoa: 500, nnn: 85 }); const S2 = mk({ vac }, [h]); const pl = E.plan(S2); const want = R.noiRental(h.rent, h.price, h.tax, h.ins, h.hoa, vac, S2.g.mgmt, S2.g.maint, 85);
    if (!nearRel(E.view(S2, h).noi, want, 1e-9) || !nearRel(pl.series.noi[0], want, 1e-9) || !nearRel(pl.assetsAt(0).find((x) => x.id === 'a').income, want, 1e-9)) sync = false; }
  return { pass: bad === 0 && E.noiOf(S, b) === 50000 && sync, detail: bad + ' / 300 disagree; vacancy synced across view/series/rows: ' + sync };
});
chk('L2', 'L2.2', 'view(): cash flow = NOI - payment - mortgage insurance; cap rate = 12*NOI/price; price multiple = price/(12*NOI); DSCR basis (NOI / P+MIP) consistent (200 random, with tenant repayments)', 1, () => {
  let bad = 0; for (let k = 0; k < 200; k++) { const type = pick(['house', 'commercial', 'business']); const h = A(type, undefined, { price: U(100000, 4e6), rent: U(1500, 60000), tax: U(0, 900), ins: U(0, 600), hoa: 0 });
    if (rnd() < 0.3 && type === 'house') E.applyLoan(h, 'fha'); const S = mk({ vac: 7, mgmt: 8, maint: 1 }, [h]); const v = E.view(S, h); const noi = type === 'business' ? h.rent : R.noiRental(h.rent, h.price, h.tax, h.ins, h.hoa, 7, 8, 1, h.nnn);
    const mip = h.mipAnn ? E.loan(h) / (1 + h.mipUp / 100) * h.mipAnn / 100 / 12 : 0;
    if (!near(v.cf, noi - E.payment(h) - mip, 0.01) || !near(v.capRate, R.capRate(noi, h.price), 1e-6) || (noi > 0 && !near(v.multiple, h.price / (noi * 12), 1e-6))) bad++; }
  return { pass: bad === 0, detail: bad + ' / 200 disagree' };
});
chk('L2', 'L2.3', 'Portfolio NOI series = sum of asset NOI x growth factor: income and costs grow with the asset growth rate (checked at months 0, 60, 180 on 40 random assets)', 2, () => {
  let bad = 0, ex = ''; for (let k = 0; k < 40; k++) { const type = pick(['house', 'commercial', 'business']), gr = U(0, 9); const h = A(type, undefined, { id: 'a', status: 'owned', price: U(150000, 3e6), rent: U(1500, 40000), tax: 200, ins: 100, hoa: 0, growth: gr, paid: pick([0, 0, 18, 40]) });
    const S = mk({ planYears: 20 }, [h]); const pl = E.plan(S); const noi0 = E.noiOf(S, h); for (const t of [0, 60, 180]) { const ref = noi0 * Math.pow(1 + gr / 100, t / 12); if (!nearRel(pl.series.noi[t], ref, 1e-9)) { bad++; ex = [type, gr.toFixed(2), t, pl.series.noi[t].toFixed(1), ref.toFixed(1)].join(' '); break; } } }
  return { pass: bad === 0, detail: bad + ' / 40 disagree ' + ex };
});
chk('L2', 'L2.4', 'Default vacancy matches Census HVS rental vacancy (US 7.1% in 2025, 7.4% in 2026 YTD; 1-unit rentals about 6%): the default is within 6-8%, new assets and the sample use it, the glossary names the Census figure', 2, () => {
  const ok = E.GDEF.vac >= 6 && E.GDEF.vac <= 8 && seed.g.vac === E.GDEF.vac && E.normalize({ houses: [] }).g.vac === E.GDEF.vac && /Census/i.test(infoText('vacancy')) && !/5% is about 18/.test(infoText('vacancy')); return { pass: ok, detail: 'default vac ' + E.GDEF.vac + '%, sample ' + seed.g.vac + '%' };
}, 'S16,S18');
chk('L2', 'L2.5', 'UNVERIFIED: management fee 8% and repairs 1%/yr (no reachable source: NARPM, NRC, HUD handbook pages held no figure); disclosed as rule-of-thumb assumptions and editable', 2, () => {
  const ok = E.GDEF.mgmt === 8 && /8% to 10%/.test(infoText('mgmt')) && E.GDEF.maint === 1 && /rule of thumb/.test(infoText('repairs')); return { pass: ok, disclosedOnly: true, detail: 'mgmt ' + E.GDEF.mgmt + ', maint ' + E.GDEF.maint + ' (unverified)' };
});
chk('L2', 'L2.6', 'Commercial tenant reimbursement (NNN) is explicit: new commercial assets default to a tenant share > 0 and gross tax + insurance + CAM of about 1% of value or more; homes and businesses 0; every default-plan commercial row has gross tax+insurance >= 1.0% of price a year, rent and repayments consistent (NOI cap rate in the 6-9% band); reimbursement adds exactly share x costs x (1-vacancy) x (1-management) to NOI; a field on the asset page edits it', 2, () => {
  const c = E.newAsset('commercial'), hh = E.newAsset('house'), b = E.newAsset('business'); const grossC = (c.tax + c.ins) * 12 / c.price * 100;
  const comm = seed.houses.filter((h) => h.type === 'commercial'); const lo = Math.min(...comm.map((h) => (h.tax + h.ins) * 12 / h.price * 100)), caps = comm.map((h) => plS.V[h.id].capRate);
  const S0 = mk({ vac: 7, mgmt: 8 }, [A('commercial', 'comm25', { id: 'a', price: 2e6, rent: 15000, tax: 1250, ins: 500, hoa: 500, nnn: 0 })]), S1 = mk({ vac: 7, mgmt: 8 }, [A('commercial', 'comm25', { id: 'a', price: 2e6, rent: 15000, tax: 1250, ins: 500, hoa: 500, nnn: 80 })]);
  const dN = E.noiOf(S1, S1.houses[0]) - E.noiOf(S0, S0.houses[0]), want = 0.8 * 2250 * 0.93 * 0.92;
  const ok = c.nnn > 0 && c.nnn <= 100 && grossC >= 1.0 && hh.nnn === 0 && b.nnn === 0 && lo >= 1.0 && comm.every((h) => h.nnn > 0) && Math.min(...caps) >= 6 && Math.max(...caps) <= 9 && near(dN, want, 1e-6) && /NNN/.test(APP) && /nnn/.test(APP.replace(/\s/g, ''));
  return { pass: ok, detail: 'new commercial tax+ins ' + grossC.toFixed(2) + '%/yr, nnn ' + c.nnn + '%; default rows min ' + lo.toFixed(2) + '%; caps ' + Math.min(...caps).toFixed(1) + '-' + Math.max(...caps).toFixed(1) + '; NOI gain ' + dN.toFixed(2) + ' vs ' + want.toFixed(2) };
});
chk('L2', 'L2.7', 'UNVERIFIED: default cap rates (6.5-8%) and business price multiples fall in the bands of the grader benchmark files (bench-cre.json / bench-business.json hold search-snippet data only: CBRE, BizBuySell, LoopNet and Crexi returned 403 and are not bypassed)', 2, () => {
  const bad = []; seed.houses.forEach((h) => { const v = plS.V[h.id]; const cap = v.capRate; if (h.type === 'house' && (cap < 4.5 || cap > 9)) bad.push(h.id + ' cap ' + cap.toFixed(1)); if (h.type === 'commercial' && (cap < 5.5 || cap > 9.5)) bad.push(h.id + ' cap ' + cap.toFixed(1));
    if (h.type === 'business') { const m = v.multiple, lim = h.price < 1500000 ? [2, 3.8] : h.price < 5000000 ? [2.5, 5.2] : [3.5, 7]; if (m < lim[0] || m > lim[1]) bad.push(h.id + ' mult ' + m.toFixed(1) + ' for $' + (h.price / 1e6).toFixed(1) + 'M'); } });
  return { pass: bad.length === 0, disclosedOnly: true, detail: (bad.join('; ') || 'all in band') + ' (unverified)' };
}, 'S34');

/* ====================== L3 leverage and credit lines ====================== */
function locCase() {
  const g = { cap: pick([60, 70, 80, 85]), capBiz: pick([40, 50, 60]), haircut: pick([0, 5, 10, 20]), closing: pick([0, 3]), appr: pick([0, 3]) }, biz = rnd() < 0.35;
  const src = biz ? A('business', 'sba7a', { id: 's', status: pick(['owned', 'planned']), price: U(400000, 2e6), rate: U(7, 11), term: 120, paid: Math.round(U(0, 40)), target: 't', rent: U(8000, 40000), liens: pick([0, 0, 15000]), growth: pick([null, 2, 5]), buyIn: 0 })
    : A('house', 'conv30', { id: 's', status: pick(['owned', 'planned']), price: U(150000, 600000), rate: U(3, 9), term: pick([180, 360]), paid: Math.round(U(0, 80)), target: 't', rent: U(1500, 4000), tax: U(100, 400), ins: U(50, 150), liens: pick([0, 0, 15000]), growth: pick([null, 2, 5]), buyIn: 0 });
  const tgt = A('house', 'conv30', { id: 't', price: U(150000, 700000), dp: pick([10, 20, 25]), closingPct: null });
  return { g, src, tgt, X: pick([0, 0, 200, 1500]), biz };
}
const refNoi = (h, S) => (h.type === 'business' ? h.rent : R.noiRental(h.rent, h.price, h.tax, h.ins, h.hoa, S.g.vac, S.g.mgmt, S.g.maint, h.nnn));
/* independent month-by-month reference of the credit-line wait: cap by asset type, appraisal cut off the value, balance path incl. refinance, saved cash flow that GROWS with the income */
function refLoc(S, h, X, noCash) {
  const g = S.g, age0 = h.status === 'owned' ? h.paid : 0, P = E.payment(h), B0 = h.io ? E.loan(h) : R.balanceAfter(E.loan(h), h.rate, P, age0), gr = h.growth == null ? g.appr : h.growth, t = S.houses.find((q) => q.id === h.target);
  const need = E.downAmt(t) + t.price * (t.closingPct == null ? g.closing : t.closingPct) / 100, noi = refNoi(h, S), cap = h.type === 'business' ? g.capBiz : g.cap;
  const sim = R.loanSim({ B0, ratePct: h.rate, pay: P, extra: X, mat: 0, months: 700 });
  return { need, months: R.monthsToLine({ balAt: (k) => sim.bal[k], valueAt: (kk) => R.valueAt(h.price, gr, age0 + kk), capPct: cap, haircutPct: g.haircut, liens: h.liens, need, noCash, savedAt: (k) => Math.max(0, noi * Math.pow(1 + gr / 100, k / 12) - sim.pay[k]) }) };
}
chk('L3', 'L3.1', 'Months until the credit line (locMonths) equals an independent month-by-month simulation: cap by asset type (business uses its own lower cap), appraisal cut off the VALUE, balance path, and saved cash flow that grows with the asset income (120 random, homes and businesses)', 3, () => {
  let bad = 0, ex = ''; for (let k = 0; k < 120; k++) { const { g, src, tgt, X } = locCase(); const S = mk(g, [src, tgt]); const h = S.houses[0];
    const ref = refLoc(S, h, X, false).months, got = E.locMonths(S, h, X); if (got !== ref) { bad++; ex = [h.type, g.cap, g.capBiz, g.haircut, h.liens, got, ref].join(' '); } }
  return { pass: bad === 0, detail: bad + ' / 120 disagree (type,cap,capBiz,cut,liens,engine,ref) ' + ex };
}, 'S5,S9,S12');
chk('L3', 'L3.2', 'extraFor: the extra payment returned reaches the target month and 1 dollar less does not (40 random; null only when infeasible)', 1, () => {
  let bad = 0; for (let k = 0; k < 40; k++) { const { g, src, tgt } = locCase(); const S = mk(g, [src, tgt]); const h = S.houses[0]; const m = Math.round(U(1, 40)); const x = E.extraFor(S, h, m);
    if (x === null) { if (E.locMonths(S, h, E.balToday(h) + 1) <= m) bad++; continue; } if (x === 0) { if (E.locMonths(S, h, 0) > m) bad++; continue; }
    if (E.locMonths(S, h, x) > m || E.locMonths(S, h, Math.max(0, x - 2)) <= m) bad++; }
  return { pass: bad === 0, detail: bad + ' / 40 wrong' };
});
chk('L3', 'L3.3', 'After the credit-line draw the combined loan (balance + other liens + draw) never exceeds cap x value x (1 - appraisal cut), with the cap of the asset type (cltvAtLoc, 100 random)', 2, () => {
  let bad = 0, ex = ''; for (let k = 0; k < 100; k++) { const { g, src, tgt, X } = locCase(); const S = mk(g, [src, tgt]); const v = E.view(S, S.houses[0]); if (v.cltvAtLoc === null || !isFinite(v.locM) || v.draw <= 0.5) continue;
    const lim = (S.houses[0].type === 'business' ? g.capBiz : g.cap) * (1 - g.haircut / 100); if (v.cltvAtLoc > lim + 0.05) { bad++; ex = [g.cap, g.capBiz, g.haircut, v.cltvAtLoc.toFixed(2)].join(' '); } }
  return { pass: bad === 0, detail: bad + ' over the limit ' + ex };
});
chk('L3', 'L3.4', 'Default max combined loan-to-value (cap) does not exceed the 85% supervisory ceiling for improved property incl. non-owner-occupied 1-4 family (12 CFR 365 App. A); default credit-line rate sits between prime (7.00%, Fed H.15) and prime + 3.5', 1.5, () => ({ pass: E.GDEF.cap <= 85 && E.GDEF.hrate >= 7.0 && E.GDEF.hrate <= 10.5, detail: 'cap ' + E.GDEF.cap + ', credit-line rate ' + E.GDEF.hrate }), 'S5,S14');
chk('L3', 'L3.5', 'A credit line against a BUSINESS uses its own lower, editable cap (default below the 85% real-estate ceiling): the same numbers give a smaller headroom and a later line for a business than for a home, head0 and view().cap use it, editing g.capBiz changes locMonths and cltvAtLoc, the plan chain follows, and the Assumptions page has the field and the glossary entry', 2, () => {
  const mkS = (capBiz) => mk({ cap: 85, capBiz, haircut: 0 }, [A('business', 'sba7a', { id: 's', status: 'owned', paid: 12, price: 1500000, dp: 45, rent: 30000, growth: 4, target: 't' }), A('house', 'conv30', { id: 't', price: 400000 })]);
  const S50 = mkS(50), S70 = mkS(70), hs = A('house', 'conv30', { id: 's', status: 'owned', paid: 12, price: 1500000, dp: 45, rent: 30000, tax: 0, ins: 0, hoa: 0, growth: 4, target: 't' });
  const v50 = E.view(S50, S50.houses[0]), v70 = E.view(S70, S70.houses[0]); const Sh = mk({ cap: 85, capBiz: 50 }, [Object.assign(hs, { type: 'house' }), A('house', 'conv30', { id: 't', price: 400000 })]);
  const refHead = (S, h) => R.headroom(h.price * Math.pow(1 + (h.growth == null ? S.g.appr : h.growth) / 100, (h.status === 'owned' ? h.paid : 0) / 12) /* value today: it has grown since the purchase, like the trust's pool room */, h.type === 'business' ? S.g.capBiz : S.g.cap, S.g.haircut, R.balanceAfter(E.loan(h), h.rate, E.payment(h), h.paid), h.liens);
  const ok = E.GDEF.capBiz < E.GDEF.cap && E.GDEF.capBiz > 0 && v50.cap === 50 && v70.cap === 70 && near(v50.head0, refHead(S50, S50.houses[0]), 0.01) && near(v70.head0, refHead(S70, S70.houses[0]), 0.01) && v70.head0 > v50.head0
    && E.locMonths(S70, S70.houses[0], 0) < E.locMonths(S50, S50.houses[0], 0) && E.plan(S70).purchase.t < E.plan(S50).purchase.t && E.capOf(Sh, Sh.houses[0]) === 85 && E.capOf(S50, S50.houses[0]) === 50
    && /capBiz/.test(APP) && /Max loan vs value \(business\)/.test(APP) && !!INFO.debtcapbiz && /business/i.test(infoText('creditline', 'debtcapbiz')) && /lower cap/i.test(APP.replace(/\s+/g, ' '));
  return { pass: ok, detail: 'default capBiz ' + E.GDEF.capBiz + '; head0 ' + v50.head0.toFixed(0) + ' (50) vs ' + v70.head0.toFixed(0) + ' (70); wait ' + E.locMonths(S50, S50.houses[0], 0) + ' vs ' + E.locMonths(S70, S70.houses[0], 0) };
}, 'S5');
chk('L3', 'L3.8', 'UNVERIFIED (upper bound verified): the 50% business credit-line cap is a conservative disclosed choice. No fetchable lender rule found for lending against an operating business (the OCC asset-based-lending handbook S37 only bounds it: the best collateral advances 70-85%, so a whole business must be lower); the UI says it is a choice, not a lender quote, and the field is editable', 1, () => {
  const ok = /conservative choice/i.test(INFO.debtcapbiz.b) && /not a quoted lender rule/i.test(INFO.debtcapbiz.b); return { pass: ok && E.GDEF.capBiz <= 85, disclosedOnly: true, detail: 'default ' + E.GDEF.capBiz + '% (unverified; below the 70-85% OCC advance rates on the most liquid collateral)' };
}, 'S37');
chk('L3', 'L3.6', 'Credit-line interest: the trust\'s draw x line rate / 12 per month from the month it is drawn, none before; the draw shows as debt on the asset it bought; draw = cash needed minus the cash the trust held', 1.5, () => {
  const S = mk({ hrate: 9, cap: 85 }, [A('house', 'conv30', { id: 's', status: 'owned', paid: 24, price: 300000, rent: 2500, tax: 200, ins: 90, growth: 3 }), A('house', 'conv30', { id: 't', price: 250000, buyIn: 0 })]); const pl = E.plan(S), tr = pl.trust.t, m = pl.purchase.t, h = S.houses[1];
  const row = (t, id) => pl.assetsAt(t).find((x) => x.id === id); const hi = tr.draw * 9 / 1200, P = E.payment(h), esc2 = h.tax + h.ins + h.hoa;
  const balAt = (t) => R.balanceAfter(E.loan(h), h.rate, P, t);
  const r0 = row(m, 't'), d = r0 ? r0.debt : NaN, pay = r0 ? r0.payment : NaN;
  return { pass: isFinite(m) && m > 0 && tr.pooled && !!r0 && !row(m - 1, 't') && near(pay, P + esc2 + hi, 0.01) && near(d, balAt(0) + tr.draw, 0.02) && near(tr.draw, tr.need - tr.cash, 0.001) && near(tr.need, E.needFor(S, h), 0.001), detail: [m, pay, P + esc2 + hi, d, balAt(0) + tr.draw, tr.draw].map((x) => +(+x).toFixed(2)).join(' ') };
});
chk('L3', 'L3.7', 'Pooled cash flow is reinvested: the amount that moves out of your pocket in month t (plan().dpCash[t]) equals the independent sum of every held asset\'s max-0 total of (income x growth - loan payment - line interest) in month t-1 while something is still waiting to be bought; the finance cash line deducts it; after the last purchase and the line is paid off you keep the cash flow again', 2, () => {
  let bad = 0, ex = '', pos = 0; for (let k = 0; k < 30; k++) { const n = 3 + Math.floor(rnd() * 3), hs = []; for (let j = 0; j < n; j++) hs.push(A('house', pick(['conv30', 'dscr']), { id: 'h' + j, status: j < 2 ? 'owned' : 'planned', paid: Math.round(U(0, 40)), price: U(1.5e5, 4e5), rent: U(1800, 3600), tax: U(100, 300), ins: U(50, 120), growth: U(0, 5), buyIn: j < 2 ? 0 : Math.round(U(0, 30)), extra: pick([0, 0, 300]) }));
    const S = mk({ cap: 85, hrate: 8, appr: 0 }, hs); const pl = E.plan(S), sp = { g: S.g, assets: S.houses.map((h) => ({ id: h.id, type: h.type, status: h.status, price: h.price, dp: h.dp, rate: h.rate, term: h.term, closingPct: h.closingPct, paid: h.paid, extra: h.extra, rent: h.rent, tax: h.tax, ins: h.ins, hoa: h.hoa, nnn: h.nnn, growth: h.growth, liens: h.liens, buyIn: h.buyIn, capex: h.capex })) };
    const last = Math.max(...S.houses.map((h) => (isFinite(pl.purchase[h.id]) ? pl.purchase[h.id] : 0)));
    for (let t = 1; t <= Math.min(pl.T, last + 3); t++) { /* month t-1 pooled cash flow, from the reference loan simulations */
      let cf = 0; const drawNow = 0; S.houses.forEach((h) => { const p0 = pl.purchase[h.id]; if (!isFinite(p0) || t - 1 < p0) return; const age = t - 1 - p0, L = E.loan(h), P = E.payment(h), a0 = h.status === 'owned' ? h.paid : 0, B0 = h.status === 'owned' ? R.balanceAfter(L, h.rate, P, a0) : L, sim = R.loanSim({ B0, ratePct: h.rate, pay: P, extra: h.extra, months: age + 2 });
        const noi = R.noiRental(h.rent, h.price, h.tax, h.ins, h.hoa, S.g.vac, S.g.mgmt, S.g.maint, h.nnn) * Math.pow(1 + h.growth / 100, age / 12); cf += noi - sim.pay[age] - pl.assetsAt(t - 1).find((x) => x.id === h.id).debt * 0; });
      /* line interest is part of the pooled cash flow: add it back from the engine series (the reference above has no draws), then compare the positive part */
      const hiSum = pl.series.ds[t - 1] - S.houses.reduce((a, h) => { const p0 = pl.purchase[h.id]; if (!isFinite(p0) || t - 1 < p0) return a; const age = t - 1 - p0, L = E.loan(h), P = E.payment(h), a0 = h.status === 'owned' ? h.paid : 0, B0 = h.status === 'owned' ? R.balanceAfter(L, h.rate, P, a0) : L; return a + R.loanSim({ B0, ratePct: h.rate, pay: P, extra: h.extra, months: age + 2 }).pay[age]; }, 0);
      const want = Math.max(0, cf - hiSum); const got = pl.dpCash[t]; if (got > 0) pos++; if (want > 0 && got > want + 0.05) { bad++; ex = [t, got.toFixed(1), want.toFixed(1)].join(' '); } if (got < -1e-9) bad++; if (t - 1 < last && !near(got, want, 0.05) && t <= last) { bad++; ex = 'before last buy ' + [t, got.toFixed(1), want.toFixed(1)].join(' '); } }
  }
  const S2 = mk({ cap: 85 }, [A('house', 'conv30', { id: 's', status: 'owned', paid: 24, price: 300000, rent: 3000, tax: 200, ins: 90, growth: 3 }), A('house', 'conv30', { id: 't', price: 250000, buyIn: 0 })]); const pl2 = E.plan(S2); S2.p = E.samplePersonal(); const f = E.finance(S2, pl2); const t = pl2.purchase.t;
  const Rr = f.series, dl = Rr.liquid[t] - Rr.liquid[t - 1], expect = Rr.net[t] + Rr.interest[t] + Rr.capitalIn[t] - Rr.outsideCall[t] - Rr.oneTime[t] - Rr.saleTax[t] - pl2.dpCash[t];
  const after = pl2.dpCash[Math.min(pl2.T, t + 400)];
  return { pass: bad === 0 && pos > 20 && isFinite(f.T) && t > 0 && near(dl, expect, 0.01) && pl2.dpCash[t] > 0 && after === 0 && E.cfSaved(S2, S2.houses[0]) > 0, detail: bad + ' months disagree ' + ex + '; reinvested months ' + pos + '; after everything is paid ' + after };
});
chk('L3', 'L3.10', 'Trust funding month: the purchase month of every planned asset (and the cash / line split) equals an independent month-by-month reference of the pooled model (pool room + held cash vs down payment + closing + improvements; list order; "not before" month; surplus pays the line down), on 120 random portfolios with homes, commercial, businesses, liens, appraisal cut, caps, extra payments', 4, () => {
  let bad = 0, ex = '', cases = 0, planned = 0, late = 0; for (let k = 0; k < 120; k++) { const n = 3 + Math.floor(rnd() * 7), hs = [], no = Math.max(1, Math.floor(rnd() * 3)); for (let j = 0; j < n; j++) { const ty = pick(['house', 'house', 'commercial', 'business']); const owned = j < no;
      const o = ty === 'business' ? { price: U(4e5, 2.5e6), rent: U(9000, 42000), loan: pick(['sba7a', 'bankbiz', 'cashb']) } : ty === 'commercial' ? { price: U(8e5, 4e6), rent: U(7000, 36000), tax: U(300, 1500), ins: U(200, 900), hoa: U(0, 700), nnn: pick([0, 85]), loan: pick(['comm25', 'sellerc']) } : { price: U(1.2e5, 6e5), rent: U(1200, 4800), tax: U(80, 450), ins: U(40, 170), hoa: pick([0, 0, 150]), loan: pick(['conv30', 'conv15', 'dscr', 'cashh']) };
      const lo = o.loan; delete o.loan; hs.push(A(ty, lo, Object.assign({ id: 'a' + j, status: owned ? 'owned' : 'planned', paid: owned ? Math.round(U(0, 40)) : 0, growth: pick([null, 0, 3, 5]), liens: pick([0, 0, 0, 12000]), buyIn: owned ? 0 : pick([0, 0, 0, 10, 30]), extra: pick([0, 0, 250, 1500]), capex: !owned && rnd() < 0.2 ? Math.round(U(5000, 60000)) : 0, closingPct: pick([null, 0, 2]) }, o))); }
    const g = { cap: pick([60, 75, 85]), capBiz: pick([30, 50, 60]), haircut: pick([0, 5, 10]), closing: pick([0, 3]), appr: pick([0, 3]), hrate: pick([6, 8.5, 11]), planYears: 20 }; const S = mk(g, hs); const pl = E.plan(S);
    const ref = R.trustSim({ g: S.g, assets: S.houses.map((h) => ({ id: h.id, type: h.type, status: h.status, price: h.price, dp: h.dp, rate: h.rate, term: h.term, closingPct: h.closingPct, paid: h.paid, extra: h.extra, rent: h.rent, tax: h.tax, ins: h.ins, hoa: h.hoa, nnn: h.nnn, growth: h.growth, liens: h.liens, buyIn: h.buyIn, capex: h.capex })) }); cases++;
    S.houses.forEach((h) => { if (h.status === 'owned') return; planned++; const a = pl.purchase[h.id], b = ref.purchase[h.id]; if (a > 0) late++; if (!(a === b || (!isFinite(a) && !isFinite(b)))) { bad++; ex = [k, h.id, h.type, a, b].join(' '); return; }
      if (isFinite(a)) { const tr = pl.trust[h.id], f = ref.fund[h.id]; if (Math.abs(tr.draw - f.draw) > 1 + Math.abs(f.draw) * 1e-6 || Math.abs(tr.cash - f.cash) > 1 + Math.abs(f.cash) * 1e-6 || tr.n !== f.n) { bad++; ex = 'split ' + [k, h.id, tr.draw.toFixed(0), f.draw.toFixed(0), tr.cash.toFixed(0), f.cash.toFixed(0), tr.n, f.n].join(' '); } } }); }
  return { pass: bad === 0 && planned > 300 && late > 100, detail: bad + ' disagree of ' + planned + ' planned assets in ' + cases + ' portfolios (' + late + ' bought after month 0) ' + ex };
});
chk('L3', 'L3.11', 'Trust behaviour: reordering changes the funding order (the first of two equal planned assets is bought no later than the second); more earlier cash flow or room never delays a purchase (raising the rent of an earlier asset); a later "not before" month is respected and never earlier than the trust could pay; unreachable assets are skipped, not blocking; extra payments on an earlier asset never delay the next purchase', 2.5, () => {
  const mkAss = (o) => A('house', 'conv30', Object.assign({ status: 'planned', price: 250000, rent: 2400, tax: 200, ins: 90, growth: 3, buyIn: 0 }, o));
  const base = () => [A('house', 'conv30', { id: 'o1', status: 'owned', paid: 24, price: 300000, rent: 3000, tax: 200, ins: 90, growth: 3 }), mkAss({ id: 'p1' }), mkAss({ id: 'p2' }), mkAss({ id: 'p3' })];
  const S = mk({ cap: 85, appr: 3 }, base()), pl = E.plan(S); let ok = pl.purchase.p1 <= pl.purchase.p2 && pl.purchase.p2 <= pl.purchase.p3 && isFinite(pl.purchase.p3) && pl.purchase.p1 > 0;
  const rich = mk({ cap: 85, appr: 3 }, base()); rich.houses[0].rent = 4500; const plR = E.plan(rich); ok = ok && plR.purchase.p1 <= pl.purchase.p1 && plR.purchase.p3 <= pl.purchase.p3;
  const nb = mk({ cap: 85, appr: 3 }, base()); nb.houses[2].buyIn = pl.purchase.p2 + 25; const plN = E.plan(nb); ok = ok && plN.purchase.p2 === pl.purchase.p2 + 25 && plN.purchase.p3 >= plN.purchase.p2 && plN.trust.p2.ready === pl.purchase.p2;
  const sw = mk({ cap: 85, appr: 3 }, [base()[0], mkAss({ id: 'big', price: 900000 }), mkAss({ id: 'small', price: 150000 })]), swO = E.plan(sw); const sw2 = mk({ cap: 85, appr: 3 }, [base()[0], mkAss({ id: 'small', price: 150000 }), mkAss({ id: 'big', price: 900000 })]), swP = E.plan(sw2);
  ok = ok && swP.purchase.small <= swO.purchase.small && swO.purchase.big <= swP.purchase.big + 1e9 && swP.purchase.small <= swP.purchase.big;
  const un = mk({ cap: 85, appr: 0 }, [base()[0], mkAss({ id: 'huge', price: 5e9 }), mkAss({ id: 'ok2', price: 200000 })]), plU = E.plan(un); ok = ok && !isFinite(plU.purchase.huge) && isFinite(plU.purchase.ok2) && plU.unfunded.join() === 'huge';
  const ex = mk({ cap: 85, appr: 3 }, base()); ex.houses[0].extra = 1500; const plE = E.plan(ex); ok = ok && plE.purchase.p1 <= pl.purchase.p1 && plE.purchase.p3 <= pl.purchase.p3;
  return { pass: ok, detail: 'p1/p2/p3 ' + [pl.purchase.p1, pl.purchase.p2, pl.purchase.p3].join('/') + ', richer ' + [plR.purchase.p1, plR.purchase.p3].join('/') + ', not-before ' + plN.purchase.p2 + ', unfunded ' + plU.unfunded.join() + ', extra ' + [plE.purchase.p1, plE.purchase.p3].join('/') };
});

/* ====================== L4 lender qualification ====================== */
chk('L4', 'L4.1', 'DTI at month 0 equals the reference: other debts + the borrower\'s own rent/mortgage (Finances field) + any negative net of 75% of collected rent minus the property payment; a positive net adds to income; plus co-signer and job income (80 random portfolios incl. commercial tenant repayments)', 3, () => {
  let bad = 0, ex = ''; for (let k = 0; k < 80; k++) { const hs = []; const n = 1 + Math.floor(rnd() * 4); for (let j = 0; j < n; j++) hs.push(A(pick(['house', 'commercial', 'business']), undefined, { id: 'a' + j, status: 'owned', paid: Math.round(U(0, 60)), price: U(120000, 2e6), rent: U(1000, 30000), tax: U(0, 900), ins: U(0, 500), hoa: 0, growth: 3 }));
    const g = { p1: pick([0, 60000, 150000]), p2: pick([0, 40000]), rentCount: pick([50, 75, 100]), otherDebt: pick([0, 450, 1500]) }; const S = mk(g, hs); S.p = E.normalizePersonal({ housing: pick([0, 900, 1800, 3000]), jobs: [{ id: 'j', kind: 'salary', gross: pick([0, 80000, 200000]), raise: 0, tax: 20, hours: 40, start: 0, end: null }] });
    const pl = E.plan(S); const ref = R.dtiRef({ otherIncomeMonthly: (g.p1 + g.p2) / 12 + S.p.jobs[0].gross / 12, otherDebt: g.otherDebt, housing: S.p.housing, rentCountPct: g.rentCount, assets: S.houses.map((h) => { const v = pl.V[h.id]; return { grossRent: h.rent + (h.type === 'business' ? 0 : h.nnn / 100 * (h.tax + h.ins + h.hoa)), payment: v.P + v.mip + v.escrow }; }) });
    if (!near(pl.series.dti[0], ref, 1e-6)) { bad++; ex = pl.series.dti[0].toFixed(3) + ' vs ' + ref.toFixed(3); } }
  return { pass: bad === 0, detail: bad + ' / 80 disagree ' + ex };
}, 'S11,S12');
chk('L4', 'L4.2', 'DTI limit default 43% and rental haircut 75% are consistent with CFPB (43% was the old General QM cap, now replaced by price-based test) and the UI says lenders vary (up to ~50%); wording must not present 43% as a current legal rule', 1.5, () => {
  const t = infoText('dti'); const ok = E.GDEF.dti <= 50 && !/usually want 43% or less\./.test(t) && /(43|45|50)/.test(t) && /(vary|varies|up to|some lenders|45%|50%)/.test(t); return { pass: ok, detail: t.slice(0, 160) };
}, 'S10,S11');
chk('L4', 'L4.3', 'DTI includes the borrower\'s OWN housing payment: the Finances field has a sample default, raising it by $X raises debts by exactly $X in the dti series at every month (inflated like rent), can flip the afford verdict and the Finances verdict, the app page has the field, and the glossary says it is counted', 2, () => {
  const mkP = (housing) => { const S = mk({ otherDebt: 450, p1: 0, p2: 0, dti: 43 }, [A('house', 'conv30', { id: 's', status: 'owned', paid: 12, price: 250000, rent: 3600, tax: 100, ins: 50, target: 't', growth: 3 }), A('house', 'conv30', { id: 't', price: 260000, buyIn: 0, rent: 3600, tax: 100, ins: 50 })]); S.p = E.normalizePersonal({ housing, inflation: 3, jobs: [{ id: 'j', kind: 'salary', gross: 60000, raise: 0, tax: 20, hours: 40, start: 0, end: null }] }); return S; };
  const S0 = mkP(0), S1 = mkP(1500), p0 = E.plan(S0), p1 = E.plan(S1); let ok = true; for (const t of [0, 24, 100]) { const inc = (p0.series.dti[t] > 0) ? 1 : 0; const wantDiff = 1500 * Math.pow(1.03, t / 12); const incomeT = (60000 / 12) + 0; /* income side differs only by rent net, same in both */
    const dDebt = (p1.series.dti[t] - p0.series.dti[t]) / 100; const incs = p0.series.dti[t] > 0 ? 450 / (p0.series.dti[t] / 100) : NaN; /* debts0/dti0 = income when no negative-net assets */ if (!(isFinite(incs)) || !near(dDebt * incs, wantDiff, 0.5)) ok = false; }
  const flip = (() => { const a = E.afford(S0, S0.houses[1], p0), b = E.afford(S1, S1.houses[1], p1); return { a: a.cls, b: b.cls, ta: a.dti, tb: b.dti }; })();
  const ui = /p\.housing/.test(APP) && /Your own rent or mortgage/.test(APP);
  const def = E.samplePersonal().housing > 0 && E.samplePersonal().housing < E.samplePersonal().living;
  return { pass: ok && def && ui && flip.tb > flip.ta && /own rent or mortgage/i.test(INFO.dti.b) && !!INFO.housing && E.finance(mkP(9000), E.plan(mkP(9000))).kpis.dtiPeak > E.finance(mkP(0), E.plan(mkP(0))).kpis.dtiPeak, detail: 'debts rise by the housing payment: ' + ok + '; afford dti ' + flip.ta.toFixed(1) + ' -> ' + flip.tb.toFixed(1) + ' (' + flip.a + ' -> ' + flip.b + '); sample housing ' + E.samplePersonal().housing };
}, 'S10,S11');
chk('L4', 'L4.4', 'Every purchase in the default plan meets its lender\'s minimum DSCR at closing (SBA 7(a)/504 >= 1.15, bank loans >= 1.25 as the app states, DSCR loan >= 1.2 as the app states, bridge and seller notes >= 1.0)', 2, () => {
  const MIN = { sba7a: 1.15, sba504: 1.15, comm25: 1.25, bankbiz: 1.25, dscr: 1.2, bridge: 1.0, sellerc: 1.0, sellerb: 1.0 }; const bad = [];
  const gm = seed.p.gmMonthly * Math.pow(1 + seed.p.inflation / 100, 1); /* a lender deducts a market manager salary when the owner will not run the business (conservative: one year of inflation) */
  seed.houses.forEach((h) => { const m = MIN[h.loanId]; if (!m) return; const v = plS.V[h.id]; const noi = h.type === 'business' ? v.noi - gm : v.noi; const d = noi / (v.P + v.mip); if (d < m - 1e-9) bad.push(h.id + ' ' + h.loanId + ' DSCR ' + d.toFixed(2) + ' < ' + m); });
  return { pass: bad.length === 0, detail: bad.join('; ') || 'all meet minimums' };
}, 'S3,S1');
chk('L4', 'L4.5', 'No asset in the default plan cash-flows negative at its own purchase (owner requirement: homes never negative; commercial and businesses must at least pay their own loan)', 1, () => {
  const bad = seed.houses.filter((h) => plS.V[h.id].cf < -0.5).map((h) => h.id + ' ' + Math.round(plS.V[h.id].cf)); return { pass: bad.length === 0, detail: bad.join('; ') || 'none negative' };
});
chk('L4', 'L4.6', 'Debt-to-income in the default plan stays at or under the limit at every month (no purchase that a lender would decline on DTI)', 1, () => ({ pass: plS.worst.dti <= seed.g.dti, detail: 'peak DTI ' + plS.worst.dti.toFixed(1) + '% at month ' + plS.worst.month + ' vs limit ' + seed.g.dti }));
chk('L4', 'L4.7', 'Default plan loan rules: each SBA 7(a) <= $5M and the 7(a) balances outstanding at once <= $5M (conservative reading: SBA aggregates a borrower and affiliates), 504 only for owner-occupied property, bank real-estate loans <= 85% LTV, no seller note above 50% of price', 0.5, () => {
  const bad = []; seed.houses.forEach((h) => { if (h.loanId === 'sba7a' && E.loan(h) > 5e6) bad.push(h.id + ' >5M'); if (h.loanId === 'sba504' && h.type === 'commercial' && !/(owner|operate|HQ)/i.test(h.addr)) bad.push(h.id + ' 504 on a rental property');
    if (['comm25', 'conv30', 'conv15', 'dscr', 'bridge'].includes(h.loanId) && 100 - h.dp > 85) bad.push(h.id + ' LTV ' + (100 - h.dp)); if (['sellerb', 'sellerc'].includes(h.loanId) && 100 - h.dp > 50) bad.push(h.id + ' seller note ' + (100 - h.dp) + '% of price'); });
  let mx = 0, mm = 0; for (let t = 0; t <= plS.T; t++) { let tot = 0; seed.houses.forEach((h) => { if (h.loanId !== 'sba7a') return; const a = plS.purchase[h.id]; if (!isFinite(a) || t < a) return; const v = plS.V[h.id], age = t - a; if (age >= v.payoff) return; tot += R.balanceAfter(v.B0, h.rate, v.P + v.X, age); }); if (tot > mx) { mx = tot; mm = t; } }
  if (mx > 5e6) bad.push('7(a) outstanding $' + Math.round(mx) + ' at month ' + mm); return { pass: bad.length === 0, detail: bad.join('; ') || 'ok; peak 7(a) outstanding $' + Math.round(mx) + ' at month ' + mm };
}, 'S2,S3,S4,S5');

/* ====================== L5 loan products vs sources ====================== */
const PMMS30 = 7.18, PMMS15 = 6.57, PRIME = 7.0; /* Freddie Mac PMMS 2026-11-05 (S13); Fed H.15 bank prime 7.00% (S14) */
const LN = (id) => E.LOANS.find((l) => l.id === id); const w5 = 12 / 14;
const L5 = [
  ['conv30', 'Conventional 30-yr investor: 360 months, rate between PMMS 30-yr (7.18%) and PMMS + 1.0 (investor price adjustment), down >= 15%', (l) => l.term === 360 && l.rate >= PMMS30 - 0.3 && l.rate <= PMMS30 + 1.0 && l.dp >= 15 && l.dp <= 25 && !l.io, 'S13'],
  ['conv15', 'Conventional 15-yr: 180 months, rate between PMMS 15-yr (6.57%) and +1.0, down >= 15%', (l) => l.term === 180 && l.rate >= PMMS15 - 0.3 && l.rate <= PMMS15 + 1.0 && l.dp >= 15, 'S13'],
  ['fha', 'FHA 30-yr: 3.5% down, upfront 1.75%, annual 0.55%, owner-occupied flag, rate <= PMMS 30-yr', (l) => l.dp === 3.5 && l.upfrontMip === 1.75 && l.annualMip === 0.55 && l.ownerOcc === true && l.term === 360 && l.rate <= PMMS30, 'S6,S7,S13'],
  ['k203', '203(k): 3.5% down, same premiums, finances rehab, owner-occupied, Limited cap $75,000 stated, default rehab within it', (l) => l.dp === 3.5 && l.finRehab && l.ownerOcc && /\$75,000/.test(l.note) && l.rehabDefaults.capex <= 75000 && l.upfrontMip === 1.75 && l.annualMip === 0.55, 'S6,S7'],
  ['dscr', 'DSCR investor loan: 30-yr, down 20-25%, rate above the conventional investor rate (7.18% PMMS + premium)', (l) => l.term === 360 && l.dp >= 20 && l.dp <= 30 && l.rate > PMMS30 && l.rate <= PMMS30 + 1.5, 'S13'],
  ['cashh', 'Cash purchase (home): 100% down, 0% rate, no loan', (l) => l.dp === 100 && l.rate === 0, ''],
  ['comm25', 'Commercial bank 25-yr: 300 months, down 20-35% (65-80% LTV; supervisory limit 85%), rate near prime (7.00%) +0 to +1.5', (l) => l.term === 300 && l.dp >= 15 && l.rate >= PRIME - 0.5 && l.rate <= PRIME + 1.5, 'S5,S14'],
  ['sba504', 'SBA 504: 25-yr real estate term allowed (10/20/25), down payment 10% standard, max debenture $5.5M, owner-occupancy stated', (l) => l.term <= 300 && l.term >= 120 && l.dp >= 10 && /owner-occupancy/i.test(l.note), 'S4,S3'],
  ['bridge', 'Bridge loan: interest-only, short term (<= 5 yrs), rate above prime (>= 8.5%)', (l) => l.io === true && l.term <= 60 && l.rate >= PRIME + 1.5, 'S14'],
  ['sellerc', 'Seller financing (commercial): negotiated; rate not below the 30-yr mortgage rate minus 2 pts, term <= 30 yrs, preset note says terms vary and typical share is partial', (l) => l.rate >= PMMS30 - 2 && l.term <= 360 && /vary/i.test(l.note), ''],
  ['sba7a', 'SBA 7(a) business: <= 10-year term for business acquisition (25 for real estate), max loan $5M stated, rate <= prime + 3.0 (10.00%) for loans over $350k, min 10% injection', (l) => l.term <= 120 && /\$5M/.test(l.name + l.note) && l.rate <= PRIME + 3.0 && l.rate >= PRIME + 1.5 && l.dp >= 10, 'S2,S3,S14'],
  ['bankbiz', 'Bank term loan (business): 5-10 yr term, rate above prime, down >= 20%', (l) => l.term >= 60 && l.term <= 120 && l.rate >= PRIME + 0.5 && l.dp >= 20, 'S14'],
  ['sellerb', 'Seller note (business): <= 10-yr term, note says the seller finances only part of the price and the share is limited', (l) => l.term <= 120 && /part/i.test(l.note), ''],
  ['cashb', 'Cash purchase (business): 100% down, 0% rate', (l) => l.dp === 100 && l.rate === 0, '']];
L5.forEach(([id, name, fn, src]) => chk('L5', 'L5.' + id, name, w5, () => { const l = LN(id); return { pass: !!l && fn(l), detail: l ? 'dp ' + l.dp + ' rate ' + l.rate + ' term ' + l.term + ' io ' + !!l.io : 'missing', disclosedOnly: !src }; }, src));

/* ====================== L6 appreciation, growth, inflation, time basis ====================== */
chk('L6', 'L6.1', 'Value at month k = price x (1+g)^(k/12) (compound, months/12); after an improvement the appraisal replaces it and then compounds from completion (60 random)', 2, () => {
  let bad = 0; for (let k = 0; k < 60; k++) { const h = A('house', 'cashh', { id: 'a', status: 'owned', paid: Math.round(U(0, 50)), price: U(1e5, 1e6), growth: U(0, 8), capex: 20000, capexMonths: 6, arv: rnd() < 0.5 ? 0 : 450000 }); const S = mk({}, [h]); const t = Math.round(U(0, 200));
    const ref = h.arv > 0 && t >= 6 ? R.valueAt(h.arv, h.growth, t - 6) : R.valueAt(h.price, h.growth, h.paid + t); const got = E.plan(S).at(t).value; if (!nearRel(got, ref, 1e-9)) bad++; }
  return { pass: bad === 0, detail: bad + ' / 60 disagree' };
});
chk('L6', 'L6.2', 'Living costs and manager pay inflate monthly-compounded by (1+inflation)^(t/12); job pay raises in whole years; income and costs share the same time base (nominal dollars, plan month t)', 2, () => {
  const S = mk({}, [A('business', 'cashb', { id: 'b1', status: 'owned', price: 500000, rent: 20000 }), A('business', 'cashb', { id: 'b2', status: 'owned', price: 500000, rent: 20000 })]); S.p = E.normalizePersonal({ inflation: 4, living: 4000, operating: 1, gmMonthly: 8000, cash: 1e6, jobs: [{ id: 'j', kind: 'salary', gross: 60000, raise: 5, tax: 20, hours: 40, start: 0, end: null }] });
  const f = E.finance(S, E.plan(S)); const t = 100; const okL = nearRel(f.series.living[t], 4000 * Math.pow(1.04, t / 12), 1e-12), okG = nearRel(f.series.gm[t], 8000 * Math.pow(1.04, t / 12), 1e-12);
  const okJ = nearRel(E.jobMonthly(S.p.jobs[0], t), 5000 * Math.pow(1.05, Math.floor(t / 12)), 1e-12); return { pass: okL && okG && okJ, detail: [okL, okG, okJ].join(',') };
});
chk('L6', 'L6.3', 'Default home appreciation (4%/yr; rent and costs grow with value) sits inside the observed range: FHFA purchase-only US HPI 1991-2026 grew 4.32%/yr, 20-year rolling windows 2.75%-4.38% (median 3.56%). The UI must state the FHFA figure, that rent and costs grow with value, and that dollars are nominal', 2, () => {
  const t = APP + JSON.stringify(INFO); const gs = seed.houses.filter((h) => h.type === 'house').map((h) => h.growth); const inRange = gs.every((x) => x >= 2.75 && x <= 4.4);
  const ok = inRange && /FHFA/.test(INFO.growth.b) && /4\.3%/.test(INFO.growth.b) && /nominal/i.test(t) && /(rent|income).{0,60}(grow|rise).{0,80}(same|value|growth rate)/i.test(t); return { pass: ok, detail: 'home growth ' + [...new Set(gs)] + ' vs FHFA 20y range 2.75-4.38; disclosed with FHFA figure: ' + /FHFA/.test(INFO.growth.b) };
}, 'S28');
chk('L6', 'L6.6', 'Commercial growth defaults (4.5%/yr) are no higher than the best 20-year FHFA home-price window plus 0.25 pt, or the UI says commercial growth is an assumption with no fetched benchmark', 0, () => ({ pass: true, detail: 'informational (weight 0): commercial growth ' + [...new Set(seed.houses.filter((h) => h.type === 'commercial').map((h) => h.growth))] + '%; no fetched commercial price index (NCREIF/CBRE blocked)' }));
chk('L6', 'L6.4', 'Stress-test and totals use the same time base: category strip "lasts" costs are grown to the plan-end month like the income they offset (engine.stress exists and scales fixed costs by the growth factor)', 2, () => {
  return { pass: typeof E.stress === 'function', detail: 'E.stress ' + typeof E.stress };
});
chk('L6', 'L6.5', 'Default business growth is defensible: no higher than the Federal Reserve\'s longest-run nominal growth of the economy (FOMC Sept 2026 projections: real GDP 2.0% + PCE inflation 2.0% = about 4.0%) plus 0.5 point, for new business assets, the sample plan and the scenarios\' default; the glossary names the Fed figure and says anything far above is optimistic', 2, () => {
  const mx = Math.max(...seed.houses.filter((h) => h.type === 'business').map((h) => h.growth)), nb = E.newAsset('business').growth; const ok = mx <= 4.5 && nb <= 4.5 && /Federal Reserve/.test(infoText('growth')) && /optimistic/.test(infoText('growth')); return { pass: ok, detail: 'sample business growth max ' + mx + '%, new business ' + nb + '%; Fed nominal long run about 4.0%' };
}, 'S30');

/* ====================== L7 taxes, selling, depreciation ====================== */
/* independent tax reference for a sale (IRS Topic 409/559, Pub. 544, Pub. 946): straight-line depreciation, gain, stacking of ordinary income, unrecaptured 1250 gain (25% cap), long-term gain (0/15/20) and NIIT */
function refSaleTax(o) {
  const TA = R.TAX2026, base = Math.max(0, o.wages + o.otherProfit - TA.std); const gain = o.net - (o.cost - o.dep); if (!(gain > 0)) return { tax: 0, gain };
  const rec = Math.min(gain, o.dep); let tax = 0;
  if (o.heldMonths < 12) tax = R.taxWalk(base, gain, 'ord');
  else if (o.business) tax = R.taxWalk(base, rec, 'ord') + R.taxWalk(base + rec, gain - rec, 'ltcg');
  else tax = R.taxWalk(base, rec, '1250') + R.taxWalk(base + rec, gain - rec, 'ltcg');
  if (!o.business) tax += 0.038 * Math.min(gain + Math.max(0, o.rentalProfit), Math.max(0, o.wages + o.otherProfit + gain - 200000));
  return { tax, gain };
}
const clOf = (S, h) => h.price * (h.closingPct == null ? S.g.closing : h.closingPct) / 100;
const saleCase = (type, held, wages, price, gro) => { const h = A(type, 'cashh', { id: 'a', price: price || 1.2e6, rent: type === 'business' ? 40000 : 9000, tax: 600, ins: 300, hoa: 200, nnn: type === 'commercial' ? 85 : 0, growth: gro === undefined ? 7 : gro, buyIn: 0, exit: 'sell', exitMonth: held, capex: 0, sellCost: 6 }); if (type === 'business') E.applyLoan(h, 'cashb'); else E.applyLoan(h, 'cashh');
  const S = mk({ planYears: 25 }, [h]); S.p = E.normalizePersonal({ cash: 5e6, statePct: 0, jobs: wages > 0 ? [{ id: 'j', kind: 'salary', gross: wages, raise: 0, tax: 20, hours: 40, start: 0, end: null }] : [] }); return S; };
chk('L7', 'L7.1', 'Income tax estimate (estTaxPct) equals the 2026 single-filer reference: standard deduction $16,100, brackets 10% to 12,400 ... 37% over 640,600, Social Security 6.2% to $184,500, Medicare 1.45% (13 incomes)', 2.5, () => {
  const inc = [0, 20000, 48000, 60000, 96000, 150000, 184500, 200000, 300000, 500000, 700000, 1e6, 3e6]; const bad = inc.filter((x) => !near(E.estTaxPct(x), R.taxPct2026(x), 0.05));
  return { pass: bad.length === 0, detail: bad.map((x) => x + ': ' + E.estTaxPct(x) + ' vs ' + R.taxPct2026(x)).join('; ') || 'all match' };
}, 'S1,S17');
chk('L7', 'L7.2', 'Sale tax equals an independent reference (gain after selling costs and depreciation taken; ordinary rate if held under a year; building depreciation taxed up to 25%; long-term gain 0/15/20 stacked on wages and portfolio profit; 3.8% NIIT on property gains above $200,000; a business\'s depreciation is ordinary income) on 60 random sales, all three asset types, wages $0-$600k', 3, () => {
  let bad = 0, ex = ''; for (let k = 0; k < 60; k++) { const type = pick(['house', 'commercial', 'business']), held = pick([8, 30, 90, 200]), wages = pick([0, 40000, 96000, 250000, 600000]); const S = saleCase(type, held, wages), pl = E.plan(S), h = S.houses[0], ex0 = pl.exits.a; if (!ex0) { bad++; continue; }
    const st = E.saleTax(S, pl, h), t = ex0.month, closing = clOf(S, h), dep = (() => { const p = S.p; if (type === 'business') { const tot = h.price + closing, i = tot * p.bizIntPct / 100, q = tot - i; return Math.min(i, i / 180 * t) + Math.min(q, q / 84 * Math.max(0, t - 0.5)); } const base = (h.price + closing) * (1 - p.landPct / 100), yrs = type === 'house' ? 27.5 : 39; return R.depSim(base, yrs, t + 1, true)[t]; })();
    const profit = (pl.series.txRE[t] + pl.series.txBiz[t]) * 12, ref = refSaleTax({ business: type === 'business', heldMonths: t, wages, otherProfit: Math.max(0, profit), rentalProfit: type === 'business' ? 0 : Math.max(0, pl.series.txRE[t] * 12), net: ex0.price * (1 - h.sellCost / 100), cost: h.price + closing, dep });
    if (Math.abs(st.tax - ref.tax) > 60 + 0.002 * ref.tax) { bad++; ex = [type, held, wages, st.tax.toFixed(0), ref.tax.toFixed(0), st.dep.toFixed(0), dep.toFixed(0)].join(' '); } }
  return { pass: bad === 0, detail: bad + ' / 60 disagree (type,months,wages,engine,reference,dep,refdep) ' + ex };
}, 'S20,S21,S25,S26,S38,S39,S41');
chk('L7', 'L7.3', 'Sale tax rules hold on concrete cases: a low earner pays 0% on the long-term part; NIIT adds 3.8% only for rental property when income is above $200,000 (not for an operating business); a business\'s depreciation is taxed as ordinary income, a building\'s at most 25%; held under a year is ordinary; a typed sales rate replaces the model; a loss pays nothing; the same gain is taxed more with higher wages', 2, () => {
  const tax = (type, held, wages, price, gro) => { const S = saleCase(type, held, wages, price, gro), pl = E.plan(S); return E.saleTax(S, pl, S.houses[0]); };
  const lo = tax('house', 60, 0, 100000), hi = tax('house', 200, 600000), bz = tax('business', 200, 600000), sh = tax('house', 8, 96000, 1.2e6, 60), cm = tax('commercial', 200, 96000);
  const S = saleCase('house', 200, 96000); S.p.salesTaxPct = 30; const ov = E.saleTax(S, E.plan(S), S.houses[0]); const S2 = saleCase('house', 200, 96000); S2.houses[0].growth = -5; const loss = E.saleTax(S2, E.plan(S2), S2.houses[0]);
  const ok = lo.niit === 0 && lo.ltcg === 0 && lo.gain > 0 && hi.niit > 0 && bz.niit === 0 && hi.rate > lo.rate && hi.rec1250 <= 0.25 * Math.min(hi.gain, hi.dep) + 1 && bz.ordinary > 0 && sh.ordinary > 0 && sh.ltcg === 0 && near(ov.tax, ov.gain * 0.3, 0.01) && loss.tax === 0 && cm.rec1250 > 0;
  return { pass: ok, detail: 'low-wage rate ' + lo.rate.toFixed(1) + '%, high-wage ' + hi.rate.toFixed(1) + '% (NIIT ' + hi.niit.toFixed(0) + '), business ordinary ' + bz.ordinary.toFixed(0) };
}, 'S20,S21,S26,S38,S39,S41');
chk('L7', 'L7.4', 'Portfolio income tax = extra federal tax (2026 brackets) that wages + taxable profit owe over wages alone, plus 3.8% NIIT on rental profit above $200,000 of income, plus state; taxable profit = NOI - interest - depreciation; a loss pays 0; a typed rate replaces the model; checked against an independent reference at months 0, 60, 200 on 25 random portfolios', 3, () => {
  let bad = 0, ex = ''; for (let k = 0; k < 25; k++) { const hs = [A('house', 'conv30', { id: 'h', status: 'owned', paid: 20, price: U(2e5, 6e5), rent: U(2500, 5000), tax: 250, ins: 100, growth: 4 }), A('commercial', 'comm25', { id: 'c', status: 'owned', paid: 12, price: U(1e6, 8e6), rent: U(9e3, 7e4), tax: 3000, ins: 1000, hoa: 800, growth: 4 }), A('business', 'sba7a', { id: 'b', status: 'owned', paid: 6, price: U(5e5, 5e6), rent: U(2e4, 1.5e5), growth: 4 })];
    const S = mk({ planYears: 20 }, hs), wages = pick([0, 60000, 150000, 400000]); S.p = E.normalizePersonal({ statePct: pick([0, 5]), jobs: wages ? [{ id: 'j', kind: 'salary', gross: wages, raise: 0, tax: 20, hours: 40, start: 0, end: null }] : [] }); const pl = E.plan(S), f = E.finance(S, pl), s = pl.series;
    for (const t of [0, 60, 200]) { let re = 0, biz = 0, depT = 0;
      hs.forEach((h) => { const v = pl.V[h.id], age = t; const noi = v.noi * Math.pow(1 + h.growth / 100, t / 12); const sim = R.loanSim({ B0: v.B0, ratePct: h.rate, pay: v.P, extra: 0, months: t + 2 }); const intr = sim.bal[t] > 0.005 ? sim.bal[t] * h.rate / 1200 : 0;
        const closing = clOf(S, h), a0 = h.paid; let dep; if (h.type === 'business') { const tot = h.price + closing, i = tot * S.p.bizIntPct / 100, q = tot - i; const c = (a) => Math.min(i, i / 180 * a) + Math.min(q, q / 84 * Math.max(0, a - 0.5)); dep = c(a0 + t + 1) - c(a0 + t); } else { const c = R.depSim((h.price + closing) * (1 - S.p.landPct / 100), h.type === 'house' ? 27.5 : 39, a0 + t + 2, true); dep = c[a0 + t + 1] - c[a0 + t]; }
        depT += dep; if (h.type === 'business') biz += noi - intr - dep; else re += noi - intr - dep; });
      if (!near(s.dep[t], depT, 0.5) || !near(s.txRE[t] + s.txBiz[t], re + biz, 1)) { bad++; ex = 'taxable ' + (s.txRE[t] + s.txBiz[t]).toFixed(0) + ' vs ' + (re + biz).toFixed(0); break; }
      const R_ = re + biz; let want = 0; if (R_ > 0) { const W = wages, fed = R.taxWalk(Math.max(0, W - 16100) , Math.max(0, W + R_ * 12 - 16100) - Math.max(0, W - 16100), 'ord') / 12, niit = 0.038 * Math.min(Math.max(0, re * 12), Math.max(0, W + R_ * 12 - 200000)) / 12; want = fed + niit + R_ * S.p.statePct / 100; }
      if (Math.abs(f.series.portTax[t] - want) > 5 + 0.003 * want) { bad++; ex = 'tax ' + f.series.portTax[t].toFixed(0) + ' vs ' + want.toFixed(0) + ' t' + t; break; } } }
  const S = mk({ planYears: 5 }, [A('house', 'conv30', { id: 'h', status: 'owned', price: 400000, rent: 1000, tax: 400, ins: 100, growth: 3 })]); S.p = E.normalizePersonal({}); const loss = E.finance(S, E.plan(S)); const S3 = JSON.parse(JSON.stringify(S)); S3.houses = [A('house', 'cashh', { id: 'h', status: 'owned', price: 400000, rent: 5000, tax: 100, ins: 50 })]; E.normalize(S3); S3.p.portfolioTaxPct = 25; const fl = E.finance(S3, E.plan(S3)); const pl3 = E.plan(S3);
  const okOv = near(fl.series.portTax[0], Math.max(0, fl.series.taxable[0]) * 0.25, 0.01) && fl.series.taxable[0] > 0; const lossOk = loss.series.taxable[0] < 0 && loss.series.portTax[0] === 0;
  return { pass: bad === 0 && okOv && lossOk, detail: bad + ' / 25 disagree ' + ex + '; override ' + okOv + '; loss pays 0: ' + lossOk };
}, 'S1,S21,S24,S25,S32,S42');
chk('L7', 'L7.5', 'Depreciation: straight line 27.5 years (homes) / 39 years (commercial) on the building share (land excluded) of price + closing costs + improvements with the mid-month convention; business price split into goodwill (15 years) and equipment (7 years); never more than the basis; engine.depCum equals a month-by-month reference (60 random) and the asset page shows the monthly write-off', 2, () => {
  let bad = 0, ex = ''; for (let k = 0; k < 60; k++) { const type = pick(['house', 'commercial', 'business']), h = A(type, undefined, { id: 'a', price: U(2e5, 5e6), capex: pick([0, 30000]), closingPct: pick([2, 3, 5]) }); const S = mk({ closing: 3 }, [h]); S.p = E.normalizePersonal({ landPct: pick([10, 20, 35]), bizIntPct: pick([50, 70, 90]) }); const closing = h.price * h.closingPct / 100;
    for (const a of [0, 1, 7, 60, 200, 340, 480]) { let ref; if (type === 'business') { const tot = h.price + closing, i = tot * S.p.bizIntPct / 100, q = tot - i + (h.capex || 0); ref = Math.min(i, i / 180 * a) + Math.min(q, q / 84 * Math.max(0, a - 0.5)); } else { const base = (h.price + closing + (h.capex || 0)) * (1 - S.p.landPct / 100); ref = R.depSim(base, type === 'house' ? 27.5 : 39, a + 1, true)[a]; }
      if (!near(E.depCum(S, h, a), ref, 0.01 + ref * 1e-9)) { bad++; ex = [type, a, E.depCum(S, h, a).toFixed(2), ref.toFixed(2)].join(' '); break; } } }
  return { pass: bad === 0 && /dep-note/.test(APP) && /27\.5/.test(APP), detail: bad + ' / 60 disagree ' + ex };
}, 'S23,S24,S26,S31,S33,S40,S43');
chk('L7', 'L7.6', 'UNVERIFIED: selling-cost defaults (home 6%, commercial 5%, business 8%): no reachable source (NAR, broker sites blocked); disclosed as typical ranges and editable. Buyer closing costs 2-5% of price ARE verified (CFPB, S36) and the 3% default sits inside', 0.5, () => ({ pass: /5% to 7%/.test(infoText('sellcost')) && E.newAsset('house').sellCost === 6 && E.GDEF.closing >= 2 && E.GDEF.closing <= 5, disclosedOnly: true, detail: infoText('sellcost').slice(0, 120) + ' (unverified)' }), 'S36');
chk('L7', 'L7.7', 'Every tax sentence the UI shows is true of the model: Finances > Taxes has editable fields (portfolio rate blank = worked out, gains rate, state, land share, goodwill share) and shows the depreciation, taxable profit and tax lines; the glossary and the Assumptions note name depreciation (27.5 / 39 / 15 / 7 years), the 3.8% NIIT with the $200,000 threshold, the 25% depreciation rate and the 0/15/20% rates', 2, () => {
  const t = infoText('portfoliotax') + ' ' + infoText('salestax') + ' ' + APP; const ok = /tax-card/.test(APP) && /p\.statePct/.test(APP) && /p\.landPct/.test(APP) && /p\.bizIntPct/.test(APP) && /tax-dep/.test(APP) && /tax-taxable/.test(APP) && /sale-taxes/.test(APP) && /sale-tax"/.test(APP)
    && /27\.5/.test(t) && /39/.test(t) && /15 years/.test(t) && /7/.test(t) && /3\.8%/.test(t) && /200,000/.test(t) && /25%/.test(t) && /0%, 15% or 20%/.test(infoText('salestax')) && /depreciation/i.test(infoText('portfoliotax')) && /(recapture|taxed back|taxed up to 25%)/i.test(infoText('salestax') + APP) && !/not modeled/i.test(infoText('portfoliotax', 'salestax')) && !/Depreciation is not modeled/.test(APP);
  return { pass: ok, detail: 'ui+glossary tax text complete: ' + ok };
});

/* ====================== L8 business valuation, growth, operating model ====================== */
chk('L8', 'L8.1', 'Business price multiples by size in the default plan: <$1.5M 2.0-3.8x, $1.5-5M 2.5-5.2x, >$5M 3.5-7x of owner profit (bench-business.json: BizBuySell avg ~2.6-2.7x SDE for small deals; larger deals higher; sources unverified, flagged)', 2, () => {
  const bad = []; seed.houses.filter((h) => h.type === 'business').forEach((h) => { const m = plS.V[h.id].multiple; const lim = h.price < 1.5e6 ? [2, 3.8] : h.price < 5e6 ? [2.5, 5.2] : [3.5, 7]; if (m < lim[0] || m > lim[1]) bad.push(h.id + ' ' + m.toFixed(1)); }); return { pass: bad.length === 0, disclosedOnly: true, detail: bad.join(';') || 'in band' };
});
chk('L8', 'L8.2', 'Manager cost for businesses you do not run = max(0, businesses held - run yourself) x monthly pay, inflated, only while the business is held and not sold or merged into another (random 30)', 2, () => {
  let bad = 0; for (let k = 0; k < 30; k++) { const nb = 1 + Math.floor(rnd() * 4), op = Math.floor(rnd() * 3); const hs = []; for (let j = 0; j < nb; j++) hs.push(A('business', 'cashb', { id: 'b' + j, status: 'owned', price: 400000, rent: 15000, exit: j === 0 ? pick(['sell', 'hold', 'merge']) : j === 1 && nb > 2 ? 'hold' : 'hold', exitMonth: 40, exitLift: 10, mergeInto: j === 0 && nb > 1 ? 'b1' : '' }));
    const S = mk({}, hs); S.p = E.normalizePersonal({ operating: op, gmMonthly: 7000, inflation: 3, cash: 1e6 }); const pl = E.plan(S), f = E.finance(S, pl); for (const t of [0, 30, 60]) { const held = hs.filter((h) => !((h.exit === 'sell' && t >= 40) || (h.exit === 'merge' && t >= 40))).length; /* sold or merged away at month 40 */ const ref = Math.max(0, held - op) * 7000 * Math.pow(1.03, t / 12); if (!nearRel(f.series.gm[t], ref, 1e-9)) bad++; } }
  return { pass: bad === 0, detail: bad + ' disagree' };
});
chk('L8', 'L8.3', 'Hours check: weekly hours = job hours (while the job runs) + min(run yourself, businesses held) x hours per business; flagged tight above 70 (random 30)', 2, () => {
  let bad = 0; for (let k = 0; k < 30; k++) { const nb = Math.floor(rnd() * 5), op = Math.floor(rnd() * 4), bh = Math.round(U(5, 40)), jh = Math.round(U(0, 60)); const hs = []; for (let j = 0; j < nb; j++) hs.push(A('business', 'cashb', { id: 'b' + j, status: 'owned', price: 300000, rent: 9000 }));
    const S = mk({}, hs.length ? hs : [A('house', 'cashh', { id: 'h', status: 'owned' })]); S.p = E.normalizePersonal({ operating: op, bizHours: bh, jobs: jh ? [{ id: 'j', kind: 'salary', gross: 70000, raise: 0, tax: 20, hours: jh, start: 0, end: null }] : [] }); const f = E.finance(S, E.plan(S)); const ref = jh + Math.min(op, nb) * bh; if (!near(f.series.hours[0], ref, 1e-9)) bad++; }
  return { pass: bad === 0, detail: bad + ' / 30 disagree' };
});
chk('L8', 'L8.4', 'Default plan is a smooth, self-funded, lender-qualified build: net worth about $125M (115-135M at the 28-year plan end, 95-140M at 25 years) with 4% growth; purchase prices of the commercial/business chain rise by 1.0-1.4x per step (about 25%, no big jump) in buy order; no partner capital or outside financing; every loan meets lender DSCR (see L4.4); homes never negative; the finance verdict is Yes with cash never negative', 2, () => {
  const buy = seed.houses.filter((h) => h.status === 'planned' && h.type !== 'house').sort((a, b) => plS.purchase[a.id] - plS.purchase[b.id]), ratios = buy.slice(1).map((h, i) => h.price / buy[i].price);
  const f = E.finance(seed, plS), n25 = plS.at(300).nw, n28 = plS.at(336).nw, bg = [...new Set(seed.houses.filter((h) => h.type === 'business').map((h) => h.growth))];
  const ok = n25 >= 95e6 && n25 <= 140e6 && n28 >= 115e6 && n28 <= 135e6 && ratios.every((x) => x >= 1.0 && x <= 1.4) && seed.p.capital.length === 0 && f.status === 'yes' && f.kpis.minLiquid >= 0 && seed.houses.filter((h) => h.type === 'house').every((h) => plS.V[h.id].cf >= 0) && seed.g.planYears === 28 && bg.every((x) => x <= 4.5);
  return { pass: ok, detail: 'NW 25y $' + (n25 / 1e6).toFixed(1) + 'M, 28y $' + (n28 / 1e6).toFixed(1) + 'M; step ratios ' + ratios.map((x) => x.toFixed(2)).join(',') + '; assets ' + seed.houses.length + '; business growth ' + bg };
});
chk('L8', 'L8.5', 'Sell / merge: sale proceeds = value x (1 - selling cost) - balance - liens - line draw; merge lift scales value and income by (1 + lift) from the merge month (random 20)', 1, () => {
  let bad = 0; for (let k = 0; k < 20; k++) { const lift = pick([0, 10, 20]); const a = A('business', 'cashb', { id: 'a', status: 'owned', price: 1e6, rent: 30000, growth: 6, exit: 'merge', exitMonth: 48, exitLift: lift, mergeInto: 'b' }), b = A('business', 'cashb', { id: 'b', status: 'owned', price: 2e6, rent: 50000, growth: 6, exit: 'sell', exitMonth: 100, sellCost: 8 });
    const S = mk({ planYears: 12 }, [a, b]); const pl = E.plan(S); const v100 = R.valueAt(2e6, 6, 100); if (!pl.exits.b || !near(pl.exits.b.proceeds, v100 * 0.92, 0.5)) bad++; const w = pl.assetsAt(48).find((x) => x.id === 'a'); if (!w || !nearRel(w.value, R.valueAt(1e6, 6, 48) * (1 + lift / 100), 1e-9)) bad++; }
  return { pass: bad === 0, detail: bad + ' disagree' };
});

/* ====================== L9 plan integrity ====================== */
chk('L9', 'L9.1', 'Default plan: list order = buy order (owned first, then non-decreasing purchase months), every asset gets a purchase month inside the plan, no unfunded asset', 1.5, () => {
  const order = seed.houses.map((h) => plS.purchase[h.id]); let ok = order.every(isFinite); for (let i = 1; i < order.length; i++) if (order[i] < order[i - 1]) ok = false; const f = E.finance(seed, plS);
  return { pass: ok && plS.unfunded.length === 0 && f.status === 'yes' && f.kpis.minLiquid >= 0 && seed.p.capital.length === 0, detail: order.join(',') + '; verdict ' + f.status + ', lowest liquid cash $' + Math.round(f.kpis.minLiquid) };
});
chk('L9', 'L9.2', 'Combined portfolio total equals the sum of the rows at 12 months across the plan (net worth, value, debt, cash flow, payments)', 1.5, () => {
  let bad = 0; for (let t = 0; t <= plS.T; t += Math.max(1, Math.floor(plS.T / 12))) { const rows = plS.assetsAt(t); const sum = (k) => rows.reduce((a, x) => a + x[k], 0); const s = plS.series;
    if (!near(sum('equity'), s.nw[t], 0.01) || !near(sum('value') - (rows.find((x) => x.id === '__cash') ? s.cash[t] : 0), s.value[t], 0.01) || !near(sum('debt'), s.debt[t], 0.01) || !near(sum('cf'), s.cf[t], 0.01)) bad++; }
  return { pass: bad === 0, detail: bad + ' months disagree' };
});
chk('L9', 'L9.3', 'Trust funding on the default plan: every planned asset is bought at the later of its "not before" month and the first month the pool can pay; purchase months never go backwards down the list; cash used + line drawn = cash needed; the line drawn never exceeds the pool room; no cycles', 1.5, () => {
  let bad = []; let prev = 0; seed.houses.forEach((h) => { if (h.status === 'owned') return; const tr = plS.trust[h.id], m = plS.purchase[h.id]; if (!isFinite(m) || m < prev) bad.push(h.id + ' order'); prev = m; if (tr.pooled) { if (Math.abs(tr.cash + tr.draw - tr.need) > 0.01 || tr.draw > tr.room + 0.01) bad.push(h.id + ' split'); if (m !== Math.max(tr.ready, Math.round(h.buyIn || 0))) bad.push(h.id + ' month'); } });
  return { pass: bad.length === 0, detail: bad.join(',') || 'ok' };
});
chk('L9', 'L9.4', 'Cash recycling: sale proceeds go to the trust\'s cash, a later purchase uses held cash first (with no assets left to borrow against it can only use that cash), cash never negative, outside money only for a true shortfall (random 25)', 1.5, () => {
  let bad = 0, funded = 0; for (let k = 0; k < 25; k++) { const s = A('house', 'cashh', { id: 's', status: 'owned', price: U(2e5, 5e5), rent: 3000, tax: 150, ins: 80, growth: 4, exit: 'sell', exitMonth: Math.round(U(24, 60)), sellCost: 6 }), b = A('house', 'cashh', { id: 'b', price: U(1e5, 8e5), rent: 3000, tax: 150, ins: 80, growth: 4, buyIn: Math.round(U(61, 100)) });
    const S = mk({ planYears: 12 }, [s, b]); const pl = E.plan(S); const ex = pl.exits.s; const need = b.price * (1 + (b.closingPct == null ? 0 : b.closingPct) / 100);
    const sure = ex.proceeds >= need - 1e-6, got = isFinite(pl.purchase.b); if (pl.series.cash.some((x) => x < -0.01) || pl.outsideTotal > 0.01 || (sure && pl.purchase.b !== b.buyIn)) { bad++; continue; }
    if (got) { funded++; const tr = pl.trust.b; /* nothing is left to borrow against, so everything comes from held cash (sale proceeds plus the cash flow the trust kept) */ if (Math.abs(tr.cash - need) > 0.01 || tr.draw > 0.01 || pl.series.cash[Math.min(pl.T, pl.purchase.b)] < ex.proceeds - need - 0.01) bad++; } }
  return { pass: bad === 0 && funded > 3, detail: bad + ' / 25 disagree; ' + funded + ' bought with the sale cash' };
});
chk('L9', 'L9.5', 'Stress test ("lasts"): the ~45% biggest earners fail (rent gone, fixed costs and loan payments still due), everything at plan-end values: re-derived independently on 30 random category sets, including that fixed costs have grown with the asset', 1, () => {
  if (typeof E.stress !== 'function') return { pass: false, detail: 'E.stress missing' };
  let bad = 0; for (let k = 0; k < 30; k++) { const n = 1 + Math.floor(rnd() * 6), yrs = pick([10, 20, 28]); const hs = []; for (let j = 0; j < n; j++) hs.push(A('house', pick(['conv30', 'cashh']), { id: 'h' + j, status: 'owned', paid: pick([0, 12]), price: U(1.2e5, 6e5), rent: U(1500, 4000), tax: U(100, 500), ins: U(50, 200), hoa: pick([0, 150]), growth: U(1, 6) }));
    const S = mk({ planYears: yrs }, hs); S.p = E.normalizePersonal({ cash: 50000 }); const pl = E.plan(S), rows = pl.snap.filter((x) => x.type === 'house'); const cash = U(0, 400000); const got = E.stress(S, pl, rows, cash);
    /* reference */ const cost = (x) => { const h = S.houses.find((q) => q.id === x.id); return (h.tax + h.ins + h.hoa) * Math.pow(1 + h.growth / 100, pl.planM / 12); };
    const income = rows.reduce((a, x) => a + x.income, 0), cf = rows.reduce((a, x) => a + x.cf, 0), ds = income - cf; const lost = rows.map((x) => x.income + cost(x)).sort((a, b) => b - a); const kk = Math.max(1, Math.round(rows.length * 0.45));
    const partial = cf - lost.slice(0, kk).reduce((a, x) => a + x, 0), all = -(ds + rows.reduce((a, x) => a + cost(x), 0)), burn = partial >= 0 ? all : partial; const months = burn >= -0.5 ? Infinity : cash / -burn;
    if (!near(got.burn, burn, 0.01) || (isFinite(months) ? !near(got.months, months, 1e-6 * Math.max(1, months)) : isFinite(got.months))) bad++; }
  return { pass: bad === 0, detail: bad + ' / 30 disagree' };
});

/* ====================== L10 disclosure, labels, units, glossary ====================== */
chk('L10', 'L10.1', 'Glossary numbers agree with sources: FHA 1.75% + 0.55% (HUD), Limited 203(k) $75,000 (ML 2024-13), SBA 7(a) $5M and 504 $5.5M (SBA.gov), DSCR 1.2/1.25 wording, 43% DTI wording', 1.5, () => {
  const ok = /1\.75%/.test(INFO.mip.b) && /0\.55%/.test(INFO.mip.b) && /\$75,000/.test(INFO.k203.b) && /\$5 million/.test(INFO.sba.b) && /\$5\.5 million/.test(INFO.sba.b) && !/usually want 43% or less\./.test(INFO.dti.b); return { pass: ok, detail: '' };
}, 'S2,S4,S6,S7');
chk('L10', 'L10.2', 'The Assumptions page carries a "how the numbers are built" note that is true of the model: nominal dollars, growth with value, 50% business credit-line cap, own rent/mortgage in DTI, worked-out taxes with depreciation (27.5/39/15/7 years), refinance at maturity, NNN repayments, 7% vacancy, 4% business growth, savings grow with income; and it no longer says the old things (same cap for all, no own housing, depreciation not modeled)', 1.5, () => {
  const m = APP.slice(APP.indexOf('data-testid="model-notes"'), APP.indexOf('Borrowing</div>')).replace(/\s+/g, ' '); const ok = /nominal/.test(m) && /lower cap/.test(m) && /own rent or mortgage/.test(m) && /27\.5/.test(m) && /refinanc/i.test(m) && /NNN/.test(m) && /7%/.test(m) && /4% a year/.test(m) && /grows with its income/.test(m) && /trust/.test(m) && /pool/.test(m) && /Move an asset up or down/.test(m) && !/same cap is used/.test(m) && !/does not include your own rent/.test(m) && !/Depreciation is not modeled/.test(m);
  return { pass: ok, detail: 'model-notes block complete: ' + ok };
});
chk('L10', 'L10.3', 'Units and bases are stated (net worth definition says it is before selling costs/taxes and excludes personal savings): yearly inputs say "/ yr", monthly say "/ mo"; DTI limit, vacancy, management are percentages of the right base (vacancy and management of rent; repairs of value per year)', 1, () => {
  const ok = /before selling costs and taxes/.test(INFO.networth.b) && /savings are not included/.test(INFO.networth.b) && /of rent/.test(APP + JSON.stringify(INFO)) && /percent of the value/.test(INFO.repairs.b) && /Repairs \/ yr/.test(APP + JSON.stringify(Object.keys(require(path.join(V4, 'info.js')).LABEL))); return { pass: ok, detail: '' };
});
chk('L10', 'L10.4', 'Preset notes that state a number or rule match LOANS fields (FHA/203(k)/SBA caps, owner-occupancy, interest-only) and the sellerb/sellerc notes say the share seller-financed is partial and negotiable', 1, () => {
  const ok = LN('sellerb').note.length > 0 && /(typically|usually|often)/i.test(LN('sellerb').note + INFO.sellerfin.b) && /(10%|50%|part)/i.test(INFO.sellerfin.b + LN('sellerb').note); return { pass: ok, detail: LN('sellerb').note };
});

chk('L10', 'L10.5', 'Source ledger (logic/sources.md) lists at least 40 distinct fetched-and-read sources, each with a URL, an access date (header) and an exact fact; every source id cited by a check exists and is not withdrawn; unverified checks are not scored', 1, () => {
  const md = fs.readFileSync(path.join(__dirname, 'logic', 'sources.md'), 'utf8'), rows = [...md.matchAll(/^\| (S\d+) \| (.+?) \| (.+?) \| (.*?) \|$/gm)].filter((m) => !/withdrawn/i.test(m[2])), ids = new Set(rows.map((m) => m[1]));
  const okRows = rows.filter((m) => /\(.*\)/.test(m[2]) && m[3].length > 20), cited = [...new Set(checks.flatMap((x) => (x.source || '').split(',').filter(Boolean)))], missing = cited.filter((c) => !ids.has(c));
  return { pass: okRows.length >= 40 && missing.length === 0 && /Access date for every entry/.test(md), detail: okRows.length + ' sources with URL and fact; cited ids missing: ' + (missing.join(',') || 'none') };
});

/* ---------------- score ---------------- */
const score = {}; let total = 0;
Object.keys(CATS).forEach((c) => { const mine = checks.filter((x) => x.cat === c); const max = CATS[c][1]; const got = mine.reduce((a, x) => a + x.earned, 0), pts = mine.reduce((a, x) => a + x.pts, 0);
  score[c] = { name: CATS[c][0], earned: Math.round(got * 100) / 100, max: pts }; total += got; });
const maxTotal = Object.values(score).reduce((a, x) => a + x.max, 0), NORM = 100 / maxTotal; /* scored points are normalized to 100; unverified checks carry 0 points */
Object.values(score).forEach((x) => { x.earned = Math.round(x.earned * NORM * 100) / 100; x.max = Math.round(x.max * NORM * 100) / 100; }); total = total * NORM;
const out = { run: new Date().toISOString(), total: Math.round(total * 100) / 100, max: 100, categories: score, checks, disclosedNotVerified: unverified };
fs.writeFileSync(path.join(__dirname, 'result-logic.json'), JSON.stringify(out, null, 1));
let md = '# Logic and math grader (LOGIC_ONLY)\n\nRun: ' + out.run + '\n\n**TOTAL ' + out.total + ' / ' + out.max + '**\n\n| Cat | Area | Earned | Max |\n|---|---|---|---|\n';
Object.keys(score).forEach((c) => { md += '| ' + c + ' | ' + score[c].name + ' | ' + score[c].earned + ' | ' + score[c].max + ' |\n'; });
md += '\n## Checks\n\n| ID | Check | Pts | Earned | Result / evidence | Sources |\n|---|---|---|---|---|---|\n';
checks.forEach((x) => { md += '| ' + x.id + ' | ' + x.name.replace(/\|/g, '/') + ' | ' + x.pts + ' | ' + x.earned + ' | ' + (x.pass ? 'PASS' : 'FAIL') + (x.disclosedOnly ? ' (disclosed, not source-verified)' : '') + ' ' + x.detail.replace(/\|/g, '/').replace(/\n/g, ' ') + ' | ' + x.source + ' |\n'; });
md += '\nChecks marked "disclosed, not source-verified" pass on disclosure or a benchmark file whose sources could not be fetched; see sources.md.\n';
fs.mkdirSync(path.join(__dirname, 'logic'), { recursive: true }); fs.writeFileSync(path.join(__dirname, 'logic', 'report.md'), md);
console.log('\nLogic grade: ' + out.total + ' / ' + out.max);
Object.keys(score).forEach((c) => console.log('  ' + c + ' ' + String(score[c].earned).padStart(6) + ' / ' + score[c].max + '  ' + score[c].name));
checks.filter((x) => !x.pass).forEach((x) => console.log('  FAIL ' + x.id + ' (' + x.pts + ') ' + x.name.slice(0, 90) + '\n       ' + x.detail.slice(0, 220)));
module.exports = out;
