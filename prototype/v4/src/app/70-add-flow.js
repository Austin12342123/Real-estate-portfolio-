  /* ---------- add page: pick a type, then a loan option that auto-fills the terms ---------- */
  const mfName = (n, pack) =>
    pack ? 'pack of ' + n + ' houses' : n === 2 ? 'duplex' : n === 4 ? 'fourplex' : n + '-unit building';
  const PRESETS = [
    ['Duplex', 2, false],
    ['Fourplex', 4, false],
    ['Section 8 pack of 5', 5, true],
    ['20 units', 20, false],
    ['50 units', 50, false],
  ];
  let exOpen = false; /* the Add screen's 'Start from an example' list: closed every time the screen opens */
  const loanLine = (l) =>
    l.dp >= 100
      ? 'No loan · pay the full price'
      : l.dp +
        '% down · ' +
        l.rate +
        '% · ' +
        (l.io ? 'interest-only, ' : '') +
        r(l.term / 12, 1) +
        ' yr' +
        (l.mat > 0 ? ', due in ' + r(l.mat / 12, 1) + ' yr' : '');
  /* ---------- the example editor: a sub-screen of the Add screen (same #add route). The draft is plain overrides in memory; nothing is stored until 'Save as my default'. ---------- */
  const exShort = (ex) => ex.tierName + ' · ' + ex.name;
  function exEditor() {
    const sh = E.exampleShipped(exEdit.id),
      d = exEdit.draft,
      ex = E.exEff(sh, d),
      cat = sh.cat,
      h = E.exampleAsset(ex),
      m = E.exampleMetrics(S, ex),
      warns = E.exWarnings(S, ex, m),
      pr = E.exPrune(sh, d),
      edited = Object.keys(pr).length > 0,
      saved = !!E.exOverrides()[sh.id];
    const X = (k) => {
      const sp = E.EXF[k],
        lb = E.exLabel(k, cat),
        P = 'x.' + k;
      if (k === 'revenue') return field(lb, P, grp(Math.round(E.revOf(h) * 100) / 100), { pre: '$', per: 1 });
      if (k === 'margin') return field(lb, P, r(E.marginOf(h), 2), { suf: '%' });
      if (k === 'units') return field(lb, P, E.unitsOf(h));
      return sp.kind === 'usd'
        ? field(lb, P, grp(h[k]), { pre: '$' })
        : sp.kind === 'pct'
          ? field(lb, P, r(h[k], 2), { suf: '%' })
          : field(lb, P, h[k]);
    };
    const fits =
      cat === 'multi'
        ? E.mfLoans(E.unitsOf(h), !!sh.pack)
        : E.loansFor(sh.type).map((l) => ({ loan: l, ok: true }));
    const loanSel = `<div class="f stack"><span class="lb">Loan option${infoBtn('loanoption')}</span><select class="loansel" data-exloan aria-label="Loan option" data-testid="ex-loan">${fits.map((x) => `<option value="${x.loan.id}" ${ex.loanId === x.loan.id ? 'selected' : ''}${x.ok || ex.loanId === x.loan.id ? '' : ' disabled'}>${esc(x.loan.name)}${x.ok ? '' : ' (not for ' + E.unitsOf(h) + ' units)'}</option>`).join('')}</select></div>`;
    const fields =
      E.exFields(cat).map(X).join('') +
      (cat === 'business'
        ? field('Owner profit / month', 'x.profit', grp(h.rent), {
            pre: '$',
            calc: 1,
            ro: 1,
            info: 'ownerprofit',
          })
        : '');
    const note =
      cat === 'business'
        ? 'Revenue is per month; per year works too, like 1,200,000/yr. Profit = revenue × margin.'
        : cat === 'multi'
          ? 'Changing the units scales price, rent and costs, so each unit stays the same.'
          : "Your numbers become this example's default on this device.";
    const askBox =
      ask === 'exreset'
        ? confirmBox(
            'Reset “' + esc(sh.name) + '” to the original numbers? Other examples stay as they are.',
            'data-exreset-yes data-testid="ex-reset-confirm"',
            'Yes, reset',
          )
        : ask === 'exdiscard'
          ? confirmBox(
              'Discard your changes to this example?',
              'data-exdiscard-yes data-testid="ex-discard-confirm"',
              'Yes, discard',
            )
          : '';
    return `<div class="top"><button class="ic" data-exback aria-label="Back to the examples" data-testid="ex-back">‹</button><h2>Edit example</h2></div>
    <section class="card" data-testid="ex-editor"><div class="f head"><span class="lb"><b>${esc(exShort(sh))}</b>${edited ? ' <span class="tag" data-testid="ex-edit-tag">Edited</span>' : ''}${infoBtn('exedit')}</span></div><p class="note">${esc(note)}</p></section>
    <div class="emptyb exuse" role="status" aria-live="polite" data-testid="ex-edit-live"><span><b>Your numbers</b><br><span data-testid="ex-edit-preview">Cash needed ${$f(m.cash)} · cash flow ${$s(m.cf)}/mo${m.pay > 0.5 ? ' · DSCR ' + r(m.dscr, 2) : ''}</span></span></div>
    ${warns.map((w) => `<div class="warnbox" data-testid="ex-warn" data-warn="${w.id}">⚠ ${esc(w.text)}</div>`).join('')}${!exStoreOK ? '<p class="note warntxt" data-testid="ex-storage-note">This device is not keeping example edits. They last until you close the app.</p>' : ''}
    <section class="card" style="margin-top:12px" data-testid="ex-fields">${fields}${loanSel}</section>
    <button class="btn" style="width:100%" data-exsave data-testid="ex-save">Save as my default</button>
    ${edited || saved ? '<button class="btn plain" data-exreset data-testid="ex-reset">Reset to original</button>' : ''}<button class="btn plain" data-excancel data-testid="ex-cancel">Cancel</button>${askBox}`;
  }
  const exCloseEditor = (msg) => {
    const id = exEdit && exEdit.id;
    exEdit = null;
    ask = null;
    exOpen = true;
    exMsg = msg || '';
    render();
    const fo = () => {
      const n = id && app.querySelector('[data-exedit="' + id + '"]');
      if (n) n.focus();
    };
    fo();
    setTimeout(
      fo,
      40,
    ); /* a box removed by the render fires one more render; focus goes back to the Edit button after it */
  };
  const exBack = () => {
    if (!exEdit) return;
    if (E.exDirty(E.exampleShipped(exEdit.id), exEdit.draft, exEdit.base)) {
      ask = 'exdiscard';
      render();
      const n = app.querySelector('[data-testid=ex-discard-confirm]');
      if (n) {
        n.scrollIntoView({ block: 'center' });
        n.focus();
      }
      return;
    }
    exCloseEditor('');
  };
  function exSetField(k, s) {
    if (!exEdit || k === 'profit') return false;
    const r2 = E.exDraftSet(E.exampleShipped(exEdit.id), exEdit.draft, k, String(s));
    if (!r2.ok) return false;
    exEdit.draft = r2.draft;
    return true;
  }
  const type_price = (tp) => (tp === 'business' ? 'Price' : 'Price');
  function addPage() {
    if (EXED && exEdit && !UI.addOwned && E.exampleShipped(exEdit.id)) return exEditor();
    const tp = E.TYPES[UI.addType] ? UI.addType : 'house',
      multi = tp === 'house' && UI.addKind === 'multi',
      un = Math.min(500, Math.max(2, Math.round(+UI.addUnits) || 2)),
      pack = multi && !!UI.addPack;
    const fits = multi ? E.mfLoans(un, pack) : E.loansFor(tp).map((l) => ({ loan: l, ok: true })),
      list = fits.map((x) => x.loan);
    const sel = (fits.find((x) => x.loan.id === UI.addLoan && x.ok) || fits.find((x) => x.ok)).loan.id;
    const blurb = {
      house: 'A single-family rental or primary home.',
      commercial: 'Retail, office, storage or industrial. Valued on rent and cap rate.',
      business: 'An operating business you buy. Valued on owner profit and growth.',
    }[tp];
    const one = (x) => {
      const l = x.loan,
        on = l.id === sel,
        off = !x.ok;
      return `<div class="loanrow"><button class="loanopt ${on ? 'on' : ''}${off ? ' off' : ''}" data-pickloan="${l.id}" aria-pressed="${on}"${off ? ' disabled' : ''} data-testid="loan-${l.id}"${off ? ' data-why="' + esc(l.only) + '"' : ''}><b>${esc(l.name.replace(/\s*\(you live there\)/i, ''))}</b><span>${loanLine(l)}</span>${off ? `<small class="why" data-testid="loan-why">Not for ${un} units: ${esc(l.only.charAt(0).toLowerCase() + l.only.slice(1))}</small>` : l.info ? `<small data-testid="loan-info-only">Info only · modelled as ${esc(l.modelledAs)}</small>` : l.dp >= 100 ? '' : `<small>${esc(l.note.split(/(?<=\.)\s/)[0])}</small>`}</button>${infoBtn(GL.LOAN[l.id])}</div>`;
    };
    const grpHtml = (g) =>
      fits
        .filter((x) => x.loan.group === g)
        .map(one)
        .join('');
    const loanHtml = multi
      ? `<p class="note lgrp" data-testid="loan-fit"><b>${esc(un + ' units')}</b>: ${pack ? 'separate houses bought together, financed as a portfolio.' : un <= 4 ? 'financed like a home, and you can live in one unit.' : 'financed on the income of the building, not your pay.'} ${fits.filter((x) => x.ok).length} of ${fits.length} options fit.</p><p class="note lgrp"><b>If you will live there</b><br>You must move into one unit.</p>${grpHtml('live')}<p class="note lgrp"><b>Investor loans</b></p>${grpHtml('invest')}<p class="note lgrp"><b>Creative financing</b><br>Info only options are modelled as the closest normal loan.</p>${grpHtml('creative')}<p class="note lgrp" data-testid="loan-typical">Rates and terms are typical, not a quote.</p>`
      : (() => {
          const inv = list.filter((l) => !l.ownerOcc),
            live = list.filter((l) => l.ownerOcc),
            ob = (l) => one({ loan: l, ok: true });
          return (
            inv.map(ob).join('') +
            (live.length
              ? `<p class="note lgrp"><b>If you will live there</b><br>FHA and 203(k) loans need you to move in.</p>` +
                live.map(ob).join('')
              : '')
          );
        })();
    const typeCard =
      tp === 'house'
        ? `<div class="f head"><span class="lb">Home type${infoBtn('hometype')}</span></div><div class="seg" role="tablist" data-testid="home-type"><button data-kind="single" class="${multi ? '' : 'on'}" aria-pressed="${!multi}" data-testid="kind-single">Single family</button><button data-kind="multi" class="${multi ? 'on' : ''}" aria-pressed="${multi}" data-testid="kind-multi">Multi-family</button></div>`
        : '';
    const multiCard = multi
      ? `<div class="mfpick" data-testid="multi-fields">${field('Number of units', 'a.add.units', un)}<div class="chips" data-testid="unit-presets">${PRESETS.map((q) => `<button class="chip${q[1] === un && q[2] === pack ? ' on' : ''}" data-preset="${q[1]}${q[2] ? 'p' : ''}" aria-pressed="${q[1] === un && q[2] === pack}">${q[0]}</button>`).join('')}</div>
      <div class="f head"><span class="lb">Building or pack${infoBtn('mfpack')}</span></div><div class="seg" role="tablist" data-testid="pack-seg"><button data-addpack="0" class="${pack ? '' : 'on'}" aria-pressed="${!pack}">Building</button><button data-addpack="1" class="${pack ? 'on' : ''}" aria-pressed="${pack}">Pack of houses</button></div></div>`
      : '';
    /* 'Start from an example': four typical purchases for this category, one per cost and quality tier. Picking one only fills in what the Add button will create; it adds nothing by itself. */
    const exs = UI.addOwned ? [] : E.examplesFor(tp, multi),
      exSel = exs.find((x) => x.id === UI.addEx) || null;
    const exLine = (x, m) => {
      const mo = (n) => $f(n) + '/mo',
        cash = $k(m.cash) + ' cash';
      if (x.cat === 'house')
        return (
          $k(m.price) +
          (m.capex ? ' + ' + $k(m.capex) + ' rehab' : '') +
          (m.arv ? ' · worth ' + $k(m.arv) : '') +
          ' · rent ' +
          mo(m.rent) +
          ' · ' +
          cash
        );
      if (x.cat === 'multi')
        return (
          m.units +
          (x.pack ? ' houses' : ' units') +
          ' · ' +
          $k(m.price) +
          (m.capex ? ' + ' + $k(m.capex) + ' work' : '') +
          (m.arv ? ' · worth ' + $k(m.arv) : '') +
          ' · rent ' +
          mo(m.rent) +
          ' · ' +
          cash
        );
      if (x.cat === 'commercial')
        return $k(m.price) + ' · rent ' + mo(m.rent) + ' · ' + r(m.cap, 1) + '% cap · ' + cash;
      return (
        $k(m.price) +
        ' · sales ' +
        mo(m.revenue) +
        ' at ' +
        r(m.margin, 0) +
        '% · ' +
        r(m.mult, 1) +
        '× profit · ' +
        cash
      );
    };
    exs.forEach((x) => {
      INFO['ex-' + x.id] = E.exampleInfo(S, x);
    });
    const exRows = exs
      .map((x) => {
        const m = E.exampleMetrics(S, x),
          on = exSel && exSel.id === x.id,
          ed = EXED && x.edited && x.edited.length;
        return `<div class="loanrow"><button class="loanopt ${on ? 'on' : ''}" data-expick="${x.id}" aria-pressed="${on}" data-testid="ex-${x.id}"><b>${esc(x.tierName)} · ${esc(x.name)}${ed ? ' <span class="tag" data-testid="ex-tag-' + x.id + '">Edited</span>' : ''}</b><span data-testid="ex-sum-${x.id}">${esc(exLine(x, m))}</span></button>${infoBtn('ex-' + x.id)}${EXED ? `<button type="button" class="chip link" data-exedit="${x.id}" data-testid="ex-edit-${x.id}" aria-label="Edit ${esc(x.name)}">Edit</button>` : ''}</div>`;
      })
      .join('');
    const exUse = exSel
      ? (() => {
          const m = E.exampleMetrics(S, exSel);
          return `<div class="emptyb exuse" data-testid="ex-using"><span><b>Using example: ${esc(exSel.name)}${EXED && exSel.edited && exSel.edited.length ? ' · Edited' : ''}</b><br><span data-testid="ex-preview">Cash needed ${$f(m.cash)} · cash flow ${$s(m.cf)}/mo</span></span><button type="button" class="chip link" data-exclear data-testid="ex-clear" aria-label="Clear the example and go back to the defaults">Clear</button></div>`;
        })()
      : '';
    const exHtml = exs.length
      ? `<button type="button" class="linkbtn leftbtn exlink" data-exopen aria-expanded="${exOpen}" data-testid="ex-toggle">${exSel ? 'Change example' : 'Start from an example'} ${exOpen ? '▾' : '▸'}</button>${exOpen ? `<section class="card" data-testid="ex-list"><p class="note" style="margin:0 4px 6px">Four typical purchases, cheapest first. Tap one to fill in the numbers; it is only added when you tap Add. Typical, not a quote.</p>${exMsg ? `<p class="note" role="status" data-testid="ex-msg" style="margin:0 4px 6px">${esc(exMsg)}</p>` : ''}${!exStoreOK && EXED ? '<p class="note warntxt" data-testid="ex-storage-note" style="margin:0 4px 6px">This device is not keeping example edits. They last until you close the app.</p>' : ''}${exRows}</section>` : ''}${exUse}`
      : '';
    UI.addF = UI.addF || {};
    const AF = UI.addF,
      selLoan = list.find((l) => l.id === sel) || list[0],
      loanOpen = !!UI.addLoanOpen,
      moreOpen = !!UI.addMore;
    const dfl = E.newAsset(
        tp,
        sel,
        multi ? Object.assign({ kind: 'multi', units: un, pack }, E.mfDefaults(un, pack)) : {},
      ),
      exm = exSel
        ? E.exampleMetrics(S, exSel)
        : null; /* the typical starting numbers: shown grey inside the boxes, used when a box is left blank */
    const phP = exm ? exm.price : dfl.price,
      phR = exm ? exm.rent || (exm.revenue * (exm.margin || 0)) / 100 : dfl.rent;
    const ef = (lab, p, val, ph, pre, info, tid) =>
      `<label class="f lf"><span class="lb">${lblOf(lab, info)}</span><span class="iw">${pre ? `<em>${pre}</em>` : ''}<input inputmode="text" data-num="1" data-pre="${esc(pre || '')}" data-suf="" enterkeyhint="done" autocapitalize="off" autocorrect="off" spellcheck="false" data-p="${p}" data-k="${p}" data-testid="${tid}" aria-label="${esc(lab)}" placeholder="${esc(ph)}" value="${val === undefined ? '' : grp(val)}"></span></label>`;
    const nmPh = {
      house: '12 Oak Street',
      commercial: 'Corner retail building',
      business: 'Laundromat on Main',
    }[tp];
    const title = UI.addOwned
      ? 'Add something you own'
      : tp === 'house'
        ? multi
          ? 'Add a multi-family'
          : 'Add a house'
        : tp === 'commercial'
          ? 'Add a commercial property'
          : 'Add a business';
    const job = UI.addOwned
      ? ''
      : `<div class="moreb"><button type="button" class="rowbtn" data-addmore aria-expanded="${moreOpen}" data-testid="add-more-toggle"><span>More details</span><span class="chev" aria-hidden="true">›</span></button>${moreOpen ? `<div class="moreg" data-testid="add-more"><div class="subh"><h3>Your job money in the trust</h3>${infoBtn('jobmoney')}</div>${ef('Job money to this loan / month', 'a.add.job', AF.job, 'Plan decides', '$', null, 'add-job-money')}<p class="note">Leave blank and the plan decides how much of your pay left after living costs goes to this loan. Type an amount to fix it. Everything else (tax, insurance, vacancy, loan terms) is on the next screen.</p></div>` : ''}</div>`;
    return `<div class="mast"><button class="ic back" data-go="" aria-label="Cancel and go back">‹</button><span class="kick">New entry</span></div>
    <h1 class="disp" data-testid="add-title">${title}</h1><p class="dek">${UI.addOwned ? 'It goes on the Real page. Next you set the loan and how many months you have already paid.' : 'Four facts are enough to begin.'}</p>${UI.addOwned ? '<span data-testid="add-owned-note" hidden></span>' : ''}
    <div class="seg pill" role="tablist">${['house', 'commercial', 'business'].map((x) => `<button data-addtype="${x}" class="${x === tp ? 'on' : ''}">${TL[x]}</button>`).join('')}</div>${typeCard}${multiCard}
    <section class="card lg" data-testid="add-essentials">${ef(
      tp === 'business' ? 'Business name' : 'Address or name',
      'a.add.name',
      undefined,
      nmPh,
      '',
      null,
      'add-name',
    )
      .replace('data-num="1" ', '')
      .replace('inputmode="text"', 'type="text" inputmode="text" autocapitalize="words"')
      .replace(/value="[^"]*"/, 'value="' + esc(AF.addr || '') + '"')}
      ${ef(type_price(tp), 'a.add.price', AF.price, grp(phP), '$', null, 'add-price')}${ef(tp === 'business' ? 'Owner profit / month' : 'Rent / month', 'a.add.rent', AF.rent, grp(phR), '$', null, 'add-rent')}
      <button type="button" class="rowbtn lrowb" data-loanopen aria-expanded="${loanOpen}" data-testid="loan-row"><span class="k">Loan</span><span class="v">${esc(selLoan.name.replace(/\s*\(you live there\)/i, ''))}</span><span class="chev" aria-hidden="true">›</span></button></section>
    ${loanOpen ? `<div class="sec">Pick a loan option</div><section class="card" data-testid="loan-options">${loanHtml}</section>` : ''}
    ${job}${exHtml}
    <button class="btn lgbtn" data-confirm-add="${tp}|${sel}" data-testid="confirm-add">Add ${multi ? esc(mfName(un, pack)) : TL[tp].toLowerCase()}</button>${tp === 'house' && !multi ? '<button class="linkbtn quiet" data-go="import/new">Have a Zillow listing? Import it</button>' : ''}`;
  }

