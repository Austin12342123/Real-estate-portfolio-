  function normalize(S) {
    S.g = Object.assign({}, GDEF, S.g || {});
    S.g.autoPay = S.g.autoPay !== false;
    ['cap', 'capBiz', 'vac', 'refiRate', 'refiTerm'].forEach((k) => {
      if (!isFinite(+S.g[k])) S.g[k] = GDEF[k];
    });
    if (S.p) S.p = normalizePersonal(S.p);
    if (Array.isArray(S.added))
      S.added = S.added.filter((k, i, a) => typeof k === 'string' && a.indexOf(k) === i);
    else delete S.added; /* keys of ADDITIONS already applied to this portfolio */
    S.houses = (S.houses || [])
      .filter((h) => h && h.id)
      .map((h) => {
        const type = TYPES[h.type] ? h.type : 'house';
        const b = Object.assign(newAsset(type, undefined, { id: h.id }), h, { type });
        if (type === 'business') {
          if (!('revenue' in h)) b.revenue = null;
          if (!('margin' in h)) b.margin = null;
        }
        return b;
      }); /* an old business without revenue / margin keeps them empty (its revenue is shown as owner profit / margin; nothing is rewritten) */
    S.houses.forEach((h) => {
      [
        'price',
        'dp',
        'rate',
        'term',
        'extra',
        'rent',
        'tax',
        'ins',
        'hoa',
        'liens',
        'paid',
        'buyIn',
        'wait',
        'capex',
        'capexMonths',
        'arv',
        'liftIncome',
        'exitMonth',
        'exitLift',
        'sellCost',
        'mat',
        'nnn',
      ].forEach((k) => {
        if (!isFinite(+h[k])) h[k] = newAsset(h.type, undefined)[k];
        else h[k] = +h[k];
      });
      ['revenue', 'margin'].forEach((k) => {
        h[k] =
          h[k] === null || h[k] === '' || h[k] === undefined || !isFinite(+h[k]) ? null : Math.max(0, +h[k]);
      });
      if (h.margin !== null) h.margin = Math.min(100, h.margin);
      if (h.type !== 'business') {
        h.revenue = null;
        h.margin = null;
      }
      if (+h.liftValue > 0 && !(+h.arv > 0)) {
        /* old data stored a % lift: convert it to a dollar appraisal at completion */
        const gv = h.growth == null || !isFinite(+h.growth) ? S.g.appr : +h.growth;
        h.arv = Math.round(
          h.price * Math.pow(1 + gv / 100, (h.capexMonths || 0) / 12) * (1 + h.liftValue / 100),
        );
      }
      delete h.liftValue;
      if (!(h.arv > 0)) h.arv = 0;
      h.arvAuto = !!h.arvAuto && +h.arv > 0;
      h.gain =
        h.gain !== null && h.gain !== '' && h.gain !== undefined && isFinite(+h.gain)
          ? +h.gain
          : null; /* if set, the appraisal follows price + rehab + gain */
      h.kind = h.type === 'house' && h.kind === 'multi' ? 'multi' : 'single';
      h.units = h.kind === 'multi' ? Math.min(500, Math.max(2, Math.round(+h.units || 2))) : 1;
      h.pack = h.kind === 'multi' && !!h.pack;
      h.mfRes = isFinite(+h.mfRes) && h.mfRes !== null && h.mfRes !== '' ? Math.max(0, +h.mfRes) : 300;
      h.mfOther =
        isFinite(+h.mfOther) && h.mfOther !== null && h.mfOther !== '' ? Math.max(0, +h.mfOther) : 0;
      ['mgmtPct', 'maintPct'].forEach((k) => {
        h[k] =
          h[k] === null || h[k] === '' || h[k] === undefined || !isFinite(+h[k]) ? null : Math.max(0, +h[k]);
      });
      h.boughtOn =
        h.status === 'owned' &&
        typeof h.boughtOn === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(h.boughtOn) &&
        isFinite(Date.parse(h.boughtOn))
          ? h.boughtOn
          : null; /* the day the user marked it bought (YYYY-MM-DD); old owned assets have none: the page says 'date not recorded' */
      h.jobSavedOverride =
        h.jobSavedOverride === null ||
        h.jobSavedOverride === '' ||
        h.jobSavedOverride === undefined ||
        !isFinite(+h.jobSavedOverride)
          ? null
          : Math.max(
              0,
              +h.jobSavedOverride,
            ); /* job money saved up counted for this asset's first purchase; null = Auto (the plan's own number) */
      h.comp =
        h.comp === null || h.comp === '' || h.comp === undefined || !isFinite(+h.comp) || +h.comp <= 0
          ? null
          : +h.comp; /* average value of nearby comparable homes; null = not used */
      h.jobPay =
        h.jobPay === null || h.jobPay === '' || h.jobPay === undefined || !isFinite(+h.jobPay)
          ? null
          : Math.max(
              0,
              +h.jobPay,
            ); /* your job money sent to this home's loan each month; null = the plan's own split (default) */
      if (h.type === 'business') h.mgmtPct = null;
      ['mipUp', 'mipAnn'].forEach((k) => {
        h[k] = isFinite(+h[k]) ? Math.max(0, +h[k]) : 0;
      });
      h.finCapex = !!h.finCapex;
      h.ownerOcc = !!h.ownerOcc;
      if (h.term < 12 && !h.io) h.term = 360;
      h.io = !!h.io;
      if (h.growth != null && !isFinite(+h.growth)) h.growth = null;
      h.mat = Math.max(0, Math.round(h.mat || 0));
      h.nnn = Math.min(100, Math.max(0, h.nnn || 0));
      ['refiRate', 'refiTerm'].forEach((k) => {
        h[k] =
          h[k] === null || h[k] === '' || h[k] === undefined || !isFinite(+h[k]) ? null : Math.max(0, +h[k]);
      });
      if (h.closingPct != null && !isFinite(+h.closingPct)) h.closingPct = null;
      if (typeof h.loanId !== 'string') h.loanId = '';
      if (['hold', 'sell', 'merge'].indexOf(h.exit) < 0) h.exit = 'hold';
      if (typeof h.mergeInto !== 'string') h.mergeInto = '';
    });
    return S;
  }
  function fromListing(o) {
    const err = (m) => ({ ok: false, error: m });
    if (!o || typeof o !== 'object') return err('That file is not a listing file.');
    if (o.schema !== 'house-listing/1') return err('Unrecognized file. Expected schema "house-listing/1".');
    const val = (f) =>
      f && typeof f === 'object' && f.value !== null && isFinite(+f.value) && +f.value >= 0 ? +f.value : null;
    const src = (f, v) =>
      v === null ? 'missing' : f && ['listing', 'estimate'].includes(f.source) ? f.source : 'estimate';
    const price = val(o.price);
    if (!price) return err('The file has no purchase price.');
    const rent = val(o.rentMonthly),
      taxA = val(o.taxAnnual),
      insA = val(o.insuranceAnnual),
      hoa = val(o.hoaMonthly);
    const patch = {
      price,
      addr:
        typeof o.address === 'string' && o.address.trim() ? o.address.trim().slice(0, 80) : 'Imported house',
    };
    if (rent !== null) patch.rent = rent;
    if (taxA !== null) patch.tax = Math.round(taxA / 12);
    if (insA !== null) patch.ins = Math.round(insA / 12);
    if (hoa !== null) patch.hoa = hoa;
    const rows = [
      ['Address', patch.addr, 'listing'],
      ['Price', '$' + price.toLocaleString('en-US'), src(o.price, price)],
      [
        'Monthly rent',
        rent === null
          ? 'default $' + DEFAULTS.house.rent.toLocaleString('en-US')
          : '$' + rent.toLocaleString('en-US'),
        src(o.rentMonthly, rent),
      ],
      [
        'Property tax / mo',
        taxA === null
          ? 'default $' + DEFAULTS.house.tax.toLocaleString('en-US')
          : '$' + Math.round(taxA / 12).toLocaleString('en-US'),
        src(o.taxAnnual, taxA),
      ],
      [
        'Insurance / mo',
        insA === null
          ? 'default $' + DEFAULTS.house.ins.toLocaleString('en-US')
          : '$' + Math.round(insA / 12).toLocaleString('en-US'),
        src(o.insuranceAnnual, insA),
      ],
      [
        'HOA / mo',
        hoa === null
          ? 'default $' + DEFAULTS.house.hoa.toLocaleString('en-US')
          : '$' + hoa.toLocaleString('en-US'),
        src(o.hoaMonthly, hoa),
      ],
    ];
    const info = o.info && typeof o.info === 'object' ? o.info : {};
    return { ok: true, patch, rows, info, url: typeof o.listingUrl === 'string' ? o.listingUrl : '' };
  }
  function without(S, id) {
    const c = JSON.parse(JSON.stringify(S));
    c.houses = c.houses.filter((h) => h.id !== id);
    c.houses.forEach((h) => {
      if (h.target === id) h.target = '';
      if (h.mergeInto === id) h.mergeInto = '';
    });
    return c;
  }
  /* STRETCH scenario (listed in the order the assets are bought; the trust decides every purchase month): about $540M of net worth and +$1.5M/mo of cash flow after 20 years, and it buys 607 Siena Way, Bel Air, Los Angeles CA 90077 ("Villa Siena", about 35,000 sq ft; relisted at about $135,000,000 in December 2025, price may have changed) outright in month 170 (14 years in): $137.7M of cash (price plus 2% closing) = about $54M of cash the trust holds (sale proceeds and reinvested cash flow) + about $83M drawn on its line of credit against the other assets. Its rent is the amount the house would rent for ($520,000/mo), so the carry (tax $135,000, insurance $40,000, upkeep 1% of value a year) shows and the house never cash-flows negative; the line interest is paid from the portfolio's cash flow, which is still about $1.9M/mo after the purchase. It leans on two large business exits at 21-25%/yr growth. Not a forecast. */
  /* The older samples and scenarios list commercial costs net of what tenants repay, so their tenants repay 0% (their numbers are unchanged by the NNN field). */
  const netCosts = (S) => {
    S.houses.forEach((h) => {
      if (h.type === 'commercial') h.nnn = 0;
    });
    return S;
  };
