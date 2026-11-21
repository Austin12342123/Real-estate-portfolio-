  /* ---------- CAN I BUY THIS? One test list per planned asset and one for the whole portfolio ----------
     Every criterion is { id, label, status: 'ok' | 'caution' | 'fail', measured, limit, how, hard, kind, text, short }.
     hard = a fail that makes the verdict 'no' (cannot be funded in the plan, a lender test fails, the monthly money does not carry it, a home loses money). Any other caution or fail makes it 'tight'.
     Money for the funding test is exactly what the plan uses (pl.trust: the pool's borrowing room + the cash it holds, or your savings above the cushion for the first purchase), at the month the plan buys it;
     monthly figures are in today's dollars. Nothing here is stored: it is worked out again from the live state each time it is asked for. */
  /* Cap-rate rules of thumb, ONE table (rough guides, not advice; edit here). Below low = Low, at or above good = Good, between = Okay. A business is valued on earnings, so its cap rate is 1 / the price multiple. */
  const CAP_RANGES = {
    house: { low: 5, good: 7 },
    multi: { low: 5.5, good: 7 },
    commercial: { low: 6, good: 8 },
    business: { low: 15, good: 25 },
  };
  const capKind = (h) => (h && h.type === 'house' && h.kind === 'multi' ? 'multi' : h && h.type);
  const capVerdict = (kind, cap) => {
    const r = CAP_RANGES[kind];
    if (!r || typeof cap !== 'number' || !isFinite(cap)) return null;
    return cap >= r.good ? 'good' : cap < r.low ? 'low' : 'ok';
  };
  const FEAS = {
    concCaution: 35,
    concFail: 60,
    concMin: 3,
    capMin: 4,
    vacPts: 10,
    ratePts: 2,
    dscrDefault: 1.25,
    dscrNear: 0.05,
    runCaution: 3,
    runFail: 1,
    dtiCaution: 0.85,
    pace: 0.9,
    lastsCaution: 3,
    lastsFail: 1,
    loanMax: { sba7a: 5000000 },
  };
  const fm = (n) => {
    const a = Math.abs(+n || 0);
    return '$' + (a >= 1e6 ? String(+(a / 1e6).toFixed(2)) + 'M' : Math.round(a).toLocaleString('en-US'));
  };
  const sgn = (n) => (n < -0.5 ? '−' : '') + fm(n);
  const dscrMinOf = (h) => {
    const l = loanById(h.loanId);
    return l || MINDSCR[h.loanId] != null ? minDscrOf(h.loanId) : FEAS.dscrDefault;
  };
  const mkC = (id, label, status, measured, limit, how, o) =>
    Object.assign(
      { id, label, status, measured, limit, how, hard: false, kind: '', text: '', short: '' },
      o || {},
    );
  const worstOf = (cs) =>
    cs.reduce(
      (a, c) => (c.status === 'fail' ? 'fail' : c.status === 'caution' && a !== 'fail' ? 'caution' : a),
      'ok',
    );
  const FRANK = { fail: 0, caution: 1, ok: 2 },
    KRANK = { nofund: 0, nolender: 1, nocashflow: 2, '': 3 };
  const sortC = (cs) =>
    cs
      .slice()
      .sort(
        (a, b) =>
          FRANK[a.status] - FRANK[b.status] ||
          (b.hard ? 1 : 0) - (a.hard ? 1 : 0) ||
          KRANK[a.kind || ''] - KRANK[b.kind || ''],
      );
  function feasAsset(S, pl, fin, h, ctx) {
    const g = S.g,
      v = pl.V[h.id],
      tr = pl.trust[h.id],
      T = pl.T,
      planM = pl.planM,
      type = h.type || 'house',
      ok = tr.ok,
      m0 = ok ? tr.month : Infinity;
    const L = loan(h),
      pay = payment(h) + mipMonthly(h),
      noi = v.noi,
      need = tr.need,
      price = h.price,
      yrs = Math.round(planM / 12);
    const bm = ok ? m0 : tr.best ? tr.best.month : 0,
      mi2 = Math.max(0, Math.min(T, bm)),
      dfm = dfac(S, mi2),
      pa = pl.poolAt(mi2);
    let have = 0,
      room = 0,
      tcash = 0,
      sav = 0;
    const pooled = ok ? !!tr.pooled : pa.n > 0;
    if (ok) {
      have = tr.have;
      if (pooled) {
        room = tr.room;
        tcash = tr.heldCash || 0;
      } else sav = tr.have;
    } else if (tr.best) {
      have = tr.best.avail;
      if (pooled) {
        tcash = Math.min(pa.cash, have);
        room = have - tcash;
      } else sav = have;
    }
    const cashShort = Math.max(0, need - have),
      uncovered = cashShort /* what is still missing of the cash to close (not of the full price) */,
      down = downAmt(h),
      closing = (price * clPct(S, h)) / 100,
      rehab = h.finCapex ? 0 : Math.max(0, h.capex || 0);
    const poolCf = Math.max(0, pa.cf) / dfm,
      personal = !pooled && fin ? Math.max(0, fin.kpis.net0 || 0) : 0,
      avail = poolCf + noi + personal,
      absorb = fin
        ? Math.max(0, fin.series.net[mi2] / dfm, poolCf + personal)
        : poolCf +
          personal; /* what you can absorb if the asset earns less: your whole monthly surplus (job + portfolio - living costs, extra payments) */
    const cs = [],
      add = (c) => {
        cs.push(c);
        return c;
      };
    /* 1) funding */
    const pc = Math.round(planM * FEAS.pace);
    const how1 =
      'needs ' +
      fm(need) +
      ' (down ' +
      fm(down) +
      ' + closing ' +
      fm(closing) +
      (rehab > 0 ? ' + rehab ' + fm(rehab) : '') +
      '); can pull out ' +
      fm(have) +
      ' (' +
      (pooled ? 'room ' + fm(room) + ' + trust cash ' + fm(tcash) : 'savings above the cushion ' + fm(sav)) +
      ')' +
      (ok ? ' by ' + mAt(m0) : '');
    if (!ok)
      add(
        mkC(
          'funding',
          'Cash to close',
          'fail',
          fm(have) + ' of ' + fm(need),
          'needs ' + fm(need),
          how1 + ' - the plan never reaches it',
          {
            hard: true,
            kind: 'nofund',
            text: 'Not possible: needs ' + fm(need) + ', the plan never reaches it',
            short: 'Not possible - short ' + fm(cashShort),
          },
        ),
      );
    else if (m0 > planM)
      add(
        mkC('funding', 'Cash to close', 'fail', mAt(m0), 'by ' + mAt(planM), how1, {
          hard: true,
          kind: 'nofund',
          text: 'Not possible: funded only ' + inM(m0) + ', after the ' + yrs + '-year plan ends',
          short: 'Not possible - funded only ' + inM(m0),
        }),
      );
    else if (m0 > pc)
      add(
        mkC('funding', 'Cash to close', 'caution', mAt(m0), 'by ' + mAt(pc), how1, {
          kind: 'nofund',
          text: 'Late: funded only ' + inM(m0) + ', near the end of the ' + yrs + '-year plan',
          short: 'Late - funded ' + inM(m0),
        }),
      );
    else add(mkC('funding', 'Cash to close', 'ok', fm(have) + ' of ' + fm(need), 'needs ' + fm(need), how1));
    /* 2) lender tests */
    const dmin = dscrMinOf(h),
      hasLoan = L > 0.5 && pay > 0.5,
      dscr = hasLoan ? noi / pay : Infinity;
    if (!hasLoan)
      add(mkC('dscr', 'Loan DSCR', 'ok', 'no loan', '', 'No loan on this asset, so no lender test.'));
    else
      add(
        mkC(
          'dscr',
          'Loan DSCR',
          dscr < dmin - FEAS.dscrNear ? 'fail' : dscr < dmin + FEAS.dscrNear ? 'caution' : 'ok',
          dscr.toFixed(2),
          'min ' + dmin,
          'income ' +
            fm(noi) +
            '/mo / loan payment ' +
            fm(pay) +
            '/mo = ' +
            dscr.toFixed(2) +
            ' vs the ' +
            dmin +
            ' this loan wants',
          {
            hard: dscr < dmin - FEAS.dscrNear,
            kind: 'nolender',
            text:
              (dscr < dmin - FEAS.dscrNear ? 'Not possible: ' : '') +
              "the loan's DSCR is " +
              dscr.toFixed(2) +
              (dscr < dmin ? ', under the ' : ', close to the ') +
              dmin +
              ' the lender wants',
            short:
              (dscr < dmin - FEAS.dscrNear ? 'Not possible - ' : 'Tight - ') +
              'DSCR ' +
              dscr.toFixed(2) +
              ' vs ' +
              dmin,
          },
        ),
      );
    const pre = loanById(h.loanId),
      ltv = baseAmt(h) > 0 && hasLoan ? (L / (1 + (h.mipUp || 0) / 100) / baseAmt(h)) * 100 : 0,
      ltvMax = pre && pre.dp < 100 ? 100 - pre.dp : null;
    if (ltvMax === null || !hasLoan)
      add(
        mkC(
          'ltv',
          'Loan-to-value',
          'ok',
          hasLoan ? ltv.toFixed(0) + '%' : 'no loan',
          '',
          hasLoan ? 'Custom loan: no program limit to test.' : 'No loan on this asset.',
        ),
      );
    else
      add(
        mkC(
          'ltv',
          'Loan-to-value',
          ltv > ltvMax + 0.01 ? 'fail' : 'ok',
          ltv.toFixed(0) + '%',
          'max ' + ltvMax + '%',
          'loan ' +
            fm(L) +
            ' / price ' +
            fm(baseAmt(h)) +
            ' = ' +
            ltv.toFixed(0) +
            '% vs the ' +
            ltvMax +
            '% the ' +
            pre.name +
            ' lends',
          {
            hard: ltv > ltvMax + 0.01,
            kind: 'nolender',
            text:
              'Not possible: the loan is ' +
              ltv.toFixed(0) +
              '% of the price, over the ' +
              ltvMax +
              '% this loan lends',
            short: 'Not possible - LTV ' + ltv.toFixed(0) + '% over ' + ltvMax + '%',
          },
        ),
      );
    const cap = FEAS.loanMax[h.loanId];
    add(
      cap
        ? mkC(
            'loanmax',
            'Loan size limit',
            L > cap ? 'fail' : 'ok',
            fm(L),
            'max ' + fm(cap),
            'loan ' + fm(L) + ' vs the ' + fm(cap) + ' this program stops at',
            {
              hard: L > cap,
              kind: 'nolender',
              text: 'Not possible: the loan is ' + fm(L) + ', over the ' + fm(cap) + ' limit of this program',
              short: 'Not possible - loan over ' + fm(cap),
            },
          )
        : mkC(
            'loanmax',
            'Loan size limit',
            'ok',
            hasLoan ? fm(L) : 'no loan',
            'none',
            'This loan has no program size limit in the app.',
          ),
    );
    const dti = pl.series.dti[mi2],
      dl = g.dti;
    add(
      mkC(
        'dti',
        'Total debt-to-income',
        dti >= 999 ? 'fail' : dti > dl ? 'fail' : dti > FEAS.dtiCaution * dl ? 'caution' : 'ok',
        dti >= 999 ? 'no income' : dti.toFixed(0) + '%',
        'max ' + dl + '%',
        'all debt payments incl. this loan and your own housing / qualifying income = ' +
          (dti >= 999 ? 'no qualifying income set' : dti.toFixed(0) + '%') +
          ' ' +
          (ok ? 'when it closes' : 'at the closest month') +
          ' vs ' +
          dl +
          '%',
        {
          hard: dti > dl,
          kind: 'nolender',
          text:
            dti >= 999
              ? 'Not possible: no qualifying income is set'
              : (dti > dl ? 'Not possible: ' : '') +
                'debt-to-income reaches ' +
                dti.toFixed(0) +
                '% with this loan (limit ' +
                dl +
                '%)',
          short:
            dti >= 999
              ? 'Not possible - no income set'
              : (dti > dl ? 'Not possible - ' : 'Tight - ') + 'debt-to-income ' + dti.toFixed(0) + '%',
        },
      ),
    );
    /* 3) reserves after closing, 4) income fit */
    if (fin) {
      const tot = fin.series.total[mi2],
        rsv = fin.series.reserve[mi2],
        runw = fin.series.runway[mi2];
      add(
        mkC(
          'reserve',
          'Reserves after closing',
          tot < 0 ? 'fail' : tot < rsv - 0.5 ? 'caution' : 'ok',
          fm(tot / dfm),
          'keep ' + fm(rsv / dfm),
          'cash after closing ' +
            fm(tot / dfm) +
            ' vs the ' +
            ((S.p && S.p.emergencyMonths) || 0) +
            '-month reserve ' +
            fm(rsv / dfm) +
            " (today's dollars)",
          {
            kind: 'nocashflow',
            text:
              tot < 0
                ? 'Cash runs out around closing'
                : 'Cash after closing is below the ' + ((S.p && S.p.emergencyMonths) || 0) + '-month reserve',
            short: 'Tight - cash below your reserve',
          },
        ),
      );
      add(
        mkC(
          'runway',
          'If the paycheck stops',
          runw < FEAS.runFail ? 'fail' : runw < FEAS.runCaution ? 'caution' : 'ok',
          isFinite(runw) ? runw.toFixed(1) + ' mo' : 'covered',
          'at least ' + FEAS.runCaution + ' mo',
          isFinite(runw)
            ? 'cash ' +
                fm(tot / dfm) +
                ' / monthly burn without the job = ' +
                runw.toFixed(1) +
                ' months of runway'
            : 'portfolio income covers your bills without the job',
          {
            kind: 'nocashflow',
            text:
              'If your paycheck stopped, cash would last only ' +
              (isFinite(runw) ? runw.toFixed(1) : '0') +
              ' months',
            short: 'Tight - thin runway',
          },
        ),
      );
    }
    add(
      mkC(
        'carry',
        'Monthly: carry the payment',
        hasLoan && avail < pay - 0.5 ? 'fail' : 'ok',
        fm(avail) + '/mo',
        'needs ' + fm(pay) + '/mo',
        'payment ' +
          fm(pay) +
          '/mo; available ' +
          fm(avail) +
          '/mo = asset income ' +
          fm(noi) +
          ' + pool cash flow ' +
          fm(poolCf) +
          (personal > 0 ? ' + your monthly surplus ' + fm(personal) : ''),
        {
          hard: hasLoan && avail < pay - 0.5,
          kind: 'nocashflow',
          text:
            'Not possible: the loan payment is ' +
            fm(pay) +
            '/mo but only ' +
            fm(avail) +
            '/mo is available to carry it',
          short: 'Not possible - short ' + fm(pay - avail) + '/mo',
        },
      ),
    );
    /* 5) deal quality */
    const lose = v.cf < -0.5,
      absorbed = -v.cf <= absorb + 0.5;
    if (type === 'house' && lose)
      add(
        mkC(
          'cashflow',
          'Cash flow after the loan',
          'fail',
          sgn(v.cf) + '/mo',
          'not below $0',
          'income ' + fm(noi) + ' - payment ' + fm(pay) + ' = ' + sgn(v.cf) + '/mo',
          {
            hard: true,
            kind: 'nocashflow',
            text:
              'Not possible: a home must never lose money, and this one is ' +
              sgn(v.cf) +
              '/mo after the loan',
            short: 'Not possible - loses ' + fm(-v.cf) + '/mo',
          },
        ),
      );
    else
      add(
        mkC(
          'cashflow',
          'Cash flow after the loan',
          lose && !absorbed ? 'caution' : 'ok',
          sgn(v.cf) + '/mo',
          type === 'house' ? 'not below $0' : 'covered by the pool',
          'income ' +
            fm(noi) +
            ' - payment ' +
            fm(pay) +
            ' = ' +
            sgn(v.cf) +
            '/mo' +
            (lose
              ? '; the pool (' + fm(absorb) + '/mo) ' + (absorbed ? 'covers it' : 'cannot cover it')
              : ''),
          {
            kind: 'nocashflow',
            text: 'The asset loses ' + fm(-v.cf) + '/mo after its loan and the pool cannot cover it',
            short: 'Tight - loses ' + fm(-v.cf) + '/mo',
          },
        ),
      );
    const capR = v.capRate;
    add(
      mkC(
        'cap',
        'Cap rate vs price',
        price > 0 && !(capR >= FEAS.capMin) ? 'caution' : 'ok',
        isFinite(capR) ? capR.toFixed(1) + '%' : '-',
        'at least ' + FEAS.capMin + '%',
        'income ' +
          fm(noi * 12) +
          '/yr / price ' +
          fm(price) +
          ' = ' +
          (isFinite(capR) ? capR.toFixed(1) : '0') +
          '% yield',
        {
          kind: 'nocashflow',
          text:
            'The price is rich: it earns only ' +
            (isFinite(capR) ? capR.toFixed(1) : '0') +
            '% a year on its price',
          short: 'Tight - low yield',
        },
      ),
    );
    const mat = matOf(h),
      rf = v.refi;
    add(
      mat > 0 && hasLoan
        ? mkC(
            'balloon',
            'Balloon / refinance',
            rf && noi < rf.payment ? 'caution' : 'ok',
            rf ? fm(rf.payment) + '/mo refi' : 'paid off',
            'income covers it',
            'due in ' +
              mat +
              ' months' +
              (rf
                ? '; the ' +
                  fm(rf.balance) +
                  ' left is refinanced at ' +
                  rf.rate +
                  '%: payment ' +
                  fm(rf.payment) +
                  '/mo vs income ' +
                  fm(noi) +
                  '/mo'
                : '; nothing is left to refinance'),
            {
              kind: 'nocashflow',
              text: 'After the loan comes due, the refinance payment is more than the income',
              short: 'Tight - refinance risk',
            },
          )
        : mkC(
            'balloon',
            'Balloon / refinance',
            'ok',
            'none',
            '',
            'No balloon: the loan pays off on schedule.',
          ),
    );
    /* 6) stress tests */
    const lossV =
        type === 'business' ? 0 : (FEAS.vacPts / 100) * (h.rent + reimbOf(h)) * (1 - mgmtOf(S, h) / 100),
      cfV = v.cf - lossV,
      okV = cfV >= -0.5 || -cfV <= absorb + 0.5;
    add(
      mkC(
        'stress-vac',
        'Stress: vacancy +' + FEAS.vacPts + ' pts',
        okV ? 'ok' : 'caution',
        type === 'business' ? 'n/a' : sgn(cfV) + '/mo',
        'not below what the pool covers',
        type === 'business'
          ? 'Owner profit already is the net; no vacancy test.'
          : 'cash flow ' +
              sgn(v.cf) +
              ' - ' +
              FEAS.vacPts +
              ' pts of income ' +
              fm(lossV) +
              ' = ' +
              sgn(cfV) +
              '/mo',
        {
          kind: 'nocashflow',
          text: 'With ' + FEAS.vacPts + ' more points of vacancy it loses ' + fm(-cfV) + '/mo',
          short: 'Tight - weak if vacancy rises',
        },
      ),
    );
    const payR = hasLoan
        ? (h.io ? (L * (h.rate + FEAS.ratePts)) / 1200 : amort(L, (h.rate + FEAS.ratePts) / 1200, h.term)) +
          mipMonthly(h)
        : 0,
      cfR = noi - payR,
      okR = cfR >= -0.5 || -cfR <= absorb + 0.5;
    add(
      mkC(
        'stress-rate',
        'Stress: rate +' + FEAS.ratePts + ' pts',
        okR ? 'ok' : 'caution',
        hasLoan ? sgn(cfR) + '/mo' : 'no loan',
        'not below what the pool covers',
        hasLoan
          ? 'income ' +
              fm(noi) +
              ' - payment at ' +
              (h.rate + FEAS.ratePts) +
              '% ' +
              fm(payR) +
              ' = ' +
              sgn(cfR) +
              '/mo'
          : 'No loan, so a higher rate changes nothing.',
        {
          kind: 'nocashflow',
          text: 'If the rate were ' + FEAS.ratePts + ' points higher it would lose ' + fm(-cfR) + '/mo',
          short: 'Tight - weak if rates rise',
        },
      ),
    );
    /* 7) concentration */
    const totP = S.houses.reduce((a, q) => a + (+q.price || 0), 0),
      share = totP > 0 ? (price / totP) * 100 : 0,
      nA = S.houses.length;
    add(
      mkC(
        'concentration',
        'Concentration',
        nA >= FEAS.concMin && share > FEAS.concFail
          ? 'fail'
          : nA >= FEAS.concMin && share > FEAS.concCaution
            ? 'caution'
            : 'ok',
        share.toFixed(0) + '% of value',
        'under ' + FEAS.concCaution + '%',
        'price ' +
          fm(price) +
          ' / all assets ' +
          fm(totP) +
          ' = ' +
          share.toFixed(0) +
          '%' +
          (nA < FEAS.concMin ? ' (not tested with fewer than ' + FEAS.concMin + ' assets)' : ''),
        {
          kind: 'nocashflow',
          text: 'One asset is ' + share.toFixed(0) + '% of the portfolio by value',
          short: 'Tight - ' + share.toFixed(0) + '% of the portfolio',
        },
      ),
    );
    const hard = cs.filter((c) => c.hard && c.status === 'fail'),
      bad = sortC(cs).filter((c) => c.status !== 'ok'),
      top = bad[0] || null;
    const verdict = hard.length ? 'no' : bad.length ? 'tight' : 'yes',
      kind = hard.length ? sortC(hard)[0].kind : '';
    const reasons = bad.map((c) => ({
      id: c.id,
      sev: c.status === 'fail' ? 'bad' : 'warn',
      text: c.text,
      short: c.short,
    }));
    return {
      id: h.id,
      addr: h.addr,
      verdict,
      kind,
      criteria: cs,
      reasons,
      top: top,
      short: top ? top.short : '',
      month: m0,
      cash: {
        need,
        down,
        closing,
        rehab,
        have,
        savings: sav,
        trustCash: tcash,
        room,
        pooled,
        short: cashShort,
        uncovered,
        month: ok ? m0 : bm,
        closest: !ok,
        price,
      },
      monthly: {
        payment: pay,
        poolCf,
        asset: noi,
        personal,
        available: avail,
        short: avail - pay,
        covered: avail >= pay - 0.5,
      },
    };
  }
  function feasible(S, pl, fin, inner) {
    if (!inner) {
      if (pl && pl.raw) pl = pl.raw;
      pl = pl || plan(S);
      fin = fin || finance(S, pl);
      if (fin && fin.feas) return fin.feas;
    }
    const planned = S.houses.filter((h) => h.status !== 'owned'),
      assets = {},
      g = S.g,
      T = pl.T,
      pe = Math.min(T, pl.planM),
      cs = [];
    planned.forEach((h) => {
      assets[h.id] = feasAsset(S, pl, fin, h);
    });
    const add = (c) => {
        cs.push(c);
        return c;
      },
      nPl = planned.length,
      nUn = pl.unfunded.length,
      late = pl.lastBuy > pl.planM;
    if (nPl)
      add(
        nUn
          ? mkC(
              'p-funding',
              'Every planned asset can be funded',
              'fail',
              nUn + ' of ' + nPl + ' cannot',
              'all funded',
              nUn +
                ' planned asset' +
                (nUn === 1 ? '' : 's') +
                ' never reach the cash they need within the plan',
              {
                hard: true,
                kind: 'nofund',
                text:
                  nUn +
                  ' of ' +
                  nPl +
                  ' planned asset' +
                  (nUn === 1 ? '' : 's') +
                  ' cannot be funded in the plan',
                short: nUn + ' cannot be funded',
              },
            )
          : mkC(
              'p-funding',
              'Every planned asset can be funded',
              late ? 'fail' : pl.lastBuy > FEAS.pace * pl.planM ? 'caution' : 'ok',
              nPl ? 'last ' + inM(pl.lastBuy) : 'none planned',
              'by ' + mAt(pl.planM),
              'the last purchase is ' + inM(pl.lastBuy) + '; the plan runs ' + pl.planM + ' months',
              {
                hard: late,
                kind: 'nofund',
                text: late
                  ? 'The last purchase comes ' + inM(pl.lastBuy) + ', after the plan ends'
                  : 'The last purchase comes late in the plan, ' + inM(pl.lastBuy),
                short: late ? 'Not possible - last purchase after the plan' : 'Late purchases',
              },
            ),
      );
    add(
      mkC(
        'p-dti',
        'Debt-to-income peak',
        pl.worst.dti > g.dti ? 'fail' : pl.worst.dti > FEAS.dtiCaution * g.dti ? 'caution' : 'ok',
        pl.worst.dti.toFixed(0) + '%',
        'max ' + g.dti + '%',
        'highest debt payments / qualifying income = ' + pl.worst.dti.toFixed(0) + '% ' + inM(pl.worst.month),
        {
          hard: false,
          kind: 'nolender',
          text:
            'Lenders may decline: debt payments reach ' +
            pl.worst.dti.toFixed(0) +
            '% of income ' +
            inM(pl.worst.month) +
            ' (limit ' +
            g.dti +
            '%)',
          short: 'Lenders may decline',
        },
      ),
    );
    const cl = pl.at(Math.min(T, pl.lastBuy)).cltv;
    if (nPl)
      add(
        mkC(
          'p-cltv',
          'Debt vs value',
          cl > g.cap + 0.5 ? 'fail' : 'ok',
          cl.toFixed(0) + '%',
          'max ' + g.cap + '%',
          'all debt / all value when the last asset is bought = ' +
            cl.toFixed(0) +
            '% vs the ' +
            g.cap +
            '% cap',
          {
            hard: cl > g.cap + 0.5,
            kind: 'nolender',
            text: 'Total debt is ' + cl.toFixed(0) + '% of value, over the ' + g.cap + '% cap',
            short: 'Debt over the cap',
          },
        ),
      );
    if (fin) {
      const k = fin.kpis;
      add(
        mkC(
          'p-cash',
          'Cash never runs out',
          k.minLiquid < 0 ? 'fail' : k.reserveGap > 0.5 ? 'caution' : 'ok',
          k.minLiquid < 0 ? 'short ' + fm(-k.minLiquid) : 'lowest ' + fm(Math.max(0, k.minLiquid)),
          'above the reserve',
          k.minLiquid < 0
            ? 'your cash is about ' +
                fm(-k.minLiquid) +
                ' short at its lowest point, ' +
                mAt(k.minLiquidMonth)
            : 'lowest cash ' + fm(k.minLiquid) + '; reserve gap ' + fm(k.reserveGap),
          {
            hard: k.minLiquid < 0,
            kind: 'nocashflow',
            text:
              k.minLiquid < 0
                ? 'You run out of cash ' + inM(k.firstShortMonth)
                : 'Your cash dips below your emergency reserve',
            short: k.minLiquid < 0 ? 'Cash runs out' : 'Cash below reserve',
          },
        ),
      );
      add(
        mkC(
          'p-runway',
          'If the paycheck stops',
          k.minRunway < FEAS.runFail ? 'fail' : k.minRunway < FEAS.runCaution ? 'caution' : 'ok',
          isFinite(k.minRunway) ? k.minRunway.toFixed(1) + ' mo' : 'covered',
          'at least ' + FEAS.runCaution + ' mo',
          'lowest runway over the plan',
          { kind: 'nocashflow', text: 'Little cushion if your paycheck stops', short: 'Thin runway' },
        ),
      );
      add(
        mkC(
          'p-hours',
          'Hours in a week',
          k.peakHours > 70 ? 'caution' : 'ok',
          Math.round(k.peakHours) + ' h',
          'under 70 h',
          'job + businesses you run at the busiest month',
          {
            kind: 'nocashflow',
            text: 'The hours do not fit in a week around ' + mAt(k.peakHoursMonth),
            short: 'Too many hours',
          },
        ),
      );
    }
    const cats = ['house', 'commercial', 'business'],
      lasts = [];
    cats.forEach((tp) => {
      const rows = pl.snap.filter(
        (x) => x.type === tp && S.houses.some((q) => q.id === x.id && q.status !== 'owned'),
      );
      if (!rows.length) return;
      const cash = fin ? Math.max(0, fin.series.total[pe] || 0) : 0,
        st = stress(S, pl, rows, cash);
      lasts.push({ tp, months: st.burn >= -0.5 ? Infinity : st.months });
    });
    const w = lasts.sort((a, b) => a.months - b.months)[0];
    if (w)
      add(
        mkC(
          'p-earners',
          'Stress: biggest earners lost',
          w.months < FEAS.lastsFail ? 'fail' : w.months < FEAS.lastsCaution ? 'caution' : 'ok',
          isFinite(w.months) ? w.months.toFixed(1) + ' mo' : 'covered',
          'at least ' + FEAS.lastsCaution + ' mo',
          'cash lasts this long if about 45% of the biggest ' + w.tp + ' earners stop paying',
          {
            kind: 'nocashflow',
            text:
              'If your biggest earners stopped, cash would last ' +
              (isFinite(w.months) ? w.months.toFixed(1) : 0) +
              ' months',
            short: 'Weak if big earners stop',
          },
        ),
      );
    const totP = S.houses.reduce((a, q) => a + (+q.price || 0), 0),
      big = S.houses.slice().sort((a, b) => b.price - a.price)[0],
      sh = big && totP > 0 ? (big.price / totP) * 100 : 0;
    if (nPl)
      add(
        mkC(
          'p-concentration',
          'Concentration',
          S.houses.length >= FEAS.concMin && sh > FEAS.concFail
            ? 'fail'
            : S.houses.length >= FEAS.concMin && sh > FEAS.concCaution
              ? 'caution'
              : 'ok',
          sh.toFixed(0) + '% in one',
          'under ' + FEAS.concCaution + '%',
          big
            ? 'biggest asset ' + fm(big.price) + ' / all assets ' + fm(totP) + ' = ' + sh.toFixed(0) + '%'
            : 'no assets',
          {
            kind: 'nocashflow',
            text: (big ? big.addr : 'One asset') + ' is ' + sh.toFixed(0) + '% of the portfolio by value',
            short: 'Concentrated',
          },
        ),
      );
    const aList = planned.map((h) => assets[h.id]),
      rank = { yes: 0, tight: 1, no: 2 };
    const pHard = cs.filter((c) => c.hard && c.status === 'fail'),
      pBad = sortC(cs).filter((c) => c.status !== 'ok');
    let verdict = !nPl ? 'yes' : pHard.length ? 'no' : pBad.length ? 'tight' : 'yes';
    /* nothing planned = nothing to grade: owned assets are judged on Real, never 'Not yet' */ aList.forEach(
      (a) => {
        if (rank[a.verdict] > rank[verdict]) verdict = a.verdict;
      },
    );
    /* reasons: the most important first. A planned asset that cannot be funded or financed leads, in buy order, then the portfolio checks, then the assets that are only tight */
    const reasons = [],
      seen = {},
      push = (r) => {
        const k = r.text;
        if (!seen[k]) {
          seen[k] = 1;
          reasons.push(r);
        }
      };
    aList
      .filter((a) => a.verdict === 'no')
      .sort((a, b) => KRANK[a.kind] - KRANK[b.kind])
      .forEach((a) => {
        const c = sortC(a.criteria).find((x) => x.hard && x.status === 'fail');
        push({
          sev: 'bad',
          id: c.id,
          asset: a.id,
          text: (a.addr ? a.addr + ' - ' : '') + c.text,
          short: c.short,
          kind: a.kind,
        });
      });
    pBad
      .filter((c) => c.status === 'fail')
      .forEach((c) => push({ sev: 'bad', id: c.id, text: c.text, short: c.short, kind: c.kind }));
    aList
      .filter((a) => a.verdict === 'tight')
      .forEach((a) => {
        const c = a.top;
        if (c)
          push({
            sev: 'warn',
            id: c.id,
            asset: a.id,
            text: (a.addr ? a.addr + ' - ' : '') + c.text,
            short: c.short,
            kind: c.kind,
          });
      });
    pBad
      .filter((c) => c.status === 'caution')
      .forEach((c) => push({ sev: 'warn', id: c.id, text: c.text, short: c.short, kind: c.kind }));
    if (!nPl) reasons.length = 0;
    const first = reasons[0] || null,
      nNo = aList.filter((a) => a.verdict === 'no').length;
    const headline = !nPl
      ? 'Nothing planned yet.'
      : verdict === 'yes'
        ? 'Yes. You can carry this plan.'
        : verdict === 'no'
          ? 'Not yet. ' +
            (first
              ? first.text + (nNo > 1 ? ' (' + nNo + ' planned assets are not possible)' : '') + '.'
              : 'The plan does not work yet.')
          : 'Tight. ' +
            (first
              ? (first.short || first.text).replace(/^Tight - /, '').replace(/^./, (c) => c.toUpperCase()) +
                '.'
              : 'It works, but with thin margins.');
    return {
      verdict,
      none: !nPl,
      headline,
      reasons,
      criteria: sortC(cs),
      assets,
      planned: planned.map((h) => h.id),
      unfunded: pl.unfunded.slice(),
      nNo,
      top: first,
    };
  }

