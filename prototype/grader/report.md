# Prototype grader report

Target: `prototype/v4`  |  Run: 2026-11-12T04:37:02.429Z  |  390s

## Automated score: **81.94 / 84.99900000000001** (a separate design review adds 15)

| Category | Score |
|---|---|
| A. Requirement / propagation | 14.99 / 18.00 |
| B. Engine correctness | 12.00 / 12.00 |
| C. UX conciseness & usability | 9.94 / 10.00 |
| D. PWA / local-first | 8.00 / 8.00 |
| E. Robustness & accessibility | 7.00 / 7.00 |
| R. Realism & market accuracy | 30.00 / 30.00 |

## All checks

| ID | Check | Pts | Earned | Detail |
|---|---|---|---|---|
| A01 | Add flow: each type x each loan option auto-fills dp/rate/term/closing, opens the asset page, adds a ledger row and changes plan numbers | 1.26 | 1.26 | 3/3 sub-checks pass |
| A02 | Changing an asset's loan option re-populates dp/rate/term/closing and changes the plan numbers | 0.79 | 0.46 | 7/12 sub-checks pass. FAIL: dscr main KPIs equal engine for that loan [ui 1653547/1490 eng 2211636/1840]; conv15 main KPIs equal engine for that loan [ui 1639071/1490 eng 2197159/1840]; fha main KPIs equal engine for that loan [ui 1668339/1490 eng 2226427/1840]; cashh main KPIs equal engine for that loan [ui 1569447/1490 eng 2127535/1840]; conv30 main KPIs equal engine for that loan [ui 1660076/14 |
| A03 | Edit matrix: every input (43 edits incl. improvements/exit/loan/assumptions) moves the main-page KPIs exactly as the engine says | 1.90 | 0.06 | 1/44 sub-checks pass. FAIL: h.a.price=400000 [ui nw 1611679 mon 1490 cf 10834; engine 2355797 1840 14236]; h.a.dp=35 [ui nw 1736477 mon 1490 cf 10903; engine 2294565 1840 14455]; h.a.rate=8 [ui nw 1648126 mon 1490 cf 10841; engine 2206214 1840 14393]; h.a.termY=15 [ui nw 1631867 mon 1490 cf 10862; engine 2189955 1840 14414]; h.a.extra=900 [ui nw 1615891 mon 1490 cf 10855; engine 2173979 1840 14407 |
| A04 | Two-way back-solves: payoff->extra, down$->%, and main page follows | 0.95 | 0.95 | 6/6 sub-checks pass |
| A05 | Remove from the MAIN page: Edit mode, confirm, Undo, totals update; removing a funding source leaves the target listed | 1.26 | 1.26 | 10/10 sub-checks pass |
| A06 | Main rows follow list order = buy order (sorted once on first load, owned first); each row carries its buy number; no row says owned or planned; the first asset in the list has no wait line and every later one has | 0.47 | 0.47 | 6/6 sub-checks pass |
| A07 | No "Today" / "20 years" view toggle anywhere (single portfolio snapshot) | 0.32 | 0.32 | 3/3 sub-checks pass |
| A08 | Homes cannot cash-flow negative: warning on the asset page and on the main page; clears when fixed; not shown for non-homes | 0.79 | 0.79 | 7/7 sub-checks pass |
| A09 | Per-row numbers sum to the portfolio headline (cash flow, monthly payments, net worth) on the sample, and match the engine | 0.95 | 0.95 | 7/7 sub-checks pass |
| A10 | Exit and improvements through the UI: Hold/Sell/Merge buttons and fields propagate to rows, KPIs and breakdown | 1.11 | 0.49 | 4/8 sub-checks pass. FAIL: main KPIs follow; row shows sale [sold for $84,952 in 120 mo]; merge: KPIs follow engine, row shows "merges into" [merges into Echo House in 90 mo]; back to Hold restores numbers; improvement budget/lift propagate and show on the row [improve $50,000] |
| A11 | Sample portfolio on screen: all rows, three types, sane finite headline, no unfunded warning, no DTI warning | 0.63 | 0.63 | 6/6 sub-checks pass |
| A12 | Trust funding on screen: every row after the first shows "Funded in N mo by the trust: cash flow $X/mo + borrowing room $Y) · pool of K assets", the numbers match the engine; raising an earlier asset's extra opens later purchases sooner | 0.63 | 0.63 | 3/3 sub-checks pass |
| A13 | FHA 203(k) through the UI: add flow auto-fills rehab + terms, owner-occupied notice, financed-rehab note, Limited cap warning, switching loan option resets | 0.63 | 0.63 | 11/11 sub-checks pass |
| A21 | Main screen: always-visible tab bar Planned | Real | Saved (even when Real is empty), exactly one page at a time, tabs >= 44px at 320/390/430 with no sideways scroll, swipe or tap, page remembered while you move around | 0.95 | 0.95 | 7/7 sub-checks pass |
| A22 | Planned and Real hold the right rows: Planned = planned assets with the plan totals, Real = bought assets only; each page total equals the sum of its rows (and the engine) | 0.95 | 0.83 | 5/6 sub-checks pass. FAIL: Planned totals are the plan totals including everything (engine), with the bought share spelled out under the total row [nw 1660076/2218164] |
| A23 | Setting "Open the app on" (Planned default / Real / Saved) on the Assumptions page with an (i); it survives reload; the app opens on the chosen page | 0.63 | 0.63 | 4/4 sub-checks pass |
| A24 | Saved portfolios: Save current portfolio (name field, default "Plan YYYY-MM-DD", confirm), the card shows name, date, assets, net worth and cash flow from the engine; Open replaces the working portfolio with exactly the saved numbers and Undo brings the previous one back | 1.26 | 1.15 | 11/12 sub-checks pass. FAIL: name field defaults to "Plan <today>" and needs a confirm [Portfolio 1] |
| A25 | Saved portfolios: Rename, Duplicate and Delete (confirm; Cancel keeps it) work, persist after reload, and the empty state returns when the last one is deleted | 0.79 | 0.79 | 7/7 sub-checks pass |
| A26 | Backup includes the saved portfolios and the start-page choice; Restore brings them back (also after the storage was wiped) | 0.79 | 0.79 | 5/5 sub-checks pass |
| A27 | Default plan on screen: net worth at least $125.0M (up to about $130M) and cash flow at least $1.2M a month in year 28, shown in one clear plan line and in the KPIs | 0.63 | 0.63 | 3/3 sub-checks pass |
| A28 | Saving survives a full or blocked storage: a clear message, no crash, the list is unchanged | 0.32 | 0.32 | 2/2 sub-checks pass |
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
| B13 | plan() under 100ms for the sample and 10-asset chain (median of 7) | 0.16 | 0.16 | median 18.5ms |
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
| C04 | Tap targets >= 44x44 (buttons, selects, inputs; label counts for inputs) | 1.33 | 1.28 | 207/213 targets >=44px. Small: main:BUTTON.info"What does Net wort" 32x32; main:BUTTON.info"What does Cash flo" 32x32; main:BUTTON.info"What does DSCR mea" 32x32; asset:BUTTON.info"What does Cash flo" 32x32; asset:BUTTON.info"What does DSCR mea" 32x32; asset:BUTTON.info"What does Cash-on-" 32x32 |
| C05 | All inputs/selects use font-size >= 16px (no iOS zoom) | 0.67 | 0.67 | 43/43 ok  |
| C06 | Asset page reachable in 1 tap, back in 1 tap; adding an asset takes <= 3 taps | 1.33 | 1.33 | 3/3 sub-checks pass |
| C07 | Main page stays compact: <= 150px per ledger row (sample), plan below the ledger | 0.67 | 0.67 | avg row 124px x 23, page 5059px |
| C08 | Text contrast >= 4.5:1 in light and dark mode (main, chart, asset, assumptions, add) | 1.33 | 1.33 | 1299/1299 text elements pass (light 647/647, dark 652/652).  |
| C09 | Summary-first: one concise summary card (single snapshot, short text), plan card collapsible | 1.00 | 1.00 | 3/3 sub-checks pass |
| D01 | Manifest valid; icons load with true declared dimensions | 1.14 | 1.14 | 8/8 sub-checks pass |
| D02 | Service worker (index.html) registers, activates, controls page after reload; precache complete | 1.14 | 1.14 | 3/3 sub-checks pass |
| D03 | Works offline: reload, deep-link, and edit with network off | 1.52 | 1.52 | 4/4 sub-checks pass |
| D04 | Zero external (non-localhost) network requests across every flow | 0.76 | 0.76 | 1011 requests, 0 external  |
| D05 | Data persists across reload and new tab (localStorage rep-v4, v7); no server round-trip | 1.14 | 1.14 | 5/5 sub-checks pass |
| D06 | Backup: Show backup gives valid JSON text; pasted text and file restore state (with confirm); invalid text rejected without damage | 1.52 | 1.52 | 6/6 sub-checks pass |
| D07 | iOS install meta: apple-touch-icon loads, viewport-fit=cover, apple-mobile-web-app-capable, theme-color | 0.38 | 0.38 | 4/4 sub-checks pass |
| D08 | navigator.storage.persist() requested on load | 0.38 | 0.38 | persist() calls: 1 |
| E01 | Edge inputs (59 cases + compound: zero, 100% down, blanks, garbage, negatives, 1e12, caps, sale/merge/improvement fields) leave no NaN/Infinity/undefined in any page or crash | 1.91 | 1.91 | 64/64 sub-checks pass |
| E02 | Remove all assets (main page) -> clean empty state with add action; can add again | 0.96 | 0.96 | 3/3 sub-checks pass |
| E03 | Deleting a funding target clears references (select, storage, plan, merge-into) | 0.96 | 0.96 | 5/5 sub-checks pass |
| E04 | Every input/select/button has an accessible name (main, asset, assumptions, add, import) | 0.64 | 0.64 | 330/330 named. unnamed:  |
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

1. **A03 Edit matrix: every input (43 edits incl. improvements/exit/loan/assumptions) moves the main-page KPIs exactly as the engine says** (-1.83)
   - Detail: 1/44 sub-checks pass. FAIL: h.a.price=400000 [ui nw 1611679 mon 1490 cf 10834; engine 2355797 1840 14236]; h.a.dp=35 [ui nw 1736477 mon 1490 cf 10903; engine 2294565 1840 14455]; h.a.rate=8 [ui nw 1648126 mon 1490 cf 10841; engine 2206214 1840 14393]; h.a.termY=15 [ui nw 1631867 mon 1490 cf 10862; engine 2189955 1840 14414]; h.a.extra=900 [ui nw 1615891 mon 1490 cf 10855; engine 2173979 1840 14407]; h.a.rent=3600 [ui nw 1714135 mon 1490 cf 10875; engine 2272223 1840 15355]; h.a.tax=500 [ui nw 16
   - Reproduce: Edit field on asset/assumptions page; compare main KPIs with Engine.plan(S).horizon on the edited state
2. **A10 Exit and improvements through the UI: Hold/Sell/Merge buttons and fields propagate to rows, KPIs and breakdown** (-0.61)
   - Detail: 4/8 sub-checks pass. FAIL: main KPIs follow; row shows sale [sold for $84,952 in 120 mo]; merge: KPIs follow engine, row shows "merges into" [merges into Echo House in 90 mo]; back to Hold restores numbers; improvement budget/lift propagate and show on the row [improve $50,000]
   - Reproduce: Asset page > Value-add & exit
3. **A02 Changing an asset's loan option re-populates dp/rate/term/closing and changes the plan numbers** (-0.33)
   - Detail: 7/12 sub-checks pass. FAIL: dscr main KPIs equal engine for that loan [ui 1653547/1490 eng 2211636/1840]; conv15 main KPIs equal engine for that loan [ui 1639071/1490 eng 2197159/1840]; fha main KPIs equal engine for that loan [ui 1668339/1490 eng 2226427/1840]; cashh main KPIs equal engine for that loan [ui 1569447/1490 eng 2127535/1840]; conv30 main KPIs equal engine for that loan [ui 1660076/1490 eng 2218164/1840]
   - Reproduce: Asset page > Loan option select
4. **A22 Planned and Real hold the right rows: Planned = planned assets with the plan totals, Real = bought assets only; each page total equals the sum of its rows (and the engine)** (-0.12)
   - Detail: 5/6 sub-checks pass. FAIL: Planned totals are the plan totals including everything (engine), with the bought share spelled out under the total row [nw 1660076/2218164]
   - Reproduce: Mixed portfolio: read both pages
5. **A24 Saved portfolios: Save current portfolio (name field, default "Plan YYYY-MM-DD", confirm), the card shows name, date, assets, net worth and cash flow from the engine; Open replaces the working portfolio with exactly the saved numbers and Undo brings the previous one back** (-0.12)
   - Detail: 11/12 sub-checks pass. FAIL: name field defaults to "Plan <today>" and needs a confirm [Portfolio 1]
   - Reproduce: Saved page: save, edit, save, open, undo
6. **C04 Tap targets >= 44x44 (buttons, selects, inputs; label counts for inputs)** (-0.06)
   - Detail: 207/213 targets >=44px. Small: main:BUTTON.info"What does Net wort" 32x32; main:BUTTON.info"What does Cash flo" 32x32; main:BUTTON.info"What does DSCR mea" 32x32; asset:BUTTON.info"What does Cash flo" 32x32; asset:BUTTON.info"What does DSCR mea" 32x32; asset:BUTTON.info"What does Cash-on-" 32x32
   - Reproduce: Measure interactive elements on main/asset/assumptions/add

## F. Personal finances: **89.84 / 90** (separate scale; a design review adds 10 later; not included in the A-E + R total)

| ID | Check | Pts | Earned | Detail |
|---|---|---|---|---|
| F1 | Engine correctness: independent month-by-month simulation + hand cases + edge values | 26.00 | 26.00 | 16/16 sub-checks pass |
| F2 | Verdict logic and advice | 16.00 | 16.00 | 17/17 sub-checks pass |
| F3 | UI features | 24.00 | 23.84 | 88/89 sub-checks pass. FAIL: an older (v7) save is replaced by the current sample with a profile |
| F4 | Factor coverage: every input moves the answer in the right direction | 14.00 | 14.00 | 24/24 sub-checks pass |
| F5 | Robustness and accessibility | 10.00 | 10.00 | 10/10 sub-checks pass |

### F failures

- **F3 UI features** (-0.16): 88/89 sub-checks pass. FAIL: an older (v7) save is replaced by the current sample with a profile
  - Reproduce: Playwright 390px: finances link, chip, jobs/expenses/capital editing, tooltip, persistence, backup, v8 migration, shared field, empty states

## G. Number sync: **87.90 / 100** (separate scale; not included in the A-E + R total or in F)

| ID | Check | Pts | Earned | Detail |
|---|---|---|---|---|
| G1 | Portfolio internal sync (KPIs = ledger total = rows = breakdown = chart = headline = engine) | 14.00 | 9.76 | 29/41 sub-checks pass. FAIL: KPI net worth = engine plan-horizon value (2/26 ok) [sample: $17.7M vs $21.5M // rand#1: $26.0M vs $66.9M // rand#2: $3,640,569 vs $7,710,088]; KPI monthly payments = engine (3/26 ok) [sample: $5,185 vs $5,755 // rand#1: $327 vs $1,526 // rand#2: $1,643 vs $2,322]; KPI cash flow = engine (2/26 ok) [sample: +$269,059 vs $363,638 // rand#1: +$319,887 vs $528,468 // rand#2: +$26,881 vs $105,887]; KPI DSCR = engine (2 dp), or a dash when no loan payment is left (24/26 ok) [rand#12: 0.79 vs 0.93 // rand#24: 0 vs 39.78]; sum of row payments = KPI monthly payments (2/25 ok) [sample: 5755 vs $5,185 // rand#1: 1526 vs $327 // rand#2: 2322 vs $1,643]; sum of row cash flows = KPI cash flow (1/25 ok) [sample: 363638 vs +$269,059 // rand#1: 528468 vs +$319,887 // rand#2: 105887 vs +$26,881]; sum of row equity + cash from sales = KPI net worth (1/25 ok) [sample: 19415036+2125378.729966328 vs $17.7M // rand#1: 66432185+450816.3133803533 vs $26.0M // rand#2: 6882161+827926.4240205497 vs $3,640,569]; breakdown rows add up to the Portfolio row (net worth and cash flow) (2/26 ok) [sample: ["$1.76M","$5.40M","$12.3M","$2.13M"] vs $17.7M // rand#1: ["$3.03M","$39.9M","$23.5M","$450,816"] vs $26.0M // rand#2: ["$2.05M","$1.21M","$3.62M","$827,926"] vs $3.64M]; cash flow subtext "after extra" = cash flow minus extra (25/26 ok) [rand#12: −$2,773 after extra vs −$1,192]; net worth chart value at the plan horizon = KPI net worth (2/26 ok) [sample: 21540415 vs $17.7M // ran |
| G2 | Asset page <-> Portfolio sync (share line, hero, impact, edits propagate) | 14.00 | 11.21 | 59/71 sub-checks pass. FAIL: impact "with" value = Portfolio page KPI (13/204 ok) [sample ridge: Net worth: with $21.5M vs Portfolio $17.7M // sample north: Net worth: with $21.5M vs Portfolio $17.7M // sample keystone: Net worth: with $21.5M vs Portfolio $17.7M]; KPI net worth = engine plan-horizon value (0/38 ok) [sample after maple.rent=2600: $17.8M vs $21.6M // sample after maple.extra=900: $17.7M vs $21.6M // sample after cedar.price=190000: $17.7M vs $21.6M]; KPI monthly payments = engine (0/38 ok) [sample after maple.rent=2600: $5,185 vs $5,755 // sample after maple.extra=900: $5,185 vs $5,755 // sample after cedar.price=190000: $5,185 vs $5,755]; KPI cash flow = engine (0/38 ok) [sample after maple.rent=2600: +$269,059 vs $364,829 // sample after maple.extra=900: +$269,059 vs $364,829 // sample after cedar.price=190000: +$269,059 vs $364,788]; KPI DSCR = engine (2 dp), or a dash when no loan payment is left (30/38 ok) [rand1 after r0.rent=34411: 1.75 vs 27.88 // rand1 after r0.price=1633600: 1.75 vs 28.2 // rand1 after r0.extra=135: 1.75 vs 28.2]; sum of row payments = KPI monthly payments (0/38 ok) [sample after maple.rent=2600: 5755 vs $5,185 // sample after maple.extra=900: 5755 vs $5,185 // sample after cedar.price=190000: 5755 vs $5,185]; sum of row cash flows = KPI cash flow (0/38 ok) [sample after maple.rent=2600: 364830 vs +$269,059 // sample after maple.extra=900: 364830 vs +$269,059 // sample after cedar.price=190000: 364789 vs +$269,059]; sum of row equity  |
| G3 | Portfolio <-> Finances sync (cash flow, funding, extra scope, verdict, edge cases) | 14.00 | 12.59 | 33/35 sub-checks pass. FAIL: Finances sync-cf = Portfolio KPI cash flow (exact text) (2/40 ok) [sample: +$363,638 vs +$269,059 // rand#1: +$528,468 vs +$319,887 // rand#2: +$105,887 vs +$26,881]; Finances "At plan end" card is headed as plan end and its Before tax = Portfolio KPI cash flow = engine (2/40 ok) [sample: At plan end (same as the Portfolio page)Before tax+$363,638After tax+$234,677Lef / +$363,638 vs $363,638 // rand#1: At plan end (same as the Portfolio page)Before tax+$528,468After tax+$325,050Lef / +$528,468 vs $528,468 // rand#2: At plan end (same as the Portfolio page)Before tax+$105,887After tax+$68,607Left / +$105,887 vs $105,887] |
| G4 | Asset-page field dependencies re-derive after every edit (property-based, 60+ edit sequences) | 18.00 | 18.00 | 34/34 sub-checks pass |
| G5 | Add page <-> created asset (loan option cards, option switching, 203(k) defaults) | 6.00 | 6.00 | 12/12 sub-checks pass |
| G6 | Cross-page navigation & persistence (nav, reload, backup restore, second tab, v8 migration, dark/light) | 12.00 | 9.71 | 10/12 sub-checks pass. FAIL: after reload the Portfolio numbers still equal the engine (0/2 ok) [KPI net worth = engine plan-horizon value: sample after reload: $17.7M vs $21.5M / KPI monthly payments = engine: sample after reload: $5,185 vs $5,755 // KPI net worth = engine plan-horizon value: random after reload: $1,119,508 vs $6,626,302 / KPI monthly payments = engine: random after reload: $918 vs $2,293]; after the v8 migration every Portfolio/Finances number equals the engine and each other (0/1 ok) [KPI net worth = engine plan-horizon value: v8: $17.7M vs $21.6M / KPI monthly payments = engine: v8: $5,185 vs $5,755] |
| G7 | Shared settings (g.* and p.*) propagate to every dependent display | 10.00 | 8.63 | 134/148 sub-checks pass. FAIL: KPI net worth = engine plan-horizon value (0/25 ok) [after g.cap=70: $1,493,808 vs $1,954,550 // after g.dti=25: $1,493,808 vs $1,954,550 // after g.closing=5: $1,484,428 vs $1,945,171]; KPI monthly payments = engine (0/25 ok) [after g.cap=70: $1,190 vs $1,540 // after g.dti=25: $1,190 vs $1,540 // after g.closing=5: $1,190 vs $1,540]; KPI cash flow = engine (0/25 ok) [after g.cap=70: +$10,593 vs $13,007 // after g.dti=25: +$10,593 vs $13,007 // after g.closing=5: +$10,524 vs $12,938]; KPI DSCR = engine (2 dp), or a dash when no loan payment is left (15/25 ok) [after g.planYears=10: 1.53 vs 1.51 // after p.living=4800: 1.14 vs 1.49 // after p.inflation=5: 1.14 vs 1.49]; sum of row payments = KPI monthly payments (0/25 ok) [after g.cap=70: 1540 vs $1,190 // after g.dti=25: 1540 vs $1,190 // after g.closing=5: 1540 vs $1,190]; sum of row cash flows = KPI cash flow (0/25 ok) [after g.cap=70: 13007 vs +$10,593 // after g.dti=25: 13007 vs +$10,593 // after g.closing=5: 12938 vs +$10,524]; sum of row equity + cash from sales = KPI net worth (0/25 ok) [after g.cap=70: 1941563+12988.138297975063 vs $1,493,808 // after g.dti=25: 1941563+12988.138297975063 vs $1,493,808 // after g.closing=5: 1932183+12988.138297975063 vs $1,484,428]; breakdown rows add up to the Portfolio row (net worth and cash flow) (0/25 ok) [after g.cap=70: ["$800,144","$1.14M","$12,988"] vs $1.49M // after g.dti=25: ["$800,144","$1.14M","$12,988"] vs $1.49M // after g.closing=5: ["$8 |
| G8 | No stale / duplicate / contradictory numbers | 12.00 | 12.00 | 10/10 sub-checks pass |

### G failures

- **G1 Portfolio internal sync (KPIs = ledger total = rows = breakdown = chart = headline = engine)** (-4.24): 29/41 sub-checks pass. FAIL: KPI net worth = engine plan-horizon value (2/26 ok) [sample: $17.7M vs $21.5M || rand#1: $26.0M vs $66.9M || rand#2: $3,640,569 vs $7,710,088]; KPI monthly payments = engine (3/26 ok) [sample: $5,185 vs $5,755 || rand#1: $327 vs $1,526 || rand#2: $1,643 vs $2,322]; KPI cash flow = engine (2/26 ok) [sample: +$269,059 vs $363,638 || rand#1: +$319,887 vs $528,468 || rand#2: +$26,881 vs $105,887]; KPI DSCR = engine (2 dp), or a dash when no loan payment is left (24/26 ok) [rand#12: 0.79 vs 0.93 || rand#24: 0 vs 39.78]; sum of row payments = KPI monthly payments (2/25 ok) [sample: 5755 vs $5,185 || rand#1: 1526 vs $327 || rand#2: 2322 vs $1,643]; sum of row cash flows = KPI cash flow (1/25 ok) [sample: 363638 vs +$269,059 || rand#1: 528468 vs +$319,887 || rand#2: 105887 vs +$26,881]; sum of row equity + cash from sales = KPI net worth (1/25 ok) [sample: 19415036+2125378.729966328 vs $17.7M || rand#1: 66432185+450816.3133803533 vs $26.0M || rand#2: 6882161+827926.4240205497 vs $3,640,569]; breakdown rows add up to the Portfolio row (net worth and cash flow) (2/26 ok) [sample: ["$1.76M","$5.40M","$12.3M","$2.13M"] vs $17.7M || rand#1: ["$3.03M","$39.9M","$23.5M","$450,816"] vs $26.0M || rand#2: ["$2.05M","$1.21M","$3.62M","$827,926"] vs $3.64M]; cash flow subtext "after extra" = cash flow minus extra (25/26 ok) [rand#12: −$2,773 after extra vs −$1,192]; net worth chart value at the plan horizon = KPI net worth (2/26 ok) [sample: 21540415 vs $17.7M || ran
  - Reproduce: Open the Portfolio page for the sample and 25 random states; compare every number that represents the same quantity (see sync-grade.js chkPortfolio)
- **G2 Asset page <-> Portfolio sync (share line, hero, impact, edits propagate)** (-2.79): 59/71 sub-checks pass. FAIL: impact "with" value = Portfolio page KPI (13/204 ok) [sample ridge: Net worth: with $21.5M vs Portfolio $17.7M || sample north: Net worth: with $21.5M vs Portfolio $17.7M || sample keystone: Net worth: with $21.5M vs Portfolio $17.7M]; KPI net worth = engine plan-horizon value (0/38 ok) [sample after maple.rent=2600: $17.8M vs $21.6M || sample after maple.extra=900: $17.7M vs $21.6M || sample after cedar.price=190000: $17.7M vs $21.6M]; KPI monthly payments = engine (0/38 ok) [sample after maple.rent=2600: $5,185 vs $5,755 || sample after maple.extra=900: $5,185 vs $5,755 || sample after cedar.price=190000: $5,185 vs $5,755]; KPI cash flow = engine (0/38 ok) [sample after maple.rent=2600: +$269,059 vs $364,829 || sample after maple.extra=900: +$269,059 vs $364,829 || sample after cedar.price=190000: +$269,059 vs $364,788]; KPI DSCR = engine (2 dp), or a dash when no loan payment is left (30/38 ok) [rand1 after r0.rent=34411: 1.75 vs 27.88 || rand1 after r0.price=1633600: 1.75 vs 28.2 || rand1 after r0.extra=135: 1.75 vs 28.2]; sum of row payments = KPI monthly payments (0/38 ok) [sample after maple.rent=2600: 5755 vs $5,185 || sample after maple.extra=900: 5755 vs $5,185 || sample after cedar.price=190000: 5755 vs $5,185]; sum of row cash flows = KPI cash flow (0/38 ok) [sample after maple.rent=2600: 364830 vs +$269,059 || sample after maple.extra=900: 364830 vs +$269,059 || sample after cedar.price=190000: 364789 vs +$269,059]; sum of row equity 
  - Reproduce: For several assets per state: asset-share line == Portfolio row; impact "with" == KPIs; then edit asset inputs and re-check every Portfolio number
- **G3 Portfolio <-> Finances sync (cash flow, funding, extra scope, verdict, edge cases)** (-1.41): 33/35 sub-checks pass. FAIL: Finances sync-cf = Portfolio KPI cash flow (exact text) (2/40 ok) [sample: +$363,638 vs +$269,059 || rand#1: +$528,468 vs +$319,887 || rand#2: +$105,887 vs +$26,881]; Finances "At plan end" card is headed as plan end and its Before tax = Portfolio KPI cash flow = engine (2/40 ok) [sample: At plan end (same as the Portfolio page)Before tax+$363,638After tax+$234,677Lef | +$363,638 vs $363,638 || rand#1: At plan end (same as the Portfolio page)Before tax+$528,468After tax+$325,050Lef | +$528,468 vs $528,468 || rand#2: At plan end (same as the Portfolio page)Before tax+$105,887After tax+$68,607Left | +$105,887 vs $105,887]
  - Reproduce: Compare #finances with the Portfolio page and E.finance for the sample, 25 random states, 4 planned-extra edge cases and after editing job / cash / expense
- **G6 Cross-page navigation & persistence (nav, reload, backup restore, second tab, v8 migration, dark/light)** (-2.29): 10/12 sub-checks pass. FAIL: after reload the Portfolio numbers still equal the engine (0/2 ok) [KPI net worth = engine plan-horizon value: sample after reload: $17.7M vs $21.5M | KPI monthly payments = engine: sample after reload: $5,185 vs $5,755 || KPI net worth = engine plan-horizon value: random after reload: $1,119,508 vs $6,626,302 | KPI monthly payments = engine: random after reload: $918 vs $2,293]; after the v8 migration every Portfolio/Finances number equals the engine and each other (0/1 ok) [KPI net worth = engine plan-horizon value: v8: $17.7M vs $21.6M | KPI monthly payments = engine: v8: $5,185 vs $5,755]
  - Reproduce: Digest every page; navigate around, reload, export a backup, edit, restore, open a second tab, load a v8 save, toggle dark mode; numbers must be identical / correct
- **G7 Shared settings (g.* and p.*) propagate to every dependent display** (-1.37): 134/148 sub-checks pass. FAIL: KPI net worth = engine plan-horizon value (0/25 ok) [after g.cap=70: $1,493,808 vs $1,954,550 || after g.dti=25: $1,493,808 vs $1,954,550 || after g.closing=5: $1,484,428 vs $1,945,171]; KPI monthly payments = engine (0/25 ok) [after g.cap=70: $1,190 vs $1,540 || after g.dti=25: $1,190 vs $1,540 || after g.closing=5: $1,190 vs $1,540]; KPI cash flow = engine (0/25 ok) [after g.cap=70: +$10,593 vs $13,007 || after g.dti=25: +$10,593 vs $13,007 || after g.closing=5: +$10,524 vs $12,938]; KPI DSCR = engine (2 dp), or a dash when no loan payment is left (15/25 ok) [after g.planYears=10: 1.53 vs 1.51 || after p.living=4800: 1.14 vs 1.49 || after p.inflation=5: 1.14 vs 1.49]; sum of row payments = KPI monthly payments (0/25 ok) [after g.cap=70: 1540 vs $1,190 || after g.dti=25: 1540 vs $1,190 || after g.closing=5: 1540 vs $1,190]; sum of row cash flows = KPI cash flow (0/25 ok) [after g.cap=70: 13007 vs +$10,593 || after g.dti=25: 13007 vs +$10,593 || after g.closing=5: 12938 vs +$10,524]; sum of row equity + cash from sales = KPI net worth (0/25 ok) [after g.cap=70: 1941563+12988.138297975063 vs $1,493,808 || after g.dti=25: 1941563+12988.138297975063 vs $1,493,808 || after g.closing=5: 1932183+12988.138297975063 vs $1,484,428]; breakdown rows add up to the Portfolio row (net worth and cash flow) (0/25 ok) [after g.cap=70: ["$800,144","$1.14M","$12,988"] vs $1.49M || after g.dti=25: ["$800,144","$1.14M","$12,988"] vs $1.49M || after g.closing=5: ["$8
  - Reproduce: Edit each Assumptions / Finances setting through the UI; Portfolio, asset pages and Finances must re-derive (cap, DTI, closing, growth default, projection length, other debts, vacancy / mgmt / repairs, ...)

## H. Help buttons and hourly jobs: **99.42 / 100** (separate scale; not included in the A-E + R total, F or G)

| ID | Check | Pts | Earned | Detail |
|---|---|---|---|---|
| H1 | Glossary integrity: complete entries, plain wording, every label / loan mapped to a real and sensible entry, acronyms explained | 8.00 | 8.00 | 9/9 sub-checks pass |
| H2 | Info-button coverage: every jargon label on every page (Portfolio, asset types, Assumptions, Finances, Add) has an (i) with the right definition; no orphan glossary entries | 16.00 | 16.00 | 91/91 sub-checks pass |
| H3 | Info sheet: opens with the right content, closes by button / Escape / backdrop / navigation, accessible names and roles, keyboard, contrast, fits small screens, never changes data | 16.00 | 16.00 | 22/22 sub-checks pass |
| H4 | Definitions are accurate: numbers quoted match the engine constants and loan table, examples do their own arithmetic, stated rules behave that way in the engine | 16.00 | 16.00 | 42/42 sub-checks pass |
| H5 | Hourly jobs: add, gross = (wage + tips) x hours x weeks, automatic vs typed tax, blank tax returns to automatic, temporary end month, switching kind, clamps, persistence | 12.00 | 12.00 | 28/28 sub-checks pass |
| H6 | Optional fields left blank never break the plan or the finance verdict (job extras, improvements, exit fields, co-signers) | 8.00 | 7.42 | 15/16 sub-checks pass. FAIL: Portfolio net worth still equals the engine after those fields were blanked [$17.7M vs 21508891] |
| H7 | Old saves migrate: v8 (assets only) and pre-hourly jobs (no kind / wage / tips / weeks) load, keep their numbers and show correctly | 6.00 | 6.00 | 10/10 sub-checks pass |
| H8 | Automatic tax estimate: matches an independent 2026 single-filer calculation (IRS Rev. Proc. 2025-32, Pub. 15) (federal after standard deduction + Social Security + Medicare, no state tax), is monotone and bounded | 6.00 | 6.00 | 6/6 sub-checks pass |
| H9 | Disclosure defaults and new wording: collapsed sections open on tap (and stay open), renamed labels, Hold/Sell/Merge + Status, loan grouping, import preview title | 8.00 | 8.00 | 12/12 sub-checks pass |
| H10 | Clean run: no console / page errors and no network requests outside localhost during all help and hourly-job flows | 4.00 | 4.00 | 2/2 sub-checks pass |

### H failures

- **H6 Optional fields left blank never break the plan or the finance verdict (job extras, improvements, exit fields, co-signers)** (-0.58): 15/16 sub-checks pass. FAIL: Portfolio net worth still equals the engine after those fields were blanked [$17.7M vs 21508891]
  - Reproduce: Blank every optional field in turn; compare saved state, verdict and plan with the engine; scan for NaN

## I. Portfolio sections, gestures and funding order: **100.00 / 100** (separate scale; not included in A-E + R, F, G or H)

| ID | Check | Pts | Earned | Detail |
|---|---|---|---|---|
| I1 | Swipe right from the left edge goes back like iOS (touchstart within 24 px, dx > 70, |dy| < 45); ignored elsewhere | 12.00 | 12.00 | 9/9 sub-checks pass |
| I2 | Press-and-hold then drag reorders a row inside its category (mouse and touch); list order is saved; a plain tap still opens the panel | 14.00 | 14.00 | 14/14 sub-checks pass |
| I3 | Move up / Move down buttons in the row panel (accessible alternative): reorder, disabled at the ends, panel stays open | 8.00 | 8.00 | 8/8 sub-checks pass |
| I4 | Funding follows the list order by itself: the trust funds each asset from everything before it (1,2,3 and 1,3,2), the wait lines and purchase months re-work after each move, nothing is stored per asset, no per-asset Funds picker, no re-link on plain load | 16.00 | 16.00 | 10/10 sub-checks pass |
| I5 | Duplicate: from the row panel and the asset page; copy sits right after the original, named "(copy)", planned, funded by the trust like any later asset | 10.00 | 10.00 | 6/6 sub-checks pass |
| I6 | Portfolio = total row + Homes / Commercial / Businesses dropdowns (name left, chevron right, stat strip: count, before/after loan, worth, DSCR, lasts), empty sections, Sold section only when something sold | 12.00 | 12.00 | 12/12 sub-checks pass |
| I7 | Selecting a row opens a nested panel with the extra payment and live effects: loan term, monthly payment, next down payment (with cash flow); all match the engine and the asset page | 12.00 | 12.00 | 24/24 sub-checks pass |
| I8 | Rent & expenses shows the loan payment (P&I + mortgage insurance, extra) and the cash flow after the loan, in sync with Payment now / Cash flow now | 6.00 | 6.00 | 6/6 sub-checks pass |
| I9 | Swipe down closes the keyboard (blurs the focused field); Enter / Done also closes it; swipes inside the field or upward do not | 6.00 | 6.00 | 6/6 sub-checks pass |
| I10 | Layout and hygiene: no sideways scroll at 320 / 390 / 430 with a panel open and while dragging, new buttons >= 44 px, no console errors or outside requests | 4.00 | 4.00 | 4/4 sub-checks pass |

### I failures

None.
