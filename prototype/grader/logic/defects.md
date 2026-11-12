# Defects found by the logic audit, and what was done

Evidence for each is a failing check in `grader/logic-grade.js` (run `LOGIC_ONLY=1 node grade.js`); sources are in `sources.md` (S-ids).

| # | Defect | Evidence | Fix (file) |
|---|---|---|---|
| 1 | Income-tax estimate used 2025 brackets, a $15,000 deduction and a $176,100 wage base | IRS 2026: deduction $16,100, brackets 12,400 / 50,400 / 105,700 / 201,775 / 256,225 / 640,600, wage base $184,500 (S1, S17). E.g. $96,000 gave 20.9%, correct 20.5% | `engine.js` estTaxPct |
| 2 | Appraisal cut was applied to the borrowing headroom, but the glossary and Assumptions text say lenders count only (1 - cut) of the VALUE. 80 of 120 random line-of-credit cases disagreed with an independent simulation; combined debt could exceed the cap after the cut | L3.1, L3.3 | `engine.js` locMonths, view().head0 |
| 3 | Rent, profit and costs at month 0 of an already-owned asset were inflated by the growth since purchase (paid months), so the portfolio total at "today" did not equal the row figures a user typed | L2.3 with owned assets and paid > 0: series NOI 2.5% above the typed rent after 10 paid months | `engine.js` plan(): growth factor measured from today |
| 4 | FHA annual mortgage insurance was flat on the starting loan including the financed 1.75% upfront premium. 24 CFR 203.284: it is charged on the remaining balance excluding the upfront premium, so it falls each year | L1.7: month-240 insurance $112.51 vs $63.0 | `engine.js` mipMonthly, plan series; test expectations in `grade.js` B24 and `sync-grade.js` adapted for the formula |
| 5 | "Lasts" stress test lived only in app.js (untested) and added today's fixed costs (tax, insurance, HOA) to plan-end income: a time-basis mismatch that understated the burn | L6.4, L9.5 | `engine.js` stress() (new), `app.js` uses it |
| 6 | Default plan was not financeable by real lenders: DSCR 1.01 (SBA 504 on a rental strip, which also needs owner occupancy), 1.08, 1.16, 1.06; two seller-financed assets with DSCR 0.86 and 0.91 (negative cash flow); seller notes covering 80% of $1.9M and $4.6M and $11.4M deals; a 36-month interest-only bridge loan running 17 years because the balloon is not modeled | L4.4, L4.5, L4.7, L1.5 | `engine.js` seedPlan: rental strip on a bank loan, bank/commercial loans at 60-65% loan-to-value, no seller notes, no 504, no bridge; willow rent 2,150; business growth 7.5% -> 7.2% to keep net worth near $125M (now $126.0M) |
| 7 | Default vacancy 5% was below Census (7.1% overall, about 6% single-family) with no disclosure | S16, S18 | `info.js` vacancy |
| 8 | Credit line against a business used the real-estate 85% cap with no disclosure | S5 covers real estate only | `info.js` creditline, Assumptions note |
| 9 | Flat 20% portfolio tax and 25% sale tax were not tied to brackets, NIIT, recapture or depreciation anywhere in the UI | S1, S20, S21, S23 | `info.js` portfoliotax, salestax |
| 10 | DTI help stated "43% or less" as the lender rule; CFPB's general QM no longer has a 43% cap; own housing payment is not counted and this was undisclosed | S10-S12 | `info.js` dti |
| 11 | Commercial tax/insurance in the sample are 0.7% of price (below typical) with no mention that leases pass costs to tenants | L2.6 | `info.js` noi |
| 12 | No page told the user that figures are nominal dollars, that rent and costs grow with value, that prices of future purchases are in future dollars, and that FHA premium falls | L10.2 | `app.js` Assumptions "How the numbers are built" |
| 13 | Net-worth definition did not say assets are before selling costs and taxes and exclude personal savings | L10.3 | `info.js` networth |
| 14 | List order of the stored default plan was not buy order | L9.1 | `engine.js` seedPlan sorts once with orderByBuy |
| 15 | Seller-note presets implied the seller carries 80% (a rare structure) with no warning | L10.4 | `engine.js` LOANS notes, `info.js` sellerfin |

## Known limits that are disclosed, not fixed

- Business growth of 7.2%/yr for 28 years is above the long-run growth of the economy; there is no fetchable source for it. The Growth help says so in plain words. It is the main driver of the $126M result.
- Commercial growth 4.5%/yr and cap rates / business multiples have only secondary, unverified benchmarks (CBRE, BizBuySell, LoopNet, Crexi were blocked).
- Saved cash flow toward a down payment uses today's cash flow (it does not grow), which is conservative.
- Taxes: flat rates, no depreciation, no state tax, no pass-through deduction.
- Interest-only and short-term loans: a refinance at maturity is still not modeled (the default plan no longer uses one).
