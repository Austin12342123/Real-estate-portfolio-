  /* ---------- TODAY'S TERMS for the main page: the assets' own numbers at month 0 (2026*: today's dollars, no inflation, nothing grown). One function feeds the Planned and Real pages; ids = the assets to add up. ---------- */
  function todayTotals(S, pl, ids) {
    if (pl && pl.raw) pl = pl.raw;
    pl = pl || plan(S);
    const o = { n: 0, cf: 0, payment: 0, noi: 0, ds: 0, price: 0, rent: 0, dscr: null };
    (ids || S.houses.map((h) => h.id)).forEach((id) => {
      const v = pl.V[id],
        h = H(S, id);
      if (!v || !h) return;
      o.n++;
      o.cf += v.cf;
      o.payment += v.payment;
      o.noi += v.noi;
      o.ds += v.P + v.mip;
      o.price += +h.price || 0;
      o.rent += +h.rent || 0;
    });
    /* net worth NOW (this month, today's dollars): for the BOUGHT assets among ids, value - loan - liens - credit line drawn (engine month 0, the same terms as series.nw), plus the savings you hold today, plus the cash the trust holds today (o.trust). Planned assets are not owned yet, so they add nothing. */
    const ask = {};
    (ids || S.houses.map((h) => h.id)).forEach((id) => {
      const h = H(S, id);
      if (h && h.status === 'owned') ask[id] = 1;
    });
    o.eq = 0;
    if (pl.assetsAt)
      pl.assetsAt(0).forEach((x) => {
        if (ask[x.id]) o.eq += x.equity;
      });
    o.cash = S.p ? Math.max(0, +S.p.cash || 0) : 0;
    o.trust = Math.max(0, (pl.series && pl.series.cash && pl.series.cash[0]) || 0);
    o.nw = netWorth(o.eq, o.cash, o.trust); /* NET WORTH TODAY = bought assets (value - loan - liens - credit line) + your savings + the cash the trust holds today (the engine's month-0 trust cash, separate from your savings, so nothing is counted twice) */
    o.dscr =
      o.ds > 0.5
        ? o.noi / o.ds
        : null; /* DSCR = income before the loan / loan payment (principal + interest + mortgage insurance), the same ratio the asset page shows */
    return o;
  }

  /* ---------- THE CHECKS CARD: every check the app runs, in one list. The card on the main page is generated from this list, so it cannot drift: the portfolio tests of E.feasible, plus the two roll-ups (assets you can buy, cash beyond savings).
     Each item: { id (the row's test id), key, label, status: 'ok' | 'caution' | 'fail', value, limit, how, info (glossary key) }. fin = the finance result the page already has (or null without a personal profile). ---------- */
  const CHK_ORDER = [
    'p-funding',
    'p-cash',
    'p-runway',
    'p-hours',
    'p-dti',
    'p-cltv',
    'p-earners',
    'p-concentration',
  ];
  const CHK_ID = {
    'p-funding': 'check-pace',
    'p-cash': 'check-cushion',
    'p-runway': 'check-runway',
    'p-hours': 'check-hours',
    'p-dti': 'check-dti',
    'p-cltv': 'check-cltv',
    'p-earners': 'check-lasts',
    'p-concentration': 'check-concentration',
  };
  const CHK_INFO = {
    'p-funding': 'planpace',
    'p-cash': 'cushion',
    'p-runway': 'runway',
    'p-hours': 'hours',
    'p-dti': 'dti',
    'p-cltv': 'cltv',
    'p-earners': 'lasts',
    'p-concentration': 'concentration',
  };
  const CHK_LABEL = {
    'p-funding': 'Plan timing',
    'p-cash': 'Cash cushion',
    'p-runway': 'If the paycheck stops',
    'p-hours': 'Hours in a week',
    'p-dti': 'Debt-to-income peak',
    'p-cltv': 'Debt vs value',
    'p-earners': 'If big earners stop',
    'p-concentration': 'Concentration',
  }; /* short labels: a row label never wraps at 320px */
  function checkList(S, pl, fin) {
    const real = !!(pl && pl.raw),
      plIn =
        pl; /* plIn = the plan as the page shows it (today's dollars or future): money totals come from it */
    if (pl && pl.raw) pl = pl.raw;
    pl = pl || plan(S);
    if (fin === undefined) fin = S.p ? finance(S, pl) : null;
    const fe = feasible(S, pl, fin),
      out = [],
      planned = fe.planned.map((id) => fe.assets[id]),
      nPl = planned.length,
      noStart = nPl > 0 && pl.unfunded.length === nPl,
      anyOwned = S.houses.some((h) => h.status === 'owned'),
      kp = fin ? fin.kpis : null,
      g = S.g;
    CHK_ORDER.forEach((k) => {
      const c = fe.criteria.find((x) => x.id === k);
      if (!c) return;
      if (!nPl && /^p-(funding|cltv|concentration|earners)$/.test(k))
        return; /* plan-only tests: nothing is planned */
      if (k === 'p-dti' && noStart && !anyOwned)
        return; /* nothing can be funded: there is no debt peak to measure */
      let value = c.measured,
        how = c.how,
        limit = c.limit;
      if (k === 'p-funding' && !noStart && c.status !== 'fail' && isFinite(pl.lastBuy) && !pl.unfunded.length)
        value =
          'last ' +
          pl.lastBuy +
          ' mo'; /* short value (the date is in the line under it): the value never overflows a row at 320px */
      if (k === 'p-funding' && noStart) {
        value = 'cannot start';
        how =
          'None of the ' +
          nPl +
          ' planned asset' +
          (nPl === 1 ? '' : 's') +
          ' can be funded under the current numbers, so the plan cannot start. The first purchase needs your savings above the cushion plus your job money, and they do not reach it.';
      }
      if (k === 'p-cash' && kp) {
        const cash0 = +S.p.cash || 0,
          low = Math.min(kp.minLiquid, cash0),
          lowM = kp.minLiquid > cash0 ? 0 : kp.minLiquidMonth,
          rsvLow = fin.series.reserve[Math.min(fin.T, kp.minLiquidMonth)] || kp.reserveTarget0,
          short = Math.max(0, -kp.minLiquid); /* the lowest cash is never above the cash you have today */
        value = kp.minLiquid < 0 ? 'short ' + fm(short) : 'lowest ' + fm(low);
        how =
          kp.minLiquid < 0
            ? 'Your cash runs out ' +
              inM(kp.firstShortMonth) +
              ' and would be about ' +
              fm(short) +
              ' short at the lowest point, ' +
              mAt(kp.minLiquidMonth) +
              '.'
            : 'Lowest cash is ' +
              fm(low) +
              (lowM <= 0
                ? ' today' + (root.RepDate && root.RepDate.dt ? ' (' + root.RepDate.dt(0) + ')' : '')
                : ', ' + mAt(lowM)) +
              '; your cushion at that point is ' +
              fm(rsvLow) +
              (real ? " (both in today's dollars)" : ' (the cushion grows with inflation)') +
              '.';
        limit = 'above your ' + (S.p.emergencyMonths || 0) + '-month cushion';
      }
      if (k === 'p-dti')
        how =
          c.status === 'fail'
            ? 'Peaks at ' +
              pl.worst.dti.toFixed(0) +
              '% of qualifying income ' +
              inM(pl.worst.month) +
              ', over the ' +
              g.dti +
              '% limit: a lender may decline a loan then.'
            : 'Highest debt payments are ' +
              pl.worst.dti.toFixed(0) +
              '% of qualifying income, ' +
              inM(pl.worst.month) +
              '; lenders should approve every loan (limit ' +
              g.dti +
              '%).';
      out.push({
        id: CHK_ID[k],
        key: k,
        label: CHK_LABEL[k],
        status: c.status,
        value,
        limit,
        how,
        info: CHK_INFO[k],
      });
    });
    const notYes = planned.filter((x) => x.verdict !== 'yes'),
      top = notYes.slice().sort((a, b) => (b.verdict === 'no') - (a.verdict === 'no'))[0];
    if (nPl)
      out.push({
        id: 'check-buy',
        key: 'buy',
        label: 'Assets you can buy',
        status: notYes.some((x) => x.verdict === 'no') ? 'fail' : notYes.length ? 'caution' : 'ok',
        value: nPl ? nPl - notYes.length + ' of ' + nPl : 'none planned',
        limit: nPl ? 'all ' + nPl : 'none planned',
        how: top
          ? top.addr +
            ': ' +
            (top.top ? top.top.text : '') +
            (notYes.length > 1 ? ' (+' + (notYes.length - 1) + ' more)' : '')
          : 'every planned asset passes its own tests',
        info: 'buyscore',
      });
    const cash0 = S.p ? +S.p.cash || 0 : 0,
      hasCap = !!(S.p && S.p.capital.some((c) => c.amount > 0)),
      outT = plIn.outsideTotal;
    if (nPl && outT > 0)
      out.push({
        id: 'outside-cash',
        key: 'outside',
        label: hasCap ? 'Cash beyond the trust' : 'Paid from your own pocket',
        status:
          kp && kp.shortAmount > 0.5
            ? 'fail'
            : kp && (outT > cash0 || kp.reserveGap > 0.5)
              ? 'caution'
              : 'ok',
        value: fm(outT),
        limit: S.p ? 'your savings ' + fm(cash0) : 'none set',
        how: hasCap
          ? 'Needs this much cash beyond what the trust funds (partners, investors, savings).'
          : 'Your own cash for the down payments the trust cannot fund (the first purchase and anything beyond it)' +
            (S.p
              ? outT <= cash0
                ? '. Your ' + fm(cash0) + ' of savings covers it.'
                : '. That is more than your ' + fm(cash0) + ' of savings.'
              : '.'),
        info: 'outsidecash',
      });
    return out;
  }

