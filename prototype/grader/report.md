# Prototype grader report

Target: `prototype/v4`  |  Run: 2026-11-17T01:34:25.441Z  |  1140s

## Automated score: **85.01 / 85.006** (a separate design review adds 15)

| Category | Score |
|---|---|
| A. Requirement / propagation | 18.01 / 18.01 |
| B. Engine correctness | 12.00 / 12.00 |
| C. UX conciseness & usability | 10.00 / 10.00 |
| D. PWA / local-first | 8.00 / 8.00 |
| E. Robustness & accessibility | 7.00 / 7.00 |
| R. Realism & market accuracy | 30.00 / 30.00 |

## All checks

| ID | Check | Pts | Earned | Detail |
|---|---|---|---|---|
| A01 | Add flow: each type x each loan option auto-fills dp/rate/term/closing, opens the asset page, adds a ledger row and changes plan numbers | 0.62 | 0.62 | 3/3 sub-checks pass |
| A02 | Changing an asset's loan option re-populates dp/rate/term/closing and changes the plan numbers | 0.39 | 0.39 | 12/12 sub-checks pass |
| A03 | Edit matrix: every input (43 edits incl. improvements/exit/loan/assumptions) moves the main-page KPIs exactly as the engine says | 0.92 | 0.92 | 44/44 sub-checks pass |
| A04 | Two-way back-solves: payoff->extra, down$->%, and main page follows | 0.46 | 0.46 | 6/6 sub-checks pass |
| A05 | Remove from the MAIN page: Edit mode, confirm, Undo, totals update; removing a funding source leaves the target listed | 0.62 | 0.62 | 10/10 sub-checks pass |
| A06 | Main rows follow list order = buy order (sorted once on first load, owned first); each row carries its number in its own view (Planned 1..n, Real 1..m); no row says owned or planned; the first asset in the list has no wait line and every later one has | 0.23 | 0.23 | 6/6 sub-checks pass |
| A07 | No "Today" / "20 years" view toggle anywhere (single portfolio snapshot) | 0.15 | 0.15 | 3/3 sub-checks pass |
| A08 | Homes cannot cash-flow negative: warning on the asset page and on the main page; clears when fixed; not shown for non-homes | 0.39 | 0.39 | 7/7 sub-checks pass |
| A09 | Per-row numbers sum to the portfolio headline (cash flow, monthly payments, net worth) on the sample, and match the engine | 0.46 | 0.46 | 7/7 sub-checks pass |
| A10 | Exit and improvements through the UI: Hold/Sell/Merge buttons and fields propagate to rows, KPIs and breakdown | 0.54 | 0.54 | 8/8 sub-checks pass |
| A11 | Sample portfolio on screen: all rows, three types, sane finite headline, no unfunded warning, no DTI warning | 0.31 | 0.31 | 6/6 sub-checks pass |
| A12 | Trust funding on screen: every row after the first shows "Funded in N mo by the trust: cash flow $X/mo + borrowing room $Y) · pool of K assets", the numbers match the engine; raising an earlier asset's extra opens later purchases sooner | 0.31 | 0.31 | 3/3 sub-checks pass |
| A13 | FHA 203(k) through the UI: add flow auto-fills rehab + terms, owner-occupied notice, financed-rehab note, Limited cap warning, switching loan option resets | 0.31 | 0.31 | 11/11 sub-checks pass |
| A21 | Main screen: always-visible tab bar Planned | Real | Saved (even when Real is empty), exactly one page at a time, tabs >= 44px at 320/390/430 with no sideways scroll, swipe or tap, page remembered while you move around | 0.46 | 0.46 | 7/7 sub-checks pass |
| A22 | Planned and Real hold the right rows: Planned = planned assets with the plan totals, Real = bought assets only; each page total equals the sum of its rows (and the engine) | 0.46 | 0.46 | 7/7 sub-checks pass |
| A23 | Setting "Open the app on" (Planned default / Real / Saved) on the Assumptions page with an (i); it survives reload; the app opens on the chosen page | 0.31 | 0.31 | 4/4 sub-checks pass |
| A24 | Saved portfolios: Save current portfolio (name field, default "Portfolio n", confirm), the card shows name, date, assets, net worth and cash flow from the engine; Open replaces the working portfolio with exactly the saved numbers and Undo brings the previous one back | 0.62 | 0.62 | 13/13 sub-checks pass |
| A25 | Saved portfolios: Rename, Duplicate and Delete (confirm; Cancel keeps it) work, persist after reload, and the empty state returns when the last one is deleted | 0.39 | 0.39 | 7/7 sub-checks pass |
| A26 | Backup includes the saved portfolios and the start-page choice; Restore brings them back (also after the storage was wiped) | 0.39 | 0.39 | 5/5 sub-checks pass |
| A27 | Default plan on screen: in TODAY'S dollars net worth at least $125.0M (up to about $135M) and cash flow at least $1.3M a month at year 28 and AFTER-TAX cash flow at least $1.3M a month at plan end (the future-dollar amounts, at the cost-increase rate, shown smaller), in one clear plan line and in the KPIs | 0.31 | 0.31 | 5/5 sub-checks pass |
| A28 | Saving survives a full or blocked storage: a clear message, no crash, the list is unchanged | 0.15 | 0.15 | 2/2 sub-checks pass |
| A29 | Each page's totals are unique to it: with 2 bought and 4 planned assets, Planned totals = sum of the planned rows (never the bought ones), Real totals = sum of the bought rows, the two differ, and together they equal the whole plan | 0.46 | 0.46 | 9/9 sub-checks pass |
| A30 | Opening an old save (v9-v18): no pop-up or Undo banner, the working portfolio is the current default plan (net worth >= $125M in today's dollars), and the old portfolio sits in Saved as "Portfolio N (before the update)" and loads back exactly | 0.31 | 0.31 | 4/4 sub-checks pass |
| A31 | Today's dollars on screen: with 5% cost increase and a sold asset, the Planned top card, category strips, breakdown and every row show the engine's future-dollar figure divided by 1.05^(months/12) (28 years at the plan end), the smaller line shows the future-dollar figure, and the Saved card follows the same rule | 0.46 | 0.46 | 9/9 sub-checks pass |
| A32 | Show figures in: Assumptions has Today's dollars | Future dollars with an (i), default Today's, tap targets >= 44px; switching shows the engine's future-dollar figures on the Planned and Real top cards and the breakdown; the choice persists in the UI storage and after a reload; nothing in the portfolio data changes | 0.46 | 0.46 | 11/11 sub-checks pass |
| A33 | Prices stay today's prices: every planned asset's price on screen is the entered price (nothing is inflated), the cash a purchase needs is its down payment + closing + improvements on that price whatever month it is bought, and the glossary says so | 0.31 | 0.31 | 5/5 sub-checks pass |
| A34 | An older default plan (v18) opens silently on the new default: no pop-up or Undo banner, the working portfolio is the new plan, the old portfolio is filed in Saved as "Portfolio N (before the update)" and loads back exactly; the unit choice is not touched | 0.15 | 0.15 | 3/3 sub-checks pass |
| A35 | A release never overwrites or resurrects the user's own portfolio (v19 -> v20 keeps it, S.added bookkeeping): empty stays empty, own assets kept with no second Lost Creek, missing S.added adds nothing, a new ADDITIONS entry lands once as the LAST planned asset and never returns after removal, Undo / Saved / backup keep S.added, v<=18 still switch with the "before the update" entry, new default plan targets hold | 0.62 | 0.62 | 19/19 sub-checks pass |
| A36 | Premier Florida General Contractor (BizBuySell #2564259) is an ADDITIONS entry: a v20 phone gets it ONCE as the LAST planned asset, never again after reload or removal, not in the default plan or any seed, kept by Saved / Undo / backup, equal field for field to the listing facts, the plan has no NaN and its page shows revenue, margin, loan and cash needed | 0.77 | 0.77 | 15/15 sub-checks pass |
| A60 | Planned page is on today's basis: Cash flow, Total monthly payments and DSCR equal the engine's today's (2026*) terms (sums of each planned asset's month-0 numbers from planR), their sub text is only 'Positive total income' / 'Negative income' with no second value, the label is '2026*' with the * explained, and no 'Year 28' / 'outlook' string or 'month N' wording remains; each row shows today's cash flow with a short sign phrase, two short lines (price · rent · +reno / verdict · needs · in N mo (date)), and each category strip reads 'N homes · +$X/mo · $Y' | 0.46 | 0.46 | 9/9 sub-checks pass |
| A61 | Real page shows BOTH values with today's as the main number and the year-28 amount as the small line, lists every bought asset, and its DSCR equals the engine's (bought assets' month-0 income / loan payments), also the asset page's | 0.46 | 0.46 | 6/6 sub-checks pass |
| A62 | Checks card lists EVERY check the engine runs: its row count = E.checkList length (generated from the same list), each row has a label, value, limit, status word and (i); the Planned page 'Checks' header says how many | 0.46 | 0.46 | 6/6 sub-checks pass |
| A63 | Wording: a point in time is always 'N months from today (Mon YYYY)' (never 'month N'): the engine's check text and plan headline, and the glossary names the (i) for the new checks | 0.23 | 0.23 | 3/3 sub-checks pass |
| A64 | Property manager is an editable amount on every asset (home, multi-family building, commercial; a business has none): it starts at the Assumptions rate so no existing cash flow changes, it feeds the asset's income after costs, the plan and the main-page cost breakdown (the breakdown line equals the sum of the per-asset manager amounts), a blank box returns to the default, and the Planned cash flow KPI follows | 0.62 | 0.62 | 11/11 sub-checks pass |
| A65 | Cap rate (yearly net operating income / value) replaces cash-on-cash on the asset page for every type: homes (planned and bought), a multi-family building, commercial and a business; it has an (i) whose text is at most 450 characters with a worked example; cash-on-cash no longer appears anywhere on the page or in the glossary | 0.46 | 0.46 | 12/12 sub-checks pass |
| A66 | The improvement budget sets the new appraised value: value = price + 1.4 x budget (the app's own convention), tagged 'auto', and editing the budget again re-syncs it; the homes built on that rule follow too; the budget and value reach the plan, the row and the engine (value gained = 0.4 x budget) | 0.46 | 0.46 | 8/8 sub-checks pass |
| A67 | The appraised value can be overridden: a typed value is kept when the budget changes (the page says so and offers Use auto), Use auto puts the budget rule back, and a seeded override (an appraisal that is not price + 1.4 x budget) is kept too | 0.31 | 0.31 | 6/6 sub-checks pass |
| A68 | 'Income lift' is now 'Rent increase' and shows the current rent and the rent after the work (current -> after); a business says 'Profit increase' | 0.23 | 0.23 | 5/5 sub-checks pass |
| A69 | An asset in sell mode shows the Sale card first (right under the title, before the key numbers, status and every other card); an asset not being sold has no Sale card; planned and bought assets both | 0.31 | 0.31 | 3/3 sub-checks pass |
| A70 | 'Impact on your plan' is on the same basis as the main page and adds up: for cash flow and payments (today's terms, 2026*), the portfolio on the asset's own page without the asset + this asset + the knock-on to the other assets = with it; the 'with it' number equals the Planned / Real page's own KPI; net worth and outside cash read without -> with; every line has a short label and an (i); the note says today's terms | 0.62 | 0.62 | 19/19 sub-checks pass |
| A71 | A bought asset has a real 'Bought on' date: marking an asset bought stores today's date and the page shows it; going back to planned clears it; assets already owned before the update show 'Date not recorded' and the date can be set (a future date is refused); it survives reload and normalize | 0.46 | 0.46 | 7/7 sub-checks pass |
| A72 | Clearing the browser's saved data while the app is open does not raise a false 'portfolio replaced' note at the next start (it was a clear, not a replacement); a portfolio that is really replaced by the default plan while the data is still there still does | 0.31 | 0.31 | 4/4 sub-checks pass |
| A73 | Page order audit applied (prototype/agents/plans/page-order-audit.md): on the Planned page the headline numbers and the asset list come before the secondary links (buy order, import); the Saved page lists the saved portfolios before the clear-the-plan card; the Assumptions page starts with the lender assumptions before the display switches and the explainer; Finances shows the verdict and the month picture before the input cards | 0.31 | 0.31 | 4/4 sub-checks pass |
| B01 | P&I for 240k @6.5% 30y = 1516.96 | 0.21 | 0.21 | got 1516.9632563831167 |
| B02 | Scheduled balance after 60 mo = 224666.35 | 0.21 | 0.21 | 2/2 sub-checks pass |
| B03 | Balance after 60 mo with +500 extra = 189329.36 | 0.21 | 0.21 | got 189329.3620868643 |
| B04 | Payoff months with +500 extra = 192 | 0.21 | 0.21 | got 192 (scheduled: 360) |
| B05 | LOC months (D=60k) extra 0/500/1000 = 140/55/34 | 0.42 | 0.42 | 3/3 sub-checks pass |
| B06 | extraFor 24 mo = 1543.87, 36 mo = 918.49 | 0.42 | 0.42 | 3/3 sub-checks pass |
| B07 | Growth 3%: LOC months extra 0/500 = 48/32 (growth on asset, or g.appr with growth null; the home's saved cash flow grows with its rent, so it starts saving once rent growth passes the payment) | 0.31 | 0.31 | 4/4 sub-checks pass |
| B08 | More extra never delays LOC (monotone, 0..3000 step 50) | 0.21 | 0.21 | 2/2 sub-checks pass |
| B09 | Purchase order follows the list (A, B, C, D): the trust buys each when the pool of everything before it can pay; months never go backwards; later purchases wait for earlier ones; liens on an earlier asset delay the later ones | 0.31 | 0.31 | 5/5 sub-checks pass |
| B10 | No NaN/Infinity leaks in plan series & KPIs (23 edge scenarios) | 0.42 | 0.42 | 23/23 sub-checks pass |
| B11 | Funding cycles (A<->B, A->A, 3-cycle) do not hang or throw | 0.21 | 0.21 | ok 0,49/0/0,49,72/49,0 |
| B12 | Net worth at t=0 = sum(value - balance - liens) of assets held at t=0 | 0.21 | 0.21 | 2/2 sub-checks pass |
| B13 | plan() under 100ms for the sample and 10-asset chain (median of 7) | 0.10 | 0.10 | median 16.7ms |
| B14 | locMonths matches independent month-by-month simulation (60 random scenarios incl. liens/haircut/appr/paid) | 0.31 | 0.31 | exact 60/60, within1 60/60  |
| B15 | Debt cap: the trust never draws more than its pool room (cap% of each asset's value less its loan and liens), at every purchase and every month | 0.31 | 0.31 | 4/4 sub-checks pass |
| B16 | Loan options: every option listed, per-type lists, applyLoan fills dp/rate/term/io/closing; payment follows | 0.42 | 0.42 | 5/5 sub-checks pass |
| B17 | Improvements raise value/income only after capexMonths; capex is paid from cash/outside money | 0.42 | 0.42 | 6/6 sub-checks pass |
| B18 | Sale: proceeds = value*(1-cost) - balance - liens - LOC; asset and its cash flow vanish; cash counts in net worth | 0.63 | 0.63 | 6/6 sub-checks pass |
| B19 | Sale cash stays in the trust and funds a later purchase before any borrowing; outside cash only for a true shortfall | 0.42 | 0.42 | 5/5 sub-checks pass |
| B20 | Merge applies exitLift to value and income at exitMonth; asset stays held | 0.31 | 0.31 | 3/3 sub-checks pass |
| B21 | Interest-only loan: balance stays flat, payment = interest; extra payments reduce it | 0.31 | 0.31 | 3/3 sub-checks pass |
| B22 | Portfolio rule: per-asset shares (snap/assetsAt) sum exactly to series nw/cf/monthly/debt/value at many months | 0.42 | 0.42 | 6/6 sub-checks pass |
| B23 | Sample portfolio: finite plan, none unfunded, DTI peak below limit, homes cash-flow positive, 20-year numbers sane | 0.42 | 0.42 | 7/7 sub-checks pass |
| B24 | FHA 203(k): rehab is financed in the loan (down payment on price + rehab), upfront MIP financed, monthly MIP in cash flow, owner-occupied flag, closing cash excludes rehab | 0.42 | 0.42 | 8/8 sub-checks pass |
| B40 | Multi-family NOI: rent x units, vacancy, tax, insurance, repairs, management, per-unit reserve and other owner costs are all subtracted (hand-computed) | 0.63 | 0.63 | 3/3 sub-checks pass |
| B41 | Loan payment and DSCR for the 20-unit and 50-unit examples on the agency loans (hand-computed) | 0.63 | 0.63 | 6/6 sub-checks pass |
| B42 | Pack of 5 on a blanket loan; FHA 3.5% duplex with upfront and annual mortgage insurance (hand-computed) | 0.63 | 0.63 | 2/2 sub-checks pass |
| B43 | Balloon and refinance: bank 5-year balloon on a 25-year schedule and the interest-only bridge refinance at the Assumptions rate (hand-computed) | 0.63 | 0.63 | 3/3 sub-checks pass |
| B44 | Units scale linearly; single-family results are unchanged by the new fields; the default plan is untouched | 0.63 | 0.63 | 3/3 sub-checks pass |
| B45 | Normalize keeps kind / units / pack and the new cost fields; old data loads as single family; bad values are clamped; no migration (ADDITIONS untouched) | 0.42 | 0.42 | 4/4 sub-checks pass |
| B46 | Multi-family loan list: every option is complete, rates / closing in range, size eligibility with a reason, first fitting option preselected, info-only options name their model | 0.63 | 0.63 | 7/7 sub-checks pass |
| C01 | At 390x844: summary KPIs, plan headline and the first ledger rows are visible without scrolling | 1.33 | 1.33 | 3/3 sub-checks pass |
| C02 | Main page keeps text inputs out of the list: no inputs until a row is selected, then exactly one extra field (none for a sold row) | 1.00 | 1.00 | 5/5 sub-checks pass |
| C03 | No horizontal overflow at 320/390/430 on main, asset, assumptions, add, import | 1.33 | 1.33 | 15/15 sub-checks pass |
| C04 | Tap targets >= 44x44 (buttons, selects, inputs; label counts for inputs) | 1.33 | 1.33 | 285/285 targets >=44px. Small:  |
| C05 | All inputs/selects use font-size >= 16px (no iOS zoom) | 0.67 | 0.67 | 47/47 ok  |
| C06 | Asset page reachable in 1 tap, back in 1 tap; adding an asset takes <= 3 taps | 1.33 | 1.33 | 3/3 sub-checks pass |
| C07 | Main page stays compact: <= 150px per ledger row (sample), plan below the ledger | 0.67 | 0.67 | avg row 115px x 36, page 8427px |
| C08 | Text contrast >= 4.5:1 in light and dark mode (main, chart, asset, assumptions, add) | 1.33 | 1.33 | 2369/2369 text elements pass (light 1182/1182, dark 1187/1187).  |
| C09 | Summary-first: one concise summary card (single snapshot, short text), plan card collapsible | 1.00 | 1.00 | 3/3 sub-checks pass |
| D01 | Manifest valid; icons load with true declared dimensions | 1.14 | 1.14 | 8/8 sub-checks pass |
| D02 | Service worker (index.html) registers, activates, controls page after reload; precache complete | 1.14 | 1.14 | 3/3 sub-checks pass |
| D03 | Works offline: reload, deep-link, and edit with network off | 1.52 | 1.52 | 4/4 sub-checks pass |
| D04 | Zero external (non-localhost) network requests across every flow | 0.76 | 0.76 | 1461 requests, 0 external  |
| D05 | Data persists across reload and new tab (localStorage rep-v4, v7); no server round-trip | 1.14 | 1.14 | 5/5 sub-checks pass |
| D06 | Backup: Show backup gives valid JSON text; pasted text and file restore state (with confirm); invalid text rejected without damage | 1.52 | 1.52 | 6/6 sub-checks pass |
| D07 | iOS install meta: apple-touch-icon loads, viewport-fit=cover, apple-mobile-web-app-capable, theme-color | 0.38 | 0.38 | 4/4 sub-checks pass |
| D08 | navigator.storage.persist() requested on load | 0.38 | 0.38 | persist() calls: 1 |
| E01 | Edge inputs (59 cases + compound: zero, 100% down, blanks, garbage, negatives, 1e12, caps, sale/merge/improvement fields) leave no NaN/Infinity/undefined in any page or crash | 1.91 | 1.91 | 64/64 sub-checks pass |
| E02 | Remove all assets (main page) -> clean empty state with add action; can add again | 0.96 | 0.96 | 3/3 sub-checks pass |
| E03 | Deleting a funding target clears references (select, storage, plan, merge-into) | 0.96 | 0.96 | 5/5 sub-checks pass |
| E04 | Every input/select/button has an accessible name (main, asset, assumptions, add, import) | 0.64 | 0.64 | 426/426 named. unnamed:  |
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

## F. Personal finances: **90.00 / 90** (separate scale; a design review adds 10 later; not included in the A-E + R total)

| ID | Check | Pts | Earned | Detail |
|---|---|---|---|---|
| F1 | Engine correctness: independent month-by-month simulation + hand cases + edge values | 26.00 | 26.00 | 16/16 sub-checks pass |
| F2 | Verdict logic and advice | 16.00 | 16.00 | 17/17 sub-checks pass |
| F3 | UI features | 24.00 | 24.00 | 89/89 sub-checks pass |
| F4 | Factor coverage: every input moves the answer in the right direction | 14.00 | 14.00 | 24/24 sub-checks pass |
| F5 | Robustness and accessibility | 10.00 | 10.00 | 10/10 sub-checks pass |

### F failures

None.

## G. Number sync: **100.00 / 100** (separate scale; not included in the A-E + R total or in F)

| ID | Check | Pts | Earned | Detail |
|---|---|---|---|---|
| G1 | Portfolio internal sync (KPIs = ledger total = rows = breakdown = chart = headline = engine) | 14.00 | 14.00 | 42/42 sub-checks pass |
| G2 | Asset page <-> Portfolio sync (share line, hero, impact, edits propagate) | 14.00 | 14.00 | 70/70 sub-checks pass |
| G3 | Portfolio <-> Finances sync (cash flow, funding, extra scope, verdict, edge cases) | 14.00 | 14.00 | 34/34 sub-checks pass |
| G4 | Asset-page field dependencies re-derive after every edit (property-based, 60+ edit sequences) | 18.00 | 18.00 | 34/34 sub-checks pass |
| G5 | Add page <-> created asset (loan option cards, option switching, 203(k) defaults) | 6.00 | 6.00 | 12/12 sub-checks pass |
| G6 | Cross-page navigation & persistence (nav, reload, backup restore, second tab, v8 migration, dark/light) | 12.00 | 12.00 | 12/12 sub-checks pass |
| G7 | Shared settings (g.* and p.*) propagate to every dependent display | 10.00 | 10.00 | 146/146 sub-checks pass |
| G8 | No stale / duplicate / contradictory numbers | 12.00 | 12.00 | 10/10 sub-checks pass |

### G failures

None.

## H. Help buttons and hourly jobs: **100.00 / 100** (separate scale; not included in the A-E + R total, F or G)

| ID | Check | Pts | Earned | Detail |
|---|---|---|---|---|
| H1 | Glossary integrity: complete entries, plain wording, every label / loan mapped to a real and sensible entry, acronyms explained | 8.00 | 8.00 | 9/9 sub-checks pass |
| H2 | Info-button coverage: every jargon label on every page (Portfolio, asset types, Assumptions, Finances, Add) has an (i) with the right definition; no orphan glossary entries | 16.00 | 16.00 | 112/112 sub-checks pass |
| H3 | Info sheet: opens with the right content, closes by button / Escape / backdrop / navigation, accessible names and roles, keyboard, contrast, fits small screens, never changes data | 16.00 | 16.00 | 22/22 sub-checks pass |
| H4 | Definitions are accurate: numbers quoted match the engine constants and loan table, examples do their own arithmetic, stated rules behave that way in the engine | 16.00 | 16.00 | 42/42 sub-checks pass |
| H5 | Hourly jobs: add, gross = (wage + tips) x hours x weeks, automatic vs typed tax, blank tax returns to automatic, temporary end month, switching kind, clamps, persistence | 12.00 | 12.00 | 28/28 sub-checks pass |
| H6 | Optional fields left blank never break the plan or the finance verdict (job extras, improvements, exit fields, co-signers) | 8.00 | 8.00 | 16/16 sub-checks pass |
| H7 | Old saves migrate: v8 (assets only) and pre-hourly jobs (no kind / wage / tips / weeks) load, keep their numbers and show correctly | 6.00 | 6.00 | 10/10 sub-checks pass |
| H8 | Automatic tax estimate: matches an independent 2026 single-filer calculation (IRS Rev. Proc. 2025-32, Pub. 15) (federal after standard deduction + Social Security + Medicare, no state tax), is monotone and bounded | 6.00 | 6.00 | 6/6 sub-checks pass |
| H9 | Disclosure defaults and new wording: collapsed sections open on tap (and stay open), renamed labels, Hold/Sell/Merge + Status, loan grouping, import preview title | 8.00 | 8.00 | 12/12 sub-checks pass |
| H10 | Clean run: no console / page errors and no network requests outside localhost during all help and hourly-job flows | 4.00 | 4.00 | 2/2 sub-checks pass |

### H failures

None.

## I. Portfolio sections, gestures and funding order: **144.00 / 144** (separate scale; not included in A-E + R, F, G or H)

| ID | Check | Pts | Earned | Detail |
|---|---|---|---|---|
| I1 | Swipe right from the left edge goes back like iOS (touchstart within 24 px, dx > 70, |dy| < 45); ignored elsewhere | 12.00 | 12.00 | 9/9 sub-checks pass |
| I2 | Press-and-hold then drag reorders a row inside its category (mouse and touch); list order is saved; a plain tap still opens the panel | 14.00 | 14.00 | 14/14 sub-checks pass |
| I3 | Move up / Move down buttons in the row panel (accessible alternative): reorder, disabled at the ends, panel stays open | 8.00 | 8.00 | 8/8 sub-checks pass |
| I4 | Funding follows the list order by itself: the trust funds each asset from everything before it (1,2,3 and 1,3,2), the wait lines and purchase months re-work after each move, nothing is stored per asset, no per-asset Funds picker, no re-link on plain load | 16.00 | 16.00 | 10/10 sub-checks pass |
| I5 | Duplicate: from the row panel and the asset page; copy sits right after the original, named "(copy)", planned, funded by the trust like any later asset | 10.00 | 10.00 | 6/6 sub-checks pass |
| I6 | Portfolio = total row + Homes / Commercial / Businesses dropdowns (name left, chevron right, stat strip: count, before/after loan, worth, DSCR, lasts), empty sections, Sold section only when something sold | 12.00 | 12.00 | 12/12 sub-checks pass |
| I7 | Selecting a row opens a nested panel with the extra payment and live effects: loan term, monthly payment, next down payment (with cash flow); all match the engine and the asset page | 12.00 | 12.00 | 25/25 sub-checks pass |
| I8 | Rent & expenses shows the loan payment (P&I + mortgage insurance, extra) and the cash flow after the loan, in sync with Payment now / Cash flow now | 6.00 | 6.00 | 6/6 sub-checks pass |
| I9 | Swipe down closes the keyboard (blurs the focused field); Enter / Done also closes it; swipes inside the field or upward do not | 6.00 | 6.00 | 6/6 sub-checks pass |
| I10 | Layout and hygiene: no sideways scroll at 320 / 390 / 430 with a panel open and while dragging, new buttons >= 44 px, no console errors or outside requests | 4.00 | 4.00 | 4/4 sub-checks pass |
| I11 | Buy order screen: one flat list of all planned assets (homes, commercial, business) with number badges; Up / Down / Top / Move to # / Buy position box / drag move assets ACROSS categories, renumber at once, Undo works, targets >= 44 px, no overflow at 320 / 390 / 430 in light and dark | 14.00 | 14.00 | 13/13 sub-checks pass |
| I12 | Shortfall panel: for a $10M business with $2.5M down and $1M to pull out the asset page shows the cash lines, down short -$1,500,000, uncovered -$9,000,000, the monthly lines and ranked changes; the row says Not possible - short $1.5M; the Finances chip and headline say Not yet with that reason; it all updates without a reload; scorecard lists every test | 14.00 | 14.00 | 11/11 sub-checks pass |
| I13 | Reorder by hold: a main Reorder button on the Planned page opens the Buy order page; pressing and holding anywhere on a row (real touch events) lifts it, dragging moves it across categories with a drop line and edge auto-scroll, release renumbers; a quick swipe still scrolls and moves nothing; a tap or hold without moving changes nothing; 44 px, no overflow at 320 / 390 / 430 light and dark | 16.00 | 16.00 | 14/14 sub-checks pass |

### I failures

None.

## J. Dates, number-box math, Checks, sold profit, migration, stretch house: **100.00 / 100** (separate scale)

| ID | Check | Pts | Earned | Detail |
|---|---|---|---|---|
| J1 | Calendar dates: month 0 = today (Nov 12, 2026), month N = today + N months (Nov 12, 2026 / Nov 2026; never MM/DD/YY); every month-from-today field shows its date and updates as you type; the first asset says where its money comes from; no bare "starting point" | 2.31 | 2.31 | 9/9 sub-checks pass |
| J2 | Math in number boxes: 650*3, 1,200+450, (2000-300)/2, 650x3 and $/% forms evaluate with a safe parser; the answer reaches rows, totals and the asset page; invalid, half-typed and divide-by-zero input never changes the data and says "Check the math"; no eval / Function in the source | 3.08 | 3.08 | 37/37 sub-checks pass |
| J3 | Planned page Checks: one plain row per check, highlighted only past a safe amount; one calm line when everything is safe; Details link is in normal flow (no overlap at 320/390/430) and >= 44px | 2.70 | 2.70 | 16/16 sub-checks pass |
| J4 | Sold assets show how much cash was profited: Sold row, Sold category and the asset page all match the engine (price - selling costs - loan - tax - cash put in) | 2.31 | 2.31 | 6/6 sub-checks pass |
| J5 | Old saves move silently to the current plan with the default finance profile (no popup or undo banner); the old portfolio, with its own profile, is filed in Saved as "Portfolio N (before the update)" | 2.31 | 2.31 | 5/5 sub-checks pass |
| J6 | Stretch scenario button loads a plan that buys 607 Siena Way ($135,000,000) and the Finances verdict is not "no"; the button and confirm text say so | 1.93 | 1.93 | 6/6 sub-checks pass |
| J7 | Every (i) info button, the Details link and the tab buttons are >= 44px in both directions on Planned, asset, Finances and Assumptions at 390px | 1.54 | 1.54 | 4/4 sub-checks pass |
| J8 | Loading a sample portfolio files the current plan in Saved as "Portfolio N (before <scenario>)", shows an Undo banner that restores it, lands on the Planned tab, and the buttons are neutral with short titles | 2.31 | 2.31 | 6/6 sub-checks pass |
| J9 | Invalid math (5/0, 650*) never changes state or any dependent while typing or after leaving, the box goes back to its last good value with a Kept note, the field never moves, the hint is >= 13px, and labels keep their (i) beside the last word | 2.31 | 2.31 | 5/5 sub-checks pass |
| J10 | Checks: no Last purchase / Lenders / "Down payments beyond the trust" rows, the Details button stays visible (and in the gutter) when something is flagged, DTI over the limit is red on the chip, the header and the row | 1.54 | 1.54 | 4/4 sub-checks pass |
| J11 | A sold asset reads the same to the dollar everywhere: the Sale card, the note under it, the Net proceeds before tax field, the asset-page summary line and the Sold row; the card adds up exactly (several selling-cost rates) | 1.54 | 1.54 | 8/8 sub-checks pass |
| J12 | Checks is its own card with a clear heading and a light Details button; flagged rows sit inside the card gutter, one row apart, labels do not wrap; when no purchase can be funded Checks says the plan cannot start (no "last purchase today", no fake DTI peak); the lowest cash never exceeds the savings | 2.31 | 2.31 | 9/9 sub-checks pass |
| J13 | Finances writes every point in time as "N months from today (Mon YYYY)" (or "today"), including the Biggest cash calls rows; the Breakdown table keeps every figure inside the card at 320px | 1.16 | 1.16 | 3/3 sub-checks pass |
| J14 | Number boxes: a half-typed or invalid entry typed key by key goes back to the value the box had when you tapped into it (not a typed prefix) and says "Kept $X"; a negative says "Can't be negative, kept $X"; a percent in a dollar box is refused with a note; a percent box still takes 9% | 2.31 | 2.31 | 8/8 sub-checks pass |
| J15 | Singular and plural wording: "pool of 1 asset", "1 planned asset is possible", "Your 1 asset is bought", no "1 assets" / "1 months" / "1 homes" on Planned, Real, Saved, Finances or the asset page | 0.77 | 0.77 | 4/4 sub-checks pass |
| J16 | After a silent migration the Planned page shows one dismissible line naming the Saved portfolio (no dialog, no Undo); it stays until dismissed, is gone afterwards and never shows for a current save or on the other pages | 1.54 | 1.54 | 6/6 sub-checks pass |
| J17 | The Undo message is a floating toast: it does not move the page, stays readable (role=status), keeps Undo working, follows you across the tabs, and disappears by itself after about 10 seconds | 1.54 | 1.54 | 6/6 sub-checks pass |
| J18 | Saved portfolio names never repeat ("Portfolio n" with n = saved count + 1, moved up when taken, also after a delete or a typed duplicate); the stretch sample no longer claims a net-worth figure the pages do not show | 1.16 | 1.16 | 4/4 sub-checks pass |
| J19 | Planned rows: the verdict chip is separated from the sentence by a dot; "(Mon YYYY)" never splits across lines; "edit ›" stays on the same line as the last word of the name (320px) | 1.16 | 1.16 | 3/3 sub-checks pass |
| J20 | Number boxes at rest and on leaving: 1000+500 then Tab leaves "1,500" and no hint; a blanked box tabbed away goes back (Kept $X), and abc after that keeps the stored value; 4% in a percent box shows 4; a typed prefix (5 of 5/0) never reaches the state | 1.93 | 1.93 | 7/7 sub-checks pass |
| J21 | Names and layout: saved name "Portfolio 1 (before Stretch: 607 Siena Way)" has no nested parentheses; breakdown values never touch at 320; the long stretch title wraps with its edit link (320) | 1.16 | 1.16 | 3/3 sub-checks pass |
| J22 | Planned page: headline says what Checks says (savings $0 -> "once you add $X from your own pocket"); Open Finances shows with Details closed; sold asset page has no "Can the plan buy it?" or trust-timing text; no "1 years" | 1.16 | 1.16 | 4/4 sub-checks pass |
| J23 | Slow typing never commits a prefix: price 5, pause 450 ms, then /0 leaves the price alone; the "= result" hint shows while typing; the value lands on Enter / blur and the totals follow | 2.31 | 2.31 | 5/5 sub-checks pass |
| J24 | Tap targets: every row "edit ›" is >= 44px tall at 390 and 430 (and its hit area really is: elementFromPoint), the Assumptions "How the numbers are built" summary is >= 44px, no sideways scroll at 320/390/430 | 1.54 | 1.54 | 4/4 sub-checks pass |
| J25 | Breakdown table header at 320 and 390: "Equity" and its (i) sit on one line, "Cash flow/mo" does not wrap, the header cells are right-aligned over their numbers and nothing overflows | 1.54 | 1.54 | 6/6 sub-checks pass |
| J26 | Months boxes round to whole months and cap at 600: 1.5 -> 2 with a "Rounded" note, 100000 -> 600 with a "Capped" note (asset page and Finances), and the date under the box matches | 1.93 | 1.93 | 5/5 sub-checks pass |
| J27 | % handling is consistent: 5% in a dollar box stays as typed with a hint until you leave, then goes back with "No % in a dollar box, kept"; 4% in a percent box stays 4% while typing and becomes 4 on leaving; at 320 the (i) and the ▸ arrow stay glued to their last word | 1.54 | 1.54 | 6/6 sub-checks pass |
| J28 | Remove-all: a Remove button sits next to Finances and Settings on the Planned page only; it asks first, files the portfolio in Saved, removes every planned asset (bought ones stay), Undo restores; the Saved page has the same action; nothing overflows at 320 | 1.16 | 1.16 | 7/7 sub-checks pass |
| J29 | Category cards end with a "Monthly income and expenses" list instead of the grey Lasts note: total income (cash flow without any expense), each expense, cash flow before the loan payment and cash flow after all expenses; the lines add up and the last line equals the sum of the rows' "now" cash flows; no raw template text; no overflow at 320 | 1.16 | 1.16 | 3/3 sub-checks pass |
| J30 | Calculated boxes always match the price you typed: type a plain price, stop for a moment while still in the box, and Down payment $ and Loan amount show 25% / 75% of it (no stale numbers); math such as 1000000*16 is still not applied until you leave the box | 0.96 | 0.96 | 2/2 sub-checks pass |
| J31 | Business Total revenue box: an amount plus per month / per year in any common form ("1,200,000/yr", "$1.2M per year", "100k/month", "90000 mo", "15000*12/yr", "1.2m/y") lands as the MONTHLY revenue; a bare trailing m is million, "/m" is a month; "8000/week" is rejected politely; "100/yr/mo" says Check the math and keeps the number | 1.54 | 1.54 | 29/29 sub-checks pass |
| J32 | Business asset page: Total revenue + Profit margin are the inputs, Owner profit (per month and per year) is auto and read-only = revenue x margin; it drives the engine (rent), the row and the Monthly income and expenses lines; a margin edit changes owner profit; there is no editable Monthly owner profit box | 1.35 | 1.35 | 9/9 sub-checks pass |
| J33 | Seeded businesses keep their owner profit and show revenue = profit / 20%; default plan numbers are unchanged; an old portfolio / backup without revenue or margin loads unchanged (revenue and margin stay empty, nothing rewritten) | 1.16 | 1.16 | 5/5 sub-checks pass |
| J34 | New business asset page at 320 and 390: no horizontal scroll, every box and button at least 44px tall, nothing overflows its row | 0.77 | 0.77 | 4/4 sub-checks pass |
| J35 | Add flow, home type: Single family | Multi-family choice (a segmented control like Home / Commercial / Business); single keeps today's list and button; multi shows units, five one-tap presets and Building / Pack of houses | 1.54 | 1.54 | 10/10 sub-checks pass |
| J36 | Add flow, unit count: whole numbers 2-500 only; 0, 1, 501, abc and 2.5 are refused with a short hint and the last good number is kept; 2*3 and 1,2 style math work like every other number box | 1.54 | 1.54 | 13/13 sub-checks pass |
| J37 | Add flow, loan options: every multi-family option is listed, the ones that do not fit the unit count are greyed with a one-line reason (not hidden), the first fitting one is preselected, every option has an (i), info-only options are labelled | 1.54 | 1.54 | 16/16 sub-checks pass |
| J38 | Multi-family asset page: N units in the header and row ("Pack of 5 houses"), rent per unit and total rent (auto), per-unit costs table, reserve and other costs with (i), the expense ratio check, the collapsible guide; the breakdown adds up | 1.93 | 1.93 | 12/12 sub-checks pass |
| J39 | Multi-family persistence: kind / units / pack survive a reload, Undo after Remove, Saved, backup export and restore; the default plan is untouched and nothing else changes | 1.54 | 1.54 | 10/10 sub-checks pass |
| J40 | Start from an example: a quiet collapsed line near the bottom; open, pick, Add = 3 taps for Home, Multi-family, Commercial and Business; the asset equals the example; (i), clear, Back, keyboard and Escape work | 2.70 | 2.70 | 26/26 sub-checks pass |
| J41 | Examples persist like any asset: reload, Undo after Remove, Saved, backup and restore keep every field; the default plan is untouched (36 assets, nothing owned, real NW >= $125M, after-tax cash flow >= $1.3M/mo, verdict Yes) | 1.16 | 1.16 | 8/8 sub-checks pass |
| J42 | Edit an example: Edit beside the (i) opens the editor; calculator math, /yr revenue and units math work; the live line and warnings follow; Save keeps it across reload and shows Edited; the added asset equals the edited example; Reset returns only that example; Back asks before discarding | 3.08 | 3.08 | 20/20 sub-checks pass |
| J43 | Editing and the rest of the app: multi-family units re-check the loan and per-unit costs, the loan picker updates down payment and cash, revenue per year keeps profit = revenue x margin, future dollars and tight widths work, backup / Saved / Undo / examples already owned behave, storage unavailable and two tabs and an old cached engine do not break it | 3.47 | 3.47 | 26/26 sub-checks pass |
| J44 | Build stamp: app.js, engine.js, info.js, style.css (as --build) and the service worker cache name carry one hash of the four files; editing a file without restamping is caught; stamp.py and build-artifact.py write it | 1.73 | 1.73 | 6/6 sub-checks pass |
| J45 | Mixed versions: an old engine.js under a new app.js is detected at start, caches are purged, the service worker removed and the page reloads exactly ONCE (no loop), the event is logged, the stored portfolio is untouched; if it is still mixed the notice shows instead; a stale cache name heals the same way, but never after the person has touched the page | 2.31 | 2.31 | 9/9 sub-checks pass |
| J46 | Safety copies are taken BEFORE a migration, an additions append, an unreadable save, loading a sample, Remove all planned, opening a Saved portfolio, a backup restore, removing an asset, and once a day; each copy equals the state just before; Restore brings back the exact copy (deep-equal), files the current state first and offers Undo | 3.08 | 3.08 | 16/16 sub-checks pass |
| J47 | Safety ring limits: at most 5 copies, oldest dropped, size capped, newest first, quota errors and a throwing localStorage never throw and never lose the newest copy; the app still works and Undo still shows | 1.35 | 1.35 | 5/5 sub-checks pass |
| J48 | Portfolio replaced: a start whose state is the default plan with other asset ids than the last-known fingerprint, with no logged migration / sample / restore explaining it, shows "may have been replaced" with Restore my previous portfolio; nothing is restored by itself; restore returns the earlier portfolio; explained or normal starts show nothing | 2.31 | 2.31 | 9/9 sub-checks pass |
| J49 | Anomaly monitor: NaN in a KPI, a changed total, a failed read-back, mismatched stamps and a wrong state version are each flagged with their code; the Planned page shows "Something looked wrong. Tap to copy a bug report" (one tap copies, dismiss works); errors, rejections and storage failures land in a 60-entry, size-capped event ring | 2.70 | 2.70 | 15/15 sub-checks pass |
| J50 | Bug report: 8 sections, parseable, <= 8,000 characters; with "Include my numbers" off no street names, addresses or dollar amounts (sentinel address and price), with it on prices and rents but still no address; Copy uses the clipboard with the select-by-hand fallback; the GitHub link is valid, <= 7,500 characters and says the full report was copied; the app makes no network request | 3.08 | 3.08 | 13/13 sub-checks pass |
| J51 | No slowdown: the safety / monitor start-up work costs under 50 ms on the default 36-asset plan (median of 5 starts), the monitor under 50 ms, and the invariants run in node in under 20 ms | 0.77 | 0.77 | 3/3 sub-checks pass |
| J52 | Nothing else changed: backup export excludes safety and diagnostic keys, backup import still restores, Saved portfolios do not hold safety copies, and the default plan is untouched (36 assets, nothing owned, real NW >= $125M, after-tax cash flow >= $1.3M/mo, verdict Yes) | 0.96 | 0.96 | 4/4 sub-checks pass |
| J53 | Typing a name: the box is never replaced or re-rendered per key (30 keys, same element, 0 renders, fast), the name lands after a pause / leaving the box / tapping Back mid-typing, Escape reverts, and every free-text box asks for autocorrect | 2.70 | 2.70 | 8/8 sub-checks pass |
| J54 | Duplicate names: "<name> (copy)", "(copy1)", "(copy2)" ...; a copy of a copy counts as a copy of the base; the first unused number is taken; names never repeat; long names keep the suffix; numbering, Undo and the default plan are unaffected | 1.93 | 1.93 | 8/8 sub-checks pass |
| J55 | Nothing planned but one bought asset (98% debt): the Planned page is the neutral card with a Real link (no KPIs, "Can I afford this?", Checks, target line, "Not yet"); Real still shows the asset; Finances says "Nothing planned"; no assets = old note; default plan unchanged; Remove on bought + planned says "1 bought asset stays", ends neutral, Undo restores; fits 320/430 light and dark | 1.54 | 1.54 | 10/10 sub-checks pass |

### J failures

None.

## K. Design consistency and flow: **100.00 / 100** (separate scale; the multi-family screens against the existing design language)

| ID | Check | Pts | Earned | Detail |
|---|---|---|---|---|
| K1 | Colours come only from the existing CSS variables: no hard-coded colour in the new CSS rules or in the new screens' inline styles, and every var() used is a defined token | 3.85 | 3.85 | 5/5 sub-checks pass |
| K2 | Every piece of text on the new screens has contrast >= 4.5:1 in light and dark mode (greyed options, chips, hints, tables, the guide) | 4.49 | 4.49 | 2/2 sub-checks pass |
| K3 | The new UI is built from the existing components: field rows (label + (i) + box), .card sections with the same collapsible header, segmented controls like Home / Commercial / Business, chips, loan cards with an (i), the cmp table, the warning box; at most a handful of new classes, all defined with tokens | 5.13 | 5.13 | 7/7 sub-checks pass |
| K4 | Tap targets are >= 44px and nothing scrolls sideways at 320, 390 and 430 on every new screen; nothing is wider than its card | 3.85 | 3.85 | 6/6 sub-checks pass |
| K5 | No text overlaps: the bounding boxes of every line of text on the new screens (and the greyed reasons, chips, table cells, (i) buttons) never collide, at 320 and 390 | 3.85 | 3.85 | 2/2 sub-checks pass |
| K6 | Spacing, font sizes and corner radii on the new screens come from the sets the existing screens already use (no new size, margin, padding or radius) | 3.85 | 3.85 | 3/3 sub-checks pass |
| K7 | The same state looks the same: the new Single / Multi and Building / Pack controls match the Home / Commercial / Business tabs; a selected multi-family loan card matches a selected single-family card; greyed cards are visibly different but readable | 2.56 | 2.56 | 4/4 sub-checks pass |
| K8 | No walls of text on the new screens: every note is short (<= 170 characters), the guide shows scannable rows and a short checklist, and the long explanations live in (i) buttons | 2.56 | 2.56 | 2/2 sub-checks pass |
| K9 | First-time flow: from the Add screen a multi-family asset is 3 taps away (Multi-family, a preset, Add); from the portfolio 3 taps with the default duplex; Back returns without adding anything; presets are one tap; the unit box has the numeric keyboard settings of the other boxes; the result opens on the asset page | 3.21 | 3.21 | 6/6 sub-checks pass |
| K10 | Screenshots (dpr 2) of the new screens at 390 and 320 in light and dark are saved to grader/screens/mf-*.png, full height, with no sideways overflow | 1.92 | 1.92 | 1/1 sub-checks pass |
| K11 | Examples control: colours come only from tokens (no hard-coded colour in its CSS or its inline styles), it reuses the loan card, (i), chip, link-button and empty-line components, and adds at most 2 new classes | 3.85 | 3.85 | 5/5 sub-checks pass |
| K12 | Every piece of text on the example screens (closed line, 4 rows for each category, the chosen line) has contrast >= 4.5:1 in light and dark | 4.49 | 4.49 | 2/2 sub-checks pass |
| K13 | Example screens: every button is >= 44px tall, nothing scrolls sideways or passes the edge, and no two lines of text overlap, at 320, 390 and 430 | 4.49 | 4.49 | 9/9 sub-checks pass |
| K14 | Discreet and short flow: closed by default as one quiet 44px line (the same size and weight as the other link buttons) that adds at most 56px to the Add screen; the Add button stays in the first screen (390x844) wherever it was before; spacing, fonts and radii come from the existing sets; 3 taps to add; Back adds nothing | 4.49 | 4.49 | 9/9 sub-checks pass |
| K15 | Screenshots (dpr 2) of the example screens at 390 and 320 in light and dark are saved to grader/screens/ex-*.png | 1.92 | 1.92 | 1/1 sub-checks pass |
| K16 | Editor reuses the app: colours only from tokens (CSS and inline styles), no new class (only existing card, field, loan select, warning box, tag, chip, button, (i), confirm and live-line components), the loan picker is the same select as the asset page, fields use the same label + (i) + box | 4.49 | 4.49 | 4/4 sub-checks pass |
| K17 | Every piece of text on the editor screens (fields, live line, warnings, tags, confirm, list with Edit and Edited) has contrast >= 4.5:1 in light and dark | 4.49 | 4.49 | 2/2 sub-checks pass |
| K18 | Editor screens: every button, select and box is >= 44px tall, nothing scrolls sideways or passes the edge, no two lines of text overlap, at 320, 390 and 430 (also the list with the Edit buttons) | 4.49 | 4.49 | 9/9 sub-checks pass |
| K19 | Flow and keyboard: first time = open the list, Edit, change a field, Save (4 taps) and the Add button is still there; Back asks before dropping changes and not otherwise; Escape closes; Tab reaches Edit and Enter opens the editor with focus on the first field; Escape returns focus to Edit; short on-screen text (notes <= 170 characters); the long text is in the (i) | 3.85 | 3.85 | 6/6 sub-checks pass |
| K20 | Screenshots (dpr 2) of the editor screens at 390 and 320 in light and dark are saved to grader/screens/ex-edit-*.png | 1.92 | 1.92 | 1/1 sub-checks pass |
| K21 | The safety and report UI adds no CSS of its own: style.css equals the shipped file apart from the build stamp line; no colour, hex or rgb in its templates; every inline style it uses is already used elsewhere in the app | 3.21 | 3.21 | 4/4 sub-checks pass |
| K22 | Every piece of text on the new screens (copies list, confirm, report card, text box, both notices) has contrast >= 4.5:1 in light and dark mode | 4.49 | 4.49 | 2/2 sub-checks pass |
| K23 | Built only from existing components: every class on the new screens is already used by the old screens (card, scard, sname, smeta, sstat, sact, btn, pbtn, plain, chip, link, migrate, warnbox, chips, seg, f, lb, note, confirm, info); no new class; the sections use the same collapsible header | 3.21 | 3.21 | 6/6 sub-checks pass |
| K24 | Tap targets are >= 44px and nothing scrolls sideways or passes the edge at 320, 390 and 430 on every new screen | 3.85 | 3.85 | 6/6 sub-checks pass |
| K25 | No text overlaps on the new screens (copies, confirm, report box, both notices), at 320 and 390 | 3.21 | 3.21 | 2/2 sub-checks pass |
| K26 | Spacing, font sizes and corner radii on the new screens come from the sets the existing screens already use | 2.56 | 2.56 | 3/3 sub-checks pass |
| K27 | Short first-time flow and short text: Assumptions to a copied bug report is 2 taps (open the section, Copy), the Planned notice copies in 1 tap, Restore is 3 taps (open, Restore, confirm); every note on the new screens is <= 170 characters and the long explanations are in the (i) entries | 3.85 | 3.85 | 6/6 sub-checks pass |
| K28 | Screenshots (dpr 2) of the new screens at 390 and 320 in light and dark are saved to grader/screens/diag-*.png | 1.92 | 1.92 | 1/1 sub-checks pass |

### K failures

None.

## N. Asset numbering: **100.00 / 100** (separate scale; policy and ideation in numbering-bugs.md)

| ID | Check | Pts | Earned | Detail |
|---|---|---|---|---|
| N1 | Engine numbering(): contiguous 1..n per view in purchase order on 300 seeded random portfolios, pure, shifts by one on removal | 10.00 | 10.00 | 9/9 sub-checks pass |
| N2 | The screenshot: one planned commercial + one planned home (+ a bought asset) show 1 and 2 in purchase order, nothing skipped | 10.00 | 10.00 | 11/11 sub-checks pass |
| N3 | Hidden assets never take a Planned number: two bought assets, a bought commercial and business, a sold-in-plan asset | 10.00 | 10.00 | 30/30 sub-checks pass |
| N4 | Remove an asset (first / middle / last) shifts every later number down by one at once, read without reloading, and again after a reload | 12.00 | 12.00 | 14/14 sub-checks pass |
| N5 | Remove all planned assets, Undo, and add after Remove-all keep the numbers right (bought assets stay 1..m, new planned asset is 1) | 8.00 | 8.00 | 11/11 sub-checks pass |
| N6 | Undo of a removal, Duplicate, Move up/down and the owned <-> planned toggle all leave contiguous numbers in order | 12.00 | 12.00 | 30/30 sub-checks pass |
| N7 | Adding an asset (Add flow, an example, a bought asset) numbers it last in its own view and renumbers nothing else | 8.00 | 8.00 | 12/12 sub-checks pass |
| N8 | Scenario load, Saved open, backup import, ADDITIONS append and an old unsorted save all give contiguous numbers in both views | 12.00 | 12.00 | 53/53 sub-checks pass |
| N9 | Seeded random portfolios (home / commercial / business / multi-family, planned / bought / sold / merged): both pages contiguous, headers and labels agree, and after a random Remove | 10.00 | 10.00 | 135/135 sub-checks pass |
| N10 | Every "#N" the app prints is a real number of its own view; Finances and Saved pages carry no stale numbers; the default plan is 1..36 in order and unchanged | 8.00 | 8.00 | 15/15 sub-checks pass |

### N failures

None.
