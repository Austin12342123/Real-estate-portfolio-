  /* The shortfall panel for one planned asset: the cash lines, the monthly lines and what would have to change, every number from the live plan. opts.sim = also try the plan with the asset moved to the end of the buy order (one extra plan run). */
  function shortfall(S, pl, fin, id, opts) {
    if (pl && pl.raw) pl = pl.raw;
    pl = pl || plan(S);
    fin = fin || finance(S, pl);
    const h = H(S, id);
    if (!h || h.status === 'owned') return null;
    const F = fin && fin.feas ? fin.feas : feasible(S, pl, fin),
      A = F.assets[id];
    if (!A) return null;
    const c = A.cash,
      mo = A.monthly,
      v = pl.V[id],
      tr = pl.trust[id],
      g = S.g,
      type = h.type || 'house',
      ch = [];
    const cfNow =
        tr && tr.ok && tr.pooled ? Math.max(0, tr.cf || 0) / dfac(S, tr.month) : mo.poolCf + mo.personal,
      perMo = cfNow > 0.5 ? cfNow : 0;
    const fund = A.criteria.find((x) => x.id === 'funding'),
      dsc = A.criteria.find((x) => x.id === 'dscr'),
      car = A.criteria.find((x) => x.id === 'carry');
    const needAt = (price) => needFor(S, Object.assign({}, h, { price }));
    if (c.short > 0.5) {
      ch.push({
        id: 'cash',
        text:
          'Raise ' +
          fm(c.short) +
          ' more cash' +
          (perMo > 0
            ? ' (about ' + Math.ceil(c.short / perMo) + ' months at ' + fm(perMo) + '/mo of cash flow)'
            : ' (the portfolio has no spare monthly cash flow to build it)'),
        amount: c.short,
        months: perMo > 0 ? Math.ceil(c.short / perMo) : null,
      });
      const n1 = needAt(1e6),
        n0 = needAt(0),
        slope = (n1 - n0) / 1e6;
      if (slope > 0 && c.have > n0) {
        const P = Math.floor((c.have - n0) / slope);
        if (P > 0 && P < h.price)
          ch.push({
            id: 'price',
            text: 'Lower the price to ' + fm(P) + ' or less (now ' + fm(h.price) + ')',
            price: P,
          });
      }
      const fits = loansFor(type, h)
        .filter(
          (l) =>
            l.id !== h.loanId &&
            !l.ownerOcc &&
            !l.finRehab &&
            !l.info &&
            (type !== 'house' || !h.kind || h.kind !== 'multi' || mfFit(l, unitsOf(h), !!h.pack).ok),
        )
        .filter((l) => !FEAS.loanMax[l.id] || (h.price * (100 - l.dp)) / 100 <= FEAS.loanMax[l.id])
        .map((l) => ({
          id: l.id,
          name: l.name,
          need: (h.price * (l.dp + l.closing)) / 100 + (h.finCapex ? 0 : Math.max(0, h.capex || 0)),
          dp: l.dp,
        }))
        .sort((a, b) => a.need - b.need);
      const ok2 = fits.filter((l) => l.need <= c.have + 0.5);
      if (ok2.length)
        ch.push({
          id: 'loan',
          text:
            'Pick a loan that needs less down: ' +
            ok2
              .slice(0, 3)
              .map((l) => l.name + ' (' + fm(l.need) + ' to close)')
              .join('; '),
          loans: ok2.slice(0, 3),
        });
      else if (fits.length && fits[0].need < c.need - 0.5)
        ch.push({
          id: 'loan',
          text:
            'No loan in the app fits what you can pull out; the lowest is ' +
            fits[0].name +
            ', ' +
            fm(fits[0].need) +
            ' to close',
          loans: fits.slice(0, 1),
        });
    }
    if (!mo.covered) {
      const need2 = -mo.short;
      ch.push({
        id: 'cashflow',
        text: 'Add ' + fm(need2) + '/mo of cash flow to carry the payment',
        amount: need2,
      });
    }
    if (tr && tr.ok && fund.status !== 'ok' && fund.status !== 'fail')
      ch.push({ id: 'wait', text: 'Wait: the plan funds it ' + inM(tr.month), month: tr.month });
    if (dsc && dsc.status === 'fail') {
      const min = dscrMinOf(h),
        want = min * mo.payment - v.noi,
        k = type === 'business' ? 1 : (1 - g.vac / 100) * (1 - mgmtOf(S, h) / 100);
      if (want > 0)
        ch.push({
          id: 'rent',
          text:
            'Raise ' +
            (type === 'business' ? 'profit' : 'rent') +
            ' by ' +
            fm(want / k) +
            '/mo so the loan reaches DSCR ' +
            min,
          amount: want / k,
        });
    } else if (!mo.covered) {
      const k = type === 'business' ? 1 : (1 - g.vac / 100) * (1 - mgmtOf(S, h) / 100);
      ch.push({
        id: 'rent',
        text: 'Raise ' + (type === 'business' ? 'profit' : 'rent') + ' by ' + fm(-mo.short / k) + '/mo',
        amount: -mo.short / k,
      });
    }
    const after = S.houses
        .slice(S.houses.indexOf(h) + 1)
        .filter((q) => q.status !== 'owned' && pl.trust[q.id] && pl.trust[q.id].ok && pl.V[q.id].cf > 0),
      z = after.reduce((a, q) => a + pl.V[q.id].cf, 0);
    if (c.short > 0.5 && after.length && z > 0.5) {
      const o = {
        id: 'earlier',
        text:
          'Buy the ' +
          after.length +
          ' assets after it first (they add ' +
          fm(z) +
          '/mo of cash flow) by moving it down the buy order',
        amount: z,
        n: after.length,
      };
      if (opts && opts.sim) {
        const S2 = JSON.parse(JSON.stringify(S)),
          ids = S2.houses
            .filter((q) => q.status !== 'owned')
            .map((q) => q.id)
            .filter((q) => q !== id)
            .concat([id]);
        reorder(S2, ids);
        const p2 = plan(S2),
          m2 = p2.purchase[id];
        o.simMonth = isFinite(m2) ? m2 : null;
        o.text += isFinite(m2) ? ': then it is bought ' + inM(m2) : ': it still cannot be funded in the plan';
      }
      ch.push(o);
    }
    return {
      id,
      verdict: A.verdict,
      cash: c,
      monthly: mo,
      changes: ch,
      lines: {
        cashNeeded: {
          label: 'Cash needed to close',
          value: c.need,
          how:
            'down ' +
            fm(c.down) +
            ' + closing ' +
            fm(c.closing) +
            (c.rehab > 0 ? ' + cash rehab ' + fm(c.rehab) : '') +
            ' = ' +
            fm(c.need),
        },
        savings: {
          label: 'Your savings above the cushion',
          value: c.savings,
          how: c.pooled
            ? 'savings fund only the first purchase; later ones come from the trust'
            : 'cash on hand above the ' +
              ((S.p && S.p.emergencyMonths) || 0) +
              '-month reserve, plus job money saved by then',
        },
        trustCash: {
          label: 'Cash the trust holds',
          value: c.trustCash,
          how:
            'cash held by the assets above it' +
            (c.closest ? ' at the closest month, ' + mAt(c.month) : c.pooled ? ' ' + inM(c.month) : ''),
        },
        room: {
          label: 'Borrowing room',
          value: c.room,
          how:
            g.cap +
            "% of the assets' value (a business " +
            g.capBiz +
            '%) less their loans and what is already drawn',
        },
        pull: {
          label: 'Cash you can pull out then',
          value: c.have,
          how: fm(c.savings) + ' + ' + fm(c.trustCash) + ' + ' + fm(c.room) + ' = ' + fm(c.have),
        },
        downShort:
          c.short > 0.5
            ? {
                label: 'Down payment short',
                value: -c.short,
                how: fm(c.have) + ' can pull out - ' + fm(c.need) + ' needed = ' + sgn(c.have - c.need),
              }
            : {
                label: 'Down payment covered',
                value: c.have - c.need,
                how: fm(c.have) + ' can pull out - ' + fm(c.need) + ' needed = ' + fm(c.have - c.need) + ' to spare',
                suf: ' to spare',
              },
        uncovered: {
          label: 'Money still uncovered',
          value: c.uncovered > 0 ? -c.uncovered : 0,
          how: fm(c.have) + ' can pull out - ' + fm(c.need) + ' cash to close = ' + sgn(c.have - c.need),
        },
        payment: {
          label: 'New loan payment',
          value: mo.payment,
          how:
            'principal + interest' +
            (mipMonthly(h) > 0 ? ' + mortgage insurance ' + fm(mipMonthly(h)) : '') +
            ' on ' +
            fm(loan(h)) +
            ' at ' +
            h.rate +
            '%' +
            (type !== 'business' && (h.tax || h.ins || h.hoa) ? ' (property costs are not in this figure)' : ''),
        },
        available: {
          label: 'Cash flow available to carry it',
          value: mo.available,
          how:
            'asset income ' +
            fm(mo.asset) +
            ' + pool ' +
            fm(mo.poolCf) +
            (mo.personal > 0 ? ' + your surplus ' + fm(mo.personal) : '') +
            " per month, today's dollars",
        },
        monthShort: {
          label: mo.covered ? 'Monthly cash flow covered' : 'Monthly cash flow short',
          value: mo.short,
          how: fm(mo.available) + ' available - ' + fm(mo.payment) + ' payment = ' + sgn(mo.short) + '/mo',
        },
      },
    };
  }

