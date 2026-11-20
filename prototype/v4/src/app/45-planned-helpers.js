  /* Can the plan buy this planned asset? One test list (E.feasible): funding from the pool on the one clock (months from today), the lender tests, reserves, income fit, deal quality, stress tests and concentration.
     The result is worked out again from the live state every time (memoised only per plan object, so an edit, an added / removed / reordered asset always shows). */
  const FEM = new WeakMap();
  function feasFor(pl) {
    const raw = pl.raw || pl;
    let m = FEM.get(raw);
    if (!m) {
      const fin = S.p ? E.finance(S, raw) : null;
      m = { fin, fe: fin && fin.feas ? fin.feas : E.feasible(S, raw, null) };
      FEM.set(raw, m);
    }
    return m;
  }
  function verdictFor(pl, h) {
    const tr = pl.trust[h.id],
      A = feasFor(pl).fe.assets[h.id];
    if (A) {
      const cls = A.verdict === 'no' ? 'bad' : A.verdict === 'tight' ? 'warn' : 'ok';
      return {
        cls,
        word: cls === 'bad' ? 'Not possible' : cls === 'warn' ? 'Possible, tight' : 'Possible',
        why: A.short ? A.short.replace(/^(Not possible|Tight|Late) - /, '') : '',
        verdict: A.verdict,
        kind: A.kind,
      };
    }
    const a = E.afford(S, h, pl);
    if (!tr.ok) return { cls: 'bad', word: 'Not possible', why: '' };
    if (a.cls === 'bad')
      return {
        cls: 'bad',
        word: 'Not possible',
        why:
          a.dti >= 999
            ? 'no qualifying income is set'
            : 'lenders would decline: debt-to-income ' + r(a.dti) + '% vs ' + S.g.dti + '% limit',
      };
    if (a.cls === 'warn')
      return {
        cls: 'warn',
        word: 'Possible, tight',
        why: 'debt-to-income ' + r(a.dti) + '% is near the ' + S.g.dti + '% limit',
      };
    return { cls: 'ok', word: 'Possible', why: '' };
  }
  /* the shortfall panel (planned assets that are not 'yes') and the 'Can I buy this?' scorecard (every planned asset): both read E.feasible / E.shortfall for the live plan */
  const LVC = { ok: 'ok', caution: 'warn', fail: 'bad' };
  function buyPanel(pl, h) {
    const m = feasFor(pl),
      A = m.fe.assets[h.id];
    if (!A) return '';
    const raw = pl.raw || pl,
      sf = A.verdict !== 'yes' ? E.shortfall(S, raw, m.fin, h.id, { sim: true }) : null,
      vd = verdictFor(pl, h);
    const sgnv = (n) => (n < -0.5 ? '−' : '') + $f(Math.abs(n));
    const ln = (k, cls, tid) => {
      const l = sf.lines[k],
        v = l.value;
      return `<div class="f sfl" data-testid="${tid || 'sf-' + k}"><span class="lb">${esc(l.label)}<small class="dh">${esc(l.how)}</small></span><b class="${cls}" data-v="${Math.round(v)}">${sgnv(v)}</b></div>`;
    };
    let panel = '';
    if (sf) {
      const c = sf.cash,
        mo = sf.monthly,
        top = A.top;
      panel = `<section class="card sfp ${vd.cls}" data-testid="shortfall-panel" data-verdict="${A.verdict}" data-kind="${A.kind}"><div class="f head"><span class="lb"><b>Can I buy this?</b>${infoBtn('buyscore')}</span><span class="vchip ${vd.cls}" data-testid="sf-verdict">${vd.word}</span></div>
        <p class="note sfwhy" data-testid="sf-why">${esc(top ? top.text : '')}</p>
        <div class="sfh">Cash to close · ${mondH(c.month)}${c.closest ? ' (closest the plan gets)' : ''}</div>
        ${ln('cashNeeded', '')}${ln('savings', '')}${ln('trustCash', '')}${ln('room', '')}${ln('pull', '')}${ln('downShort', c.short > 0.5 ? 'bad' : 'ok')}${ln('uncovered', c.uncovered > 0.5 ? 'bad' : 'ok')}
        <div class="sfh">Every month · today's dollars</div>
        ${ln('payment', '')}${ln('available', '')}${ln('monthShort', mo.covered ? 'ok' : 'bad')}
        <div class="sfh">What needs to change</div>${sf.changes.length ? `<ol class="sfch" data-testid="sf-changes">${sf.changes.map((x) => `<li data-testid="sf-change-${x.id}">${esc(x.text)}</li>`).join('')}</ol>` : '<p class="note" data-testid="sf-changes">Nothing in the numbers is short. The note above says what is tight.</p>'}
        <p class="note">Worked out from your live plan each time. Cash amounts are the plan's own, at the month it buys this (prices are today's, nothing is inflated); monthly amounts are in today's dollars.</p></section>`;
    }
    const cs = A.criteria,
      worst = cs.reduce((a2, x) => Math.max(a2, x.status === 'fail' ? 2 : x.status === 'caution' ? 1 : 0), 0),
      open = !(UI.coll.score === undefined ? worst === 0 : UI.coll.score),
      nBad = cs.filter((x) => x.status !== 'ok').length;
    const card = `<section class="card checks ${worst === 0 ? 'safe' : worst === 2 ? 'over' : 'caution'}" data-testid="scorecard" data-verdict="${A.verdict}"><div class="chkh"><h2 class="chkt">Can I buy this?${infoBtn('buyscore')}</h2><button type="button" class="chip link chkbtn" data-coll="score" aria-expanded="${open}" data-testid="scorecard-details">Details ${open ? '▾' : '▸'}</button></div>${worst === 0 ? '<p class="chkok" data-testid="scorecard-ok">✓ Every test passes</p>' : `<p class="chkflag ${worst === 2 ? 'bad' : 'warn'}" data-testid="scorecard-flag">${nBad} to look at</p>`}${open ? `<div class="chklist" data-testid="scorecard-list">${cs.map((x) => `<div class="chk lv-${LVC[x.status]}" data-testid="sc-${x.id}" data-lvl="${LVC[x.status]}" data-status="${x.status}"><div class="ct"><b>${esc(x.label)}</b><span class="cv lv-${LVC[x.status]}">${esc(x.measured)}</span></div><small>${esc(x.how)}${x.limit ? ' · limit: ' + esc(x.limit) : ''}</small></div>`).join('')}</div>` : ''}</section>`;
    return panel + card;
  }
  /* the one-line math under a planned row: what it needs, what the pool has, and the month (full numbers are in the row's panel and on the asset page) */
  function shortFor(pl, h) {
    const tr = pl.trust[h.id],
      need = tr.need || E.needFor(S, h);
    if (!tr.ok)
      return `needs ${$f(need)} · the pool never gets there${tr.best ? ' (closest ' + $f(tr.best.avail) + ')' : ''}`;
    if (!tr.pooled)
      return S.p
        ? `needs ${$f(need)} · your savings above the cushion + job money reach ${$f(tr.have)} by ${mondH(tr.month)}`
        : `needs ${$f(need)} · paid from your own cash`;
    return `needs ${$f(need)} · pool of ${tr.n} has ${$f(tr.have)} (room ${$f(tr.room)} + cash ${$f(tr.heldCash)}) · by ${mondH(tr.ready)}${tr.held ? ', held to ' + mondH(tr.buyIn) : ''}`;
  }
  /* the job money saved up in "Can the plan buy it?": Auto (empty) = the plan's own number; a typed amount replaces it for this asset's first purchase. Shown only where that sentence has the job-money part. */
  function jobSavedRow(pl, h) {
    const tr = pl.trust && pl.trust[h.id];
    if (!S.p || !tr || h.status === 'owned') return '';
    const set = h.jobSavedOverride !== null && h.jobSavedOverride !== undefined,
      auto = Math.max(0, (tr.have || 0) - (tr.savings || 0));
    if (!set && (!tr.ok || tr.pooled)) return '';
    return (
      field('Job money saved up', 'h.' + h.id + '.jobSavedOverride', set ? grp(h.jobSavedOverride) : '', {
        pre: '$',
        ph: grp(Math.round(auto)),
        info: 'jobsaved',
      }) +
      `<p class="note" data-testid="jobsaved-note">${set ? "You set this amount: it counts as real cash and replaces the plan's own." : "Empty = Auto: the plan's own " + $f(auto) + '.'} Type your own to replace it.</p>` +
      (set
        ? `<button type="button" class="btn plain" data-jobsaved-auto="${h.id}" data-testid="jobsaved-auto">Reset to auto</button>`
        : '')
    );
  }
  function mathFor(pl, h) {
    const tr = pl.trust[h.id],
      need = tr.need || E.needFor(S, h);
    if (!tr.ok)
      return `needs ${$f(need)} cash · the pool of everything above it never gets there${tr.best ? ' (closest: ' + $f(tr.best.avail) + ' ' + inm(tr.best.month) + ')' : ''}`;
    if (!tr.pooled)
      return S.p
        ? `needs ${$f(need)} cash · savings above the cushion ${$f(tr.savings)} + job money saved up ${$f(Math.max(0, tr.have - tr.savings))} = ${$f(tr.have)} · ready ${inm(tr.month)} (the ${$f(tr.rsv)} cushion at that month grows with inflation)`
        : `needs ${$f(need)} cash · nothing above it to borrow against, so it is paid from your own cash`;
    return `needs ${$f(need)} cash · pool of ${tr.n}: borrowing room ${$f(tr.room)} + cash ${$f(tr.heldCash)} = ${$f(tr.have)} · +${$f(tr.cf)}/mo reinvested · funded by the trust ${at(tr.ready)}${tr.held ? ', held until your date (' + mond(tr.buyIn) + ')' : ''}`;
  }

