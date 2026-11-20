  /* typical starting numbers by size (the research brief, typical not a quote): price, rent, tax and insurance per unit, management %, repairs %, reserve per unit per year, other owner-paid costs per month (utilities, payroll).
     Packs: single houses bought together (10% management, older houses so 1.2% repairs). 5-19 units: 8%. 20-49: 6% plus a part-time maintenance tech. 50+: 5% plus an on-site manager. All editable. */
  function mfDefaults(units, pack) {
    units = Math.max(2, Math.min(500, Math.round(+units || 2)));
    const c = mfCat(units, pack),
      r5 = (x) => Math.round(x / 5) * 5,
      u = units;
    const t = pack
      ? { p: 120000, rent: 1400, tx: 1.1, ins: 105, mg: 10, mt: 1.2, oth: 0 }
      : c === 'small'
        ? { p: 150000, rent: 1700, tx: 1.1, ins: 80, mg: 8, mt: null, oth: 0 }
        : u < 20
          ? { p: 110000, rent: 1250, tx: 1.2, ins: 75, mg: 8, mt: null, oth: 35 }
          : u < 50
            ? { p: 100000, rent: 1100, tx: 1.2, ins: 65, mg: 6, mt: null, oth: 60 }
            : { p: 100000, rent: 1150, tx: 1.2, ins: 60, mg: 5, mt: null, oth: 95 };
    const price = Math.round((t.p * u) / 1000) * 1000;
    return {
      price,
      rent: r5(t.rent * u),
      tax: Math.round((price * t.tx) / 100 / 12),
      ins: r5(t.ins * u),
      hoa: 0,
      mgmtPct: t.mg,
      maintPct: t.mt,
      mfRes: 300,
      mfOther: r5(t.oth * u),
      addr: pack
        ? 'New pack of ' + u + ' houses'
        : u === 2
          ? 'New duplex'
          : u === 3
            ? 'New triplex'
            : u === 4
              ? 'New fourplex'
              : 'New ' + u + '-unit building',
    };
  }
  let uid = 0;
  const DEFAULTS = {
    house: {
      addr: 'New home',
      price: 300000,
      rent: 2200,
      tax: 300,
      ins: 110,
      hoa: 0,
      nnn: 0,
      growth: 4,
      sellCost: 6,
    },
    commercial: {
      addr: 'New commercial property',
      price: 1500000,
      rent: 12500,
      tax: 940,
      ins: 375,
      hoa: 375,
      nnn: 85,
      growth: 4,
      sellCost: 5,
    },
    business: {
      addr: 'New business',
      price: 1000000,
      rent: 18000,
      revenue: 90000,
      margin: 20,
      tax: 0,
      ins: 0,
      hoa: 0,
      nnn: 0,
      growth: 4,
      sellCost: 8,
    },
  };
  function applyLoan(h, id) {
    const lo = loanById(id);
    if (!lo) {
      h.loanId = 'custom';
      return h;
    }
    const wasAuto =
      (+h.capex > 0 || +h.comp > 0) &&
      arvIsAuto(
        h,
      ); /* E25: an auto appraisal depends on the loan type (203(k): +15% of price + rehab; others: price + 1.4 x budget), so it is re-derived below; a typed appraisal is never touched */
    if (lo.multi)
      h.mat =
        lo.mat ||
        0; /* a multi-family loan sets its own balloon month (0 = none; an interest-only loan is due at its term anyway) */
    h.dp = lo.dp;
    h.rate = lo.rate;
    h.term = lo.term;
    h.io = !!lo.io;
    h.closingPct = lo.closing;
    h.loanId = lo.id;
    h.finCapex = !!lo.finRehab;
    h.mipUp = lo.upfrontMip || 0;
    h.mipAnn = lo.annualMip || 0;
    h.ownerOcc = !!lo.ownerOcc;
    if (wasAuto) {
      h.arv = autoArv(h);
      h.arvAuto = true;
      h.gain = null;
    }
    if (lo.finRehab && lo.rehabDefaults && !(+h.capex > 0)) {
      Object.assign(h, lo.rehabDefaults);
      if (!(+h.arv > 0)) {
        h.arv = Math.round(((h.price + h.capex) * 1.15) / 1000) * 1000;
        h.arvAuto = true;
      }
    } /* auto-fill a typical rehab and a new appraisal 15% above total cost, only if none is set */
    return h;
  }
  function newAsset(type, loanId, o) {
    type = TYPES[type] ? type : 'house';
    const h = Object.assign(
      {
        id: 'h' + Date.now().toString(36) + uid++,
        type,
        status: 'planned',
        extra: 0,
        driver: 'extra',
        wait: 24,
        liens: 0,
        paid: 0,
        buyIn: 0,
        target: '',
        growth: null,
        io: false,
        closingPct: null,
        loanId: '',
        dp: 20,
        rate: 6.75,
        term: 360,
        mat: 0,
        refiRate: null,
        refiTerm: null,
        capex: 0,
        capexMonths: 6,
        arv: 0,
        arvAuto: false,
        gain: null,
        liftIncome: 0,
        exit: 'hold',
        exitMonth: 60,
        exitLift: 0,
        mergeInto: '',
        finCapex: false,
        mipUp: 0,
        mipAnn: 0,
        ownerOcc: false,
        kind: 'single',
        units: 1,
        pack: false,
        mfRes: 300,
        mfOther: 0,
        mgmtPct: null,
        maintPct: null,
        boughtOn: null,
        jobPay: null,
        jobSavedOverride: null,
        comp: null,
      },
      DEFAULTS[type],
    ); /* kind 'multi' = a building or pack of houses with units >= 2 (still type 'house'); mfRes = replacement reserve per unit per year, mfOther = other owner-paid costs per month, mgmtPct / maintPct = this asset's own management / repairs % (null = the Assumptions rate) */
    applyLoan(
      h,
      loanId || (o && o.kind === 'multi' ? mfFirst(+o.units || 2, !!o.pack) : loansFor(type)[0].id),
    );
    Object.assign(h, o || {});
    if (type === 'business' && o && o.rent !== undefined) {
      if (o.revenue === undefined) h.revenue = null;
      if (o.margin === undefined) h.margin = null;
    } /* a business made from its owner profit (the seeded ones) has no revenue of its own: the page shows rent / margin */
    if (h.finCapex && !(o && +o.arv > 0)) {
      h.arv = Math.round(((h.price + h.capex) * 1.15) / 1000) * 1000;
      h.arvAuto = true;
    } /* default appraisal from the FINAL price + rehab; it follows price/rehab until you type your own appraisal or gain */
    return h;
  }
  /* a business's owner profit per month (h.rent) = revenue per month x margin. revOf / marginOf give the revenue and margin the page shows: stored ones, else the margin default (20%) and the revenue it implies */
  const marginOf = (h) => (isFinite(+h.margin) && h.margin !== null && h.margin !== '' ? +h.margin : 20);
  const revOf = (h) => {
    if (isFinite(+h.revenue) && h.revenue !== null && h.revenue !== '') return +h.revenue;
    const m = marginOf(h);
    return m > 0 ? (+h.rent || 0) / (m / 100) : 0;
  };
  /* the new appraised value that follows the improvement budget: price + 1.4 x budget (the app's own convention: the first four homes are built on it). A 203(k) loan keeps its own older rule (15% above price + rehab). No budget = no new appraisal (0: the value does not change). */
  const ARV_K = 1.4;
  const costBasisArv = (h) => {
    const c = Math.max(0, +h.capex || 0);
    if (!(c > 0)) return 0;
    return h.finCapex ? Math.round(((h.price + c) * 1.15) / 1000) * 1000 : Math.round(h.price + ARV_K * c);
  };
  /* E.appraisalAuto: the ONE function for the automatic new appraised value. Without an average comp value it is the cost basis (price + rehab rule, above). With one it is the middle of what was paid in and what the neighbours sell for: round((cost basis + comp) / 2), where the cost basis is the price when there is no budget. No budget and no comp = no appraisal. */
  const appraisalAuto = (h) => {
    const cb = costBasisArv(h),
      cp = +h.comp;
    return cp > 0 ? Math.round(((cb > 0 ? cb : Math.max(0, +h.price || 0)) + cp) / 2) : cb;
  };
  const autoArv = appraisalAuto;
  /* is the appraisal 'auto' (follows the budget) rather than typed by the user? true when the flag says so, when there is no appraisal and no budget, or when it is exactly what the rule gives (so the seeded homes, built on 1.4x, follow too). */
  const arvIsAuto = (h) =>
    !!h.arvAuto ||
    (!(+h.arv > 0) && !(+h.capex > 0)) ||
    (+h.arv > 0 && +h.arv === autoArv(h) && !(h.gain !== null && h.gain !== undefined && isFinite(+h.gain)));
  const newHouse = (o) => newAsset((o && o.type) || 'house', o && o.loanId, o);

