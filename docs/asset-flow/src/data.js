/* Sample data and the add-asset card path. Numbers are SAMPLE, computed the same simple way for every asset. */
const ASSETS = [
  { id: 'a1', addr: '12 Oak St', city: 'Kennesaw', status: 'owned', since: 'Mar 2026', price: 245000, value: 258000, rent: 2150, tax: 205, ins: 105, hoa: 0, dp: 20, rate: 6.9, term: 360, closing: 3, mgmt: 0, loan: 'Conventional 30-yr', paidDown: 2600, beds: 3, baths: 2 },
  { id: 'a2', addr: '41 Birch Ln', city: 'Marietta', status: 'owned', since: 'Aug 2026', price: 228000, value: 232000, rent: 2050, tax: 190, ins: 98, hoa: 35, dp: 5, rate: 6.6, term: 360, closing: 3, mgmt: 0, loan: 'Conventional, you live there', paidDown: 900, beds: 3, baths: 2 },
  { id: 'a3', addr: '7 Maple Ct', city: 'Acworth', status: 'planned', order: 3, price: 239000, value: 246000, rent: 2250, tax: 200, ins: 102, hoa: 0, dp: 25, rate: 7.75, term: 360, closing: 4, mgmt: 8, loan: 'DSCR investor loan', beds: 4, baths: 2 },
  { id: 'a4', addr: '88 Cedar Ridge Dr', city: 'Kennesaw', status: 'planned', order: 4, price: 262000, value: 268000, rent: 2150, tax: 220, ins: 110, hoa: 0, dp: 20, rate: 7.5, term: 360, closing: 3, mgmt: 8, loan: 'Conventional 30-yr', beds: 3, baths: 2.5 }];

/* the trust (funding pool): sample balance today and what it adds a month; planned homes are funded in buy order */
const TRUST = { balance: 41000, monthly: 3150 };
function metrics(a) {
  const loanAmt = a.price * (1 - a.dp / 100), r = a.rate / 1200, n = a.term;
  const pay = a.dp >= 100 ? 0 : loanAmt * r / (1 - Math.pow(1 + r, -n));
  const egi = a.rent * 0.95, maint = a.price * 0.01 / 12, mgmt = egi * a.mgmt / 100;
  const noi = egi - a.tax - a.ins - a.hoa - maint - mgmt, cf = noi - pay;
  const down = a.price * a.dp / 100, close = a.price * a.closing / 100;
  const owed = loanAmt - (a.paidDown || 0);
  const verdict = cf >= 100 && noi / pay >= 1.1 ? 'ok' : cf >= 0 ? 'warn' : 'bad';
  return { pay, noi, cf, cap: noi * 12 / a.price * 100, dscr: pay ? noi / pay : Infinity, down, close, cash: down + close,
    coc: cf * 12 / (down + close) * 100, equity: a.value - owed, verdict };
}
const $ = (x) => '$' + Math.round(Math.abs(x)).toLocaleString('en-US');
const $k = (x) => '$' + (Math.abs(x) >= 1e6 ? (x / 1e6).toFixed(2) + 'M' : Math.round(x / 1000) + 'k');
const sgn = (x) => (x < 0 ? '−' : '+') + $(x);
const VERD = { ok: ['✓', 'Good deal'], warn: ['△', 'Tight deal'], bad: ['✗', 'Loses money'] };
const VERD_OWNED = { ok: ['✓', 'Healthy'], warn: ['△', 'Tight'], bad: ['✗', 'Losing money'] };

/* months until the trust can afford each planned home, in buy order; pct = how much of its cash to close the trust holds today */
(function fund() { let bal = TRUST.balance, month = 0;
  ASSETS.filter((a) => a.status === 'planned').sort((x, y) => x.order - y.order).forEach((a, i) => { const need = metrics(a).cash;
    a.trustPct = i === 0 ? Math.min(100, bal / need * 100) : 0; a.after = i === 0 ? '' : ASSETS.find((b) => b.order === a.order - 1).addr;
    const m = Math.max(0, Math.ceil((need - bal) / TRUST.monthly)); month += m; bal = bal + m * TRUST.monthly - need; a.fundMonths = month; }); TRUST.queue = { month, bal }; })();

/* Every field the app needs for a home, one small topic per card, in the order a buyer thinks about it.
   kind: mc (one pick, auto-advances), multi (a few small inputs), input (one type box), review.
   when: the card only shows when this is true for the answers so far. field: the asset field(s) it fills. */
const CARDS = [
  { id: 'type', sec: 'Basics', kind: 'mc', q: 'What are you adding?', field: 'type, kind', opts: [['Single-family home', 'One house, one tenant'], ['Multi-family', 'Duplex up to a big building, or a pack of houses'], ['Commercial property', 'Retail, office, warehouse'], ['Business', 'You buy the company, not just a building']], note: 'Skipped when you start from a category: it is already picked.' },
  { id: 'units', sec: 'Basics', kind: 'mc', follows: 'type', q: 'How many units?', field: 'units, pack', when: 'Multi-family only', opts: [['2 (duplex)'], ['3 (triplex)'], ['4 (fourplex)'], ['5 or more', 'You type the number next'], ['A pack of houses', 'Several houses bought together']] },
  { id: 'unitsn', sec: 'Basics', kind: 'input', q: 'How many units or houses?', field: 'units', when: 'Only if 5 or more, or a pack', follows: 'units', inputs: [{ l: 'Units', ph: '12', t: 'num', big: true }] },
  { id: 'status', sec: 'Basics', kind: 'mc', q: 'Do you own it yet?', field: 'status', opts: [['Planning to buy', 'It joins your plan in buy order'], ['I already own it', 'It counts toward your net worth today']] },
  { id: 'addr', sec: 'Basics', kind: 'input', q: "What's the address?", field: 'addr', inputs: [{ l: 'Address', ph: '7 Maple Ct, Acworth', t: 'text' }, { l: 'Nickname (optional)', ph: 'Maple', t: 'text' }], help: 'Paste a listing link instead and the rest fills in where it can.' },
  { id: 'home', sec: 'Basics', kind: 'multi', q: 'Tell me about the home', field: 'beds, baths, sqft, yearBuilt', chips: [['Beds', ['1', '2', '3', '4', '5+'], '4'], ['Baths', ['1', '1.5', '2', '2.5', '3+'], '2']], inputs: [{ l: 'Square feet', ph: '1,650', t: 'num' }, { l: 'Year built', ph: '2004', t: 'num' }] },
  { id: 'price', sec: 'Price & loan', kind: 'input', q: "What's the purchase price?", field: 'price', inputs: [{ l: 'Price', pre: '$', ph: '239,000', t: 'num', big: true }], help: 'The price you expect to pay, not the asking price if you plan to offer less.' },
  { id: 'value', sec: 'Price & loan', kind: 'input', q: "What's it worth today?", field: 'value (estimated value)', when: 'Owned only', inputs: [{ l: 'Estimated value', pre: '$', ph: '258,000', t: 'num', big: true }], help: 'A Zillow or Redfin estimate is fine. It sets your equity and net worth.' },
  { id: 'loan', sec: 'Price & loan', kind: 'mc', withRate: true, q: 'How will you pay for it?', field: 'loanId, rate, term (the rate and length open on this card once a loan is picked)', info: 'loan types', opts: [['Conventional 30-year', '20% down · about 7.5%'], ['Conventional 15-year', '20% down · about 7.0%'], ['FHA (you live there)', '3.5% down · adds mortgage insurance'], ['FHA 203(k) rehab', 'Buy and fix with one loan'], ['DSCR investor loan', 'Qualifies on the rent · 25% down'], ['Cash', 'No loan']],
    optsBy: { multi: [['Conventional 2 to 4 units', '20% down · about 7.6%'], ['FHA, you live in one unit', '3.5% down · 2 to 4 units'], ['DSCR investor loan', 'Qualifies on the rent · 25% down'], ['Apartment loan (5+ units)', '25% down · about 7.25% · 30 years'], ['Cash', 'No loan']],
      commercial: [['Bank commercial loan', '25% down · about 7.5% · 25 years'], ['SBA 504', '10% down · you run a business there'], ['DSCR investor loan', 'Qualifies on the rent · 30% down'], ['Cash', 'No loan']],
      business: [['SBA 7(a)', '10% down · about 10.5% · 10 years'], ['Bank term loan', '25% down · about 9% · 7 years'], ['Seller note', 'The owner lends part · about 7%'], ['Cash', 'No loan']] } },
  { id: 'rate', sec: 'Price & loan', kind: 'multi', merged: 'loan', q: 'Your interest rate', field: 'rate, term', when: 'Skipped for cash', chips: [['Loan length', ['30 years', '15 years'], '30 years']], inputs: [{ l: 'Interest rate', post: '%', ph: '7.75', t: 'num', big: true, filled: true }], help: 'Filled in from the loan you picked (typical today, not a quote). Change it if your lender quoted something else.' },
  { id: 'dp', sec: 'Price & loan', kind: 'multi', q: 'How much down?', field: 'dp', when: 'Skipped for cash', chips: [['Down payment', ['3.5%', '5%', '10%', '20%', '25%'], '25%']], inputs: [{ l: 'Or type your own', post: '% down', ph: '25', t: 'num' }], live: 'That is $59,750 down on $239,000.' },
  { id: 'bal', sec: 'Price & loan', kind: 'input', q: 'How much is left on the loan?', field: 'loan balance', when: 'Owned only, skipped for cash', inputs: [{ l: 'Loan balance today', pre: '$', ph: '192,000', t: 'num', big: true }], help: 'On your latest mortgage statement. It sets your equity.' },
  { id: 'closing', sec: 'Price & loan', kind: 'input', q: 'Closing costs', field: 'closingPct', inputs: [{ l: 'Closing costs', post: '% of price', ph: '4', t: 'num', filled: true }], live: 'About $9,560. Cash to close: $69,310.', help: 'Lender, title and escrow fees. Filled in from the loan.' },
  { id: 'rehab', sec: 'Fix-up', kind: 'mc', q: 'Does it need work?', field: 'capex', opts: [['Move-in ready', 'No rehab budget'], ['Light refresh', 'Paint, floors · about $10k'], ['Big rehab', 'Kitchen, roof, systems · about $40k'], ["I'll type a budget"]] },
  { id: 'rehabd', sec: 'Fix-up', kind: 'input', follows: 'rehab', q: 'The rehab', field: 'capex, capexMonths, arv', when: 'Only if it needs work', inputs: [{ l: 'Budget', pre: '$', ph: '40,000', t: 'num' }, { l: 'Months of work', ph: '6', t: 'num' }, { l: 'Value after the work', pre: '$', ph: '320,000', t: 'num' }] },
  { id: 'rent', sec: 'Income', kind: 'input', q: 'What will it rent for?', field: 'rent', inputs: [{ l: 'Monthly rent', pre: '$', ph: '2,250', t: 'num', big: true }, { l: 'Section 8 rent (optional)', pre: '$', ph: '2,400', t: 'num', homeOnly: true }], help: 'Use a rent estimate or nearby listings. Vacancy is taken off for you.' },
  { id: 'unitmix', sec: 'Income', kind: 'input', q: 'Rent per unit', field: 'rent (all units)', when: 'Multi-family only', inputs: [{ l: 'Average rent per unit', pre: '$', ph: '1,150', t: 'num', big: true }], help: 'The total rent is your number of units times this average. You can list units one by one later.' },
  { id: 'nnn', sec: 'Income', kind: 'input', q: 'Who pays taxes and insurance?', field: 'nnn', when: 'Commercial only', inputs: [{ l: 'Share the tenants pay back', post: '%', ph: '85', t: 'num', big: true, filled: true }], help: 'On a triple-net (NNN) lease the tenants repay most of the taxes, insurance and upkeep.' },
  { id: 'revenue', sec: 'Income', kind: 'input', q: 'Yearly revenue', field: 'revenue', when: 'Business only', inputs: [{ l: 'Revenue per year', pre: '$', ph: '1,080,000', t: 'num', big: true }] },
  { id: 'margin', sec: 'Income', kind: 'input', q: 'Profit margin', field: 'margin', when: 'Business only', inputs: [{ l: 'Owner profit', post: '% of revenue', ph: '20', t: 'num', big: true, filled: true }], help: 'What the owner keeps after running costs, before the loan.' },
  { id: 'manage', sec: 'Income', kind: 'mc', q: 'Who will manage it?', field: 'mgmtPct', opts: [['I will', 'No management fee'], ['A property manager', '8% of rent'], ['A full-service manager', '10% of rent'], ['Use my default', 'From Assumptions']] },
  { id: 'tax', sec: 'Costs', kind: 'multi', q: 'Property tax', field: 'tax', chips: [['Shown as', ['Per month', 'Per year'], 'Per month']], inputs: [{ l: 'Property tax', pre: '$', ph: '200', t: 'num', big: true }], help: 'On the listing or the county tax site.' },
  { id: 'ins', sec: 'Costs', kind: 'multi', q: 'Insurance', field: 'ins', chips: [['Shown as', ['Per month', 'Per year'], 'Per month']], inputs: [{ l: 'Insurance', pre: '$', ph: '102', t: 'num', big: true }], help: 'A landlord policy, not a homeowner one. Skip to use a typical amount.' },
  { id: 'hoa', sec: 'Costs', kind: 'mc', q: 'Is there an HOA?', field: 'hoa', opts: [['No HOA'], ['Yes', 'You type the monthly fee next']] },
  { id: 'hoaamt', sec: 'Costs', kind: 'input', follows: 'hoa', q: 'HOA fee', field: 'hoa', when: 'Only if there is an HOA', inputs: [{ l: 'HOA per month', pre: '$', ph: '35', t: 'num', big: true }] },
  { id: 'repairs', sec: 'Costs', kind: 'mc', q: 'How old are the systems?', field: 'maintPct', info: 'repairs reserve', opts: [['Newer (under 10 years)', 'Repairs 0.5% of price a year'], ['Typical', 'Repairs 1% a year (your default)'], ['Older (25+ years)', 'Repairs 1.5% a year']] },
  { id: 'growth', sec: 'Plan', kind: 'mc', q: 'How fast will its value grow?', field: 'growth', opts: [['2% a year', 'Cautious'], ['3% a year', 'About the long-run average'], ['4% a year', 'Your plan default'], ['5% a year', 'Hot market']] },
  { id: 'when', sec: 'Plan', kind: 'mc', q: 'When should it be bought?', field: 'driver, wait', when: 'Planned only', opts: [['As soon as the trust can afford it', 'In buy order, after the ones above it'], ['Not before a month I pick', 'You pick the month next']] },
  { id: 'whenm', sec: 'Plan', kind: 'multi', q: 'Not before which month?', field: 'wait', when: 'Only if you pick a month', follows: 'when', chips: [['Month', ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], 'Jun'], ['Year', ['2027', '2028', '2029', '2030', '2031'], '2027']], help: 'It is still bought in order; this only holds it back.' },
  { id: 'owned', sec: 'Plan', kind: 'input', q: 'When did you buy it?', field: 'boughtOn', when: 'Owned only', inputs: [{ l: 'Bought on', ph: 'Mar 2026', t: 'text', big: true }] },
  { id: 'exit', sec: 'Plan', kind: 'mc', q: "What's the long-term plan?", field: 'exit, exitMonth', opts: [['Keep it', 'Hold and collect rent'], ['Sell it later', 'You pick the year next'], ['Refinance later', 'You pick the year next']] },
  { id: 'sellyr', sec: 'Plan', kind: 'input', q: 'In what year?', field: 'exitMonth', when: 'Only if you sell or refinance', follows: 'exit', inputs: [{ l: 'Year', ph: '2032', t: 'num', big: true }] },
  { id: 'review', sec: 'Review', kind: 'review', q: '7 Maple Ct is ready', field: 'all' }];

const BRANCH = [
  ['Multi-family', 'Adds "How many units?" after the first card (and a number box for 5 or more), "Rent per unit" in place of the rent card, drops beds and baths, and offers 2 to 4 unit, FHA, DSCR and apartment loans.'],
  ['Commercial', 'Rent becomes "Lease income", the home and HOA cards drop out, a "Who pays taxes and insurance?" card asks for the NNN share, and the loans are bank commercial, SBA 504, DSCR or cash.'],
  ['Business', 'Rent, tax, insurance, HOA, repairs and the manager card are replaced by "Yearly revenue" and "Profit margin", and the loans are SBA 7(a), bank term, seller note or cash.'],
  ['Owned', 'Adds "What is it worth today?" and "How much is left on the loan?", skips closing costs, and "When should it be bought?" is replaced by "When did you buy it?".']];

if (typeof module !== 'undefined') module.exports = { TRUST, ASSETS, metrics, $, $k, sgn, VERD, VERD_OWNED, CARDS, BRANCH };
