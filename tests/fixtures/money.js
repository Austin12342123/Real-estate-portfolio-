/* Fixture portfolios for the money tests. Every number is derived so the engine's real formulas give the spec's figures. */
const path = require('path');
const E = require(process.env.ENGINE_PATH || path.join(__dirname, '../../prototype/v4/engine.js'));
const G = () => Object.assign({}, E.GDEF, { vac: 7, mgmt: 8, maint: 0.96, appr: 0, closing: 0 });
const P = (o) =>
  Object.assign(E.samplePersonal(), { cash: 50000, living: 2300, emergencyMonths: 3, housing: 0, jobs: [], gmMonthly: 0, inflation: 0, cashApy: 0, salesTaxPct: 0, statePct: 0, planned: [] }, o);
const A = (o) => E.newHouse(Object.assign({ type: 'house', status: 'owned', growth: 0, closingPct: 0, hoa: 0, nnn: 0, io: true, term: 360, loanId: 'custom' }, o));
/* T1/T5: rent 2400 -> EGI 2232; costs tax 350 + ins 120 + repairs 0.96%*250000/12 = 200 + mgmt 178.56; IO loan 150000 at 9.6% = 1200/mo */
const house = () => A({ id: 'a', price: 250000, dp: 40, rate: 9.6, rent: 2400, tax: 350, ins: 120 });
/* a debt-free business with no equity (price 20000 = liens 20000) */
const biz = () => E.newHouse({ type: 'business', id: 'b', status: 'owned', price: 20000, liens: 20000, dp: 100, rent: 10000, growth: 0, closingPct: 0, loanId: 'custom' });
const waiting = () => A({ id: 'w', status: 'planned', price: 2000000, dp: 20, rate: 7, io: true, rent: 10000, tax: 100, ins: 100 });
const t1 = () => ({ g: G(), p: P(), houses: [house()] });
const t5 = () => ({ g: G(), p: P(), houses: [house(), biz(), waiting()] });
/* T2: cash 20000, cushion 3 x 2300 = 6900 -> 13100 free; job net 6275/mo - living 2300 = 3975 surplus; first purchase needs 20000 (20% of 100000) */
const t2 = (typed) => {
  const job = { id: 'j', name: 'Job', kind: 'salary', gross: 100400, raise: 0, tax: 25, hours: 40, start: 0, end: null };
  const w = A({ id: 'w', status: 'planned', io: false, price: 100000, dp: 20, rate: 7, rent: 1000, tax: 0, ins: 0, jobSavedOverride: typed });
  return { g: G(), p: P({ cash: 20000, jobs: [job] }), houses: [w] };
};
/* T4: 240000 home, 25% down (60000 in), IO loan 180000, value grows 5%/yr, sold at month 12, no selling cost, no tax: 252000 - 180000 = 72000 */
const t4 = () => ({ g: G(), p: P(), houses: [A({ id: 's', price: 240000, dp: 25, rate: 6, rent: 2000, tax: 0, ins: 0, growth: 5, sellCost: 0, exit: 'sell', exitMonth: 12 })] });
module.exports = { E, t1, t2, t4, t5 };
