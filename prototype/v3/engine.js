/* Portfolio finance engine v3 — pure functions, no DOM. Works in browser (window.Engine) and Node (module.exports).
   State shape: { g:{...assumptions}, houses:[{id,addr,status:'owned'|'planned',price,dp,rate,term,extra,driver:'extra'|'months',wait,
   rent,tax,ins,hoa,liens,paid,buyIn,target}] }  All percentages are plain numbers (85 = 85%). Money is dollars. Time is months. */
(function (root) {
  const GDEF = { cap: 85, haircut: 0, closing: 3, vac: 5, mgmt: 8, maint: 1, appr: 0, hrate: 8.5, dti: 43,
    p1: 200000, p2: 200000, rentCount: 75, otherDebt: 0, horizon: 480 };
  let uid = 0;
  const newHouse = (o) => Object.assign({ id: 'h' + Date.now().toString(36) + (uid++), addr: 'New house', status: 'planned', price: 250000, dp: 20,
    rate: 6.75, term: 360, extra: 0, driver: 'extra', wait: 24, rent: 1800, tax: 250, ins: 100, hoa: 0, liens: 0, paid: 0, buyIn: 12, target: '' }, o || {});
  const seed = () => ({ g: Object.assign({}, GDEF), houses: [
    newHouse({ id: 'oak', addr: '12 Oak St', status: 'owned', price: 300000, dp: 20, rate: 6.5, extra: 1000, rent: 2100, tax: 300, ins: 100, target: 'elm' }),
    newHouse({ id: 'elm', addr: '8 Elm Ave', status: 'planned', price: 240000, rate: 6.75, extra: 100, rent: 1800, tax: 250, ins: 90, target: 'pine' }),
    newHouse({ id: 'pine', addr: '3 Pine Rd', status: 'planned', price: 200000, rate: 7, extra: 0, rent: 1600, tax: 200, ins: 80, target: '' })] });

  const H = (S, id) => S.houses.find((h) => h.id === id);
  const mi = (h) => h.rate / 1200;
  const loan = (h) => h.price * (1 - h.dp / 100);
  const pmt = (L, i, n) => (L <= 0 ? 0 : i ? (L * i) / (1 - Math.pow(1 + i, -n)) : L / n);
  const age0 = (h) => (h.status === 'owned' ? Math.max(0, h.paid || 0) : 0);
  /* balance today under the scheduled payment (age0 months already paid) */
  function balToday(h) {
    const L = loan(h), i = mi(h), P = pmt(L, i, h.term), k = age0(h);
    if (!k) return L;
    return Math.max(0, i ? L * Math.pow(1 + i, k) - P * (Math.pow(1 + i, k) - 1) / i : L - P * k);
  }
  const balK = (B0, i, A, k) => Math.max(0, i ? B0 * Math.pow(1 + i, k) - A * (Math.pow(1 + i, k) - 1) / i : B0 - A * k);
  const valK = (S, h, k) => h.price * Math.pow(1 + S.g.appr / 100, (age0(h) + k) / 12);
  const need = (S, h) => { const t = H(S, h.target); return t ? t.price * (t.dp / 100 + S.g.closing / 100) : 0; };

  function payoffN(h, X) {
    const B0 = balToday(h), i = mi(h), A = pmt(loan(h), i, h.term) + X;
    if (B0 <= 0.005) return 0;
    if (A <= i * B0) return Infinity;
    return Math.ceil(i ? -Math.log(1 - (i * B0) / A) / Math.log(1 + i) : B0 / A);
  }
  /* months (from the house's own start) until cap*value - balance - other liens >= cash needed for its target */
  function locMonths(S, h, X) {
    if (!H(S, h.target)) return Infinity;
    const D = need(S, h), B0 = balToday(h), i = mi(h), A = pmt(loan(h), i, h.term) + X, g = S.g;
    for (let k = 0; k <= 600; k++) {
      const head = g.cap / 100 * valK(S, h, k) - balK(B0, i, A, k) - (h.liens || 0);
      if (Math.max(0, head) * (1 - g.haircut / 100) >= D) return k;
    }
    return Infinity;
  }
  /* back-solve: smallest extra payment so the line of credit opens within m months (null = impossible) */
  function extraFor(S, h, m) {
    if (locMonths(S, h, 0) <= m) return 0;
    let lo = 0, hi = balToday(h) + 1;
    if (locMonths(S, h, hi) > m) return null;
    for (let j = 0; j < 50; j++) { const mid = (lo + hi) / 2; locMonths(S, h, mid) <= m ? (hi = mid) : (lo = mid); }
    return hi;
  }
  function view(S, h) {
    const g = S.g, L = loan(h), i = mi(h), P = pmt(L, i, h.term), B0 = balToday(h);
    let X = h.extra, infeasible = false;
    if (h.driver === 'months' && H(S, h.target)) { const x = extraFor(S, h, h.wait); if (x == null) infeasible = true; else X = x; }
    const egi = h.rent * (1 - g.vac / 100);
    const opex = h.tax + h.ins + h.hoa + (g.maint / 100) * h.price / 12 + (g.mgmt / 100) * egi;
    const noi = egi - opex, escrow = h.tax + h.ins + h.hoa;
    return { L, B0, P, X, infeasible, egi, noi, cf: noi - P, escrow, pitia: P + escrow, payment: P + X + escrow,
      D: need(S, h), down: (h.price * h.dp) / 100, payoff: payoffN(h, X), locM: locMonths(S, h, X),
      head0: Math.max(0, g.cap / 100 * h.price - B0 - (h.liens || 0)), debtNow: B0 + (h.liens || 0) };
  }

  /* The whole-portfolio plan: purchase months, month-by-month series, plan-level KPIs. */
  function plan(S) {
    const hs = S.houses, g = S.g, V = {};
    hs.forEach((h) => (V[h.id] = view(S, h)));
    const memo = {}, stack = {};
    function pm(h) {
      if (memo[h.id] !== undefined) return memo[h.id];
      if (h.status === 'owned') return (memo[h.id] = 0);
      if (stack[h.id]) return Infinity;
      stack[h.id] = 1;
      const srcs = hs.filter((x) => x.target === h.id && x.id !== h.id);
      let r;
      if (!srcs.length) r = Math.max(0, h.buyIn || 0);
      else { r = Infinity; srcs.forEach((s) => { const a = pm(s) + V[s.id].locM; if (a < r) r = a; }); }
      stack[h.id] = 0;
      return (memo[h.id] = r);
    }
    const P0 = {}; hs.forEach((h) => (P0[h.id] = pm(h)));
    /* a house "funds" its target only if its line of credit is what opens first for that target */
    const funds = {}; hs.forEach((h) => { const t = H(S, h.target);
      funds[h.id] = !!(t && t.status === 'planned' && isFinite(P0[h.id] + V[h.id].locM) && P0[t.id] === P0[h.id] + V[h.id].locM); });
    const finiteBuys = hs.map((h) => P0[h.id]).filter(isFinite);
    const lastBuy = finiteBuys.length ? Math.max.apply(null, finiteBuys) : 0;
    const T = Math.min(g.horizon, Math.max(120, lastBuy + 60));
    const keys = ['nw', 'monthly', 'extra', 'noi', 'ds', 'cf', 'cfx', 'debt', 'value', 'rent', 'dsti', 'dti', 'count'];
    const s = {}; keys.forEach((k) => (s[k] = new Array(T + 1).fill(0)));
    for (let t = 0; t <= T; t++) {
      for (const h of hs) {
        const p = P0[h.id]; if (!isFinite(p) || t < p) continue;
        const v = V[h.id], age = t - p, i = mi(h), live = age < v.payoff;
        const B = live ? balK(v.B0, i, v.P + v.X, age) : 0, val = valK(S, h, age);
        const heloc = funds[h.id] && age >= v.locM ? v.D : 0, hi = (heloc * g.hrate) / 1200;
        const sched = live ? v.P : 0, ex = live ? v.X : 0;
        s.count[t]++; s.value[t] += val; s.debt[t] += B + (h.liens || 0) + heloc; s.nw[t] += val - B - (h.liens || 0) - heloc;
        s.noi[t] += v.noi; s.ds[t] += sched + hi; s.extra[t] += ex; s.rent[t] += h.rent;
        s.monthly[t] += sched + ex + v.escrow + hi; s.dsti[t] += sched + v.escrow + hi;
      }
      s.cf[t] = s.noi[t] - s.ds[t]; s.cfx[t] = s.cf[t] - s.extra[t];
      const inc = (g.p1 + g.p2) / 12 + (g.rentCount / 100) * s.rent[t];
      s.dti[t] = ((g.otherDebt + s.dsti[t]) / inc) * 100;
    }
    const at = (t) => { const o = { month: t }; keys.forEach((k) => (o[k] = s[k][t])); o.cltv = o.value ? (o.debt / o.value) * 100 : 0;
      o.dscr = o.ds ? o.noi / o.ds : 0; return o; };
    const rows = hs.filter((h) => H(S, h.target)).map((h) => ({ id: h.id, target: h.target, start: P0[h.id], locM: V[h.id].locM,
      end: P0[h.id] + V[h.id].locM, ok: isFinite(P0[h.id] + V[h.id].locM), funds: funds[h.id] }));
    let worst = { dti: 0, month: 0 }; for (let t = 0; t <= T; t++) if (s.dti[t] > worst.dti) worst = { dti: s.dti[t], month: t };
    return { purchase: P0, series: s, T, lastBuy, today: at(0), final: at(Math.min(T, lastBuy)), at, rows, funds, V,
      worst, unfunded: hs.filter((h) => !isFinite(P0[h.id])).map((h) => h.id) };
  }
  /* affordability of the purchase a house's line of credit funds: DTI in the month the target is bought */
  function afford(S, h, pl) {
    pl = pl || plan(S);
    const t = H(S, h.target);
    if (!t) return { cls: 'na', txt: 'No target', why: 'Pick the house this line of credit will fund.' };
    const m = pl.purchase[t.id];
    if (!isFinite(m)) return { cls: 'bad', txt: '✗ Not reachable', why: 'The debt cap leaves no room within 50 years.' };
    const dti = pl.series.dti[Math.min(pl.T, m)], lim = S.g.dti;
    const cls = dti <= lim * 0.8 ? 'ok' : dti <= lim ? 'warn' : 'bad';
    return { cls, dti, txt: cls === 'ok' ? '✓ Afford' : cls === 'warn' ? '△ Tight' : '✗ Short', why: 'Debt-to-income ' + dti.toFixed(0) + '% vs ' + lim + '% limit when ' + t.addr + ' closes.' };
  }
  function without(S, id) {
    const c = JSON.parse(JSON.stringify(S));
    c.houses = c.houses.filter((h) => h.id !== id); c.houses.forEach((h) => { if (h.target === id) h.target = ''; });
    return c;
  }
  const E = { GDEF, seed, newHouse, view, plan, afford, without, extraFor, locMonths, payoffN, pmt, loan, balToday, need, H };
  if (typeof module !== 'undefined' && module.exports) module.exports = E; else root.Engine = E;
})(typeof window !== 'undefined' ? window : globalThis);
