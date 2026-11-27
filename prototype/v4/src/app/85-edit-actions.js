  /* ---------- editing: every field is an input; derived fields back-solve ---------- */
  const reArv = (h) => {
    const av = E.autoArv(h);
    if (av > 0) {
      h.arv = av;
      h.arvAuto = true;
      h.gain = null;
    } else {
      h.arv = 0;
      h.arvAuto = false;
      h.gain = null;
    }
  }; /* the appraisal follows its automatic value (cost basis and the average comp value) */
  function setField(p, s) {
    if (p.charAt(0) === 'x' && p.charAt(1) === '.')
      return exSetField(p.slice(2), s); /* the example editor's draft */
    if (undo) setUndo(null);
    const [t, x, k] = p.split('.');
    if (t === 'a' && k === 'name') {
      UI.addF = UI.addF || {};
      UI.addF.addr = String(s).slice(0, 80);
      return true;
    } /* the Add screen's name / address draft */
    if (t === 'a' && (k === 'price' || k === 'rent' || k === 'job')) {
      UI.addF = UI.addF || {};
      if (String(s).trim() === '') {
        delete UI.addF[k];
        return true;
      }
      const nn = parseFloat(
        String(s)
          .replace(/,/g, '')
          .replace(/[^0-9.\-eE+]/g, ''),
      );
      if (isNaN(nn)) return false;
      UI.addF[k] = Math.max(0, nn);
      return true;
    } /* blank = the typical starting number / the plan's own split */
    if (k === 'addr') {
      H(x).addr = s;
      return true;
    }
    if (t === 'h' && (k === 'comp' || k === 'jobSavedOverride') && String(s).trim() === '') {
      const hj = H(x);
      if (!hj) return false;
      if (k === 'jobSavedOverride') hj.jobSavedOverride = null;
      else {
        const wa = E.arvIsAuto(hj);
        hj.comp = null;
        if (wa) reArv(hj);
      }
      return true;
    } /* blank = Auto / no comp value: every number goes back to what it was */
    if (t === 'h' && k === 'jobPay' && String(s).trim() === '') {
      const hj = H(x);
      if (!hj) return false;
      hj.jobPay = null;
      return true;
    } /* blank = back to the plan's own split of your job money */
    const list = { j: 'jobs', o: 'planned', c: 'capital' }[t];
    if (list && k === 'name') {
      const it = S.p[list].find((q) => q.id === x);
      if (it) it.name = s;
      return true;
    }
    if (t === 'j' && (k === 'end' || k === 'tax') && String(s).trim() === '') {
      const jb = S.p.jobs.find((q) => q.id === x);
      if (jb) jb[k] = null;
      S.p = E.normalizePersonal(S.p);
      return true;
    }
    if (t === 'p' && (x === 'portfolioTaxPct' || x === 'salesTaxPct') && String(s).trim() === '') {
      S.p[x] = null;
      S.p = E.normalizePersonal(S.p);
      return true;
    }
    if (t === 'h' && k === 'mgmtPct' && String(s).trim() === '') {
      const hm = H(x);
      if (!hm || (hm.type || 'house') === 'business') return false;
      hm.mgmtPct = null;
      return true;
    } /* blank = back to the Assumptions rate */
    if (t === 'h' && k === 'closingPct' && String(s).trim() === '') {
      const hc = H(x),
        lc = hc && E.loanById(hc.loanId);
      if (!hc) return false;
      hc.closingPct = lc ? lc.closing : null;
      return true;
    } /* blank = back to the loan's own closing % (or the Assumptions % with no loan) */
    if (t === 'h' && (k === 'refiRate' || k === 'refiTermY') && String(s).trim() === '') {
      H(x)[k === 'refiRate' ? 'refiRate' : 'refiTerm'] = null;
      return true;
    }
    const n = parseFloat(
      String(s)
        .replace(/,/g, '')
        .replace(/[^0-9.\-eE+]/g, ''),
    );
    if (isNaN(n)) return false;
    if (t === 'g') {
      if (x === 'refiTermY') S.g.refiTerm = Math.max(12, Math.round(n * 12));
      else S.g[x] = n;
      return true;
    }
    if (t === 'p') {
      S.p[x] = n;
      S.p = E.normalizePersonal(S.p);
      return true;
    }
    if (list) {
      const it = S.p[list].find((q) => q.id === x);
      if (!it) return false;
      it[k] = n;
      S.p = E.normalizePersonal(S.p);
      return true;
    }
    if (t === 'a') {
      if (k !== 'units' || n !== Math.round(n) || n < 2 || n > 500) return false;
      UI.addUnits = n;
      return true;
    } /* the Add screen's unit count */
    if (t === 'h' && k === 'pos') {
      const hh = H(x);
      if (!hh || hh.status === 'owned') return false;
      const before = JSON.stringify(S),
        r0 = E.moveTo(S, x, n);
      if (r0.changed) {
        logEv('reorder', 'moved one planned asset to a new buy position');
        setUndo({
          text: 'Moved ' + hh.addr + ' to #' + r0.pos + '. Every number below it is updated.',
          label: hh.addr,
          snap: before,
          order: true,
        });
      }
      return true;
    } /* the buy position: list order across all planned assets */
    const h = H(x),
      v = E.view(S, h);
    h.fresh = false;
    const wasAuto =
      k === 'capex' || k === 'comp'
        ? E.arvIsAuto(h)
        : false; /* was the appraisal following the budget before this edit? */
    if (k === 'mgmtAmt') return false;
    if (k === 'mgmtPct') {
      if ((h.type || 'house') === 'business') return false;
    } else if (k === 'units' || k === 'rentUnit' || k === 'maintPct') {
      if (!E.isMulti(h)) return false;
    }
    if (k === 'units') {
      if (n !== Math.round(n) || n < 2 || n > 500) return false;
      const f = n / E.unitsOf(h),
        sc = (x) =>
          Math.round(
            x * f,
          ); /* more or fewer units of the same kind: price, rent, tax, insurance, HOA and other owner costs scale with the count, so every per-unit figure stays the same */
      h.units = n;
      h.price = sc(h.price);
      h.rent = sc(h.rent);
      h.tax = sc(h.tax);
      h.ins = sc(h.ins);
      h.hoa = sc(h.hoa);
      h.mfOther = sc(h.mfOther);
      if (h.capex > 0) h.capex = sc(h.capex);
      if (h.arvAuto) h.arv = E.autoArv(h);
      else if (h.arv > 0) h.arv = sc(h.arv);
      h.gain = null;
      return true;
    } else if (k === 'rentUnit') {
      h.rent = Math.max(0, n) * E.unitsOf(h);
    } else if (k === 'mgmtPct') {
      h.mgmtPct = Math.min(30, Math.max(0, n));
    } else if (k === 'maintPct') {
      h.maintPct = Math.min(10, Math.max(0, n));
    } else if (k === 'extra') {
      h.extra = Math.max(0, n);
      h.driver = 'extra';
    } else if (k === 'wait') {
      h.wait = Math.max(0, Math.round(n));
      h.driver = 'months';
    } else if (k === 'down') {
      h.dp = Math.min(100, Math.max(0, (n / h.price) * 100));
    } else if (k === 'dp') {
      h.dp = Math.min(100, Math.max(0, n));
    } else if (k === 'termY') {
      h.term = Math.max(12, Math.round(n * 12));
    } else if (k === 'refiTermY') {
      h.refiTerm = Math.max(12, Math.round(n * 12));
    } else if (k === 'mat') {
      h.mat = Math.max(0, Math.round(n));
    } else if (k === 'nnn') {
      h.nnn = Math.min(100, Math.max(0, n));
    } else if (k === 'payoff') {
      const B0 = E.balToday(h),
        m = Math.max(
          1,
          Math.round(n),
        ); /* smallest extra that pays the loan off in m months, found against the engine's own payoff (so balloon / refinance loans work too) */
      let lo = 0,
        hi = Math.max(1, B0);
      if (E.payoffN(h, 0, S) <= m) hi = 0;
      else {
        for (let q = 0; q < 60; q++) {
          const mid = (lo + hi) / 2;
          if (E.payoffN(h, mid, S) <= m) hi = mid;
          else lo = mid;
        }
        hi = Math.ceil(hi * 100) / 100;
      }
      h.extra = hi;
      h.driver = 'extra';
    } else if (k === 'jobSavedOverride') {
      h.jobSavedOverride = Math.max(0, n);
    } else if (k === 'comp') {
      h.comp = n > 0 ? n : null;
    } else if (k === 'price') {
      h.price = Math.max(0, n);
    } else if (k === 'arv') {
      h.arv = Math.max(0, n);
      h.gain = null;
      h.arvAuto = false;
    } else if (k === 'gain') {
      h.gain = n;
      h.arvAuto = false;
      h.arv = Math.max(0, Math.round(h.price + (h.capex || 0) + n));
    } else if (k === 'rate') {
      h.rate = Math.min(30, Math.max(0, n));
    } else if (k === 'revenue') {
      h.revenue = Math.max(0, n);
      h.rent = Math.round((h.revenue * E.marginOf(h)) / 100);
    } else if (k === 'margin') {
      const rv = E.revOf(h);
      h.margin = Math.min(100, Math.max(0, n));
      h.revenue = rv;
      h.rent = Math.round((rv * h.margin) / 100);
    } else if (
      k === 'loan' ||
      k === 'profit' ||
      k === 'profityr' ||
      k === 'need' ||
      k === 'caprate' ||
      k === 'mult' ||
      k === 'proceeds'
    )
      return false;
    else if (k === 'growth') h.growth = Math.min(100, Math.max(-50, n));
    else if (k === 'closingPct') h.closingPct = Math.min(20, Math.max(0, n));
    else h[k] = Math.max(0, n);
    if (k === 'comp' && wasAuto) reArv(h);
    if (k === 'capex' && wasAuto) {
      if (h.capex > 0) {
        h.arv = E.autoArv(h);
        h.arvAuto = true;
        h.gain = null;
      } else {
        h.arv = 0;
        h.arvAuto = false;
        h.gain = null;
      }
    } /* the budget drives the appraisal (price + 1.4 x budget) unless the user typed their own */ else if (
      (k === 'price' || k === 'capex') &&
      h.arvAuto
    )
      h.arv = E.autoArv(h); /* an auto appraisal follows price and budget */
    else if ((k === 'price' || k === 'capex') && h.gain !== null && isFinite(h.gain))
      h.arv = Math.max(
        0,
        Math.round(h.price + (h.capex || 0) + h.gain),
      ); /* a typed gain keeps the appraisal in step */
    if (['dp', 'down', 'rate', 'termY'].indexOf(k) >= 0) h.loanId = 'custom';
    return true;
  }
  /* the Undo toast: set it here so it always has its 10-second timer; clearing it (an edit, Undo, the timer) takes the toast off the screen */
  const setUndo = (u) => {
    undo = u;
    clearTimeout(undoTimer);
    if (u)
      undoTimer = setTimeout(() => {
        undo = null;
        const n = document.querySelector('[data-testid=undo-banner]');
        if (n) n.remove();
      }, 10000);
  };
  /* 'Portfolio n': n = the number of saved portfolios + 1, moved up when that name is already taken, so a name never repeats (also after a delete) */
  const portNo = () => {
    let n = SAVED.length + 1;
    while (SAVED.some((x) => new RegExp('^Portfolio ' + n + '(\\D|$)').test(x.name))) n++;
    return n;
  };
  const uniqueName = (nm) => {
    let out = nm,
      k = 2;
    while (SAVED.some((x) => x.name === out)) out = (nm + ' (' + k++ + ')').slice(0, 60);
    return out;
  };
  const newSid = () => 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  if (switched) {
    try {
      const old = JSON.parse(switched);
      if (old && Array.isArray(old.houses) && old.houses.length && SAVED.length < MAXSAVED) {
        SAVED.unshift({
          id: newSid(),
          name: 'Portfolio ' + portNo() + ' (before the update)',
          ts: Date.now(),
          state: old,
        });
        if (saveSaved()) UI.migNote = SAVED[0].name;
      }
    } catch (e) {}
    switched = null;
  }
  const tDiag2 = performance.now();
  /* 'portfolio replaced' detection: before anything is saved, compare this start with the last known fingerprint (rep-v4-diag). Never automatic: it only raises a banner. */
  if (D && !DG.flags.replaced && D.replacedCheck(S, DG.fp, DG.ev)) {
    DG.flags.replaced = { ts: NOW(), prev: DG.fp };
    logEv(
      'anomaly',
      'state-replaced: the portfolio is now the default plan with different assets than the last known portfolio (' +
        DG.fp.n +
        ' assets before)',
    );
    dgSave();
  }
  /* B1: no daily copies; a safety copy is taken only before a major change */
  DIAG_MS += performance.now() - tDiag2;
  save(); /* persist the migrated state (S.v, S.added) so it is stored right after load */
  function showPage(k) {
    if (PAGES.indexOf(k) < 0 || k === page) return;
    page = k;
    selId = null;
    ask = null;
    savedMsg = '';
    prev = {};
    render();
  }
  function doSave(name) {
    const nm = uniqueName(
      String(name || '')
        .trim()
        .slice(0, 60) || 'Portfolio ' + portNo(),
    );
    if (SAVED.length >= MAXSAVED) {
      savedMsg = 'You can keep up to ' + MAXSAVED + ' saved portfolios. Delete one first.';
      return false;
    }
    SAVED.unshift({ id: newSid(), name: nm, ts: Date.now(), state: JSON.parse(JSON.stringify(S)) });
    if (!saveSaved()) {
      SAVED.shift();
      savedMsg =
        'Could not save: this device has no storage space left (or storage is switched off). Use Show backup in Assumptions to keep a copy.';
      return false;
    }
    savedMsg = 'Saved “' + nm + '”.';
    return true;
  }
  /* opening a saved portfolio replaces the working one; the old one comes back with Undo */
  function loadSaved(id) {
    const x = SAVED.find((q) => q.id === id);
    ask = null;
    if (!x) {
      render();
      return;
    }
    safeCopy('before opening a saved portfolio');
    logEv('open-saved', 'opened a saved portfolio');
    setUndo({
      text: 'Opened “' + x.name + '”. Your previous portfolio is kept: tap Undo to bring it back.',
      label: 'previous portfolio',
      snap: JSON.stringify(S),
    });
    S = E.normalize(JSON.parse(JSON.stringify(x.state)));
    if (!S.p) S.p = E.samplePersonal();
    S.p = E.normalizePersonal(S.p);
    S.v = DATA_V;
    E.applyAdditions(S);
    S.seq = +S.seq || 0;
    selId = null;
    page = 'planned';
    prev = {};
    savedMsg = '';
    save();
    render();
  }
  const app = document.getElementById('app');
