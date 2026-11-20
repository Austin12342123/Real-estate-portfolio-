/* Portfolio finance engine v4 — pure functions, no DOM. Browser: window.Engine. Node: module.exports.
   Asset = { id, addr, type:'house'|'commercial'|'business', status:'owned'|'planned', price, dp, rate, term(months), io, closingPct, loanId,
   extra, driver, wait, rent (monthly base rent, or monthly owner profit for a business = revenue x margin/100), revenue (business only: monthly revenue, or null = rent / margin) and margin (business only: owner profit % of revenue, or null = 20), tax, ins, hoa (gross costs), nnn (% of tax+ins+hoa tenants repay), mat (months until the loan is due, 0 = none; io loans are due at their term), refiRate/refiTerm (null = Assumptions), liens, paid, buyIn (the earliest month it may be bought; the trust decides the real month), growth(%/yr or null), target (old links; ignored: every asset is funded by the trust of all assets before it) }.
   Percentages are plain numbers (85 = 85%). Money is dollars. Time is months. */
(function (root) {
