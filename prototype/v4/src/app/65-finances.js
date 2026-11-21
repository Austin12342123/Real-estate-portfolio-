  /* ---------- finances page: your jobs, cash and expenses, and whether the plan is affordable ---------- */
  function finChart(f) {
    const T = f.T,
      tot = f.series.total.slice(0, T + 1),
      rsv = f.series.reserve.slice(0, T + 1);
    const W = 340,
      Hh = 170,
      pad = 10,
      min = Math.min(0, ...tot, ...rsv),
      max = Math.max(1, ...tot, ...rsv);
    const x = (t) => pad + (t / T) * (W - 2 * pad),
      y = (v) => Hh - 24 - ((v - min) / (max - min || 1)) * (Hh - 44);
    const path = (arr) => {
      let d = '';
      const st = Math.max(1, Math.ceil(T / 160));
      for (let t = 0; t <= T; t += st) d += (d ? 'L' : 'M') + x(t).toFixed(1) + ' ' + y(arr[t]).toFixed(1);
      return d + 'L' + x(T).toFixed(1) + ' ' + y(arr[T]).toFixed(1);
    };
    const ys = T <= 60 ? 1 : T <= 120 ? 2 : 5;
    let ticks = '';
    for (let yr = 0; yr * 12 <= T; yr += ys)
      ticks += `<text x="${x(yr * 12)}" y="${Hh - 8}" text-anchor="${yr === 0 ? 'start' : 'middle'}">${yr ? yr + 'y' : 'Now'}</text>`;
    const mm0 =
      f.kpis.minLiquidMonth <= T
        ? `<circle class="lowpt" cx="${x(f.kpis.minLiquidMonth)}" cy="${y(tot[f.kpis.minLiquidMonth])}" r="5"><title>Lowest cash: ${mond(f.kpis.minLiquidMonth)}</title></circle>`
        : '';
    return `<div class="chartwrap"><svg class="nw" data-testid="cash-chart" viewBox="0 0 ${W} ${Hh}" data-w="${W}" data-h="${Hh}" data-pad="${pad}" data-t="${T}" data-min="${min}" data-max="${max}" data-nw="${tot.map((v) => Math.round(v)).join(',')}" data-ev="" role="img" aria-label="Your cash over time. Lowest point ${$f(f.kpis.minLiquid)} ${f.kpis.minLiquidMonth <= 0 ? 'today' : 'in ' + mond(f.kpis.minLiquidMonth)}. Hover or drag to read values.">
      <line class="ax" x1="${pad}" x2="${W - pad}" y1="${y(0)}" y2="${y(0)}"/><path class="rs" d="${path(rsv)}"/><path class="ln" d="${path(tot)}"/>${mm0}${ticks}
      <text x="${pad}" y="12">${$f(max)}</text>${min < 0 ? `<text x="${pad}" y="${y(min) - 4}">${$f(min)}</text>` : ''}
      <line class="xh" id="nwx" y1="14" y2="${Hh - 24}" x1="0" x2="0" visibility="hidden"/><circle class="hv" id="nwd" r="5.5" cx="0" cy="0" visibility="hidden"/><rect class="hit" x="0" y="0" width="${W}" height="${Hh}"/></svg>
      <div class="tip" id="nwtip" hidden></div></div><p class="note">Solid line = your cash (savings plus cash from sales). Dashed line = the emergency reserve you want to keep. Hover or drag to read it.</p>`;
  }
  function finances() {
    if (!S.p) S.p = E.samplePersonal();
    const pl = PLAN(S),
      f = E.finance(S, pl),
      p = S.p,
      g = S.g,
      k = f.kpis,
      R = f.series,
      vS =
        pl.worst.dti > g.dti && f.status === 'tight'
          ? 'no'
          : f.status; /* lenders who would decline = red, the same as the Checks on the Planned page */
    const icon = { ok: '✓', warn: '△', bad: '✗' };
    const listRow = (
      kind,
      it,
      label,
    ) => `<div class="lr" data-testid="${kind}-row"><input class="t2" data-p="${kind === 'pl' ? 'o' : 'c'}.${it.id}.name" type="text" value="${esc(it.name)}" autocorrect="on" autocapitalize="words" spellcheck="true" autocomplete="off" enterkeyhint="done" aria-label="${label} name">
      ${field('Amount', (kind === 'pl' ? 'o' : 'c') + '.' + it.id + '.amount', grp(it.amount), { pre: '$' })}${field('Happens in (months)', (kind === 'pl' ? 'o' : 'c') + '.' + it.id + '.month', it.month, { date: 1 })}
      ${ask === 'dp:' + kind + ':' + it.id ? confirmBox('Remove ' + esc(it.name || label) + '?', 'data-dp-yes="' + kind + ':' + it.id + '"', 'Yes, remove') : `<button class="rm" data-dp="${kind}:${it.id}" aria-label="Remove ${esc(it.name || label)}">Remove</button>`}</div>`;
    const jobs = p.jobs
      .map((j) => {
        const tp = E.taxPctFor(j),
          take = E.jobMonthly(j, 0) * (1 - tp / 100),
          more = UI.coll['jmo:' + j.id] === true,
          hourly = j.kind === 'hourly';
        return `<section class="card" data-testid="job-card"><input class="t2" data-p="j.${j.id}.name" type="text" value="${esc(j.name)}" autocorrect="on" autocapitalize="words" spellcheck="true" autocomplete="off" enterkeyhint="done" aria-label="Job name">
      <div class="seg" role="tablist" aria-label="How you are paid"><button data-jobkind="${j.id}:salary" class="${!hourly ? 'on' : ''}">Salary</button><button data-jobkind="${j.id}:hourly" class="${hourly ? 'on' : ''}" data-testid="kind-hourly">Hourly</button></div>
      ${hourly ? `${field('Hourly wage', `j.${j.id}.wage`, r(j.wage, 2), { pre: '$' })}${field('Hours / week', `j.${j.id}.hours`, r(j.hours, 0))}${field('Tips per hour (optional)', `j.${j.id}.tips`, r(j.tips, 2), { pre: '$' })}` : `${field('Gross pay / year', `j.${j.id}.gross`, grp(j.gross), { pre: '$' })}${field('Hours / week', `j.${j.id}.hours`, r(j.hours, 0))}`}
      ${field('Ends in (months)', `j.${j.id}.end`, j.end === null ? '' : j.end, { ph: 'never', date: 1 })}
      <p class="note" data-testid="job-take">About ${$f(take)}/mo take-home${hourly ? ' (' + $f(j.gross) + '/yr before tax)' : ''}. Tax ${j.tax === null ? 'estimated at ' + r(tp, 1) + '%' : 'set to ' + r(j.tax, 1) + '%'}.</p>
      <button class="chip link morebtn" data-coll="jmo:${j.id}" aria-expanded="${more}">${more ? 'Fewer details ▾' : 'More details (optional) ▸'}</button>
      ${more ? `${hourly ? field('Weeks worked / year', `j.${j.id}.weeks`, r(j.weeks, 0)) : ''}${field('Yearly raise', `j.${j.id}.raise`, r(j.raise, 1), { suf: '%' })}${field('Tax rate (blank = estimate)', `j.${j.id}.tax`, j.tax === null ? '' : r(j.tax, 1), { suf: '%', ph: 'auto ' + r(tp, 1) })}${field('Starts in (months)', `j.${j.id}.start`, j.start, { date: 1 })}` : ''}
      ${ask === 'dp:job:' + j.id ? confirmBox('Remove ' + esc(j.name) + '?', 'data-dp-yes="job:' + j.id + '"', 'Yes, remove') : `<button class="rm" data-dp="job:${j.id}" aria-label="Remove ${esc(j.name)}">Remove job</button>`}</section>`;
      })
      .join('');
    const row = (label, v, cls, bold) =>
      `<tr class="${bold ? 'tot' : ''}"><td>${label}</td><td class="${cls || ''}">${bold ? '<b>' + $s(v) + '</b>' : $s(v)}</td></tr>`;
    const picture = `<table class="cmp" data-testid="monthly-picture"><tbody>
      ${row('Your take-home pay', k.takeHome)}${row('Portfolio cash flow', k.portfolioAfterTax, k.portfolioAfterTax < 0 ? 'bad' : '')}${row('Managers (not you)', -k.managerCost0)}${row('Extra payments', -k.extra)}${row('Living costs', -k.living)}${row('Other debts', -k.debts)}${row('Left over each month', k.net0, k.net0 < 0 ? 'bad' : '', true)}</tbody></table>`;
    /* where your job money goes: pay minus living costs, other debts and your extra payments is the job surplus; it is split across the assets (the trust while something is waiting, then the loans equally) and never takes your cash below the cushion */
    const jobNote = (() => {
      if (!p.jobs.length || !(R.income[0] > 0))
        return '<p class="note" data-testid="job-split">You have no job income right now, so no job money is split between your assets.</p>';
      const js = k.jobSurplus0,
        waiting = S.houses.some((h) => h.status !== 'owned' && isFinite(pl.purchase[h.id])),
        nLoans = S.houses.filter((h) => h.status === 'owned' && pl.balAt(h.id, 0) > 0.005).length,
        nPool = pl.poolAt(0).n;
      if (g.autoPay === false)
        return `<p class="note" data-testid="job-split" data-v="${Math.round(js)}">Of your job income, ${$f(js)}/mo is left after living costs. Automatic payments are switched off in Assumptions, so it stays in your cash.</p>`;
      const tail = ' Your cash never drops below the cushion because of it.',
        cush = k.reserveTarget0,
        cash0 = +p.cash || 0;
      const body =
        js <= 0.5
          ? 'Nothing is left after living costs, other debts and your extra payments, so nothing is split.'
          : cash0 < cush - 0.5
            ? `Your cash (${$f(cash0)}) is below your ${p.emergencyMonths}-month cushion (${$f(cush)}), so the job money first rebuilds the cushion` +
              (k.jobSplit0 > 0.5
                ? ` and only ${$f(k.jobSplit0)}/mo is split now.`
                : ', so nothing is split yet.')
            : k.jobSplit0 < js - 0.5
              ? 'It stays in your cash for now: it builds up toward the first purchase, which is paid from your savings above the cushion plus this money. It is split across the trust and the loans once nothing is waiting on it.' +
                tail
              : waiting
                ? `It is split across ${nPool} asset${nPool === 1 ? '' : 's'} (the trust's pool): first it pays down the trust's line of credit, then it builds cash for the next planned purchase. After the last purchase it is split equally across the loans of ${nLoans || 'your'} asset${nLoans === 1 ? '' : 's'}.` +
                  tail
                : `It is split equally across ${nLoans} asset${nLoans === 1 ? '' : 's'} with a loan, as extra payments.` +
                  tail;
      return `<p class="note" data-testid="job-split" data-v="${Math.round(js)}">Of your job income, <b>${$f(js)}/mo</b> is left after living costs. ${body}</p>`;
    })();
    const taxEff = R.taxable[0] > 0 ? (R.portTax[0] / R.taxable[0]) * 100 : 0;
    const calls = f.calls
      .slice(0, 3)
      .map(
        (c) =>
          `<div class="drv"><span>${cap(mond(c.month))}${c.assets.length ? ' · ' + esc(c.assets.join(', ')) : ''}</span><span><b>${$f(c.amount)}</b></span></div>`,
      )
      .join('');
    return `<div class="top"><button class="ic" data-go="" aria-label="Back">‹</button><h2>Finances</h2></div>
    <section class="card vcard ${f.feas && f.feas.none ? 'yes' : vS}" data-testid="verdict-card"><div class="vrow" style="cursor:default"><span class="vchip ${f.feas && f.feas.none ? 'yes' : vS}" data-testid="verdict-chip">${f.feas && f.feas.none ? 'Nothing planned' : VL[vS]}</span><b data-testid="verdict-headline">${esc(f.feas && f.feas.none ? 'Nothing planned yet. Add an asset to see whether you can afford it.' : vS !== f.status ? 'Not yet. Lenders may decline a loan around ' + mond(pl.worst.month) + '.' : f.headline)}</b></div>
      ${
        f.feas && f.feas.none
          ? ''
          : f.reasons
              .filter((x) => x.sev !== 'ok')
              .map((x0) => {
                const x =
                  vS !== f.status && /^Lenders may decline/.test(x0.text)
                    ? Object.assign({}, x0, { sev: 'bad' })
                    : x0;
                return `<div class="rsn ${x.sev}"><span aria-hidden="true">${icon[x.sev]}</span><span>${esc(x.text)}</span></div>`;
              })
              .join('')
      }
      ${
        !(f.feas && f.feas.none) && f.reasons.some((x) => x.sev === 'ok')
          ? `<div class="rsn ok" data-testid="reasons-ok"><span aria-hidden="true">✓</span><span>Looks fine: ${esc(
              f.reasons
                .filter((x) => x.sev === 'ok')
                .map((x) => x.short || x.text)
                .join(' · '),
            )}</span></div>`
          : ''
      }
      ${(() => {
        const jm = E.jobMoney(S, pl);
        return jm.over || jm.shortMonths > 0
          ? `<div class="rsn warn" data-testid="jobmoney-shortfall"><span aria-hidden="true">!</span><span>Job money you set for your homes: ${$f(jm.assigned)} a month, but your job leaves ${$f(jm.surplus0)} after living costs${jm.shortMonths ? ', so ' + jm.shortMonths + ' month' + (jm.shortMonths === 1 ? '' : 's') + ' of the plan cannot pay the full amount' : ''}. Lower an amount on a home page or raise your pay.</span></div>`
          : '';
      })()}
      ${!(f.feas && f.feas.none) && f.fixes.length ? `<div class="fixes" data-testid="fixes"><b>What would fix it</b><ul>${f.fixes.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}</section>
    <div class="sec">Your month: now and at plan end</div><section class="card">${picture}${jobNote}<p class="note">Cash flow the trust reinvests, and the job money above, move out of your cash into the trust or its loans each month; that is already taken out under Cash over time.</p>
    ${(() => {
      const later = pl.extraLater,
        pe = k.planEnd;
      return `${later > 0.5 ? `<p class="note">Plus ${$f(later)}/mo of extra payments on assets you have not bought yet.</p>` : ''}
    <div data-testid="finances-sync" style="border-top:2px solid var(--line);margin-top:8px;padding-top:6px"><b>At plan end</b> <span class="note">(the plan end, in ${UNIT()}; the Portfolio page shows today's terms)</span><div class="f"><span class="lb">Before tax</span><b data-testid="sync-cf">${$s(pe.cfBefore)}</b></div><div class="f"><span class="lb">After tax</span><b>${$s(pe.cfAfter)}</b></div><div class="f"><span class="lb">Left over each month</span><b>${$s(pe.net)}</b></div>
    </div>`;
    })()}</section>
    ${colSec('fin-inc', 'Your income', p.jobs.length + (p.jobs.length === 1 ? ' job' : ' jobs') + ' · ' + $f(p.jobs.reduce((s0, j) => s0 + E.jobMonthly(j, 0) * (1 - E.taxPctFor(j) / 100), 0)) + '/mo', `${jobs}<button class="addrow cardbtn" data-addjob="salary" data-testid="add-job">+ Add a salaried job</button><button class="addrow cardbtn" data-addjob="hourly" data-testid="add-hourly-job">+ Add an hourly job (wage and tips)</button>`, true)}
    ${colSec('fin-cash', 'Your cash and expenses', $f(p.cash) + ' saved', `<section class="card">${field('Savings you have now', 'p.cash', grp(p.cash), { pre: '$' })}${field('Cash interest', 'p.cashApy', r(p.cashApy, 2), { suf: '%' })}${field('Cash cushion (months)', 'p.emergencyMonths', r(p.emergencyMonths, 1))}${field('Living costs / month', 'p.living', grp(p.living), { pre: '$' })}${field('Your own rent or mortgage / month', 'p.housing', grp(p.housing), { pre: '$' })}<p class="note">Already part of living costs. Lenders count it as a debt when they work out your debt-to-income.</p>${field('Cost increases / year', 'p.inflation', r(p.inflation, 1), { suf: '%' })}${field('Other debts / month', 'g.otherDebt', grp(g.otherDebt), { pre: '$' })}</section>`, true)}
    <div class="sec">Cash over time</div><section class="card" data-testid="cash-card"><p class="note" data-testid="fin-unit">Amounts for later months are in ${UNIT()}; amounts for today are the same in both. Change this in Assumptions.</p>${finChart(f)}
      <div class="f"><span class="lb">Lowest cash</span><b data-testid="lowest-cash">${$f(k.minLiquid)} · ${mond(k.minLiquidMonth)}</b></div>
      <div class="f stack"><span class="lb">Months you could last without a paycheck</span><b>${isFinite(k.minRunway) ? r(k.minRunway, 1) : 'No limit — portfolio income covers it'}</b></div>
      <p class="note" data-testid="funding-line">Paid from your own pocket: the down payments the trust cannot fund (sale proceeds, pooled cash flow and its line of credit do not cover them) total ${$f(pl.outsideTotal)} over the plan. ${k.capitalTotal > 0 ? `Partners and investors you listed cover ${$f(Math.min(k.totalOutside, k.capitalTotal))}; the rest` : 'All of it'} comes out of your savings and monthly income.</p>
      ${calls ? `<p class="note" style="margin-top:8px">Biggest cash calls</p>${calls}` : ''}</section>
    ${colSec(
      'fin-tax',
      'Taxes',
      p.portfolioTaxPct === null && p.salesTaxPct === null ? 'worked out' : 'you set',
      `<section class="card" data-testid="tax-card">${field('Tax on portfolio income (blank = worked out)', 'p.portfolioTaxPct', p.portfolioTaxPct === null ? '' : r(p.portfolioTaxPct, 1), { suf: '%', ph: 'auto ' + r(taxEff, 1), info: 'portfoliotax' })}${field('Tax on gains when you sell (blank = worked out)', 'p.salesTaxPct', p.salesTaxPct === null ? '' : r(p.salesTaxPct, 1), { suf: '%', ph: 'auto', info: 'salestax' })}${field('State income tax', 'p.statePct', r(p.statePct, 1), { suf: '%' })}${field('Land share of a property purchase', 'p.landPct', r(p.landPct, 0), { suf: '%' })}${field('Goodwill share of a business price', 'p.bizIntPct', r(p.bizIntPct, 0), { suf: '%' })}
      <div class="f"><span class="lb">Depreciation now (per month)</span><b data-testid="tax-dep">${$f(R.dep[0])}</b></div><div class="f"><span class="lb">Taxable portfolio profit now (per month)</span><b data-testid="tax-taxable">${$s(R.taxable[0])}</b></div><div class="f"><span class="lb">Income tax on it now (per month)</span><b data-testid="tax-now">${$f(R.portTax[0])}</b></div>
      <div class="f"><span class="lb">Income tax at plan end (per month)</span><b data-testid="tax-end">${$f(k.planEnd.tax)}</b> </div>
      ${
        Object.keys(f.saleInfo).length
          ? `<p class="note" data-testid="sale-taxes">Sales in this plan: ${Object.keys(f.saleInfo)
              .map(
                (id) =>
                  esc(H(id).addr) +
                  ' ' +
                  $c(f.saleInfo[id].tax) +
                  ' tax (' +
                  r(f.saleInfo[id].rate, 0) +
                  '% of gain)',
              )
              .join('; ')}.</p>`
          : ''
      }
      <p class="note">Worked out: profit = net operating income - loan interest - depreciation. Homes are written off over 27.5 years and commercial buildings over 39 (land excluded); a business price is split into goodwill (15 years) and equipment (7 years). Tax is the extra federal tax your wages plus this profit owe (2026 single brackets), plus 3.8% on rental profit above $200,000 of income. A loss pays no tax. Sales: long-term gains 0/15/20%, depreciation on buildings taxed up to 25%, business depreciation as ordinary income, 3.8% on property gains above $200,000. Short holds are ordinary income. Type a rate to use your own flat rate instead.</p></section>`,
      true,
    )}
    ${colSec('fin-time', 'Time and managers', p.operating + ' run by you', `<section class="card">${field('Businesses you run yourself', 'p.operating', p.operating)}${field('Hours / week each takes', 'p.bizHours', r(p.bizHours, 0))}${field('Manager pay per other business / mo', 'p.gmMonthly', grp(p.gmMonthly), { pre: '$' })}<p class="note">A business profit figure assumes the owner does the work. Businesses beyond the ones you run need a paid manager.</p></section>`, true)}
    ${colSec('fin-planned', 'Money going out', p.planned.length ? p.planned.length + ' planned' : 'none planned', `<section class="card"><div class="subh"><h3>Planned one-time expenses</h3>${infoBtn('planned')}</div>${p.planned.length ? p.planned.map((it) => listRow('pl', it, 'Expense')).join('') : '<p class="note" style="margin:0">Things like a wedding, a car or tuition. They come out of your cash.</p>'}<button class="addrow" data-addplanned data-testid="add-planned">+ Add an expense</button></section>`, true)}
    ${colSec('fin-capital', 'Money coming in', p.capital.length ? p.capital.length + ' lined up' : 'none lined up', `<section class="card"><div class="subh"><h3>Outside capital you have lined up</h3>${infoBtn('capital')}</div>${p.capital.length ? p.capital.map((it) => listRow('cap', it, 'Capital')).join('') : '<p class="note" style="margin:0">Partners, investors or family who will put money in. It is added to your cash that month.</p>'}<button class="addrow" data-addcap data-testid="add-capital">+ Add capital</button></section>`, true)}`;
  }

