  /* ---------- personal finances: your jobs, savings and expenses ---------- */
  const samplePersonal = () => ({
    cash: 45000,
    cashApy: 3,
    living: 3600,
    inflation: 3,
    emergencyMonths: 6,
    portfolioTaxPct: null,
    salesTaxPct: null,
    statePct: 0,
    landPct: 20,
    bizIntPct: 70,
    housing: 1400,
    operating: 1,
    gmMonthly: 8000,
    bizHours: 20,
    jobs: [
      {
        id: 'job1',
        name: 'Day job (salary)',
        kind: 'salary',
        gross: 96000,
        raise: 3,
        tax: 24,
        hours: 40,
        start: 0,
        end: null,
      },
    ],
    planned: [],
    capital: [],
  });
  /* Rough U.S. single-filer estimate, tax year 2026 (IRS Rev. Proc. 2025-32: standard deduction $16,100, brackets below; IRS Pub. 15: Social Security 6.2% up to $184,500, Medicare 1.45%). No state tax, no 0.9% additional Medicare tax. It is only a starting point; the person can type their own rate. */
  const TAXY = {
    std: 16100,
    br: [
      [12400, 0.1],
      [50400, 0.12],
      [105700, 0.22],
      [201775, 0.24],
      [256225, 0.32],
      [640600, 0.35],
      [Infinity, 0.37],
    ],
    ltcg0: 49450,
    ltcg15: 545500,
    niitMagi: 200000,
    niit: 0.038,
    rec1250: 0.25,
  };
  /* federal income tax on taxable income between lo and hi (single filer, 2026 brackets); cap limits the rate (the 25% ceiling on unrecaptured section 1250 gain) */
  function bracketTax(lo, hi, cap) {
    let t = 0,
      a = 0;
    for (const [b, r] of TAXY.br) {
      const x = Math.min(hi, b) - Math.max(lo, a);
      if (x > 0) t += x * Math.min(r, cap === undefined ? 1 : cap);
      a = b;
    }
    return t;
  }
  /* long-term capital gain tax on the slice of taxable income from lo to hi: 0% up to $49,450, 15% up to $545,500, 20% above (single, 2026, Rev. Proc. 2025-32) */
  function ltcgTax(lo, hi) {
    const z = Math.max(0, Math.min(hi, TAXY.ltcg0) - lo),
      f = Math.max(0, Math.min(hi, TAXY.ltcg15) - Math.max(lo, TAXY.ltcg0)),
      t = Math.max(0, hi - Math.max(lo, TAXY.ltcg15));
    return f * 0.15 + t * 0.2 + z * 0;
  }
  function estTaxPct(gross) {
    if (!(gross > 0)) return 0;
    const taxable = Math.max(0, gross - TAXY.std),
      fed = bracketTax(0, taxable);
    const fica = Math.min(gross, 184500) * 0.062 + gross * 0.0145;
    return Math.round(((fed + fica) / gross) * 1000) / 10;
  }
  const num0 = (v, d) => (isFinite(+v) && v !== '' && v !== null ? +v : d);
  function normalizePersonal(p) {
    const d = samplePersonal();
    p = Object.assign({}, d, p || {});
    [
      'cash',
      'cashApy',
      'living',
      'inflation',
      'emergencyMonths',
      'statePct',
      'landPct',
      'bizIntPct',
      'housing',
      'operating',
      'gmMonthly',
      'bizHours',
    ].forEach((k) => {
      p[k] = Math.max(0, num0(p[k], d[k]));
    });
    ['portfolioTaxPct', 'salesTaxPct'].forEach((k) => {
      p[k] =
        p[k] === null || p[k] === '' || p[k] === undefined || !isFinite(+p[k])
          ? null
          : Math.min(70, Math.max(0, +p[k]));
    }); /* null = worked out from your income and the tax rules */
    p.statePct = Math.min(20, p.statePct);
    p.landPct = Math.min(100, p.landPct);
    p.bizIntPct = Math.min(100, p.bizIntPct);
    p.operating = Math.round(p.operating);
    p.bizHours = Math.min(168, p.bizHours);
    p.cashApy = Math.min(30, p.cashApy);
    let n = 0;
    const id = (x, pre) => (typeof x === 'string' && x ? x : pre + Date.now().toString(36) + n++);
    p.jobs = (Array.isArray(p.jobs) ? p.jobs : [])
      .filter((j) => j && typeof j === 'object')
      .map((j) => {
        const kind = j.kind === 'hourly' ? 'hourly' : 'salary',
          hours = Math.min(168, Math.max(0, num0(j.hours, 40))),
          wage = Math.max(0, num0(j.wage, 0)),
          tips = Math.max(0, num0(j.tips, 0)),
          weeks = Math.min(52, Math.max(0, num0(j.weeks, 50)));
        return {
          id: id(j.id, 'job'),
          name: typeof j.name === 'string' ? j.name : 'Job',
          kind,
          wage,
          tips,
          weeks,
          gross:
            kind === 'hourly' ? Math.round((wage + tips) * hours * weeks) : Math.max(0, num0(j.gross, 0)),
          raise: Math.min(50, Math.max(-50, num0(j.raise, 0))),
          tax:
            j.tax === null || j.tax === '' || j.tax === undefined || !isFinite(+j.tax)
              ? null
              : Math.min(70, Math.max(0, +j.tax)),
          hours,
          start: Math.max(0, Math.round(num0(j.start, 0))),
          end:
            j.end === null || j.end === '' || j.end === undefined || !isFinite(+j.end)
              ? null
              : Math.max(0, Math.round(+j.end)),
        };
      });
    ['planned', 'capital'].forEach((k) => {
      p[k] = (Array.isArray(p[k]) ? p[k] : [])
        .filter((x) => x && typeof x === 'object')
        .map((x) => ({
          id: id(x.id, k === 'planned' ? 'pl' : 'cap'),
          name: typeof x.name === 'string' ? x.name : '',
          amount: Math.max(0, num0(x.amount, 0)),
          month: Math.max(0, Math.round(num0(x.month, 0))),
        }));
    });
    return p;
  }
  const jobMonthly = (j, t) =>
    t < (j.start || 0) || (j.end !== null && j.end !== undefined && t >= j.end)
      ? 0
      : (j.gross / 12) * Math.pow(1 + (j.raise || 0) / 100, Math.floor(Math.max(0, t - (j.start || 0)) / 12));
  const jobsGross = (S, t) => (S.p ? S.p.jobs.reduce((a, j) => a + jobMonthly(j, t), 0) : 0);
  const taxPctFor = (j) => (j.tax === null || j.tax === undefined ? estTaxPct(j.gross) : j.tax);
  const jobsNet = (S, t) =>
    S.p ? S.p.jobs.reduce((a, j) => a + jobMonthly(j, t) * (1 - taxPctFor(j) / 100), 0) : 0;

  const taxP = (S) => S.p || samplePersonal();
  /* your own rent or mortgage payment counts as a debt for lenders; it rises with the cost-increase rate like rent does */
  const housingAt = (S, t) =>
    S.p ? (S.p.housing || 0) * Math.pow(1 + (S.p.inflation || 0) / 100, t / 12) : 0;
  /* Depreciation taken after a months of ownership (a counts the months already owned). Homes and commercial buildings: straight line over 27.5 / 39 years on the building share of price + closing costs + improvements, first month half (mid-month convention); land is not depreciated (IRS Pub. 946, 551, 527).
     Businesses: the price is split into goodwill and other intangibles amortized over 15 years (section 197) and equipment over 7 years (IRS Pub. 535, 946, Form 8594). No bonus depreciation is assumed. */
  function depCum(S, h, a) {
    if (!(a > 0)) return 0;
    const p = taxP(S),
      closing = (h.price * clPct(S, h)) / 100;
    if ((h.type || 'house') === 'business') {
      const tot = h.price + closing,
        intang = (tot * p.bizIntPct) / 100,
        eq = tot - intang + (h.capex || 0);
      return Math.min(intang, (intang / 180) * a) + Math.min(eq, (eq / 84) * Math.max(0, a - 0.5));
    }
    const base = (h.price + closing + (h.capex || 0)) * (1 - p.landPct / 100),
      n = (h.type || 'house') === 'house' ? 330 : 468;
    return Math.min(base, (base / n) * Math.max(0, a - 0.5));
  }
  const costBasis = (S, h) => h.price + (h.price * clPct(S, h)) / 100 + (h.capex || 0);
  /* Monthly income tax on portfolio profit: re / biz = this month's taxable profit (operating income - loan interest - depreciation) of real estate / businesses. Auto: the extra federal tax your wages + this profit owe over your wages alone (2026 brackets),
     3.8% net investment income tax on rental profit above $200,000 of total income, plus your state rate. A loss pays no tax (passive-loss carry-forward is not used). Override: your own flat rate on the profit. */
  function portTaxAt(S, t, re, biz) {
    const p = taxP(S),
      R = re + biz;
    if (!(R > 0)) return 0;
    if (p.portfolioTaxPct !== null && p.portfolioTaxPct !== undefined) return (R * p.portfolioTaxPct) / 100;
    const W = jobsGross(S, t) * 12,
      wt = Math.max(0, W - TAXY.std),
      fed = bracketTax(wt, Math.max(0, W + R * 12 - TAXY.std)),
      niit = TAXY.niit * Math.min(Math.max(0, re * 12), Math.max(0, W + R * 12 - TAXY.niitMagi));
    return (fed + niit) / 12 + (R * (p.statePct || 0)) / 100;
  }
  /* Tax on selling one asset (pl.exits[id]): gain = sale price less selling costs less (price + closing + improvements - depreciation taken). Held under a year: ordinary rates. Otherwise the depreciation part of a building's gain is unrecaptured section 1250 gain (rate up to 25%),
     the rest is long-term gain at 0/15/20% stacked on your other income, plus 3.8% NIIT on rental-property gains above $200,000 total income. A business's depreciation and amortization is ordinary income (section 1245). Override: your flat rate on the gain. */
  function saleTax(S, pl, h) {
    if (pl.raw) {
      const o = saleTax(S, pl.raw, h);
      return (
        o &&
        scaleKeys(
          o,
          ['gain', 'dep', 'tax', 'ltcg', 'rec1250', 'ordinary', 'niit', 'state'],
          dfac(S, pl.raw.exits[h.id].month),
        )
      );
    } /* a plan in today's dollars: work it out in future dollars, show it in today's */
    const ex = pl.exits[h.id];
    if (!ex) return null;
    const p = taxP(S),
      t = Math.min(pl.T, ex.month),
      s = pl.series,
      biz = (h.type || 'house') === 'business';
    const gain = ex.net - (ex.cost - ex.dep),
      out = {
        gain,
        dep: ex.dep,
        tax: 0,
        ltcg: 0,
        rec1250: 0,
        ordinary: 0,
        niit: 0,
        state: 0,
        short: ex.age < 12,
        rate: 0,
      };
    if (!(gain > 0)) return out;
    if (p.salesTaxPct !== null && p.salesTaxPct !== undefined) {
      out.tax = (gain * p.salesTaxPct) / 100;
      out.rate = p.salesTaxPct;
      return out;
    }
    const W = jobsGross(S, t) * 12,
      R = Math.max(0, (s.txRE[t] + s.txBiz[t]) * 12),
      base = Math.max(0, W + R - TAXY.std),
      rec = Math.min(gain, ex.dep);
    let ord = 0,
      u = 0,
      lt = 0;
    if (out.short) ord = gain;
    else if (biz) {
      ord = rec;
      lt = gain - rec;
    } else {
      u = rec;
      lt = gain - rec;
    }
    let tx = bracketTax(base, base + ord);
    out.ordinary = tx;
    const u1 = bracketTax(base + ord, base + ord + u, TAXY.rec1250);
    out.rec1250 = u1;
    tx += u1;
    out.ltcg = ltcgTax(base + ord + u, base + ord + u + lt);
    tx += out.ltcg;
    if (!biz) {
      const nii = gain + Math.max(0, s.txRE[t] * 12);
      out.niit = TAXY.niit * Math.min(nii, Math.max(0, W + R + gain - TAXY.niitMagi));
      tx += out.niit;
    }
    out.state = (gain * (p.statePct || 0)) / 100;
    tx += out.state;
    out.tax = tx;
    out.rate = (tx / gain) * 100;
    return out;
  }

  /* FHA annual mortgage insurance is charged on the outstanding balance (HUD Handbook 4000.1: annual MIP on the average outstanding balance), so the monthly amount falls as the loan is paid down. The first-month figure (view().mip) is on the starting loan. */
  const mipNow = (h, a) =>
    (h.mipAnn || 0) > 0 ? ((a.B / (1 + (h.mipUp || 0) / 100)) * h.mipAnn) / 100 / 12 : 0;
