# Prototype grader report

Target: `prototype/v4`  |  Run: 2026-11-14T19:42:53.454Z  |  224s

## Automated score: **85.00 / 85.00000000000001** (a separate design review adds 15)

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
| A01 | Add flow: each type x each loan option auto-fills dp/rate/term/closing, opens the asset page, adds a ledger row and changes plan numbers | 0.96 | 0.96 | 3/3 sub-checks pass |
| A02 | Changing an asset's loan option re-populates dp/rate/term/closing and changes the plan numbers | 0.60 | 0.60 | 12/12 sub-checks pass |
| A03 | Edit matrix: every input (43 edits incl. improvements/exit/loan/assumptions) moves the main-page KPIs exactly as the engine says | 1.44 | 1.44 | 44/44 sub-checks pass |
| A04 | Two-way back-solves: payoff->extra, down$->%, and main page follows | 0.72 | 0.72 | 6/6 sub-checks pass |
| A05 | Remove from the MAIN page: Edit mode, confirm, Undo, totals update; removing a funding source leaves the target listed | 0.96 | 0.96 | 10/10 sub-checks pass |
| A06 | Main rows follow list order = buy order (sorted once on first load, owned first); each row carries its buy number; no row says owned or planned; the first asset in the list has no wait line and every later one has | 0.36 | 0.36 | 6/6 sub-checks pass |
| A07 | No "Today" / "20 years" view toggle anywhere (single portfolio snapshot) | 0.24 | 0.24 | 3/3 sub-checks pass |
| A08 | Homes cannot cash-flow negative: warning on the asset page and on the main page; clears when fixed; not shown for non-homes | 0.60 | 0.60 | 7/7 sub-checks pass |
| A09 | Per-row numbers sum to the portfolio headline (cash flow, monthly payments, net worth) on the sample, and match the engine | 0.72 | 0.72 | 7/7 sub-checks pass |
| A10 | Exit and improvements through the UI: Hold/Sell/Merge buttons and fields propagate to rows, KPIs and breakdown | 0.84 | 0.84 | 8/8 sub-checks pass |
| A11 | Sample portfolio on screen: all rows, three types, sane finite headline, no unfunded warning, no DTI warning | 0.48 | 0.48 | 6/6 sub-checks pass |
| A12 | Trust funding on screen: every row after the first shows "Funded in N mo by the trust: cash flow $X/mo + borrowing room $Y) · pool of K assets", the numbers match the engine; raising an earlier asset's extra opens later purchases sooner | 0.48 | 0.48 | 3/3 sub-checks pass |
| A13 | FHA 203(k) through the UI: add flow auto-fills rehab + terms, owner-occupied notice, financed-rehab note, Limited cap warning, switching loan option resets | 0.48 | 0.48 | 11/11 sub-checks pass |
| A21 | Main screen: always-visible tab bar Planned | Real | Saved (even when Real is empty), exactly one page at a time, tabs >= 44px at 320/390/430 with no sideways scroll, swipe or tap, page remembered while you move around | 0.72 | 0.72 | 7/7 sub-checks pass |
| A22 | Planned and Real hold the right rows: Planned = planned assets with the plan totals, Real = bought assets only; each page total equals the sum of its rows (and the engine) | 0.72 | 0.72 | 7/7 sub-checks pass |
| A23 | Setting "Open the app on" (Planned default / Real / Saved) on the Assumptions page with an (i); it survives reload; the app opens on the chosen page | 0.48 | 0.48 | 4/4 sub-checks pass |
| A24 | Saved portfolios: Save current portfolio (name field, default "Portfolio n", confirm), the card shows name, date, assets, net worth and cash flow from the engine; Open replaces the working portfolio with exactly the saved numbers and Undo brings the previous one back | 0.96 | 0.96 | 13/13 sub-checks pass |
| A25 | Saved portfolios: Rename, Duplicate and Delete (confirm; Cancel keeps it) work, persist after reload, and the empty state returns when the last one is deleted | 0.60 | 0.60 | 7/7 sub-checks pass |
| A26 | Backup includes the saved portfolios and the start-page choice; Restore brings them back (also after the storage was wiped) | 0.60 | 0.60 | 5/5 sub-checks pass |
| A27 | Default plan on screen: in TODAY'S dollars net worth at least $125.0M (up to about $135M) and cash flow at least $1.3M a month at year 28 (the future-dollar amounts, at the cost-increase rate, shown smaller), in one clear plan line and in the KPIs | 0.48 | 0.48 | 4/4 sub-checks pass |
| A28 | Saving survives a full or blocked storage: a clear message, no crash, the list is unchanged | 0.24 | 0.24 | 2/2 sub-checks pass |
| A29 | Each page's totals are unique to it: with 2 bought and 4 planned assets, Planned totals = sum of the planned rows (never the bought ones), Real totals = sum of the bought rows, the two differ, and together they equal the whole plan | 0.72 | 0.72 | 9/9 sub-checks pass |
| A30 | Opening an old save (v9-v18): no pop-up or Undo banner, the working portfolio is the current default plan (net worth >= $125M in today's dollars), and the old portfolio sits in Saved as "Portfolio N (before the update)" and loads back exactly | 0.48 | 0.48 | 4/4 sub-checks pass |
| A31 | Today's dollars on screen: with 5% cost increase and a sold asset, the Planned top card, category strips, breakdown and every row show the engine's future-dollar figure divided by 1.05^(months/12) (28 years at the plan end), the smaller line shows the future-dollar figure, and the Saved card follows the same rule | 0.72 | 0.72 | 9/9 sub-checks pass |
| A32 | Show figures in: Assumptions has Today's dollars | Future dollars with an (i), default Today's, tap targets >= 44px; switching shows the engine's future-dollar figures on the Planned and Real top cards and the breakdown; the choice persists in the UI storage and after a reload; nothing in the portfolio data changes | 0.72 | 0.72 | 11/11 sub-checks pass |
| A33 | Prices stay today's prices: every planned asset's price on screen is the entered price (nothing is inflated), the cash a purchase needs is its down payment + closing + improvements on that price whatever month it is bought, and the glossary says so | 0.48 | 0.48 | 5/5 sub-checks pass |
| A34 | An older default plan (v18) opens silently on the new default: no pop-up or Undo banner, the working portfolio is the new plan, the old portfolio is filed in Saved as "Portfolio N (before the update)" and loads back exactly; the unit choice is not touched | 0.24 | 0.24 | 3/3 sub-checks pass |
| A35 | A release never overwrites or resurrects the user's own portfolio (v19 -> v20 keeps it, S.added bookkeeping): empty stays empty, own assets kept with no second Lost Creek, missing S.added adds nothing, a new ADDITIONS entry lands once as the LAST planned asset and never returns after removal, Undo / Saved / backup keep S.added, v<=18 still switch with the "before the update" entry, new default plan targets hold | 0.96 | 0.96 | 19/19 sub-checks pass |
| B01 | P&I for 240k @6.5% 30y = 1516.96 | 0.32 | 0.32 | got 1516.9632563831167 |
| B02 | Scheduled balance after 60 mo = 224666.35 | 0.32 | 0.32 | 2/2 sub-checks pass |
| B03 | Balance after 60 mo with +500 extra = 189329.36 | 0.32 | 0.32 | got 189329.3620868643 |
| B04 | Payoff months with +500 extra = 192 | 0.32 | 0.32 | got 192 (scheduled: 360) |
| B05 | LOC months (D=60k) extra 0/500/1000 = 140/55/34 | 0.64 | 0.64 | 3/3 sub-checks pass |
| B06 | extraFor 24 mo = 1543.87, 36 mo = 918.49 | 0.64 | 0.64 | 3/3 sub-checks pass |
| B07 | Growth 3%: LOC months extra 0/500 = 48/32 (growth on asset, or g.appr with growth null; the home's saved cash flow grows with its rent, so it starts saving once rent growth passes the payment) | 0.48 | 0.48 | 4/4 sub-checks pass |
| B08 | More extra never delays LOC (monotone, 0..3000 step 50) | 0.32 | 0.32 | 2/2 sub-checks pass |
| B09 | Purchase order follows the list (A, B, C, D): the trust buys each when the pool of everything before it can pay; months never go backwards; later purchases wait for earlier ones; liens on an earlier asset delay the later ones | 0.48 | 0.48 | 5/5 sub-checks pass |
| B10 | No NaN/Infinity leaks in plan series & KPIs (23 edge scenarios) | 0.64 | 0.64 | 23/23 sub-checks pass |
| B11 | Funding cycles (A<->B, A->A, 3-cycle) do not hang or throw | 0.32 | 0.32 | ok 0,49/0/0,49,72/49,0 |
| B12 | Net worth at t=0 = sum(value - balance - liens) of assets held at t=0 | 0.32 | 0.32 | 2/2 sub-checks pass |
| B13 | plan() under 100ms for the sample and 10-asset chain (median of 7) | 0.16 | 0.16 | median 16.5ms |
| B14 | locMonths matches independent month-by-month simulation (60 random scenarios incl. liens/haircut/appr/paid) | 0.48 | 0.48 | exact 60/60, within1 60/60  |
| B15 | Debt cap: the trust never draws more than its pool room (cap% of each asset's value less its loan and liens), at every purchase and every month | 0.48 | 0.48 | 4/4 sub-checks pass |
| B16 | Loan options: every option listed, per-type lists, applyLoan fills dp/rate/term/io/closing; payment follows | 0.64 | 0.64 | 5/5 sub-checks pass |
| B17 | Improvements raise value/income only after capexMonths; capex is paid from cash/outside money | 0.64 | 0.64 | 6/6 sub-checks pass |
| B18 | Sale: proceeds = value*(1-cost) - balance - liens - LOC; asset and its cash flow vanish; cash counts in net worth | 0.96 | 0.96 | 6/6 sub-checks pass |
| B19 | Sale cash stays in the trust and funds a later purchase before any borrowing; outside cash only for a true shortfall | 0.64 | 0.64 | 5/5 sub-checks pass |
| B20 | Merge applies exitLift to value and income at exitMonth; asset stays held | 0.48 | 0.48 | 3/3 sub-checks pass |
| B21 | Interest-only loan: balance stays flat, payment = interest; extra payments reduce it | 0.48 | 0.48 | 3/3 sub-checks pass |
| B22 | Portfolio rule: per-asset shares (snap/assetsAt) sum exactly to series nw/cf/monthly/debt/value at many months | 0.64 | 0.64 | 6/6 sub-checks pass |
| B23 | Sample portfolio: finite plan, none unfunded, DTI peak below limit, homes cash-flow positive, 20-year numbers sane | 0.64 | 0.64 | 7/7 sub-checks pass |
| B24 | FHA 203(k): rehab is financed in the loan (down payment on price + rehab), upfront MIP financed, monthly MIP in cash flow, owner-occupied flag, closing cash excludes rehab | 0.64 | 0.64 | 8/8 sub-checks pass |
| C01 | At 390x844: summary KPIs, plan headline and the first ledger rows are visible without scrolling | 1.33 | 1.33 | 3/3 sub-checks pass |
| C02 | Main page keeps text inputs out of the list: no inputs until a row is selected, then exactly one extra field (none for a sold row) | 1.00 | 1.00 | 5/5 sub-checks pass |
| C03 | No horizontal overflow at 320/390/430 on main, asset, assumptions, add, import | 1.33 | 1.33 | 15/15 sub-checks pass |
| C04 | Tap targets >= 44x44 (buttons, selects, inputs; label counts for inputs) | 1.33 | 1.33 | 254/254 targets >=44px. Small:  |
| C05 | All inputs/selects use font-size >= 16px (no iOS zoom) | 0.67 | 0.67 | 43/43 ok  |
| C06 | Asset page reachable in 1 tap, back in 1 tap; adding an asset takes <= 3 taps | 1.33 | 1.33 | 3/3 sub-checks pass |
| C07 | Main page stays compact: <= 150px per ledger row (sample), plan below the ledger | 0.67 | 0.67 | avg row 139px x 36, page 8648px |
| C08 | Text contrast >= 4.5:1 in light and dark mode (main, chart, asset, assumptions, add) | 1.33 | 1.33 | 2191/2191 text elements pass (light 1093/1093, dark 1098/1098).  |
| C09 | Summary-first: one concise summary card (single snapshot, short text), plan card collapsible | 1.00 | 1.00 | 3/3 sub-checks pass |
| D01 | Manifest valid; icons load with true declared dimensions | 1.14 | 1.14 | 8/8 sub-checks pass |
| D02 | Service worker (index.html) registers, activates, controls page after reload; precache complete | 1.14 | 1.14 | 3/3 sub-checks pass |
| D03 | Works offline: reload, deep-link, and edit with network off | 1.52 | 1.52 | 4/4 sub-checks pass |
| D04 | Zero external (non-localhost) network requests across every flow | 0.76 | 0.76 | 1231 requests, 0 external  |
| D05 | Data persists across reload and new tab (localStorage rep-v4, v7); no server round-trip | 1.14 | 1.14 | 5/5 sub-checks pass |
| D06 | Backup: Show backup gives valid JSON text; pasted text and file restore state (with confirm); invalid text rejected without damage | 1.52 | 1.52 | 6/6 sub-checks pass |
| D07 | iOS install meta: apple-touch-icon loads, viewport-fit=cover, apple-mobile-web-app-capable, theme-color | 0.38 | 0.38 | 4/4 sub-checks pass |
| D08 | navigator.storage.persist() requested on load | 0.38 | 0.38 | persist() calls: 1 |
| E01 | Edge inputs (59 cases + compound: zero, 100% down, blanks, garbage, negatives, 1e12, caps, sale/merge/improvement fields) leave no NaN/Infinity/undefined in any page or crash | 1.91 | 1.91 | 64/64 sub-checks pass |
| E02 | Remove all assets (main page) -> clean empty state with add action; can add again | 0.96 | 0.96 | 3/3 sub-checks pass |
| E03 | Deleting a funding target clears references (select, storage, plan, merge-into) | 0.96 | 0.96 | 5/5 sub-checks pass |
| E04 | Every input/select/button has an accessible name (main, asset, assumptions, add, import) | 0.64 | 0.64 | 381/381 named. unnamed:  |
| E05 | Typing 5 digits sequentially keeps focus + full value (re-render safe) on main, asset, assumptions, text field | 0.64 | 0.64 | 5/5 sub-checks pass |
| E06 | No layout shift while navigating and editing (CLS <= 0.05) | 0.32 | 0.32 | CLS 0.0000 |
| E07 | No console errors or page errors during all flows | 0.96 | 0.96 | 0 errors:  |
| E08 | No render storm: DOM settles when an input is focused (no endless re-render loop) | 0.64 | 0.64 | 4/4 sub-checks pass |
| R01 | [verified] Loan-option rates are consistent with Freddie Mac PMMS (30-yr 7.18%, 15-yr 6.57%) | 3.50 | 3.50 | 5/5 sub-checks pass |
| R02 | [verified] SBA program limits: 7(a) max $5M, 504 debenture max $5.5M; 7(a) rate under Prime+3% | 3.00 | 3.00 | 4/4 sub-checks pass |
| R03 | [secondary] Every financed commercial property and business meets a lender DSCR minimum at purchase | 3.50 | 3.50 | 6/6 sub-checks pass |
| R04 | [secondary] Business prices are realistic multiples of yearly owner profit (BizBuySell ~2.6-2.7x SDE; GF Data ~6-7x EBITDA at $10M+) | 3.50 | 3.50 | 3/3 sub-checks pass |
| R05 | [secondary+judgment] Commercial cap rates are in a plausible band for the property type in secondary markets | 2.50 | 2.50 | 3/3 sub-checks pass |
| R06 | [secondary] Leverage and loan type fit the asset (LTV, minimum down payments, FHA only if you live there) | 2.00 | 2.00 | 7/7 sub-checks pass |
| R07 | [judgment] Projected net worth does not depend on growth above realistic ceilings (homes 4.5%, commercial 5.5%, businesses 12% a year) | 4.00 | 4.00 | projected $21.6M vs $21.6M at realistic growth = 100%. Above ceiling: none |
| R08 | [secondary] Flips and improvements have believable economics (ATTOM: ~21.5% gross margin on flips); lifts are bounded | 1.50 | 1.50 | 5/5 sub-checks pass |
| R09 | [secondary] Selling and closing costs match market norms (agent 5-7%, commercial broker 2-6%, business broker ~Double Lehman, closing 1.5-5%) | 2.50 | 2.50 | 18/18 sub-checks pass |
| R10 | [secondary+judgment] Financing capacity: each loan fits lender net-worth rules, outside cash stays small, deal pace is executable | 4.00 | 4.00 | 7/7 sub-checks pass |

## Top failures

None.
