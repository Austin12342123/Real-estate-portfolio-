  /* ---------- TODAY'S DOLLARS ----------
     The engine always works in future (nominal) dollars: rents, values and living costs grow, loan payments are fixed, and a planned asset's price is TODAY'S price (nothing is inflated).
     For display, every figure that belongs to a future month is divided by (1 + cost-increase rate)^(months / 12), the same rate living costs rise at (Finances, "Cost increase"). Figures for month 0 are unchanged.
     realPlan() returns the plan with every dollar figure of a future month converted that way (totals and rows are converted with the same factor, so a total is still the sum of its rows). The plan itself stays in pl.raw. */
  const dfac = (S, m) => Math.pow(1 + ((S && S.p && S.p.inflation) || 0) / 100, Math.max(0, +m || 0) / 12);
  const PL_K = [
    'nw',
    'monthly',
    'extra',
    'noi',
    'ds',
    'cf',
    'cfx',
    'debt',
    'value',
    'rent',
    'dsti',
    'outside',
    'cash',
    'sav',
    'intr',
    'dep',
    'txRE',
    'txBiz',
  ];
  const AS_K = ['equity', 'value', 'debt', 'payment', 'cf', 'income', 'extra'],
    PO_K = ['room', 'drawn', 'head', 'cf', 'tax', 'gm', 'sweep', 'cash'],
    EX_K = ['proceeds', 'price', 'net', 'dep', 'cost', 'tax', 'cashIn', 'profit'],
    JB_K = ['short', 'surplus', 'used', 'line', 'cash', 'loans', 'liquid'];
  const scaleKeys = (o, ks, f) => {
    const c = Object.assign({}, o);
    ks.forEach((k) => {
      if (typeof c[k] === 'number') c[k] = c[k] / f;
    });
    return c;
  };
  function realPlan(S, pl) {
    if (!pl) pl = plan(S);
    if (pl.raw) return pl;
    const T = pl.T,
      f = (m) => dfac(S, m),
      r = Object.assign({}, pl, { raw: pl, real: true });
    r.series = Object.assign({}, pl.series);
    PL_K.forEach((k) => {
      r.series[k] = pl.series[k].map((v, t) => v / f(t));
    });
    r.at = (t) => {
      const o = scaleKeys(pl.at(t), PL_K, f(Math.max(0, Math.min(T, Math.round(t)))));
      return o;
    };
    r.today = r.at(0);
    r.final = r.at(Math.min(T, pl.lastEvent));
    r.horizon = r.at(Math.min(T, pl.planM));
    r.assetsAt = (t) => {
      const k = f(Math.max(0, Math.min(T, Math.round(t))));
      return pl.assetsAt(t).map((x) => scaleKeys(x, AS_K, k));
    };
    r.snap = r.assetsAt(Math.min(T, pl.planM));
    r.poolAt = (t) => scaleKeys(pl.poolAt(t), PO_K, f(Math.max(0, Math.min(T, Math.round(t)))));
    r.exits = {};
    Object.keys(pl.exits).forEach((id) => {
      r.exits[id] = scaleKeys(pl.exits[id], EX_K, f(pl.exits[id].month));
    });
    r.outsideTotal = pl.outsideTotal / f(T);
    r.balAt = (id, t) => pl.balAt(id, t) / f(t);
    r.autoAt = (id, t) => pl.autoAt(id, t) / f(t);
    r.jobAt = (id, t) => pl.jobAt(id, t) / f(t);
    r.jobs = Object.assign({}, pl.jobs);
    JB_K.forEach((k) => {
      if (pl.jobs[k]) r.jobs[k] = pl.jobs[k].map((v, t) => v / f(t));
    });
    return r;
  }
  const planR = (S) => realPlan(S, plan(S));
  /* the same plan in future dollars or today's dollars: u = 'today' (default) | 'future' */
  const planIn = (S, u) => (u === 'future' ? plan(S) : planR(S));

  /* "Lasts" stress test for one category (rows = plan-end snapshot rows of that category): if about 45% of the assets (the biggest earners) stop earning, rent/profit is gone but the
     fixed costs (tax, insurance, HOA) and the loan payments are still due. Everything is at plan-end values: the fixed costs grow with the asset exactly as its income does (income / today's NOI). */
  function stress(S, pl, rows, cash) {
    const income = rows.reduce((a, x) => a + x.income, 0),
      cf = rows.reduce((a, x) => a + x.cf, 0),
      worth = rows.reduce((a, x) => a + x.value, 0),
      ds = income - cf;
    const costOf = (x) => {
      const h = H(S, x.id),
        v = pl.V[x.id];
      if (!h || !v) return 0;
      const g = Math.abs(v.noi) > 1e-9 ? x.income / v.noi : 1;
      return ((+h.tax || 0) + (+h.ins || 0) + (+h.hoa || 0)) * g;
    };
    const k = Math.max(1, Math.round(rows.length * 0.45)),
      lostOf = (x) => x.income + costOf(x),
      byLoss = rows.slice().sort((a, b) => lostOf(b) - lostOf(a));
    const partial = cf - byLoss.slice(0, k).reduce((a, x) => a + lostOf(x), 0),
      allFail = -(ds + rows.reduce((a, x) => a + costOf(x), 0));
    const useAll = partial >= 0,
      burn = useAll ? allFail : partial,
      c = Math.max(0, cash || 0);
    return {
      income,
      cf,
      worth,
      ds,
      dscr: ds > 0.5 ? income / ds : null,
      k,
      partial,
      allFail,
      useAll,
      burn,
      months: burn >= -0.5 ? Infinity : c <= 0 ? 0 : c / -burn,
    };
  }

  /* Can you afford the plan? Rolls your personal cash forward month by month on top of the portfolio plan. */
  /* month N is written 'month N (Mon YYYY)' in the browser (the app supplies the calendar through window.RepDate); month 0 is always 'today' */
  const mAt = (m) =>
      m <= 0
        ? 'today'
        : m +
          (m === 1 ? ' month' : ' months') +
          ' from today' +
          (root.RepDate && root.RepDate.dtm ? ' (' + root.RepDate.dtm(m) + ')' : ''),
    inM = (m) => mAt(m),
    aroundM = (m) => (m <= 0 ? 'today' : 'around ' + mAt(m));
  function finance(S, pl) {
    const p = S.p;
    if (!p) return null;
    pl = pl || plan(S);
    const real = !!pl.raw;
    if (real)
      pl =
        pl.raw; /* a plan in today's dollars: work it all out in future dollars, then show every figure in today's (see the end of this function) */
    const g = S.g,
      s = pl.series,
      T = pl.T,
      infl = (p.inflation || 0) / 100,
      apy = (p.cashApy || 0) / 1200;
    const N = (n) => new Array(n + 1).fill(0);
    const R = {
      dep: N(T),
      taxable: N(T),
      gm: N(T),
      hours: N(T),
      nBiz: N(T),
      income: N(T),
      portfolio: N(T),
      portTax: N(T),
      extra: N(T),
      living: N(T),
      debts: N(T),
      oneTime: N(T),
      capitalIn: N(T),
      jobSplit: N(T),
      jobSurplus: N(T),
      outsideCall: N(T),
      saleTax: N(T),
      interest: N(T),
      net: N(T),
      liquid: N(T),
      total: N(T),
      reserve: N(T),
      burn: N(T),
      runway: N(T),
    };
    const saleInfo = {};
    S.houses.forEach((h) => {
      const ex = pl.exits[h.id];
      if (ex && ex.month <= T) {
        const st0 = saleTax(S, pl, h);
        saleInfo[h.id] = st0;
        R.saleTax[ex.month] += st0.tax;
      }
    });
    p.planned.forEach((x) => {
      if (x.month <= T) R.oneTime[x.month] += x.amount;
    });
    p.capital.forEach((x) => {
      if (x.month <= T) R.capitalIn[x.month] += x.amount;
    });
    S.houses
      .filter((h) => h.type === 'business')
      .forEach((h) => {
        const a = pl.purchase[h.id],
          b = Math.min(T + 1, pl.sellAt[h.id], pl.mergeAt[h.id]);
        if (isFinite(a)) for (let t = a; t < b && t <= T; t++) R.nBiz[t]++;
      }); /* a business merged into another is one business afterwards: no second manager and no second set of hours */
    let liq = p.cash || 0;
    for (let t = 0; t <= T; t++) {
      const mgr = Math.max(0, R.nBiz[t] - (p.operating || 0));
      R.gm[t] = mgr * (p.gmMonthly || 0) * Math.pow(1 + infl, t / 12);
      R.hours[t] =
        p.jobs.reduce((a, j) => a + (jobMonthly(j, t) > 0 ? j.hours || 0 : 0), 0) +
        Math.min(p.operating || 0, R.nBiz[t]) * (p.bizHours || 0);
      R.income[t] = jobsNet(S, t);
      R.portfolio[t] = s.cf[t];
      R.dep[t] = s.dep[t];
      R.taxable[t] = s.txRE[t] + s.txBiz[t];
      R.portTax[t] = portTaxAt(S, t, s.txRE[t], s.txBiz[t]);
      R.extra[t] = s.extra[t];
      R.living[t] = (p.living || 0) * Math.pow(1 + infl, t / 12);
      R.debts[t] = g.otherDebt || 0;
      R.outsideCall[t] = t === 0 ? s.outside[0] : s.outside[t] - s.outside[t - 1];
      R.net[t] =
        R.income[t] + R.portfolio[t] - R.portTax[t] - R.gm[t] - R.extra[t] - R.living[t] - R.debts[t];
      R.interest[t] = t > 0 ? Math.max(0, liq + s.cash[t - 1]) * apy : 0;
      R.jobSplit[t] = (pl.jobUsed && pl.jobUsed[t]) || 0;
      R.jobSurplus[t] =
        (pl.jobs && pl.jobs.surplus[t]) ||
        0; /* job money that moved into the trust or the loans (never below your cash cushion) */
      liq +=
        (pl.jobs && pl.jobs.credit ? pl.jobs.credit[t] || 0 : 0) +
        R.net[t] +
        R.interest[t] +
        R.capitalIn[t] -
        R.outsideCall[t] -
        R.oneTime[t] -
        (pl.saleTaxPersonal ? pl.saleTaxPersonal[t] || 0 : R.saleTax[t]) -
        (pl.dpCash[t] || 0) -
        R.jobSplit[t];
      R.liquid[t] = liq;
      R.total[t] = liq + s.cash[t];
      R.reserve[t] = (p.emergencyMonths || 0) * (R.living[t] + R.debts[t]);
      R.burn[t] =
        R.living[t] + R.debts[t] + R.extra[t] + R.gm[t] - Math.max(0, R.portfolio[t] - R.portTax[t]);
      R.runway[t] = R.burn[t] > 0.5 ? Math.max(0, R.total[t]) / R.burn[t] : Infinity;
    }
    let minT = Infinity,
      minM = 0,
      gapM = -Infinity,
      gapAt = 0,
      minRun = Infinity,
      minRunM = 0,
      firstShort = -1;
    const dv = (v, t) =>
      real
        ? v / dfac(S, t)
        : v; /* in today's dollars the lowest cash is the lowest of the series as shown (each month in its own dollars) */
    for (let t = 0; t <= T; t++) {
      const tt = dv(R.total[t], t);
      if (tt < minT) {
        minT = tt;
        minM = t;
      }
      const gp = dv(R.reserve[t] - R.total[t], t);
      if (gp > gapM) {
        gapM = gp;
        gapAt = t;
      }
      if (R.runway[t] < minRun) {
        minRun = R.runway[t];
        minRunM = t;
      }
      if (firstShort < 0 && R.total[t] < 0) firstShort = t;
    }
    const worstNet = Math.min.apply(null, R.net),
      callsAll = [];
    for (let t = 0; t <= T; t++)
      if (R.outsideCall[t] > 0.5)
        callsAll.push({
          month: t,
          amount: R.outsideCall[t],
          assets: S.houses
            .filter((h) => pl.purchase[h.id] === t || (h.capex > 0 && h.status === 'owned' && t === 0))
            .map((h) => h.addr),
        });
    const pe = Math.min(T, pl.planM),
      reasons = [],
      fixes = [],
      money = (n, t) =>
        '$' +
        Math.round(Math.abs(n) / (real && t > 0 ? dfac(S, t) : 1)).toLocaleString(
          'en-US',
        ); /* t = the month the amount belongs to (today's dollars divide by that month's factor) */
    let status = 'yes';
    const short = Math.max(0, -minT);
    if (short > 0.5) {
      status = 'no';
      const c = callsAll.filter((x) => x.month <= firstShort).slice(-1)[0];
      reasons.push({
        sev: 'bad',
        text:
          'You run out of cash ' +
          inM(firstShort) +
          ' and would be about ' +
          money(short) +
          ' short at the lowest point, ' +
          mAt(minM) +
          '.',
      });
      fixes.push(
        'Line up at least ' +
          money(short) +
          ' more (partners, investors, family) before ' +
          mAt(firstShort) +
          (c && c.assets.length ? ', when ' + c.assets.join(' and ') + ' closes' : '') +
          ', or push those purchases later.',
      );
    }
    if (R.net[0] < -0.5) {
      if (status === 'yes') status = 'tight';
      reasons.push({
        sev: 'warn',
        text: 'You spend ' + money(-R.net[0]) + ' a month more than you bring in right now.',
      });
      reasons[reasons.length - 1].short = 'You spend more than you earn each month.';
      fixes.push(
        'Close the ' +
          money(-R.net[0]) +
          '/mo gap: raise income, cut living costs, or trim extra payments (' +
          money(R.extra[0]) +
          '/mo now).',
      );
    } else
      reasons.push({
        sev: 'ok',
        short: 'saving ' + money(R.net[0]) + ' a month right now',
        text: 'You save about ' + money(R.net[0]) + ' a month after living costs, debts and extra payments.',
      });
    let peakH = 0,
      peakHM = 0;
    for (let t = 0; t <= T; t++)
      if (R.hours[t] > peakH) {
        peakH = R.hours[t];
        peakHM = t;
      }
    const peakBiz = Math.max.apply(null, R.nBiz),
      gmMax = Math.max.apply(null, R.gm),
      gmMaxM = Math.max(0, R.gm.indexOf(gmMax));
    if (peakH > 70) {
      if (status === 'yes') status = 'tight';
      reasons.push({
        sev: 'warn',
        short: 'The hours do not fit in a week ' + aroundM(peakHM) + '.',
        text:
          'At the busiest point, ' +
          mAt(peakHM) +
          ', you would work about ' +
          Math.round(peakH) +
          ' hours a week between your job and running ' +
          Math.min(p.operating, peakBiz) +
          ' business(es) yourself.',
      });
      fixes.push(
        'Hire a general manager for a business, drop a job, or sell a business sooner. Each manager costs about ' +
          money(p.gmMonthly) +
          '/mo.',
      );
    } else if (peakBiz > 0)
      reasons.push({
        sev: 'ok',
        short: 'about ' + Math.round(peakH) + ' hours a week',
        text:
          'About ' +
          Math.round(peakH) +
          ' hours a week at the busiest point' +
          (gmMax > 0
            ? ', with ' + money(gmMax, gmMaxM) + '/mo of manager pay for businesses you do not run'
            : '') +
          '.',
      });
    const reserveGap = Math.max(0, gapM);
    if (short <= 0.5 && reserveGap > 0.5) {
      if (status === 'yes') status = 'tight';
      reasons.push({
        sev: 'warn',
        short: 'Your cash dips below your emergency reserve ' + inM(gapAt) + '.',
        text:
          'Your cash falls ' +
          money(reserveGap) +
          ' below a ' +
          p.emergencyMonths +
          '-month emergency reserve, ' +
          mAt(gapAt) +
          '.',
      });
      fixes.push(
        'Hold about ' +
          money(reserveGap) +
          ' more cash to keep ' +
          p.emergencyMonths +
          ' months of expenses at all times.',
      );
    } else if (short <= 0.5)
      reasons.push({
        sev: 'ok',
        short: 'reserve covered',
        text: 'Your cash never drops below a ' + p.emergencyMonths + '-month emergency reserve.',
      });
    if (pl.worst.dti > g.dti) {
      if (status === 'yes') status = 'tight';
      reasons.push({
        sev: 'warn',
        short: 'Lenders may decline a loan ' + aroundM(pl.worst.month) + '.',
        text:
          'Lenders may decline: your debt payments reach ' +
          Math.round(pl.worst.dti) +
          '% of qualifying income ' +
          inM(pl.worst.month) +
          ' (limit ' +
          g.dti +
          '%).',
      });
      fixes.push(
        'Raise qualifying income, add a co-signer, or lower the loan sizes that close ' +
          aroundM(pl.worst.month) +
          '.',
      );
    } else
      reasons.push({
        sev: 'ok',
        short: 'lenders should approve',
        text:
          'Lenders should approve the loans: debt payments peak at ' +
          Math.round(pl.worst.dti) +
          '% of qualifying income (limit ' +
          g.dti +
          '%).',
      });
    if (isFinite(minRun) && minRun < 3 && short <= 0.5) {
      if (status === 'yes') status = 'tight';
      reasons.push({
        sev: 'warn',
        short: 'You have little cushion if your paycheck stops.',
        text:
          'If your job income stopped ' +
          inM(minRunM) +
          ', your cash would last only ' +
          minRun.toFixed(1) +
          ' months.',
      });
      fixes.push('Build cash or portfolio income so you could last at least 3 months without a paycheck.');
    }
    if (pl.lastBuy > pl.planM) {
      if (status === 'yes') status = 'tight';
      reasons.push({
        sev: 'warn',
        short:
          'The plan runs past its ' +
          Math.round(pl.planM / 12) +
          (Math.round(pl.planM / 12) === 1 ? ' year' : ' years') +
          ': the last purchase is ' +
          inM(pl.lastBuy) +
          '.',
        text:
          'The last purchase comes ' +
          inM(pl.lastBuy) +
          ', after the ' +
          Math.round(pl.planM / 12) +
          '-year plan ends, ' +
          mAt(pl.planM) +
          ', so the plan-end numbers leave out part of it. Your job money left over after living costs is ' +
          money(R.jobSurplus[0]) +
          '/mo; the default plan assumes about $2,000.',
      });
      fixes.push(
        'Raise the job money left after living costs, or lower the sizes of the early purchases, so the last one closes inside the plan.',
      );
    }
    const firstWarn = reasons.find((x) => x.sev === 'warn');
    const headline =
      status === 'yes'
        ? 'Yes. You can carry this plan.'
        : status === 'tight'
          ? 'Tight. ' + (firstWarn ? firstWarn.short || firstWarn.text : 'It works, but with thin margins.')
          : 'Not yet. You run short of cash ' + inM(firstShort) + '.';
    const totalOutside = s.outside[T],
      capitalTotal = p.capital.reduce((a, x) => a + x.amount, 0);
    const out = {
      series: R,
      T,
      status,
      headline,
      saleInfo,
      reasons,
      fixes,
      calls: callsAll,
      kpis: {
        planEnd: {
          month: pe,
          cfBefore: R.portfolio[pe],
          tax: R.portTax[pe],
          cfAfter: R.portfolio[pe] - R.portTax[pe],
          net: R.net[pe],
        },
        peakHours: peakH,
        peakHoursMonth: peakHM,
        managerCost0: R.gm[0],
        managerCostMax: gmMax,
        peakBusinesses: peakBiz,
        takeHome: R.income[0],
        portfolioAfterTax: R.portfolio[0] - R.portTax[0],
        extra: R.extra[0],
        living: R.living[0],
        debts: R.debts[0],
        net0: R.net[0],
        worstNet,
        cash0: p.cash,
        reserveMonths0: R.living[0] + R.debts[0] > 0 ? p.cash / (R.living[0] + R.debts[0]) : Infinity,
        jobSurplus0: R.jobSurplus[0],
        jobSplit0: R.jobSplit[0],
        jobSurplusMax: Math.max.apply(null, R.jobSurplus),
        minLiquid: minT,
        minLiquidMonth: minM,
        shortAmount: short,
        firstShortMonth: firstShort,
        reserveTarget0: R.reserve[0],
        reserveGap,
        runway0: R.runway[0],
        minRunway: minRun,
        totalOutside,
        capitalTotal,
        savingsUsed: Math.min(p.cash, totalOutside),
        gap: Math.max(0, totalOutside - p.cash - capitalTotal),
        dtiPeak: pl.worst.dti,
        reserveGapMonth: gapAt,
      },
    };
    /* can-I-buy-this: the portfolio verdict is the worst of this one and the feasibility tests (a planned asset that cannot be funded or financed is 'no', never 'tight') */
    const feas = feasible(S, pl, out, true);
    out.feas = feas;
    const RK = { yes: 0, tight: 1, no: 2 };
    if (RK[feas.verdict] > RK[out.status]) {
      const wasNo = out.status === 'no';
      out.status = feas.verdict;
      if (!wasNo) out.headline = feas.headline;
    }
    const lead = feas.reasons
      .filter((x) => x.asset || /^p-(funding|cltv|concentration|earners)$/.test(x.id))
      .map((x) => ({ sev: x.sev, text: x.text, short: x.short }));
    out.reasons = lead.concat(out.reasons);
    const topAsset =
      feas.reasons.find((x) => x.asset && x.sev === 'bad') || feas.reasons.find((x) => x.asset);
    if (topAsset) {
      const sf = shortfall(S, pl, out, topAsset.asset);
      if (sf) sf.changes.slice(0, 2).forEach((c) => out.fixes.push(c.text + '.'));
    }
    return real ? finToday(S, out, pl) : out;
  }
  /* a finance result in today's dollars: every money series is divided by the factor of its own month; an amount that belongs to one month (lowest cash, cash needed, ...) by that month's factor */
  const FN_K = [
    'dep',
    'taxable',
    'gm',
    'income',
    'portfolio',
    'portTax',
    'extra',
    'living',
    'debts',
    'oneTime',
    'capitalIn',
    'jobSplit',
    'jobSurplus',
    'outsideCall',
    'saleTax',
    'interest',
    'net',
    'liquid',
    'total',
    'reserve',
    'burn',
  ];
  function finToday(S, f, pl) {
    const T = f.T,
      d = (m) => dfac(S, Math.min(T, m)),
      k = f.kpis,
      pe = k.planEnd.month,
      p = S.p;
    FN_K.forEach((n) => {
      f.series[n] = f.series[n].map((v, t) => v / d(t));
    });
    f.calls = f.calls.map((c) => Object.assign({}, c, { amount: c.amount / d(c.month) }));
    Object.keys(f.saleInfo).forEach((id) => {
      f.saleInfo[id] = scaleKeys(
        f.saleInfo[id],
        ['gain', 'dep', 'tax', 'ltcg', 'rec1250', 'ordinary', 'niit', 'state'],
        d(pl.exits[id].month),
      );
    });
    const R = f.series,
      cap = p.capital.reduce((a, x) => a + x.amount / d(x.month), 0),
      tot = k.totalOutside / d(T);
    Object.assign(k, {
      planEnd: {
        month: pe,
        cfBefore: R.portfolio[pe],
        tax: R.portTax[pe],
        cfAfter: R.portfolio[pe] - R.portTax[pe],
        net: R.net[pe],
      },
      managerCost0: R.gm[0],
      managerCostMax: Math.max.apply(null, R.gm),
      takeHome: R.income[0],
      portfolioAfterTax: R.portfolio[0] - R.portTax[0],
      extra: R.extra[0],
      living: R.living[0],
      debts: R.debts[0],
      net0: R.net[0],
      worstNet: Math.min.apply(null, R.net),
      jobSurplus0: R.jobSurplus[0],
      jobSplit0: R.jobSplit[0],
      jobSurplusMax: Math.max.apply(null, R.jobSurplus),
      reserveTarget0: R.reserve[0],
      totalOutside: tot,
      capitalTotal: cap,
      savingsUsed: Math.min(p.cash, tot),
      gap: Math.max(0, tot - p.cash - cap),
    });
    return f;
  }

  /* Can the lenders carry this purchase? Debt-to-income (including your own rent or mortgage) in the month the trust buys the asset. Assets owned today have nothing to afford. */
  function afford(S, h, pl, fe) {
    pl = pl || plan(S);
    if (fe && h && fe.assets && fe.assets[h.id]) {
      const A =
        fe.assets[
          h.id
        ]; /* the full can-I-buy-this result: the verdict, its kind (nofund / nolender / nocashflow) and the one short clause */
      const cls = A.verdict === 'no' ? 'bad' : A.verdict === 'tight' ? 'warn' : 'ok',
        b = afford(S, h, pl);
      return Object.assign({}, b, {
        cls,
        verdict: A.verdict,
        kind: A.kind,
        short: A.short,
        criteria: A.criteria,
        txt: cls === 'ok' ? '✓ Afford' : cls === 'warn' ? '△ Tight' : '✗ Short',
        why: A.top ? A.top.text : b.why,
      });
    }
    if (!h || h.status === 'owned') return { cls: 'na', txt: 'Owned', why: 'You already own this one.' };
    const m = pl.purchase[h.id];
    if (!isFinite(m))
      return {
        cls: 'bad',
        txt: '✗ Not reachable',
        why: 'The trust (all the assets before it) cannot fund this within 50 years.',
      };
    const dti = pl.series.dti[Math.min(pl.T, m)],
      lim = S.g.dti;
    if (dti >= 999)
      return { cls: 'bad', dti, txt: '✗ Short', why: 'No qualifying income is set (see Assumptions).' };
    const cls = dti <= lim * 0.8 ? 'ok' : dti <= lim ? 'warn' : 'bad';
    return {
      cls,
      dti,
      txt: cls === 'ok' ? '✓ Afford' : cls === 'warn' ? '△ Tight' : '✗ Short',
      why:
        'Debt-to-income ' +
        dti.toFixed(0) +
        '% (including your own rent or mortgage) vs ' +
        lim +
        '% limit when ' +
        h.addr +
        ' closes.',
    };
  }
