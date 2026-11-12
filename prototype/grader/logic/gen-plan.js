#!/usr/bin/env node
/* Generator for the default 28-year plan (engine.seedPlan). It starts from ZERO owned assets: the first purchase is paid from your savings (above the cash cushion) plus the job money saved since, every later one by the trust of everything bought before it plus your job money.
   Run: BASE=120500 STEP=1.25 OUT=1 node gen-plan.js 23   (the current default: 23 steps from BASE 120500 gives $125.7M net worth and $1.39M/mo cash flow at year 28)  [general form: BASE=.. STEP=.. OUT=1 node gen-plan.js [steps]] -> prints the A(...) rows to paste into engine.js seedPlan.
   Rules: purchase sizes grow about 25% per step; homes are priced from rent so they cash flow positive; each commercial row is priced at a cap rate on NET operating income (tenants repay costs under NNN) and each business at a multiple of owner profit (never below 3.3x);
   dp is raised until the loan meets the lender DSCR minimum (SBA 1.15, bank 1.25); purchase month = earliest month the pool can pay (the engine decides). No partner capital. */
const E = require('../../v4/engine.js');
const STEPS = +process.argv[2] || 28, GB = 4, GC = 4, STEP = +process.env.STEP || 1.25;
const g0 = Object.assign({}, E.GDEF, { otherDebt: 450, planYears: 28 });
const A = E.newAsset;
const rc = (price, cap, nnn) => { const tax = price * 0.0075 / 12, ins = price * 0.003 / 12, cam = price * 0.003 / 12, g = g0, reimb = nnn / 100 * (tax + ins + cam);
  const noi = price * cap / 100 / 12, eff = (noi + tax + ins + cam + g.maint / 100 * price / 12) / ((1 - g.vac / 100) * (1 - g.mgmt / 100)); return { rent: Math.round((eff - reimb) / 10) * 10, tax: Math.round(tax), ins: Math.round(ins), hoa: Math.round(cam), nnn }; };
const NB = ['Cornerstone Plumbing Co', 'Summit Freight & Logistics', 'Keystone HVAC Services', 'Apex Property Services', 'Meridian Staffing Group', 'Ironwood Manufacturing', 'Granite Industrial Supply', 'Bayview Dental Group', 'Pioneer Healthcare Staffing', 'Atlas Distribution Group', 'Beacon Engineering Services', 'Northstar Packaging', 'Harvest Foods Wholesale', 'Lighthouse Security Services'];
const NC = ['Northgate Retail Strip', 'Harbor St Self-Storage', 'Lakeview Medical Office', 'Westfield Office Park', 'Eastgate Shopping Plaza', 'Redwood Logistics Center', 'Bayview Medical Plaza', 'Summit Business Park', 'Crossroads Retail Center', 'Harborfront Industrial', 'Gateway Office Tower', 'Pinecrest Flex Center', 'Riverbend Storage Park', 'Oakmont Office Campus'];
const NH = ['1412 Maple Ridge Dr', '2207 Cedar Hollow Ln', '908 Birchwood Ct', '3350 Willow Bend Rd', '2914 Linden Way', '5521 Ridgeview Ct', '7702 Sycamore Dr', '418 Elm Street'];
const cnt = { b: 0, c: 0, h: 0 };
function spec(i, price0) {
  const price = Math.round(price0 / 5000) * 5000, house = price < +(process.env.HOUSEMAX || 400000);
  if (house) { const k0 = cnt.h++ % NH.length, name = NH[k0], id = ['maple', 'cedar', 'birch', 'willow', 'linden', 'ridge', 'sycamore', 'elm'][k0]; const rent = Math.round(price * 0.0112 / 10) * 10;
    return ['house', i % 3 === 2 ? 'dscr' : 'conv30', { id, addr: name, price, rent, tax: Math.round(price * 0.0012 / 1.0), ins: Math.round(price * 0.0005 + 20), growth: GC, buyIn: 0 }]; }
  const k = price < 950000 ? 'c' : i % 2 === 0 ? 'b' : 'c', /* a small business cannot carry a manager's salary, so businesses start at about $1M */ n = k === 'b' ? NB[cnt.b++ % NB.length] : NC[cnt.c++ % NC.length], id = n.toLowerCase().replace(/[^a-z]/g, '').slice(0, 10);
  if (k === 'c') { const cap = 7.0 + (i % 3) * 0.5, c = rc(price, cap, 85); return ['commercial', 'comm25', { id, addr: n, price, growth: GC, dp: 35, ...c, buyIn: 0 }]; }
  const mult = price < 2e6 ? 3.6 : price < 3.5e6 ? 4.0 : price < 6e6 ? 4.6 : price < 10e6 ? 5.0 : 5.6, rent = Math.round(price / mult / 12 / 10) * 10;
  return ['business', price * 0.9 < 3.2e6 && price < 3.4e6 ? 'sba7a' : 'bankbiz', { id, addr: n, price, rent, growth: GB, buyIn: 0 }]; }
/* birch is flipped after about 40 months (a value-add rehab), so the plan also shows a sale */
function flip(rows, pl) { rows.forEach((r) => { if (r[2].id === 'birch') { r[2].exit = 'sell'; r[2].exitMonth = (isFinite(pl && pl.purchase.birch) ? pl.purchase.birch : 28) + 40; } }); }
const PROFILES = { default: {}, weak: { living: 5050 }, weakOld: { living: 5050, portfolioTaxPct: 20, salesTaxPct: 25 }, old: { portfolioTaxPct: 20, salesTaxPct: 25 } };
const prof = (name) => Object.assign(E.samplePersonal(), { capital: [] }, PROFILES[name || 'default']);
function build(rows, pn) { return E.normalize({ g: Object.assign({}, g0), p: prof(pn || process.env.PROFILE), houses: rows.map((r) => A(r[0], r[1], Object.assign({}, r[2]))) }); }
function fit(r) { const o = r[2], S = build([r]), h = S.houses[0];
  if (r[0] === 'house') { for (let k = 0; k < 40; k++) { if (E.view(S, h).cf >= 120) break; h.rent += 10; } o.rent = h.rent; return r; }
  const need = r[1] === 'sba7a' ? 1.15 : 1.25, lo = r[1] === 'sba7a' ? 10 : r[1] === 'bankbiz' ? 25 : 35;
  for (let dp = lo; dp <= 60; dp += 5) { h.dp = dp; const v = E.view(S, h); if (v.noi / (v.P + v.mip) >= need + 0.03) { o.dp = dp; return r; } } o.dp = 60; return r; }
let rows = [], price = +process.env.BASE || 110000; const used = {};
for (let i = 0; i < STEPS; i++) { const r = fit(spec(i, price)); price *= STEP; while (used[r[2].id]) r[2].id += 'x'; used[r[2].id] = 1; if (r[0] === 'house' && used[r[2].addr]) r[2].addr += ' #2'; used[r[2].addr] = 1; rows.push(r); }
rows.forEach((r) => { if (r[2].id === 'birch') Object.assign(r[2], { capex: 30000, capexMonths: 4, liftValue: 12, liftIncome: 8 }); });
let S = build(rows), pl = E.plan(S); for (let k = 0; k < 4; k++) { flip(rows, pl); S = build(rows); pl = E.plan(S); }
const f = E.finance(S, pl);
for (const pn of Object.keys(PROFILES)) { const S2 = build(rows, pn), p2 = E.plan(S2), f2 = E.finance(S2, p2); console.error('  profile', pn.padEnd(8), 'NW', (p2.horizon.nw / 1e6).toFixed(1) + 'M', 'CF', Math.round(p2.horizon.cf), 'status', f2.status, 'lastBuy', p2.lastBuy, 'dti', p2.worst.dti.toFixed(0), '@' + p2.worst.month, 'unf', p2.unfunded.length, 'first', p2.purchase[S2.houses[0].id], 'minLiq', Math.round(f2.kpis.minLiquid)); }
const nwAt = (y) => (pl.at(y * 12).nw / 1e6).toFixed(1) + 'M';
console.error('assets', S.houses.length, 'NW', nwAt(28), 'y5', nwAt(5), 'y10', nwAt(10), 'y15', nwAt(15), 'y20', nwAt(20), 'y25', nwAt(25), 'status', f.status, 'last buy', pl.lastBuy, 'unfunded', pl.unfunded.length, 'dti', pl.worst.dti.toFixed(0), 'minLiq', Math.round(f.kpis.minLiquid));
console.error('first buys', S.houses.slice(0, 10).map((h) => h.id + '@' + pl.purchase[h.id]).join(' '));
const fmt = (o) => '{' + Object.entries(o).map(([k, v]) => k + ': ' + JSON.stringify(v)).join(', ') + '}';
if (process.env.OUT) console.log(rows.map((r) => `    A('${r[0]}', '${r[1]}', ${fmt(r[2])})`).join(',\n'));
