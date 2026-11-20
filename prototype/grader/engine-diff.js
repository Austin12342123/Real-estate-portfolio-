#!/usr/bin/env node
/* Differential test for the module split: runs the engine of an OLD revision against the CURRENT v4/engine.js on many seeded and varied
   portfolios and compares the JSON of plan(), finance(), feasible(), checkList(), todayTotals(), shortfall(), moveTo() byte for byte.
   Usage: node grader/engine-diff.js [OLD_REV=09eaacf]     (OLD_REV: any git rev, or a path to an old engine.js)
   Exit 0 = identical, 1 = difference (first difference is printed). Node only, no browser; takes a few seconds. */
const fs = require('fs'), path = require('path'), cp = require('child_process'), os = require('os');
const REPO = path.resolve(__dirname, '../..');
const NEW = path.join(REPO, 'prototype/v4/engine.js');
const rev = process.argv[2] || '09eaacf';
let oldPath = rev;
if (!fs.existsSync(rev)) {
  oldPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'engdiff-')), 'engine.old.js');
  fs.writeFileSync(oldPath, cp.execFileSync('git', ['show', rev + ':prototype/v4/engine.js'], { cwd: REPO, maxBuffer: 1 << 28 }));
}
const load = (p) => { delete require.cache[require.resolve(p)]; return require(p); };
const Eo = load(oldPath), En = load(NEW);
const J = (x) => JSON.stringify(x, (k, v) => (typeof v === 'number' && !isFinite(v) ? 'N:' + v : v === undefined ? 'U' : v));
const clone = (x) => JSON.parse(JSON.stringify(x));

function portfolios(E) {
  const out = [];
  const bases = { seedPlan: E.seedPlan, seed: E.seed, seedStretch: E.seedStretch, seedBig: E.seedBig, seedStradella: E.seedStradella };
  for (const [name, fn] of Object.entries(bases)) {
    if (typeof fn !== 'function') continue;
    const S = fn(); if (!S.p) S.p = E.samplePersonal();
    out.push([name, S]);
    for (const g of [{ planYears: 30 }, { hrate: 11, cap: 70 }, { appr: 3, haircut: 10, closing: 0 }, { vac: 12, refiRate: 6, refiTerm: 360 }, { capBiz: 30, cap: 60, planYears: 10 }]) {
      const T = clone(S); Object.assign(T.g, g); out.push([name + ' ' + J(g), T]);
    }
    const R = clone(S); if (R.houses.length > 2) { R.houses.splice(1, 1); E.normalize(R); out.push([name + ' removed#2', R]); }
    const M = clone(S); const pl = M.houses.filter((h) => h.status === 'planned');
    if (pl.length > 2 && E.moveTo) { try { E.moveTo(M, pl[pl.length - 1].id, 1); } catch (e) { /* same on both sides */ } out.push([name + ' moved-last-to-1', M]); }
  }
  return out;
}

function run(E) {
  const res = [];
  for (const [name, S0] of portfolios(E)) {
    const S = clone(S0), rec = { name };
    const t = (k, f) => { try { rec[k] = J(f()); } catch (e) { rec[k] = 'THROW ' + e.message; } };
    let pl, fin;
    t('plan', () => (pl = E.plan(S)));
    t('finance', () => (fin = E.finance(S, pl)));
    t('feasible', () => E.feasible(S, pl, fin));
    t('checkList', () => E.checkList(S, pl, fin));
    t('todayTotals', () => E.todayTotals(S, pl, S.houses.map((h) => h.id)));
    t('todayPlanned', () => E.todayTotals(S, pl, S.houses.filter((h) => h.status === 'planned').map((h) => h.id)));
    t('shortfall', () => S.houses.filter((h) => h.status === 'planned').slice(0, 4).map((h) => E.shortfall(S, pl, fin, h.id, { sim: true })));
    t('afford', () => E.afford && S.houses.slice(0, 3).map((h) => E.afford(S, h, pl, fin && fin.feas)));
    t('S-after', () => S);
    res.push(rec);
  }
  return res;
}

const a = run(Eo), b = run(En);
let diffs = 0, cmp = 0, bytes = 0;
for (let i = 0; i < Math.max(a.length, b.length); i++) {
  for (const k of Object.keys(a[i] || b[i])) {
    cmp++; bytes += (a[i][k] || '').length;
    if (!b[i] || a[i][k] !== b[i][k]) { diffs++; if (diffs <= 3) console.log('DIFF', a[i].name, k, '\n old', String(a[i][k]).slice(0, 200), '\n new', String(b[i] && b[i][k]).slice(0, 200)); }
  }
}
const keys = ['seedPlan', 'seed', 'seedStretch', 'seedBig', 'seedStradella', 'samplePersonal', 'applyAdditions', 'plan', 'finance', 'feasible', 'checkList', 'shortfall', 'moveTo', 'reorder', 'normalize', 'fromListing', 'Diag', 'jobMoney'];
const apiOld = Object.keys(Eo).sort().join(), apiNew = Object.keys(En).sort().join();
if (apiOld !== apiNew) { diffs++; console.log('DIFF exported API keys differ'); }
for (const k of ['GDEF', 'TYPES', 'LOANS', 'MFLOANS']) if (J(Eo[k]) !== J(En[k])) { diffs++; console.log('DIFF constant', k); }
if (J(Eo.ADDITIONS || null) !== J(En.ADDITIONS || null)) { diffs++; console.log('DIFF ADDITIONS'); }
console.log(`engine-diff: ${a.length} portfolios, ${cmp} comparisons (${bytes} bytes of JSON), ${diffs} differences vs ${rev}; API ${Object.keys(En).length} keys`);
process.exit(diffs ? 1 : 0);
