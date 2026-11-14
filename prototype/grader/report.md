# Prototype grader report

Target: `prototype/v4`  |  Run: 2026-11-14T16:36:47.004Z  |  638s

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
| B13 | plan() under 100ms for the sample and 10-asset chain (median of 7) | 0.16 | 0.16 | median 28.4ms |
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
| C04 | Tap targets >= 44x44 (buttons, selects, inputs; label counts for inputs) | 1.33 | 1.33 | 251/251 targets >=44px. Small:  |
| C05 | All inputs/selects use font-size >= 16px (no iOS zoom) | 0.67 | 0.67 | 43/43 ok  |
| C06 | Asset page reachable in 1 tap, back in 1 tap; adding an asset takes <= 3 taps | 1.33 | 1.33 | 3/3 sub-checks pass |
| C07 | Main page stays compact: <= 150px per ledger row (sample), plan below the ledger | 0.67 | 0.67 | avg row 139px x 36, page 8617px |
| C08 | Text contrast >= 4.5:1 in light and dark mode (main, chart, asset, assumptions, add) | 1.33 | 1.33 | 2173/2173 text elements pass (light 1084/1084, dark 1089/1089).  |
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
| E04 | Every input/select/button has an accessible name (main, asset, assumptions, add, import) | 0.64 | 0.64 | 371/371 named. unnamed:  |
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
| G1 | Portfolio internal sync (KPIs = ledger total = rows = breakdown = chart = headline = engine) | 14.00 | 14.00 | 44/44 sub-checks pass |
| G2 | Asset page <-> Portfolio sync (share line, hero, impact, edits propagate) | 14.00 | 14.00 | 74/74 sub-checks pass |
| G3 | Portfolio <-> Finances sync (cash flow, funding, extra scope, verdict, edge cases) | 14.00 | 14.00 | 34/34 sub-checks pass |
| G4 | Asset-page field dependencies re-derive after every edit (property-based, 60+ edit sequences) | 18.00 | 18.00 | 34/34 sub-checks pass |
| G5 | Add page <-> created asset (loan option cards, option switching, 203(k) defaults) | 6.00 | 6.00 | 12/12 sub-checks pass |
| G6 | Cross-page navigation & persistence (nav, reload, backup restore, second tab, v8 migration, dark/light) | 12.00 | 12.00 | 12/12 sub-checks pass |
| G7 | Shared settings (g.* and p.*) propagate to every dependent display | 10.00 | 10.00 | 150/150 sub-checks pass |
| G8 | No stale / duplicate / contradictory numbers | 12.00 | 12.00 | 10/10 sub-checks pass |

### G failures

None.

## H. Help buttons and hourly jobs: **100.00 / 100** (separate scale; not included in the A-E + R total, F or G)

| ID | Check | Pts | Earned | Detail |
|---|---|---|---|---|
| H1 | Glossary integrity: complete entries, plain wording, every label / loan mapped to a real and sensible entry, acronyms explained | 8.00 | 8.00 | 9/9 sub-checks pass |
| H2 | Info-button coverage: every jargon label on every page (Portfolio, asset types, Assumptions, Finances, Add) has an (i) with the right definition; no orphan glossary entries | 16.00 | 16.00 | 91/91 sub-checks pass |
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

## I. Portfolio sections, gestures and funding order: **100.00 / 100** (separate scale; not included in A-E + R, F, G or H)

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

### I failures

None.

## J. Dates, number-box math, Checks, sold profit, migration, stretch house: **100.00 / 100** (separate scale)

| ID | Check | Pts | Earned | Detail |
|---|---|---|---|---|
| J1 | Calendar dates: month 0 = today (Nov 12, 2026), month N = today + N months (Nov 12, 2026 / Nov 2026; never MM/DD/YY); every month-from-today field shows its date and updates as you type; the first asset says where its money comes from; no bare "starting point" | 4.43 | 4.43 | 9/9 sub-checks pass |
| J2 | Math in number boxes: 650*3, 1,200+450, (2000-300)/2, 650x3 and $/% forms evaluate with a safe parser; the answer reaches rows, totals and the asset page; invalid, half-typed and divide-by-zero input never changes the data and says "Check the math"; no eval / Function in the source | 5.90 | 5.90 | 37/37 sub-checks pass |
| J3 | Planned page Checks: one plain row per check, highlighted only past a safe amount; one calm line when everything is safe; Details link is in normal flow (no overlap at 320/390/430) and >= 44px | 5.17 | 5.17 | 16/16 sub-checks pass |
| J4 | Sold assets show how much cash was profited: Sold row, Sold category and the asset page all match the engine (price - selling costs - loan - tax - cash put in) | 4.43 | 4.43 | 6/6 sub-checks pass |
| J5 | Old saves move silently to the current plan with the default finance profile (no popup or undo banner); the old portfolio, with its own profile, is filed in Saved as "Portfolio N (before the update)" | 4.43 | 4.43 | 5/5 sub-checks pass |
| J6 | Stretch scenario button loads a plan that buys 607 Siena Way ($135,000,000) and the Finances verdict is not "no"; the button and confirm text say so | 3.69 | 3.69 | 6/6 sub-checks pass |
| J7 | Every (i) info button, the Details link and the tab buttons are >= 44px in both directions on Planned, asset, Finances and Assumptions at 390px | 2.95 | 2.95 | 4/4 sub-checks pass |
| J8 | Loading a sample portfolio files the current plan in Saved as "Portfolio N (before <scenario>)", shows an Undo banner that restores it, lands on the Planned tab, and the buttons are neutral with short titles | 4.43 | 4.43 | 6/6 sub-checks pass |
| J9 | Invalid math (5/0, 650*) never changes state or any dependent while typing or after leaving, the box goes back to its last good value with a Kept note, the field never moves, the hint is >= 13px, and labels keep their (i) beside the last word | 4.43 | 4.43 | 5/5 sub-checks pass |
| J10 | Checks: no Last purchase / Lenders / "Down payments beyond the trust" rows, the Details button stays visible (and in the gutter) when something is flagged, DTI over the limit is red on the chip, the header and the row | 2.95 | 2.95 | 4/4 sub-checks pass |
| J11 | A sold asset reads the same to the dollar everywhere: the Sale card, the note under it, the Net proceeds before tax field, the asset-page summary line and the Sold row; the card adds up exactly (several selling-cost rates) | 2.95 | 2.95 | 8/8 sub-checks pass |
| J12 | Checks is its own card with a clear heading and a light Details button; flagged rows sit inside the card gutter, one row apart, labels do not wrap; when no purchase can be funded Checks says the plan cannot start (no "last purchase today", no fake DTI peak); the lowest cash never exceeds the savings | 4.43 | 4.43 | 9/9 sub-checks pass |
| J13 | Finances writes every month as "month N (Mon YYYY)" (or "today"), including the Biggest cash calls rows; the Breakdown table keeps every figure inside the card at 320px | 2.21 | 2.21 | 3/3 sub-checks pass |
| J14 | Number boxes: a half-typed or invalid entry typed key by key goes back to the value the box had when you tapped into it (not a typed prefix) and says "Kept $X"; a negative says "Can't be negative, kept $X"; a percent in a dollar box is refused with a note; a percent box still takes 9% | 4.43 | 4.43 | 8/8 sub-checks pass |
| J15 | Singular and plural wording: "pool of 1 asset", "1 planned asset is possible", "Your 1 asset is bought", no "1 assets" / "1 months" / "1 homes" on Planned, Real, Saved, Finances or the asset page | 1.48 | 1.48 | 4/4 sub-checks pass |
| J16 | After a silent migration the Planned page shows one dismissible line naming the Saved portfolio (no dialog, no Undo); it stays until dismissed, is gone afterwards and never shows for a current save or on the other pages | 2.95 | 2.95 | 6/6 sub-checks pass |
| J17 | The Undo message is a floating toast: it does not move the page, stays readable (role=status), keeps Undo working, follows you across the tabs, and disappears by itself after about 10 seconds | 2.95 | 2.95 | 6/6 sub-checks pass |
| J18 | Saved portfolio names never repeat ("Portfolio n" with n = saved count + 1, moved up when taken, also after a delete or a typed duplicate); the stretch sample no longer claims a net-worth figure the pages do not show | 2.21 | 2.21 | 4/4 sub-checks pass |
| J19 | Planned rows: the verdict chip is separated from the sentence by a dot; "(Mon YYYY)" never splits across lines; "edit ›" stays on the same line as the last word of the name (320px) | 2.21 | 2.21 | 3/3 sub-checks pass |
| J20 | Number boxes at rest and on leaving: 1000+500 then Tab leaves "1,500" and no hint; a blanked box tabbed away goes back (Kept $X), and abc after that keeps the stored value; 4% in a percent box shows 4; a typed prefix (5 of 5/0) never reaches the state | 3.69 | 3.69 | 7/7 sub-checks pass |
| J21 | Names and layout: saved name "Portfolio 1 (before Stretch: 607 Siena Way)" has no nested parentheses; breakdown values never touch at 320; the long stretch title wraps with its edit link (320) | 2.21 | 2.21 | 3/3 sub-checks pass |
| J22 | Planned page: headline says what Checks says (savings $0 -> "once you add $X from your own pocket"); Open Finances shows with Details closed; sold asset page has no "Can the plan buy it?" or trust-timing text; no "1 years" | 2.21 | 2.21 | 4/4 sub-checks pass |
| J23 | Slow typing never commits a prefix: price 5, pause 450 ms, then /0 leaves the price alone; the "= result" hint shows while typing; the value lands on Enter / blur and the totals follow | 4.43 | 4.43 | 5/5 sub-checks pass |
| J24 | Tap targets: every row "edit ›" is >= 44px tall at 390 and 430 (and its hit area really is: elementFromPoint), the Assumptions "How the numbers are built" summary is >= 44px, no sideways scroll at 320/390/430 | 2.95 | 2.95 | 4/4 sub-checks pass |
| J25 | Breakdown table header at 320 and 390: "Equity" and its (i) sit on one line, "Cash flow/mo" does not wrap, the header cells are right-aligned over their numbers and nothing overflows | 2.95 | 2.95 | 6/6 sub-checks pass |
| J26 | Months boxes round to whole months and cap at 600: 1.5 -> 2 with a "Rounded" note, 100000 -> 600 with a "Capped" note (asset page and Finances), and the date under the box matches | 3.69 | 3.69 | 5/5 sub-checks pass |
| J27 | % handling is consistent: 5% in a dollar box stays as typed with a hint until you leave, then goes back with "No % in a dollar box, kept"; 4% in a percent box stays 4% while typing and becomes 4 on leaving; at 320 the (i) and the ▸ arrow stay glued to their last word | 2.95 | 2.95 | 6/6 sub-checks pass |
| J28 | Remove-all: a Remove button sits next to Finances and Settings on the Planned page only; it asks first, files the portfolio in Saved, removes every planned asset (bought ones stay), Undo restores; the Saved page has the same action; nothing overflows at 320 | 2.21 | 2.21 | 7/7 sub-checks pass |
| J29 | Category cards end with a "Monthly income and expenses" list instead of the grey Lasts note: total income (cash flow without any expense), each expense, cash flow before the loan payment and cash flow after all expenses; the lines add up and the last line equals the sum of the rows' "now" cash flows; no raw template text; no overflow at 320 | 2.21 | 2.21 | 3/3 sub-checks pass |
| J30 | Calculated boxes always match the price you typed: type a plain price, stop for a moment while still in the box, and Down payment $ and Loan amount show 25% / 75% of it (no stale numbers); math such as 1000000*16 is still not applied until you leave the box | 1.85 | 1.85 | 2/2 sub-checks pass |

### J failures

None.
