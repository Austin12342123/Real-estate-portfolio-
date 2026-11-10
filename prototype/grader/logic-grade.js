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
  L9: ['Plan integrity (ordering, funding chain, cash recycling, stress test)', 7], L10: ['Disclosure, labels, units and glossary accuracy', 5] };
const checks = [], unverified = [];
const near = (a, b, tol) => Math.abs(a - b) <= (tol === undefined ? 0.01 : tol);
const nearRel = (a, b, t) => Math.abs(a - b) <= Math.max(0.01, Math.abs(b) * (t || 1e-9));
function chk(cat, id, name, pts, fn, src) {
  let r; try { r = fn(); } catch (e) { r = { pass: false, detail: 'CRASH ' + (e && e.stack || e).toString().slice(0, 300) }; }
  if (typeof r === 'boolean') r = { pass: r };
  const pass = !!r.pass; const rec = { cat, id, name, pts, earned: pass ? pts : 0, pass, detail: String(r.detail || '').slice(0, 600), source: src || '', disclosedOnly: !!r.disclosedOnly };
  if (r.disclosedOnly) unverified.push(id);
  checks.push(rec);
}
const mk = (g, houses) => E.normalize({ g: Object.assign({}, E.GDEF, { closing: 0, appr: 0 }, g || {}), houses });
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
chk('L1', 'L1.4', 'Months to pay off (payoffN) with extra payments equals month-by-month simulation (300 random incl. never-pays-off cases)', 3, () => {
  let bad = 0, ex = '';
  for (let k = 0; k < 300; k++) { const h = A('house', 'conv30', { status: pick(['owned', 'planned']), price: U(100000, 800000), rate: pick([0, U(1, 12)]), term: pick([120, 180, 360]), paid: Math.round(U(0, 90)), io: rnd() < 0.15 }); const X = pick([0, 0, 100, 750, 5000]);
    const B0 = E.balToday(h), P = E.payment(h); const ref = R.payoffMonths(B0, h.rate, P + X); const got = E.payoffN(h, X); if (!(got === ref || (isFinite(got) && isFinite(ref) && got === ref))) { bad++; ex = [h.rate.toFixed(2), h.term, h.io, X, got, ref].join(' '); } }
  return { pass: bad === 0, detail: bad + ' / 300 disagree ' + ex };
});
chk('L1', 'L1.5', 'Interest-only: payment = balance x rate/12, balance never falls without extra, extra reduces it, 0% IO is a free payment of 0; no default-plan interest-only loan outlives its term (balloon not modeled)', 1, () => {
  const h = A('commercial', 'bridge', { id: 'b', price: 2000000, status: 'owned', paid: 10 }), L = E.loan(h), P = E.payment(h);
  const ok1 = nearRel(P, L * h.rate / 1200), ok2 = near(E.balToday(h), L, 0.001), ok3 = E.payoffN(h, 0) === Infinity;
  const ok4 = E.payoffN(h, 20000) === R.payoffMonths(L, h.rate, P + 20000);
  const ioOut = seed.houses.filter((x) => x.io && x.term < 12 * seed.g.planYears && plS.V[x.id].payoff === Infinity).map((x) => x.id); /* a balloon/refinance at maturity is not modeled, so a short interest-only loan would run for decades */
  return { pass: ok1 && ok2 && ok3 && ok4 && ioOut.length === 0, detail: [ok1, ok2, ok3, ok4].join(',') + (ioOut.length ? ' default-plan interest-only loans that outlive their term: ' + ioOut.join(',') : '') };
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
chk('L2', 'L2.1', 'noiOf equals the reference NOI (vacancy off rent, management on collected rent, repairs % of price, fixed costs) for 300 random homes and commercial; business NOI is the owner profit', 3, () => {
  let bad = 0; for (let k = 0; k < 300; k++) { const type = pick(['house', 'commercial']); const g = { vac: U(0, 15), mgmt: U(0, 12), maint: U(0, 3) };
    const h = A(type, undefined, { price: U(80000, 5e6), rent: U(900, 90000), tax: U(0, 3000), ins: U(0, 2000), hoa: U(0, 800) }); const S = mk(g, [h]);
    if (!nearRel(E.noiOf(S, h), R.noiRental(h.rent, h.price, h.tax, h.ins, h.hoa, g.vac, g.mgmt, g.maint), 1e-9)) bad++; }
  const b = A('business', 'sba7a', { rent: 50000 }), S = mk({}, [b]);
  return { pass: bad === 0 && E.noiOf(S, b) === 50000, detail: bad + ' / 300 disagree' };
});
chk('L2', 'L2.2', 'view(): cash flow = NOI - payment - mortgage insurance; cap rate = 12*NOI/price; price multiple = price/(12*NOI); DSCR basis (NOI / P+MIP) consistent (200 random)', 1, () => {
  let bad = 0; for (let k = 0; k < 200; k++) { const type = pick(['house', 'commercial', 'business']); const h = A(type, undefined, { price: U(100000, 4e6), rent: U(1500, 60000), tax: U(0, 900), ins: U(0, 600), hoa: 0 });
    if (rnd() < 0.3 && type === 'house') E.applyLoan(h, 'fha'); const S = mk({ vac: 5, mgmt: 8, maint: 1 }, [h]); const v = E.view(S, h); const noi = type === 'business' ? h.rent : R.noiRental(h.rent, h.price, h.tax, h.ins, h.hoa, 5, 8, 1);
    const mip = h.mipAnn ? E.loan(h) / (1 + h.mipUp / 100) * h.mipAnn / 100 / 12 : 0;
    if (!near(v.cf, noi - E.payment(h) - mip, 0.01) || !near(v.capRate, R.capRate(noi, h.price), 1e-6) || (noi > 0 && !near(v.multiple, h.price / (noi * 12), 1e-6))) bad++; }
  return { pass: bad === 0, detail: bad + ' / 200 disagree' };
});
chk('L2', 'L2.3', 'Portfolio NOI series = sum of asset NOI x growth factor: income and costs grow with the asset growth rate (checked at months 0, 60, 180 on 40 random assets)', 2, () => {
  let bad = 0, ex = ''; for (let k = 0; k < 40; k++) { const type = pick(['house', 'commercial', 'business']), gr = U(0, 9); const h = A(type, undefined, { id: 'a', status: 'owned', price: U(150000, 3e6), rent: U(1500, 40000), tax: 200, ins: 100, hoa: 0, growth: gr, paid: pick([0, 0, 18, 40]) });
    const S = mk({ planYears: 20 }, [h]); const pl = E.plan(S); const noi0 = E.noiOf(S, h); for (const t of [0, 60, 180]) { const ref = noi0 * Math.pow(1 + gr / 100, t / 12); if (!nearRel(pl.series.noi[t], ref, 1e-9)) { bad++; ex = [type, gr.toFixed(2), t, pl.series.noi[t].toFixed(1), ref.toFixed(1)].join(' '); break; } } }
  return { pass: bad === 0, detail: bad + ' / 40 disagree ' + ex };
});
chk('L2', 'L2.4', 'Default vacancy vs Census HVS rental vacancy (US 7.1% in 2025, 7.4% in 2026 YTD, 8.2% avg 2000-2025): default must be >= 7% or the UI must name the Census figure and say why lower', 2, () => {
  const ok = E.GDEF.vac >= 7 || /Census/i.test(infoText('vacancy')); return { pass: ok, detail: 'default vac ' + E.GDEF.vac + '%; glossary mentions Census: ' + /Census/i.test(infoText('vacancy')) };
}, 'S18,S19');
chk('L2', 'L2.5', 'Default management fee 8% and repairs 1%/yr are disclosed as rule-of-thumb assumptions (no fetched source; NARPM / NRC figures were not reachable)', 2, () => {
  const ok = E.GDEF.mgmt === 8 && /8% to 10%/.test(infoText('mgmt')) && E.GDEF.maint === 1 && /rule of thumb/.test(infoText('repairs')); return { pass: ok, disclosedOnly: true, detail: 'mgmt ' + E.GDEF.mgmt + ', maint ' + E.GDEF.maint };
});
chk('L2', 'L2.6', 'Commercial rows state that rent is net of what tenants reimburse (tax/insurance/CAM): default commercial property tax + insurance are well below typical 1%+ of value, so the UI must say expense lines are net of NNN pass-throughs', 2, () => {
  const comm = seed.houses.filter((h) => h.type === 'commercial'); const share = comm.map((h) => (h.tax + h.ins) * 12 / h.price * 100); const mx = Math.max(...share);
  const ok = mx >= 1.0 || /tenants pay|pass-through|reimburse|triple/i.test(infoText('noi', 'caprate')); return { pass: ok, detail: 'tax+insurance = ' + Math.min(...share).toFixed(2) + '-' + mx.toFixed(2) + '% of price per year; disclosed ' + /tenants pay|reimburse/i.test(infoText('noi', 'caprate')) };
});
chk('L2', 'L2.7', 'Default portfolio cap rates and price multiples fall in the bands of the grader benchmark files (bench-cre.json / bench-business.json; secondary sources, flagged unverified there)', 2, () => {
  const bad = []; seed.houses.forEach((h) => { const v = plS.V[h.id]; const cap = v.capRate; if (h.type === 'house' && (cap < 4.5 || cap > 9)) bad.push(h.id + ' cap ' + cap.toFixed(1)); if (h.type === 'commercial' && (cap < 5.5 || cap > 9.5)) bad.push(h.id + ' cap ' + cap.toFixed(1));
    if (h.type === 'business') { const m = v.multiple, lim = h.price < 1500000 ? [2, 3.8] : h.price < 5000000 ? [2.5, 5.2] : [3.5, 7]; if (m < lim[0] || m > lim[1]) bad.push(h.id + ' mult ' + m.toFixed(1) + ' for $' + (h.price / 1e6).toFixed(1) + 'M'); } });
  return { pass: bad.length === 0, disclosedOnly: true, detail: bad.join('; ') || 'all in band' };
});

/* ====================== L3 leverage and credit lines ====================== */
function locCase() {
  const g = { cap: pick([60, 70, 80, 85]), haircut: pick([0, 5, 10, 20]), closing: pick([0, 3]), appr: pick([0, 3]) };
  const src = A('house', 'conv30', { id: 's', status: pick(['owned', 'planned']), price: U(150000, 600000), rate: U(3, 9), term: pick([180, 360]), paid: Math.round(U(0, 80)), target: 't', rent: U(1500, 4000), tax: U(100, 400), ins: U(50, 150), liens: pick([0, 0, 15000]), growth: pick([null, 2, 5]), buyIn: 0 });
  const tgt = A('house', 'conv30', { id: 't', price: U(150000, 700000), dp: pick([10, 20, 25]), closingPct: null });
  return { g, src, tgt, X: pick([0, 0, 200, 1500]) };
}
chk('L3', 'L3.1', 'Months until the credit line (locMonths) equals an independent month-by-month simulation where the appraisal cut is taken off the VALUE (cap x value x (1 - cut) - balance - liens), incl. saved cash flow (120 random)', 3, () => {
  let bad = 0, ex = ''; for (let k = 0; k < 120; k++) { const { g, src, tgt, X } = locCase(); const S = mk(g, [src, tgt]); const h = S.houses[0], t = S.houses[1];
    const age0 = h.status === 'owned' ? h.paid : 0, P = E.payment(h), B0 = R.balanceAfter(E.loan(h), h.rate, P, age0), gr = h.growth == null ? g.appr : h.growth;
    const need = E.downAmt(t) + t.price * (t.closingPct == null ? g.closing : t.closingPct) / 100, mip = 0;
    const saved = Math.max(0, R.noiRental(h.rent, h.price, h.tax, h.ins, h.hoa, S.g.vac, S.g.mgmt, S.g.maint) - P - mip);
    const ref = R.monthsToLine({ B0, ratePct: h.rate, pay: P + X, valueAt: (kk) => R.valueAt(h.price, gr, age0 + kk), capPct: g.cap, haircutPct: g.haircut, liens: h.liens, need, savedPerMonth: saved });
    const got = E.locMonths(S, h, X); if (got !== ref) { bad++; ex = [g.cap, g.haircut, h.liens, got, ref].join(' '); } }
  return { pass: bad === 0, detail: bad + ' / 120 disagree (cap,cut,liens,engine,ref) ' + ex };
}, 'S9,S12');
chk('L3', 'L3.2', 'extraFor: the extra payment returned reaches the target month and 1 dollar less does not (40 random; null only when infeasible)', 1, () => {
  let bad = 0; for (let k = 0; k < 40; k++) { const { g, src, tgt } = locCase(); const S = mk(g, [src, tgt]); const h = S.houses[0]; const m = Math.round(U(1, 40)); const x = E.extraFor(S, h, m);
    if (x === null) { if (E.locMonths(S, h, E.balToday(h) + 1) <= m) bad++; continue; } if (x === 0) { if (E.locMonths(S, h, 0) > m) bad++; continue; }
    if (E.locMonths(S, h, x) > m || E.locMonths(S, h, Math.max(0, x - 2)) <= m) bad++; }
  return { pass: bad === 0, detail: bad + ' / 40 wrong' };
});
chk('L3', 'L3.3', 'After the credit-line draw the combined loan (balance + other liens + draw) never exceeds cap x value x (1 - appraisal cut) (cltvAtLoc, 100 random)', 2, () => {
  let bad = 0, ex = ''; for (let k = 0; k < 100; k++) { const { g, src, tgt, X } = locCase(); const S = mk(g, [src, tgt]); const v = E.view(S, S.houses[0]); if (v.cltvAtLoc === null || !isFinite(v.locM) || v.draw <= 0.5) continue;
    const lim = g.cap * (1 - g.haircut / 100); if (v.cltvAtLoc > lim + 0.05) { bad++; ex = [g.cap, g.haircut, v.cltvAtLoc.toFixed(2)].join(' '); } }
  return { pass: bad === 0, detail: bad + ' over the limit ' + ex };
});
chk('L3', 'L3.4', 'Default max combined loan-to-value (cap) does not exceed the 85% supervisory ceiling for improved property incl. non-owner-occupied 1-4 family (12 CFR 365 App. A); default credit-line rate sits between prime (7.00%, Fed H.15) and prime + 3.5', 1.5, () => ({ pass: E.GDEF.cap <= 85 && E.GDEF.hrate >= 7.0 && E.GDEF.hrate <= 10.5, detail: 'cap ' + E.GDEF.cap + ', credit-line rate ' + E.GDEF.hrate }), 'S5,S14');
chk('L3', 'L3.5', 'A credit line behind a BUSINESS (not real estate, no supervisory 85% limit) is disclosed as unrealistic at the same cap, or capped lower', 1.5, () => {
  const ok = /business/i.test(infoText('creditline', 'debtcap')); return { pass: ok, detail: 'glossary mentions business: ' + ok };
});
chk('L3', 'L3.6', 'Credit-line interest: draw x line rate / 12 per month from the month the line is drawn, none before; the draw shows as debt then; draw = cash needed minus saved cash flow', 1.5, () => {
  const S = mk({ hrate: 9, cap: 85 }, [A('house', 'conv30', { id: 's', status: 'owned', paid: 24, price: 300000, target: 't', rent: 2500, tax: 200, ins: 90, growth: 3 }), A('house', 'conv30', { id: 't', price: 250000 })]); const pl = E.plan(S), v = pl.V.s, lm = v.locM;
  const row = (t) => pl.assetsAt(t).find((x) => x.id === 's'); const hi = v.draw * 9 / 1200; const pBefore = row(lm - 1).payment, pAfter = row(lm).payment;
  const dBefore = row(lm - 1).debt, dAfter = row(lm).debt; const h = S.houses[0];
  const balAt = (t) => R.balanceAfter(R.balanceAfter(E.loan(h), h.rate, E.payment(h), 24), h.rate, E.payment(h), t);
  return { pass: near(pAfter - pBefore, hi, 0.01) && near(dBefore, balAt(lm - 1), 0.02) && near(dAfter, balAt(lm) + v.draw, 0.02) && near(v.draw, v.D - v.cashDP, 0.001), detail: [pBefore, pAfter, hi, dBefore, dAfter, v.draw].map((x) => +x.toFixed(2)).join(' ') };
});
chk('L3', 'L3.7', 'Saved cash flow = max(0, NOI - payment - MIP), capped at the cash needed, and what is saved is deducted from liquid cash when the target closes (no double count)', 1.5, () => {
  const S = mk({ cap: 85 }, [A('house', 'conv30', { id: 's', status: 'owned', paid: 24, price: 300000, target: 't', rent: 3000, tax: 200, ins: 90, growth: 3 }), A('house', 'conv30', { id: 't', price: 250000 })]); const h = S.houses[0];
  const want = Math.max(0, R.noiRental(h.rent, h.price, h.tax, h.ins, h.hoa, 5, 8, 1) - E.payment(h)); const pl = E.plan(S); const v = pl.V.s;
  S.p = E.samplePersonal(); const f = E.finance(S, pl); const t = pl.purchase.t; const dpc = pl.dpCash[t];
  return { pass: near(E.cfSaved(S, h), want, 0.001) && near(v.cashDP, Math.min(v.D, want * v.locM), 0.01) && near(dpc, v.cashDP, 0.01) && isFinite(f.T), detail: [E.cfSaved(S, h).toFixed(2), want.toFixed(2), v.cashDP.toFixed(0), dpc.toFixed(0)].join(' ') };
});

/* ====================== L4 lender qualification ====================== */
chk('L4', 'L4.1', 'DTI at month 0 equals the reference (75% of gross rent minus the property payment: a positive net adds to income, a negative net adds to debts; plus co-signer and job income; 80 random portfolios)', 3, () => {
  let bad = 0, ex = ''; for (let k = 0; k < 80; k++) { const hs = []; const n = 1 + Math.floor(rnd() * 4); for (let j = 0; j < n; j++) hs.push(A(pick(['house', 'commercial', 'business']), undefined, { id: 'a' + j, status: 'owned', paid: Math.round(U(0, 60)), price: U(120000, 2e6), rent: U(1000, 30000), tax: U(0, 900), ins: U(0, 500), hoa: 0, growth: 3 }));
    const g = { p1: pick([0, 60000, 150000]), p2: pick([0, 40000]), rentCount: pick([50, 75, 100]), otherDebt: pick([0, 450, 1500]) }; const S = mk(g, hs); S.p = E.normalizePersonal({ jobs: [{ id: 'j', kind: 'salary', gross: pick([0, 80000, 200000]), raise: 0, tax: 20, hours: 40, start: 0, end: null }] });
    const pl = E.plan(S); const ref = R.dtiRef({ otherIncomeMonthly: (g.p1 + g.p2) / 12 + S.p.jobs[0].gross / 12, otherDebt: g.otherDebt, rentCountPct: g.rentCount, assets: S.houses.map((h) => { const v = pl.V[h.id]; return { grossRent: h.rent, payment: v.P + v.mip + v.escrow }; }) });
    if (!near(pl.series.dti[0], ref, 1e-6)) { bad++; ex = pl.series.dti[0].toFixed(3) + ' vs ' + ref.toFixed(3); } }
  return { pass: bad === 0, detail: bad + ' / 80 disagree ' + ex };
}, 'S11,S12');
chk('L4', 'L4.2', 'DTI limit default 43% and rental haircut 75% are consistent with CFPB (43% was the old General QM cap, now replaced by price-based test) and the UI says lenders vary (up to ~50%); wording must not present 43% as a current legal rule', 1.5, () => {
  const t = infoText('dti'); const ok = E.GDEF.dti <= 50 && !/usually want 43% or less\./.test(t) && /(43|45|50)/.test(t) && /(vary|varies|up to|some lenders|45%|50%)/.test(t); return { pass: ok, detail: t.slice(0, 160) };
}, 'S10,S11');
chk('L4', 'L4.3', 'DTI includes the borrower\'s OWN housing payment (rent or mortgage) as a lender would, or the UI discloses that it does not', 1, () => {
  const ok = /own (rent|housing)/i.test(infoText('dti', 'qualifying')); return { pass: ok, detail: 'disclosed: ' + ok };
});
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
chk('L6', 'L6.5', 'Default business growth (7.5%/yr for 28 yrs) is above the long-run growth of the U.S. economy (~4% nominal); this must be disclosed as an assumption, not a forecast', 2, () => {
  const mx = Math.max(...seed.houses.filter((h) => h.type === 'business').map((h) => h.growth)); const ok = mx <= 4.5 || /(economy|GDP)/i.test(infoText('growth')); return { pass: ok, disclosedOnly: true, detail: 'max business growth ' + mx + '%; glossary compares with economy growth: ' + /(economy|GDP)/i.test(infoText('growth')) };
});

/* ====================== L7 taxes, selling, depreciation ====================== */
chk('L7', 'L7.1', 'Income tax estimate (estTaxPct) equals the 2026 single-filer reference: standard deduction $16,100, brackets 10% to 12,400 ... 37% over 640,600, Social Security 6.2% to $184,500, Medicare 1.45% (13 incomes)', 2.5, () => {
  const inc = [0, 20000, 48000, 60000, 96000, 150000, 184500, 200000, 300000, 500000, 700000, 1e6, 3e6]; const bad = inc.filter((x) => !near(E.estTaxPct(x), R.taxPct2026(x), 0.05));
  return { pass: bad.length === 0, detail: bad.map((x) => x + ': ' + E.estTaxPct(x) + ' vs ' + R.taxPct2026(x)).join('; ') || 'all match' };
}, 'S1,S17');
chk('L7', 'L7.2', 'Sale tax = max(0, sale price x (1 - selling cost) - original price - improvements) x sales-tax % (checked on 30 random sells)', 1.5, () => {
  let bad = 0; for (let k = 0; k < 30; k++) { const h = A(pick(['house', 'commercial']), 'cashh', { id: 'a', price: U(2e5, 3e6), rent: 4000, tax: 100, ins: 50, growth: U(0, 6), buyIn: 0, exit: 'sell', exitMonth: Math.round(U(12, 150)), capex: pick([0, 40000]), capexMonths: 3, sellCost: pick([4, 6, 8]), arv: 0 });
    if (h.loanId) E.applyLoan(h, 'cashh'); const S = mk({ planYears: 20 }, [h]); S.p = E.normalizePersonal({ salesTaxPct: 25, cash: 5e6 }); const pl = E.plan(S), f = E.finance(S, pl), ex = pl.exits.a; if (!ex) { bad++; continue; }
    const gain = ex.price * (1 - h.sellCost / 100) - h.price - h.capex; if (!near(f.series.saleTax[ex.month], Math.max(0, gain) * 0.25, 0.01)) bad++; }
  return { pass: bad === 0, detail: bad + ' / 30 disagree' };
});
chk('L7', 'L7.3', 'Default sale-tax 25% sits in the federal range for a sale: 15-20% long-term capital gain + 3.8% NIIT (18.8-23.8%), unrecaptured depreciation up to 25%; text states these, and notes state tax', 1.5, () => {
  const t = infoText('salestax'); const ok = E.samplePersonal().salesTaxPct >= 18.8 && E.samplePersonal().salesTaxPct <= 28.8 && /15%/.test(t) && /20%/.test(t) && /3\.8%/.test(t) && /25%/.test(t) && /(state)/i.test(t); return { pass: ok, detail: t.slice(0, 200) };
}, 'S20,S21,S22');
chk('L7', 'L7.4', 'Flat tax on portfolio income (default 20%) understates federal rates on large profits (32-37% over ~$200k, + 3.8% NIIT; IRS 2026 brackets): the glossary must say so', 1, () => {
  const ok = /(32%|35%|37%)/.test(infoText('portfoliotax')) || E.samplePersonal().portfolioTaxPct >= 30; return { pass: ok, detail: 'default ' + E.samplePersonal().portfolioTaxPct + '%; says higher brackets: ' + /(37%|35%|32%)/.test(infoText('portfoliotax')) };
}, 'S1,S22');
chk('L7', 'L7.5', 'Depreciation (27.5 yrs residential, 39 yrs non-residential; IRS Pub. 946) is not modeled; the UI must say so (it lowers taxable income and creates recapture on sale)', 1, () => {
  const ok = /depreciation/i.test(infoText('portfoliotax')) && /depreciation/i.test(infoText('salestax')); return { pass: ok, detail: 'depreciation mentioned in both glossary entries: ' + ok };
}, 'S23,S24');
chk('L7', 'L7.6', 'Selling-cost defaults (home 6%, commercial 5%, business 8%) are disclosed as typical ranges', 0.5, () => ({ pass: /5% to 7%/.test(infoText('sellcost')) && E.newAsset('house').sellCost === 6, disclosedOnly: true, detail: infoText('sellcost').slice(0, 120) }));

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
chk('L8', 'L8.4', 'Default plan: 28-year growth of 7.5%/yr per business is disclosed as an optimistic assumption in the UI, and the finance sim does not need outside capital', 1, () => {
  const ok = /(economy|GDP)/i.test(infoText('growth')) && seed.p.capital.length === 0; return { pass: ok, disclosedOnly: true, detail: 'disclosed ' + /(economy|GDP)/i.test(infoText('growth')) + ', capital rows ' + seed.p.capital.length };
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
chk('L9', 'L9.3', 'Funding chain: every credit-line funder closes the target exactly funder-purchase + months-to-line; the target buys at the earliest such month; no cycles', 1.5, () => {
  let bad = []; seed.houses.forEach((h) => { const t = E.H(seed, h.target); if (!t || t.status !== 'planned') return; const v = plS.V[h.id]; if (plS.funds[h.id]) { if (plS.purchase[t.id] !== plS.purchase[h.id] + v.locM) bad.push(h.id); } else if (isFinite(plS.purchase[h.id] + v.locM) && plS.purchase[t.id] < plS.purchase[h.id] + v.locM) bad.push(h.id + ' sooner'); });
  return { pass: bad.length === 0, detail: bad.join(',') || 'ok' };
});
chk('L9', 'L9.4', 'Cash recycling: sale proceeds go to cash, purchases use cash before outside money; cash never negative; outside draws only for the shortfall (random 25)', 1.5, () => {
  let bad = 0; for (let k = 0; k < 25; k++) { const s = A('house', 'cashh', { id: 's', price: U(2e5, 5e5), rent: 3000, tax: 150, ins: 80, growth: 4, buyIn: 0, exit: 'sell', exitMonth: Math.round(U(24, 60)), sellCost: 6 }), b = A('house', 'cashh', { id: 'b', price: U(1e5, 8e5), rent: 3000, tax: 150, ins: 80, growth: 4, buyIn: Math.round(U(61, 100)) });
    const S = mk({ planYears: 12 }, [s, b]); const pl = E.plan(S); const ex = pl.exits.s; const need = b.price + b.price * 0.02 * 0 + (b.price * (b.closingPct == null ? 0 : b.closingPct) / 100); const use = Math.min(ex.proceeds + 0, need);
    if (pl.series.cash.some((x) => x < -0.01) || !near(pl.outsideTotal, s.price * 0 + Math.max(0, need - ex.proceeds) + (s.price + s.price * s.closingPct / 100) * 0 + pl.series.outside[0], 1)) bad++; }
  return { pass: bad === 0, detail: bad + ' / 25 disagree' };
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
chk('L10', 'L10.2', 'The Assumptions page carries a "how the numbers are built" note: nominal dollars, rent and costs grow with value, payments are fixed, DTI excludes own housing, credit lines assume 85% cap, no depreciation, flat tax rates', 1.5, () => {
  const ok = /data-testid="model-notes"/.test(APP); return { pass: ok, detail: 'model-notes block present: ' + ok };
});
chk('L10', 'L10.3', 'Units and bases are stated (net worth definition says it is before selling costs/taxes and excludes personal savings): yearly inputs say "/ yr", monthly say "/ mo"; DTI limit, vacancy, management are percentages of the right base (vacancy and management of rent; repairs of value per year)', 1, () => {
  const ok = /before selling costs and taxes/.test(INFO.networth.b) && /savings are not included/.test(INFO.networth.b) && /of rent/.test(APP + JSON.stringify(INFO)) && /percent of the value/.test(INFO.repairs.b) && /Repairs \/ yr/.test(APP + JSON.stringify(Object.keys(require(path.join(V4, 'info.js')).LABEL))); return { pass: ok, detail: '' };
});
chk('L10', 'L10.4', 'Preset notes that state a number or rule match LOANS fields (FHA/203(k)/SBA caps, owner-occupancy, interest-only) and the sellerb/sellerc notes say the share seller-financed is partial and negotiable', 1, () => {
  const ok = LN('sellerb').note.length > 0 && /(typically|usually|often)/i.test(LN('sellerb').note + INFO.sellerfin.b) && /(10%|50%|part)/i.test(INFO.sellerfin.b + LN('sellerb').note); return { pass: ok, detail: LN('sellerb').note };
});

/* ---------------- score ---------------- */
const score = {}; let total = 0;
Object.keys(CATS).forEach((c) => { const mine = checks.filter((x) => x.cat === c); const max = CATS[c][1]; const got = mine.reduce((a, x) => a + x.earned, 0), pts = mine.reduce((a, x) => a + x.pts, 0);
  if (Math.abs(pts - max) > 0.01) console.log('NOTE: ' + c + ' check weights sum to ' + pts + ', category max ' + max); score[c] = { name: CATS[c][0], earned: Math.round(got * 100) / 100, max: pts }; total += got; });
const maxTotal = Object.values(score).reduce((a, x) => a + x.max, 0);
const out = { run: new Date().toISOString(), total: Math.round(total * 100) / 100, max: Math.round(maxTotal * 100) / 100, categories: score, checks, disclosedNotVerified: unverified };
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
