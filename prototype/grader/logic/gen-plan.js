#!/usr/bin/env node
/* Generator for the default 28-year self-funded plan (engine.seedPlan). Run: node gen-plan.js [steps] [growthBiz] [growthCom] -> prints the A(...) rows to paste into engine.js seedPlan.
   Rules: purchase sizes grow about 25% per step; each commercial row is priced at a cap rate on NET operating income and each business at a multiple of owner profit;
   dp is raised until the loan meets the lender DSCR minimum (SBA 1.15, bank 1.25); purchase month = earliest month the owner's own cash covers it (greedy, finance status stays Yes). No partner capital. */
const E = require('../../v4/engine.js');
const STEPS = +process.argv[2] || 22, GB = process.argv[3] ? +process.argv[3] : 4, GC = process.argv[4] ? +process.argv[4] : 4, STEP = 1.25;
const g0 = Object.assign({}, E.GDEF, { otherDebt: 450, planYears: 28 });
const A = E.newAsset;
const rc = (price, cap, nnn) => { const tax = price * 0.0075 / 12, ins = price * 0.003 / 12, cam = price * 0.003 / 12, g = g0, reimb = nnn / 100 * (tax + ins + cam);
  const noi = price * cap / 100 / 12, eff = (noi + tax + ins + cam + g.maint / 100 * price / 12) / ((1 - g.vac / 100) * (1 - g.mgmt / 100)); return { rent: Math.round((eff - reimb) / 10) * 10, tax: Math.round(tax), ins: Math.round(ins), hoa: Math.round(cam), nnn }; };
const fixed = () => { const p = E.samplePersonal(); p.capital = []; return [
  A('house', 'conv30', { id: 'maple', addr: '1412 Maple Ridge Dr', status: 'owned', price: 185000, rate: 6.5, paid: 18, extra: 600, rent: 1900, tax: 215, ins: 90, growth: 4 }),
  A('house', 'conv30', { id: 'cedar', addr: '2207 Cedar Hollow Ln', status: 'owned', price: 165000, rate: 6.75, paid: 30, extra: 400, rent: 1750, tax: 180, ins: 85, growth: 4 }),
  A('business', 'sba7a', { id: 'auto', addr: 'Precision Auto Care', status: 'owned', price: 1100000, paid: 12, rent: 34000, growth: GB }),
  A('house', 'conv30', { id: 'birch', addr: '908 Birchwood Ct', price: 195000, rent: 2000, tax: 220, ins: 90, growth: 4, capex: 30000, capexMonths: 4, liftValue: 12, liftIncome: 8, exit: 'sell', exitMonth: 56 }),
  A('house', 'dscr', { id: 'willow', addr: '3350 Willow Bend Rd', price: 210000, rent: 2200, tax: 235, ins: 95, growth: 4 }),
  A('house', 'conv30', { id: 'linden', addr: '2914 Linden Way', price: 175000, rent: 1825, tax: 195, ins: 85, growth: 4 })]; };
const names = [['business', 'Cornerstone Plumbing Co'], ['commercial', 'Northgate Retail Strip'], ['business', 'Summit Freight & Logistics'], ['commercial', 'Harbor St Self-Storage'], ['business', 'Keystone HVAC Services'], ['commercial', 'Lakeview Medical Office'], ['business', 'Apex Property Services'], ['commercial', 'Westfield Office Park'], ['business', 'Meridian Staffing Group'], ['commercial', 'Eastgate Shopping Plaza'], ['business', 'Ironwood Manufacturing'], ['commercial', 'Redwood Logistics Center'], ['business', 'Granite Industrial Supply'], ['commercial', 'Bayview Medical Plaza'], ['business', 'Pioneer Healthcare Staffing'], ['commercial', 'Summit Business Park'], ['business', 'Atlas Distribution Group'], ['commercial', 'Crossroads Retail Center'], ['business', 'Beacon Engineering Services'], ['commercial', 'Harborfront Industrial'], ['business', 'Northstar Packaging'], ['commercial', 'Gateway Office Tower']];
const capBy = { 'Northgate Retail Strip': 7.0, 'Harbor St Self-Storage': 6.5, 'Lakeview Medical Office': 7.0, 'Westfield Office Park': 8.0, 'Eastgate Shopping Plaza': 7.0 };
function spec(i, price0) { const [type, name] = names[i], price = Math.round(price0 / 5000) * 5000, id = name.toLowerCase().replace(/[^a-z]/g, '').slice(0, 10);
  if (type === 'commercial') { const cap = capBy[name] || 7.25, c = rc(price, cap, 85); let dp = 35; const o = { id, addr: name, price, growth: GC, dp, ...c };
    if (name === 'Harbor St Self-Storage') Object.assign(o, { capex: Math.round(price * 0.06 / 5000) * 5000, capexMonths: 9, liftValue: 18, liftIncome: 12, exit: 'sell', exitMonth: 0, hold: 72 });
    if (name === 'Eastgate Shopping Plaza') Object.assign(o, { capex: Math.round(price * 0.06 / 5000) * 5000, capexMonths: 9, liftValue: 18, liftIncome: 12, exit: 'sell', exitMonth: 0, hold: 72 });
    return ['commercial', 'comm25', o]; }
  const mult = price < 2e6 ? 3.3 : price < 3.5e6 ? 4.0 : price < 6e6 ? 4.6 : price < 10e6 ? 5.0 : 5.6, rent = Math.round(price / mult / 12 / 10) * 10;
  const loanId = i === 0 || i === 4 ? 'sba7a' : 'bankbiz', o = { id, addr: name, price, rent, growth: GB, hold: name === 'Apex Property Services' ? 96 : 0 }; if (o.hold) Object.assign(o, { exit: 'sell', exitMonth: 0 });
  return ['business', loanId, o]; }
function build(rows) { const S = E.normalize({ g: Object.assign({}, g0), p: Object.assign(E.samplePersonal(), { capital: [] }), houses: fixed().concat(rows.map((r) => { const o = Object.assign({}, r[2]); delete o.hold; return A(r[0], r[1], o); })) }); return S; }
function fit(r) { /* choose dp so DSCR meets lender minimum */ const o = r[2], S = build([r]), h = S.houses[S.houses.length - 1], need = r[1] === 'sba7a' ? 1.15 : 1.25;
  const lo = r[1] === 'sba7a' ? 10 : r[1] === 'bankbiz' ? 25 : 35; for (let dp = lo; dp <= 60; dp += 5) { h.dp = dp; const v = E.view(S, h); if (v.noi / (v.P + v.mip) >= need + 0.03) { o.dp = dp; return r; } } o.dp = 60; return r; }
const T0 = Date.now();
/* The trust (engine plan) decides every purchase month: each row only carries a "not before" month (0 = as soon as the trust can pay). Rows that sell carry a hold period; their absolute exit month is set from the trust's purchase month (2 passes). */
let rows = [], price = +process.env.BASE || 1200000;
for (let i = 0; i < STEPS; i++) { const r = fit(spec(i, price)); price *= STEP; r[2].buyIn = 0; rows.push(r); }
let S, pl, f;
for (let pass = 0; pass < 10; pass++) { const before = JSON.stringify(rows.map((r) => r[2].exitMonth)); S = build(rows); pl = E.plan(S); rows.forEach((r) => { if (r[2].hold) r[2].exitMonth = (isFinite(pl.purchase[r[2].id]) ? pl.purchase[r[2].id] : 0) + r[2].hold; }); if (JSON.stringify(rows.map((r) => r[2].exitMonth)) === before) break; }
S = build(rows); pl = E.plan(S); f = E.finance(S, pl);
if (process.env.SHOW) require('/tmp/claude-0/work/show.js')(S); if (process.env.WHY) require('/tmp/claude-0/work/why.js')(S);
console.error('assets', S.houses.length, 'NW', (pl.horizon.nw / 1e6).toFixed(1) + 'M', 'status', f.status, 'last buy', pl.lastBuy, 'unfunded', pl.unfunded.length, 'dti', pl.worst.dti.toFixed(0), 'time', Date.now() - T0);
const fmt = (o) => '{' + Object.entries(o).filter(([k]) => k !== 'hold').map(([k, v]) => k + ': ' + JSON.stringify(v)).join(', ') + '}';
if (process.env.OUT) console.log(rows.map((r) => `    A('${r[0]}', '${r[1]}', ${fmt(r[2])})`).join(',\n'));
