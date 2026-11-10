# Sources used by the logic grader (L1-L10)

Access date for every entry: **2026-11-10**. Fetched with `curl` through the session proxy (the WebFetch tool could not resolve DNS in this session). "Read" means the page text or file was downloaded and the quoted fact was found in it. Raw downloads were kept outside the repo.
Nothing here was copied from memory: where a number comes only from a search-result snippet or my own knowledge it is listed under "Not verified".

## A. Fetched and read, fact used (28; S19 withdrawn)

| ID | Source (URL) | Exact fact / formula used | Used by |
|---|---|---|---|
| S1 | IRS, 2026 tax inflation adjustments (irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2026-including-amendments-from-the-one-big-beautiful-bill) | 2026 standard deduction $16,100 single ($15,750 for 2025). 2026 single brackets: 10% to $12,400; 12% over $12,400; 22% over $50,400; 24% over $105,700; 32% over $201,775; 35% over $256,225; 37% over $640,600 | L7.1, L7.4 |
| S2 | SBA, 7(a) loans (sba.gov/funding-programs/loans/7a-loans) | Maximum 7(a) loan $5,000,000; use includes change of ownership (business acquisition); Express: max $5M, 60-month maturity | L4.7, L5 |
| S3 | SBA, program comparison / terms (sba.gov/partners/lenders/7a-loan-program/terms-conditions-eligibility) | 7(a): up to $5M, maturity 10 years or less (25 years incl. extensions for real estate), rate negotiated within SBA maximums; Express/WCP maximum rate = base + 3.0% for loans over $350,000 (base + 4.5% $250-350k, + 6.0% $50-250k); CDC/504: $25,000 to $5.5M, 25 years real estate, 10 years equipment | L5, L4.7 |
| S4 | SBA, 504 loans (sba.gov/funding-programs/loans/504-loans) | Maximum 504 loan $5.5M; maturities 10, 20, 25 years; rate pegged above the 10-year Treasury; fees about 3% of the debenture, may be financed | L5.sba504, L10.1 |
| S5 | eCFR, 12 CFR part 365 Appendix A (FDIC interagency real-estate lending guidelines) (ecfr.gov API render) | Supervisory loan-to-value limits: raw land 65%, land development 75%, construction 80-85%, **improved property 85%** (improved property includes 1-4 family that is not owner-occupied). No limit set for owner-occupied 1-4 family | L3.4, L4.7 |
| S6 | HUD Mortgagee Letter 2024-13 (hud.gov/sites/dfiles/OCHCO/documents/2024-13hsgml.pdf) | Limited 203(k) total rehabilitation cost may not exceed **$75,000** (raised from $35,000), no minimum, no consultant required | L1.6, L1.9, L5.k203 |
| S7 | HUD Mortgagee Letter 2023-05 (hud.gov/sites/dfiles/OCHCO/documents/2023-05hsgml.pdf) | Annual MIP, term > 15 yrs, base loan <= $726,200: LTV > 95% = **55 bps** for the mortgage term; 90-95% = 50 bps; <= 90% = 50 bps for 11 years | L1.6, L1.9, L5.fha |
| S8 | HUD Handbook 4000.1 PDF (hud.gov/sites/dfiles/OCHCO/documents/4000.1hsgh.pdf), the copy at that URL is the 08/14/2019 revision | Upfront MIP **175 bps** of the base loan, financed. Annual MIP is "payable monthly". The same copy still shows Limited 203(k) at $35,000 and 85 bps annual MIP; both are **superseded** by S6 and S7 (a stale copy, not used for those two numbers) | L1.9 |
| S9 | HUD, 203(k) program comparison fact sheet (hud.gov/sites/dfiles/SFH/documents/MO_203k_Program_Comparison_FS.pdf) | Limited 203(k) rehab cap $75,000; non-structural repairs; nine months to complete (Standard: 12) | L5.k203 |
| S10 | CFPB, What is a qualified mortgage (consumerfinance.gov/ask-cfpb/what-is-a-qualified-mortgage-en-1789/) | General QM includes a price-based (APR threshold) test; lender must consider either debt-to-income or residual income (page states no 43% figure) | L4.2 |
| S11 | CFPB, What is a debt-to-income ratio (consumerfinance.gov/ask-cfpb/what-is-a-debt-to-income-ratio-...) | DTI = all monthly debt payments divided by gross monthly income | L4.1, L4.2 |
| S12 | CFPB / eCFR text of Regulation Z 1026.43 (Ability to repay) (consumerfinance.gov/rules-policy/regulations/1026/43/) | Lender must consider monthly debt-to-income ratio or residual income; no 43% rule in the text | L4.1, L4.2 |
| S13 | Freddie Mac PMMS (freddiemac.com/pmms) | As of 11/05/2026: 30-yr fixed **7.18%**, 15-yr fixed **6.57%**; year ago 6.22% | L5 rate bands |
| S14 | Federal Reserve, H.15 selected interest rates (federalreserve.gov/releases/h15/) | Bank prime loan rate **7.00%**; discount window primary credit 4.00% | L5 (SBA cap = prime + 3.0 = 10.00%) |
| S15 | Freddie Mac PMMS history CSV (freddiemac.com/pmms/docs/PMMS_history.csv) | 30-yr average 7.68% since 1971 (n=2,902 weeks), 5.25% since 2000; last 7.18% (11/5/2026) | L5 context |
| S16 | Census Bureau, HVS Table 1 rental vacancy (census.gov/housing/hvs/data/histtab1.xlsx) | US rental vacancy: 2025 avg 7.1%, 2026 YTD 7.4%, 2000-2025 avg 8.2% | L2.4 |
| S17 | IRS Publication 15 (2026) (irs.gov/publications/p15) | 2026 Social Security wage base **$184,500**; employee 6.2%; Medicare 1.45%, no wage cap; Additional Medicare 0.9% over $200,000 | L7.1 |
| S18 | Census Bureau, HVS Table 3 vacancy by units in structure (census.gov/housing/hvs/data/histtab3.xlsx) | 1-unit rental vacancy 2025: 6.3/5.5/6.1/6.0%; 2026 Q1 6.1%, Q2 5.7%; 5+ units about 8-9% | L2.4 |
| S19 | (withdrawn: the Census rates.html page was fetched but held no vacancy text I could quote) | n/a | n/a |
| S20 | IRS Topic 409 Capital gains (irs.gov/taxtopics/tc409) | Net capital gain rate 0/15/20%; unrecaptured section 1250 gain taxed at max **25%**; 15% band up to $533,400 single (2025) | L7.3 |
| S21 | IRS Topic 559 Net investment income tax (irs.gov/taxtopics/tc559) | NIIT **3.8%** on net investment income above thresholds | L7.3 |
| S22 | IRS Topic 751 Social Security and Medicare withholding (irs.gov/taxtopics/tc751) | 6.2% + 6.2% Social Security, 1.45% + 1.45% Medicare | L7.1 |
| S23 | IRS Publication 946 (irs.gov/publications/p946) | Residential rental property **27.5 years**, nonresidential real property **39 years** (MACRS) | L7.5 |
| S24 | IRS Publication 527 and Topic 415 (irs.gov/publications/p527, irs.gov/taxtopics/tc415) | Rental expenses incl. mortgage interest, taxes, maintenance, insurance, depreciation reduce taxable rental income | L7.5 |
| S25 | IRS Rev. Proc. 2025-32 (irs.gov/pub/irs-drop/rp-25-32.pdf) | Tax-year 2026 table: standard deduction single $16,100; 37% over $640,600 (the single-filer bracket table) | L7.1 |
| S26 | IRS Publication 544 (irs.gov/publications/p544) | Gain from sale of depreciable real property: depreciation recapture / unrecaptured section 1250 gain rules | L7.3 |
| S27 | eCFR, 24 CFR 203.284 (HUD premiums; ecfr.gov API render) | Annual premium is a percent of the **remaining insured principal balance excluding the portion attributable to the up-front premium**; "average outstanding principal obligation ... for a 12-month period" | L1.7 |
| S28 | FHFA, House Price Index master file, purchase-only US, monthly (fhfa.gov/hpi/download/monthly/hpi_master.csv, 17 MB) | Computed here: 1991-01 to 2026-08 compound growth **4.32%/yr**; 2000-2025 4.59%; 20-year rolling windows min 2.75%, median 3.56%, max 4.38% (16 windows); worst 12 months -10.6% (Nov 2007), best +18.9% (Jul 2020) | L6.3 |
| S29 | NY Fed Household Debt and Credit report (newyorkfed.org/microeconomics/hhdc/background.html) | Q2 2026: mortgage balances $13.1T, home-equity line balances $459B | context for credit-line scale |

## B. Fetched, no usable audit number found (counted as not used)

Page loaded but was a landing or JavaScript page, or held nothing the model needs: FHFA HPI page and conforming-loan-limit pages, Freddie Mac research/forecast/HPI pages, Federal Reserve SCF, Z.1, SLOOS, H.8, Financial Stability Report, Beige Book, FOMC calendar, NY Fed SCE, Census HVS index / AHS / new-residential pages, FDIC quarterly banking profile and examination manual index, CFPB LTV / HMDA / owning-a-home pages, HUD FHA info page, SBA buy-a-business / size standards / microloans / loans index, IRS Topics 414, 554, 703 and Publications 523, 535, 551, 925, Form 8949 instructions. About 40 pages in total. They do **not** count toward the source tally above.

## C. Not reachable (reported honestly, not bypassed)

- SSA wage-base page (ssa.gov/oact/cola/cbb.html): HTTP 403 bot block. The 2026 wage base was taken from IRS Pub. 15 (S17) instead.
- BLS CPI / rent index pages (bls.gov): HTTP 403. No CPI or shelter-index numbers were verified.
- BizBuySell, LoopNet, Crexi, CBRE: HTTP 403, not bypassed (as instructed).
- FRED (CPI, Case-Shiller, rent index, prime, GDP series) and GF Data: connection failed repeatedly (empty reply). Case-Shiller, CPI, shelter inflation and nominal GDP growth are therefore **not verified**; the FHFA index (S28) was used for housing appreciation.
- Fannie Mae Selling Guide / eligibility matrix, Freddie Mac Guide: the pages returned 404 or 403. Rental-income 75% rule and investment-property LTV limits for conventional loans are **not verified** from Fannie/Freddie (S5 supplies the 85% regulatory ceiling instead).
- SBA SOP 50 10 (current and 5(F) notices): not retrievable (404 / refused). The 1.15 minimum DSCR used in L4.4 comes from a **search-result snippet** of an SBA procedural notice (SOP 50 10 5(F): "debt service coverage ratio ... must be equal to or greater than 1.15" for loans over $350,000), not from a page I read.
- Pepperdine Private Capital Markets Report, IBISWorld, DealStats, JPMorgan/Morningstar long-run return studies, NAR, Zillow Research, RealPage/Yardi/CoStar, NCREIF/Green Street/JLL/Cushman, NAIC/III, Tax Foundation, California Prop 13 pages, academic papers (SSRN/NBER): hosts not on the session's network allow-list, or no usable fetch. **Not verified.**

## D. Numbers taken from search-result snippets or prior grader notes (NOT counted as sources)

- Cap-rate and business-multiple benchmarks: grader/benchmarks/bench-cre.json and bench-business.json carry their own caveat that BizBuySell/CBRE/LoopNet/Crexi were blocked and values are secondary snippets (CBRE H1 2026 median cap ~6.6%; BizBuySell average cash-flow multiple ~2.6-2.7x). L2.7 and L8.1 pass on those bands and are flagged "disclosed, not source-verified".
- FHA annual MIP 0.55% was also supported by search snippets; the fetched HUD ML 2023-05 (S7) is the source.

## Honest tally

28 distinct sources fetched, read and used for a stated fact; about 40 more pages fetched with nothing usable; about 25 requested sources unreachable (blocked, refused, or not retrievable). The mission target of 40 distinct sources actually read **was not reached**; the shortfall is almost entirely the network allow-list and bot blocks listed in section C.
