  const exCat = (type, multi) => (type === 'house' ? (multi ? 'multi' : 'house') : type);
  /* ---------- editable examples. EXAMPLES above is the shipped table and is never changed. The user's own edits are a separate map of overrides { <example id>: { field: value } } (EXOV below, kept in localStorage 'rep-v4-examples' by the app).
     EVERY consumer reads an example through exEff(): shipped fields merged with the overrides. A field the user never edited follows the shipped value; an edited field wins. Overrides are not part of any portfolio, Saved portfolio or Undo snapshot. ---------- */
  const EXKEY = 'rep-v4-examples',
    EXV = 1;
  const ALLC = ['house', 'multi', 'commercial', 'business'],
    RECATS = ['house', 'multi'],
    PROPC = ['house', 'multi', 'commercial'];
  /* the editable fields: kind usd / pct / int, the allowed range, and the categories that have the field */
  const EXF = {
    price: { kind: 'usd', min: 1, max: 1e10, cats: ALLC },
    rent: { kind: 'usd', min: 0, max: 1e9, cats: PROPC },
    revenue: { kind: 'usd', min: 0, max: 1e10, cats: ['business'] },
    margin: { kind: 'pct', min: 0, max: 100, cats: ['business'] },
    tax: { kind: 'usd', min: 0, max: 1e9, cats: PROPC },
    ins: { kind: 'usd', min: 0, max: 1e9, cats: PROPC },
    hoa: { kind: 'usd', min: 0, max: 1e9, cats: PROPC },
    nnn: { kind: 'pct', min: 0, max: 100, cats: ['commercial'] },
    capex: { kind: 'usd', min: 0, max: 1e10, cats: RECATS },
    arv: { kind: 'usd', min: 0, max: 1e10, cats: RECATS },
    capexMonths: { kind: 'int', min: 0, max: 120, cats: RECATS },
    growth: { kind: 'pct', min: -50, max: 100, cats: ALLC },
    sellCost: { kind: 'pct', min: 0, max: 50, cats: ALLC },
    dp: { kind: 'pct', min: 0, max: 100, cats: ALLC },
    units: { kind: 'int', min: 2, max: 500, cats: ['multi'] },
  };
  const EXORDER = {
    house: ['price', 'capex', 'arv', 'capexMonths', 'rent', 'tax', 'ins', 'hoa', 'growth', 'sellCost', 'dp'],
    multi: [
      'units',
      'price',
      'capex',
      'arv',
      'capexMonths',
      'rent',
      'tax',
      'ins',
      'hoa',
      'growth',
      'sellCost',
      'dp',
    ],
    commercial: ['price', 'rent', 'tax', 'ins', 'hoa', 'nnn', 'growth', 'sellCost', 'dp'],
    business: ['price', 'revenue', 'margin', 'growth', 'sellCost', 'dp'],
  };
  const exFields = (cat) => (EXORDER[cat] || []).slice();
  const EXLBL = {
    price: 'Price',
    rent: 'Monthly rent',
    revenue: 'Total revenue',
    margin: 'Profit margin',
    tax: 'Property tax / mo',
    ins: 'Insurance / mo',
    hoa: 'HOA / mo',
    nnn: 'Tenants pay costs (NNN)',
    capex: 'Improvement budget',
    arv: 'New appraised value',
    capexMonths: 'Months to finish',
    growth: 'Growth / yr',
    sellCost: 'Selling costs',
    dp: 'Down payment',
    units: 'Number of units',
    loanId: 'Loan',
  };
  const exLabel = (k, cat) =>
    k === 'price' && (cat === 'commercial' || cat === 'business')
      ? 'Purchase price'
      : k === 'rent' && cat === 'multi'
        ? 'Total rent / mo'
        : k === 'rent' && cat === 'commercial'
          ? 'Monthly rent (all tenants)'
          : k === 'hoa' && cat === 'commercial'
            ? 'CAM & operating / mo'
            : k === 'growth'
              ? cat === 'house' || cat === 'multi'
                ? 'Appreciation / yr'
                : cat === 'commercial'
                  ? 'Value growth / yr'
                  : 'Business growth / yr'
              : EXLBL[k] || k;
  const exLoanOk = (cat, type, id) =>
    typeof id === 'string' &&
    (cat === 'multi'
      ? MFLOANS.some((l) => l.id === id)
      : LOANS.some((l) => l.id === id && l.types.indexOf(type) >= 0));
  /* the ONE validation function: a value the user typed (number or text) for one field -> { ok, v } or { ok:false, msg }. Blocking only for impossible values (not a number, negative, out of range); the last good value is kept by the caller. */
  function exCheck(cat, k, raw) {
    const sp = EXF[k];
    if (!sp || sp.cats.indexOf(cat) < 0) return { ok: false, msg: 'Not an editable number' };
    let v = raw;
    if (typeof v === 'string') {
      const t = v.replace(/[,\s$]/g, '');
      if (t === '') return { ok: false, msg: "Can't be blank" };
      v = /^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(t) ? Number(t) : NaN;
    } else if (typeof v !== 'number') return { ok: false, msg: 'Enter a number' };
    if (!isFinite(v)) return { ok: false, msg: 'Enter a number' };
    if (k === 'units') {
      if (v !== Math.round(v) || v < 2 || v > 500) return { ok: false, msg: 'Use a whole number, 2 to 500' };
      return { ok: true, v };
    }
    if (v < 0 && sp.min >= 0) return { ok: false, msg: "Can't be negative" };
    if (v < sp.min)
      return {
        ok: false,
        msg: sp.min > 0 && sp.min < 2 ? 'Must be more than 0' : 'At least ' + sp.min + '%',
      };
    if (v > sp.max) return { ok: false, msg: sp.kind === 'pct' ? 'At most ' + sp.max + '%' : 'Too large' };
    v =
      sp.kind === 'int'
        ? Math.round(v)
        : sp.kind === 'usd'
          ? Math.round(v * 100) / 100
          : Math.round(v * 1e4) / 1e4;
    return { ok: true, v };
  }
  /* shipped fields merged with the overrides -> the effective example every consumer uses (a new object; the shipped one is never touched). A different loan drops the shipped down payment, so the loan's own terms apply unless the user typed one. */
  function exEff(ex, ov) {
    ov = ov || {};
    const f = Object.assign({}, ex.f),
      cat = ex.cat;
    [
      'price',
      'rent',
      'tax',
      'ins',
      'hoa',
      'nnn',
      'capex',
      'arv',
      'capexMonths',
      'growth',
      'sellCost',
      'dp',
    ].forEach((k) => {
      if (ov[k] !== undefined && EXF[k].cats.indexOf(cat) >= 0) f[k] = ov[k];
    });
    const loanId = ov.loanId !== undefined && exLoanOk(cat, ex.type, ov.loanId) ? ov.loanId : ex.loanId;
    if (loanId !== ex.loanId && ov.dp === undefined) delete f.dp;
    if (cat === 'business' && (ov.revenue !== undefined || ov.margin !== undefined)) {
      const rv = ov.revenue !== undefined ? ov.revenue : f.revenue,
        mg = ov.margin !== undefined ? ov.margin : f.margin;
      f.revenue = rv;
      f.margin = mg;
      f.rent = Math.round((rv * mg) / 100);
    } /* owner profit = revenue x margin */
    const units = cat === 'multi' && ov.units !== undefined ? ov.units : ex.units;
    return Object.assign({}, ex, {
      f,
      loanId,
      units,
      shipped: ex.shipped || ex,
      edited: Object.keys(ov).filter(
        (k) => ov[k] !== undefined && (k === 'loanId' || (EXF[k] && EXF[k].cats.indexOf(cat) >= 0)),
      ),
      ov: Object.assign({}, ov),
    });
  }
  /* what a field holds on the asset an example makes (the value the editor shows) */
  const exVal = (ex, k) => {
    const h = exampleAsset(ex);
    return k === 'units' ? unitsOf(h) : k === 'loanId' ? ex.loanId : h[k];
  };
  /* drop overrides that equal what the example would have anyway, so 'Edited' means different from the shipped example and a later shipped change flows through */
  function exPrune(ex, ov) {
    const sh = ex.shipped || ex,
      o = Object.assign({}, ov);
    if (o.loanId !== undefined && (o.loanId === sh.loanId || !exLoanOk(sh.cat, sh.type, o.loanId)))
      delete o.loanId;
    Object.keys(o).forEach((k) => {
      if (o[k] === undefined) {
        delete o[k];
        return;
      }
      if (k === 'loanId') return;
      const t = Object.assign({}, o);
      delete t[k];
      if (exVal(exEff(sh, t), k) === o[k]) delete o[k];
    });
    return o;
  }
  /* cleaning stored overrides: unknown ids and fields dropped, bad types ignored, numbers clamped */
  function exClean(raw) {
    const out = { v: EXV, ov: {} };
    if (
      !raw ||
      typeof raw !== 'object' ||
      Array.isArray(raw) ||
      !raw.ov ||
      typeof raw.ov !== 'object' ||
      Array.isArray(raw.ov)
    )
      return out;
    Object.keys(raw.ov).forEach((id) => {
      const ex = EXAMPLES.find((x) => x.id === id),
        src = raw.ov[id];
      if (!ex || !src || typeof src !== 'object' || Array.isArray(src)) return;
      const o = {};
      Object.keys(src).forEach((k) => {
        const x = src[k];
        if (k === 'loanId') {
          if (exLoanOk(ex.cat, ex.type, x)) o.loanId = x;
          return;
        }
        const sp = EXF[k];
        if (!sp || sp.cats.indexOf(ex.cat) < 0 || typeof x !== 'number' || !isFinite(x)) return;
        let v = Math.min(sp.max, Math.max(sp.min, x));
        v =
          sp.kind === 'int'
            ? Math.round(v)
            : sp.kind === 'usd'
              ? Math.round(v * 100) / 100
              : Math.round(v * 1e4) / 1e4;
        o[k] = v;
      });
      const p = exPrune(ex, o);
      if (Object.keys(p).length) out.ov[id] = p;
    });
    return out;
  }
  let EXOV = {};
  const exOverrides = () => EXOV;
  const exSet = (map) => {
    EXOV = exClean({ v: EXV, ov: map }).ov;
    return EXOV;
  };
  const exEffective = (id, ov) => {
    const ex = EXAMPLES.find((x) => x.id === id);
    return ex ? exEff(ex, ov !== undefined ? ov : EXOV[id]) : null;
  };
  const examplesFor = (type, multi) =>
    EXAMPLES.filter((x) => x.cat === exCat(type, multi))
      .sort((a, b) => a.tier - b.tier)
      .map((x) => exEff(x, EXOV[x.id]));
  const exampleById = (id) => exEffective(id);
  const exampleShipped = (id) => EXAMPLES.find((x) => x.id === id) || null;
  /* storage helpers: storage = anything with getItem / setItem (the app passes localStorage; tests pass a stub). Every call is wrapped; failure keeps the overrides in memory. */
  function exRead(storage) {
    try {
      const t = storage.getItem(EXKEY);
      if (t == null) return { ok: true, ov: {} };
      let j;
      try {
        j = JSON.parse(t);
      } catch (e) {
        return { ok: true, ov: {}, bad: true };
      }
      return { ok: true, ov: exClean(j).ov };
    } catch (e) {
      return { ok: false, ov: null };
    }
  }
  function exWrite(storage) {
    try {
      storage.setItem(EXKEY, JSON.stringify({ v: EXV, ov: EXOV }));
      return true;
    } catch (e) {
      return false;
    }
  }
  function exLoad(storage) {
    const r = exRead(storage);
    if (r.ov) EXOV = r.ov;
    return r.ok;
  }
  /* save ONE example's overrides (empty = reset it). Re-reads the stored map first so another tab's edits to other examples are kept. Returns true when it reached storage. */
  function exCommit(storage, id, ov) {
    const ex = EXAMPLES.find((x) => x.id === id);
    if (!ex) return false;
    const r = exRead(storage),
      base = r.ov || EXOV,
      next = Object.assign({}, base),
      p = exPrune(ex, exClean({ v: EXV, ov: { [id]: ov || {} } }).ov[id] || {});
    if (Object.keys(p).length) next[id] = p;
    else delete next[id];
    EXOV = next;
    return exWrite(storage);
  }
  const exExport = () => ({ v: EXV, ov: JSON.parse(JSON.stringify(EXOV)) });
  function exImport(obj, storage) {
    EXOV = exClean(obj).ov;
    return exWrite(storage);
  }
  const exClearAll = (storage) => {
    EXOV = {};
    try {
      storage.removeItem(EXKEY);
      return true;
    } catch (e) {
      return false;
    }
  };
  /* editing a draft (a plain overrides object). Returns { ok, draft } or { ok:false, msg }; a draft is never stored until exCommit. Units rescale the money fields like the asset page does, so the per-unit figures stay the same. */
  function exDraftSet(ex0, draft, k, raw) {
    const sh = ex0.shipped || ex0,
      cat = sh.cat,
      d = Object.assign({}, draft);
    if (k === 'loanId') {
      if (!exLoanOk(cat, sh.type, raw)) return { ok: false, msg: 'Pick a loan from the list' };
      d.loanId = raw;
      delete d.dp;
      return { ok: true, draft: d };
    }
    const c = exCheck(cat, k, raw);
    if (!c.ok) return c;
    if (k === 'units') {
      const cur = exEff(sh, d),
        a0 = exampleAsset(cur),
        f = c.v / unitsOf(a0);
      ['price', 'rent', 'capex', 'arv'].forEach((q) => {
        if (q === 'price' || q === 'rent' || a0[q] > 0)
          d[q] = Math.max(EXF[q].min, Math.min(EXF[q].max, Math.round(a0[q] * f)));
      });
      ['tax', 'ins', 'hoa'].forEach((q) => {
        if (d[q] !== undefined) d[q] = Math.max(0, Math.min(EXF[q].max, Math.round(d[q] * f)));
      });
    }
    d[k] = c.v;
    return { ok: true, draft: d };
  }
  const exDirty = (ex0, a, b) =>
    JSON.stringify(sortKeys(exPrune(ex0.shipped || ex0, a || {}))) !==
    JSON.stringify(sortKeys(exPrune(ex0.shipped || ex0, b || {})));
  const sortKeys = (o) =>
    Object.keys(o)
      .sort()
      .reduce((q, k) => {
        q[k] = o[k];
        return q;
      }, {});
  /* the example's own sanity rules; each fires exactly when its rule is broken. Non-blocking: the app shows them as warnings. m = exampleMetrics(S, ex). */
  function exWarnings(S, ex, m) {
    m = m || exampleMetrics(S, ex);
    const w = [],
      l = loanById(ex.loanId);
    if (m.cf < 0)
      w.push({ id: 'cf', text: 'Cash flow is negative: ' + usd(m.cf).replace('$-', '-$') + ' a month.' });
    if (m.pay > 0.5 && m.minDscr > 0 && m.dscr < m.minDscr)
      w.push({
        id: 'dscr',
        text: 'DSCR ' + m.dscr.toFixed(2) + ' is below the ' + m.minDscr + ' this loan usually wants.',
      });
    if (ex.cat === 'multi' && l && !mfFit(l, ex.units, !!ex.pack).ok)
      w.push({
        id: 'elig',
        text:
          'This loan is not for ' +
          ex.units +
          (ex.pack ? ' houses' : ' units') +
          ': ' +
          l.only.charAt(0).toLowerCase() +
          l.only.slice(1) +
          '.',
      });
    if (ex.loanId === 'sba7a' && m.loan > 5e6)
      w.push({
        id: 'sba',
        text: 'An SBA 7(a) loan tops out at $5,000,000; this one is ' + usd(m.loan) + '.',
      });
    if (ex.multRange && (m.mult < ex.multRange[0] || m.mult > ex.multRange[1]))
      w.push({
        id: 'mult',
        text:
          'Price is ' +
          m.mult.toFixed(1) +
          '× yearly profit; typical is ' +
          ex.multRange[0] +
          ' to ' +
          ex.multRange[1] +
          '×.',
      });
    if (ex.capBand && (m.cap < ex.capBand[0] || m.cap > ex.capBand[1]))
      w.push({
        id: 'cap',
        text:
          'Cap rate ' +
          m.cap.toFixed(1) +
          '% is outside the typical ' +
          ex.capBand[0] +
          ' to ' +
          ex.capBand[1] +
          '%.',
      });
    if (ex.arvRule && m.price > (m.arv * ex.arvRule) / 100 - m.capex)
      w.push({
        id: 'rule',
        text:
          'Price is above the ' +
          ex.arvRule +
          '% rule (most to pay ' +
          usd((m.arv * ex.arvRule) / 100 - m.capex) +
          ').',
      });
    return w;
  }
  const exFmt = (k, v) =>
    k === 'loanId'
      ? (loanById(v) || { name: String(v) }).name
      : EXF[k].kind === 'usd'
        ? usd(v)
        : EXF[k].kind === 'pct'
          ? pc(v, 2)
          : k === 'capexMonths'
            ? v + ' mo'
            : String(v);
  /* the options the Add screen passes to newAsset for an example (multi-family: the per-unit defaults for that size first, then the example's own numbers) */
  const exampleOpts = (ex) =>
    Object.assign(
      { addr: ex.name },
      ex.cat === 'multi'
        ? Object.assign({ kind: 'multi', units: ex.units, pack: !!ex.pack }, mfDefaults(ex.units, !!ex.pack))
        : {},
      { addr: ex.name },
      ex.f,
    );
  const exampleAsset = (ex) => newAsset(ex.type, ex.loanId, Object.assign({ fresh: true }, exampleOpts(ex)));
  /* what the example makes, in numbers (S = the user's assumptions for vacancy, management, repairs and closing): used for the one-line summary, the preview and the tests */
  function exampleMetrics(S, ex) {
    S = S || { g: GDEF };
    const h = exampleAsset(ex),
      noi = noiOf(S, h),
      pay = payment(h) + mipMonthly(h),
      lift = +h.liftIncome || 0,
      h2 = Object.assign({}, h, { rent: h.rent * (1 + lift / 100) }),
      noi2 = noiOf(S, h2);
    const m = {
      h,
      type: h.type,
      price: h.price,
      capex: h.capex || 0,
      arv: +h.arv || 0,
      rent: h.rent,
      lift,
      rentAfter: h2.rent,
      revenue: h.type === 'business' ? revOf(h) : 0,
      margin: h.type === 'business' ? marginOf(h) : 0,
      units: unitsOf(h),
      dp: h.dp,
      down: downAmt(h),
      closing: (h.price * clPct(S, h)) / 100,
      loan: loan(h),
      pay,
      noi,
      noiAfter: noi2,
      cf: noi - pay,
      cfAfter: noi2 - pay,
      dscr: pay > 0.5 ? noi / pay : Infinity,
      dscrAfter: pay > 0.5 ? noi2 / pay : Infinity,
      minDscr: minDscrOf(h.loanId),
      cash: needFor(S, h),
      cap: ((noi * 12) / h.price) * 100,
      mult: h.rent > 0 ? h.price / (h.rent * 12) : 0,
      loanId: h.loanId,
    };
    if (ex.alt) {
      const a = newAsset(ex.type, ex.loanId, Object.assign({ fresh: true }, exampleOpts(ex), { dp: ex.alt }));
      m.altCf = noiOf(S, a) - payment(a) - mipMonthly(a);
    }
    if (ex.id === 'home-exec') {
      const a = newAsset('house', 'conv30', Object.assign({ fresh: true }, exampleOpts(ex)));
      m.altPay = payment(a);
      m.altCf = noiOf(S, a) - payment(a);
    }
    return m;
  }
  /* the (i) text: the shipped example's own research basis and derivation, always worked out on the SHIPPED numbers so it stays true; when the user changed fields it starts with 'Original / Yours' for each one and shows the numbers the edited example makes */
  function exampleInfo(S, ex) {
    const sh = ex.shipped || ex,
      m0 = exampleMetrics(S, sh),
      w = sh.why(m0, sh),
      ed = ex.edited || [];
    let b = w[0],
      e = w[1];
    if (ed.length) {
      const a0 = exampleAsset(sh),
        a1 = exampleAsset(ex),
        m = exampleMetrics(S, ex),
        lines = ed.map(
          (k) =>
            exLabel(k, sh.cat) +
            ': Original ' +
            exFmt(k, exVal(sh, k)) +
            ' / Yours ' +
            exFmt(k, exVal(ex, k)),
        );
      b =
        'You changed this example. ' +
        lines.join('. ') +
        '. With your numbers: cash needed ' +
        usd(m.cash) +
        ', cash flow ' +
        usd(m.cf).replace('$-', '-$') +
        ' a month' +
        (m.pay > 0.5 ? ', DSCR ' + m.dscr.toFixed(2) : '') +
        ' (original: ' +
        usd(m0.cash) +
        ', ' +
        usd(m0.cf).replace('$-', '-$') +
        ' a month). Original: ' +
        w[0];
      e = 'Original derivation: ' + w[1];
      void a0;
      void a1;
    }
    return { t: sh.tierName + ': ' + sh.name + (ed.length ? ' (edited)' : ''), b, e };
  }
