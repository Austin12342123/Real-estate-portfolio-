# Prototype grader report

Target: `prototype/v4`  |  Run: 2026-11-08T21:25:47.631Z  |  74s

## Automated score: **85.00 / 85** (a separate design review adds 15)

| Category | Score |
|---|---|
| A. Requirement / propagation | 18.00 / 18.00 |
| B. Engine correctness | 12.00 / 12.00 |
| C. UX conciseness & usability | 10.00 / 10.00 |
| D. PWA / local-first | 8.00 / 8.00 |
| E. Robustness & accessibility | 7.00 / 7.00 |
| R. Realism & market accuracy | 30.00 / 30.00 |

## All checks

| ID | Check | Pts | Earned | Detail |
|---|---|---|---|---|
| A01 | Add flow: each type x each loan option auto-fills dp/rate/term/closing, opens the asset page, adds a ledger row and changes plan numbers | 2.06 | 2.06 | 3/3 sub-checks pass |
| A02 | Changing an asset's loan option re-populates dp/rate/term/closing and changes the plan numbers | 1.29 | 1.29 | 12/12 sub-checks pass |
| A03 | Edit matrix: every input (43 edits incl. improvements/exit/loan/assumptions) moves the main-page KPIs exactly as the engine says | 3.09 | 3.09 | 44/44 sub-checks pass |
| A04 | Two-way back-solves: wait-months->extra, payoff->extra, down$->%, and main page follows | 1.54 | 1.54 | 8/8 sub-checks pass |
| A05 | Remove from the MAIN page: Edit mode, confirm, Undo, totals update; removing a funding source leaves the target listed | 2.06 | 2.06 | 10/10 sub-checks pass |
| A06 | Main rows are ordered by purchase month (owned first); tags match the engine's purchase months | 0.77 | 0.77 | 4/4 sub-checks pass |
| A07 | No "Today" / "20 years" view toggle anywhere (single portfolio snapshot) | 0.51 | 0.51 | 3/3 sub-checks pass |
| A08 | Homes cannot cash-flow negative: warning on the asset page and on the main page; clears when fixed; not shown for non-homes | 1.29 | 1.29 | 7/7 sub-checks pass |
| A09 | Per-row numbers sum to the portfolio headline (cash flow, monthly payments, net worth) on the sample, and match the engine | 1.54 | 1.54 | 7/7 sub-checks pass |
| A10 | Exit and improvements through the UI: Hold/Sell/Merge buttons and fields propagate to rows, KPIs and breakdown | 1.80 | 1.80 | 8/8 sub-checks pass |
| A11 | Sample portfolio on screen: all rows, three types, sane finite headline, no unfunded warning, no DTI warning | 1.03 | 1.03 | 6/6 sub-checks pass |
| A12 | Credit-line chain on screen: "opens in N mo" and buy months match the engine; raising source extra opens sooner | 1.03 | 1.03 | 3/3 sub-checks pass |
| B01 | P&I for 240k @6.5% 30y = 1516.96 | 0.34 | 0.34 | got 1516.9632563831167 |
| B02 | Scheduled balance after 60 mo = 224666.35 | 0.34 | 0.34 | 2/2 sub-checks pass |
| B03 | Balance after 60 mo with +500 extra = 189329.36 | 0.34 | 0.34 | got 189329.36208686503 |
| B04 | Payoff months with +500 extra = 192 | 0.34 | 0.34 | got 192 (scheduled: 360) |
| B05 | LOC months (D=60k) extra 0/500/1000 = 140/55/34 | 0.68 | 0.68 | 3/3 sub-checks pass |
| B06 | extraFor 24 mo = 1543.87, 36 mo = 918.49 | 0.68 | 0.68 | 3/3 sub-checks pass |
| B07 | Growth 3%: LOC months extra 0/500 = 50/32 (growth on asset, or g.appr with growth null) | 0.51 | 0.51 | 4/4 sub-checks pass |
| B08 | More extra never delays LOC (monotone, 0..3000 step 50) | 0.34 | 0.34 | 2/2 sub-checks pass |
| B09 | Purchase order respects chain (A->B->C->D, LOC month additive) | 0.51 | 0.51 | 5/5 sub-checks pass |
| B10 | No NaN/Infinity leaks in plan series & KPIs (23 edge scenarios) | 0.68 | 0.68 | 23/23 sub-checks pass |
| B11 | Funding cycles (A<->B, A->A, 3-cycle) do not hang or throw | 0.34 | 0.34 | ok Infinity,Infinity/0/0,49,98/49,0 |
| B12 | Net worth at t=0 = sum(value - balance - liens) of assets held at t=0 | 0.34 | 0.34 | 2/2 sub-checks pass |
| B13 | plan() under 100ms for the sample and 10-asset chain (median of 7) | 0.17 | 0.17 | median 0.9ms |
| B14 | locMonths matches independent month-by-month simulation (60 random scenarios incl. liens/haircut/appr/paid) | 0.51 | 0.51 | exact 60/60, within1 60/60  |
| B15 | Debt cap: every credit-line funder stays within cap (loan + liens + drawn LOC) when its target closes | 0.51 | 0.51 | 3/3 sub-checks pass |
| B16 | Loan options: 13 options, per-type lists, applyLoan fills dp/rate/term/io/closing; payment follows | 0.68 | 0.68 | 5/5 sub-checks pass |
| B17 | Improvements raise value/income only after capexMonths; capex is paid from cash/outside money | 0.68 | 0.68 | 4/4 sub-checks pass |
| B18 | Sale: proceeds = value*(1-cost) - balance - liens - LOC; asset and its cash flow vanish; cash counts in net worth | 1.01 | 1.01 | 6/6 sub-checks pass |
| B19 | Sale cash funds a later purchase before outside cash; outside cash only for the shortfall | 0.68 | 0.68 | 5/5 sub-checks pass |
| B20 | Merge applies exitLift to value and income at exitMonth; asset stays held | 0.51 | 0.51 | 3/3 sub-checks pass |
| B21 | Interest-only loan: balance stays flat, payment = interest; extra payments reduce it | 0.51 | 0.51 | 3/3 sub-checks pass |
| B22 | Portfolio rule: per-asset shares (snap/assetsAt) sum exactly to series nw/cf/monthly/debt/value at many months | 0.68 | 0.68 | 6/6 sub-checks pass |
| B23 | Sample portfolio: finite plan, none unfunded, DTI peak below limit, homes cash-flow positive, 20-year numbers sane | 0.68 | 0.68 | 7/7 sub-checks pass |
| C01 | At 390x844: summary KPIs, plan headline and the first ledger rows are visible without scrolling | 1.33 | 1.33 | 3/3 sub-checks pass |
| C02 | Main page has only the per-row extra fields as text inputs (one per asset) | 1.00 | 1.00 | 2/2 sub-checks pass |
| C03 | No horizontal overflow at 320/390/430 on main, asset, assumptions, add, import | 1.33 | 1.33 | 15/15 sub-checks pass |
| C04 | Tap targets >= 44x44 (buttons, selects, inputs; label counts for inputs) | 1.33 | 1.33 | 119/119 targets >=44px. Small:  |
| C05 | All inputs/selects use font-size >= 16px (no iOS zoom) | 0.67 | 0.67 | 68/68 ok  |
| C06 | Asset page reachable in 1 tap, back in 1 tap; adding an asset takes <= 3 taps | 1.33 | 1.33 | 3/3 sub-checks pass |
| C07 | Main page stays compact: <= 150px per ledger row (sample), plan below the ledger | 0.67 | 0.67 | avg row 133px x 14, page 3037px |
| C08 | Text contrast >= 4.5:1 in light and dark mode (main, chart, asset, assumptions, add) | 1.33 | 1.33 | 805/805 text elements pass (light 399/399, dark 406/406).  |
| C09 | Summary-first: one concise summary card (single snapshot, short text), plan card collapsible | 1.00 | 1.00 | 3/3 sub-checks pass |
| D01 | Manifest valid; icons load with true declared dimensions | 1.14 | 1.14 | 8/8 sub-checks pass |
| D02 | Service worker (index.html) registers, activates, controls page after reload; precache complete | 1.14 | 1.14 | 3/3 sub-checks pass |
| D03 | Works offline: reload, deep-link, and edit with network off | 1.52 | 1.52 | 4/4 sub-checks pass |
| D04 | Zero external (non-localhost) network requests across every flow | 0.76 | 0.76 | 710 requests, 0 external  |
| D05 | Data persists across reload and new tab (localStorage rep-v4, v7); no server round-trip | 1.14 | 1.14 | 5/5 sub-checks pass |
| D06 | Backup: Show backup gives valid JSON text; pasted text and file restore state (with confirm); invalid text rejected without damage | 1.52 | 1.52 | 6/6 sub-checks pass |
| D07 | iOS install meta: apple-touch-icon loads, viewport-fit=cover, apple-mobile-web-app-capable, theme-color | 0.38 | 0.38 | 4/4 sub-checks pass |
| D08 | navigator.storage.persist() requested on load | 0.38 | 0.38 | persist() calls: 1 |
| E01 | Edge inputs (60 cases + compound: zero, 100% down, blanks, garbage, negatives, 1e12, caps, sale/merge/improvement fields) leave no NaN/Infinity/undefined in any page or crash | 1.91 | 1.91 | 65/65 sub-checks pass |
| E02 | Remove all assets (main page) -> clean empty state with add action; can add again | 0.96 | 0.96 | 3/3 sub-checks pass |
| E03 | Deleting a funding target clears references (select, storage, plan, merge-into) | 0.96 | 0.96 | 5/5 sub-checks pass |
| E04 | Every input/select/button has an accessible name (main, asset, assumptions, add, import) | 0.64 | 0.64 | 189/189 named. unnamed:  |
| E05 | Typing 5 digits sequentially keeps focus + full value (re-render safe) on main, asset, assumptions, text field | 0.64 | 0.64 | 5/5 sub-checks pass |
| E06 | No layout shift while navigating and editing (CLS <= 0.05) | 0.32 | 0.32 | CLS 0.0000 |
| E07 | No console errors or page errors during all flows | 0.96 | 0.96 | 0 errors:  |
| E08 | No render storm: DOM settles when an input is focused (no endless re-render loop) | 0.64 | 0.64 | 4/4 sub-checks pass |
| R01 | [verified] Loan-option rates are consistent with Freddie Mac PMMS (30-yr 7.18%, 15-yr 6.57%) | 3.50 | 3.50 | 4/4 sub-checks pass |
| R02 | [verified] SBA program limits: 7(a) max $5M, 504 debenture max $5.5M; 7(a) rate under Prime+3% | 3.00 | 3.00 | 4/4 sub-checks pass |
| R03 | [secondary] Every financed commercial property and business meets a lender DSCR minimum at purchase | 3.50 | 3.50 | 6/6 sub-checks pass |
| R04 | [secondary] Business prices are realistic multiples of yearly owner profit (BizBuySell ~2.6-2.7x SDE; GF Data ~6-7x EBITDA at $10M+) | 3.50 | 3.50 | 3/3 sub-checks pass |
| R05 | [secondary+judgment] Commercial cap rates are in a plausible band for the property type in secondary markets | 2.50 | 2.50 | 3/3 sub-checks pass |
| R06 | [secondary] Leverage and loan type fit the asset (LTV, minimum down payments, FHA only if you live there) | 2.00 | 2.00 | 7/7 sub-checks pass |
| R07 | [judgment] Projected net worth does not depend on growth above realistic ceilings (homes 4.5%, commercial 5.5%, businesses 12% a year) | 4.00 | 4.00 | projected $17.6M vs $17.6M at realistic growth = 100%. Above ceiling: none |
| R08 | [secondary] Flips and improvements have believable economics (ATTOM: ~21.5% gross margin on flips); lifts are bounded | 1.50 | 1.50 | 5/5 sub-checks pass |
| R09 | [secondary] Selling and closing costs match market norms (agent 5-7%, commercial broker 2-6%, business broker ~Double Lehman, closing 1.5-5%) | 2.50 | 2.50 | 18/18 sub-checks pass |
| R10 | [secondary+judgment] Financing capacity: each loan fits lender net-worth rules, outside cash stays small, deal pace is executable | 4.00 | 4.00 | 7/7 sub-checks pass |

## Top failures

None.
