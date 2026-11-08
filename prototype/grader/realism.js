/* Category R: realism & market accuracy (30 pts). Checks the sample portfolio (Engine.seed()) against benchmarks/*.json.
   Evidence tiers shown in every check name:
     [verified]  threshold read from a primary page fetched on 2026-11-08 (Freddie Mac PMMS, SBA.gov 7(a)/504)
     [secondary] threshold from search-result snippets of secondary sources (BizBuySell write-ups, GF Data via Mercer Capital, ATTOM, CRE lenders)
     [judgment]  no source found; a stated rule of thumb, kept low-weight
   BizBuySell, LoopNet, Crexi and CBRE return HTTP 403 (bot protection) and were not bypassed. */
const fs = require('fs'), path = require('path');
const load = (d, f) => { try { return JSON.parse(fs.readFileSync(path.join(d, f), 'utf8')); } catch (e) { return {}; } };

exports.run = async function ({ E, check, Parts, benchDir }) {
  const B = load(benchDir, 'bench-business.json'), C = load(benchDir, 'bench-cre.json');
  const rates = C.rates || {}, bank = (C.loans && C.loans.commercialBank) || {};
  const PMMS30 = rates.mortgage30yPrimary || 7.18, PMMS15 = rates.mortgage15y || 6.57;           // verified (Freddie Mac, 2026-11-05)
  const PRIME = Math.max(rates.prime || 6.75, 7.0);                                                  // conflicting secondary sources, take the higher
  const SBA7A_MAX = (B.sba7a && B.sba7a.maxLoan) || 5000000, SBA504_MAX = (B.sba504 && B.sba504.maxLoan) || 5500000; // verified (SBA.gov)
  const BANK_DSCR = bank.minDscr || 1.25;                                                            // secondary (CRE lender sources: 1.20-1.35)
  const S = E.seed(), pl = E.plan(S), V = pl.V, g = S.g;
  const loansById = Object.fromEntries(E.LOANS.map((l) => [l.id, l]));
  const name = (h) => h.addr;
  const fin = S.houses.filter((h) => V[h.id].L > 0);
  const kind = (h) => /storage/i.test(h.addr) ? 'storage' : /medical/i.test(h.addr) ? 'medical' : /office/i.test(h.addr) ? 'office' : /industrial|flex|warehouse/i.test(h.addr) ? 'industrial' : 'retail';

  /* R1 mortgage rates vs Freddie Mac PMMS (verified) */
  await check('R01', 'R', '[verified] Loan-option rates are consistent with Freddie Mac PMMS (30-yr ' + PMMS30 + '%, 15-yr ' + PMMS15 + '%)', 3.5, 'Compare Engine.LOANS rates with bench-cre.json rates (PMMS 2026-11-05)', () => {
    const p = new Parts(), L = loansById;
    p.t(L.conv30.rate >= PMMS30 && L.conv30.rate <= PMMS30 + 1.5, 'Conventional 30-yr investor rate >= PMMS 30-yr (an investment loan never prices below the owner-occupied average)', 1, L.conv30.rate);
    p.t(L.conv15.rate >= PMMS15 && L.conv15.rate <= PMMS15 + 1.5, 'Conventional 15-yr rate >= PMMS 15-yr', 1, L.conv15.rate);
    p.t(L.fha.rate >= PMMS30 - 1.0 && L.fha.rate <= PMMS30 + 0.5, 'FHA rate within about -1.0 to +0.5 of PMMS 30-yr', 1, L.fha.rate);
    p.t(L.dscr.rate >= PMMS30 && L.dscr.rate <= 8.75, 'DSCR investor loan rate >= PMMS 30-yr and within the quoted 6.0-8.75 range', 1, L.dscr.rate);
    return p;
  });

  /* R2 SBA program limits (verified) */
  await check('R02', 'R', '[verified] SBA program limits: 7(a) max $5M, 504 debenture max $5.5M; 7(a) rate under Prime+3%', 3, 'Compare loan sizes of assets using sba7a / sba504 with SBA.gov limits', () => {
    const p = new Parts();
    S.houses.filter((h) => h.loanId === 'sba7a').forEach((h) => { p.t(V[h.id].L <= SBA7A_MAX, name(h) + ' loan ' + Math.round(V[h.id].L / 1e3) + 'K is within the $5M SBA 7(a) cap', 1, Math.round(V[h.id].L)); });
    S.houses.filter((h) => h.loanId === 'sba504').forEach((h) => { p.t(V[h.id].L * 0.4 <= SBA504_MAX, name(h) + ' 504 debenture within $5.5M', 1); });
    p.t(loansById.sba7a.rate <= PRIME + 3.0, 'SBA 7(a) preset rate <= Prime (' + PRIME + ') + 3.0 (variable-rate ceiling for loans over $350K) [secondary]', 1, loansById.sba7a.rate);
    p.t(loansById.sba504.rate >= 5 && loansById.sba504.rate <= 8.5, 'SBA 504 preset rate is a plausible 10-yr-Treasury-pegged fixed rate', 1, loansById.sba504.rate);
    return p;
  });

  /* R3 lender coverage */
  await check('R03', 'R', '[secondary] Every financed commercial property and business meets a lender DSCR minimum at purchase', 3.5, 'DSCR = NOI (or owner profit) / loan payment; bank >= ' + BANK_DSCR + ', SBA >= 1.15, bridge/seller >= 1.0', () => {
    const p = new Parts(), minBy = { comm25: BANK_DSCR, bankbiz: BANK_DSCR, sba504: 1.15, sba7a: 1.15, bridge: 1.0, sellerc: 1.0, sellerb: 1.0 };
    fin.filter((h) => h.type !== 'house').forEach((h) => { const v = V[h.id], d = v.noi / v.P, m = minBy[h.loanId] || 1.15; p.t(d >= m, name(h) + ' DSCR ' + d.toFixed(2) + ' vs min ' + m, 1, d.toFixed(2)); });
    return p;
  });

  /* R4 business pricing multiples */
  await check('R04', 'R', '[secondary] Business prices are realistic multiples of yearly owner profit (BizBuySell ~2.6-2.7x SDE; GF Data ~6-7x EBITDA at $10M+)', 3.5, 'multiple = price / (monthly profit x 12)', () => {
    const p = new Parts();
    S.houses.filter((h) => h.type === 'business').forEach((h) => {
      const m = h.price / (h.rent * 12), cap = h.price < 1e6 ? 3.72 : h.price < 5e6 ? 5.0 : h.price < 1e7 ? 6.0 : 7.0;
      p.t(m >= 1.5 && m <= cap, name(h) + ' pays ' + m.toFixed(1) + 'x profit (ceiling ' + cap + 'x for this size)', 1, m.toFixed(2));
    });
    return p;
  });

  /* R5 cap rates */
  await check('R05', 'R', '[secondary+judgment] Commercial cap rates are in a plausible band for the property type in secondary markets', 2.5, 'cap rate = NOI x 12 / price at purchase. Bands widen national averages (retail ~6.4-6.7, office ~7.9, industrial ~5.2-7.5, storage ~5.6-6.6) for secondary-market pricing', () => {
    const p = new Parts(), band = { retail: [6.0, 9.0], storage: [5.5, 8.0], medical: [6.0, 8.5], office: [7.0, 10.0], industrial: [5.0, 8.0] };
    S.houses.filter((h) => h.type === 'commercial').forEach((h) => { const k = kind(h), c = V[h.id].capRate, b = band[k]; p.t(c >= b[0] && c <= b[1], name(h) + ' (' + k + ') cap rate ' + c.toFixed(1) + '% vs ' + b[0] + '-' + b[1], 1, c.toFixed(2)); });
    return p;
  });

  /* R6 leverage and loan-type fit */
  await check('R06', 'R', '[secondary] Leverage and loan type fit the asset (LTV, minimum down payments, FHA only if you live there)', 2, 'Bank/bridge LTV <= 75%, DSCR loan >= 20% down, SBA equity >= 10%, no FHA on investment homes', () => {
    const p = new Parts();
    S.houses.forEach((h) => {
      const l = h.loanId;
      if (l === 'fha') p.t(false, name(h) + ' uses FHA, which requires owner-occupancy', 1);
      if (l === 'comm25' || l === 'bridge') p.t(100 - h.dp <= 75, name(h) + ' LTV ' + (100 - h.dp) + '% <= 75%', 1, 100 - h.dp);
      if (l === 'dscr') p.t(h.dp >= 20, name(h) + ' DSCR loan down payment ' + h.dp + '% >= 20%', 1, h.dp);
      if (l === 'sba7a' || l === 'sba504') p.t(h.dp >= 10, name(h) + ' SBA equity ' + h.dp + '% >= 10%', 1, h.dp);
      if (l === 'conv30' || l === 'conv15') p.t(h.dp >= 15, name(h) + ' investor loan down payment ' + h.dp + '% >= 15%', 1, h.dp);
    });
    p.t(true, 'at least one financed asset was evaluated', 0.001);
    return p;
  });

  /* R7 how much of the projected net worth depends on growth above realistic ceilings */
  await check('R07', 'R', '[judgment] Projected net worth does not depend on growth above realistic ceilings (homes 4.5%, commercial 5.5%, businesses 12% a year)', 4, 'Re-run the plan with every growth rate capped at the ceiling; score = capped net worth / projected net worth', () => {
    const ceil = { house: 4.5, commercial: 5.5, business: 12 };
    const C2 = JSON.parse(JSON.stringify(S)); C2.houses.forEach((h) => { const gr = h.growth == null ? g.appr : h.growth; h.growth = Math.min(gr, ceil[h.type || 'house']); });
    const a = pl.horizon.nw, b = E.plan(C2).horizon.nw, over = S.houses.filter((h) => (h.growth == null ? g.appr : h.growth) > ceil[h.type || 'house']);
    const ratio = a > 0 ? Math.max(0, Math.min(1, b / a)) : 1;
    return { ratio, detail: 'projected $' + (a / 1e6).toFixed(1) + 'M vs $' + (b / 1e6).toFixed(1) + 'M at realistic growth = ' + (ratio * 100).toFixed(0) + '%. Above ceiling: ' + (over.map((h) => h.addr + ' ' + h.growth + '%').join('; ') || 'none') };
  });

  /* R8 value-add economics */
  await check('R08', 'R', '[secondary] Flips and improvements have believable economics (ATTOM: ~21.5% gross margin on flips); lifts are bounded', 1.5, 'Flip gross margin = (sale price - purchase - rehab) / sale price must be 5-30%; commercial/business value lift <= 25% and income lift <= value lift', () => {
    const p = new Parts();
    S.houses.forEach((h) => {
      if (!(h.capex > 0 || h.liftValue > 0)) return;
      const ex = pl.exits[h.id];
      if (h.type === 'house' && ex) { const m = (ex.price - h.price - h.capex) / ex.price; p.t(m >= 0.05 && m <= 0.30, name(h) + ' flip gross margin ' + (m * 100).toFixed(0) + '%', 1, (m * 100).toFixed(1)); }
      else if (h.type !== 'house') p.t(h.liftValue <= 25 && h.liftIncome <= h.liftValue, name(h) + ' lift value ' + h.liftValue + '% / income ' + h.liftIncome + '%', 1);
    });
    p.t(true, 'evaluated', 0.001);
    return p;
  });

  /* R9 transaction costs */
  await check('R09', 'R', '[secondary] Selling and closing costs match market norms (agent 5-7%, commercial broker 2-6%, business broker ~Double Lehman, closing 1.5-5%)', 2.5, 'Compare sellCost and closingPct with typical commissions and closing costs', () => {
    const p = new Parts(), lehman = (price) => { let rem = price, fee = 0; [[1e6, 10], [1e6, 8], [1e6, 6], [1e6, 4]].forEach(([s, r]) => { const x = Math.min(rem, s); fee += (x * r) / 100; rem -= x; }); fee += rem * 0.02; return (fee / price) * 100; };
    S.houses.forEach((h) => {
      if (h.exit === 'sell') {
        const ex = pl.exits[h.id], px = ex ? ex.price : h.price;
        if (h.type === 'house') p.t(h.sellCost >= 5 && h.sellCost <= 7, name(h) + ' selling cost ' + h.sellCost + '% (agent 5-7%)', 1, h.sellCost);
        else if (h.type === 'commercial') p.t(h.sellCost >= 2 && h.sellCost <= 6, name(h) + ' selling cost ' + h.sellCost + '% (broker 2-6%)', 1, h.sellCost);
        else { const e = lehman(px); p.t(Math.abs(h.sellCost - e) <= 2, name(h) + ' selling cost ' + h.sellCost + '% vs ~' + e.toFixed(1) + '% on a $' + (px / 1e6).toFixed(1) + 'M sale', 1, h.sellCost); }
      }
      const cl = h.closingPct == null ? g.closing : h.closingPct, lo = h.type === 'house' ? 2 : 1.5, hi = 5;
      p.t(cl >= lo && cl <= hi, name(h) + ' closing costs ' + cl + '% within ' + lo + '-' + hi + '%', 0.5, cl);
    });
    return p;
  });

  /* R10 can this actually be financed and executed by one person with two co-signers? */
  await check('R10', 'R', '[secondary+judgment] Financing capacity: each loan fits lender net-worth rules, outside cash stays small, deal pace is executable', 4, 'Lenders often want net worth >= loan size (secondary); co-signer allowance $2M and outside-cash cap $1.5M are stated judgments; <= 4 commercial/business closings per 12 months (secondary: small teams close a few deals a year)', () => {
    const p = new Parts(), ALLOW = 2000000, OUTSIDE_CAP = 1500000, s = pl.series;
    S.houses.filter((h) => h.type !== 'house' && V[h.id].L > 0 && pl.purchase[h.id] > 0 && isFinite(pl.purchase[h.id])).forEach((h) => {
      const t = pl.purchase[h.id], nw = s.nw[Math.max(0, t - 1)], loan = V[h.id].L;
      p.t(loan <= Math.max(0, nw) + ALLOW, name(h) + ' $' + (loan / 1e6).toFixed(2) + 'M loan at month ' + t + ' vs net worth $' + (nw / 1e6).toFixed(2) + 'M + $2M co-signers', 1, (loan / 1e6).toFixed(2));
    });
    const out = pl.horizon.outside; p.t(out <= OUTSIDE_CAP, 'Outside cash needed $' + (out / 1e6).toFixed(1) + 'M <= $' + (OUTSIDE_CAP / 1e6) + 'M', 2, (out / 1e6).toFixed(2));
    const buys = S.houses.filter((h) => h.type !== 'house' && h.status === 'planned' && isFinite(pl.purchase[h.id])).map((h) => pl.purchase[h.id]).sort((a, b) => a - b);
    let worst = 0; buys.forEach((t, i) => { const n = buys.filter((x) => x >= t && x < t + 12).length; if (n > worst) worst = n; });
    p.t(worst <= 4, 'At most 4 commercial/business closings in any 12 months (peak ' + worst + ')', 1, worst);
    return p;
  });
};
