  /* ---------- house page ---------- */
  function house(h) {
    const pl = PLAN(S),
      v = pl.V[h.id],
      g = S.g,
      a = E.afford(S, h, pl),
      t = null,
      P = `h.${h.id}.`,
      type = h.type || 'house';
    const Sw = E.without(S, h.id),
      wo = PLAN(Sw),
      p0 = pl.purchase[h.id];
    const nx = nextPlanned(h),
      nxOpen = nx ? pl.purchase[nx.id] : Infinity,
      nxSooner = nx && isFinite(nxOpen) ? nxOpen - monthWith(h, v.X + 100, nx.id) : 0,
      tr = pl.trust[h.id],
      debt = v.debtNow;
    const LB = {
      house: { rent: 'Monthly rent', sec: 'Rent & expenses', growth: 'Appreciation / yr', price: 'Price' },
      commercial: {
        rent: 'Monthly rent (all tenants)',
        sec: 'Rent & operating costs',
        growth: 'Value growth / yr',
        price: 'Purchase price',
      },
      business: {
        rent: 'Owner profit / month',
        sec: 'Profit',
        growth: 'Business growth / yr',
        price: 'Purchase price',
      },
    }[type];
    const capN = v.capNow,
      dscrH =
        v.P > 0
          ? v.noi / v.P
          : NaN; /* cap rate = a year of income after costs (NOI) / value, on every asset type */
    const lo = E.loanById(h.loanId),
      multi = E.isMulti(h),
      mf = multi ? E.mfInfo(S, h) : null,
      mfFits = multi ? E.mfLoans(mf.units, !!h.pack) : null;
    const loanSel = `<div class="f stack"><span class="lb">Loan option${infoBtn('loanoption')}</span><select class="loansel" data-loan="${h.id}" aria-label="Loan option">${
      multi
        ? mfFits
            .map(
              (x) =>
                `<option value="${x.loan.id}" ${h.loanId === x.loan.id ? 'selected' : ''}${x.ok || h.loanId === x.loan.id ? '' : ' disabled'}>${esc(x.loan.name)}${x.ok ? '' : ' (not for ' + mf.units + ' units)'}</option>`,
            )
            .join('')
        : E.loansFor(type)
            .map(
              (l) => `<option value="${l.id}" ${h.loanId === l.id ? 'selected' : ''}>${esc(l.name)}</option>`,
            )
            .join('')
    }<option value="custom" ${lo ? '' : 'selected'}>Custom terms</option></select></div>`;
    const ex = pl.exits[h.id];
    const arvAuto = E.arvIsAuto(h);
    const exitSec = colSec(
      'exit',
      'Value-add & exit',
      h.exit === 'sell' && isFinite(pl.sellAt[h.id])
        ? 'sell in ' + mm(pl.sellAt[h.id])
        : h.exit === 'merge' && isFinite(pl.mergeAt[h.id])
          ? 'merge in ' + mm(pl.mergeAt[h.id])
          : h.capex
            ? 'improve ' + $c(h.capex)
            : 'none planned',
      `<section class="card" data-testid="exit-section">
      ${field('Improvement budget', P + 'capex', grp(h.capex), { pre: '$' })}${field('Months to finish', P + 'capexMonths', h.capexMonths)}${field('New appraised value', P + 'arv', grp(h.arv), { pre: '$', calc: arvAuto && (h.capex > 0 || h.comp > 0) ? 1 : 0 })}${field('Average comp value', P + 'comp', h.comp > 0 ? grp(h.comp) : '', { pre: '$', ph: 'optional', info: 'comp' })}${field('Value gained (vs price + rehab)', P + 'gain', h.arv > 0 ? grp(v.valueGain) : '', { pre: '$', calc: 1 })}<p class="note" data-testid="arv-note" data-auto="${arvAuto && (h.capex > 0 || h.comp > 0) ? 1 : 0}">${h.capex > 0 || h.comp > 0 ? (arvAuto ? 'Auto: the new appraisal is ' + (h.comp > 0 ? 'the middle of ' + (h.capex > 0 ? (h.finCapex ? 'price + rehab + 15%' : 'price + 1.4 × the budget') : 'the price') + ' and the average comp value' : h.finCapex ? 'price + rehab + 15%' : 'price + 1.4 × the budget') + ' = ' + $f(E.autoArv(h)) + ', and it follows the budget. Type your own appraisal to override it.' : 'You set this appraisal, so changing the budget will not change it.') : 'Enter a budget and the appraisal fills in (price + 1.4 × the budget). Or type the new appraisal, or the value you expect to gain.'} No appraisal means the value does not change.${infoBtn('arv')}</p>${(h.capex > 0 || h.comp > 0) && !arvAuto ? `<button class="btn plain" data-arv-auto="${h.id}" data-testid="arv-use-auto">Use auto (${$f(E.autoArv(h))})</button>` : ''}${h.arv > 0 && h.arv < h.price + (h.capex || 0) ? '<p class="note" data-testid="arv-low">⚠ That appraisal is below price + rehab, so the work loses money.</p>' : ''}${field(type === 'business' ? 'Profit increase' : 'Rent increase', P + 'liftIncome', r(h.liftIncome, 1), { suf: '%' })}<p class="note" data-testid="rent-lift" data-before="${Math.round(h.rent)}" data-after="${Math.round(h.rent * (1 + (h.liftIncome || 0) / 100))}">${type === 'business' ? 'Profit' : 'Rent'} ${$f(h.rent)}/mo now → ${$f(h.rent * (1 + (h.liftIncome || 0) / 100))}/mo after the work${h.liftIncome ? '' : ' (no increase set)'}.</p>
      
      ${
        h.exit === 'sell'
          ? `${field('Sell in (months)', P + 'exitMonth', h.exitMonth, { date: 1 })}${field('Selling costs', P + 'sellCost', r(h.sellCost, 1), { suf: '%' })}${ex ? field('Net proceeds before tax', P + 'proceeds', grp(saleParts(ex).N), { pre: '$', calc: 1, ro: 1, info: 'proceeds' }) : ''}${
              ex
                ? (() => {
                    const sx = E.saleTax(S, pl, h),
                      sq = saleParts(ex);
                    return `<p class="note" data-testid="sale-tax">Net proceeds before tax ${$f(sq.N)}; estimated tax ${$f(sq.T)} (${r(sx.rate, 1)}% of the ${$f(Math.max(0, sx.gain))} gain; ${$f(sx.dep)} of depreciation taken is taxed back${sx.short ? ', and held under a year so all of it is ordinary income' : ''}); cash profit after tax ${$s(sq.F)}. The tax is paid from your cash after the proceeds above. Rates are in Finances under Taxes.</p>`;
                  })()
                : ''
            }<p class="note">Proceeds go to cash and count in net worth. Later purchases use that cash before outside money.</p>`
          : ''
      }
      ${
        h.exit === 'merge'
          ? `${field('Merge in (months)', P + 'exitMonth', h.exitMonth, { date: 1 })}<div class="f"><span class="lb">Merge into</span><select class="loansel" data-merge="${h.id}" aria-label="Merge into"><option value="">Choose…</option>${S.houses
              .filter((x) => x.id !== h.id)
              .map(
                (x) =>
                  `<option value="${x.id}" ${h.mergeInto === x.id ? 'selected' : ''}>${esc(x.addr)}</option>`,
              )
              .join(
                '',
              )}</select></div>${field('Synergy lift', P + 'exitLift', r(h.exitLift, 1), { suf: '%' })}`
          : ''
      }
      </section>`,
      !(h.capex > 0 || h.arv > 0 || h.exit !== 'hold'),
    );
    const homeLoses =
      type === 'house' && v.cf < 0
        ? `<div class="warnbox" data-testid="home-loses">⚠ A home must cash flow positive. This one loses ${$f(-v.cf)} a month. Raise the rent, lower the price, or pick a loan with a smaller payment.</div>`
        : '';
    /* the impact box: the whole portfolio (planned + bought = the Planned page plus the Real page), cash flow and payments in today's terms (2026*) like their KPIs, net worth at the plan end. Each line adds up: without it + this asset + the knock-on to the others = with it. */
    const idsOf = (px, SS) => px.snap.filter((x) => x.type !== 'cash').map((x) => x.id),
      tdW = E.todayTotals(Sw, wo, idsOf(wo, Sw)),
      tdA = E.todayTotals(S, pl, idsOf(pl, S));
    const inScope = idsOf(pl, S).indexOf(h.id) >= 0,
      own = { cf: inScope ? v.cf : 0, payment: inScope ? v.payment : 0 };
    const impRow = (id, lab, info, before, after, ownV, fmt, short) => {
      const bf = Math.round(before),
        af = Math.round(after),
        o = ownV === null ? af - bf : Math.round(ownV),
        k = af - bf - o,
        parts = [fmt(bf) + ' without it', $s(o) + ' this asset'];
      if (ownV !== null && Math.abs(k) >= 1) parts.push($s(k) + ' other assets (timing, trust cash)');
      return `<div class="imp" data-testid="impact-${id}" data-before="${bf}" data-own="${o}" data-other="${ownV === null ? 0 : k}" data-after="${af}"><div class="f"><span class="lb">${lab}</span><span>${fmt(bf)} → <b>${fmt(af)}</b></span></div><p class="note imp-eq" data-testid="impact-${id}-sum" data-short="${esc(short)}">${esc(short.charAt(0).toUpperCase() + short.slice(1))}: ${parts.join(' · ')} = <b>${fmt(af)}</b> with it</p></div>`;
    };
    const impRows = [
      [
        'nw',
        'Net worth',
        'networth',
        wo.horizon.nw,
        pl.horizon.nw,
        null,
        $f,
        "at the plan end, today's dollars",
      ],
      [
        'cf',
        'Cash flow / mo',
        'cashflow',
        tdW.cf,
        tdA.cf,
        own.cf,
        $s,
        'cash gained each month by all assets in the trust',
      ],
      [
        'pay',
        'Payments / mo',
        'payments',
        tdW.payment,
        tdA.payment,
        own.payment,
        $f,
        'loan payments, extra payments and costs',
      ],
      [
        'out',
        'Outside cash',
        'outsidecash',
        wo.outsideTotal,
        pl.outsideTotal,
        null,
        $f,
        'cash from your own pocket',
      ],
    ];
    const impactLines = impRows
      .filter((x) => Math.abs(x[3] - x[4]) > 0.5 || (x[5] !== null && Math.abs(x[5]) > 0.5))
      .map((x) => impRow(x[0], x[1], x[2], x[3], x[4], x[5], x[6], x[7]));
    const exS = pl.exits[h.id] && pl.sellAt[h.id] <= pl.planM ? pl.exits[h.id] : null;
    const exSold = !!exS;
    const timing =
      h.status === 'planned' && exSold
        ? `${field('Not before (months)', P + 'buyIn', h.buyIn, { date: 1 })}<p class="note" data-testid="sold-timing">${isFinite(p0) ? 'Bought ' + at(p0) + ', then sold ' + at(pl.sellAt[h.id]) + '.' : 'Sold ' + at(pl.sellAt[h.id]) + '.'}</p>`
        : h.status === 'planned'
          ? `${field('Not before (months)', P + 'buyIn', h.buyIn, { date: 1 })}<p class="note" data-testid="buyin-note">${isFinite(p0) ? (tr && tr.pooled ? 'The trust can pay for this ' + at(tr.ready) : 'Nothing comes before it, so it is paid from your savings above your cushion plus your job money, ready ' + at(p0)) + (tr && tr.held ? ', but you asked for no sooner than ' + mond(tr.buyIn) + ', so it waits for that month' : '') + '. Leave 0 to buy as soon as the money is there.' : 'The trust cannot pay for it within 50 years.'}</p>`
          : field('Months already paid', P + 'paid', h.paid);
    const age0 = h.status === 'owned' ? Math.max(0, h.paid || 0) : 0,
      depM = (E.depCum(S, h, age0 + 13) - E.depCum(S, h, age0 + 1)) / 12,
      pp = S.p || E.samplePersonal();
    const pp0 = S.p || E.samplePersonal();
    const depNote =
      type === 'business'
        ? `Tax write-off about ${$f(depM)}/mo: ${r(pp.bizIntPct, 0)}% of the price is goodwill amortized over 15 years, the rest equipment over 7 years. Edit the split in Finances under Taxes.`
        : `Tax depreciation about ${$f(depM)}/mo: ${type === 'house' ? '27.5' : '39'}-year straight line on ${r(100 - pp.landPct, 0)}% of price, closing costs and improvements (land is not depreciated). Edit the land share in Finances under Taxes.`;
    const mfp = mf
      ? (() => {
          const D = (v) => $f(v),
            row = (lab, k, neg, cls) =>
              Math.abs(mf.lines[k]) < 0.5 && k !== 'res' && k !== 'other'
                ? ''
                : `<tr${cls ? ' class="' + cls + '"' : ''}><td>${lab}</td><td>${neg ? '−' : ''}${D(mf.lines[k])}</td><td>${neg ? '−' : ''}${D(mf.perUnit[k])}</td></tr>`;
          return { D, row };
        })()
      : null;
    const oerOk = mf && isFinite(mf.oer) && mf.oer >= 35 && mf.oer <= 55;
    const mfCosts = mf
      ? `${field('Replacement reserve / unit / yr', P + 'mfRes', grp(h.mfRes), { pre: '$' })}${field('Other owner-paid costs / mo', P + 'mfOther', grp(h.mfOther), { pre: '$' })}${field('Management (of rent)', P + 'mgmtPct', r(E.mgmtOf(S, h), 2), { suf: '%' })}${field('Property manager $ / mo', P + 'mgmtAmt', grp(v.mgmtAmt), { pre: '$', calc: 1, ro: 1, info: 'mgmt' })}${field('Repairs / yr', P + 'maintPct', r(E.maintOf(S, h), 2), { suf: '%' })}
      <button class="chip link" data-go="settings">Vacancy ${g.vac}%</button>
      <table class="cmp" data-testid="mf-costs"><tr><th>Per month</th><th>Total</th><th>Per unit</th></tr><tr><td>Rent</td><td>${$f(h.rent + v.reimb)}</td><td>${$f((h.rent + v.reimb) / mf.units)}</td></tr>${mfp.row('Vacancy', 'vac', 1)}${mfp.row('Property tax', 'tax', 1)}${mfp.row('Insurance', 'ins', 1)}${mfp.row('HOA', 'hoa', 1)}${mfp.row('Repairs', 'maint', 1)}${mfp.row('Management', 'mgmt', 1)}${mfp.row('Replacement reserve', 'res', 1)}${mfp.row('Other owner costs', 'other', 1)}<tr class="tot"><td>Income after costs</td><td>${$s(mf.noi)}</td><td>${$s(mf.noi / mf.units)}</td></tr></table>
      <p class="note" data-testid="mf-oer">Costs are <b class="${oerOk ? '' : 'warn'}">${isFinite(mf.oer) ? r(mf.oer, 0) : '—'}%</b> of rent collected (typical 35% to 55%)${oerOk ? '' : '. Check the numbers: that is outside the usual range'}.${infoBtn('oer')}</p>`
      : '';
    const tierLine = mf
      ? h.pack
        ? 'A pack is separate houses on one blanket loan or several DSCR loans, not an apartment loan.'
        : mf.units <= 4
          ? 'Financed like a home. You can live in one unit.'
          : mf.units < 20
            ? 'Financed on the income of the building, not your pay. Lenders want DSCR near 1.25.'
            : mf.units < 50
              ? 'A small apartment building: agency or bank loan, and a maintenance helper.'
              : 'A large building: agency, HUD or CMBS debt, an on-site manager and a maintenance tech.'
      : '';
    const mgmtNow = mf ? E.mgmtOf(S, h) : 0,
      dscrNeed = lo && lo.dscr > 0 ? lo.dscr : 0;
    const unitsSec = mf
      ? colSec(
          'units',
          'Units',
          mf.units + ' units · ' + $f(mf.rentUnit) + ' each',
          `<section class="card" data-testid="units-section">
      <div class="f head"><span class="lb">Building or pack${infoBtn('mfpack')}</span></div><div class="seg" role="tablist" data-testid="pack-seg"><button data-pack="0" class="${h.pack ? '' : 'on'}" aria-pressed="${!h.pack}">Building</button><button data-pack="1" class="${h.pack ? 'on' : ''}" aria-pressed="${!!h.pack}">Pack of houses</button></div>
      ${field('Number of units', P + 'units', mf.units)}${field('Rent per unit / mo', P + 'rentUnit', grp(mf.rentUnit), { pre: '$' })}${field('Total rent / mo', P + 'rent', grp(h.rent), { pre: '$', calc: 1 })}
      <p class="note" data-testid="units-note">${h.pack ? 'Pack of ' + mf.units + ' houses' : mf.units + ' units'}. Changing the count keeps every per-unit amount and scales the totals.</p></section>`,
          false,
        )
      : '';
    const guideSec = mf
      ? colSec(
          'guide',
          'Buying and running ' + mf.units + ' units',
          'checklist · lenders · costs',
          `<section class="card" data-testid="mf-guide">
      <p class="note" data-testid="mf-tier">${tierLine}</p>
      <div class="f head"><span class="lb">Before you buy${infoBtn('mfchecklist')}</span></div><ul class="steps"><li>Rent roll and leases</li><li>12 months of income and costs</li><li>Tax bill, insurance quote, claims history</li><li>Condition report: roof, heating, plumbing, wiring</li><li>Environmental report, title and survey</li><li>Inspect a sample of units</li></ul>
      <div class="f"><span class="lb">What lenders look at${infoBtn('mflenders')}</span><b>${dscrNeed ? 'DSCR ' + r(dscrNeed, 2) + '+' : 'loan terms'} · 90% full</b></div>
      <div class="f"><span class="lb">Loan to value (LTV)${infoBtn('ltv')}</span><b>${r(100 - h.dp, 1)}% of price</b></div>
      <div class="f"><span class="lb">Ongoing costs and reserves${infoBtn('mfcosts')}</span><b>${isFinite(mf.oer) ? r(mf.oer, 0) + '% of rent' : '—'}</b></div>
      <div class="f"><span class="lb">Staff and management${infoBtn('mfstaff')}</span><b>${r(mgmtNow, 1)}% manager${mf.units >= 50 ? ' + on-site' : mf.units >= 20 ? ' + helper' : ''}</b></div>
      ${h.pack ? `<div class="f"><span class="lb">Section 8 packs${infoBtn('mfsec8')}</span><b>yearly inspections</b></div><ul class="steps"><li>Rent is capped by Fair Market Rent</li><li>Inspection before move-in and every year</li><li>Voucher share is paid by the housing authority and can be late</li></ul>` : ''}
      <div class="f"><span class="lb">Creative financing risks${infoBtn('mfcreative')}</span><b>read first</b></div></section>`,
          true,
        )
      : '';
    const mgrAmt =
      type === 'business'
        ? ''
        : `${field('Property manager $ / mo', P + 'mgmtAmt', grp(v.mgmtAmt), { pre: '$', calc: 1, ro: 1, info: 'mgmt' })}<p class="note" data-testid="mgmt-note" data-own="${h.mgmtPct != null ? 1 : 0}">${h.mgmtPct != null ? 'Set for this asset only.' : 'Starts at the Assumptions rate (' + r(g.mgmt, 1) + '%); type a number to set it for this asset only.'} It comes out of the rent collected and counts in the cash flow, the plan and the cost breakdown on the main page.</p>`;
    const income =
      type === 'business'
        ? `${field('Total revenue', P + 'revenue', grp(Math.round(E.revOf(h) * 100) / 100), { pre: '$', suf: '/mo', per: 1 })}${field('Profit margin', P + 'margin', r(E.marginOf(h), 2), { suf: '%' })}${field(LB.rent, P + 'profit', grp(h.rent), { pre: '$', calc: 1, ro: 1, info: 'ownerprofit' })}${field('Owner profit / year', P + 'profityr', grp(h.rent * 12), { pre: '$', calc: 1, ro: 1, info: 'ownerprofit' })}<p class="note" data-testid="rev-note">Revenue is what the business takes in each month. You keep the margin of it as owner profit, before this loan. Price ÷ yearly profit is ${r(v.multiple, 1)}×. Type revenue per month or per year, like 1,200,000/yr or 100k/mo.${infoBtn('calc')}</p><p class="note" data-testid="mgmt-note-biz">No property manager: the profit above is already after the people who run it. A manager you pay when you do not run it is set in Finances (${$f(pp0.gmMonthly)}/mo each).</p>`
        : `${multi ? '' : field(LB.rent, P + 'rent', grp(h.rent), { pre: '$' })}${field('Property tax / mo', P + 'tax', grp(h.tax), { pre: '$' })}${field('Insurance / mo', P + 'ins', grp(h.ins), { pre: '$' })}${field(type === 'commercial' ? 'CAM & operating / mo' : 'HOA / mo', P + 'hoa', grp(h.hoa), { pre: '$' })}${type === 'commercial' ? field('Tenants pay costs (NNN)', P + 'nnn', r(h.nnn, 0), { suf: '%' }) + `<p class="note" data-testid="nnn-note">Tenants repay ${r(h.nnn, 0)}% of tax, insurance and CAM (${$f(v.reimb)}/mo) on top of rent. Homes use 0%.</p>` : ''}
      ${multi ? mfCosts : `${field('Property manager (of rent)', P + 'mgmtPct', r(E.mgmtOf(S, h), 2), { suf: '%', info: 'mgmt' })}${mgrAmt}<button class="chip link" data-go="settings">Vacancy ${g.vac}%</button><button class="chip link" data-go="settings">Mgmt ${r(E.mgmtOf(S, h), 2)}%</button><button class="chip link" data-go="settings">Repairs ${g.maint}%/yr</button>`}
      <p class="note">Net operating income ${$f(v.noi)}/mo: rent${v.reimb > 0 ? ' plus tenant repayments' : ''} minus operating costs, before the loan.${infoBtn('noi')}</p>
      <p class="note" data-testid="dep-note">${depNote}</p>`;
    const loanLines = `<div class="loanlines" data-testid="loan-lines"><div class="f"><span class="lb">${type === 'business' ? 'Owner profit' : 'Income after operating costs'}</span><b data-testid="rent-noi" data-k="rent-noi">${$s(v.noi)}</b></div>
      <div class="f"><span class="lb">Loan payment${v.mip > 0 ? ' (P&amp;I + mortgage insurance)' : h.io ? ' (interest only)' : ' (P&amp;I)'}</span><b data-testid="rent-loan" data-k="rent-loan">${v.P + v.mip > 0.5 ? '−' + $f(v.P + v.mip) : 'no loan'}</b></div>
      ${v.X > 0.5 ? `<div class="f"><span class="lb">Extra payment</span><b data-testid="rent-extra" data-k="rent-extra">−${$f(v.X)}</b></div>` : ''}
      <div class="f totl"><span class="lb">Cash flow after the loan</span><b data-testid="rent-cf" data-k="rent-cf" class="${v.cf < 0 ? 'bad' : ''}">${$s(v.cf)}</b></div>
      ${v.X > 0.5 ? `<div class="f"><span class="lb">After the extra payment too</span><b data-testid="rent-cf-x" data-k="rent-cf-x">${$s(v.cf - v.X)}</b></div>` : ''}
      <p class="note">Rent and costs alone are not what you keep: the loan payment comes out of them. These match Payment now and Cash flow now at the top of this page.</p></div>`;
    /* money that goes into this loan on its own: the asset's own profit, and your job money left after living costs. One clock: months from today. */
    const life = lifeOf(pl, h),
      held0 = h.status === 'owned' ? 0 : p0,
      nowAt = isFinite(held0) ? held0 : null;
    const splitLines = (() => {
      if (nowAt === null || v.L <= 0 || !(pl.balAt(h.id, nowAt) > 0.005))
        return v.L <= 0
          ? '<p class="note" data-testid="h-auto">No loan, so no profit or job money goes to a loan here.</p>'
          : '';
      if (g.autoPay === false)
        return '<p class="note" data-testid="h-auto">Automatic extra payments are switched off in Assumptions.</p>';
      const a1 = pl.autoAt(h.id, nowAt),
        af = pl.autoFrom(h.id),
        j1 = pl.jobAt(h.id, nowAt),
        jf = pl.jobFrom(h.id);
      const autoTxt =
        a1 > 0.5
          ? '<b>' + $f(a1) + '/mo</b> now'
          : af >= 0
            ? 'starts ' +
              at(af) +
              ', about <b>' +
              $f(pl.autoAt(h.id, af)) +
              "/mo</b>, once the trust's line of credit is paid and nothing is left to buy"
            : 'none in this plan: its cash flow goes to the trust first (line of credit, then the next purchase)';
      const jobTxt =
        j1 > 0.5
          ? '<b>+' + $f(j1) + '/mo</b> now (your pay left after living costs, split equally across the loans)'
          : jf >= 0
            ? 'starts ' +
              at(jf) +
              ', about <b>+' +
              $f(pl.jobAt(h.id, jf)) +
              '/mo</b>, once nothing is left to buy'
            : S.p && S.p.jobs.length
              ? 'nothing yet: your job money goes to the trust for the next purchase first'
              : 'no job income is set';
      return `<p class="note" data-testid="h-auto" data-v="${Math.round(a1)}">Automatic extra from its own profit: ${autoTxt}.</p><p class="note" data-testid="h-job" data-v="${Math.round(j1)}">From your job: ${jobTxt}.</p>`;
    })();
    /* one quiet line under Extra / month: where the monthly paydown comes from. The amounts are the SAME engine values as the lines above (pl.autoAt / pl.jobAt, which already include a per-home job money amount); nothing is recomputed. Zero parts are hidden. */
    const extraBreak = (() => {
      if (exS || v.L <= 0 || g.autoPay === false) return '';
      if (nowAt === null || !(pl.balAt(h.id, nowAt) > 0.005))
        return h.status === 'owned'
          ? ''
          : '<p class="note" data-testid="extra-break" data-total="0">Once bought, your extra, this asset\'s own profit and your job money pay this loan down; the amounts are in the box above.</p>';
      const e0 = Math.max(0, v.X || 0),
        a1 = pl.autoAt(h.id, nowAt),
        j1 = pl.jobAt(h.id, nowAt),
        tot = e0 + (a1 > 0.5 ? a1 : 0) + (j1 > 0.5 ? j1 : 0),
        parts = [];
      if (e0 > 0.5) parts.push('your extra <b>' + $f(e0) + '</b>');
      if (a1 > 0.5) parts.push("from this asset's own profit <b>" + $f(a1) + '</b> (automatic)');
      if (j1 > 0.5)
        parts.push(
          'from your job <b>' +
            $f(j1) +
            '</b> (your pay left after living costs, split across the loans' +
            (h.jobPay !== null && h.jobPay !== undefined ? "; you set this loan's share" : '') +
            ')',
        );
      if (!parts.length)
        return h.status === 'owned'
          ? ''
          : '<p class="note" data-testid="extra-break" data-total="0">Once bought, your extra, this asset\'s own profit and your job money pay this loan down; the amounts are in the box above.</p>';
      return `<p class="note" data-testid="extra-break" data-total="${Math.round(tot)}" data-e="${Math.round(e0)}" data-a="${Math.round(a1 > 0.5 ? a1 : 0)}" data-j="${Math.round(j1 > 0.5 ? j1 : 0)}">${h.status === 'owned' ? '' : 'Once bought: '}Total paying this loan down: <b>${$f(tot)}/mo</b> = ${parts.join(' + ')}.</p>`;
    })();
    const jNow =
        nowAt !== null && v.L > 0
          ? Math.max(0, pl.jobAt(h.id, nowAt))
          : 0 /* the SAME engine value as 'From your job' in the plan box */,
      takeHome = S.p ? E.jobsNet(S, 0) : 0;
    const jobBasis = S.p
      ? S.p.jobs
          .filter((j) => (j.start || 0) <= 0 && (j.end === null || j.end === undefined || j.end > 0))
          .map((j) =>
            j.kind === 'hourly'
              ? 'Hourly ' + $f(j.wage) + '/hr x ' + r(j.hours, 1) + ' hrs/week'
              : 'Salary ' + $f(j.gross) + '/yr',
          )
          .join(' + ')
      : '';
    const jmOpen = UI.coll.jobmoney === false,
      jmAll = E.jobMoney(S, pl),
      jmDef = jmOpen && v.L > 0 ? E.jobDefault(S, h.id, pl) : { amount: 0, from: -1 },
      jmSet = h.jobPay !== null && h.jobPay !== undefined;
    const jobSec =
      exS || v.L <= 0
        ? ''
        : colSec(
            'jobmoney',
            'Your job money in the trust',
            jmSet ? $f(h.jobPay) + '/mo to this loan' : 'Plan decides',
            `<section class="card" data-testid="jobmoney-card"><div class="subh"><h3>Your job money in the trust</h3>${infoBtn('jobmoney')}</div>
      ${field('Job money to this loan / month', P + 'jobPay', jmSet ? grp(h.jobPay) : '', { pre: '$', ph: grp(Math.round(jNow)) })}
      <p class="note" data-testid="jobmoney-now" data-v="${Math.round(jNow)}">From your job now: <b>${$f(jNow)}/mo</b> to this loan${jmSet ? ' (your amount; it overrides the plan)' : " (the plan's own split; the box above is empty = Auto)"}.</p>
      ${S.p && jobBasis ? `<p class="note" data-testid="jobmoney-basis" data-take="${Math.round(takeHome)}" data-total="${Math.round(jmAll.surplus0)}">Your income: ${jobBasis} = <b>${$f(takeHome)}/mo</b> take-home, minus living costs = <b>${$f(jmAll.surplus0)}/mo</b> added to the trust.</p><div class="f" data-testid="jobmoney-total"><span class="lb">Total from your job this month</span><b data-v="${Math.round(jmAll.surplus0)}">${$f(jmAll.surplus0)}/mo</b></div>` : ''}
      <p class="note" data-testid="jobmoney-default" data-v="${Math.round(jmDef.amount)}">${jmSet ? 'You set ' + $f(h.jobPay) + ' a month' : "Default, the plan's own split: " + (jmDef.from >= 0 ? 'about <b>' + $f(jmDef.amount) + '/mo</b> from ' + at(jmDef.from) : 'none yet, your job money goes to the trust for the next purchase first')}${jmSet ? '. The plan would give about ' + $f(jmDef.amount) + '/mo' + (jmDef.from >= 0 ? ' from ' + at(jmDef.from) : '') + '.' : '.'}</p>
      ${jmSet ? '<button type="button" class="chip link" data-jobreset="' + h.id + '" data-testid="jobmoney-reset">Use the plan\'s split</button>' : ''}
      ${jmAll.over ? `<div class="warnbox" role="status" data-testid="jobmoney-warn">The job money you set for your homes adds up to ${$f(jmAll.assigned)} a month, more than the ${$f(jmAll.surplus0)} your job leaves after living costs. Nothing is cut silently: the part that cannot be paid is shown as a shortfall on Finances.</div>` : ''}</section>`,
            true,
          );
    const statusCard =
      h.status === 'owned'
        ? `<section class="card" data-testid="payoff-card"><div class="f" data-testid="bought-on"><span class="lb">Bought on${infoBtn('boughton')}</span><span class="iw"><input type="date" data-bought="${h.id}" value="${h.boughtOn || ''}" max="${isoToday()}" aria-label="Bought on" data-testid="bought-on-input"></span></div><div class="f"><span class="lb">Loan still due</span><b data-testid="h-loan-due" data-k="h-loan-due">${$f(v.B0)}</b></div>
        <div class="f"><span class="lb">Line of credit you can take against it</span><b data-testid="h-line" data-k="h-line">${$f(v.head0)}</b></div>
        <div class="f"><span class="lb">Paid off in</span><b data-testid="h-payoff" data-k="h-payoff" data-months="${isFinite(life) ? life : ''}">${v.B0 <= 0.5 ? 'no loan' : isFinite(life) ? ym(life) : 'not within the plan'}</b></div>
        <p class="note">Line of credit = ${v.cap}% of its value today (${$f(v.valueNow)})${S.g.haircut ? ' less the ' + S.g.haircut + '% appraisal cut' : ''}, minus the loan and other liens.${v.B0 > 0.5 ? ' The payoff time counts your extra payment and the automatic extra payments below.' : ''}</p>${splitLines}</section>`
        : exSold
          ? '' /* sold in this plan: whether the plan can buy it is no longer the question */
          : (() => {
              const vd = verdictFor(pl, h);
              return `<section class="card" data-testid="plan-card-asset"><div class="f"><span class="lb">Can the plan buy it?</span><span class="vchip ${vd.cls}" data-testid="plan-verdict">${vd.word}</span></div><p class="note" data-testid="plan-math">${mathFor(pl, h)}${vd.why ? ' · ' + esc(vd.why) : ''}</p>${jobSavedRow(pl, h)}${splitLines}</section>`;
            })();
    const saleCard = exS
      ? (() => {
          const sp0 = saleParts(exS),
            sP = sp0.P,
            sC = sp0.C,
            sL = sp0.L,
            sT = sp0.T,
            sF = sp0.F,
            sN = sp0.N,
            sI =
              sp0.I; /* every line is rounded to whole dollars once (saleParts), so the card adds up exactly to the cash profit shown everywhere else */
          return `<div class="sec" data-testid="sale-heading">Sale</div><section class="card" data-testid="sale-profit" data-profit="${sF}"><div class="f"><span class="lb">Sold for<small class="dh">${mond(pl.sellAt[h.id])}</small></span><b>${$f(sP)}</b></div>
      <div class="f"><span class="lb">Selling costs (${r(h.sellCost, 1)}%)</span><b>−${$f(sC)}</b></div><div class="f"><span class="lb">Loan and liens paid off</span><b>−${$f(sL)}</b></div><div class="f"><span class="lb">Net proceeds before tax</span><b>${$f(sN)}</b></div><div class="f"><span class="lb">Tax on the sale</span><b>−${$f(sT)}</b></div><div class="f"><span class="lb">Cash you put in${infoBtn('cashin')}</span><b>−${$f(sI)}</b></div>
      <div class="f totl"><span class="lb">Cash profit after tax${infoBtn('cashprofit')}</span><b class="sold-profit${exS.profit < 0 ? ' neg' : ''}" data-testid="sale-cash-profit">${$s(sF)}</b></div><p class="note">Cash profit = net proceeds before tax (price − selling costs − the loan and liens paid off), minus the tax on the sale, minus the cash you put in (down payment, closing costs and improvements paid in cash).</p></section>`;
        })()
      : '';
    const NUMB = E.numbering(S, pl);
    return `<div class="top"><button class="ic" data-go="" aria-label="Back">‹</button><h2><input class="t" data-p="${P}addr" type="text" autocorrect="on" autocapitalize="words" spellcheck="true" autocomplete="off" enterkeyhint="done" value="${esc(h.addr)}" aria-label="Name or address"></h2><span class="tag" style="margin:0" data-testid="asset-buy-no" data-no="${NUMB.num[h.id]}" data-nview="${NUMB.view[h.id]}" aria-label="${NUMB.view[h.id] === 'owned' ? 'Bought' : 'Planned'} asset number ${NUMB.num[h.id]}">#${NUMB.num[h.id]} ${NUMB.view[h.id] === 'owned' ? 'bought' : 'planned'} · ${TL[type]}${multi ? ' · ' + (h.pack ? 'pack of ' + mf.units : mf.units + ' units') : ''}</span></div>${String(h.addr).length > 19 ? `<p class="fulladdr" data-testid="full-addr">${esc(h.addr)}</p>` : ''}
    ${saleCard}
    ${homeLoses}
    ${h.fresh && type === 'house' && !multi ? `<section class="card"><b>Have a Zillow listing?</b><p class="note">Fill in price, rent, taxes and insurance from a file.</p><button class="btn plain" data-go="import/${h.id}" data-testid="import-listing">Import from listing file</button></section>` : ''}
    <section class="card"><div class="kg">${kpi(
      'h-payment',
      exS ? 'Payment while held' : 'Payment now',
      $f(v.payment),
      (() => {
        const parts = [];
        if (v.P > 0) parts.push((h.io ? 'interest ' : 'P&amp;I ') + $f(v.P));
        if (v.X > 0.5) parts.push('extra ' + $f(v.X));
        if (v.escrow > 0) parts.push('property costs ' + $f(v.escrow));
        if (v.mip > 0) parts.push('mortgage insurance ' + $f(v.mip));
        return parts.length > 1 ? (v.escrow > 0 ? 'includes ' : '') + parts.join(' + ') : '';
      })(),
    )}${kpi('h-cf', exS ? 'Cash flow while held' : 'Cash flow now', $s(v.cf), v.X > 0.5 ? `${$s(v.cf - v.X)} after extra` : '', v.cf < 0 ? 'bad' : '')}
      ${kpi('h-dscr', exS ? 'DSCR while held' : 'DSCR now', r(dscrH, 2), isFinite(dscrH) ? (dscrH >= 1.2 ? 'income covers the loan' : dscrH >= 1 ? 'thin cushion' : 'below 1.0') : 'no loan payment', isFinite(dscrH) && dscrH < 1 ? 'bad' : '', 1)}${kpi('h-cap', exS ? 'Cap rate while held' : 'Cap rate now', isFinite(capN) ? r(capN, 1) + '%' : '—', capChip(h, capN) + (type === 'business' ? 'yearly owner profit ÷ value' : 'yearly income after costs ÷ value'), capN < 0 ? 'bad' : '', 1)}</div>
      ${h.capex > 0 ? `<p class="note" data-testid="reno-note">Renovation ${$f(h.capex)}${h.finCapex ? ' (financed in the loan)' : ', paid in cash'}, done ${h.capexMonths} month${h.capexMonths === 1 ? '' : 's'} after it is bought${h.arv > 0 ? ': new appraisal ' + $f(h.arv) : ''}${h.liftIncome ? ', rent +' + r(h.liftIncome, 1) + '%' : ''}.</p>` : ''}
      <p class="note share" data-testid="asset-share">${(() => {
        const sp = pl.snap.find((x) => x.id === h.id),
          ex = pl.exits[h.id],
          yr = Math.round(pl.planM / 12),
          sq = ex ? saleParts(ex) : null;
        if (ex && pl.sellAt[h.id] <= pl.planM)
          return (
            'In your portfolio total: sold in ' +
            mond(pl.sellAt[h.id]) +
            ' for ' +
            $c(ex.price) +
            '. Cash profit ' +
            $cs(sq.F) +
            ' after tax (' +
            $f(sq.N) +
            ' net proceeds before tax, minus ' +
            $f(sq.T) +
            ' tax, minus the ' +
            $f(sq.I) +
            ' you put in).'
          );
        if (!sp) return 'In your portfolio total: not bought in this plan yet.';
        return (
          'Price ' +
          $c(h.price).replace(/\.0M$/, 'M') +
          '. Portfolio row: ' +
          (sp.payment > 0.5 ? $f(sp.payment) + '/mo' : 'no loan') +
          '.'
        );
      })()}</p>
      <div class="f" style="border-top:0;min-height:36px"><span class="lb">Plan for this asset${infoBtn('exit')}</span></div><div class="seg" style="margin-top:0" role="tablist"><button data-exit="hold" class="${h.exit === 'hold' ? 'on' : ''}">Hold</button><button data-exit="sell" class="${h.exit === 'sell' ? 'on' : ''}" data-testid="exit-sell">Sell</button><button data-exit="merge" class="${h.exit === 'merge' ? 'on' : ''}">Merge</button></div>
      ${exS ? `<div class="f" style="border-top:0;min-height:30px" data-testid="sold-status"><span class="lb">Status</span><b>Sold in ${mond(pl.sellAt[h.id])}</b></div><div class="f" style="border-top:0;min-height:30px"><span class="lb">Until the sale it is</span></div>` : `<div class="f" style="border-top:0;min-height:30px"><span class="lb">Status</span></div>`}<div class="seg" style="margin-top:0"><button class="${h.status === 'owned' ? 'on' : ''}" data-status="owned">Owned</button><button class="${h.status === 'planned' ? 'on' : ''}" data-status="planned">Planned</button></div>${h.status === 'planned' ? field('Buy position', P + 'pos', NUMB.num[h.id], { info: 'buypos' }) : ''}${timing}</section>
    ${h.status !== 'owned' && !exSold ? buyPanel(pl, h) : ''}
    ${h.listingUrl ? `<p class="note" style="margin:10px 4px 0">Imported from a listing${h.info && h.info.beds ? ' · ' + h.info.beds + ' bd / ' + h.info.baths + ' ba · ' + (h.info.sqft || '?') + ' sqft' : ''}.</p>` : ''}
    ${statusCard}
    ${unitsSec}
    <div class="sec"><span>Purchase · <i class="auto">auto</i> = calculated${infoBtn('auto')}</span></div><section class="card">${field(LB.price, P + 'price', grp(h.price), { pre: '$' })}${field('Down payment', P + 'dp', r(h.dp, 2), { suf: '%' })}${field('Down payment $', P + 'down', grp(v.down), { pre: '$', calc: 1 })}${field('Loan amount', P + 'loan', grp(v.L), { pre: '$', calc: 1, ro: 1 })}${field(LB.growth, P + 'growth', r(v.growth, 2), { suf: '%' })}
      ${type === 'commercial' ? field('Cap rate', P + 'caprate', r(v.capRate, 1), { suf: '%', calc: 1, ro: 1 }) : ''}${type === 'business' ? field('Price ÷ yearly profit', P + 'mult', r(v.multiple, 1), { suf: '×', calc: 1, ro: 1 }) : ''}</section>
    ${colSec(
      'loan',
      'Loan option',
      (lo ? lo.name.replace(/\s*\(.*\)/, '') : 'Custom') +
        ' · ' +
        r(h.rate, 2) +
        '% · ' +
        r(h.term / 12, 0) +
        ' yr' +
        (lo ? '' : ' · tap to pick a loan'),
      `<section class="card">${loanSel}${lo || h.io ? `<p class="note">${lo ? esc(lo.note) + ' ' : ''}${h.io ? 'Interest-only: extra payments reduce the balance. At maturity the balance is refinanced (see below).' : ''}</p>` : '<p class="note">Custom terms. Pick a loan option to auto-fill them.</p>'}${multi && lo && lo.info ? `<p class="note" data-testid="loan-info-only">Info only. Modelled as ${esc(lo.modelledAs)}. See the (i) for what is left out.${infoBtn(GL.LOAN[lo.id])}</p>` : ''}${multi && lo && lo.multi && !E.mfFit(lo, mf.units, !!h.pack).ok ? `<div class="warnbox" data-testid="loan-nofit">⚠ ${esc(lo.name)} is not for ${mf.units} units: ${esc(lo.only.charAt(0).toLowerCase() + lo.only.slice(1))}. Pick another loan option.</div>` : ''}${multi && dscrNeed > 0 && v.P > 0 ? `<p class="note" data-testid="mf-dscr">Lenders usually want a DSCR of ${r(dscrNeed, 2)} or more for this loan. Yours is <b class="${dscrH >= dscrNeed ? '' : 'warn'}">${r(dscrH, 2)}</b>${dscrH >= dscrNeed ? '' : ': too low, so a lender may ask for a bigger down payment'}.${infoBtn('dscr')}</p>` : ''}${h.ownerOcc ? '<span class="chip warnchip" data-testid="owner-occ">You must live here (owner-occupied)</span>' + infoBtn('ownerocc') : ''}${h.loanId === 'k203' && h.capex > 75000 ? '<p class="note" data-testid="k203-cap">⚠ Over the $75,000 Limited 203(k) cap. This rehab needs a Standard 203(k) with a HUD consultant.</p>' : ''}
      ${field('Interest rate', P + 'rate', r(h.rate, 3), { suf: '%' })}${field('Term (years)', P + 'termY', r(h.term / 12, 2))}${field('Closing costs', P + 'closingPct', r(h.closingPct == null ? g.closing : h.closingPct, 2), { suf: '%' })}${field('Extra / month', P + 'extra', grp(v.X), { pre: '$' })}${extraBreak}${field('Paid off in (months)', P + 'payoff', isFinite(v.payoff) ? v.payoff : '', { calc: 1 })}${field('Other liens', P + 'liens', grp(h.liens), { pre: '$' })}
      ${field('Loan comes due in (months)', P + 'mat', E.matOf(h) || '', { ph: 'never', info: 'refi' })}${E.matOf(h) > 0 ? field('Refinance rate', P + 'refiRate', h.refiRate == null ? '' : r(h.refiRate, 2), { suf: '%', ph: 'auto ' + r(g.refiRate, 2), info: 'refi' }) + field('Refinance term (years)', P + 'refiTermY', h.refiTerm == null ? '' : r(h.refiTerm / 12, 1), { ph: 'auto ' + r(g.refiTerm / 12, 1), info: 'refi' }) : ''}
      ${v.refi ? `<p class="note" data-testid="refi-note">Comes due in ${v.refi.month} month${v.refi.month === 1 ? '' : 's'} with ${$f(v.refi.balance)} left. That balance is refinanced at ${r(v.refi.rate, 2)}% over ${r(v.refi.termMonths / 12, 1)} year${r(v.refi.termMonths / 12, 1) === '1' ? '' : 's'}, so the payment becomes ${$f(v.refi.payment)}/mo (DSCR then ${r(v.noi / Math.max(1, v.refi.payment + v.mip), 2)}). Cash flow now is shown before this change.</p>` : ''}
      <p class="note">${isFinite(v.payoff) ? `Paid off in ${mo(v.payoff)} with your scheduled payment and extra` : h.io ? 'Not paid off until you refinance or sell' : 'Payment does not cover interest'}${v.L > 0 && isFinite(life) && Math.abs(life - v.payoff) > 0.5 ? `; ${ym(life)} with the automatic extra from its own profit and your job` : ''}. ${v.mip > 0 ? 'Includes ' + $f(v.mip) + '/mo mortgage insurance' + infoBtn('mip') + '. ' : ''}${h.io ? 'Interest-only' + infoBtn('interestonly') + '. ' : ''}Debt now: ${$f(debt)} (${r((debt / (v.valueNow || h.price)) * 100)}% of today's value).${tr && tr.pooled && tr.draw > 0.5 && h.status !== 'owned' ? ' Its down payment includes ' + $f(tr.draw) + " drawn on the trust's line of credit; that counts in the portfolio debt, not in this loan." : ''}</p></section>`,
      true,
    )}
    ${colSec('rent', LB.sec, (type === 'business' ? 'profit ' + $f(h.rent) : 'rent ' + $f(h.rent)) + ' · loan ' + (v.P + v.mip > 0.5 ? '−' + $f(v.P + v.mip) : 'none'), `<section class="card">${income}${loanLines}</section>`, true)}
    ${jobSec}
    ${guideSec}
    ${colSec(
      'loc',
      'Funded by the trust',
      h.status === 'owned'
        ? 'in the trust today'
        : isFinite(p0)
          ? verdictFor(pl, h).word +
            ' · ' +
            (tr && tr.pooled ? 'by ' + mond(tr.ready) : 'savings + job money ' + mond(p0))
          : 'not possible',
      `<section class="card" data-testid="trust-section">${
        h.status === 'owned'
          ? `<p class="note" data-testid="trust-owned">Owned today, so it is already in the trust. Its borrowing room (${$f(v.head0)} now: ${v.cap}% of its ${$f(v.valueNow)} value less its loan and liens) and its cash flow (${$s(v.cf)}/mo) count toward paying for every planned asset below it in the list. Its cash flow first pays the trust's line of credit, then builds cash for the next purchase; once nothing is left to buy it goes to its own loan.</p>${nx ? `<p class="note" data-testid="trust-next">Next asset the trust funds: ${esc(nx.addr)}, ${isFinite(nxOpen) ? (nxOpen <= 0 ? 'now' : at(nxOpen)) : 'not reachable'}.</p>` : ''}${nxSooner > 0 ? `<span class="chip">+$100/mo extra → ${nxSooner} mo sooner</span>` : ''}`
          : `${field('Cash needed', P + 'need', grp(E.needFor(S, h)), { pre: '$', calc: 1, ro: 1 })}<div class="f"><span class="lb">Trust can pay at${infoBtn('nextdp')}</span><b data-testid="trust-months">${isFinite(p0) ? mond(tr && isFinite(tr.ready) ? tr.ready : p0) : 'never'}</b></div>${tr && tr.held ? `<div class="f"><span class="lb">Held until your date</span><b data-testid="trust-held">${mond(tr.buyIn)}</b></div>` : ''}
      ${
        tr && tr.pooled
          ? `<p class="note" data-testid="trust-pool">Paid for by the trust: the pool of the ${tr.n} asset${tr.n === 1 ? '' : 's'} before it (everything you own today and the planned assets above it), at ${mond(tr.ready)}.</p>
      <div class="f"><span class="lb">How the pool is worked out${infoBtn('trustmath')}</span></div>
      <div class="f"><span class="lb">Borrowing room</span><b data-testid="pool-room">${$f(tr.room)}</b></div>
      <div class="f"><span class="lb">Cash the trust holds</span><b data-testid="pool-cash">${$f(tr.heldCash)}</b></div>
      <div class="f"><span class="lb">Pool total (needs ${$f(tr.need)})</span><b data-testid="pool-total">${$f(tr.have)}</b></div>
      <div class="f"><span class="lb">Cash flow reinvested / month</span><b data-testid="pool-cf">${$f(tr.cf)}</b></div>
      <p class="note" data-testid="loc-split">Where the down payment comes from: ${$f(tr.cash)} of cash the trust already holds (reinvested cash flow and sale proceeds) and ${$f(tr.draw)} drawn on the trust's line of credit at ${r(g.hrate, 2)}%.${S.p ? ' Your job money left after living costs joins the pool the same way.' : ''}</p>
      <div class="sfh">Borrowing rules (the same boxes as Assumptions, they apply to every asset)</div>
      ${field('Line of credit rate', 'g.hrate', g.hrate, { suf: '%' })}${field('Max loan vs value', 'g.cap', g.cap, { suf: '%' })}${field('Max loan vs value (business)', 'g.capBiz', g.capBiz, { suf: '%' })}${field('Appraisal cut', 'g.haircut', g.haircut, { suf: '%' })}`
          : isFinite(p0)
            ? `<p class="note" data-testid="trust-pool">Nothing is above it in the list, so there is no pool to borrow against. Your cushion keeps ${S.p && tr ? $f(tr.rsv) : 'some'} of your savings (it grows with inflation); everything above that, plus the job money saved up since, pays for it.</p>`
            : `<p class="note" data-testid="trust-pool">⚠ The pool of the assets before it cannot pay for this within 50 years${tr && tr.best ? ' (the closest it gets is ' + $f(tr.best.avail) + ' of the ' + $f(tr.need) + ' needed, ' + at(tr.best.month) + ')' : ''}, so it is not bought in this plan. Move it lower in the list, lower its down payment, or let the earlier assets grow.</p>`
      }
      ${a.cls === 'warn' || a.cls === 'bad' ? `<span class="chip warnchip">Debt-to-income ${a.cls === 'bad' ? 'over' : 'near'} your limit when ${esc(h.addr)} closes</span>` : ''}${nxSooner > 0 ? `<span class="chip">+$100/mo extra → ${esc(nx.addr)} ${nxSooner} mo sooner</span>` : ''}`
      }</section>`,
      false,
    )}
    ${exitSec}
    ${colSec('impact', 'Impact on your plan' + infoBtn('impact'), impactLines.length ? impactLines.length + ' changes to this plan' : 'no change', `<section class="card" data-testid="impact">${impactLines.length ? impactLines.join('') : '<p class="note" style="margin:0">Adding or removing this does not change the numbers below.</p>'}</section>`, true)}
    ${ask === 'del:' + h.id ? confirmBox('Remove ' + esc(h.addr) + '? The trust re-works the funding of every asset after it.', 'data-del-yes="' + h.id + '"', 'Yes, remove') : `<button class="btn plain" data-dup="${h.id}" data-testid="h-duplicate">Duplicate this ${TL[type].toLowerCase()}</button><button class="btn ghost" data-del="${h.id}" data-testid="h-delete">Remove</button>`}`;
  }

