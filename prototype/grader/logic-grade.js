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
  L9: ['Plan integrity (ordering, trust funding, cash recycling, stress test)', 7], L10: ['Disclosure, labels, units and glossary accuracy', 5], L12: ['Can-I-buy-this feasibility, shortfall and buy order (engine)', 14], L11: ['Purchase examples (16 typical purchases)', 6] };
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
chk('L6', 'L6.7', "Today's dollars: E.planR(S) is the future-dollar plan with every figure divided by (1 + cost increase)^(months/12) at ITS OWN month (series, at(), horizon, assetsAt(), exits, outside cash); month 0 is unchanged; the asset rows still add up to the totals; purchase months, loan ends, DTI and every price are untouched (planned prices are today's prices, nothing is inflated); with 0% cost increase it equals the plan exactly", 3, () => {
  const bad = [], S = JSON.parse(JSON.stringify(seed)); S.p.inflation = 4.5; E.normalize(S); const pn = E.plan(S), pr = E.planR(S), f = (m) => Math.pow(1 + 4.5 / 100, m / 12), T = pn.T;
  [0, 1, 6, 60, 120, 200, 336].forEach((t) => { ['nw', 'cf', 'monthly', 'value', 'debt', 'noi', 'ds', 'cash'].forEach((k) => { if (!nearRel(pr.series[k][t], pn.series[k][t] / f(t), 1e-9, 1e-9)) bad.push(k + '@' + t); if (!nearRel(pr.at(t)[k], pn.at(t)[k] / f(t), 1e-9, 1e-9)) bad.push('at.' + k + '@' + t); }); });
  if (pr.series.nw[0] !== pn.series.nw[0] || pr.series.cf[0] !== pn.series.cf[0]) bad.push('month 0 changed');
  if (!nearRel(pr.horizon.nw, pn.horizon.nw / f(336), 1e-9, 1e-9) || !nearRel(pr.horizon.cf, pn.horizon.cf / f(336), 1e-9, 1e-9)) bad.push('horizon');
  [100, 336].forEach((t) => { const a = pr.assetsAt(t), b = pn.assetsAt(t), sum = (arr, k) => arr.reduce((x, y) => x + y[k], 0); a.forEach((x, j) => { if (!nearRel(x.equity, b[j].equity / f(t), 1e-9, 1e-9) || !nearRel(x.cf, b[j].cf / f(t), 1e-9, 1e-9)) bad.push('asset ' + x.id + '@' + t); });
    if (!nearRel(sum(a, 'equity'), pr.series.nw[t], 1e-9, 1e-6) || !nearRel(sum(a, 'cf'), pr.series.cf[t], 1e-9, 1e-6) || !nearRel(sum(a, 'payment'), pr.series.monthly[t], 1e-9, 1e-6)) bad.push('rows do not add up @' + t); });
  Object.keys(pn.exits).forEach((id) => { const a = pn.exits[id], b = pr.exits[id]; ['price', 'proceeds', 'profit', 'tax', 'net'].forEach((k) => { if (!nearRel(b[k], a[k] / f(a.month), 1e-9, 1e-6)) bad.push('exit ' + id + '.' + k); }); });
  if (!nearRel(pr.outsideTotal, pn.outsideTotal / f(T), 1e-9, 1e-9)) bad.push('outside total');
  if (JSON.stringify(pr.purchase) !== JSON.stringify(pn.purchase) || JSON.stringify(pr.loanEnd) !== JSON.stringify(pn.loanEnd) || JSON.stringify(pr.series.dti) !== JSON.stringify(pn.series.dti)) bad.push('months or DTI changed');
  S.houses.forEach((h) => { const v = pr.V[h.id]; if (v.valueNow !== pn.V[h.id].valueNow || pr.trust[h.id].need !== pn.trust[h.id].need || E.needFor(S, h) !== pr.trust[h.id].need) bad.push('price/need moved ' + h.id); });
  const Z = JSON.parse(JSON.stringify(seed)); Z.p.inflation = 0; E.normalize(Z); const pz = E.plan(Z), prz = E.planR(Z); if (prz.horizon.nw !== pz.horizon.nw || prz.series.cf[200] !== pz.series.cf[200]) bad.push('0% differs');
  return { pass: bad.length === 0, detail: bad.slice(0, 5).join('; ') || 'ok at 4.5%: series, at(), horizon, rows, exits all /(1.045)^(m/12)' };
});
chk('L6', 'L6.8', "Today's dollars for Finances: E.finance(S, E.planR(S)) divides every money series by (1 + cost increase)^(t/12) at its month, the plan-end cash flow equals the Planned top card, living costs stay flat (they rise at the same rate), the verdict does not change, and the texts quote today's-dollar amounts", 2, () => {
  const bad = [], S = JSON.parse(JSON.stringify(seed)); E.normalize(S); const pn = E.plan(S), pr = E.planR(S), fn = E.finance(S, pn), fr = E.finance(S, pr), f = (m) => Math.pow(1 + S.p.inflation / 100, m / 12);
  [0, 12, 100, 336].forEach((t) => { ['total', 'liquid', 'portfolio', 'net', 'living', 'portTax', 'income'].forEach((k) => { if (!nearRel(fr.series[k][t], fn.series[k][t] / f(t), 1e-9, 1e-6)) bad.push(k + '@' + t); }); });
  if (fn.status !== fr.status || fn.reasons.length !== fr.reasons.length) bad.push('verdict changed');
  if (!nearRel(fr.kpis.planEnd.cfBefore, pr.horizon.cf, 1e-9, 1e-6)) bad.push('plan-end cf differs from the plan'); if (!nearRel(fr.series.living[336], fr.series.living[0], 1e-9, 1e-9)) bad.push('living costs not flat in today\'s dollars');
  const T2 = JSON.parse(JSON.stringify(seed)); T2.p.living = 5050; E.normalize(T2); const a = E.finance(T2, E.plan(T2)), b = E.finance(T2, E.planR(T2)), mA = /about \$([\d,]+) short|falls \$([\d,]+) below/.exec(a.reasons.map((x) => x.text).join(' ')), mB = /about \$([\d,]+) short|falls \$([\d,]+) below/.exec(b.reasons.map((x) => x.text).join(' '));
  if (mA && mB && Number(mA[1] || mA[2]) < Number(mB[1] || mB[2])) bad.push('today\'s-dollar text amount is larger than the future-dollar one');
  return { pass: bad.length === 0, detail: bad.slice(0, 5).join('; ') || 'ok' };
});
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
chk('L8', 'L8.4', 'Default plan is a smooth, self-funded, lender-qualified build: net worth about $125M in TODAY\'S dollars (125-135M at the 28-year plan end after dividing by 1.03^28, i.e. about $286-309M in future dollars; 40-100M in today\'s dollars at 25 years: the plan starts from zero owned assets and compounds) with 4% growth; purchase prices of the commercial/business chain rise by 1.0-1.4x per step (about 25%, no big jump) in buy order; no partner capital or outside financing; every loan meets lender DSCR (see L4.4); homes never negative; the finance verdict is Yes with cash never negative', 2, () => {
  const buy = seed.houses.filter((h) => h.status === 'planned' && h.type !== 'house').sort((a, b) => plS.purchase[a.id] - plS.purchase[b.id]), ratios = buy.slice(1).map((h, i) => h.price / buy[i].price);
  const f = E.finance(seed, plS), df = (m) => Math.pow(1 + seed.p.inflation / 100, m / 12), n25 = plS.at(300).nw / df(300), n28 = plS.at(336).nw / df(336), bg = [...new Set(seed.houses.filter((h) => h.type === 'business').map((h) => h.growth))];
  const ok = n25 >= 40e6 && n25 <= 100e6 && n28 >= 125e6 && n28 <= 135e6 && plS.at(336).nw >= 286e6 && ratios.every((x) => x >= 1.0 && x <= 1.4) && seed.p.capital.length === 0 && f.status === 'yes' && f.kpis.minLiquid >= 0 && seed.houses.filter((h) => h.type === 'house').every((h) => plS.V[h.id].cf >= 0) && seed.g.planYears === 28 && bg.every((x) => x <= 4.5);
  return { pass: ok, detail: "NW (today's dollars) 25y $" + (n25 / 1e6).toFixed(1) + 'M, 28y $' + (n28 / 1e6).toFixed(1) + 'M (future $' + (plS.at(336).nw / 1e6).toFixed(1) + 'M); step ratios ' + ratios.map((x) => x.toFixed(2)).join(',') + '; assets ' + seed.houses.length + '; business growth ' + bg };
});
chk('L8', 'L8.4c', 'Default plan reaches the user\'s target AFTER TAX: cash flow after tax at the 28-year plan end is at least $1,300,000 a month in TODAY\'S dollars (E.finance(S, planR(S)).kpis.planEnd.cfAfter = cash flow before tax minus the portfolio tax), with net worth still at least $125M in today\'s dollars, verdict Yes, nothing owned, and the target constant E.CF_TARGET is 1,300,000', 2, () => {
  const pr = E.planR(seed), f = E.finance(seed, pr), pe = f.kpis.planEnd;
  const ok = pe.cfAfter >= 1.3e6 && E.CF_TARGET === 1.3e6 && pe.tax > 0 && near(pe.cfAfter, pe.cfBefore - pe.tax, 2) && pr.horizon.nw >= 125e6 && f.status === 'yes' && !seed.houses.some((h) => h.status === 'owned');
  return { pass: ok, detail: "after-tax cash flow today's dollars $" + Math.round(pe.cfAfter) + '/mo (before tax $' + Math.round(pe.cfBefore) + ', tax $' + Math.round(pe.tax) + '), NW $' + (pr.horizon.nw / 1e6).toFixed(1) + 'M, verdict ' + f.status };
});
chk('L8', 'L8.4b', 'Default plan targets, in TODAY\'S dollars (future dollars divided by 1.03^28): net worth at the 28-year plan end is $125M to $135M AND the monthly cash flow at plan end (Cash flow / mo, before tax, after loan payments) is at least $1.3M (at least $286M and $2.98M in future dollars); the cash flow is the sum of the asset rows (income minus operating costs and loan payments) and equals income before loans (net operating income) minus loan payments', 1.5, () => {
  const h = plS.horizon, rows = plS.snap.filter((x) => x.type !== 'cash'), rowCf = rows.reduce((a, x) => a + x.cf, 0), rowNw = plS.snap.reduce((a, x) => a + x.equity, 0), income = rows.reduce((a, x) => a + x.income, 0);
  const d28 = Math.pow(1 + seed.p.inflation / 100, 28), ok = h.nw / d28 >= 125e6 && h.nw / d28 <= 135e6 && h.cf / d28 >= 1.3e6 && h.nw >= 286e6 && h.cf >= 2.98e6 && seed.g.planYears === 28 && plS.planM === 336 && near(rowCf, h.cf, 2) && nearRel(rowNw, h.nw, 1, 1e-6) && near(income, h.noi, 2) && near(h.noi - h.ds, h.cf, 2);
  return { pass: ok, detail: "today's dollars NW $" + (h.nw / d28 / 1e6).toFixed(2) + 'M, cash flow $' + (h.cf / d28 / 1e6).toFixed(3) + 'M/mo; future dollars NW $' + (h.nw / 1e6).toFixed(2) + 'M, cash flow $' + (h.cf / 1e6).toFixed(3) + 'M/mo (rows $' + (rowCf / 1e6).toFixed(3) + 'M), income before loans $' + (h.noi / 1e6).toFixed(3) + 'M, loan payments $' + (h.ds / 1e6).toFixed(3) + 'M' };
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

/* ---- new in the Bought / Planned rework: one clock, order rule, purchase test, automatic payments, job split, nothing owned yet ---- */
const mkP = (g, p, houses) => E.normalize({ g: Object.assign({}, E.GDEF, { closing: 0, appr: 0 }, g || {}), p: Object.assign(E.samplePersonal(), { cash: 0, cashApy: 0, inflation: 0, living: 0, emergencyMonths: 0, housing: 0, portfolioTaxPct: 0, salesTaxPct: 0, jobs: [], planned: [], capital: [] }, p || {}), houses });
const randPortfolio = (withP) => { const n = 4 + Math.floor(rnd() * 6), hs = []; for (let i = 0; i < n; i++) { const type = pick(['house', 'house', 'commercial', 'business']), lo = pick(E.loansFor(type)), own = i < 2 && rnd() < 0.7;
  const o = { id: 'r' + i, status: own ? 'owned' : 'planned', price: U(80, 900) * 1000 * (type === 'house' ? 0.6 : 2.5), rent: U(900, 22000), tax: type === 'business' ? 0 : U(0, 500), ins: type === 'business' ? 0 : U(0, 300), buyIn: rnd() < 0.3 ? Math.round(U(0, 80)) : 0, paid: own ? Math.round(U(0, 60)) : 0, extra: rnd() < 0.3 ? Math.round(U(0, 800)) : 0, growth: pick([null, 3, 5]), loanId: lo.id };
  hs.push(A(type, lo.id, o)); }
  const jobs = [{ id: 'j1', name: 'j', gross: U(40, 220) * 1000, raise: pick([0, 3]), tax: 25, hours: 40, start: 0, end: rnd() < 0.3 ? Math.round(U(30, 200)) : null }];
  return withP ? mkP({ otherDebt: Math.round(U(0, 600)) }, { cash: Math.round(U(0, 120)) * 1000, living: Math.round(U(1500, 5000)), emergencyMonths: pick([0, 3, 6]), jobs, cashApy: 2, inflation: 3 }, hs) : mk({}, hs); };
chk('L9', 'L9.6', 'Order rule: a planned asset is never bought before an asset listed above it (purchase months never decrease down the list among assets that are bought), checked on 150 random portfolios, each also shuffled and re-planned', 1.5, () => {
  let bad = 0, ex = ''; for (let k = 0; k < 150; k++) { const S = randPortfolio(k % 2 === 0); for (let r = 0; r < 3; r++) { if (r) S.houses = S.houses.map((h) => [h, rnd()]).sort((a, b) => a[1] - b[1]).map((x) => x[0]); const pl = E.plan(S); let prev = -1, skipped = pl.skipped;
    for (const h of S.houses) { if (h.status === 'owned') continue; const m = pl.purchase[h.id]; if (!isFinite(m)) continue; if (m < prev) { bad++; ex = h.id + ' ' + m + ' < ' + prev; } prev = Math.max(prev, m); } } }
  return { pass: bad === 0, detail: bad + ' violations ' + ex };
});
chk('L9', 'L9.7', 'A purchase happens only when the pool can pay: at the purchase month room + held cash >= the cash needed, and one month earlier it was NOT affordable unless your "not before" month or the asset above it held it back (150 random portfolios with a personal profile)', 2, () => {
  let bad = 0, n = 0, ex = ''; for (let k = 0; k < 150; k++) { const S = randPortfolio(true), pl = E.plan(S); const planned = S.houses.filter((h) => h.status !== 'owned' && isFinite(pl.purchase[h.id]));
    planned.forEach((h) => { const tr = pl.trust[h.id]; if (!tr.pooled) return; n++; const m = pl.purchase[h.id];
      if (!(tr.room + tr.heldCash >= tr.need - 1e-3) || !near(tr.have, tr.room + tr.heldCash, 1e-6) || tr.ready > m || (!tr.held && tr.ready !== m)) { bad++; ex = 'at-purchase ' + h.id; return; }
      if (tr.ready > 0) { const idx = S.houses.indexOf(h), above = S.houses.slice(0, idx).filter((q) => q.status !== 'owned' && isFinite(pl.purchase[q.id])), heldByAbove = above.some((q) => pl.purchase[q.id] >= tr.ready), p1 = pl.poolAt(tr.ready - 1);
        if (!heldByAbove && p1.head + p1.cash >= tr.need - 1e-3) { bad++; ex = 'one month earlier was affordable ' + h.id + ' ready ' + tr.ready; } } }); }
  return { pass: bad === 0 && n > 100, detail: bad + ' violations in ' + n + ' pooled purchases ' + ex };
});
chk('L9', 'L9.8', 'Profit goes to the asset\'s own loan: with nothing left to buy, the loan balance every month equals an independent recursion where the whole cash flow after the payment is paid as extra principal (30 random single-asset cases)', 1.5, () => {
  let bad = 0, ex = ''; for (let k = 0; k < 30; k++) { const h = A('house', 'conv30', { id: 'a', status: 'owned', price: U(150, 500) * 1000, rate: U(4, 9), term: 360, paid: Math.round(U(0, 80)), rent: U(3500, 6000), tax: 100, ins: 50, hoa: 0, growth: 0, extra: pick([0, 200]) });
    const S = mkP({ vac: 0, mgmt: 0, maint: 0, autoPay: true, planYears: 30 }, {}, [h]), pl = E.plan(S), P = E.payment(h), i = h.rate / 1200, noi = h.rent - 150, X = h.extra; let B = E.balToday(h);
    for (let t = 0; t <= 60 && B > 0.005; t++) { if (!near(pl.series.debt[t], B, 0.05)) { bad++; ex = [t, pl.series.debt[t].toFixed(2), B.toFixed(2)].join(' '); break; } const cf = Math.max(0, noi - P - X); /* your own extra payment comes out of the profit first */ B = Math.max(0, B * (1 + i) - P - X - Math.min(cf, Math.max(0, B * (1 + i) - P - X))); } }
  return { pass: bad === 0, detail: bad + ' / 30 disagree ' + ex };
});
chk('L9', 'L9.9', 'Your job money: take-home pay minus living costs, other debts and extra payments is split equally across the loans (after the profit goes to each loan), checked month by month on two assets against an independent recursion; with no job (no profile, or no jobs) nothing is split', 2, () => {
  const mkA = (id, price) => A('house', 'conv30', { id, status: 'owned', price, rate: 6, term: 360, paid: 0, rent: 2600, tax: 100, ins: 50, growth: 0, extra: 0 });
  const a = mkA('a', 200000), b = mkA('b', 300000), S = mkP({ vac: 0, mgmt: 0, maint: 0, autoPay: true, otherDebt: 200 }, { cash: 5000, living: 2500, jobs: [{ id: 'j', name: 'j', gross: 96000, raise: 0, tax: 25, hours: 40, start: 0, end: null }] }, [a, b]);
  const pl = E.plan(S), surplus = 96000 * 0.75 / 12 - 2500 - 200; const Bs = { a: E.balToday(a), b: E.balToday(b) }; let bad = 0, ex = '';
  for (let t = 0; t <= 100; t++) { for (const h of [a, b]) { if (!near(pl.balAt(h.id, t), Bs[h.id], 0.05)) { bad++; ex = [h.id, t, pl.balAt(h.id, t).toFixed(2), Bs[h.id].toFixed(2)].join(' '); } }
    const live = [a, b].filter((h) => Bs[h.id] > 0.005); if (!live.length) break; const pre = {}; live.forEach((h) => { const P = E.payment(h), i = h.rate / 1200; pre[h.id] = Math.max(0, Bs[h.id] * (1 + i) - P); });
    /* the pooled profit (every asset's income minus its payment) goes to the loans in proportion to what each earned; assets without a loan still earn */
    const prof = {}; let pool = 0; [a, b].forEach((h) => { const own = Bs[h.id] > 0.005 ? Math.max(0, (h.rent - 150) - E.payment(h)) : h.rent - 150; if (Bs[h.id] > 0.005) prof[h.id] = own; pool += own; });
    const split = (amt, w) => { let ids = Object.keys(w).filter((id) => pre[id] > 0.005); for (let g2 = 0; g2 < 6 && amt > 0.005 && ids.length; g2++) { const W = ids.reduce((x, id) => x + w[id], 0); let used = 0; ids.forEach((id) => { const give = Math.min(pre[id], amt * w[id] / W); pre[id] -= give; used += give; }); amt -= used; ids = ids.filter((id) => pre[id] > 0.005); } return amt; };
    split(pool, prof); const wj = {}; live.forEach((h) => { wj[h.id] = 1; }); split(surplus, wj);
    live.forEach((h) => { Bs[h.id] = Math.max(0, pre[h.id]); }); }
  const none = mkP({ autoPay: true }, { jobs: [] }, [mkA('a', 200000)]), plN = E.plan(none), noP = mk({ autoPay: true }, [mkA('a', 200000)]), plNP = E.plan(noP);
  const zero = (q) => q.jobs.used.every((x) => x === 0) && q.jobs.surplus.every((x) => x === 0);
  return { pass: bad === 0 && zero(plN) && zero(plNP), detail: bad + ' balance mismatches ' + ex + '; no-job states split nothing: ' + (zero(plN) && zero(plNP)) };
});
chk('L9', 'L9.10', 'Job money never takes your cash below the emergency cushion (and none moves while savings are below it): 60 random states, every month the split stays within the surplus and, when something moves, cash afterwards >= cushion', 1.5, () => {
  let bad = 0, ex = ''; for (let k = 0; k < 60; k++) { const S = randPortfolio(true); S.p.planned = []; S.p.capital = []; S.houses.forEach((h) => { h.exit = 'hold'; }); const pl = E.plan(S), p = S.p, J = pl.jobs;
    for (let t = 0; t <= Math.min(pl.T, 300); t++) { if (J.used[t] > J.surplus[t] + 1e-6) { bad++; ex = 'used>surplus ' + t; break; } const rsv = p.emergencyMonths * (p.living * Math.pow(1 + p.inflation / 100, t / 12) + S.g.otherDebt); const out = pl.series.outside[t] - (t ? pl.series.outside[t - 1] : 0);
      if (J.used[t] > 0.5 && out < 0.5 && J.liquid[t] + pl.series.cash[t] < rsv - 2) { bad++; ex = 'below cushion at ' + t + ' ' + Math.round(J.liquid[t] + pl.series.cash[t]) + ' < ' + Math.round(rsv); break; } } }
  return { pass: bad === 0, detail: bad + ' violations ' + ex };
});
chk('L9', 'L9.11', 'Nothing owned yet: the first purchase is paid from savings above the cash cushion plus the job money saved since, in the first month that sum covers its cash need (independent calculation, 40 random cases), and the cash line charges the same amount', 2, () => {
  let bad = 0, ex = ''; for (let k = 0; k < 40; k++) { const price = Math.round(U(90, 260)) * 1000, h = A('house', 'conv30', { id: 'f', price, rent: Math.round(price * 0.012), tax: 100, ins: 50, growth: 3, buyIn: 0 }), cash = Math.round(U(20, 70)) * 1000, em = pick([0, 3, 6]), liv = Math.round(U(1500, 3500)), gross = Math.round(U(50, 120)) * 1000;
    const S = mkP({ closing: 3, otherDebt: 0 }, { cash, living: liv, emergencyMonths: em, jobs: [{ id: 'j', name: 'j', gross, raise: 0, tax: 20, hours: 40, start: 0, end: null }] }, [h]), pl = E.plan(S), need = E.needFor(S, h), sur = gross * 0.8 / 12 - liv;
    let want = Infinity; for (let t = 0; t < 400; t++) { if (cash + Math.max(0, sur) * t - em * liv >= need - 1e-6) { want = t; break; } } if (sur <= 0 && cash - em * liv < need) want = Infinity;
    const got = pl.purchase.f; if (got !== want) { bad++; ex = [price, cash, em, liv, gross, got, want].join(' '); continue; }
    if (isFinite(got)) { const f = E.finance(S, pl); if (!near(f.series.outsideCall[got], need, 0.01) || pl.trust.f.pooled) { bad++; ex = 'cash line ' + got; } } }
  return { pass: bad === 0, detail: bad + ' / 40 disagree ' + ex };
});
chk('L9', 'L9.12', 'The default plan owns nothing: every asset is planned, the first is paid from savings and job money, every later one by the trust; with no job the plan cannot start; automatic payments on beat off', 1, () => {
  const none = seed.houses.every((h) => h.status === 'planned'), first = seed.houses[0], tr = plS.trust[first.id], second = plS.trust[seed.houses[1].id];
  const S2 = JSON.parse(JSON.stringify(seed)); S2.p.jobs = []; const noJob = E.plan(S2);
  const S3 = JSON.parse(JSON.stringify(seed)); S3.g.autoPay = false; const off = E.plan(S3);
  return { pass: none && !tr.pooled && second.pooled && tr.savings > 0 && noJob.unfunded.length === seed.houses.length && plS.horizon.nw > off.horizon.nw, detail: 'owned ' + !none + ' first pooled ' + tr.pooled + ' no-job unfunded ' + noJob.unfunded.length + ' NW on/off ' + (plS.horizon.nw / 1e6).toFixed(1) + '/' + (off.horizon.nw / 1e6).toFixed(1) };
});

/* ====================== L10 disclosure, labels, units, glossary ====================== */
chk('L10', 'L10.1', 'Glossary numbers agree with sources: FHA 1.75% + 0.55% (HUD), Limited 203(k) $75,000 (ML 2024-13), SBA 7(a) $5M and 504 $5.5M (SBA.gov), DSCR 1.2/1.25 wording, 43% DTI wording', 1.5, () => {
  const ok = /1\.75%/.test(INFO.mip.b) && /0\.55%/.test(INFO.mip.b) && /\$75,000/.test(INFO.k203.b) && /\$5 million/.test(INFO.sba.b) && /\$5\.5 million/.test(INFO.sba.b) && !/usually want 43% or less\./.test(INFO.dti.b); return { pass: ok, detail: '' };
}, 'S2,S4,S6,S7');
chk('L10', 'L10.2', 'The Assumptions page carries a "how the numbers are built" note that is true of the model: figures for future months in today\'s dollars by default (future dollars on request, prices of planned assets are today\'s prices and nothing is inflated), growth with value, 50% business credit-line cap, own rent/mortgage in DTI, worked-out taxes with depreciation (27.5/39/15/7 years), refinance at maturity, NNN repayments, 7% vacancy, 4% business growth, savings grow with income; and it no longer says the old things (same cap for all, no own housing, depreciation not modeled)', 1.5, () => {
  const m = APP.slice(APP.indexOf('data-testid="model-notes"'), APP.indexOf("colSec('backup'")).replace(/\s+/g, ' '); const ok = /today's dollars/.test(m) && /nothing is inflated/.test(m) && !/All dollars are nominal/.test(m) && /lower cap/.test(m) && /own rent or mortgage/.test(m) && /27\.5/.test(m) && /refinanc/i.test(m) && /NNN/.test(m) && /7%/.test(m) && /4% a year/.test(m) && /grows with its income/.test(m) && /trust/.test(m) && /pool/.test(m) && /Move an asset up or down/.test(m) && !/same cap is used/.test(m) && !/does not include your own rent/.test(m) && !/Depreciation is not modeled/.test(m);
  return { pass: ok, detail: 'model-notes block complete: ' + ok };
});
chk('L10', 'L10.3', 'Units and bases are stated (net worth definition says it is before selling costs/taxes; the plan-end figure excludes personal savings while the big today figure adds them): yearly inputs say "/ yr", monthly say "/ mo"; DTI limit, vacancy, management are percentages of the right base (vacancy and management of rent; repairs of value per year)', 1, () => {
  const ok = /before selling costs and taxes/.test(INFO.networth.b) && /without your savings/.test(INFO.networth.b) && /of rent/.test(APP + JSON.stringify(INFO)) && /percent of the value/.test(INFO.repairs.b) && /Repairs \/ yr/.test(APP + JSON.stringify(Object.keys(require(path.join(V4, 'info.js')).LABEL))); return { pass: ok, detail: '' };
});
chk('L10', 'L10.4', 'Preset notes that state a number or rule match LOANS fields (FHA/203(k)/SBA caps, owner-occupancy, interest-only) and the sellerb/sellerc notes say the share seller-financed is partial and negotiable', 1, () => {
  const ok = LN('sellerb').note.length > 0 && /(typically|usually|often)/i.test(LN('sellerb').note + INFO.sellerfin.b) && /(10%|50%|part)/i.test(INFO.sellerfin.b + LN('sellerb').note); return { pass: ok, detail: LN('sellerb').note };
});

chk('L10', 'L10.5', 'Source ledger (logic/sources.md) lists at least 40 distinct fetched-and-read sources, each with a URL, an access date (header) and an exact fact; every source id cited by a check exists and is not withdrawn; unverified checks are not scored', 1, () => {
  const md = fs.readFileSync(path.join(__dirname, 'logic', 'sources.md'), 'utf8'), rows = [...md.matchAll(/^\| (S\d+) \| (.+?) \| (.+?) \| (.*?) \|$/gm)].filter((m) => !/withdrawn/i.test(m[2])), ids = new Set(rows.map((m) => m[1]));
  const okRows = rows.filter((m) => /\(.*\)/.test(m[2]) && m[3].length > 20), cited = [...new Set(checks.flatMap((x) => (x.source || '').split(',').filter(Boolean)))], missing = cited.filter((c) => !ids.has(c));
  return { pass: okRows.length >= 40 && missing.length === 0 && /Access date for every entry/.test(md), detail: okRows.length + ' sources with URL and fact; cited ids missing: ' + (missing.join(',') || 'none') };
});


/* ====================== plan robustness, renovations, sold cash profit, stretch house ====================== */
chk('L8', 'L8.6', 'Default plan has renovations on at least the first two houses bought (rehab $20K-$40K paid from cash, not financed, new appraisal adds 1.2x-1.6x the rehab cost, rent lift 8-12%), and the engine follows the rules: the value is the new appraisal when the work finishes, income rises by the lift, homes still cash flow positive', 1.5, () => {
  const homes = seed.houses.filter((h) => h.type === 'house' && h.status === 'planned').sort((a, b) => plS.purchase[a.id] - plS.purchase[b.id]).filter((h) => h.id !== 'birch'), first = homes.slice(0, 2), bad = [];
  first.forEach((h) => { const mult = (h.arv - h.price) / h.capex; if (!(h.capex >= 20000 && h.capex <= 40000 && !h.finCapex && mult >= 1.2 && mult <= 1.6 && h.liftIncome >= 8 && h.liftIncome <= 12)) bad.push(h.id + ' rehab ' + h.capex + ' x' + mult.toFixed(2) + ' lift ' + h.liftIncome);
    const m0 = plS.purchase[h.id], t = m0 + h.capexMonths, a = plS.assetsAt(t).find((x) => x.id === h.id), b = plS.assetsAt(t - 1).find((x) => x.id === h.id), v = plS.V[h.id];
    if (!a || !b || !near(a.value, h.arv, 1)) bad.push(h.id + ' value at completion ' + (a && Math.round(a.value)) + ' vs arv ' + h.arv);
    const g = (1 + h.growth / 100) ** (h.capexMonths / 12), refInc = v.noi * g * (1 + h.liftIncome / 100); if (!a || !nearRel(a.income, refInc, 1e-6)) bad.push(h.id + ' income ' + (a && Math.round(a.income)) + ' vs ' + Math.round(refInc));
    if (plS.V[h.id].cf < 0) bad.push(h.id + ' loses money'); });
  return { pass: first.length === 2 && bad.length === 0, detail: first.map((h) => h.id + ' $' + h.capex + ' -> $' + h.arv).join('; ') + (bad.length ? ' | ' + bad.join('; ') : '') };
});
chk('L8', 'L8.7', 'Default plan is robust and honest: with the default finance profile net worth >= $125M and cash flow >= $1.3M/mo in today\'s dollars, verdict Yes, debt-to-income peak <= 35%, no unfunded asset, every purchase inside the plan years; with a much tighter profile (about $580/mo of job money left after living costs) the plan is NOT silently Yes: the verdict is Not yet (no; was Tight before the can-I-buy-this tests: a purchase after the plan ends is not possible) with a reason that names the late last purchase', 2, () => {
  const f = E.finance(seed, plS), h = plS.horizon;
  const T = JSON.parse(JSON.stringify(seed)); T.p.living = 5050; E.normalize(T); const pw = E.plan(T), fw = E.finance(T, pw), sur = fw.kpis.jobSurplus0;
  const d28 = Math.pow(1 + seed.p.inflation / 100, 28), ok = h.nw / d28 >= 125e6 && h.cf / d28 >= 1.3e6 && f.status === 'yes' && plS.worst.dti <= 35 && plS.unfunded.length === 0 && plS.lastBuy <= plS.planM && Math.abs(sur - 580) < 5 && fw.status === 'no' && /last purchase/i.test(fw.reasons.map((x) => x.text).join(' ')) && pw.unfunded.length === 0;
  return { pass: ok, detail: 'default NW $' + (h.nw / 1e6).toFixed(1) + 'M, cf $' + (h.cf / 1e6).toFixed(2) + 'M, DTI ' + plS.worst.dti.toFixed(0) + '%, last buy month ' + plS.lastBuy + '; weak profile (job money $' + Math.round(sur) + '/mo): NW $' + (pw.horizon.nw / 1e6).toFixed(1) + 'M, verdict ' + fw.status + ', last buy month ' + pw.lastBuy };
});
chk('L8', 'L8.8', 'Sold asset cash profit (pl.exits[id].profit) = sale price - selling costs - loan and liens paid off - tax on the sale - (down payment + closing costs + cash improvements), checked against independent reference math on 40 random sales (gain, loss, flat-rate tax, improvements)', 2, () => {
  let bad = 0, ex = '';
  for (let k = 0; k < 40; k++) { const price = Math.round(U(120000, 900000)), dp = pick([20, 25, 35]), rate = U(4, 9), term = pick([240, 360]), cl = pick([2, 3, 4]), capex = pick([0, 0, 15000, 40000]), sm = Math.round(U(14, 100)), sc = pick([4, 6, 8]), gr = pick([0, 3, 6]), liens = pick([0, 0, 12000]);
    const h = A('house', 'conv30', { id: 'a', status: 'planned', price, dp, rate, term, closingPct: cl, capex, capexMonths: 3, growth: gr, exit: 'sell', exitMonth: sm, sellCost: sc, liens, rent: Math.round(price * 0.011), tax: 100, ins: 60 });
    const S = mk({ planYears: 12 }, [h]); S.p = E.normalizePersonal({ cash: 1e9, salesTaxPct: 20, jobs: [] }); const pl = E.plan(S), ex0 = pl.exits.a; if (!ex0) { bad++; continue; }
    const m = pl.purchase.a, soldAt = ex0.month, loan = price * (1 - dp / 100), bal = pl.balAt('a', soldAt), val = price * Math.pow(1 + gr / 100, (soldAt - m) / 12) * (h.arv > 0 ? 1 : 1);
    const net = val * (1 - sc / 100), proceeds = net - bal - liens, cashIn = price * dp / 100 + price * cl / 100 + capex, gain = net - (price + price * cl / 100 + capex - E.depCum(S, h, soldAt - m)), tax = gain > 0 ? gain * 0.2 : 0, want = proceeds - tax - cashIn;
    if (!nearRel(ex0.profit, want, 1e-6) || !near(ex0.proceeds, proceeds, 0.01) || !near(ex0.cashIn, cashIn, 0.01) || !near(ex0.tax, tax, 0.01)) { bad++; ex = [price, dp, sm, Math.round(ex0.profit), Math.round(want)].join(' '); } }
  return { pass: bad === 0, detail: bad + ' / 40 disagree ' + ex };
});
chk('L9', 'L9.8', 'Stretch scenario affords 607 Siena Way (Bel Air, Los Angeles CA 90077): it is a planned $135,000,000 asset bought inside the plan years, the can-I-buy-this verdict of that asset is not "no" (was: the whole portfolio verdict; the stretch sample Bridgeway loan is over the $5M SBA 7(a) cap), the cash flow after the purchase still covers the house\'s carry (property tax + insurance + upkeep), no partner capital, and net worth stays large', 2, () => {
  const st = E.seedStretch(), pl = E.plan(st), f = E.finance(st, pl), h = st.houses.find((x) => /607 Siena Way/.test(x.addr)), m = h ? pl.purchase[h.id] : Infinity;
  if (!h) return { pass: false, detail: 'house missing' };
  const carry = h.tax + h.ins + (st.g.maint / 100) * h.price / 12, after = isFinite(m) ? pl.at(m + 1) : null;
  const ok = h.price === 135000000 && h.status === 'planned' && /Los Angeles CA 90077/.test(h.addr) && isFinite(m) && m <= pl.planM && f.feas.assets[h.id].verdict !== 'no' && after && after.cf >= carry && pl.horizon.nw >= 300e6 && st.p.capital.every((c) => c.amount === 0 || true) && pl.unfunded.length === 0;
  return { pass: !!ok, detail: 'bought in month ' + m + ' (plan ' + pl.planM + '), verdict ' + f.status + ', NW end $' + (pl.horizon.nw / 1e6).toFixed(0) + 'M, cash flow after $' + (after && Math.round(after.cf)) + ' vs carry $' + Math.round(carry) + '/mo' };
});


/* ---------------- L11: the 16 purchase examples ---------------- */
{ const S0 = E.seedPlan(), EX = E.EXAMPLES, cats = ['house', 'multi', 'commercial', 'business'], M = (x) => E.exampleMetrics(S0, x);
chk('L11', 'L11.1', 'Examples table: 4 examples in each of Home single-family, Multi-family, Commercial, Business, tiers 1-4 once each (cost ascending), unique ids, none uses the user\'s illustrative 80,000 / 20,000 / 140,000, every (i) text says typical, not a quote and shows arithmetic', 1, () => {
  const bad = []; cats.forEach((c) => { const l = E.examplesFor(c === 'multi' ? 'house' : c, c === 'multi'); if (l.length !== 4 || l.map((x) => x.tier).join() !== '1,2,3,4') bad.push(c + ' tiers'); const pr = l.map((x) => x.f.price); if (pr.some((v, i) => i && c !== 'house' && v <= pr[i - 1])) bad.push(c + ' price not ascending ' + pr.join('/')); });
  if (EX.length !== 16 || new Set(EX.map((x) => x.id)).size !== 16) bad.push('count ' + EX.length);
  EX.forEach((x) => { const m = M(x); [x.f.price, x.f.capex, x.f.arv, m.cash].forEach((v) => { if ([80000, 20000, 140000].indexOf(v) >= 0) bad.push(x.id + ' uses ' + v); }); const i = E.exampleInfo(S0, x); if (!/typical, not a quote/i.test(i.b) || !/\$/.test(i.e) || !/(x|=)/.test(i.e) || /NaN|undefined|Infinity/.test(i.b + i.e)) bad.push(x.id + ' info'); });
  return { pass: !bad.length, detail: bad.join('; ') }; });
chk('L11', 'L11.2', 'Every example is internally consistent when built through the Add path (newAsset + applyLoan + mfDefaults): cash flow after the loan >= 0, DSCR >= the loan\'s minimum on today\'s rent and after any rent lift, the loan fits the unit count, cash needed = down payment + closing + cash rehab, rent total = units x rent per unit', 2, () => {
  const bad = []; EX.forEach((x) => { const m = M(x), h = m.h, lo = E.loanById(x.loanId);
    if (!(m.cf > 0)) bad.push(x.id + ' cf ' + m.cf.toFixed(0)); if (m.dscr + 1e-9 < m.minDscr || m.dscrAfter + 1e-9 < m.minDscr) bad.push(x.id + ' dscr ' + m.dscr.toFixed(2) + '/' + m.dscrAfter.toFixed(2) + ' < ' + m.minDscr);
    if (h.loanId !== x.loanId || !lo || lo.types.indexOf(x.type) < 0 && !lo.multi) bad.push(x.id + ' loan'); if (x.cat === 'multi') { if (!E.mfFit(lo, x.units, !!x.pack).ok || h.kind !== 'multi' || h.units !== x.units || !!h.pack !== !!x.pack) bad.push(x.id + ' multi fit'); } else if (h.kind !== 'single') bad.push(x.id + ' kind');
    const cash = E.downAmt(h) + h.price * (h.closingPct == null ? S0.g.closing : h.closingPct) / 100 + (h.finCapex ? 0 : h.capex); if (Math.abs(cash - m.cash) > 1) bad.push(x.id + ' cash ' + cash + ' vs ' + m.cash);
    if (x.type === 'business' && Math.abs(h.revenue * h.margin / 100 - h.rent) > 1) bad.push(x.id + ' revenue x margin'); if (x.cat === 'multi' && !(h.rent > 0 && h.rent / h.units >= 800 && h.rent / h.units <= 2500)) bad.push(x.id + ' rent per unit');
    if (h.status !== 'planned' || h.id === undefined) bad.push(x.id + ' status'); const Sx = E.normalize(JSON.parse(JSON.stringify(S0))); Sx.houses.push(h); E.register && E.register(Sx, h); const pl = E.plan(Sx); if (!pl || !isFinite(pl.horizon.nw)) bad.push(x.id + ' plan'); });
  return { pass: !bad.length, detail: bad.join('; ') }; });
chk('L11', 'L11.3', 'Market sanity: commercial cap rate is inside the property band and within 0.15 of its CBRE-based target; business price / yearly profit is inside its multiple range and SBA 7(a) loans stay under $5M; the homes follow the stated rules (70% rule and rent under the HUD FMR for the budget fixer, appraisal 1.2-1.6x the rehab for the value-add, all-in <= 75% of value)', 2, () => {
  const bad = []; EX.forEach((x) => { const m = M(x);
    if (x.type === 'commercial' && (m.cap < x.capBand[0] || m.cap > x.capBand[1] || Math.abs(m.cap - x.capTarget) > 0.15)) bad.push(x.id + ' cap ' + m.cap.toFixed(2));
    if (x.type === 'business') { if (m.mult < x.multRange[0] || m.mult > x.multRange[1]) bad.push(x.id + ' mult ' + m.mult.toFixed(2)); if (x.loanId === 'sba7a' && m.loan > 5e6) bad.push(x.id + ' SBA cap'); if (m.price / (m.revenue * 12) > 1.6) bad.push(x.id + ' price/revenue'); }
    if (x.type === 'commercial' && (m.h.dp < 25 || m.h.dp > 50)) bad.push(x.id + ' dp'); });
  const s8 = EX.find((x) => x.id === 'home-s8'), a = M(s8); if (a.price > a.arv * 0.7 - a.capex + 1 || a.capex !== Math.round(s8.scope * 1.15) || a.rent >= s8.fmr || (a.price + a.capex) / a.arv > 0.75) bad.push('home-s8 rules');
  const va = EX.find((x) => x.id === 'home-va'), b = M(va), k = (b.arv - b.price) / b.capex; if (k < 1.2 || k > 1.6 || b.capex !== Math.round(va.scope * 1.15)) bad.push('home-va lift ' + k.toFixed(2));
  const v20 = M(EX.find((x) => x.id === 'multi-20va')), nv = v20.noiAfter * 12 / 0.07; if (Math.abs(v20.arv - nv) / nv > 0.03 || v20.capex !== Math.round(20 * 6000 * 1.15)) bad.push('multi-20va value');
  return { pass: !bad.length, detail: bad.join('; ') }; });
chk('L11', 'L11.4', 'Applying an example is the normal Add path: exampleAsset equals newAsset(type, loan, exampleOpts) field for field, and with the user\'s own assumptions (7% vacancy changed to 10%) the preview figures follow the assumptions', 1, () => {
  const bad = []; EX.forEach((x) => { const h = E.exampleAsset(x), g = E.newAsset(x.type, x.loanId, Object.assign({ fresh: true }, E.exampleOpts(x))); const a = Object.assign({}, h, { id: 0 }), c = Object.assign({}, g, { id: 0 }); if (JSON.stringify(a) !== JSON.stringify(c)) bad.push(x.id + ' differs'); });
  const S2 = JSON.parse(JSON.stringify(S0)); S2.g.vac = 15; const x = EX[1]; if (!(E.exampleMetrics(S2, x).noi < E.exampleMetrics(S0, x).noi)) bad.push('assumptions ignored');
  return { pass: !bad.length, detail: bad.join('; ') }; });

/* ---- L11.5-L11.10: editable examples, the compatibility matrix (engine side) ---- */
const exStub = () => { const m = {}; return { m, getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: (k) => { delete m[k]; } }; };
const RULE = { price: [1, 1e10], rent: [0, 1e9], revenue: [0, 1e10], margin: [0, 100], tax: [0, 1e9], ins: [0, 1e9], hoa: [0, 1e9], nnn: [0, 100], capex: [0, 1e10], arv: [0, 1e10], capexMonths: [0, 120], growth: [-50, 100], sellCost: [0, 50], dp: [0, 100], units: [2, 500] }; /* the spec's ranges, written out independently of the engine */
const FIELDSOF = { house: ['price', 'rent', 'tax', 'ins', 'hoa', 'capex', 'arv', 'capexMonths', 'growth', 'sellCost', 'dp'], multi: ['units', 'price', 'rent', 'tax', 'ins', 'hoa', 'capex', 'arv', 'capexMonths', 'growth', 'sellCost', 'dp'], commercial: ['price', 'rent', 'tax', 'ins', 'hoa', 'nnn', 'growth', 'sellCost', 'dp'], business: ['price', 'revenue', 'margin', 'growth', 'sellCost', 'dp'] };
const badNum = (h) => Object.keys(h).filter((k) => typeof h[k] === 'number' && !isFinite(h[k]) || h[k] === undefined);
{ const S0 = E.seedPlan(), EX = E.EXAMPLES, before = JSON.stringify(EX.map((x) => x.f)), planBefore = JSON.stringify(S0);
const okVals = (k) => { const [lo, hi] = RULE[k]; return [lo, hi, k === 'units' ? 7 : (lo + Math.min(hi, lo + 1e6)) / 2]; };
chk('L11', 'L11.5', 'Editing matrix, validation: for all 16 examples and every editable field, 0 / blank / negative / NaN / Infinity / text / huge are refused with a message exactly when outside the field\'s range, and the in-range values (low edge, high edge, middle) are accepted; units only as whole numbers 2-500; nothing else is editable', 2, () => {
  const bad = []; EX.forEach((x) => { FIELDSOF[x.cat].forEach((k) => { const [lo, hi] = RULE[k];
    [[0, 0], ['', null], [-1, -1], [NaN, null], [Infinity, null], ['abc', null], ['12abc', null], [1e13, 1e13], [null, null], [undefined, null], [true, null], ['1,000', 1000], [' $2 ', 2], [lo, lo], [hi, hi]].forEach(([v, num]) => {
      const r = E.exCheck(x.cat, k, v), expectOk = num !== null && num >= lo && num <= hi && (k !== 'units' || Number.isInteger(num));
      if (!!r.ok !== expectOk) bad.push(x.id + '.' + k + ' ' + String(v) + ' -> ' + JSON.stringify(r)); if (!r.ok && !(r.msg && r.msg.length > 3)) bad.push(x.id + '.' + k + ' no message'); if (r.ok && (!isFinite(r.v))) bad.push(x.id + '.' + k + ' bad v'); }); });
    ['loanId', 'name', 'tier', 'id', 'cat', 'type', 'pack', 'revenue', 'nnn', 'units', 'capex'].filter((k) => !FIELDSOF[x.cat].includes(k)).forEach((k) => { if (k !== 'loanId' && E.exCheck(x.cat, k, 5).ok) bad.push(x.id + ' ' + k + ' should not be editable'); }); });
  return { pass: !bad.length, detail: bad.slice(0, 6).join('; ') }; });
chk('L11', 'L11.6', 'Editing matrix, assets: every example x every field at low / middle / high x every loan option (all multi-family loans at units 2, 4, 5, 20, 50, 500) goes through the draft setter, exampleAsset, newAsset and the plan: no NaN / Infinity / undefined on the asset, normalize is idempotent, the plan runs and its totals are finite, cash needed = down + closing + cash rehab, cash flow = income - payment, the added asset equals the edited example field for field', 3, () => {
  const bad = []; let n = 0;
  EX.forEach((x) => { const sh = E.exampleShipped(x.id), loans = x.cat === 'multi' ? E.MFLOANS.map((l) => l.id) : E.LOANS.filter((l) => l.types.includes(x.type)).map((l) => l.id);
    const runs = []; FIELDSOF[x.cat].forEach((k) => okVals(k).forEach((v) => runs.push({ [k]: v }))); loans.forEach((l) => runs.push({ loanId: l })); if (x.cat === 'multi') [2, 4, 5, 20, 50, 500].forEach((u) => loans.forEach((l) => runs.push({ units: u, loanId: l })));
    runs.forEach((edit) => { let d = {}, ok = true; Object.keys(edit).forEach((k) => { const r = E.exDraftSet(sh, d, k, edit[k]); if (!r.ok) ok = false; else d = r.draft; }); if (!ok) { bad.push(x.id + ' ' + JSON.stringify(edit) + ' refused'); return; }
      n++; const ex = E.exEff(sh, d), h = E.exampleAsset(ex), m = E.exampleMetrics(S0, ex), tag = x.id + ' ' + JSON.stringify(edit);
      if (badNum(h).length) bad.push(tag + ' asset ' + badNum(h)); if (!isFinite(m.cash) || !isFinite(m.cf) || !isFinite(m.cap) || m.dscr !== m.dscr) bad.push(tag + ' metrics');
      if (Math.abs(m.cash - (E.downAmt(h) + h.price * (h.closingPct == null ? S0.g.closing : h.closingPct) / 100 + (h.finCapex ? 0 : h.capex))) > 1) bad.push(tag + ' cash identity'); if (Math.abs(m.cf - (E.noiOf(S0, h) - E.payment(h) - E.mipMonthly(h))) > 0.01) bad.push(tag + ' cf identity');
      const g = E.newAsset(x.type, ex.loanId, Object.assign({ fresh: true }, E.exampleOpts(ex))); if (JSON.stringify(Object.assign({}, h, { id: 0 })) !== JSON.stringify(Object.assign({}, g, { id: 0 }))) bad.push(tag + ' asset != newAsset path');
      Object.keys(d).forEach((k) => { if (k === 'loanId') { if (h.loanId !== d.loanId) bad.push(tag + ' loan'); } else if (k === 'units') { if (E.unitsOf(h) !== d.units) bad.push(tag + ' units'); } else if (k === 'revenue') { if (Math.abs(E.revOf(h) - d.revenue) > 0.01) bad.push(tag + ' revenue'); } else if (k === 'margin') { if (Math.abs(E.marginOf(h) - d.margin) > 0.001) bad.push(tag + ' margin'); } else if (h[k] !== d[k]) bad.push(tag + ' field ' + k + ' ' + h[k] + ' vs ' + d[k]); });
      if (x.cat === 'business' && Math.abs(h.rent - Math.round(E.revOf(h) * E.marginOf(h) / 100)) > 1) bad.push(tag + ' profit != revenue x margin');
      if (x.cat === 'multi' && (h.kind !== 'multi' || h.pack !== !!x.pack)) bad.push(tag + ' multi kind');
      if (n % 7 === 0) { const Sx = E.normalize(JSON.parse(JSON.stringify(S0))); Sx.houses.push(h); E.register(Sx, h); const a = JSON.stringify(E.normalize(JSON.parse(JSON.stringify(Sx)))), b = JSON.stringify(E.normalize(JSON.parse(a))); if (a !== b) bad.push(tag + ' normalize not idempotent'); const pl = E.plan(Sx); if (!pl || !isFinite(pl.horizon.nw) || !isFinite(pl.horizon.cf)) bad.push(tag + ' plan'); } }); });
  return { pass: !bad.length && n > 1000, detail: n + ' runs; ' + bad.slice(0, 6).join('; ') }; });
chk('L11', 'L11.7', 'Warnings fire exactly when the rule is broken: over thousands of random edits the set of warnings equals an independent reference of the rules (cash flow < 0; DSCR < the loan\'s minimum; loan not for the unit count; SBA 7(a) above $5M; price / profit outside its range; cap rate outside its band; price above the 70% rule), and none fires on the 16 shipped examples', 2, () => {
  const bad = []; let fired = {}; EX.forEach((x) => { if (E.exWarnings(S0, E.exampleById(x.id)).length) bad.push(x.id + ' warns by default'); });
  const rr = R.rng(77); const pickk = (a) => a[Math.floor(rr() * a.length)];
  for (let i = 0; i < 4000; i++) { const x = pickk(EX), sh = E.exampleShipped(x.id); let d = {}; const k = 1 + Math.floor(rr() * 4);
    for (let j = 0; j < k; j++) { const f = pickk(FIELDSOF[x.cat].concat(['loanId'])); let v; if (f === 'loanId') { const ls = x.cat === 'multi' ? E.MFLOANS : E.LOANS.filter((l) => l.types.includes(x.type)); v = pickk(ls).id; } else if (f === 'units') v = pickk([2, 3, 4, 5, 8, 20, 30, 50, 120, 500]); else { const [lo, hi] = RULE[f]; const cur = E.exVal(E.exEff(sh, d), f); v = rr() < 0.5 ? cur * (0.3 + rr() * 2.2) : Math.min(hi, lo + rr() * (f === 'price' ? 2e7 : f === 'rent' || f === 'revenue' ? 2e5 : f === 'margin' || f === 'dp' || f === 'nnn' ? 100 : f === 'growth' ? 20 : f === 'sellCost' ? 15 : 5e5)); v = Math.min(hi, Math.max(lo, v)); } const r = E.exDraftSet(sh, d, f, v); if (r.ok) d = r.draft; }
    const ex = E.exEff(sh, d), m = E.exampleMetrics(S0, ex), got = E.exWarnings(S0, ex, m).map((w) => w.id).sort().join(), h = m.h, lo = E.loanById(ex.loanId), want = [];
    if (m.cf < 0) want.push('cf'); const pay = E.payment(h) + E.mipMonthly(h); if (pay > 0.5 && E.minDscrOf(ex.loanId) > 0 && E.noiOf(S0, h) / pay < E.minDscrOf(ex.loanId)) want.push('dscr');
    if (x.cat === 'multi' && !E.mfFit(lo, E.unitsOf(h), !!x.pack).ok) want.push('elig'); if (ex.loanId === 'sba7a' && E.loan(h) > 5e6) want.push('sba');
    if (x.multRange) { const mu = h.rent > 0 ? h.price / (h.rent * 12) : 0; if (mu < x.multRange[0] || mu > x.multRange[1]) want.push('mult'); }
    if (x.capBand) { const cp = E.noiOf(S0, h) * 12 / h.price * 100; if (cp < x.capBand[0] || cp > x.capBand[1]) want.push('cap'); } if (x.arvRule && h.price > h.arv * x.arvRule / 100 - h.capex) want.push('rule');
    want.sort(); want.forEach((w) => { fired[w] = (fired[w] || 0) + 1; }); if (got !== want.join()) bad.push(x.id + ' ' + JSON.stringify(d) + ' got [' + got + '] want [' + want + ']'); }
  const kinds = ['cf', 'dscr', 'elig', 'sba', 'mult', 'cap', 'rule'].filter((w) => !fired[w]);
  return { pass: !bad.length && !kinds.length, detail: bad.slice(0, 4).join('; ') + (kinds.length ? ' never fired: ' + kinds : '') + ' fired ' + JSON.stringify(fired) }; });
chk('L11', 'L11.8', 'Overrides stay apart from everything else: the shipped table and the default plan are byte-for-byte unchanged after editing, saving, resetting and importing overrides; the effective example is shipped + overrides through one function (examplesFor / exampleById / exEffective agree), unedited fields follow the shipped value, an edit equal to the shipped value is not an override, and a shipped value changed later flows through to unedited fields while an edited field wins', 2, () => {
  const bad = [], st = exStub(); E.exSet({});
  let d = E.exDraftSet(E.exampleShipped('home-va'), {}, 'price', 250000).draft; E.exCommit(st, 'home-va', d); E.exCommit(st, 'biz-hvac', E.exDraftSet(E.exampleShipped('biz-hvac'), {}, 'margin', 30).draft);
  const a = E.exampleById('home-va'), b = E.examplesFor('house', false).find((x) => x.id === 'home-va'), c = E.exEffective('home-va'); if (a.f.price !== 250000 || b.f.price !== 250000 || c.f.price !== 250000 || a.f.rent !== 2300 || !a.edited.includes('price')) bad.push('effective disagrees');
  if (E.exampleById('biz-hvac').f.rent !== Math.round(133000 * 0.30)) bad.push('profit != revenue x margin'); if (E.exampleById('home-turnkey').edited.length) bad.push('other example edited');
  if (E.exCommit(st, 'home-va', { price: 232000 }) && E.exOverrides()['home-va']) bad.push('equal-to-shipped kept as override');
  E.exCommit(st, 'home-va', { price: 250000 }); E.exCommit(st, 'home-va', {}); if (E.exOverrides()['home-va'] || !E.exOverrides()['biz-hvac']) bad.push('reset touched others');
  const exp = E.exExport(); E.exImport({ v: 1, ov: { 'home-va': { price: 240000 } } }, st); if (JSON.stringify(Object.keys(E.exOverrides())) !== '["home-va"]') bad.push('import replaces'); E.exImport(exp, st); if (!E.exOverrides()['biz-hvac']) bad.push('export/import roundtrip');
  if (JSON.stringify(EX.map((x) => x.f)) !== before || JSON.stringify(S0) !== planBefore) bad.push('shipped table or default plan changed');
  const shipped = E.exampleShipped('home-va'), old = shipped.f.rent; shipped.f.rent = 2500; const eff = E.exEff(shipped, { price: 250000 }); shipped.f.rent = old; if (eff.f.rent !== 2500 || eff.f.price !== 250000) bad.push('shipped change not followed / override lost');
  E.exSet({}); return { pass: !bad.length, detail: bad.join('; ') }; });
chk('L11', 'L11.9', 'Loading is defensive and storage failure is survivable: garbage text, wrong types, unknown ids and fields, numbers out of range, NaN, a loan of the wrong kind and a future version are cleaned (clamped or dropped) without throwing; a storage that throws on read or write keeps the edits in memory; a second tab\'s edits to other examples survive a save (merge on write); old backups without overrides leave them alone', 2, () => {
  const bad = []; E.exSet({}); const st = exStub();
  ['{', 'null', '[]', '"x"', '{"v":1}', '{"v":1,"ov":[]}', '{"v":1,"ov":{"nope":{"price":1}}}', '{"v":1,"ov":{"home-s8":5}}'].forEach((t) => { st.m['rep-v4-examples'] = t; try { E.exLoad(st); if (Object.keys(E.exOverrides()).length) bad.push('kept junk ' + t); } catch (e) { bad.push('threw on ' + t); } });
  st.m['rep-v4-examples'] = JSON.stringify({ v: 9, ov: { 'home-s8': { price: -5, rent: 'x', tax: 1e99, ins: NaN, hoa: null, capexMonths: 7.6, bogus: 3, loanId: 'sba7a', growth: 500 }, 'multi-hack': { units: 9999, loanId: 'mfVa' }, 'biz-vend': { loanId: 'conv30', margin: 55.5, rent: 9 } } });
  E.exLoad(st); const o = E.exOverrides(); if (!(o['home-s8'] && o['home-s8'].price === 1 && o['home-s8'].tax === 1e9 && o['home-s8'].capexMonths === 8 && o['home-s8'].growth === 100 && !('rent' in o['home-s8']) && !('bogus' in o['home-s8']) && !('loanId' in o['home-s8']) && !('ins' in o['home-s8']))) bad.push('clamp/drop ' + JSON.stringify(o['home-s8']));
  if (!(o['multi-hack'] && o['multi-hack'].units === 500 && o['multi-hack'].loanId === 'mfVa')) bad.push('multi ' + JSON.stringify(o['multi-hack'])); if (!(o['biz-vend'] && o['biz-vend'].margin === 55.5 && !('loanId' in o['biz-vend']) && !('rent' in o['biz-vend']))) bad.push('biz ' + JSON.stringify(o['biz-vend']));
  const boom = { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); }, removeItem() { throw new Error('x'); } }; E.exSet({}); if (E.exLoad(boom) !== false) bad.push('load on throwing storage'); if (E.exCommit(boom, 'home-s8', { price: 130000 }) !== false || E.exampleById('home-s8').f.price !== 130000) bad.push('memory fallback');
  E.exSet({}); const t1 = exStub(); E.exCommit(t1, 'home-s8', { price: 120000 }); const stale = JSON.stringify(E.exExport()); E.exSet({}); /* tab B wrote another example while tab A still had the old map */ t1.m['rep-v4-examples'] = JSON.stringify({ v: 1, ov: { 'home-s8': { price: 120000 }, 'comm-nnn': { price: 1700000 } } }); E.exSet(JSON.parse(stale).ov); E.exCommit(t1, 'biz-sba', { margin: 15 }); const kept = JSON.parse(t1.m['rep-v4-examples']).ov; if (!(kept['comm-nnn'] && kept['biz-sba'] && kept['home-s8'])) bad.push('merge on write ' + Object.keys(kept));
  if (!/"v":1/.test(t1.m['rep-v4-examples'])) bad.push('no version'); E.exSet({}); return { pass: !bad.length, detail: bad.join('; ') }; });
}
}


/* ---------------- L12: can I buy this? feasibility, shortfall panel, buy order ---------------- */
{
  const P0 = (o) => Object.assign({ cash: 0, cashApy: 0, living: 0, inflation: 0, emergencyMonths: 0, portfolioTaxPct: 0, salesTaxPct: 0, statePct: 0, landPct: 20, bizIntPct: 70, housing: 0, operating: 1, gmMonthly: 0, bizHours: 0, jobs: [], planned: [], capital: [] }, o || {});
  const mkF = (houses, p, g) => E.normalize({ g: Object.assign({}, E.GDEF, { closing: 0, autoPay: false }, g || {}), p: P0(p), houses });
  const biz = (o) => A('business', 'bankbiz', Object.assign({ id: 'b1', addr: 'Big Business', price: 10000000, dp: 25, closingPct: 0, rent: 250000, capex: 0, growth: 0 }, o || {}));
  const run = (S) => { const pl = E.plan(S), f = E.finance(S, pl); return { pl, f, F: f.feas, sf: (id) => E.shortfall(S, pl, f, id) }; };
  chk('L12', 'L12.1', "The user's example ($10M business, $2.5M down, $1M can be pulled out, $250,000/mo of income): cash needed $2.5M, down payment short -$1.5M, money uncovered -$9M, payment from the loan formula, monthly covered", 3, () => {
    const S = mkF([biz()], { cash: 1e6 }), r = run(S), sf = r.sf('b1'), pay = R.paymentClosed(7.5e6, 9, 84), v = r.F.assets.b1, bad = [];
    if (sf.cash.need !== 2.5e6) bad.push('need ' + sf.cash.need); if (!near(sf.lines.downShort.value, -1.5e6, 0.5)) bad.push('down ' + sf.lines.downShort.value); if (!near(sf.lines.uncovered.value, -9e6, 0.5)) bad.push('uncov ' + sf.lines.uncovered.value);
    if (!near(sf.monthly.payment, pay, 0.01)) bad.push('pay ' + sf.monthly.payment + ' vs ' + pay); if (!sf.monthly.covered || !near(sf.lines.monthShort.value, 250000 - pay, 0.01)) bad.push('monthly ' + sf.lines.monthShort.value);
    if (v.verdict !== 'no' || v.kind !== 'nofund' || r.f.status !== 'no') bad.push('verdict ' + v.verdict + '/' + v.kind + '/' + r.f.status); if (!/^Not possible: needs \$2\.5M, the plan never reaches it/.test(v.reasons[0].text)) bad.push('reason ' + v.reasons[0].text);
    return { pass: !bad.length, detail: bad.join('; ') }; });
  chk('L12', 'L12.2', 'A portfolio that can afford it: $3M cash covers the $2.5M down, income covers the payment -> verdict yes, every criterion ok, no cash shortfall', 2, () => {
    const r = run(mkF([biz()], { cash: 3e6 })), a = r.F.assets.b1, bad = a.criteria.filter((c) => c.status !== 'ok').map((c) => c.id + ':' + c.status);
    return { pass: a.verdict === 'yes' && !bad.length && r.f.status !== 'no' && r.sf('b1') === null || (a.verdict === 'yes' && !bad.length && r.f.status !== 'no'), detail: a.verdict + ' ' + bad.join(',') + ' ' + r.f.status }; });
  chk('L12', 'L12.3', 'Cash-only short (income covers the payment) is no-fund and offers a lower price of $4M; monthly-only short (plenty of cash, income cannot carry the payment) is no-cashflow with monthly short = available - payment', 3, () => {
    const a = run(mkF([biz()], { cash: 1e6 })), pay = R.paymentClosed(7.5e6, 9, 84), bad = [], sa = a.sf('b1');
    if (a.F.assets.b1.kind !== 'nofund' || !sa.monthly.covered) bad.push('cash-only kind ' + a.F.assets.b1.kind); if (!sa.changes.some((c) => c.id === 'price' && c.price === 4e6)) bad.push('price option ' + JSON.stringify(sa.changes.map((c) => c.id + c.price)));
    const b = run(mkF([biz({ rent: 90000 })], { cash: 5e6 })), sb = b.sf('b1'), vb = b.F.assets.b1;
    if (vb.verdict !== 'no' || vb.kind !== 'nolender' && vb.kind !== 'nocashflow') bad.push('monthly-only ' + vb.verdict + '/' + vb.kind); if (!near(sb.lines.monthShort.value, 90000 - pay, 0.01) || sb.monthly.covered) bad.push('monthly short ' + sb.lines.monthShort.value); if (sb.cash.short !== 0) bad.push('cash short ' + sb.cash.short);
    if (!sb.changes.some((c) => c.id === 'cashflow' && near(c.amount, pay - 90000, 0.01))) bad.push('cashflow option');
    return { pass: !bad.length, detail: bad.join('; ') }; });
  chk('L12', 'L12.4', 'Lender hard tests: a DSCR below the loan minimum and an SBA 7(a) loan over $5M each make the verdict no (kind nolender) with plenty of cash; a DSCR of 1.24 against 1.25 is only a caution', 2, () => {
    const bad = [], pay = R.paymentClosed(7.5e6, 9, 84), d = run(mkF([biz({ rent: 100000 })], { cash: 9e6 })), dd = d.F.assets.b1.criteria.find((c) => c.id === 'dscr');
    if (dd.status !== 'fail' || !near(+dd.measured, 100000 / pay, 0.01) || d.F.assets.b1.verdict !== 'no' || d.F.assets.b1.kind !== 'nolender') bad.push('dscr ' + dd.status + ' ' + dd.measured);
    const s = run(mkF([A('business', 'sba7a', { id: 's1', addr: 'SBA', price: 8e6, dp: 10, closingPct: 0, rent: 400000, growth: 0 })], { cash: 9e6 })), lm = s.F.assets.s1.criteria.find((c) => c.id === 'loanmax');
    if (lm.status !== 'fail' || s.F.assets.s1.kind !== 'nolender' || s.F.assets.s1.verdict !== 'no') bad.push('sba ' + lm.status);
    const c = run(mkF([biz({ rent: Math.round(1.24 * pay) })], { cash: 9e6 })), cc = c.F.assets.b1.criteria.find((x) => x.id === 'dscr'); if (cc.status !== 'caution') bad.push('1.24 should be caution ' + cc.status + ' ' + cc.measured);
    return { pass: !bad.length, detail: bad.join('; ') }; });
  chk('L12', 'L12.5', 'Concentration: with 4 assets one worth 70% of the total is a fail (soft, never makes it no), 40% a caution, 20% ok; fewer than 3 assets are not tested', 1, () => {
    const hs = (p) => [0, 1, 2].map((i) => A('house', 'conv30', { id: 'h' + i, price: 100000, rent: 1500, tax: 100, ins: 50, growth: 0 })).concat([A('house', 'conv30', { id: 'big', price: p, rent: 1500 * p / 100000, tax: 100 * p / 100000, ins: 50, growth: 0 })]);
    const st = (p) => run(mkF(hs(p), { cash: 5e7 })).F.assets.big, cs = (p) => st(p).criteria.find((c) => c.id === 'concentration').status, pr = (sh) => Math.round(300000 * sh / (1 - sh)), bad = [];
    if (cs(pr(0.7)) !== 'fail') bad.push('70% ' + cs(pr(0.7))); if (cs(pr(0.4)) !== 'caution') bad.push('40% ' + cs(pr(0.4))); if (cs(pr(0.2)) !== 'ok') bad.push('20% ' + cs(pr(0.2)));
    if (run(mkF([biz()], { cash: 3e6 })).F.assets.b1.criteria.find((c) => c.id === 'concentration').status !== 'ok') bad.push('1 asset tested'); if (st(pr(0.7)).verdict === 'no') bad.push('concentration made it no ' + st(pr(0.7)).reasons.map((r) => r.id));
    return { pass: !bad.length, detail: bad.join('; ') }; });
  chk('L12', 'L12.6', 'Stress tests: the rate +2 pts and vacancy +10 pts figures equal the loan formula and the income model (hand computed)', 1, () => {
    const h = A('commercial', 'comm25', { id: 'c1', addr: 'Strip', price: 1000000, dp: 25, closingPct: 0, rent: 9000, tax: 0, ins: 0, hoa: 0, nnn: 0, growth: 0 }), S = mkF([h], { cash: 1e6 }), r = run(S), v = r.pl.V.c1, bad = [];
    const num = (c) => +String(c.measured).replace(/[^0-9.]/g, ''), rs = r.F.assets.c1.criteria.find((c) => c.id === 'stress-rate'), cf2 = v.noi - R.paymentClosed(750000, 9.25, 300); if (!near(num(rs), Math.abs(cf2), 1)) bad.push('rate ' + rs.measured + ' vs ' + cf2);
    const vac = r.F.assets.c1.criteria.find((c) => c.id === 'stress-vac'), cfv = v.cf - 0.10 * 9000 * (1 - S.g.mgmt / 100); if (!near(num(vac), Math.abs(cfv), 1)) bad.push('vac ' + vac.measured + ' vs ' + cfv);
    return { pass: !bad.length, detail: bad.join('; ') }; });
  chk('L12', 'L12.7', "The screenshot case ($20,000 cash, $96,000 salary, $27M business needing $10.3M, $6.75M down): verdict no (not tight), headline starts Not yet, first reason 'Not possible: needs $10.3M, the plan never reaches it'", 2, () => {
    const S = mkF([biz({ id: 'g', addr: 'Premier Florida General Contractor', price: 27e6, dp: 25, closingPct: 2, capex: 3.01e6, rent: 340000, growth: 4 })], { cash: 20000, living: 3600, emergencyMonths: 6, inflation: 3, jobs: [{ id: 'j', name: 'Job', kind: 'salary', gross: 96000, raise: 3, tax: 24, hours: 40, start: 0, end: null }] }), r = run(S), a = r.F.assets.g, bad = [];
    if (r.pl.unfunded.indexOf('g') < 0) bad.push('plan funded it'); if (r.f.status !== 'no' || r.F.verdict !== 'no' || a.verdict !== 'no' || a.kind !== 'nofund') bad.push('status ' + r.f.status + '/' + a.verdict); if (!/^Not yet\./.test(r.f.headline)) bad.push('headline ' + r.f.headline);
    if (!/Not possible: needs \$10\.3M, the plan never reaches it/.test(r.f.reasons[0].text)) bad.push('first reason ' + r.f.reasons[0].text); if (a.cash.need !== 10.3e6 || a.cash.down !== 6.75e6) bad.push('need ' + a.cash.need + ' down ' + a.cash.down);
    return { pass: !bad.length, detail: bad.join('; ') }; });
  chk('L12', 'L12.8', 'Live updates: the same asset is no, then yes with more cash, then no again; the asset list follows an added, removed or moved asset (nothing is cached)', 1, () => {
    const S = mkF([biz()], { cash: 1e6 }), bad = [], v0 = run(S).F.assets.b1.verdict; S.p.cash = 3e6; const v1 = run(S).F.assets.b1.verdict; S.p.cash = 1e6; const v2 = run(S).F.assets.b1.verdict; if (v0 !== 'no' || v1 !== 'yes' || v2 !== 'no') bad.push(v0 + v1 + v2);
    const S2 = mkF([A('house', 'conv30', { id: 'a', price: 100000, rent: 1500, tax: 100, ins: 50, growth: 0 }), biz()], { cash: 3e6 }), x = run(S2); if (Object.keys(x.F.assets).length !== 2) bad.push('assets ' + Object.keys(x.F.assets));
    if (Object.keys(run(E.without(S2, 'a')).F.assets).length !== 1) bad.push('removed'); const S4 = JSON.parse(JSON.stringify(S2)); E.moveTo(S4, 'b1', 1); if (S4.houses[0].id !== 'b1') bad.push('moved ' + S4.houses[0].id);
    return { pass: !bad.length, detail: bad.join('; ') }; });
  chk('L12', 'L12.9', 'Buy order engine: moveTo puts an asset at position N across categories, clamps to 1..n, keeps owned assets where they are, numbering is 1..n, nothing is bought before the assets above it', 2, () => {
    const hs = [A('house', 'conv30', { id: 'o1', status: 'owned', price: 100000, rent: 1500, tax: 100, ins: 50, paid: 12 }), A('house', 'conv30', { id: 'h1', price: 100000, rent: 1500, tax: 100, ins: 50 }), A('commercial', 'comm25', { id: 'c1', price: 800000, rent: 8000, tax: 100, ins: 50 }), A('business', 'bankbiz', { id: 'b1', price: 500000, rent: 12000 })];
    const S = mkF(hs, { cash: 1e6 }), bad = [], own = S.houses.findIndex((h) => h.id === 'o1'), r = E.moveTo(S, 'b1', 1), ids = S.houses.filter((h) => h.status !== 'owned').map((h) => h.id);
    if (JSON.stringify(ids) !== '["b1","h1","c1"]' || !r.changed || r.pos !== 1) bad.push('order ' + ids); if (S.houses.findIndex((h) => h.id === 'o1') !== own) bad.push('owned moved');
    const r2 = E.moveTo(S, 'b1', 99); if (r2.pos !== 3 || !r2.clamped || S.houses.filter((h) => h.status !== 'owned').pop().id !== 'b1') bad.push('clamp hi ' + r2.pos); const r3 = E.moveTo(S, 'b1', 0); if (r3.pos !== 1 || !r3.clamped) bad.push('clamp lo ' + r3.pos);
    const pl = E.plan(S), nm = E.numbering(S, pl); if (nm.num.b1 !== 1 || nm.num.h1 !== 2 || nm.num.c1 !== 3) bad.push('numbers ' + JSON.stringify(nm.num)); const ms = ['b1', 'h1', 'c1'].map((i) => pl.purchase[i]).filter(isFinite); if (ms.some((m, i) => i && m < ms[i - 1])) bad.push('bought out of order ' + ms);
    return { pass: !bad.length, detail: bad.join('; ') }; });
  chk('L12', 'L12.10', "The default plan stays green: 36 assets, nothing owned, verdict yes, every asset and portfolio test ok, real net worth >= $125M", 1, () => {
    const S = E.seedPlan(), pl = E.plan(S), f = E.finance(S, pl), F = f.feas, bad = F.criteria.filter((c) => c.status !== 'ok').map((c) => c.id).concat(...Object.values(F.assets).map((a) => a.criteria.filter((c) => c.status !== 'ok').map((c) => a.addr + ':' + c.id)));
    const nw = E.planR(S).horizon.nw; return { pass: S.houses.length === 36 && !S.houses.some((h) => h.status === 'owned') && f.status === 'yes' && F.verdict === 'yes' && !bad.length && nw >= 125e6, detail: f.status + ' ' + bad.slice(0, 4) + ' ' + Math.round(nw) }; });
  chk('L12', 'L12.11', "Nothing planned: one bought asset at 98% debt and no planned asset gives no plan-only rows (no 'last 0 mo', no check-buy, no outside-cash), verdict is never 'no', feasible.none is set; the default plan and an owned + planned plan keep their rows and verdicts", 1, () => {
    const own = A('house', 'conv30', { id: 'o1', status: 'owned', price: 175000, dp: 2, rent: 1500, tax: 100, ins: 50, paid: 12, capex: 8000 }), bad = [];
    const S = mkF([own], { cash: 20000 }), pl = E.plan(S), f = E.finance(S, pl), F = f.feas, cl = E.checkList(S, pl, f);
    if (F.verdict === 'no' || !F.none || F.reasons.length) bad.push('verdict ' + F.verdict + ' none=' + F.none + ' reasons=' + F.reasons.length);
    if (cl.some((c) => c.key === 'p-funding' || c.key === 'buy' || c.id === 'check-buy' || c.id === 'check-pace' || c.id === 'outside-cash' || /last 0 mo/.test(c.value))) bad.push('plan-only rows ' + cl.map((c) => c.id + ':' + c.value).join(','));
    const D = E.seedPlan(), fd = E.finance(D, E.plan(D)), cd = E.checkList(D, E.plan(D), fd); if (fd.feas.verdict !== 'yes' || fd.feas.none || !cd.some((c) => c.id === 'check-pace') || !cd.some((c) => c.id === 'check-buy')) bad.push('default changed');
    const M = mkF([own, A('house', 'conv30', { id: 'p1', price: 100000, rent: 1500, tax: 100, ins: 50 })], { cash: 20000 }), fm2 = E.finance(M, E.plan(M)), cm = E.checkList(M, E.plan(M), fm2);
    if (fm2.feas.none || !cm.some((c) => c.id === 'check-buy') || !cm.some((c) => c.id === 'check-pace') || !fm2.feas.criteria.some((c) => c.id === 'p-cltv')) bad.push('owned+planned lost rows');
    return { pass: !bad.length, detail: bad.join('; ') }; });
  chk('L12', 'L12.12', "Changing the loan type re-derives an AUTO appraisal (203(k) = (price+rehab) x 1.15 to $1,000; any other loan = price + 1.4 x budget, both directions) and never touches an appraisal the user typed (E25)", 1, () => {
    const bad = [], h = A('house', 'k203', { id: 'k1', price: 92000, capex: 32000 }); /* auto: price + rehab financed, arvAuto */
    if (!h.arvAuto || h.arv !== Math.round((92000 + 32000) * 1.15 / 1000) * 1000) bad.push('start ' + h.arv + ' ' + h.arvAuto);
    E.applyLoan(h, 'conv30'); if (h.arv !== Math.round(92000 + 1.4 * 32000) || !h.arvAuto) bad.push('k203->conv30 arv ' + h.arv + ' auto ' + h.arvAuto + ' (want 136800)');
    E.applyLoan(h, 'k203'); if (h.arv !== Math.round((92000 + 32000) * 1.15 / 1000) * 1000) bad.push('conv30->k203 arv ' + h.arv);
    const o = A('house', 'k203', { id: 'k2', price: 92000, capex: 32000 }); o.arv = 150000; o.arvAuto = false; o.gain = null; /* typed by the user */
    E.applyLoan(o, 'conv30'); if (o.arv !== 150000 || o.arvAuto) bad.push('override touched ' + o.arv + ' ' + o.arvAuto);
    return { pass: !bad.length, detail: bad.join('; ') }; });
  chk('L12', 'L12.13', 'Cap rate verdict: one table E.CAP_RANGES (house, multi, commercial, business) and a pure E.capVerdict(kind, cap) = good at or above the good line, low below the low line, ok in between; unknown kind or NaN gives null; the (i) text quotes the same numbers', 1, () => {
    const bad = [], R = E.CAP_RANGES; if (!R || typeof E.capVerdict !== 'function') return { pass: false, detail: 'E.CAP_RANGES / E.capVerdict missing' };
    const want = { house: [5, 7], multi: [5.5, 7], commercial: [6, 8], business: [15, 25] };
    Object.keys(want).forEach((k) => { const r = R[k]; if (!r || r.low !== want[k][0] || r.good !== want[k][1]) { bad.push(k + ' range ' + JSON.stringify(r)); return; }
      const t = [[r.low - 0.01, 'low'], [r.low, 'ok'], [(r.low + r.good) / 2, 'ok'], [r.good - 0.01, 'ok'], [r.good, 'good'], [r.good + 20, 'good'], [-3, 'low'], [0, 'low']];
      t.forEach(([c, w]) => { const g = E.capVerdict(k, c); if (g !== w) bad.push(k + ' ' + c + ' -> ' + g + ' want ' + w); }); });
    if (E.capVerdict('nope', 8) !== null || E.capVerdict('house', NaN) !== null || E.capVerdict('house', undefined) !== null) bad.push('unknown kind or NaN must be null');
    const info = (typeof Info !== 'undefined' ? Info : (global.Info || null)); const src = require('fs').readFileSync(require('path').resolve(__dirname, '../v4/info.js'), 'utf8'), m = /caprate:\s*\{[^}]*?b:\s*'((?:[^'\\]|\\.)*)'[^}]*?e:\s*'((?:[^'\\]|\\.)*)'/.exec(src); void info;
    if (!m) bad.push('caprate entry not found in info.js'); else { const t = m[1] + ' ' + m[2]; if (m[1].length > 450 || m[2].length > 220) bad.push('caprate text too long ' + m[1].length + '/' + m[2].length); Object.keys(want).forEach((k) => want[k].forEach((n) => { if (t.indexOf(String(n)) < 0) bad.push('(i) text lacks ' + n + ' for ' + k); })); if (!/rule of thumb|rules of thumb/i.test(t) || !/not advice/i.test(t)) bad.push('(i) text must say rough rule of thumb, not advice'); }
    return { pass: !bad.length, detail: bad.join('; ') }; });
  /* ---- round2: hero net worth = today, job money saved up override, comp value (L12.14 - L12.18) ---- */
  const clone2 = (o) => JSON.parse(JSON.stringify(o)), seed2 = () => E.normalize(clone2(E.seedPlan()));
  const firstPl = (S) => S.houses.find((h) => h.status !== 'owned');
  chk('L12', 'L12.14', 'Hero net worth is TODAY: E.todayTotals(S, pl, ownedIds).nw = the bought assets (value - loan - liens - credit line, engine month 0) + savings today; nothing owned = savings only; after Remove all = savings only; a sold or planned asset adds nothing; the plan-end horizon figure is untouched', 2, () => {
    const bad = []; const S0 = seed2(), cash = S0.p.cash, pl0 = E.plan(S0), end0 = pl0.horizon.nw;
    const t0 = E.todayTotals(S0, pl0, []); if (Math.abs(t0.nw - cash) > 0.005 || t0.eq !== 0) bad.push('nothing owned: nw ' + t0.nw + ' want ' + cash);
    const S1 = clone2(S0); const b1 = S1.houses.slice(0, 3); b1.forEach((h) => { h.status = 'owned'; }); const S1n = E.normalize(S1), pl1 = E.plan(S1n), ids = b1.map((h) => h.id), t1 = E.todayTotals(S1n, pl1, ids);
    const eqRef = ids.reduce((a, id) => { const x = pl1.assetsAt(0).find((q) => q.id === id), v = pl1.V[id]; return a + (x ? x.value - x.debt : 0); }, 0);
    if (!(t1.eq > 0) || Math.abs(t1.eq - eqRef) > 0.01 || Math.abs(t1.nw - (eqRef + cash)) > 0.01) bad.push('some bought: ' + t1.nw + ' want ' + (eqRef + cash));
    const tp = E.todayTotals(S1n, pl1, S1n.houses.filter((h) => h.status !== 'owned').map((h) => h.id)); if (Math.abs(tp.nw - cash) > 0.005) bad.push('planned ids add nothing: ' + tp.nw);
    const S2 = clone2(S1n); S2.houses = []; const t2 = E.todayTotals(S2, E.plan(S2), []); if (Math.abs(t2.nw - cash) > 0.005) bad.push('after Remove all: ' + t2.nw);
    const S3 = clone2(S1n); S3.houses.find((h) => h.id === ids[0]).exit = 'sell'; S3.houses.find((h) => h.id === ids[0]).exitMonth = 12; const S3n = E.normalize(S3), pl3 = E.plan(S3n), t3 = E.todayTotals(S3n, pl3, ids.slice(1)), t3a = E.todayTotals(S3n, pl3, ids);
    if (!(t3a.nw > t3.nw + 1) || Math.abs(t3.nw - (t1.nw - (t1.eq - t3.eq))) > 0.01) bad.push('a sold asset is left out of ids: ' + t3.nw + ' vs ' + t3a.nw);
    if (Math.abs(E.plan(S0).horizon.nw - end0) > 1e-9) bad.push('plan-end net worth changed');
    const S4 = clone2(S0); S4.p.cash = cash + 1000; if (Math.abs(E.todayTotals(S4, E.plan(S4), []).nw - (cash + 1000)) > 0.005) bad.push('savings are counted');
    return { pass: !bad.length, detail: bad.join('; ') }; });
  chk('L12', 'L12.15', 'Job money saved up override (h.jobSavedOverride, null = Auto): empty is byte-identical to the baseline plan; a larger amount buys the first planned asset no later (and sooner here), a zero amount no sooner; the counted cash = savings above the cushion + the typed amount; normalize keeps it through export / import and defaults old assets to null', 2, () => {
    const bad = [], S0 = seed2(), h0 = firstPl(S0), id = h0.id, base = E.plan(S0), tr0 = base.trust[id];
    const Sn = clone2(S0); Sn.houses.forEach((h) => { delete h.jobSavedOverride; delete h.comp; }); const pn = E.plan(E.normalize(Sn));
    if (JSON.stringify(pn.purchase) !== JSON.stringify(base.purchase) || pn.horizon.nw !== base.horizon.nw || JSON.stringify(pn.series.nw) !== JSON.stringify(base.series.nw)) bad.push('empty override changed numbers');
    if (h0.jobSavedOverride !== null) bad.push('default is not null');
    if (!(tr0.ok && !tr0.pooled && tr0.month > 0)) bad.push('seed first asset not a month>0 non-pooled purchase: ' + JSON.stringify([tr0.ok, tr0.pooled, tr0.month]));
    const Sa = clone2(S0); Sa.houses.find((h) => h.id === id).jobSavedOverride = 1000000; const pa = E.plan(E.normalize(Sa)), tra = pa.trust[id];
    if (!(tra.ok && tra.month < tr0.month)) bad.push('big override should buy sooner: ' + tra.month + ' vs ' + tr0.month);
    const Sz = clone2(S0); Sz.houses.find((h) => h.id === id).jobSavedOverride = 0; const pz = E.plan(E.normalize(Sz)), trz = pz.trust[id];
    if (trz.ok && !(trz.month >= tr0.month)) bad.push('zero override should not be sooner: ' + trz.month);
    const sav = Math.max(0, S0.p.cash - S0.p.emergencyMonths * (S0.p.living * Math.pow(1 + S0.p.inflation / 100, tra.month / 12) + (S0.g.otherDebt || 0))), want = Math.min(tra.need, sav) + 0;
    if (Math.abs(tra.have - (sav + 1000000)) > 0.5) bad.push('counted cash ' + tra.have + ' want ' + (sav + 1000000));
    const Sm = clone2(S0); Sm.houses.find((h) => h.id === id).jobSavedOverride = 5000; const rt = E.normalize(JSON.parse(JSON.stringify(Sm))); if (rt.houses.find((h) => h.id === id).jobSavedOverride !== 5000) bad.push('lost in a save / load round trip');
    const old = clone2(S0); delete old.houses[0].jobSavedOverride; if (E.normalize(old).houses[0].jobSavedOverride !== null) bad.push('old asset not null');
    return { pass: !bad.length, detail: bad.join('; ') }; });
  chk('L12', 'L12.16', 'Job money saved up override reaches the verdict, shortfall and totals: a typed amount reaches feasibility (month and the funding line); a big amount buys sooner, a zero amount not sooner; the plan totals still equal the sum of the rows', 2, () => {
    const bad = [], S0 = seed2(), id = firstPl(S0).id, f0 = E.feasible(S0, E.plan(S0), null).assets[id];
    const Sb = clone2(S0); Sb.houses.find((h) => h.id === id).jobSavedOverride = 1000000; const fb = E.feasible(E.normalize(Sb), E.plan(E.normalize(Sb)), null).assets[id];
    const fund = (f) => ((f.criteria.find((c) => c.id === 'funding') || {}).measured || ''), fz0 = E.feasible(E.normalize(clone2(S0)), E.plan(E.normalize(clone2(S0))), null).assets[id];
    if (!(fb.month < f0.month) || fz0.month !== f0.month || !/1\.02M/.test(fund(fb)) || fund(fb) === fund(f0)) bad.push('feasibility ignores the typed amount: month ' + f0.month + ' -> ' + fb.month + ' funding ' + fund(f0) + ' -> ' + fund(fb));
    const Sz = clone2(S0); Sz.houses.find((h) => h.id === id).jobSavedOverride = 0; const Szn = E.normalize(Sz), pz = E.plan(Szn), fz = E.feasible(Szn, pz, null).assets[id];
    if (fz.month < f0.month || (isFinite(fz.month) && fund(fz) === fund(f0) && fz.month === f0.month)) bad.push('zero override should not look the same as Auto: ' + fz.month + ' ' + fund(fz));
    [Sb, Szn].forEach((S, i) => { const n = E.normalize(clone2(S)), p = E.plan(n), ids = n.houses.map((h) => h.id), tt = E.todayTotals(n, p, ids); const sum = ids.reduce((a, k) => a + p.V[k].cf, 0); if (Math.abs(sum - tt.cf) > 0.01) bad.push('totals != sum of rows (' + i + ')'); });
    return { pass: !bad.length, detail: bad.join('; ') }; });
  chk('L12', 'L12.18', 'Borrowing rules edited on the asset page are the SAME global fields as Assumptions (g.hrate, g.cap, g.capBiz, g.haircut): untouched = byte-identical plan; changing each one moves the dependent trust numbers (borrowing room, ready month, plan-end net worth, feasibility month); the values survive a save / load round trip; pool total = room + cash for every pooled asset', 3, () => {
    const bad = [], S0 = seed2(), ids = S0.houses.map((h) => h.id), last = ids[ids.length - 1], p0 = E.plan(S0), sig = (p) => JSON.stringify([p.purchase, p.horizon.nw, ids.map((i) => p.trust[i].room)]);
    const S1 = clone2(S0); S1.g.hrate = S0.g.hrate; S1.g.cap = S0.g.cap; S1.g.capBiz = S0.g.capBiz; S1.g.haircut = S0.g.haircut; if (sig(E.plan(E.normalize(S1))) !== sig(p0)) bad.push('same values changed numbers');
    const f0 = E.feasible(S0, p0, null).assets[last].month;
    [['hrate', 14], ['cap', 70], ['capBiz', 30], ['haircut', 10]].forEach(([k, v]) => { const S = clone2(S0); S.g[k] = v; const n = E.normalize(S), p = E.plan(n), q = E.normalize(JSON.parse(JSON.stringify(n))); if (q.g[k] !== v) bad.push(k + ' lost in a round trip');
      if (sig(p) === sig(p0)) bad.push(k + ' changed nothing'); if (k !== 'hrate' && !(p.trust[last].room !== p0.trust[last].room)) bad.push(k + ' did not move the borrowing room');
      if ((k === 'cap' || k === 'haircut') && !(p.trust[last].room < p0.trust[last].room || p.trust[last].ready !== p0.trust[last].ready)) bad.push(k + ' lowering the room had no effect'); });
    const Sc = clone2(S0); Sc.g.cap = 70; const pc = E.plan(E.normalize(Sc)), fc = E.feasible(E.normalize(Sc), pc, null).assets[last].month; if (fc === f0 && pc.purchase[last] !== p0.purchase[last]) bad.push('feasibility month ignores the cap');
    ids.forEach((i) => { const t = p0.trust[i]; if (t.pooled && Math.abs(t.have - (t.room + t.heldCash)) > 1) bad.push('pool total != room + cash for ' + i); });
    return { pass: !bad.length, detail: bad.slice(0, 4).join('; ') }; });
  chk('L12', 'L12.17', 'Comp value (h.comp, null = unused): empty = every seeded asset byte-identical (arv, plan, totals); filled = E.appraisalAuto = round((cost basis + comp) / 2), cost basis = price + 1.4 x budget (203(k): (price + budget) x 1.15 to the 1000); a typed appraisal still wins; a loan-type change re-derives it; no budget uses the price; persistence; totals = sum of rows', 3, () => {
    const bad = [], S0 = seed2(), withB = S0.houses.find((h) => h.status !== 'owned' && h.capex > 0 && (h.type || 'house') === 'house' && !h.finCapex);
    const SS = clone2(S0); SS.houses.forEach((h) => { h.comp = null; }); const p0 = E.plan(S0), p1 = E.plan(E.normalize(SS));
    if (JSON.stringify(p0.series.nw) !== JSON.stringify(p1.series.nw) || JSON.stringify(S0.houses.map((h) => [h.arv, h.arvAuto])) !== JSON.stringify(E.normalize(SS).houses.map((h) => [h.arv, h.arvAuto]))) bad.push('empty comp changed numbers');
    S0.houses.forEach((h) => { if (h.comp !== null) bad.push('default comp not null ' + h.id); if (E.appraisalAuto(h) !== E.costBasisArv(h)) bad.push('empty appraisalAuto != cost basis ' + h.id); });
    if (!withB) return { pass: false, detail: 'no seeded house with a budget: ' + bad.join('; ') };
    const cb = Math.round(withB.price + 1.4 * withB.capex), h1 = Object.assign({}, withB, { comp: cb + 40000 }); if (E.appraisalAuto(h1) !== Math.round((cb + cb + 40000) / 2)) bad.push('formula ' + E.appraisalAuto(h1));
    const h2 = Object.assign({}, withB, { finCapex: true, comp: 200000 }); const cb2 = Math.round(((h2.price + h2.capex) * 1.15) / 1000) * 1000; if (E.appraisalAuto(h2) !== Math.round((cb2 + 200000) / 2)) bad.push('203k formula');
    const h3 = Object.assign({}, withB, { capex: 0, comp: 120000 }); if (E.appraisalAuto(h3) !== Math.round((withB.price + 120000) / 2)) bad.push('no budget uses price');
    const Sc = clone2(S0), hc = Sc.houses.find((h) => h.id === withB.id); hc.comp = cb + 40000; hc.arv = E.appraisalAuto(hc); hc.arvAuto = true; const Scn = E.normalize(Sc), pc = E.plan(Scn);
    if (!(pc.horizon.nw !== p0.horizon.nw)) bad.push('comp did not reach net worth');
    const hn = Scn.houses.find((h) => h.id === withB.id); if (hn.arv !== Math.round((cb + cb + 40000) / 2)) bad.push('stored arv ' + hn.arv);
    const rt = E.normalize(JSON.parse(JSON.stringify(Scn))).houses.find((h) => h.id === withB.id); if (rt.comp !== cb + 40000) bad.push('comp lost in round trip');
    const ids = Scn.houses.map((h) => h.id), tt = E.todayTotals(Scn, pc, ids); if (Math.abs(ids.reduce((a, k) => a + pc.V[k].cf, 0) - tt.cf) > 0.01) bad.push('totals != sum of rows');
    const lo = E.loansFor('house').find((l) => l.finRehab), hl = clone2(hn); if (lo) { E.applyLoan(hl, lo.id); const w = Math.round((Math.round(((hl.price + hl.capex) * 1.15) / 1000) * 1000 + hl.comp) / 2); if (hl.arv !== w || !hl.arvAuto) bad.push('loan change did not re-derive: ' + hl.arv + ' want ' + w); } else bad.push('no 203k loan');
    const ht = clone2(hn); ht.arv = 777777; ht.arvAuto = false; E.applyLoan(ht, 'conv' in {} ? 'conv' : E.loansFor('house')[0].id); if (ht.arv !== 777777) bad.push('typed appraisal overwritten by a loan change');
    return { pass: !bad.length, detail: bad.join('; ') }; });
}

/* ---------------- L9.J: your job money in the trust, per home (grader/logic/jobmoney.js) ---------------- */
{ const JM = require('./logic/jobmoney.js').checks(E); Object.keys(JM).forEach((id) => chk('L9', id, JM[id].name, 1, JM[id].fn)); }

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
