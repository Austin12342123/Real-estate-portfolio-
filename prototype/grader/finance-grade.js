/* Category F: Personal finances ("can I afford my portfolio"). 90 automated points, reported separately from A-E + R.
   Plugged in from grade.js:  require('./finance-grade.js').run(X)  ->  { earned, max, checks }.
   F1 engine (node), F2 verdict (node), F3 UI features, F4 factor coverage (node), F5 robustness/accessibility. Never modifies the app. */
const fs = require('fs'), os = require('os'), path = require('path');

exports.run = async function run(X) {
  const { E, Parts, mkS, DATA_V, KEY, money, near, nearRel, BAD, mkCtx, mkPage, reset, loadState, goHash, goMain, setVal, store, collect } = X;
  const checks = [];
  const VL = { yes: 'Yes', tight: 'Tight', no: 'Not yet' }, RANK = { no: 0, tight: 1, yes: 2 };
  async function fcheck(id, name, points, repro, fn) {
    let r; const t0 = Date.now();
    try { r = await fn(); } catch (e) { r = { ratio: 0, detail: 'CRASH in check: ' + (e && e.stack || e).toString().slice(0, 300) }; }
    if (r instanceof Parts) r = { ratio: r.ratio, detail: r.detail };
    if (typeof r === 'boolean') r = { ratio: r ? 1 : 0, detail: r ? 'ok' : 'failed' };
    const ratio = Math.max(0, Math.min(1, r.ratio));
    const rec = { id, category: 'F', name, points, earned: Math.round(points * ratio * 100) / 100, ratio, detail: r.detail || '', repro, seconds: +((Date.now() - t0) / 1000).toFixed(1) };
    checks.push(rec);
    console.log(`  [${rec.earned.toFixed(2)}/${points}] ${id} ${name}  (${rec.seconds}s)${ratio < 1 ? '  <-- ' + String(rec.detail).slice(0, 260) : ''}`);
  }
  const clone = (o) => JSON.parse(JSON.stringify(o));

  /* ---- deterministic rng ---- */
  let seed = 987654321; const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
  const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1)), rf = (a, b) => a + rnd() * (b - a), pick = (l) => l[Math.floor(rnd() * l.length)];

  /* ---- state builders ---- */
  const P0 = (o) => Object.assign({ cash: 0, cashApy: 0, living: 0, inflation: 0, emergencyMonths: 0, portfolioTaxPct: 0, salesTaxPct: 0, operating: 0, gmMonthly: 0, bizHours: 0, jobs: [], planned: [], capital: [] }, o || {});
  const mkF = (houses, p, g) => { const S = E.normalize({ g: Object.assign({}, E.GDEF, g || {}), p: P0(p), houses: houses || [] }); S.v = DATA_V; return S; };
  const job = (o) => Object.assign({ id: 'jx' + Math.floor(rnd() * 1e9), name: 'J', gross: 0, raise: 0, tax: 0, hours: 40, start: 0, end: null }, o || {});
  function randState() {
    const n = ri(0, 7), hs = [];
    for (let i = 0; i < n; i++) {
      const type = pick(['house', 'house', 'commercial', 'business', 'business']), loans = E.loansFor(type), lo = pick(loans);
      const o = { id: 'r' + i, status: rnd() < 0.45 ? 'owned' : 'planned', price: ri(80, 900) * 1000 * (type === 'house' ? 0.5 : 2), rent: ri(800, 20000), tax: ri(0, 500), ins: ri(0, 300), buyIn: ri(0, 60), paid: ri(0, 60), extra: rnd() < 0.5 ? ri(0, 1500) : 0, growth: rnd() < 0.5 ? ri(0, 8) : null, loanId: lo.id };
      if (type === 'business') { o.tax = 0; o.ins = 0; }
      if (rnd() < 0.4) { o.exit = 'sell'; o.exitMonth = ri(3, 150); o.sellCost = ri(2, 9); }
      if (rnd() < 0.25) { o.capex = ri(5, 60) * 1000; o.capexMonths = ri(2, 10); o.arv = rnd() < 0.5 ? Math.round(o.price * 1.15) : 0; o.liftIncome = ri(0, 12); }
      hs.push(E.newAsset(type, lo.id, o));
    }
    hs.forEach((h, i) => { if (rnd() < 0.4 && hs.length > 1) { const t = hs[ri(0, hs.length - 1)]; if (t.id !== h.id && t.status === 'planned') h.target = t.id; } });
    const jobs = []; for (let i = 0, nj = ri(0, 3); i < nj; i++) jobs.push(job({ gross: ri(20, 300) * 1000, raise: ri(-3, 12), tax: ri(10, 40), hours: ri(10, 60), start: rnd() < 0.3 ? ri(1, 40) : 0, end: rnd() < 0.4 ? ri(6, 200) : null }));
    const planned = [], capital = []; for (let i = 0, k = ri(0, 3); i < k; i++) planned.push({ id: 'pl' + i, name: 'x', amount: ri(1, 80) * 1000, month: ri(0, 120) });
    for (let i = 0, k = ri(0, 3); i < k; i++) capital.push({ id: 'cp' + i, name: 'y', amount: ri(1, 300) * 1000, month: ri(0, 120) });
    return mkF(hs, { cash: ri(0, 150) * 1000, cashApy: rf(0, 6), living: ri(1500, 9000), inflation: rf(0, 6), emergencyMonths: ri(0, 9), portfolioTaxPct: ri(0, 35), salesTaxPct: ri(0, 40), operating: ri(0, 3), gmMonthly: ri(2, 12) * 1000, bizHours: ri(5, 40), jobs, planned, capital }, { otherDebt: ri(0, 1500), p1: ri(0, 150) * 1000, p2: ri(0, 80) * 1000 });
  }

  /* ---- INDEPENDENT simulation, written from the definitions (not from engine code) ---- */
  function sim(S, pl) {
    const p = S.p, g = S.g, s = pl.series, T = pl.T, o = { };
    const keys = ['income', 'portfolio', 'portTax', 'extra', 'living', 'debts', 'gm', 'hours', 'nBiz', 'outsideCall', 'saleTax', 'net', 'interest', 'liquid', 'total', 'reserve', 'burn', 'runway', 'oneTime', 'capitalIn'];
    keys.forEach((k) => (o[k] = []));
    const jobPay = (j, t) => { if (t < j.start) return 0; if (j.end !== null && j.end !== undefined && t >= j.end) return 0; const yrs = Math.floor((t - j.start) / 12); return (j.gross / 12) * Math.pow(1 + j.raise / 100, yrs); };
    const saleTaxAt = {}; for (const h of S.houses) { const ex = pl.exits[h.id]; if (!ex) continue; const gain = ex.price * (1 - h.sellCost / 100) - (ex.cost - ex.dep); /* flat override: rate x (sale price after costs - price, closing costs and improvements + depreciation taken) */ saleTaxAt[ex.month] = (saleTaxAt[ex.month] || 0) + Math.max(0, gain) * p.salesTaxPct / 100; }
    let liq = p.cash;
    for (let t = 0; t <= T; t++) {
      let inc = 0, hrs = 0; for (const j of p.jobs) { const v = jobPay(j, t); inc += v * (1 - j.tax / 100); if (v > 0) hrs += j.hours; }
      let nb = 0; for (const h of S.houses) if (h.type === 'business' && pl.purchase[h.id] <= t && t < pl.sellAt[h.id]) nb++;
      const infl = Math.pow(1 + p.inflation / 100, t / 12), port = s.cf[t], ptax = Math.max(0, s.txRE[t] + s.txBiz[t]) * p.portfolioTaxPct / 100, /* a typed rate is a flat rate on taxable profit (NOI - interest - depreciation) */ ex = s.extra[t], liv = p.living * infl, dbt = g.otherDebt;
      const gm = Math.max(0, nb - p.operating) * p.gmMonthly * infl; hrs += Math.min(p.operating, nb) * p.bizHours;
      const oc = t === 0 ? s.outside[0] : s.outside[t] - s.outside[t - 1];
      const net = inc + port - ptax - gm - ex - liv - dbt;
      const intr = t > 0 ? Math.max(0, o.liquid[t - 1] + s.cash[t - 1]) * p.cashApy / 100 / 12 : 0;
      let cap = 0; for (const c of p.capital) if (c.month === t) cap += c.amount; let one = 0; for (const x of p.planned) if (x.month === t) one += x.amount;
      liq = liq + net + intr + cap - oc - one - (saleTaxAt[t] || 0) - (pl.dpCash ? pl.dpCash[t] || 0 : 0) - (pl.jobUsed ? pl.jobUsed[t] || 0 : 0);
      const tot = liq + s.cash[t], res = p.emergencyMonths * (liv + dbt), burn = liv + dbt + ex + gm - Math.max(0, port - ptax);
      const vals = { income: inc, portfolio: port, portTax: ptax, extra: ex, living: liv, debts: dbt, gm, hours: hrs, nBiz: nb, outsideCall: oc, saleTax: saleTaxAt[t] || 0, net, interest: intr, liquid: liq, total: tot, reserve: res, burn, runway: burn > 0.5 ? Math.max(0, tot) / burn : Infinity, oneTime: one, capitalIn: cap };
      keys.forEach((k) => o[k].push(vals[k]));
    }
    return o;
  }
  /* independent verdict. Returns status plus a list of "borderline" flags so that knife-edge states are skipped rather than guessed. */
  function verdictOf(S, pl, o) {
    const p = S.p, g = S.g, T = pl.T; const minT = Math.min(...o.total); const short = Math.max(0, -minT);
    let gap = -Infinity; for (let t = 0; t <= T; t++) gap = Math.max(gap, o.reserve[t] - o.total[t]);
    const peakH = Math.max(...o.hours), minRun = Math.min(...o.runway), dti = pl.worst.dti, net0 = o.net[0];
    const border = Math.abs(minT) < 2 || Math.abs(net0) < 1 || Math.abs(gap) < 2 || Math.abs(dti - g.dti) < 0.05 || Math.abs(peakH - 70) < 0.05 || Math.abs(minRun - 3) < 0.02;
    let status = 'yes';
    if (minT < 0) status = 'no'; else if (net0 < 0 || gap > 0 || dti > g.dti || peakH > 70 || minRun < 3) status = 'tight';
    return { status, short, gap: Math.max(0, gap), peakH, minRun, border, minT, firstShort: o.total.findIndex((x) => x < 0), gmMax: Math.max(...o.gm), net0 };
  }
  const closeAbs = (a, b, tol = 1) => (Number.isFinite(a) && Number.isFinite(b) ? Math.abs(a - b) <= tol + Math.abs(b) * 1e-9 : a === b);
  const money0 = (n) => '$' + Math.round(Math.abs(n)).toLocaleString('en-US');

  /* ================================================================ F1 engine correctness */
  await fcheck('F1', 'Engine correctness: independent month-by-month simulation + hand cases + edge values', 26, 'node: simulate from the definitions, compare E.finance on 80 random states; hand-calculated cases; NaN scan', async () => {
    const P = new Parts(); const N = 80; let nOk = 0, nStates = 0; const bad = []; const worstBy = {};
    const fields = ['income', 'portfolio', 'portTax', 'extra', 'living', 'debts', 'gm', 'hours', 'nBiz', 'outsideCall', 'saleTax', 'net', 'interest', 'liquid', 'total', 'reserve', 'burn'];
    let hadSale = 0, hadBiz = 0, hadCap = 0, hadPlanned = 0, hadEnd = 0;
    for (let n = 0; n < N; n++) {
      const S = randState(), pl = E.plan(S), f = E.finance(S, pl), o = sim(S, pl); nStates++;
      if (Object.keys(pl.exits).length) hadSale++; if (S.houses.some((h) => h.type === 'business')) hadBiz++; if (S.p.capital.length) hadCap++; if (S.p.planned.length) hadPlanned++; if (S.p.jobs.some((j) => j.end !== null)) hadEnd++;
      let ok = true, why = '';
      if (f.T !== pl.T || f.series.total.length !== pl.T + 1) { ok = false; why = 'length'; }
      else {
        for (const k of fields) for (let t = 0; t <= pl.T; t++) { const a = f.series[k][t], b = o[k][t]; const tol = 1 + (k === 'liquid' || k === 'total' ? 0 : 0); if (!(Math.abs(a - b) <= tol + Math.abs(b) * 1e-9)) { ok = false; why = why || `${k}[${t}] engine ${a} vs sim ${b}`; worstBy[k] = (worstBy[k] || 0) + 1; break; } }
        for (let t = 0; t <= pl.T && ok; t++) { const a = f.series.runway[t], b = o.runway[t]; if (!(a === b || (Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) < 1e-6 * (1 + Math.abs(b))))) { ok = false; why = `runway[${t}] ${a} vs ${b}`; } }
      }
      if (ok) nOk++; else bad.push(`#${n}: ${why}`);
    }
    P.t(nOk === N, `${nOk}/${N} random states: every series (${fields.length} series + runway, all months) matches the independent simulation within $1`, 8, bad.slice(0, 3).join(' ; '));
    P.t(hadSale >= 15 && hadBiz >= 25 && hadCap >= 25 && hadPlanned >= 25 && hadEnd >= 15, `random coverage is real (sales ${hadSale}, businesses ${hadBiz}, capital ${hadCap}, planned ${hadPlanned}, ended jobs ${hadEnd})`, 1);
    /* hand-calculated cases */
    const base = (p, houses, g) => { const S = mkF(houses || [], p, g), pl = E.plan(S); return { S, pl, f: E.finance(S, pl) }; };
    let r = base({ jobs: [job({ id: 'a', gross: 120000, tax: 20 })] });
    P.t(closeAbs(r.f.series.income[0], 8000, 0.01) && closeAbs(r.f.series.income[50], 8000, 0.01) && closeAbs(r.f.series.total[0], 8000, 0.01) && closeAbs(r.f.series.total[9], 80000, 0.01), 'one job 120000 gross, 20% tax, no portfolio: income 8000/mo, total after 10 months 80000', 2, r.f.series.income[0] + ' / ' + r.f.series.total[9]);
    r = base({ jobs: [job({ id: 'a', gross: 120000, tax: 20, raise: 10 })] });
    P.t(closeAbs(r.f.series.income[11], 8000, 0.01) && closeAbs(r.f.series.income[12], 8800, 0.01) && closeAbs(r.f.series.income[24], 9680, 0.01), 'raise 10%: 8000 through month 11, 8800 at month 12, 9680 at month 24', 2, [11, 12, 24].map((t) => r.f.series.income[t].toFixed(2)).join(','));
    r = base({ jobs: [job({ id: 'a', gross: 120000, tax: 20, start: 5, end: 9 })] });
    P.t(r.f.series.income[4] === 0 && closeAbs(r.f.series.income[5], 8000, 0.01) && closeAbs(r.f.series.income[8], 8000, 0.01) && r.f.series.income[9] === 0, 'job start 5 / end 9 pays months 5..8 only', 1.5, [4, 5, 8, 9].map((t) => r.f.series.income[t]).join(','));
    r = base({ cash: 100000, living: 1000, inflation: 12 });
    P.t(closeAbs(r.f.series.living[0], 1000, 0.001) && closeAbs(r.f.series.living[12], 1120, 0.001) && closeAbs(r.f.series.living[24], 1254.4, 0.001) && closeAbs(r.f.series.living[6], 1000 * Math.pow(1.12, 0.5), 0.001), 'living 1000 with 12% inflation: 1120 at month 12, 1254.40 at month 24, compounding smoothly by month', 1.5, [6, 12, 24].map((t) => r.f.series.living[t].toFixed(2)).join(','));
    const jb = [job({ id: 'a', gross: 120000, tax: 20 })];
    const b0 = base({ cash: 50000, living: 3000, jobs: jb }), b1 = base({ cash: 50000, living: 3000, jobs: jb, planned: [{ id: 'x', name: 'car', amount: 15000, month: 6 }] }), b2 = base({ cash: 50000, living: 3000, jobs: jb, capital: [{ id: 'y', name: 'dad', amount: 40000, month: 3 }] });
    P.t([0, 5].every((t) => closeAbs(b1.f.series.total[t], b0.f.series.total[t], 0.001)) && [6, 7, 30, 100, 239].every((t) => closeAbs(b0.f.series.total[t] - b1.f.series.total[t], 15000, 0.001)), 'a $15,000 expense in month 6 lowers total by exactly 15000 from month 6 on (and not before)', 2, [5, 6, 7].map((t) => (b0.f.series.total[t] - b1.f.series.total[t]).toFixed(2)).join(','));
    P.t([0, 2].every((t) => closeAbs(b2.f.series.total[t], b0.f.series.total[t], 0.001)) && [3, 4, 100].every((t) => closeAbs(b2.f.series.total[t] - b0.f.series.total[t], 40000, 0.001)), 'outside capital of 40000 in month 3 raises total by exactly 40000 from month 3', 1.5, [2, 3, 4].map((t) => (b2.f.series.total[t] - b0.f.series.total[t]).toFixed(2)).join(','));
    /* sale tax: owned asset, growth 5%, sells month 24, cost 6%, price 300000, no loan balance concerns (cash purchase) */
    const sellH = () => E.newAsset('house', 'cashh', { id: 's', status: 'owned', price: 300000, rent: 0, tax: 0, ins: 0, growth: 5, exit: 'sell', exitMonth: 24, sellCost: 6, capex: 0, paid: 0 });
    const t0 = base({ cash: 1000, salesTaxPct: 0 }, [sellH()]), t25 = base({ cash: 1000, salesTaxPct: 25 }, [sellH()]);
    const clc = 300000 * 0.02, depT = (300000 + clc) * 0.8 / 330 * 23.5 /* 27.5-year straight line on the 80% building share, first month half */, gain = t0.pl.exits.s.price * 0.94 - (300000 + clc - depT), wantTax = 0.25 * gain;
    P.t(near(t0.pl.exits.s.price, 300000 * 1.05 * 1.05, 1) && gain > 0, 'sanity: exit price is value at month 24 (300000 x 1.05^2)', 0.5, t0.pl.exits.s.price);
    P.t(closeAbs(t0.f.series.total[24] - t25.f.series.total[24], wantTax, 0.5) && closeAbs(t0.f.series.total[23] - t25.f.series.total[23], 0, 0.001) && closeAbs(t0.f.series.total[100] - t25.f.series.total[100], wantTax, 0.5), 'sale tax = 25% of the gain after selling costs, closing costs and the depreciation taken (' + wantTax.toFixed(2) + ') taken in the sale month only', 2, (t0.f.series.total[24] - t25.f.series.total[24]).toFixed(2) + ' want ' + wantTax.toFixed(2));
    const loss = base({ cash: 1000, salesTaxPct: 25 }, [E.newAsset('house', 'cashh', { id: 's', status: 'owned', price: 300000, rent: 0, tax: 0, ins: 0, growth: -3, exit: 'sell', exitMonth: 24, sellCost: 6 })]);
    P.t(loss.f.series.saleTax.every((x) => x === 0), 'a sale at a loss pays no sale tax (never negative)', 0.5);
    const iR = base({ cash: 10000, cashApy: 12 });
    P.t(closeAbs(iR.f.series.interest[0], 0, 1e-9) && closeAbs(iR.f.series.interest[1], 100, 0.001) && closeAbs(iR.f.series.liquid[12], 10000 * Math.pow(1.01, 12), 0.01) && closeAbs(iR.f.series.interest[12], 10000 * Math.pow(1.01, 11) * 0.01, 0.01), 'interest on cash: 12% APY on 10000 = 100 in month 1, compounding monthly, none in month 0', 1.5, iR.f.series.liquid[12]);
    const gmR = base({ operating: 1, gmMonthly: 6000, inflation: 0, bizHours: 20, jobs: [job({ id: 'a', hours: 30, gross: 60000 })] }, ['b1', 'b2', 'b3'].map((id, i) => E.newAsset('business', 'cashb', { id, status: 'owned', price: 100000, rent: 3000 })));
    P.t(closeAbs(gmR.f.series.gm[0], 12000, 0.001) && gmR.f.series.nBiz[0] === 3 && closeAbs(gmR.f.series.hours[0], 30 + 20, 0.001), '3 businesses, 1 run by you: 2 managers x 6000 = 12000/mo, hours = job 30 + 1 x 20', 1.5, gmR.f.series.gm[0] + ' / ' + gmR.f.series.hours[0]);
    const tx = base({ jobs: [job({ id: 'a', gross: 120000, tax: 20 })], portfolioTaxPct: 20, cash: 0 }, [E.newAsset('house', 'cashh', { id: 'h', status: 'owned', price: 100000, rent: 2000, tax: 0, ins: 0, growth: 0 })], { vac: 0, mgmt: 0, maint: 0 });
    const cf0 = tx.pl.series.cf[0], tp0 = tx.pl.series.txRE[0], dep0 = 100000 * 1.02 * 0.8 / 330 * 0.5 /* mid-month: first month half */; P.t(cf0 > 0 && closeAbs(tp0, cf0 - dep0 + (0), 0.01) && closeAbs(tx.f.series.portTax[0], tp0 * 0.2, 0.001) && closeAbs(tx.f.series.net[0], 8000 + cf0 - tp0 * 0.2, 0.001), 'typed portfolio tax is 20% of taxable profit (cash flow less depreciation, 27.5 years on 80% of the price, half a month in month 0); net = take-home + cash flow - tax', 1, cf0);
    /* edge profiles: no NaN / Infinity */
    const BADK = (f) => { const out = []; const allowInf = { runway: 1 }; for (const k in f.series) f.series[k].forEach((v, t) => { if (!Number.isFinite(v) && !(k in allowInf && v === Infinity)) out.push(k + '[' + t + ']=' + v); });
      for (const k in f.kpis) { const v = f.kpis[k]; if (typeof v === 'number' && !Number.isFinite(v) && !(['minRunway', 'runway0', 'reserveMonths0'].includes(k) && v === Infinity)) out.push('kpi ' + k + '=' + v); }
      if (BAD.test([f.headline, ...f.reasons.map((x) => x.text), ...f.fixes].join(' | '))) out.push('text: ' + [f.headline, ...f.reasons.map((x) => x.text), ...f.fixes].join(' | ').slice(0, 120)); return out; };
    const edge = [['no jobs', mkF([], { jobs: [] })], ['zero cash, empty everything', mkF([], P0({ cash: 0 }))], ['zero cash + living', mkF([], { cash: 0, living: 0, jobs: [] })], ['negative values (normalized)', mkF(E.seed().houses, { cash: -5e5, living: -3000, inflation: -50, jobs: [job({ gross: -9, tax: -5, hours: -1, raise: -99 })], planned: [{ id: 'q', name: '', amount: -5, month: -3 }], capital: [{ id: 'q2', name: '', amount: -9, month: -1 }] })],
      ['huge values', mkF(E.seed().houses, { cash: 1e15, living: 1e12, inflation: 1e6, cashApy: 1e9, jobs: [job({ gross: 1e15, raise: 1e6 })], planned: [{ id: 'q', name: '', amount: 1e18, month: 1e9 }], capital: [{ id: 'q2', name: '', amount: 1e18, month: 5 }] })],
      ['garbage strings', mkF(E.seed().houses, { cash: 'abc', living: '', cashApy: null, jobs: [{ gross: 'x', raise: 'y', end: 'z', start: 'q' }, null, 5], planned: 'nope', capital: [{ amount: 'a' }] })],
      ['empty portfolio with 3 jobs', mkF([], { cash: 100, living: 5000, jobs: [job({ gross: 1e5 }), job({ gross: 5e4, end: 3 }), job({ gross: 1, start: 99 })] })],
      ['100 jobs', mkF(E.seed().houses, { jobs: Array.from({ length: 100 }, (_, i) => job({ id: 'j' + i, gross: 1000 * i, hours: 168, raise: 50, tax: 70 })) })],
      ['stretch sample', E.seedStretch()], ['sample', E.seed()], ['operating > businesses, zero hours', mkF(E.seed().houses, { operating: 99, bizHours: 0, gmMonthly: 0 })], ['zero horizon-ish', (() => { const S = E.seed(); S.g.planYears = 0; S.g.horizon = 12; return S; })()]];
    const badE = []; edge.forEach(([n, S]) => { try { const f = E.finance(S); const b = BADK(f); if (b.length) badE.push(n + ': ' + b[0]); } catch (e) { badE.push(n + ' threw ' + e.message); } });
    P.t(!badE.length, `no NaN/Infinity/throw for ${edge.length} edge profiles (no jobs, zero cash, negative, huge 1e15, garbage strings, 100 jobs, empty portfolio, 12-month horizon)`, 3, badE.slice(0, 3).join(' ; '));
    /* purity: calling finance twice, and with/without a precomputed plan, gives identical output; does not mutate S */
    const S = E.seed(), before = JSON.stringify(S), a = E.finance(S), c = E.finance(S, E.plan(S));
    P.t(JSON.stringify(a.kpis) === JSON.stringify(c.kpis) && JSON.stringify(S) === before && a.series.total.length === a.T + 1, 'finance(S) equals finance(S, plan(S)), is repeatable and does not mutate the state', 1.5);
    return P;
  });

  /* ================================================================ F2 verdict + advice */
  await fcheck('F2', 'Verdict logic and advice', 16, 'node: constructed states for yes / tight (5 causes) / no; fix amounts; apply the fix; monotonicity; stretch', async () => {
    const P = new Parts(); const run = (p, houses, g) => { const S = mkF(houses || [], p, g), pl = E.plan(S); return { S, pl, f: E.finance(S, pl) }; };
    const salary = (net) => job({ id: 'a', gross: net * 12 / 0.8, tax: 20 });
    const yes = run({ cash: 100000, living: 3000, emergencyMonths: 6, jobs: [salary(8000)] });
    P.t(yes.f.status === 'yes' && /^Yes/.test(yes.f.headline) && yes.f.reasons.length > 0 && yes.f.reasons.every((x) => x.sev === 'ok'), "comfortable state is 'yes' with only ok reasons and a Yes headline", 1.5, yes.f.status + ' ' + yes.f.headline);
    const cases = [
      ['reserve gap', { cash: 5000, living: 3000, emergencyMonths: 6, jobs: [salary(8000)] }, (f) => f.kpis.reserveGap > 0.5 && f.kpis.net0 > 0 && f.kpis.minRunway >= 3],
      ['negative monthly net', { cash: 1e6, living: 3000, emergencyMonths: 1, jobs: [salary(2000)] }, (f) => f.kpis.net0 < 0 && f.kpis.reserveGap <= 0.5],
      ['DTI over the limit', { cash: 1e6, living: 1000, jobs: [salary(5000)] }, (f, pl) => pl.worst.dti > 43, { otherDebt: 5000, p1: 0, p2: 0 }],
      ['over 70 hours', { cash: 1e6, living: 1000, jobs: [job({ gross: 96000, tax: 20, hours: 40 }), job({ gross: 96000, tax: 20, hours: 40 })] }, (f) => f.kpis.peakHours > 70],
      ['runway under 3 months', { cash: 6000, living: 3000, emergencyMonths: 0, jobs: [salary(3500)] }, (f) => f.kpis.minRunway < 3 && f.kpis.net0 > 0],
    ];
    cases.forEach(([n, p, pre, g]) => { const r = run(p, [], g); const sevOk = r.f.reasons.some((x) => x.sev === 'warn') && !r.f.reasons.some((x) => x.sev === 'bad');
      P.t(r.f.status === 'tight' && pre(r.f, r.pl) && sevOk && /^Tight/.test(r.f.headline) && r.f.fixes.length > 0, `'tight' for ${n} (warn reason, no bad, a fix is offered)`, 1.2, r.f.status + ' net0 ' + Math.round(r.f.kpis.net0) + ' gap ' + Math.round(r.f.kpis.reserveGap) + ' run ' + r.f.kpis.minRunway + ' ' + r.f.headline); });
    /* 'no' */
    const no1 = run({ cash: 0, living: 3000, jobs: [] }), no2 = run({ cash: 20000, living: 1000, jobs: [salary(5000)], planned: [{ id: 'x', name: 'house', amount: 60000, month: 6 }] });
    const firstNeg = (o) => o.f.series.total.findIndex((x) => x < 0);
    P.t(no1.f.status === 'no' && no1.f.kpis.firstShortMonth === 0 && firstNeg(no1) === 0 && /month 0/.test(no1.f.headline) && no1.f.reasons.some((x) => x.sev === 'bad'), "'no' headline names month 0 when you start with no cash and no pay", 1, no1.f.headline);
    P.t(no2.f.status === 'no' && no2.f.kpis.firstShortMonth === firstNeg(no2) && no2.f.kpis.firstShortMonth > 0 && new RegExp('month ' + no2.f.kpis.firstShortMonth + '\\b').test(no2.f.headline), "'no' headline names the first month total goes negative (" + firstNeg(no2) + ')', 1.5, no2.f.headline + ' / ' + no2.f.kpis.firstShortMonth);
    P.t(closeAbs(no2.f.kpis.shortAmount, -Math.min(...no2.f.series.total), 0.01) && closeAbs(no2.f.kpis.minLiquid, Math.min(...no2.f.series.total), 0.01) && no2.f.series.total[no2.f.kpis.minLiquidMonth] === Math.min(...no2.f.series.total), 'kpis.shortAmount = -min(total); minLiquidMonth points at the minimum', 1);
    /* fix text amounts equal kpis */
    const sh = money0(no2.f.kpis.shortAmount), gp = (r) => money0(r.f.kpis.reserveGap), resR = run(cases[0][1]);
    P.t(no2.f.fixes.some((x) => x.includes(sh) && new RegExp('before month ' + no2.f.kpis.firstShortMonth + '\\b').test(x)) && no2.f.reasons.some((x) => x.text.includes(sh)), "'no' fix says 'Line up at least " + sh + "... before month " + no2.f.kpis.firstShortMonth + "' (amount equals kpis.shortAmount)", 1.5, no2.f.fixes.join(' | '));
    P.t(resR.f.fixes.some((x) => x.includes(gp(resR))) && resR.f.reasons.some((x) => x.text.includes(gp(resR))), 'reserve-gap fix and reason carry kpis.reserveGap (' + gp(resR) + ')', 1, resR.f.fixes.join(' | '));
    const negN = run(cases[1][1]); P.t(negN.f.fixes.some((x) => x.includes(money0(-negN.f.kpis.net0))) && negN.f.reasons.some((x) => x.text.includes(money0(-negN.f.kpis.net0))), 'negative-net fix and reason carry the monthly gap (' + money0(-negN.f.kpis.net0) + ')', 0.8, negN.f.fixes.join(' | '));
    /* applying the suggested capital at the first short month rescues the plan (random + stretch) */
    let tried = 0, rescued = 0; const bad = [];
    const noStates = [E.seedStretch()]; for (let n = 0; n < 200 && noStates.length < 25; n++) { const S = randState(); if (E.finance(S).status === 'no') noStates.push(S); }
    noStates.forEach((S0, i) => { const S = clone(S0); S.g.autoPay = false; /* the advice is about cash you keep: with automatic loan payments on, cash above the cushion is paid to loans, which the amount cannot predict */ const f = E.finance(S); if (f.status !== 'no') return; tried++; const S2 = clone(S); S2.p.capital.push({ id: 'fixcap', name: 'fix', amount: f.kpis.shortAmount, month: f.kpis.firstShortMonth }); S2.p = E.normalizePersonal(S2.p); const f2 = E.finance(S2); if (f2.status !== 'no' && f2.kpis.minLiquid >= -0.5) rescued++; else bad.push(`#${i} still ${f2.status} min ${Math.round(f2.kpis.minLiquid)}`); });
    P.t(tried >= 8 && rescued === tried, `adding kpis.shortAmount as outside capital in kpis.firstShortMonth makes status != 'no' (${rescued}/${tried} no-states incl. stretch)`, 2, bad.slice(0, 3).join('; '));
    /* monotone */
    let mono = 0, monN = 0; const monBad = [];
    for (let n = 0; n < 50; n++) { const S = randState(); const r0 = RANK[E.finance(S).status];
      const A = clone(S); A.p.cash = A.p.cash * 2 + 20000; A.p = E.normalizePersonal(A.p); const B = clone(S); B.p.jobs.forEach((j) => { j.gross *= 1.5; }); B.p = E.normalizePersonal(B.p); const C = clone(S); C.p.living = C.p.living * 1.5 + 500; C.p = E.normalizePersonal(C.p); const D = clone(S); D.g.otherDebt += 800;
      const D2 = clone(S); D2.p.capital.push({ id: 'z', name: 'z', amount: 50000, month: 0 }); D2.p = E.normalizePersonal(D2.p);
      const ra = RANK[E.finance(A).status], rb = RANK[E.finance(B).status], rc = RANK[E.finance(C).status], rd = RANK[E.finance(D).status], rd2 = RANK[E.finance(D2).status];
      monN++; if (ra >= r0 && rb >= r0 && rc <= r0 && rd <= r0 && rd2 >= r0) mono++; else monBad.push(`#${n} base ${r0} cash+ ${ra} pay+ ${rb} living+ ${rc} debt+ ${rd} cap+ ${rd2}`); }
    P.t(mono === monN, `status is monotone on ${monN} random states: more cash / pay / capital never worsen it, higher living costs / debts never improve it`, 2, monBad.slice(0, 3).join('; '));
    const st = E.seedStretch(); st.houses = st.houses.filter((h) => h.status !== 'owned'); st.houses[0].buyIn = 1; st.p.jobs = []; const sf = E.finance(st); P.t(sf.status === 'no' && sf.kpis.shortAmount > 0 && sf.kpis.firstShortMonth >= 0, "the stretch scenario with nothing owned and no job income (the first asset waits for savings that living costs eat) is 'no'", 1, sf.status);
    /* verdict agrees with the independent verdict on random states (skipping knife-edge ones) */
    let agree = 0, cmp = 0, kp = 0; const dis = [];
    for (let n = 0; n < 70; n++) { const S = randState(), pl = E.plan(S), f = E.finance(S, pl), o = sim(S, pl), v = verdictOf(S, pl, o); if (v.border) continue; cmp++;
      if (f.status === v.status) agree++; else dis.push(`#${n} engine ${f.status} indep ${v.status} min ${Math.round(v.minT)} gap ${Math.round(v.gap)} net0 ${Math.round(v.net0)} dti ${pl.worst.dti.toFixed(1)}/${S.g.dti} h ${v.peakH} run ${v.minRun.toFixed(2)}`);
      const kk = f.kpis; if (closeAbs(kk.shortAmount, v.short, 1) && closeAbs(kk.reserveGap, v.gap, 1) && closeAbs(kk.peakHours, v.peakH, 1e-6) && closeAbs(kk.managerCostMax, v.gmMax, 1) && closeAbs(kk.minLiquid, v.minT, 1) && (kk.firstShortMonth === v.firstShort) && (kk.minRunway === v.minRun || closeAbs(kk.minRunway, v.minRun, 1e-6))) kp++; else dis.push(`#${n} kpi mismatch short ${kk.shortAmount}/${v.short} gap ${kk.reserveGap}/${v.gap} first ${kk.firstShortMonth}/${v.firstShort}`); }
    P.t(cmp >= 40 && agree === cmp, `status equals an independent implementation of the stated rules (${agree}/${cmp} random non-borderline states)`, 1.5, dis.slice(0, 3).join(' ; '));
    P.t(cmp >= 40 && kp === cmp, `kpis (shortAmount, reserveGap, peakHours, managerCostMax, minLiquid, firstShortMonth, minRunway) match independent values (${kp}/${cmp})`, 1, dis.slice(0, 2).join(' ; '));
    return P;
  });

  /* ================================================================ F4 factor coverage (node) */
  await fcheck('F4', 'Factor coverage: every input moves the answer in the right direction', 14, 'node: perturb one factor at a time on the sample', async () => {
    const P = new Parts(); const w = 14 / 24;
    const run = (fn) => { const S = E.seed(); fn(S, S.p, S.g); S.p = E.normalizePersonal(S.p); const pl = E.plan(S); const f = E.finance(S, pl); return { S, pl, f, T: (t) => f.series.total[Math.min(t, f.T)] }; };
    const base = run(() => {}), tot = (r, t) => r.T(t), last = (r) => r.f.series.total[r.f.T];
    const dirT = (label, fn, t, sign, wgt, extra) => { const r = run(fn), a = tot(r, t), b = tot(base, t), ok = sign > 0 ? a > b + 1 : a < b - 1; P.t(ok && (!extra || extra(r)), label, wgt == null ? 1 : wgt, `total[${t}] ${Math.round(b)} -> ${Math.round(a)}`); };
    dirT('salary +50% raises cash (month 60)', (S, p) => { p.jobs[0].gross *= 1.5; }, 60, 1, 1, (r) => r.f.kpis.takeHome > base.f.kpis.takeHome);
    dirT('yearly raise 3% -> 8% raises cash later but not month 0..11', (S, p) => { p.jobs[0].raise = 8; }, 120, 1, 1, (r) => closeAbs(r.f.series.total[11], base.f.series.total[11], 0.01));
    dirT('tax on pay 24% -> 40% lowers cash', (S, p) => { p.jobs[0].tax = 40; }, 60, -1, 1, (r) => r.f.kpis.takeHome < base.f.kpis.takeHome);
    dirT('job ends at month 12 lowers later cash', (S, p) => { p.jobs[0].end = 12; }, 100, -1, 1, (r) => r.f.series.income[12] === 0 && r.f.series.income[11] > 0);
    dirT('job start delayed to month 24 lowers early cash', (S, p) => { p.jobs[0].start = 24; }, 12, -1, 1, (r) => r.f.series.income[0] === 0 && r.f.series.income[24] > 0);
    dirT('living costs +$1,500 lowers cash', (S, p) => { p.living += 1500; }, 60, -1, 1, (r) => r.f.kpis.net0 < base.f.kpis.net0);
    dirT('cost inflation 3% -> 8% lowers later cash', (S, p) => { p.inflation = 8; }, 180, -1, 1, (r) => r.f.series.living[120] > base.f.series.living[120]);
    dirT('other monthly debts +$500 lowers cash (shared g.otherDebt)', (S, p, g) => { g.otherDebt += 500; }, 60, -1, 1, (r) => closeAbs(r.f.kpis.debts, base.f.kpis.debts + 500, 0.01));
    dirT('portfolio income: maple rent +$1,000 raises cash flow and cash', (S) => { S.houses.find((h) => h.id === 'maple').rent += 1000; }, 24, 1, 1, (r) => r.f.kpis.portfolioAfterTax > base.f.kpis.portfolioAfterTax);
    dirT('portfolio tax 20% -> 50% lowers cash', (S, p) => { p.portfolioTaxPct = 50; }, 60, -1, 1, (r) => r.f.kpis.portfolioAfterTax < base.f.kpis.portfolioAfterTax && r.f.kpis.portfolioAfterTax > 0);
    { const r = run((S) => { S.houses.find((h) => h.id === 'maple').extra += 900; }); P.t(r.f.kpis.extra > base.f.kpis.extra + 800 && r.f.kpis.net0 < base.f.kpis.net0 - 800, 'extra payments +$900 on maple show in kpis.extra and lower left-over cash', 1, base.f.kpis.extra + ' -> ' + r.f.kpis.extra); }
    dirT('planned expense $30,000 at month 9 lowers cash', (S, p) => { p.planned.push({ id: 'e', name: 'x', amount: 30000, month: 9 }); }, 60, -1, 1);
    dirT('outside capital $200,000 at month 10 raises cash', (S, p) => { p.capital.push({ id: 'c', name: 'x', amount: 200000, month: 10 }); }, 60, 1, 1, (r) => r.f.kpis.capitalTotal === 200000 && last(r) > last(base));
    { const off = (S, p, g) => { g.autoPay = false; }, b0 = run(off), r0 = run((S, p, g) => { g.autoPay = false; p.cash += 20000; }); P.t(r0.f.kpis.minLiquid >= b0.f.kpis.minLiquid + 19999 && last(r0) > last(b0) + 19999, 'savings +$20,000 raises the lowest cash by at least $20,000 (cash kept: automatic loan payments off)', 1, b0.f.kpis.minLiquid + ' -> ' + r0.f.kpis.minLiquid);
      const r = run((S, p) => { p.cash += 20000; }); P.t(r.f.kpis.minLiquid >= base.f.kpis.minLiquid && E.plan(r.S).horizon.nw >= E.plan(base.S).horizon.nw - 1, 'with automatic loan payments on, more savings never lowers the lowest cash, and the surplus above the cushion goes to the loans (net worth does not fall)', 1, base.f.kpis.minLiquid + ' -> ' + r.f.kpis.minLiquid); }
    dirT('cash APY 3% -> 8% raises cash', (S, p) => { p.cashApy = 8; }, 120, 1, 1);
    { const a = run((S, p) => { p.salesTaxPct = 0; }), b = run((S, p) => { p.salesTaxPct = 50; }); P.t(last(a) > last(base) && last(base) > last(b) && b.f.series.saleTax.some((x) => x > 0) && a.f.series.saleTax.every((x) => x === 0), 'sale tax rate 0 / 25 / 50% orders final cash high / mid / low', 1, [last(a), last(base), last(b)].map(Math.round).join(' > ')); }
    { const lean = (m) => (S, p) => { p.living = 4500; p.cash = 5000; p.emergencyMonths = m; }; const a = run(lean(12)), z = run(lean(0)), b6 = run(lean(6)); P.t(a.f.kpis.reserveGap > b6.f.kpis.reserveGap && b6.f.kpis.reserveGap > 0 && z.f.kpis.reserveGap <= 0 + 0.001 + 0 && closeAbs(a.f.series.reserve[0], 12 * (a.f.series.living[0] + a.f.series.debts[0]), 0.01), 'emergency months 0 / 6 / 12 raise the reserve target and gap (reserve = months x (living + debts))', 1, [z.f.kpis.reserveGap, b6.f.kpis.reserveGap, a.f.kpis.reserveGap].map(Math.round).join(',')); }
    { const none = run((S, p) => { p.operating = 0; }), two = run((S, p) => { p.operating = 2; }); P.t(none.f.kpis.managerCostMax > base.f.kpis.managerCostMax && base.f.kpis.managerCostMax > two.f.kpis.managerCostMax && last(none) < last(base) && last(base) < last(two), 'operating 0 / 1 / 2 businesses yourself: manager cost falls and cash rises', 1, [none, base, two].map((r) => Math.round(r.f.kpis.managerCostMax)).join(' > ')); }
    { const g1 = run((S, p) => { p.gmMonthly = 16000; }); P.t(g1.f.kpis.managerCostMax > base.f.kpis.managerCostMax * 1.9 && last(g1) < last(base), 'manager pay $8,000 -> $16,000 doubles manager cost and lowers cash', 1, Math.round(base.f.kpis.managerCostMax) + ' -> ' + Math.round(g1.f.kpis.managerCostMax)); }
    { const h = run((S, p) => { p.jobs[0].hours = 60; p.bizHours = 30; p.operating = 2; }), h0 = run((S, p) => { p.jobs[0].hours = 20; }); P.t(h.f.kpis.peakHours > base.f.kpis.peakHours && base.f.kpis.peakHours > h0.f.kpis.peakHours && h.f.status !== 'yes' && h.f.reasons.some((x) => /hours/.test(x.text) && x.sev === 'warn') && h.f.kpis.peakHours > 70, 'hours: job hours / business hours / businesses run raise peak hours; over 70 triggers a warning', 1, [h0, base, h].map((r) => r.f.kpis.peakHours).join(' < ')); }
    { const mk = (jobs) => { const S = E.seed(); S.g.p1 = 0; S.g.p2 = 0; S.p.jobs = jobs; S.p = E.normalizePersonal(S.p); return E.plan(S).worst.dti; };
      const noJob = mk([]), withJob = mk([{ id: 'j', name: 'j', gross: 96000, raise: 0, tax: 24, hours: 40, start: 0, end: null }]), later = mk([{ id: 'j', name: 'j', gross: 96000, raise: 0, tax: 24, hours: 40, start: 0, end: 30 }]);
      P.t(withJob < noJob && withJob > 0 && noJob / withJob > 1.05 && later >= withJob - 1e-9, 'your own gross pay counts as qualifying income: worst DTI ' + noJob.toFixed(1) + '% without a job -> ' + withJob.toFixed(1) + '% with one (and ends with the job)', 1.5, noJob + ' / ' + withJob + ' / ' + later); }
    { const loanRun = (lid) => { const S = E.seed(), h = S.houses.find((x) => x.id === 'harbor'); E.applyLoan(h, lid); const pl = E.plan(S); return { S, pl, f: E.finance(S, pl) }; };
      const conv = loanRun('comm25'), low = loanRun('sba504'), seedB = base;
      const hc = conv.pl.trust.harbor, hl = low.pl.trust.harbor;
      P.t(hl.need < hc.need - 1000 && low.pl.purchase.harbor <= conv.pl.purchase.harbor && low.pl.series.debt[100] !== conv.pl.series.debt[100] && !closeAbs(low.f.series.net[100], conv.f.series.net[100], 0.5), 'loan change flows into the plan and personal cash: harbor on a 10%-down loan vs 25%-down lowers the cash the trust must find, is bought no later, and changes later debt and monthly net', 0.75, `trust need ${Math.round(hc.need)} -> ${Math.round(hl.need)}; bought ${conv.pl.purchase.harbor} -> ${low.pl.purchase.harbor}`);
      const k = (() => { const mkK = (lid) => { const S = mkF([E.newAsset('house', lid, { id: 'k', status: 'planned', buyIn: 6, price: 200000, rent: 2500, tax: 150, ins: 80, growth: 3, capex: 40000, capexMonths: 6, arv: 280000 })], { cash: 80000, living: 3000, jobs: [job({ gross: 96000, tax: 24 })] }); return { S, pl: E.plan(S), f: E.finance(S) }; }; return { k203: mkK('k203'), conv: mkK('conv30') }; })();
      P.t(k.k203.f.kpis.totalOutside < k.conv.f.kpis.totalOutside - 5000 && k.k203.f.series.total[7] > k.conv.f.series.total[7] + 5000 && k.k203.S.houses[0].finCapex === true, 'FHA 203(k) (3.5% down on price + rehab, rehab financed) needs much less personal cash at closing than a conventional loan on the same house', 0.75, `outside ${Math.round(k.conv.f.kpis.totalOutside)} (conv) vs ${Math.round(k.k203.f.kpis.totalOutside)} (203k)`); }
    return P;
  });

  /* ================================================================ UI (F3 + F5) */
  const ctx = await mkCtx(); const page = await mkPage(ctx, 'fin'); const errStart = collect.errors.length;
  const SEL = (id) => `[data-testid=${id}]`;
  const appState = (pg) => pg.evaluate(() => JSON.parse(JSON.stringify(window.__app.state)));
  const rd = (pg) => pg.evaluate(() => { const t = (s) => { const e = document.querySelector(s); return e ? e.textContent.trim() : null; };
    return { chip: t('[data-testid=verdict-chip]'), head: t('[data-testid=verdict-headline]'), rows: [...document.querySelectorAll('[data-testid=monthly-picture] tr')].map((tr) => [...tr.children].map((c) => c.textContent.trim())), low: t('[data-testid=lowest-cash]'), fixes: [...document.querySelectorAll('[data-testid=fixes] li')].map((x) => x.textContent.trim()), body: document.getElementById('app').innerText }; });
  const numTol = (a, b) => Math.abs(a - b) <= 1.01 + Math.abs(b) * 0.006;
  function matchUI(P, d, S, label, w) {
    const f = E.finance(S), k = f.kpis; const want = [k.takeHome, k.portfolioAfterTax, -k.managerCost0, -k.extra, -k.living, -k.debts, k.net0];
    P.t(d.chip === VL[f.status] && d.head === f.headline, label + ': verdict chip + headline equal the engine (' + VL[f.status] + ')', w, `${d.chip} / ${d.head} vs ${VL[f.status]} / ${f.headline}`);
    const got = d.rows.map((r) => money(r[1])); P.t(d.rows.length === 7 && want.every((x, i) => numTol(got[i], x)), label + ': monthly picture rows equal the engine', w, got.map(Math.round).join(',') + ' vs ' + want.map(Math.round).join(','));
    const lowM = /month (\d+)/.exec(d.low || ''); P.t(d.low && numTol(money(d.low), k.minLiquid) && lowM && +lowM[1] === k.minLiquidMonth, label + ': lowest cash + month equal the engine', w, d.low + ' vs ' + Math.round(k.minLiquid) + ' m' + k.minLiquidMonth);
    const fx = f.fixes.join('|'); P.t(d.fixes.join('|') === fx, label + ': fix list equals the engine', w / 2, d.fixes.join('|').slice(0, 120));
  }
  const chipMain = async (pg) => { await goMain(pg); return pg.evaluate(() => (document.querySelector('[data-testid=afford-chip]') || {}).textContent || null); };
  const sampleS = () => E.seedPlan(); /* the app's default portfolio */
  const applyS = (S, fn) => { fn(S, S.p, S.g); S.p = E.normalizePersonal(S.p); return S; };
  const fin = async (sel, v) => { await setVal(page, sel, v); };

  await fcheck('F3', 'UI features', 24, 'Playwright 390px: finances link, chip, jobs/expenses/capital editing, tooltip, persistence, backup, v8 migration, shared field, empty states', async () => {
    const P = new Parts(); const w = 1; await reset(page); const S = sampleS();
    /* link + chip */
    P.t((await page.locator(SEL('finances-link')).count()) === 1 && (await page.locator(SEL('finances-link')).first().isVisible()), 'main page has a visible Finances button (data-testid=finances-link)', 0.8);
    let chip = await chipMain(page), want = VL[E.finance(S).status];
    P.t(chip === want && (await page.locator(SEL('afford-line')).count()) === 1, `afford chip on main equals the engine status (${want})`, 1, chip);
    await page.click(SEL('afford-chip')); await page.waitForTimeout(100); P.t((await page.evaluate(() => location.hash)) === '#finances' && (await page.locator(SEL('verdict-card')).count()) === 1, 'tapping the afford chip opens #finances with the verdict card', 0.8);
    await goMain(page); await page.click(SEL('finances-link')); await page.waitForTimeout(100); P.t((await page.evaluate(() => location.hash)) === '#finances' && (await page.locator(SEL('monthly-picture')).count()) === 1 && (await page.locator(SEL('cash-card')).count()) === 1, 'Finances button opens the page with monthly picture and cash card', 0.6);
    let d = await rd(page); matchUI(P, d, sampleS(), 'sample', 0.7);
    /* every documented control exists */
    const need = ['j.job1.name', 'j.job1.gross', 'j.job1.raise', 'j.job1.tax', 'j.job1.hours', 'j.job1.start', 'j.job1.end', 'p.cash', 'p.cashApy', 'p.emergencyMonths', 'p.living', 'p.inflation', 'g.otherDebt', 'p.portfolioTaxPct', 'p.salesTaxPct', 'p.operating', 'p.bizHours', 'p.gmMonthly'];
    await X.expandAll(page); const have = await page.evaluate((n) => n.filter((x) => document.querySelector(`[data-p="${x}"]`)), need); P.t(have.length === need.length && (await page.locator(SEL('add-job')).count()) === 1 && (await page.locator(SEL('add-planned')).count()) === 1 && (await page.locator(SEL('add-capital')).count()) === 1, 'all job / cash / tax / manager fields and the three add buttons exist', 0.8, need.filter((x) => !have.includes(x)).join(','));
    /* job edits (expected values computed on an independent copy of the sample) */
    const Sx = sampleS(); const J = Sx.p.jobs[0];
    const jedit = async (field, val, fn, label) => { await fin(`[data-p="j.job1.${field}"]`, val); applyS(Sx, fn); matchUI(P, await rd(page), Sx, label, 0.35); };
    await jedit('gross', '150000', (s, p) => { p.jobs[0].gross = 150000; }, 'gross 150000');
    await jedit('raise', '6', (s, p) => { p.jobs[0].raise = 6; }, 'raise 6');
    await jedit('tax', '30', (s, p) => { p.jobs[0].tax = 30; }, 'tax 30');
    await jedit('hours', '55', (s, p) => { p.jobs[0].hours = 55; }, 'hours 55');
    await jedit('start', '3', (s, p) => { p.jobs[0].start = 3; }, 'start 3');
    await jedit('end', '40', (s, p) => { p.jobs[0].end = 40; }, 'end 40');
    await jedit('end', '', (s, p) => { p.jobs[0].end = null; }, 'blank end = ongoing');
    const stj = (await appState(page)).p.jobs[0]; P.t(stj.end === null && stj.gross === 150000 && stj.raise === 6 && stj.tax === 30 && stj.hours === 55 && stj.start === 3, 'stored job holds every edit; blank end is stored as null (ongoing)', 0.8, JSON.stringify(stj));
    await fin('[data-p="j.job1.name"]', 'Night shift'); P.t((await appState(page)).p.jobs[0].name === 'Night shift' && /Night shift/.test(await page.evaluate(() => document.getElementById('app').innerHTML)), 'job name edit is stored and shown', 0.4);
    /* add job / remove with confirm and cancel */
    await page.click(SEL('add-job')); await page.waitForTimeout(80); const nj = await page.locator(SEL('job-card')).count(); const jobs1 = (await appState(page)).p.jobs; P.t(nj === 2 && jobs1.length === 2, 'Add a job adds a second job card and stores it', 0.7, nj);
    const newId = jobs1.find((j) => j.id !== 'job1').id; const S2 = clone(Sx); S2.p.jobs.push(jobs1.find((j) => j.id === newId)); S2.p = E.normalizePersonal(S2.p); matchUI(P, await rd(page), S2, 'after adding a job', 0.3);
    await page.click(`[data-dp="job:${newId}"]`); await page.waitForTimeout(60); const dlg0 = page.__d.length; const conf = await page.locator('.confirm').count(); await page.click('.confirm [data-ask-cancel]'); await page.waitForTimeout(60);
    P.t(conf === 1 && (await page.locator(SEL('job-card')).count()) === 2 && (await appState(page)).p.jobs.length === 2, 'Remove job asks in-page confirmation; Cancel keeps the job', 0.8, 'confirm boxes ' + conf);
    await page.click(`[data-dp="job:${newId}"]`); await page.click('[data-dp-yes]'); await page.waitForTimeout(80);
    P.t((await page.locator(SEL('job-card')).count()) === 1 && (await appState(page)).p.jobs.length === 1 && page.__d.length === dlg0, 'Yes removes the job; no browser dialog was used', 0.8, 'dialogs ' + (page.__d.length - dlg0));
    matchUI(P, await rd(page), Sx, 'after removing the added job', 0.3);
    /* cash + expenses fields */
    const Sy = Sx; const fields = [['p.cash', '12000', (s, p) => { p.cash = 12000; }], ['p.living', '5200', (s, p) => { p.living = 5200; }], ['p.cashApy', '4.5', (s, p) => { p.cashApy = 4.5; }], ['p.inflation', '5', (s, p) => { p.inflation = 5; }], ['p.emergencyMonths', '9', (s, p) => { p.emergencyMonths = 9; }], ['g.otherDebt', '900', (s, p, g) => { g.otherDebt = 900; }], ['p.portfolioTaxPct', '33', (s, p) => { p.portfolioTaxPct = 33; }], ['p.salesTaxPct', '30', (s, p) => { p.salesTaxPct = 30; }], ['p.operating', '2', (s, p) => { p.operating = 2; }], ['p.bizHours', '15', (s, p) => { p.bizHours = 15; }], ['p.gmMonthly', '6500', (s, p) => { p.gmMonthly = 6500; }]];
    const Pf = new Parts(); for (const [sel, v, fn] of fields) { await fin(`[data-p="${sel}"]`, v); applyS(Sy, fn); const dd = await rd(page); const f = E.finance(Sy), k = f.kpis; const got = dd.rows.map((r) => money(r[1]));
      Pf.t(dd.chip === VL[f.status] && numTol(got[6], k.net0) && numTol(got[4], -k.living) && numTol(got[2], -k.managerCost0) && numTol(money(dd.low), k.minLiquid), sel + '=' + v, 1, `${dd.chip}/${VL[f.status]} net ${got[6]}/${Math.round(k.net0)} low ${dd.low}/${Math.round(k.minLiquid)}`); }
    P.t(Pf.ratio === 1, 'editing each of the 11 cash / expense / tax / manager fields updates verdict, left-over and lowest cash like the engine', 2.2, Pf.detail);
    /* planned + capital */
    await page.click(SEL('add-planned')); await page.waitForTimeout(60); let st = await appState(page); const pid = st.p.planned[0] && st.p.planned[0].id;
    await fin(`[data-p="o.${pid}.amount"]`, '25000'); await fin(`[data-p="o.${pid}.month"]`, '8'); await fin(`[data-p="o.${pid}.name"]`, 'Tuition'); st = await appState(page);
    applyS(Sy, (s, p) => { p.planned = [{ id: pid, name: 'Tuition', amount: 25000, month: 8 }]; }); let dd = await rd(page); let rows = await page.locator(SEL('pl-row')).count();
    P.t(rows === 1 && st.p.planned.length === 1 && st.p.planned[0].amount === 25000 && st.p.planned[0].month === 8 && st.p.planned[0].name === 'Tuition', 'add + edit a planned expense (name, amount, month) is stored and shown', 1, JSON.stringify(st.p.planned));
    matchUI(P, dd, Sy, 'with planned expense', 0.5);
    await page.click(SEL('add-capital')); await page.waitForTimeout(60); st = await appState(page); const cid = st.p.capital[0] && st.p.capital[0].id;
    await fin(`[data-p="c.${cid}.amount"]`, '300000'); await fin(`[data-p="c.${cid}.month"]`, '14'); await fin(`[data-p="c.${cid}.name"]`, 'Partner'); st = await appState(page);
    applyS(Sy, (s, p) => { p.capital = [{ id: cid, name: 'Partner', amount: 300000, month: 14 }]; }); dd = await rd(page); rows = await page.locator(SEL('cap-row')).count();
    P.t(rows === 1 && st.p.capital[0].amount === 300000 && st.p.capital[0].month === 14 && st.p.capital[0].name === 'Partner', 'add + edit an outside capital line is stored and shown', 1, JSON.stringify(st.p.capital));
    matchUI(P, dd, Sy, 'with capital', 0.5);
    await page.click(`[data-dp="pl:${pid}"]`); await page.waitForTimeout(50); const c1 = await page.locator('.confirm').count(); await page.click('.confirm [data-ask-cancel]'); await page.waitForTimeout(50); const kept = await page.locator(SEL('pl-row')).count();
    await page.click(`[data-dp="pl:${pid}"]`); await page.click('[data-dp-yes]'); await page.waitForTimeout(60); await page.click(`[data-dp="cap:${cid}"]`); await page.click('[data-dp-yes]'); await page.waitForTimeout(60);
    applyS(Sy, (s, p) => { p.planned = []; p.capital = []; }); st = await appState(page);
    P.t(c1 === 1 && kept === 1 && (await page.locator(SEL('pl-row')).count()) === 0 && (await page.locator(SEL('cap-row')).count()) === 0 && !st.p.planned.length && !st.p.capital.length, 'remove planned expense and capital line: confirm, cancel keeps, yes removes', 1);
    matchUI(P, await rd(page), Sy, 'after removing planned + capital', 0.4);
    /* chart tooltip */
    await page.evaluate(() => document.querySelector('[data-testid=cash-chart]').scrollIntoView({ block: 'center' })); const bb = await page.locator(SEL('cash-chart')).boundingBox();
    await page.mouse.move(bb.x + bb.width * 0.5, bb.y + bb.height * 0.5); await page.waitForTimeout(80);
    const tip = await page.evaluate(() => { const t = document.getElementById('nwtip'), s = document.querySelector('[data-testid=cash-chart]'); return { hidden: t ? t.hidden : null, txt: t ? t.textContent : '', big: t && t.querySelector('b') ? t.querySelector('b').textContent : '', nw: s.dataset.nw.split(',').map(Number), line: (s.querySelector('#nwx') || {}).getAttribute && s.querySelector('#nwx').getAttribute('visibility') }; });
    const tm = /in (\d+) mo/.exec(tip.txt) || (/\((\d+)y (\d+)m\)/.test(tip.txt) ? [0, 0] : null); let tt = null; const m2 = /\((\d+)y (\d+)m\)/.exec(tip.txt), m1 = /in (\d+) mo/.exec(tip.txt); if (m2) tt = +m2[1] * 12 + +m2[2]; else if (m1) tt = +m1[1]; else if (/today/.test(tip.txt)) tt = 0;
    const fT = E.finance(Sy).series.total;
    P.t(tip.hidden === false && tt !== null && tip.line === 'visible' && numTol(money(tip.big), fT[tt]) && numTol(tip.nw[tt], fT[tt]), 'hovering the cash chart shows the tooltip with the cash balance of that month (equal to the engine)', 1.2, tip.txt + ' t=' + tt + ' engine ' + Math.round(fT[tt] || 0));
    await page.mouse.move(5, 5); await page.waitForTimeout(60);
    /* persistence */
    await page.reload(); await page.waitForSelector('#app > *'); await goHash(page, '#finances'); await page.waitForSelector(SEL('verdict-card'));
    matchUI(P, await rd(page), Sy, 'after reload', 0.5); const vals = await page.evaluate(() => ['p.cash', 'p.living', 'j.job1.gross', 'g.otherDebt', 'p.gmMonthly'].map((k) => document.querySelector(`[data-p="${k}"]`).value.replace(/,/g, '')));
    P.t(vals.join(',') === '12000,5200,150000,900,6500', 'edited values persist across reload (localStorage key rep-v4)', 0.8, vals.join(','));
    /* shared g.otherDebt */
    await goHash(page, '#assumptions'); const ad = await page.inputValue('[data-p="g.otherDebt"]'); await setVal(page, '[data-p="g.otherDebt"]', '1250'); await goHash(page, '#finances'); const fd = await page.inputValue('[data-p="g.otherDebt"]'); applyS(Sy, (s, p, g) => { g.otherDebt = 1250; }); const ddd = await rd(page);
    P.t(ad.replace(/,/g, '') === '900' && fd.replace(/,/g, '') === '1250' && numTol(money(ddd.rows[5][1]), -1250), 'Other monthly debts is the same field on Assumptions and Finances (edit on one shows on the other and in the monthly picture)', 1, `${ad} -> ${fd}`);
    await fin('[data-p="g.otherDebt"]', '700'); await goHash(page, '#assumptions'); P.t((await page.inputValue('[data-p="g.otherDebt"]')).replace(/,/g, '') === '700', 'and the other direction (Finances -> Assumptions)', 0.5);
    /* main afford line updates after finance edits */
    await goHash(page, '#finances'); await fin('[data-p="p.cash"]', '0'); await fin('[data-p="p.living"]', '30000'); const S3 = applyS(clone(Sy), (s, p, g) => { p.cash = 0; p.living = 30000; g.otherDebt = 700; }); const c3 = await chipMain(page);
    P.t(c3 === VL[E.finance(S3).status] && c3 !== chip, `main afford chip follows finance edits (was ${chip}, now ${c3}, engine ${VL[E.finance(S3).status]})`, 1);
    /* backup contains p and restores it */
    await reset(page); await goHash(page, '#finances'); await fin('[data-p="p.cash"]', '77777'); await fin('[data-p="j.job1.gross"]', '111111'); await goHash(page, '#assumptions'); await page.click('[data-testid=export]'); await page.waitForTimeout(60);
    const txt = await page.inputValue('[data-testid=backup-text]').catch(() => ''); let j = null; try { j = JSON.parse(txt); } catch (e) {}
    P.t(j && j.p && j.p.cash === 77777 && Array.isArray(j.p.jobs) && j.p.jobs[0].gross === 111111 && j.v === DATA_V, 'backup JSON includes the personal profile (cash 77777, job gross 111111)', 0.8, j && JSON.stringify(j.p).slice(0, 80));
    await goHash(page, '#finances'); await fin('[data-p="p.cash"]', '5'); await fin('[data-p="j.job1.gross"]', '1'); await goHash(page, '#assumptions'); await page.fill('#bkin', txt); await page.click('[data-restore-text]'); await page.waitForTimeout(60); await page.click('[data-import-yes]').catch(() => {}); await page.waitForTimeout(100);
    const sr = await appState(page); P.t(sr.p && sr.p.cash === 77777 && sr.p.jobs[0].gross === 111111, 'restoring the backup brings the personal profile back', 0.8, sr.p && sr.p.cash);
    /* old backup without p still restores (gets default profile) */
    const old = JSON.parse(txt); delete old.p; await goHash(page, '#assumptions'); await page.click('[data-testid=export]').catch(() => {}); await page.fill('#bkin', JSON.stringify(old)).catch(() => {}); await page.click('[data-restore-text]'); await page.waitForTimeout(60); await page.click('[data-import-yes]').catch(() => {}); await page.waitForTimeout(100);
    const so = await appState(page); P.t(so.p && so.p.cash === 45000 && so.houses.length === old.houses.length, 'a backup without a profile restores the assets and gets the default profile', 0.4, so.p && so.p.cash);
    /* v8 migration */
    const v8 = E.seed(); delete v8.p; v8.v = 8; v8.houses[0].addr = 'Kept From V8'; v8.houses[0].extra = 4321;
    await loadState(page, v8, '#finances'); const sm = await appState(page); const same = JSON.stringify(sm.houses.map((h) => h.id).sort()) === JSON.stringify(v8.houses.map((h) => h.id).sort()) && sm.houses.find((h) => h.id === v8.houses[0].id).addr === 'Kept From V8' && sm.houses.find((h) => h.id === v8.houses[0].id).extra === 4321; /* the list is sorted into buy order once on load */
    P.t(same && sm.v === DATA_V && sm.p && sm.p.cash === 45000 && sm.p.jobs.length === 1 && sm.p.jobs[0].gross === 96000, 'a saved v8 state (assets only) keeps its assets and gains the default profile at DATA_V', 1.2, `v=${sm.v} p=${sm.p && sm.p.cash} addr=${sm.houses[0].addr}`);
    matchUI(P, await rd(page), (() => { const S = clone(v8); S.v = DATA_V; S.p = E.samplePersonal(); return E.normalize(S); })(), 'migrated v8', 0.4);
    await loadState(page, Object.assign(clone(v8), { v: 7 }), '#finances'); P.t((await appState(page)).houses.length === E.seedPlan().houses.length && (await appState(page)).p.cash === 45000, 'an older (v7) save is replaced by the current sample with a profile', 0.3);
    /* empty states */
    const emp = E.seed(); emp.v = DATA_V; emp.p.jobs = []; emp.p.planned = []; emp.p.capital = [];
    await loadState(page, emp, '#finances'); const bd = []; for (const h of ['#finances', '#']) { await goHash(page, h); const t = await page.evaluate(() => document.getElementById('app').innerText + ' ' + [...document.querySelectorAll('#app input')].map((i) => i.value).join(' ')); if (BAD.test(t)) bd.push(h + ': ' + (BAD.exec(t) || [])[2]); }
    await goHash(page, '#finances'); const de = await rd(page); matchUI(P, de, (() => { const S = clone(emp); S.p = E.normalizePersonal(S.p); return S; })(), 'no jobs/planned/capital', 0.5);
    P.t(!bd.length && (await page.locator(SEL('job-card')).count()) === 0 && (await page.locator(SEL('pl-row')).count()) === 0 && (await page.locator(SEL('cap-row')).count()) === 0 && (await page.locator(SEL('add-job')).count()) === 1, 'empty states (no jobs, no planned expenses, no capital) render without NaN and keep the add buttons', 0.8, bd.join(';'));
    return P;
  });

  /* ================================================================ F5 robustness + accessibility */
  await fcheck('F5', 'Robustness and accessibility', 10, 'Playwright: edge inputs, names, tap targets, font size, overflow 320/390/430, chip contrast light+dark, typing, render storm, console errors', async () => {
    const P = new Parts(); await page.setViewportSize({ width: 390, height: 844 });
    const full = E.seed(); full.v = DATA_V; full.p.planned = [{ id: 'pa', name: 'Wedding', amount: 20000, month: 10 }]; full.p.capital = [{ id: 'ca', name: 'Dad', amount: 50000, month: 20 }]; full.p.jobs.push({ id: 'job2', name: 'Side gig', gross: 24000, raise: 0, tax: 15, hours: 10, start: 6, end: 60 });
    await loadState(page, full, '#finances'); await page.waitForSelector(SEL('verdict-card'));
    /* edge inputs in EVERY finance field (stay on the page for speed; scan page DOM each time; scan main + assumptions after each field) */
    const sels = await page.evaluate(() => [...new Set([...document.querySelectorAll('#app [data-p]')].map((e) => e.dataset.p))]);
    const vals = ['', 'abc', '-5', '1e12', '0']; const badE = []; let cnt = 0; const e0 = collect.errors.length;
    const scan = () => document.getElementById('app').innerText + ' ' + [...document.querySelectorAll('#app input')].map((i) => i.value).join(' | ');
    for (const sel of sels) { for (const v of vals) { cnt++; const txt = await page.evaluate(async ([sel, v]) => { const el = document.querySelector(`[data-p="${sel}"]`); if (!el) return 'MISSING ' + sel; el.focus(); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); await new Promise((r) => setTimeout(r, 25)); return document.getElementById('app').innerText + ' ' + [...document.querySelectorAll('#app input')].map((i) => i.value).join(' | '); }, [sel, v]);
        if (BAD.test(txt) || txt.startsWith('MISSING')) badE.push(`${sel}=${JSON.stringify(v)}: ${txt.startsWith('MISSING') ? 'field vanished' : (BAD.exec(txt) || [])[2]}`); }
      for (const h of ['#', '#assumptions']) { await goHash(page, h); const t = await page.evaluate(scan); if (BAD.test(t)) badE.push(`after ${sel}: ${h} shows ${(BAD.exec(t) || [])[2]}`); } await goHash(page, '#finances'); await page.waitForSelector(SEL('verdict-card')); }
    P.t(!badE.length, `${cnt} edge inputs (blank, garbage, negative, 1e12, 0) across ${sels.length} finance fields leave no NaN/Infinity/undefined on finances, main, assumptions`, 2.2, badE.slice(0, 3).join(' ; '));
    P.t(collect.errors.length === e0, 'edge-input storm raised no console/page errors', 0.8, collect.errors.slice(e0, e0 + 2).join(' || ').slice(0, 160));
    /* back to a clean full state for the layout checks */
    await loadState(page, full, '#finances'); await page.waitForSelector(SEL('verdict-card'));
    const names = await page.evaluate(() => [...document.querySelectorAll('#app input, #app select, #app button, #app textarea')].filter((e) => e.type !== 'hidden' && !e.hidden).map((e) => { const al = e.getAttribute('aria-label'), lb = e.getAttribute('aria-labelledby'), l = e.labels && e.labels.length ? [...e.labels].map((x) => x.textContent).join('').trim() : '', tx = e.tagName === 'BUTTON' ? e.textContent.trim() : ''; return { n: !!((al && al.trim()) || lb || l || tx), d: e.tagName + ' ' + (e.dataset.p || e.dataset.testid || e.dataset.dp || e.className) }; }));
    await goMain(page); const namesM = await page.evaluate(() => [...document.querySelectorAll('#app input, #app select, #app button')].filter((e) => !e.hidden).map((e) => ({ n: !!((e.getAttribute('aria-label') || '').trim() || (e.labels && e.labels.length) || (e.tagName === 'BUTTON' && e.textContent.trim())), d: e.tagName + ' ' + (e.dataset.testid || e.className) })));
    const allN = names.concat(namesM), unnamed = allN.filter((x) => !x.n); P.t(allN.length > 40 && !unnamed.length, `every finance + main input/button has an accessible name (${allN.length - unnamed.length}/${allN.length})`, 1, unnamed.slice(0, 4).map((x) => x.d).join(', '));
    await goHash(page, '#finances'); await page.waitForSelector(SEL('verdict-card'));
    const tap = await page.evaluate(() => { const bad = [], font = []; const els = [...document.querySelectorAll('#app button, #app input:not([type=hidden]), #app select, #app [role=link], #app [data-go]')].filter((e) => !e.hidden && e.getClientRects().length);
      els.forEach((e) => { let r = e.getBoundingClientRect(); const w = e.closest('.iw'); if (w) { const r2 = w.getBoundingClientRect(); r = { width: Math.max(r.width, r2.width), height: Math.max(r.height, r2.height) }; } const d = e.tagName + ' ' + (e.dataset.p || e.dataset.testid || e.dataset.dp || e.textContent.trim().slice(0, 18));
        if (r.height < 43.5 || r.width < 43.5) bad.push(d + ' ' + Math.round(r.width) + 'x' + Math.round(r.height)); if (/INPUT|SELECT/.test(e.tagName) && parseFloat(getComputedStyle(e).fontSize) < 15.99) font.push(d + ' ' + getComputedStyle(e).fontSize); }); return { n: els.length, bad, font }; });
    await goMain(page); const tapM = await page.evaluate(() => [...document.querySelectorAll('[data-testid=finances-link],[data-testid=afford-line],[data-testid=afford-chip]')].map((e) => { const r = (e.closest('[data-go]') || e).getBoundingClientRect(); return { d: e.dataset.testid, w: r.width, h: r.height }; }));
    const badM = tapM.filter((x) => x.h < 43.5 || x.w < 43.5);
    P.t(tap.n > 30 && !tap.bad.length && !badM.length, `tap targets >= 44px on Finances (${tap.n} controls) and the main-page finance entries`, 1, tap.bad.concat(badM.map((x) => x.d + ' ' + Math.round(x.w) + 'x' + Math.round(x.h))).slice(0, 4).join('; '));
    P.t(!tap.font.length, 'every finance input and select has font-size >= 16px (no iOS zoom)', 0.6, tap.font.slice(0, 3).join('; '));
    /* overflow */
    const ov = []; for (const wv of [320, 390, 430]) { await page.setViewportSize({ width: wv, height: 800 }); for (const h of ['#finances', '#']) { await goHash(page, h); const o = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, bw: document.body.scrollWidth, iw: window.innerWidth })); if (o.sw > o.iw + 1 || o.bw > o.iw + 1) ov.push(`${h}@${wv}: ${o.sw}/${o.bw}>${o.iw}`); } }
    await page.setViewportSize({ width: 390, height: 844 }); P.t(!ov.length, 'no horizontal overflow at 320 / 390 / 430px on #finances and main', 1, ov.join('; '));
    /* contrast of the chips, every status, light + dark */
    await goHash(page, '#finances'); await page.waitForSelector(SEL('verdict-chip')); const lum = (c) => { const a = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]; };
    const worst = []; let minC = 99;
    for (const scheme of ['light', 'dark']) { await page.emulateMedia({ colorScheme: scheme }); await page.waitForTimeout(60);
      for (const h of ['#finances', '#']) { await goHash(page, h); const rs = await page.evaluate((id) => { const el = document.querySelector(`[data-testid=${id}]`); const cv = document.createElement('canvas'); cv.width = cv.height = 1; const cx = cv.getContext('2d', { willReadFrequently: true }); const rgb = (c) => { cx.clearRect(0, 0, 1, 1); cx.fillStyle = '#000'; cx.fillStyle = c; cx.fillRect(0, 0, 1, 1); const d = cx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3]]; };
          return ['yes', 'tight', 'no'].map((st) => { el.className = 'vchip ' + st; const cs = getComputedStyle(el); let bg = rgb(cs.backgroundColor); const fg = rgb(cs.color); let par = el; let under = [255, 255, 255]; while (par = par.parentElement) { const pb = rgb(getComputedStyle(par).backgroundColor); if (pb[3] === 255) { under = pb; break; } } if (bg[3] < 255) { const a = bg[3] / 255; bg = bg.slice(0, 3).map((v, i) => v * a + under[i] * (1 - a)); } return { st, bg: bg.slice(0, 3), fg: fg.slice(0, 3) }; }); }, h === '#' ? 'afford-chip' : 'verdict-chip');
        rs.forEach((x) => { const L1 = lum(x.fg), L2 = lum(x.bg), c = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05); minC = Math.min(minC, c); if (c < 4.5) worst.push(`${scheme} ${h === '#' ? 'afford' : 'verdict'} ${x.st} ${c.toFixed(2)}`); }); } }
    await page.emulateMedia({ colorScheme: 'light' }); P.t(!worst.length && minC < 99, `verdict + afford chips (Yes / Tight / Not yet) have contrast >= 4.5:1 in light and dark (lowest ${minC.toFixed(2)})`, 1, worst.join('; '));
    /* typing keeps focus */
    await reset(page); const tries = [['#finances', '[data-p="p.living"]', '12345', '12345', 'living costs'], ['#finances', '[data-p="p.cash"]', '98765', '98765', 'cash'], ['#finances', '[data-p="j.job1.gross"]', '123456', '123456', 'job gross pay'], ['#finances', '[data-p="j.job1.name"]', 'Abcde', 'Abcde', 'job name'], ['#assumptions', '[data-p="g.otherDebt"]', '12345', '12345', 'other debts']];
    const T = new Parts();
    for (const [route, sel, txt, want, label] of tries) { try { await goHash(page, route); await page.waitForSelector(sel); await page.evaluate((s) => document.querySelector(s).scrollIntoView({ block: 'center' }), sel); const bb = await page.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, sel);
        await page.mouse.click(bb.x, bb.y); await page.keyboard.press('Control+A'); await page.keyboard.press('Backspace'); await page.keyboard.type(txt, { delay: 50 }); await page.waitForTimeout(120);
        const r = await page.evaluate((s) => { const a = document.activeElement; return { same: !!(a && a.matches && a.matches(s)), v: a ? a.value : null }; }, sel); T.t(r.same && String(r.v).replace(/[,$\s]/g, '') === want, label, 1, `focus kept=${r.same} value=${r.v}`); await page.evaluate(() => document.activeElement && document.activeElement.blur()); } catch (e) { T.t(false, label, 1, 'threw ' + e.message.slice(0, 60)); } }
    P.t(T.ratio === 1, 'typing 5-6 digits sequentially in finance fields keeps focus and the full value', 1, T.detail);
    /* no render storm */
    const stormBad = []; await goHash(page, '#finances');
    for (const sel of ['[data-p="p.cash"]', '[data-p="j.job1.gross"]', '[data-p="p.living"]']) { const r = await page.evaluate(async (sel) => { const el = document.querySelector(sel); el.focus(); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, el.value.replace(/,/g, '') || '1'); el.dispatchEvent(new Event('input', { bubbles: true })); await new Promise((r) => setTimeout(r, 80)); let n = 0; const mo = new MutationObserver((m) => { n += m.length; }); mo.observe(document.getElementById('app'), { childList: true, subtree: true }); await new Promise((r) => setTimeout(r, 500)); mo.disconnect(); const a = document.activeElement; if (a && a.blur) a.blur(); return n; }, sel); if (r > 20) stormBad.push(sel + ' ' + r); }
    P.t(!stormBad.length, 'no render storm: DOM settles while a finance input is focused', 0.6, stormBad.join('; '));
    const errs = collect.errors.slice(errStart); P.t(errs.length === 0, 'zero console / page errors across every finance flow (F3 + F5)', 1.3, errs.length + ': ' + [...new Set(errs)].slice(0, 3).join(' || ').slice(0, 220));
    /* sub-weights above sum to 12.5 of ratio; normalise */
    return P;
  });

  const order = ['F1', 'F2', 'F3', 'F4', 'F5']; checks.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  const earned = checks.reduce((s, c) => s + c.earned, 0), max = checks.reduce((s, c) => s + c.points, 0);
  try { await ctx.close(); } catch (e) {}
  return { earned: Math.round(earned * 100) / 100, max, checks };
};
