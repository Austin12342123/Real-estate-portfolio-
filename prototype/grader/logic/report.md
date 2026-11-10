# Logic and math grader (LOGIC_ONLY)

Run: 2026-11-10T09:35:46.508Z

**TOTAL 100 / 100**

| Cat | Area | Earned | Max |
|---|---|---|---|
| L1 | Loan / amortization / payoff math | 14 | 14 |
| L2 | Income, expense and NOI model | 14 | 14 |
| L3 | Leverage, LTV/CLTV and credit-line rules | 12 | 12 |
| L4 | Lender qualification (DTI / DSCR / rental haircut) | 10 | 10 |
| L5 | Loan-product terms vs sources (every LOANS preset) | 12 | 12 |
| L6 | Appreciation, rent growth, inflation and time basis | 10 | 10 |
| L7 | Taxes, selling costs and depreciation | 8 | 8 |
| L8 | Business valuation, growth and operating model | 8 | 8 |
| L9 | Plan integrity (ordering, funding chain, cash recycling, stress test) | 7 | 7 |
| L10 | Disclosure, labels, units and glossary accuracy | 5 | 5 |

## Checks

| ID | Check | Pts | Earned | Result / evidence | Sources |
|---|---|---|---|---|---|
| L1.1 | Level payment equals the textbook formula AND a bisection on the balance (400 random loans incl. 0% rate, 12-480 months) | 2 | 2 | PASS 0 / 400 disagree  |  |
| L1.2 | Balance today after m paid payments equals month-by-month recurrence (300 random owned loans) | 2 | 2 | PASS 0 / 300 disagree |  |
| L1.3 | Portfolio debt series for a loan with extra payments equals the reference balance every month, and is 0 after payoff (60 random) | 1 | 1 | PASS 0 / 60 scenarios disagree  |  |
| L1.4 | Months to pay off (payoffN) with extra payments equals month-by-month simulation (300 random incl. never-pays-off cases) | 3 | 3 | PASS 0 / 300 disagree  |  |
| L1.5 | Interest-only: payment = balance x rate/12, balance never falls without extra, extra reduces it, 0% IO is a free payment of 0; no default-plan interest-only loan outlives its term (balloon not modeled) | 1 | 1 | PASS true,true,true,true |  |
| L1.6 | FHA / 203(k): loan = (price + financed rehab) x (1 - down) x (1 + 1.75% upfront premium); down is 3.5% of price + rehab; cash at closing excludes rehab | 1.5 | 1.5 | PASS 255290.75 vs 255290.75 | S6,S7 |
| L1.7 | FHA annual premium is charged on the remaining balance EXCLUDING the financed upfront premium (24 CFR 203.284), so it falls as the loan is paid down | 1.5 | 1.5 | PASS mip at month 240: engine 63.00 vs declining-balance 63.00 | S6,S8,S27 |
| L1.8 | Closing costs are a % of PRICE (not loan); cash needed at closing = down payment + closing costs; custom % overrides the global default | 1 | 1 | PASS 9000,15000,69000 |  |
| L1.9 | FHA premium rates match HUD (upfront 1.75%; annual 0.55% for >95% LTV, base loan <= $726,200, term > 15 yrs) and Limited 203(k) cap $75,000 | 1 | 1 | PASS [1.75,0.55,3.5] | S6,S7 |
| L2.1 | noiOf equals the reference NOI (vacancy off rent, management on collected rent, repairs % of price, fixed costs) for 300 random homes and commercial; business NOI is the owner profit | 3 | 3 | PASS 0 / 300 disagree |  |
| L2.2 | view(): cash flow = NOI - payment - mortgage insurance; cap rate = 12*NOI/price; price multiple = price/(12*NOI); DSCR basis (NOI / P+MIP) consistent (200 random) | 1 | 1 | PASS 0 / 200 disagree |  |
| L2.3 | Portfolio NOI series = sum of asset NOI x growth factor: income and costs grow with the asset growth rate (checked at months 0, 60, 180 on 40 random assets) | 2 | 2 | PASS 0 / 40 disagree  |  |
| L2.4 | Default vacancy vs Census HVS rental vacancy (US 7.1% in 2025, 7.4% in 2026 YTD, 8.2% avg 2000-2025): default must be >= 7% or the UI must name the Census figure and say why lower | 2 | 2 | PASS default vac 5%; glossary mentions Census: true | S18,S19 |
| L2.5 | Default management fee 8% and repairs 1%/yr are disclosed as rule-of-thumb assumptions (no fetched source; NARPM / NRC figures were not reachable) | 2 | 2 | PASS (disclosed, not source-verified) mgmt 8, maint 1 |  |
| L2.6 | Commercial rows state that rent is net of what tenants reimburse (tax/insurance/CAM): default commercial property tax + insurance are well below typical 1%+ of value, so the UI must say expense lines are net of NNN pass-throughs | 2 | 2 | PASS tax+insurance = 0.70-0.70% of price per year; disclosed true |  |
| L2.7 | Default portfolio cap rates and price multiples fall in the bands of the grader benchmark files (bench-cre.json / bench-business.json; secondary sources, flagged unverified there) | 2 | 2 | PASS (disclosed, not source-verified) all in band |  |
| L3.1 | Months until the credit line (locMonths) equals an independent month-by-month simulation where the appraisal cut is taken off the VALUE (cap x value x (1 - cut) - balance - liens), incl. saved cash flow (120 random) | 3 | 3 | PASS 0 / 120 disagree (cap,cut,liens,engine,ref)  | S9,S12 |
| L3.2 | extraFor: the extra payment returned reaches the target month and 1 dollar less does not (40 random; null only when infeasible) | 1 | 1 | PASS 0 / 40 wrong |  |
| L3.3 | After the credit-line draw the combined loan (balance + other liens + draw) never exceeds cap x value x (1 - appraisal cut) (cltvAtLoc, 100 random) | 2 | 2 | PASS 0 over the limit  |  |
| L3.4 | Default max combined loan-to-value (cap) does not exceed the 85% supervisory ceiling for improved property incl. non-owner-occupied 1-4 family (12 CFR 365 App. A); default credit-line rate sits between prime (7.00%, Fed H.15) and prime + 3.5 | 1.5 | 1.5 | PASS cap 85, credit-line rate 8.5 | S5,S14 |
| L3.5 | A credit line behind a BUSINESS (not real estate, no supervisory 85% limit) is disclosed as unrealistic at the same cap, or capped lower | 1.5 | 1.5 | PASS glossary mentions business: true |  |
| L3.6 | Credit-line interest: draw x line rate / 12 per month from the month the line is drawn, none before; the draw shows as debt then; draw = cash needed minus saved cash flow | 1.5 | 1.5 | PASS 1968.11 2399.36 431.25 230065.49 287325.29 57500 |  |
| L3.7 | Saved cash flow = max(0, NOI - payment - MIP), capped at the cash needed, and what is saved is deducted from liquid cash when the target closes (no double count) | 1.5 | 1.5 | PASS 403.89 403.89 7270 7270 |  |
| L4.1 | DTI at month 0 equals the reference (75% of gross rent minus the property payment: a positive net adds to income, a negative net adds to debts; plus co-signer and job income; 80 random portfolios) | 3 | 3 | PASS 0 / 80 disagree  | S11,S12 |
| L4.2 | DTI limit default 43% and rental haircut 75% are consistent with CFPB (43% was the old General QM cap, now replaced by price-based test) and the UI says lenders vary (up to ~50%); wording must not present 43% as a current legal rule | 1.5 | 1.5 | PASS Your monthly debt payments divided by the monthly income a lender counts. Limits vary by loan and lender, often 43% to 50% at most. This app does not add your o | S10,S11 |
| L4.3 | DTI includes the borrower's OWN housing payment (rent or mortgage) as a lender would, or the UI discloses that it does not | 1 | 1 | PASS disclosed: true |  |
| L4.4 | Every purchase in the default plan meets its lender's minimum DSCR at closing (SBA 7(a)/504 >= 1.15, bank loans >= 1.25 as the app states, DSCR loan >= 1.2 as the app states, bridge and seller notes >= 1.0) | 2 | 2 | PASS all meet minimums | S3,S1 |
| L4.5 | No asset in the default plan cash-flows negative at its own purchase (owner requirement: homes never negative; commercial and businesses must at least pay their own loan) | 1 | 1 | PASS none negative |  |
| L4.6 | Debt-to-income in the default plan stays at or under the limit at every month (no purchase that a lender would decline on DTI) | 1 | 1 | PASS peak DTI 0.9% at month 26 vs limit 43 |  |
| L4.7 | Default plan loan rules: each SBA 7(a) <= $5M and the 7(a) balances outstanding at once <= $5M (conservative reading: SBA aggregates a borrower and affiliates), 504 only for owner-occupied property, bank real-estate loans <= 85% LTV, no seller note above 50% of price | 0.5 | 0.5 | PASS ok; peak 7(a) outstanding $3481893 at month 92 | S2,S3,S4,S5 |
| L5.conv30 | Conventional 30-yr investor: 360 months, rate between PMMS 30-yr (7.18%) and PMMS + 1.0 (investor price adjustment), down >= 15% | 0.8571428571428571 | 0.8571428571428571 | PASS dp 20 rate 7.5 term 360 io false | S13 |
| L5.conv15 | Conventional 15-yr: 180 months, rate between PMMS 15-yr (6.57%) and +1.0, down >= 15% | 0.8571428571428571 | 0.8571428571428571 | PASS dp 20 rate 7 term 180 io false | S13 |
| L5.fha | FHA 30-yr: 3.5% down, upfront 1.75%, annual 0.55%, owner-occupied flag, rate <= PMMS 30-yr | 0.8571428571428571 | 0.8571428571428571 | PASS dp 3.5 rate 6.9 term 360 io false | S6,S7,S13 |
| L5.k203 | 203(k): 3.5% down, same premiums, finances rehab, owner-occupied, Limited cap $75,000 stated, default rehab within it | 0.8571428571428571 | 0.8571428571428571 | PASS dp 3.5 rate 7.15 term 360 io false | S6,S7 |
| L5.dscr | DSCR investor loan: 30-yr, down 20-25%, rate above the conventional investor rate (7.18% PMMS + premium) | 0.8571428571428571 | 0.8571428571428571 | PASS dp 25 rate 7.75 term 360 io false | S13 |
| L5.cashh | Cash purchase (home): 100% down, 0% rate, no loan | 0.8571428571428571 | 0.8571428571428571 | PASS (disclosed, not source-verified) dp 100 rate 0 term 360 io false |  |
| L5.comm25 | Commercial bank 25-yr: 300 months, down 20-35% (65-80% LTV; supervisory limit 85%), rate near prime (7.00%) +0 to +1.5 | 0.8571428571428571 | 0.8571428571428571 | PASS dp 25 rate 7.25 term 300 io false | S5,S14 |
| L5.sba504 | SBA 504: 25-yr real estate term allowed (10/20/25), down payment 10% standard, max debenture $5.5M, owner-occupancy stated | 0.8571428571428571 | 0.8571428571428571 | PASS dp 10 rate 6.75 term 300 io false | S4,S3 |
| L5.bridge | Bridge loan: interest-only, short term (<= 5 yrs), rate above prime (>= 8.5%) | 0.8571428571428571 | 0.8571428571428571 | PASS dp 30 rate 9.5 term 36 io true | S14 |
| L5.sellerc | Seller financing (commercial): negotiated; rate not below the 30-yr mortgage rate minus 2 pts, term <= 30 yrs, preset note says terms vary and typical share is partial | 0.8571428571428571 | 0.8571428571428571 | PASS (disclosed, not source-verified) dp 10 rate 6 term 240 io false |  |
| L5.sba7a | SBA 7(a) business: <= 10-year term for business acquisition (25 for real estate), max loan $5M stated, rate <= prime + 3.0 (10.00%) for loans over $350k, min 10% injection | 0.8571428571428571 | 0.8571428571428571 | PASS dp 10 rate 9.75 term 120 io false | S2,S3,S14 |
| L5.bankbiz | Bank term loan (business): 5-10 yr term, rate above prime, down >= 20% | 0.8571428571428571 | 0.8571428571428571 | PASS dp 25 rate 9 term 84 io false | S14 |
| L5.sellerb | Seller note (business): <= 10-yr term, note says the seller finances only part of the price and the share is limited | 0.8571428571428571 | 0.8571428571428571 | PASS (disclosed, not source-verified) dp 20 rate 7 term 60 io false |  |
| L5.cashb | Cash purchase (business): 100% down, 0% rate | 0.8571428571428571 | 0.8571428571428571 | PASS (disclosed, not source-verified) dp 100 rate 0 term 360 io false |  |
| L6.1 | Value at month k = price x (1+g)^(k/12) (compound, months/12); after an improvement the appraisal replaces it and then compounds from completion (60 random) | 2 | 2 | PASS 0 / 60 disagree |  |
| L6.2 | Living costs and manager pay inflate monthly-compounded by (1+inflation)^(t/12); job pay raises in whole years; income and costs share the same time base (nominal dollars, plan month t) | 2 | 2 | PASS true,true,true |  |
| L6.3 | Default home appreciation (4%/yr; rent and costs grow with value) sits inside the observed range: FHFA purchase-only US HPI 1991-2026 grew 4.32%/yr, 20-year rolling windows 2.75%-4.38% (median 3.56%). The UI must state the FHFA figure, that rent and costs grow with value, and that dollars are nominal | 2 | 2 | PASS home growth 4 vs FHFA 20y range 2.75-4.38; disclosed with FHFA figure: true | S28 |
| L6.6 | Commercial growth defaults (4.5%/yr) are no higher than the best 20-year FHFA home-price window plus 0.25 pt, or the UI says commercial growth is an assumption with no fetched benchmark | 0 | 0 | PASS informational (weight 0): commercial growth 4.5%; no fetched commercial price index (NCREIF/CBRE blocked) |  |
| L6.4 | Stress-test and totals use the same time base: category strip "lasts" costs are grown to the plan-end month like the income they offset (engine.stress exists and scales fixed costs by the growth factor) | 2 | 2 | PASS E.stress function |  |
| L6.5 | Default business growth (7.5%/yr for 28 yrs) is above the long-run growth of the U.S. economy (~4% nominal); this must be disclosed as an assumption, not a forecast | 2 | 2 | PASS (disclosed, not source-verified) max business growth 9%; glossary compares with economy growth: true |  |
| L7.1 | Income tax estimate (estTaxPct) equals the 2026 single-filer reference: standard deduction $16,100, brackets 10% to 12,400 ... 37% over 640,600, Social Security 6.2% to $184,500, Medicare 1.45% (13 incomes) | 2.5 | 2.5 | PASS all match | S1,S17 |
| L7.2 | Sale tax = max(0, sale price x (1 - selling cost) - original price - improvements) x sales-tax % (checked on 30 random sells) | 1.5 | 1.5 | PASS 0 / 30 disagree |  |
| L7.3 | Default sale-tax 25% sits in the federal range for a sale: 15-20% long-term capital gain + 3.8% NIIT (18.8-23.8%), unrecaptured depreciation up to 25%; text states these, and notes state tax | 1.5 | 1.5 | PASS The tax owed on the profit from a sale. Profit on something held under a year is usually taxed like regular income. Longer-held gains are taxed federally at 15% or 20%, plus 3.8% for high earners, and | S20,S21,S22 |
| L7.4 | Flat tax on portfolio income (default 20%) understates federal rates on large profits (32-37% over ~$200k, + 3.8% NIIT; IRS 2026 brackets): the glossary must say so | 1 | 1 | PASS default 20%; says higher brackets: true | S1,S22 |
| L7.5 | Depreciation (27.5 yrs residential, 39 yrs non-residential; IRS Pub. 946) is not modeled; the UI must say so (it lowers taxable income and creates recapture on sale) | 1 | 1 | PASS depreciation mentioned in both glossary entries: true | S23,S24 |
| L7.6 | Selling-cost defaults (home 6%, commercial 5%, business 8%) are disclosed as typical ranges | 0.5 | 0.5 | PASS (disclosed, not source-verified) Agent or broker fees and closing costs when you sell. Homes are often 5% to 7%. Commercial properties and businesses var |  |
| L8.1 | Business price multiples by size in the default plan: <$1.5M 2.0-3.8x, $1.5-5M 2.5-5.2x, >$5M 3.5-7x of owner profit (bench-business.json: BizBuySell avg ~2.6-2.7x SDE for small deals; larger deals higher; sources unverified, flagged) | 2 | 2 | PASS (disclosed, not source-verified) in band |  |
| L8.2 | Manager cost for businesses you do not run = max(0, businesses held - run yourself) x monthly pay, inflated, only while the business is held and not sold or merged into another (random 30) | 2 | 2 | PASS 0 disagree |  |
| L8.3 | Hours check: weekly hours = job hours (while the job runs) + min(run yourself, businesses held) x hours per business; flagged tight above 70 (random 30) | 2 | 2 | PASS 0 / 30 disagree |  |
| L8.4 | Default plan: 28-year growth of 7.5%/yr per business is disclosed as an optimistic assumption in the UI, and the finance sim does not need outside capital | 1 | 1 | PASS (disclosed, not source-verified) disclosed true, capital rows 0 |  |
| L8.5 | Sell / merge: sale proceeds = value x (1 - selling cost) - balance - liens - line draw; merge lift scales value and income by (1 + lift) from the merge month (random 20) | 1 | 1 | PASS 0 disagree |  |
| L9.1 | Default plan: list order = buy order (owned first, then non-decreasing purchase months), every asset gets a purchase month inside the plan, no unfunded asset | 1.5 | 1.5 | PASS 0,0,0,15,26,28,42,46,56,74,92,110,128,146,164,182,200; verdict yes, lowest liquid cash $63302 |  |
| L9.2 | Combined portfolio total equals the sum of the rows at 12 months across the plan (net worth, value, debt, cash flow, payments) | 1.5 | 1.5 | PASS 0 months disagree |  |
| L9.3 | Funding chain: every credit-line funder closes the target exactly funder-purchase + months-to-line; the target buys at the earliest such month; no cycles | 1.5 | 1.5 | PASS ok |  |
| L9.4 | Cash recycling: sale proceeds go to cash, purchases use cash before outside money; cash never negative; outside draws only for the shortfall (random 25) | 1.5 | 1.5 | PASS 0 / 25 disagree |  |
| L9.5 | Stress test ("lasts"): the ~45% biggest earners fail (rent gone, fixed costs and loan payments still due), everything at plan-end values: re-derived independently on 30 random category sets, including that fixed costs have grown with the asset | 1 | 1 | PASS 0 / 30 disagree |  |
| L10.1 | Glossary numbers agree with sources: FHA 1.75% + 0.55% (HUD), Limited 203(k) $75,000 (ML 2024-13), SBA 7(a) $5M and 504 $5.5M (SBA.gov), DSCR 1.2/1.25 wording, 43% DTI wording | 1.5 | 1.5 | PASS  | S2,S4,S6,S7 |
| L10.2 | The Assumptions page carries a "how the numbers are built" note: nominal dollars, rent and costs grow with value, payments are fixed, DTI excludes own housing, credit lines assume 85% cap, no depreciation, flat tax rates | 1.5 | 1.5 | PASS model-notes block present: true |  |
| L10.3 | Units and bases are stated (net worth definition says it is before selling costs/taxes and excludes personal savings): yearly inputs say "/ yr", monthly say "/ mo"; DTI limit, vacancy, management are percentages of the right base (vacancy and management of rent; repairs of value per year) | 1 | 1 | PASS  |  |
| L10.4 | Preset notes that state a number or rule match LOANS fields (FHA/203(k)/SBA caps, owner-occupancy, interest-only) and the sellerb/sellerc notes say the share seller-financed is partial and negotiable | 1 | 1 | PASS The seller finances part of the price. This preset has the seller carry 80%, which is aggressive; sellers usually carry 10% to 50%. |  |

Checks marked "disclosed, not source-verified" pass on disclosure or a benchmark file whose sources could not be fetched; see sources.md.
