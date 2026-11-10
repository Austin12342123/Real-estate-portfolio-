/* Independent reference implementations used by logic-grade.js. Deliberately written WITHOUT importing engine.js:
   every function here iterates month by month (or uses textbook closed forms) so it can disagree with the engine's closed forms.
   Percentages are plain numbers (85 = 85%). Money in dollars. Time in months. */
'use strict';

/* ---- loans ---- */
/* level payment by simple recurrence search free of the closed form: bisection on the payment so the balance after n months is 0 */
function paymentIter(L, ratePct, n) {
  if (L <= 0) return 0;
  const i = ratePct / 1200;
  if (i === 0) return L / n;
  let lo = 0, hi = L * (1 + i) + 1;
  for (let it = 0; it < 200; it++) {
    const mid = (lo + hi) / 2; let b = L;
    for (let m = 0; m < n; m++) b = b * (1 + i) - mid;
    if (b > 0) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}
/* closed form, textbook M = L i / (1 - (1+i)^-n) */
function paymentClosed(L, ratePct, n) { const i = ratePct / 1200; return L <= 0 ? 0 : i === 0 ? L / n : (L * i) / (1 - Math.pow(1 + i, -n)); }
/* balance after k months, paying `pay` each month (month-by-month) */
function balanceAfter(L, ratePct, pay, k) { const i = ratePct / 1200; let b = L; for (let m = 0; m < k; m++) { b = b * (1 + i) - pay; if (b <= 0) return 0; } return b; }
/* number of months to pay a balance B off with payment `pay` (first month the balance is <= 0), Infinity if never */
function payoffMonths(B, ratePct, pay, cap) {
  const i = ratePct / 1200; if (B <= 0.005) return 0; let b = B;
  for (let m = 1; m <= (cap || 40000); m++) { b = b * (1 + i) - pay; if (b <= 0.005) return m; if (m > 5 && pay <= i * B + 1e-9) return Infinity; }
  return Infinity;
}
/* FHA: financed upfront premium, annual premium on a declining balance (HUD Handbook 4000.1 App. 1.0 / ML 2023-05) */
function fhaLoan(base, dpPct, upfrontPct) { return base * (1 - dpPct / 100) * (1 + upfrontPct / 100); }
function fhaAnnualOnBalance(balance, annualPct) { return (balance * annualPct) / 100 / 12; }

/* ---- income model ---- */
/* monthly NOI of a rental: vacancy off the rent, management % of collected rent, repairs % of price per year, fixed escrow costs */
function noiRental(rent, price, tax, ins, hoa, vacPct, mgmtPct, maintPct, nnnPct) {
  const reimb = (nnnPct || 0) / 100 * (tax + ins + hoa); /* tenants repay nnn% of tax + insurance + CAM; the repayment is collected like rent (vacant space repays nothing) */
  const collected = (rent + reimb) * (1 - vacPct / 100), mgmt = collected * mgmtPct / 100, repairs = price * maintPct / 100 / 12;
  return collected - mgmt - repairs - tax - ins - hoa;
}
const capRate = (noiMonthly, price) => (noiMonthly * 12) / price * 100;
const dscr = (noiMonthly, debtService) => (debtService > 0 ? noiMonthly / debtService : Infinity);

/* ---- value ---- */
const valueAt = (price, growthPct, ageMonths) => price * Math.pow(1 + growthPct / 100, ageMonths / 12);

/* ---- credit-line headroom (the cash a lender will advance behind an asset) ----
   cap = max combined loan-to-value %, haircut = % the lender takes off the appraised value, liens = other claims.
   headroom = cap * (value * (1 - haircut)) - balance - liens, floored at 0. */
function headroom(value, capPct, haircutPct, balance, liens) { return Math.max(0, (capPct / 100) * value * (1 - haircutPct / 100) - balance - (liens || 0)); }

/* months until headroom + saved cash flow covers `need` (month-by-month, independent of the engine's closed-form balance).
   o.payAt(k) = scheduled payment in month k (so a refinance can change it); o.savedAt(k) = cash flow saved in month k (it grows with the asset's income). */
function monthsToLine(o) {
  let cum = 0;
  for (let k = 0; k <= 600; k++) {
    if (k > 0 && !o.noCash) cum += o.savedAt(k - 1);
    const h = headroom(o.valueAt(k), o.capPct, o.haircutPct, o.balAt(k), o.liens);
    if (h + cum >= o.need) return k;
  }
  return Infinity;
}
/* loan with an optional balloon: month-by-month balances and payments. At month mat the balance left is refinanced into a level-payment loan (refiRatePct, refiTermMonths). */
function loanSim(o) {
  const N = o.months || 400, bal = [o.B0], pay = [], rate = []; let b = o.B0, p = o.pay, r = o.ratePct;
  for (let k = 0; k < N; k++) {
    if (o.mat > 0 && k === o.mat) { r = o.refiRatePct; p = paymentClosed(b, r, o.refiTermMonths); }
    pay.push(b > 0.005 ? p : 0); rate.push(r);
    b = b > 0.005 ? Math.max(0, b * (1 + r / 1200) - p - (o.extra || 0)) : 0; if (b <= 0.005) b = 0; bal.push(b);
  }
  let payoff = Infinity; for (let k = 0; k < bal.length; k++) if (bal[k] <= 0.005) { payoff = k; break; }
  return { bal, pay, rate, payoff };
}
/* straight-line depreciation by month (IRS Pub. 946): first month half (mid-month convention), no more than the basis */
function depSim(basis, years, months, mid) { let tot = 0; const u = basis / (years * 12), cum = [0]; for (let m = 0; m < months; m++) { tot = Math.min(basis, tot + u * (mid && m === 0 ? 0.5 : 1)); cum.push(tot); } return cum; }
/* federal tax on an amount of ordinary income by walking up in $25 slices (independent of the engine's closed-form brackets) */
function taxWalk(startTaxable, amount, kind) {
  const br = TAX2026.brackets; let t = 0; const step = 25;
  for (let x = 0; x < amount; x += step) { const w = Math.min(step, amount - x), at = startTaxable + x + w / 2;
    let rate = 0, lo = 0; for (const [hi, r] of br) { if (at <= hi) { rate = r; break; } }
    if (kind === '1250') rate = Math.min(rate, 0.25);
    if (kind === 'ltcg') rate = at <= 49450 ? 0 : at <= 545500 ? 0.15 : 0.20;
    t += w * rate; }
  return t;
}

/* ---- U.S. single-filer tax estimate, tax year 2026 ----
   IRS Rev. Proc. 2025-32 / IRS 2026 inflation release: standard deduction 16,100; brackets below. IRS Pub. 15 (2026): social security wage base 184,500, 6.2% + 1.45% employee share. */
const TAX2026 = { std: 16100, brackets: [[12400, 0.10], [50400, 0.12], [105700, 0.22], [201775, 0.24], [256225, 0.32], [640600, 0.35], [Infinity, 0.37]], ssBase: 184500, ss: 0.062, medicare: 0.0145 };
function taxPct2026(gross) {
  if (!(gross > 0)) return 0;
  const taxable = Math.max(0, gross - TAX2026.std); let fed = 0, lo = 0;
  for (const [hi, r] of TAX2026.brackets) { if (taxable > lo) fed += (Math.min(taxable, hi) - lo) * r; lo = hi; }
  const fica = Math.min(gross, TAX2026.ssBase) * TAX2026.ss + gross * TAX2026.medicare;
  return Math.round(((fed + fica) / gross) * 1000) / 10;
}

/* ---- qualifying DTI (Fannie-style rental treatment: count 75% of gross rent; net of the property's full payment; a positive net adds to income, a negative net adds to debts) ---- */
function dtiRef(o) {
  const income = o.otherIncomeMonthly; let debts = o.otherDebt + (o.housing || 0), inc = income; /* the borrower's own rent or mortgage is a debt */
  for (const a of o.assets) { const net = o.rentCountPct / 100 * a.grossRent - a.payment; if (net >= 0) inc += net; else debts += -net; }
  return inc > 0 ? Math.min(999, debts / inc * 100) : debts > 0 ? 999 : 0;
}

/* ---- small seeded RNG for reproducible random cases ---- */
function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

module.exports = { loanSim, depSim, taxWalk, paymentIter, paymentClosed, balanceAfter, payoffMonths, fhaLoan, fhaAnnualOnBalance, noiRental, capRate, dscr, valueAt, headroom, monthsToLine, TAX2026, taxPct2026, dtiRef, rng };
