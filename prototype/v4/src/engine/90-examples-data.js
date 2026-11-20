  /* ---------- purchase EXAMPLES: four typical purchases in each category, one per cost and quality tier (typical, not a quote; research brief in grader/multifamily-research.md).
     One table. To add an example, append one entry: { id, cat: 'house'|'multi'|'commercial'|'business', tier 1-4, tierName, name, type, loanId, units/pack (multi only), f: fields that go on the new asset, why(m) -> [basis text, arithmetic text] }.
     An example is applied through the SAME path as the Add screen (newAsset + applyLoan, plus mfDefaults for multi-family), so the asset it makes is a normal asset the user edits afterwards. */
  const usd = (n) => '$' + Math.round(n).toLocaleString('en-US');
  const pc = (n, d = 1) => String(+(+n).toFixed(d)) + '%';
  const MINDSCR = {
    comm25: 1.25,
    bankbiz: 1.25,
    sba504: 1.15,
    sba7a: 1.15,
    bridge: 1,
    sellerc: 1,
    sellerb: 1,
    dscr: 1,
    conv30: 1,
    conv15: 1,
    cashh: 0,
    cashb: 0,
  }; /* the DSCR a lender usually wants for each single-asset loan (multi-family loans carry their own in MFLOANS) */
  const minDscrOf = (id) => {
    const l = loanById(id);
    return l && l.multi ? l.dscr : MINDSCR[id] != null ? MINDSCR[id] : 1;
  };
  const TYP = 'All figures are typical, not a quote. ';
  const EXAMPLES = [
    {
      id: 'home-s8',
      cat: 'house',
      tier: 1,
      tierName: 'Budget',
      name: 'Section 8 fixer, 3 bed',
      type: 'house',
      loanId: 'dscr',
      arvRule: 70,
      scope: 21000,
      cont: 15,
      fmr: 2182,
      f: {
        price: 110000,
        rent: 1985,
        tax: 192,
        ins: 150,
        hoa: 0,
        capex: Math.round(21000 * 1.15),
        capexMonths: 4,
        arv: 192000,
      },
      why: (m, x) => [
        TYP +
          "A dated 3-bedroom bought well below its repaired value, fixed up, rented to a Section 8 voucher holder and refinanced on the new value. The buy price follows the 70% rule (most you should pay = repaired value x 70% less the rehab). The rehab is a typical scope plus a 15% contingency. Rent sits under the HUD Fair Market Rent that caps a voucher. A DSCR investor loan qualifies on the rent and many lenders accept vouchers. Tax, insurance and the rehab scope are the app's own assumptions. The app counts rent from the purchase month, so the rehab months are not shown as vacancy.",
        '70% rule: ' +
          usd(m.arv) +
          ' x 70% = ' +
          usd(m.arv * 0.7) +
          ' less rehab ' +
          usd(m.capex) +
          ' = ' +
          usd(m.arv * 0.7 - m.capex) +
          ' most to pay; the price is ' +
          usd(m.price) +
          ' (' +
          pc((m.price / m.arv) * 100, 0) +
          ' of repaired value). Rehab ' +
          usd(x.scope) +
          ' x 1.15 = ' +
          usd(m.capex) +
          '. All in ' +
          usd(m.price + m.capex) +
          ' = ' +
          pc(((m.price + m.capex) / m.arv) * 100, 0) +
          ' of repaired value. Rent ' +
          usd(m.rent) +
          ' is ' +
          pc((m.rent / x.fmr) * 100, 0) +
          ' of the Atlanta FY2026 3-bed Fair Market Rent ' +
          usd(x.fmr) +
          '. Cash needed ' +
          usd(m.down) +
          ' down + ' +
          usd(m.closing) +
          ' closing + ' +
          usd(m.capex) +
          ' rehab = ' +
          usd(m.cash) +
          '. Cash flow after the loan ' +
          usd(m.cf) +
          '/mo.',
      ],
    },
    {
      id: 'home-va',
      cat: 'house',
      tier: 2,
      tierName: 'Value-add',
      name: 'Cosmetic update, 3 bed',
      type: 'house',
      loanId: 'dscr',
      scope: 18000,
      cont: 15,
      f: {
        price: 232000,
        rent: 2300,
        tax: 242,
        ins: 142,
        hoa: 0,
        capex: Math.round(18000 * 1.15),
        capexMonths: 3,
        arv: 262000,
        liftIncome: 6,
      },
      why: (m, x) => [
        TYP +
          "A mid-priced house in a steady market (the national median single-family price is about $360,000; affordable and Midwest medians run $150,000-$280,000). A light cosmetic update (floors, paint, kitchen and bath refresh) lifts the appraisal and the rent. No 70% rule here: the deal is the gap between the cost of the work and the value it adds. A DSCR investor loan with 25% down. Scope, tax and insurance are the app's own assumptions.",
        'Rehab ' +
          usd(x.scope) +
          ' x 1.15 = ' +
          usd(m.capex) +
          '. New appraisal ' +
          usd(m.arv) +
          ' = price ' +
          usd(m.price) +
          ' + ' +
          usd(m.arv - m.price) +
          ' (' +
          Math.round(((m.arv - m.price) / m.capex) * 100) / 100 +
          ' x the rehab). Rent ' +
          usd(m.rent) +
          ' rises ' +
          pc(m.lift, 0) +
          ' to ' +
          usd(m.rentAfter) +
          ' after the work. DSCR ' +
          m.dscr.toFixed(2) +
          " on today's rent, " +
          m.dscrAfter.toFixed(2) +
          ' after the lift. Cash needed ' +
          usd(m.down) +
          ' down + ' +
          usd(m.closing) +
          ' closing + ' +
          usd(m.capex) +
          ' rehab = ' +
          usd(m.cash) +
          '. Cash flow after the loan ' +
          usd(m.cf) +
          '/mo.',
      ],
    },
    {
      id: 'home-turnkey',
      cat: 'house',
      tier: 3,
      tierName: 'Turnkey',
      name: 'Move-in-ready rental',
      type: 'house',
      loanId: 'conv30',
      alt: 20,
      f: { price: 245000, rent: 2300, tax: 245, ins: 125, hoa: 0, dp: 30 },
      why: (m, x) => [
        TYP +
          "A near move-in-ready house in a solid neighborhood with a tenant ready to go. You pay close to full market price, so there is no repair margin and no 70% rule: you are buying steady rent and slow growth. At about 7.5% a loan with only 20% down leaves almost nothing, so the example puts 30% down for a safer margin. Tax and insurance are the app's own assumptions.",
        'Rent ' +
          usd(m.rent) +
          ' is ' +
          pc((m.rent / m.price) * 100, 2) +
          ' of the price. Income after vacancy, tax, insurance, repairs and management ' +
          usd(m.noi) +
          '/mo. Loan ' +
          usd(m.loan) +
          ' at 7.5% = ' +
          usd(m.pay) +
          '/mo, so cash flow ' +
          usd(m.cf) +
          '/mo (DSCR ' +
          m.dscr.toFixed(2) +
          '). With 20% down it would be ' +
          usd(m.altCf) +
          '/mo. Cash needed ' +
          usd(m.down) +
          ' down + ' +
          usd(m.closing) +
          ' closing = ' +
          usd(m.cash) +
          '.',
      ],
    },
    {
      id: 'home-exec',
      cat: 'house',
      tier: 4,
      tierName: 'Premium',
      name: 'Executive home',
      type: 'house',
      loanId: 'cashh',
      f: { price: 620000, rent: 4300, tax: 568, ins: 250, hoa: 120 },
      why: (m, x) => [
        TYP +
          "A higher-end house in a strong school district rented to a long-stay tenant. Rent is a small share of the price, so the yield is low and most of the return is value growth. At today's rates a loan would cost more than the house earns, so the example is bought with cash and the trust can borrow against it later. Tax, insurance and HOA are the app's own assumptions; the research found no reliable luxury-rental data.",
        'Rent ' +
          usd(m.rent) +
          ' is ' +
          pc((m.rent / m.price) * 100, 2) +
          ' of the price. Income after vacancy, tax, insurance, HOA, repairs and management ' +
          usd(m.noi) +
          '/mo = ' +
          pc(m.cap, 1) +
          ' a year on the price. A 20%-down loan would cost ' +
          usd(m.altPay) +
          '/mo, more than the income, so cash flow would be ' +
          usd(m.altCf) +
          '/mo. Cash needed ' +
          usd(m.price) +
          ' + ' +
          usd(m.closing) +
          ' closing = ' +
          usd(m.cash) +
          '.',
      ],
    },

    {
      id: 'multi-hack',
      cat: 'multi',
      tier: 1,
      tierName: 'House hack',
      name: 'Fourplex, live in one unit',
      type: 'house',
      loanId: 'mfFha',
      units: 4,
      pack: false,
      f: { price: 520000, rent: 6200 },
      why: (m, x) => [
        TYP +
          "A fourplex where you live in one unit and rent the other three. FHA allows 3.5% down on 2-4 units you live in (580+ score, move in within about 60 days, stay a year) and adds mortgage insurance. The unit you live in is counted at market rent, because it replaces the rent you would pay elsewhere. Tax, insurance, management, repairs and reserves are the app's per-unit multi-family defaults.",
        m.units +
          ' units x ' +
          usd(m.rent / m.units) +
          ' = ' +
          usd(m.rent) +
          '/mo; price ' +
          usd(m.price) +
          ' = ' +
          usd(m.price / m.units) +
          ' a unit. Income after vacancy and costs ' +
          usd(m.noi) +
          '/mo. Loan ' +
          usd(m.loan) +
          ' (3.5% down, 1.75% mortgage insurance financed) plus insurance = ' +
          usd(m.pay) +
          '/mo, so cash flow ' +
          usd(m.cf) +
          '/mo (DSCR ' +
          m.dscr.toFixed(2) +
          ', FHA looks for 1.0). Cash needed ' +
          usd(m.down) +
          ' down + ' +
          usd(m.closing) +
          ' closing = ' +
          usd(m.cash) +
          '.',
      ],
    },
    {
      id: 'multi-s8pack',
      cat: 'multi',
      tier: 2,
      tierName: 'Section 8 pack',
      name: 'Pack of 8 houses',
      type: 'house',
      loanId: 'mfBlanket',
      units: 8,
      pack: true,
      f: { price: 944000, rent: 12000 },
      why: (m, x) => [
        TYP +
          "Eight older single-family houses bought together and financed on one blanket (portfolio) loan, rented to voucher holders. Rent is set well under the Atlanta FY2026 3-bedroom Fair Market Rent of $2,182 because the houses are older and in a lower-cost area. Management is 10% (scattered houses and voucher paperwork cost more). Tax, insurance and repairs are the app's per-house pack defaults. Ask for release clauses so you can sell one house at a time.",
        m.units +
          ' houses x ' +
          usd(m.price / m.units) +
          ' = ' +
          usd(m.price) +
          '; rent ' +
          usd(m.rent / m.units) +
          ' each = ' +
          pc((m.rent / m.units / 2182) * 100, 0) +
          ' of $2,182. Income after vacancy and costs ' +
          usd(m.noi) +
          '/mo. Blanket loan ' +
          usd(m.loan) +
          ' (75%) = ' +
          usd(m.pay) +
          '/mo, so cash flow ' +
          usd(m.cf) +
          '/mo (DSCR ' +
          m.dscr.toFixed(2) +
          ', needs 1.15). Cash needed ' +
          usd(m.down) +
          ' down + ' +
          usd(m.closing) +
          ' closing = ' +
          usd(m.cash) +
          '.',
      ],
    },
    {
      id: 'multi-20va',
      cat: 'multi',
      tier: 3,
      tierName: 'Value-add',
      name: '20-unit building',
      type: 'house',
      loanId: 'mfBank5',
      units: 20,
      pack: false,
      perUnitWork: 6000,
      cont: 15,
      capRate: 7,
      f: {
        price: 1960000,
        rent: 22000,
        capex: Math.round(20 * 6000 * 1.15),
        capexMonths: 9,
        arv: 2520000,
        liftIncome: 11,
        dp: 30,
      },
      why: (m, x) => [
        TYP +
          "A tired 20-unit building with below-market rents. You renovate units as they turn over, raise rents and later refinance into an agency or HUD loan. A bank loan fits the work period: 5-year balloon, 25-year schedule. Banks size it to a 1.25 DSCR on today's rent, so it lends 70% rather than 75%. Per-unit costs are the app's multi-family defaults for 20-49 units (6% management, a part-time maintenance tech).",
        'Work ' +
          usd(x.perUnitWork) +
          ' a unit x 20 x 1.15 = ' +
          usd(m.capex) +
          '. Rent today ' +
          usd(m.rent) +
          ' (' +
          usd(m.rent / m.units) +
          ' a unit) rises ' +
          pc(m.lift, 0) +
          ' to ' +
          usd(m.rentAfter) +
          '. Income ' +
          usd(m.noi) +
          '/mo today, ' +
          usd(m.noiAfter) +
          ' after. New value = ' +
          usd(m.noiAfter) +
          ' x 12 / ' +
          x.capRate +
          '% cap = ' +
          usd((m.noiAfter * 12) / (x.capRate / 100)) +
          ', stated ' +
          usd(m.arv) +
          '. Loan ' +
          usd(m.loan) +
          ' (70%) = ' +
          usd(m.pay) +
          '/mo: DSCR ' +
          m.dscr.toFixed(2) +
          ' today, ' +
          m.dscrAfter.toFixed(2) +
          ' after (needs 1.25). Cash needed ' +
          usd(m.down) +
          ' down + ' +
          usd(m.closing) +
          ' closing + ' +
          usd(m.capex) +
          ' work = ' +
          usd(m.cash) +
          '.',
      ],
    },
    {
      id: 'multi-50',
      cat: 'multi',
      tier: 4,
      tierName: 'Stabilized',
      name: '50-unit building',
      type: 'house',
      loanId: 'mfAgency',
      units: 50,
      pack: false,
      f: { price: 6000000, rent: 63750 },
      why: (m, x) => [
        TYP +
          "A full, well-run 50-unit building financed with a Fannie Mae / Freddie Mac loan: about 75% of the price, 10-year term, 30-year schedule, usually no personal guarantee, DSCR of about 1.25. At this size it needs professional management (5% fee plus an on-site manager in other costs). Per-unit tax, insurance, reserves and other costs are the app's multi-family defaults for 50+ units.",
        m.units +
          ' units x ' +
          usd(m.rent / m.units) +
          ' = ' +
          usd(m.rent) +
          '/mo; price ' +
          usd(m.price) +
          ' = ' +
          usd(m.price / m.units) +
          ' a unit. Income after vacancy and costs ' +
          usd(m.noi) +
          '/mo = ' +
          pc(m.cap, 1) +
          ' cap rate. Loan ' +
          usd(m.loan) +
          ' at 6.4% = ' +
          usd(m.pay) +
          '/mo, so cash flow ' +
          usd(m.cf) +
          '/mo (DSCR ' +
          m.dscr.toFixed(2) +
          ', needs 1.25). Cash needed ' +
          usd(m.down) +
          ' down + ' +
          usd(m.closing) +
          ' closing = ' +
          usd(m.cash) +
          '.',
      ],
    },

    {
      id: 'comm-nnn',
      cat: 'commercial',
      tier: 1,
      tierName: 'Net lease',
      name: 'Small net-lease building',
      type: 'commercial',
      loanId: 'comm25',
      capTarget: 6.8,
      capBand: [6, 9],
      f: { price: 1650000, rent: 12775, tax: 1100, ins: 350, hoa: 0, nnn: 100, dp: 40 },
      why: (m, x) => [
        TYP +
          "A small single-tenant building (a quick-service or pharmacy-type pad) on a long triple-net lease: the tenant repays all tax and insurance. CBRE's H1 2026 survey puts single-tenant net lease cap rates near 6.8%. The price comes from income / cap rate. The app deducts its own 7% vacancy, 8% management and 1% yearly repairs, so the cap rate it shows (" +
          pc(m.cap, 1) +
          ') is after those. Banks size to a 1.25 DSCR, so the loan is 60% and you put 40% down.',
        "Income after the app's costs " +
          usd(m.noi) +
          '/mo x 12 = ' +
          usd(m.noi * 12) +
          ' / price ' +
          usd(m.price) +
          ' = ' +
          pc(m.cap, 2) +
          ' cap. Loan ' +
          usd(m.loan) +
          ' at 7.25% over 25 years = ' +
          usd(m.pay) +
          '/mo: DSCR ' +
          m.dscr.toFixed(2) +
          ' (bank wants 1.25), cash flow ' +
          usd(m.cf) +
          '/mo. Cash needed ' +
          usd(m.down) +
          ' down + ' +
          usd(m.closing) +
          ' closing = ' +
          usd(m.cash) +
          '.',
      ],
    },
    {
      id: 'comm-strip',
      cat: 'commercial',
      tier: 2,
      tierName: 'Strip center',
      name: 'Neighborhood strip center',
      type: 'commercial',
      loanId: 'comm25',
      capTarget: 6.6,
      capBand: [6, 9],
      f: { price: 3800000, rent: 29400, tax: 2500, ins: 800, hoa: 1400, nnn: 90, dp: 40 },
      why: (m, x) => [
        TYP +
          "A small neighborhood strip center with several tenants (services, food, a convenience anchor). Leases are mostly triple net: tenants repay 90% of tax, insurance and common-area costs. CBRE's H1 2026 survey shows small strip centers at about 6.4-6.6%. Price = income / cap rate, using the app's own cap rate after vacancy, management and repairs. A bank loan at 60% to meet a 1.25 DSCR.",
        "Income after the app's costs " +
          usd(m.noi) +
          '/mo x 12 = ' +
          usd(m.noi * 12) +
          ' / price ' +
          usd(m.price) +
          ' = ' +
          pc(m.cap, 2) +
          ' cap. Loan ' +
          usd(m.loan) +
          ' at 7.25% over 25 years = ' +
          usd(m.pay) +
          '/mo: DSCR ' +
          m.dscr.toFixed(2) +
          ' (bank wants 1.25), cash flow ' +
          usd(m.cf) +
          '/mo. Cash needed ' +
          usd(m.down) +
          ' down + ' +
          usd(m.closing) +
          ' closing = ' +
          usd(m.cash) +
          '.',
      ],
    },
    {
      id: 'comm-flex',
      cat: 'commercial',
      tier: 3,
      tierName: 'Industrial',
      name: 'Industrial flex building',
      type: 'commercial',
      loanId: 'comm25',
      capTarget: 6.2,
      capBand: [5, 8],
      f: { price: 6000000, rent: 44475, tax: 3500, ins: 1200, hoa: 1800, nnn: 80, dp: 45 },
      why: (m, x) => [
        TYP +
          "A multi-tenant light-industrial / flex building (small bays with an office front) in a secondary market. CBRE's H1 2026 survey shows industrial at about 5.2% nationally; this example uses a wider 6.2% (the app's own assumption) for a smaller secondary-market building. Tenants repay 80% of tax, insurance and common-area costs. A bank loan at 55% to meet a 1.25 DSCR.",
        "Income after the app's costs " +
          usd(m.noi) +
          '/mo x 12 = ' +
          usd(m.noi * 12) +
          ' / price ' +
          usd(m.price) +
          ' = ' +
          pc(m.cap, 2) +
          ' cap. Loan ' +
          usd(m.loan) +
          ' at 7.25% over 25 years = ' +
          usd(m.pay) +
          '/mo: DSCR ' +
          m.dscr.toFixed(2) +
          ' (bank wants 1.25), cash flow ' +
          usd(m.cf) +
          '/mo. Cash needed ' +
          usd(m.down) +
          ' down + ' +
          usd(m.closing) +
          ' closing = ' +
          usd(m.cash) +
          '.',
      ],
    },
    {
      id: 'comm-office',
      cat: 'commercial',
      tier: 4,
      tierName: 'Office',
      name: 'Office building',
      type: 'commercial',
      loanId: 'comm25',
      capTarget: 7.9,
      capBand: [7, 10],
      f: { price: 8800000, rent: 82650, tax: 6000, ins: 1800, hoa: 3400, nnn: 60, dp: 30 },
      why: (m, x) => [
        TYP +
          "A larger multi-tenant office building. CBRE's H1 2026 survey shows office at about 7.9% (Class A about 6.0%), so the buyer is paid more income for more leasing risk. Tenants repay 60% of tax, insurance and common-area costs (gross-style leases repay less). Price = income / cap rate, using the app's own cap rate after vacancy, management and repairs. A bank loan at 70% meets a 1.25 DSCR at this higher cap rate.",
        "Income after the app's costs " +
          usd(m.noi) +
          '/mo x 12 = ' +
          usd(m.noi * 12) +
          ' / price ' +
          usd(m.price) +
          ' = ' +
          pc(m.cap, 2) +
          ' cap. Loan ' +
          usd(m.loan) +
          ' at 7.25% over 25 years = ' +
          usd(m.pay) +
          '/mo: DSCR ' +
          m.dscr.toFixed(2) +
          ' (bank wants 1.25), cash flow ' +
          usd(m.cf) +
          '/mo. Cash needed ' +
          usd(m.down) +
          ' down + ' +
          usd(m.closing) +
          ' closing = ' +
          usd(m.cash) +
          '.',
      ],
    },

    {
      id: 'biz-vend',
      cat: 'business',
      tier: 1,
      tierName: 'Route',
      name: 'Vending route',
      type: 'business',
      loanId: 'sellerb',
      multRange: [2, 3],
      f: { price: 58000, rent: 2000, revenue: 4000, margin: 50, dp: 50 },
      why: (m, x) => [
        TYP +
          "A small route of vending machines, mostly run by one owner. Small vending businesses sell for about 1.2 times yearly revenue and 2.3-2.5 times the owner's earnings (the median sale is about $47,500). The owner profit here is before any pay to yourself, as in broker listings (SDE). The seller carries half the price on a note, which is common for a business this size (sellers usually carry 10-50%).",
        'Revenue ' +
          usd(m.revenue) +
          '/mo x 12 = ' +
          usd(m.revenue * 12) +
          ' a year; margin ' +
          m.margin +
          '% gives owner profit ' +
          usd(m.rent) +
          '/mo = ' +
          usd(m.rent * 12) +
          ' a year. Price ' +
          usd(m.price) +
          ' = ' +
          m.mult.toFixed(1) +
          ' x profit and ' +
          (m.price / (m.revenue * 12)).toFixed(1) +
          ' x revenue. Seller note ' +
          usd(m.loan) +
          ' at 7% over 5 years = ' +
          usd(m.pay) +
          '/mo: DSCR ' +
          m.dscr.toFixed(1) +
          ', cash flow ' +
          usd(m.cf) +
          '/mo. Cash needed ' +
          usd(m.down) +
          ' down + ' +
          usd(m.closing) +
          ' closing = ' +
          usd(m.cash) +
          '.',
      ],
    },
    {
      id: 'biz-laundry',
      cat: 'business',
      tier: 2,
      tierName: 'Laundromat',
      name: 'Laundromat',
      type: 'business',
      loanId: 'sba7a',
      multRange: [3, 5],
      f: { price: 335000, rent: 7000, revenue: 20000, margin: 35 },
      why: (m, x) => [
        TYP +
          'A single-store laundromat with newer machines and a long lease. Laundromats usually sell for 3-5 times yearly owner profit (2-3 times when the machines are old or the lease is short). Buyers often use an SBA 7(a) loan: 10% down, about 10 years. SBA lenders also look at what you pay yourself, so treat the DSCR below as a rough check.',
        'Revenue ' +
          usd(m.revenue) +
          '/mo x 35% margin = owner profit ' +
          usd(m.rent) +
          '/mo = ' +
          usd(m.rent * 12) +
          ' a year. Price ' +
          usd(m.price) +
          ' = ' +
          m.mult.toFixed(1) +
          ' x profit and ' +
          (m.price / (m.revenue * 12)).toFixed(2) +
          ' x revenue. Loan ' +
          usd(m.loan) +
          ' at 9.75% over 10 years = ' +
          usd(m.pay) +
          '/mo: DSCR ' +
          m.dscr.toFixed(2) +
          ' (SBA wants 1.15), cash flow ' +
          usd(m.cf) +
          '/mo. Cash needed ' +
          usd(m.down) +
          ' down + ' +
          usd(m.closing) +
          ' closing = ' +
          usd(m.cash) +
          '.',
      ],
    },
    {
      id: 'biz-hvac',
      cat: 'business',
      tier: 3,
      tierName: 'Services',
      name: 'HVAC service company',
      type: 'business',
      loanId: 'sba7a',
      multRange: [2.5, 5],
      f: { price: 1075000, rent: 27930, revenue: 133000, margin: 21 },
      why: (m, x) => [
        TYP +
          'A home-services company (heating and air) with a crew of technicians, a customer list and a service-agreement base. Home-services businesses with under $1 million of owner profit sell for about 2.5-5 times that profit. Buyers often use an SBA 7(a) loan. The seller usually stays a few months to hand over the customers. SBA lenders also look at what you pay yourself, so treat the DSCR below as a rough check.',
        'Revenue ' +
          usd(m.revenue) +
          '/mo x 21% margin = owner profit ' +
          usd(m.rent) +
          '/mo = ' +
          usd(m.rent * 12) +
          ' a year. Price ' +
          usd(m.price) +
          ' = ' +
          m.mult.toFixed(1) +
          ' x profit and ' +
          (m.price / (m.revenue * 12)).toFixed(2) +
          ' x revenue. Loan ' +
          usd(m.loan) +
          ' at 9.75% over 10 years = ' +
          usd(m.pay) +
          '/mo: DSCR ' +
          m.dscr.toFixed(2) +
          ' (SBA wants 1.15), cash flow ' +
          usd(m.cf) +
          '/mo. Cash needed ' +
          usd(m.down) +
          ' down + ' +
          usd(m.closing) +
          ' closing = ' +
          usd(m.cash) +
          '.',
      ],
    },
    {
      id: 'biz-sba',
      cat: 'business',
      tier: 4,
      tierName: 'Established',
      name: 'Established company, SBA 7(a)',
      type: 'business',
      loanId: 'sba7a',
      multRange: [4, 7],
      f: { price: 5250000, rent: 105000, revenue: 750000, margin: 14 },
      why: (m, x) => [
        TYP +
          'A larger established company (about $9 million of yearly revenue, a management team under the owner) bought with an SBA 7(a) loan. Businesses above $1 million of owner profit sell for about 4-7 times that profit (EBITDA). The SBA 7(a) loan caps at $5 million, so the price is set so the loan stays under it. SBA lenders also look at what you pay yourself, so treat the DSCR below as a rough check.',
        'Revenue ' +
          usd(m.revenue) +
          '/mo x 14% margin = owner profit ' +
          usd(m.rent) +
          '/mo = ' +
          usd(m.rent * 12) +
          ' a year. Price ' +
          usd(m.price) +
          ' = ' +
          m.mult.toFixed(1) +
          ' x profit and ' +
          (m.price / (m.revenue * 12)).toFixed(2) +
          ' x revenue. Loan ' +
          usd(m.loan) +
          ' (90%, under the $5,000,000 cap) at 9.75% over 10 years = ' +
          usd(m.pay) +
          '/mo: DSCR ' +
          m.dscr.toFixed(2) +
          ' (SBA wants 1.15), cash flow ' +
          usd(m.cf) +
          '/mo. Cash needed ' +
          usd(m.down) +
          ' down + ' +
          usd(m.closing) +
          ' closing = ' +
          usd(m.cash) +
          '.',
      ],
    },
  ];
