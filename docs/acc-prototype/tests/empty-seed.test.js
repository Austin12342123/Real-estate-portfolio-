/* ACC1b empty seed for a new account, checked against the real engine (prototype/v4/engine.js).
   Run: node empty-seed.test.js <path to engine.js> */
const assert = require('assert');
const E = require(process.argv[2]);
const emptySeed = () => ({
  p: { cash: 0, living: 0, housing: 0, operating: 0, jobs: [], planned: [], capital: [], cashApy: 3, inflation: 3,
       emergencyMonths: 6, statePct: 0, landPct: 20, bizIntPct: 70, bizHours: 20, gmMonthly: 8000,
       portfolioTaxPct: null, salesTaxPct: null },
  g: Object.assign({}, E.GDEF, { p1: 0, p2: 0, otherDebt: 0 }),
  houses: [],
  added: E.ADDITIONS.map((a) => a.key),
});
const results = [];
const t = (name, fn) => { try { fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ': ' + e.message]); } };

t('every samplePersonal field is set by the seed (nothing for normalizePersonal to fill with sample values)', () => {
  const missing = Object.keys(E.samplePersonal()).filter((k) => !(k in emptySeed().p));
  assert.deepStrictEqual(missing, []);
});
t('normalizePersonal keeps the empty seed empty: $0 cash, no jobs, no planned costs', () => {
  const p = E.normalizePersonal(emptySeed().p);
  assert.strictEqual(p.cash, 0); assert.strictEqual(p.living, 0); assert.strictEqual(p.housing, 0);
  assert.deepStrictEqual(p.jobs, []); assert.deepStrictEqual(p.planned || [], []); assert.deepStrictEqual(p.capital || [], []);
});
t('a seed missing cash would be filled with the sample $45,000 (why setters always write numbers)', () => {
  const s = emptySeed().p; delete s.cash;
  assert.strictEqual(E.normalizePersonal(s).cash, 45000);
});
t('a blank money box written as "" would also become $45,000, a 0 stays 0', () => {
  assert.strictEqual(E.normalizePersonal(Object.assign(emptySeed().p, { cash: '' })).cash, 45000);
  assert.strictEqual(E.normalizePersonal(Object.assign(emptySeed().p, { cash: 0 })).cash, 0);
});
t('GDEF would invent $200,000 per co-signer; the seed sets both to 0', () => {
  assert.strictEqual(E.GDEF.p1, 200000); assert.strictEqual(E.GDEF.p2, 200000);
  const g = emptySeed().g; assert.strictEqual(g.p1, 0); assert.strictEqual(g.p2, 0);
});
t('ADDITIONS (Austin\'s own release assets) are never added to a new account', () => {
  const S = E.applyAdditions(emptySeed());
  assert.strictEqual(S.houses.length, 0);
});
t('without S.added listing them, ADDITIONS would add his assets (the case the seed blocks)', () => {
  const S = emptySeed(); S.added = [];
  E.applyAdditions(S);
  assert.ok(S.houses.length >= 1, 'expected an ADDITIONS asset');
});
t('the plan runs on the empty seed without errors and shows $0 net worth', () => {
  const S = emptySeed(); S.p = E.normalizePersonal(S.p);
  const pl = E.plan(S); const td = E.todayTotals(S, pl);
  assert.strictEqual(td.cash, 0); assert.strictEqual(td.nw, 0);
});
t('an hourly job answer is worked out by the engine (gross from wage, tips, hours, weeks)', () => {
  const S = emptySeed();
  S.p.jobs = [{ id: 'j1', name: 'Day job', kind: 'hourly', wage: 20, tips: 0, hours: 40, weeks: 50, raise: 3, tax: null, start: 0, end: null }];
  S.p.cash = 10000; S.p.living = 1500;
  S.p = E.normalizePersonal(S.p);
  const yearly = E.jobsGross(S, 0) * 12; /* $20 x 40 h x 50 weeks = $40,000 */
  assert.ok(Math.abs(yearly - 40000) < 1, 'yearly gross ' + yearly);
  E.plan(S);
});
results.forEach((r) => console.log(r[0] + ' ' + r[1]));
const bad = results.filter((r) => r[0] === 'FAIL').length;
console.log(`\n${results.length - bad} of ${results.length} passed`);
process.exit(bad ? 1 : 0);
