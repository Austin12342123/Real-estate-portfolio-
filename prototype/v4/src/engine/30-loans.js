  const H = (S, id) => S.houses.find((h) => h.id === id);
  const mi = (h) => h.rate / 1200;
  const baseAmt = (h) =>
    h.price +
    (h.finCapex ? Math.max(0, h.capex || 0) : 0); /* price + a rehab financed in the same loan (203(k)) */
  const downAmt = (h) => (baseAmt(h) * h.dp) / 100;
  const loan = (h) =>
    Math.max(0, baseAmt(h) - downAmt(h)) *
    (1 + (h.mipUp || 0) / 100); /* upfront mortgage insurance is financed */
  const mipMonthly = (h) =>
    (h.mipAnn || 0) > 0
      ? ((loan(h) / (1 + (h.mipUp || 0) / 100)) * h.mipAnn) / 100 / 12
      : 0; /* annual MIP is on the loan WITHOUT the financed upfront premium (24 CFR 203.284) */
  const amort = (L, i, n) => (L <= 0 ? 0 : i ? (L * i) / (1 - Math.pow(1 + i, -n)) : L / n);
  const pmt = amort; /* kept for callers that back-solve a payoff */
  const payment = (h) => {
    const L = loan(h),
      i = mi(h);
    return L <= 0 ? 0 : h.io ? L * i : amort(L, i, h.term);
  };
  const age0 = (h) => (h.status === 'owned' ? Math.max(0, h.paid || 0) : 0);
  const gr = (S, h) => {
    const v = h.growth == null || !isFinite(+h.growth) ? S.g.appr : +h.growth;
    return Math.max(-90, v);
  };
  const clPct = (S, h) => (h.closingPct == null || !isFinite(+h.closingPct) ? S.g.closing : +h.closingPct);
  function balToday(h) {
    const L = loan(h),
      i = mi(h),
      P = payment(h),
      k = age0(h);
    if (!k || h.io) return L;
    return Math.max(0, i ? L * Math.pow(1 + i, k) - (P * (Math.pow(1 + i, k) - 1)) / i : L - P * k);
  }
  const balK = (B0, i, A, k) =>
    Math.max(0, i ? B0 * Math.pow(1 + i, k) - (A * (Math.pow(1 + i, k) - 1)) / i : B0 - A * k);
  const valK = (S, h, k) => h.price * Math.pow(1 + gr(S, h) / 100, (age0(h) + k) / 12);
  /* value k months after the asset's start. After the improvement finishes, the value IS the new appraisal (arv), then it keeps growing from there. */
  const valAt = (S, h, k) => {
    const cm = Math.max(0, h.capexMonths || 0);
    return +h.arv > 0 && k >= cm ? h.arv * Math.pow(1 + gr(S, h) / 100, (k - cm) / 12) : valK(S, h, k);
  };
  /* cash a planned asset needs the day it is bought: down payment + closing costs + improvements paid in cash (a financed rehab is part of the loan) */
  const needFor = (S, h) =>
    downAmt(h) + (h.price * clPct(S, h)) / 100 + (h.finCapex ? 0 : Math.max(0, h.capex || 0));
  const need = (S, h) => {
    const t = H(S, h.target);
    return t ? downAmt(t) + (t.price * clPct(S, t)) / 100 : 0;
  };
  /* operating income per month (rent or owner profit minus operating costs), before any loan payment */
  const reimbOf = (h) =>
    (h.type || 'house') === 'business'
      ? 0
      : (Math.min(100, Math.max(0, +h.nnn || 0)) / 100) *
        ((+h.tax || 0) + (+h.ins || 0) + (+h.hoa || 0)); /* costs the tenants pay back (NNN leases) */
  /* multi-family costs: units, the replacement reserve (per unit per year) and other owner-paid costs (utilities, payroll) per month, and this asset's own management / repairs % when set */
  const isMulti = (h) => (h.type || 'house') === 'house' && h.kind === 'multi';
  const unitsOf = (h) => (isMulti(h) ? Math.max(2, Math.round(+h.units || 2)) : 1);
  const mfReserve = (h) => (isMulti(h) ? (unitsOf(h) * Math.max(0, +h.mfRes || 0)) / 12 : 0);
  const mfOther = (h) => (isMulti(h) ? Math.max(0, +h.mfOther || 0) : 0);
  const mgmtOf = (S, h) =>
    (h.type || 'house') !== 'business' && h.mgmtPct != null && h.mgmtPct !== '' && isFinite(+h.mgmtPct)
      ? +h.mgmtPct
      : S.g
          .mgmt; /* the property manager's % of rent collected: this asset's own (any home, building or commercial property; null = the Assumptions rate, which is what every asset used before). A business has no property manager: its owner profit is already after the people who run it, and a manager you pay when you do not run it is set in Finances. */
  const mgmtAmt = (S, h) =>
    (h.type || 'house') === 'business'
      ? 0
      : (mgmtOf(S, h) / 100) *
        (h.rent + reimbOf(h)) *
        (1 - S.g.vac / 100); /* the property manager per month in dollars */
  const maintOf = (S, h) =>
    isMulti(h) && h.maintPct != null && h.maintPct !== '' && isFinite(+h.maintPct) ? +h.maintPct : S.g.maint;
  const noiOf = (S, h) => {
    const g = S.g;
    if ((h.type || 'house') === 'business') return h.rent;
    const egi = (h.rent + reimbOf(h)) * (1 - g.vac / 100);
    return (
      egi -
      (h.tax +
        h.ins +
        h.hoa +
        ((maintOf(S, h) / 100) * h.price) / 12 +
        (mgmtOf(S, h) / 100) * egi +
        mfReserve(h) +
        mfOther(h))
    );
  };
  /* the multi-family money picture per month: every line, per unit, and the operating-expense ratio (costs before the loan / income after vacancy) */
  function mfInfo(S, h) {
    const g = S.g,
      n = unitsOf(h),
      egi = (h.rent + reimbOf(h)) * (1 - g.vac / 100),
      gross = h.rent + reimbOf(h);
    const L = {
      vac: gross - egi,
      tax: h.tax,
      ins: h.ins,
      hoa: h.hoa,
      maint: ((maintOf(S, h) / 100) * h.price) / 12,
      mgmt: (mgmtOf(S, h) / 100) * egi,
      res: mfReserve(h),
      other: mfOther(h),
    };
    const opex = L.tax + L.ins + L.hoa + L.maint + L.mgmt + L.res + L.other,
      noi = noiOf(S, h),
      per = {};
    Object.keys(L).forEach((k) => {
      per[k] = L[k] / n;
    });
    return {
      units: n,
      lines: L,
      perUnit: per,
      rentUnit: h.rent / n,
      egi,
      opex,
      noi,
      oer: egi > 0 ? (opex / egi) * 100 : NaN,
      cat: mfCat(n, !!h.pack),
    };
  }
  const capOf = (S, h) =>
    (h.type || 'house') === 'business'
      ? isFinite(+S.g.capBiz)
        ? +S.g.capBiz
        : GDEF.capBiz
      : S.g.cap; /* a credit line against a business is not backed by real estate: separate, lower cap */
  /* The home's own monthly cash flow (income minus costs, loan payment and mortgage insurance, before any extra payment) is saved toward the next down payment while it waits. Only a positive cash flow adds money. */
  const cfSaved = (S, h) => Math.max(0, noiOf(S, h) - payment(h) - mipMonthly(h));

  const refiRateOf = (S, h) =>
    h.refiRate == null || h.refiRate === '' || !isFinite(+h.refiRate)
      ? isFinite(+S.g.refiRate)
        ? +S.g.refiRate
        : GDEF.refiRate
      : +h.refiRate;
  const refiTermOf = (S, h) =>
    h.refiTerm == null || h.refiTerm === '' || !isFinite(+h.refiTerm) || +h.refiTerm < 1
      ? isFinite(+S.g.refiTerm)
        ? +S.g.refiTerm
        : GDEF.refiTerm
      : +h.refiTerm;
  /* months from the purchase until the loan is due: an interest-only loan is due at the end of its term; any loan can also carry a balloon (mat > 0). 0 = fully amortizing. */
  const matOf = (h) => (+h.mat > 0 ? +h.mat : h.io ? h.term : 0);
  /* The balance and scheduled payment k months after the asset's start (today for an owned asset, the purchase for a planned one). When the loan comes due with a balance left,
     that balance is refinanced into an amortizing loan at the refinance rate and term, so the debt, payment and DSCR stay right after maturity. */
  function loanPath(S, h, X) {
    const B0 = balToday(h),
      i = mi(h),
      P = payment(h),
      m0 = matOf(h),
      m = m0 > 0 && B0 > 0.005 ? Math.max(0, m0 - age0(h)) : Infinity;
    const o = { B0, i, P, X, m, Bm: B0, ir: i, Pr: 0, refi: null };
    if (isFinite(m)) {
      o.Bm = balK(B0, i, P + X, m);
      o.ir = refiRateOf(S, h) / 1200;
      o.Pr = amort(o.Bm, o.ir, refiTermOf(S, h));
      if (o.Bm > 0.005)
        o.refi = {
          month: m,
          balance: o.Bm,
          rate: refiRateOf(S, h),
          termMonths: refiTermOf(S, h),
          payment: o.Pr,
        };
    }
    o.bal = (k) => (k < m ? balK(B0, i, P + X, k) : balK(o.Bm, o.ir, o.Pr + X, k - m));
    o.rate = (k) => (k < m ? i : o.ir);
    o.pay = (k) => (k < m ? P : o.Pr);
    return o;
  }
  function payoffN(h, X, S) {
    const B0 = balToday(h),
      i = mi(h),
      A = payment(h) + X;
    if (B0 <= 0.005) return 0;
    const pth = loanPath(S || { g: GDEF }, h, X || 0),
      m = pth.m;
    const n1 =
      A <= i * B0 + 1e-9
        ? Infinity
        : Math.ceil((i ? -Math.log(1 - (i * B0) / A) / Math.log(1 + i) : B0 / A) - 1e-7);
    if (n1 <= m) return n1;
    if (pth.Bm <= 0.005) return m;
    const A2 = pth.Pr + X,
      i2 = pth.ir;
    if (A2 <= i2 * pth.Bm + 1e-9) return Infinity;
    return m + Math.ceil((i2 ? -Math.log(1 - (i2 * pth.Bm) / A2) / Math.log(1 + i2) : pth.Bm / A2) - 1e-7);
  }
  /* growth of rent and costs k months from today (rent and costs grow with the value) */
  const gfAt = (S, h, k) => (h.price > 0 ? valK(S, h, k) / valK(S, h, 0) : 1);
  /* cash flow this asset can save in month k (grows with the asset's income; only a positive amount is saved) */
  const mipAt = (h, B) =>
    (h.mipAnn || 0) > 0 ? ((B / (1 + (h.mipUp || 0) / 100)) * h.mipAnn) / 100 / 12 : 0;
  const cfAt = (S, h, pth, k) => {
    const B = pth.bal(k);
    return Math.max(
      0,
      noiOf(S, h) * gfAt(S, h, k) - (B > 0.005 ? pth.pay(k) : 0) - (B > 0.005 ? mipAt(h, B) : 0),
    );
  };
  /* total cash flow saved in the first k months (a down payment only needs the need, so view() caps it) */
  const savedBy = (S, h, X, k) => {
    const pth = loanPath(S, h, X);
    let c = 0;
    for (let j = 0; j < k; j++) c += cfAt(S, h, pth, j);
    return c;
  };
  /* months (from the asset's own start) until the cash for its target is there: borrowing room (cap * value * (1 - appraisal cut) - balance - other liens)
     plus the cash flow this asset has saved up (it grows with the asset's income) reaches the cash needed. o.noCash leaves the saved cash flow out. */
  function locMonths(S, h, X, o) {
    if (!H(S, h.target)) return Infinity;
    const D = need(S, h),
      g = S.g,
      pth = loanPath(S, h, X),
      noCash = !!(o && o.noCash),
      cap = capOf(S, h);
    let cum = 0;
    for (let k = 0; k <= 600; k++) {
      const head =
        (cap / 100) * (1 - g.haircut / 100) * valAt(S, h, k) -
        pth.bal(k) -
        (h.liens ||
          0); /* the lender counts only (1 - cut) of the appraised value, then caps total debt at cap% of that */
      if (Math.max(0, head) + cum >= D) return k;
      if (!noCash) cum += cfAt(S, h, pth, k);
    }
    return Infinity;
  }
  function extraFor(S, h, m) {
    if (locMonths(S, h, 0) <= m) return 0;
    let lo = 0,
      hi = balToday(h) + 1;
    if (locMonths(S, h, hi) > m) return null;
    for (let j = 0; j < 50; j++) {
      const mid = (lo + hi) / 2;
      locMonths(S, h, mid) <= m ? (hi = mid) : (lo = mid);
    }
    return hi;
  }
  function view(S, h) {
    const g = S.g,
      L = loan(h),
      P = payment(h),
      B0 = balToday(h),
      type = h.type || 'house';
    let X = h.extra,
      infeasible = false;
    if (h.driver === 'months' && H(S, h.target)) {
      const x = extraFor(S, h, h.wait);
      if (x == null) infeasible = true;
      else X = x;
    }
    let egi, escrow;
    const noi = noiOf(S, h),
      reimb = reimbOf(h);
    if (type === 'business') {
      egi = h.rent;
      escrow = 0;
    } else {
      egi = (h.rent + reimb) * (1 - g.vac / 100);
      escrow = h.tax + h.ins + h.hoa;
    }
    const pth = loanPath(S, h, X),
      lm = locMonths(S, h, X),
      A = P + X,
      Dn = need(S, h),
      cashDP = H(S, h.target) && isFinite(lm) ? Math.min(Dn, savedBy(S, h, X, lm)) : 0,
      draw = Dn - cashDP;
    const cltvAtLoc =
      H(S, h.target) && isFinite(lm) ? ((pth.bal(lm) + (h.liens || 0) + draw) / valAt(S, h, lm)) * 100 : null;
    const down = downAmt(h),
      closingCost = (h.price * clPct(S, h)) / 100,
      mip = mipMonthly(h),
      cap = capOf(S, h);
    return {
      cltvAtLoc,
      L,
      B0,
      P,
      mip,
      X,
      infeasible,
      egi,
      noi,
      reimb,
      cap,
      refi: pth.refi,
      cf: noi - P - mip,
      escrow,
      pitia: P + escrow + mip,
      path: pth,
      payment: P + X + escrow + mip,
      D: Dn,
      cashDP,
      draw,
      cfSaved: cfSaved(S, h),
      down,
      closingCost,
      invested: down + closingCost,
      payoff: payoffN(h, X, S),
      locM: lm,
      head0: Math.max(0, (cap / 100) * (1 - g.haircut / 100) * valAt(S, h, 0) - B0 - (h.liens || 0)),
      debtNow: B0 + (h.liens || 0),
      valueNow: valAt(S, h, 0),
      valueGain: +h.arv > 0 ? h.arv - h.price - (h.capex || 0) : 0,
      capRate: h.price > 0 ? ((noi * 12) / h.price) * 100 : NaN,
      capNow: valAt(S, h, 0) > 0 ? ((noi * 12) / valAt(S, h, 0)) * 100 : NaN,
      mgmtAmt: mgmtAmt(S, h),
      multiple: noi > 0 ? h.price / (noi * 12) : NaN,
      growth: gr(S, h),
    };
  }

