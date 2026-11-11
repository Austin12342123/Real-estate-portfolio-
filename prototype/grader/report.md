# Prototype grader report

Target: `prototype/v4`  |  Run: 2026-11-11T03:42:21.976Z  |  257s

## Automated score: **83.39 / 84.99900000000001** (a separate design review adds 15)

| Category | Score |
|---|---|
| A. Requirement / propagation | 17.81 / 18.00 |
| B. Engine correctness | 12.00 / 12.00 |
| C. UX conciseness & usability | 8.58 / 10.00 |
| D. PWA / local-first | 8.00 / 8.00 |
| E. Robustness & accessibility | 7.00 / 7.00 |
| R. Realism & market accuracy | 30.00 / 30.00 |

## All checks

| ID | Check | Pts | Earned | Detail |
|---|---|---|---|---|
| A01 | Add flow: each type x each loan option auto-fills dp/rate/term/closing, opens the asset page, adds a ledger row and changes plan numbers | 1.95 | 1.95 | 3/3 sub-checks pass |
| A02 | Changing an asset's loan option re-populates dp/rate/term/closing and changes the plan numbers | 1.22 | 1.22 | 12/12 sub-checks pass |
| A03 | Edit matrix: every input (43 edits incl. improvements/exit/loan/assumptions) moves the main-page KPIs exactly as the engine says | 2.92 | 2.92 | 44/44 sub-checks pass |
| A04 | Two-way back-solves: payoff->extra, down$->%, and main page follows | 1.46 | 1.46 | 6/6 sub-checks pass |
| A05 | Remove from the MAIN page: Edit mode, confirm, Undo, totals update; removing a funding source leaves the target listed | 1.95 | 1.95 | 10/10 sub-checks pass |
| A06 | Main rows follow list order = buy order (sorted once on first load, owned first); each row carries its buy number; no row says owned or planned; the first asset in the list has no wait line and every later one has | 0.73 | 0.54 | 5/6 sub-checks pass. FAIL: the very first asset in the list shows no wait line; every later asset shows one (Funded in N mo by the trust / Owned today / Bought in / Not funded) [first:  later without: ] |
| A07 | No "Today" / "20 years" view toggle anywhere (single portfolio snapshot) | 0.49 | 0.49 | 3/3 sub-checks pass |
| A08 | Homes cannot cash-flow negative: warning on the asset page and on the main page; clears when fixed; not shown for non-homes | 1.22 | 1.22 | 7/7 sub-checks pass |
| A09 | Per-row numbers sum to the portfolio headline (cash flow, monthly payments, net worth) on the sample, and match the engine | 1.46 | 1.46 | 7/7 sub-checks pass |
| A10 | Exit and improvements through the UI: Hold/Sell/Merge buttons and fields propagate to rows, KPIs and breakdown | 1.70 | 1.70 | 8/8 sub-checks pass |
| A11 | Sample portfolio on screen: all rows, three types, sane finite headline, no unfunded warning, no DTI warning | 0.97 | 0.97 | 6/6 sub-checks pass |
| A12 | Trust funding on screen: every row after the first shows "Funded in N mo by the trust: cash flow $X/mo + borrowing room $Y) · pool of K assets", the numbers match the engine; raising an earlier asset's extra opens later purchases sooner | 0.97 | 0.97 | 3/3 sub-checks pass |
| A13 | FHA 203(k) through the UI: add flow auto-fills rehab + terms, owner-occupied notice, financed-rehab note, Limited cap warning, switching loan option resets | 0.97 | 0.97 | 11/11 sub-checks pass |
| B01 | P&I for 240k @6.5% 30y = 1516.96 | 0.32 | 0.32 | got 1516.9632563831167 |
| B02 | Scheduled balance after 60 mo = 224666.35 | 0.32 | 0.32 | 2/2 sub-checks pass |
| B03 | Balance after 60 mo with +500 extra = 189329.36 | 0.32 | 0.32 | got 189329.36208686503 |
| B04 | Payoff months with +500 extra = 192 | 0.32 | 0.32 | got 192 (scheduled: 360) |
| B05 | LOC months (D=60k) extra 0/500/1000 = 140/55/34 | 0.64 | 0.64 | 3/3 sub-checks pass |
| B06 | extraFor 24 mo = 1543.87, 36 mo = 918.49 | 0.64 | 0.64 | 3/3 sub-checks pass |
| B07 | Growth 3%: LOC months extra 0/500 = 48/32 (growth on asset, or g.appr with growth null; the home's saved cash flow grows with its rent, so it starts saving once rent growth passes the payment) | 0.48 | 0.48 | 4/4 sub-checks pass |
| B08 | More extra never delays LOC (monotone, 0..3000 step 50) | 0.32 | 0.32 | 2/2 sub-checks pass |
| B09 | Purchase order follows the list (A, B, C, D): the trust buys each when the pool of everything before it can pay; months never go backwards; later purchases wait for earlier ones; liens on an earlier asset delay the later ones | 0.48 | 0.48 | 5/5 sub-checks pass |
| B10 | No NaN/Infinity leaks in plan series & KPIs (23 edge scenarios) | 0.64 | 0.64 | 23/23 sub-checks pass |
| B11 | Funding cycles (A<->B, A->A, 3-cycle) do not hang or throw | 0.32 | 0.32 | ok 0,49/0/0,49,72/49,0 |
| B12 | Net worth at t=0 = sum(value - balance - liens) of assets held at t=0 | 0.32 | 0.32 | 2/2 sub-checks pass |
| B13 | plan() under 100ms for the sample and 10-asset chain (median of 7) | 0.16 | 0.16 | median 7.8ms |
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
| C01 | At 390x844: summary KPIs, plan headline and the first ledger rows are visible without scrolling | 1.33 | 0.87 | 2/3 sub-checks pass. FAIL: first ledger row visible |
| C02 | Main page keeps text inputs out of the list: no inputs until a row is selected, then exactly one extra field (none for a sold row) | 1.00 | 0.11 | 1/5 sub-checks pass. FAIL: no text input anywhere on the Portfolio page until a row is selected [2]; selecting an asset shows exactly one extra-payment field, inside its panel; tapping the row again closes the panel; a sold asset has no Extra button and no extra field |
| C03 | No horizontal overflow at 320/390/430 on main, asset, assumptions, add, import | 1.33 | 1.33 | 15/15 sub-checks pass |
| C04 | Tap targets >= 44x44 (buttons, selects, inputs; label counts for inputs) | 1.33 | 1.27 | 185/191 targets >=44px. Small: main:BUTTON.info"What does Net wort" 32x32; main:BUTTON.info"What does Cash flo" 32x32; main:BUTTON.info"What does DSCR mea" 32x32; asset:BUTTON.info"What does Cash flo" 32x32; asset:BUTTON.info"What does DSCR mea" 32x32; asset:BUTTON.info"What does Cash-on-" 32x32 |
| C05 | All inputs/selects use font-size >= 16px (no iOS zoom) | 0.67 | 0.67 | 44/44 ok  |
| C06 | Asset page reachable in 1 tap, back in 1 tap; adding an asset takes <= 3 taps | 1.33 | 1.33 | 3/3 sub-checks pass |
| C07 | Main page stays compact: <= 150px per ledger row (sample), plan below the ledger | 0.67 | 0.67 | avg row 125px x 19, page 4629px |
| C08 | Text contrast >= 4.5:1 in light and dark mode (main, chart, asset, assumptions, add) | 1.33 | 1.33 | 1173/1173 text elements pass (light 584/584, dark 589/589).  |
| C09 | Summary-first: one concise summary card (single snapshot, short text), plan card collapsible | 1.00 | 1.00 | 3/3 sub-checks pass |
| D01 | Manifest valid; icons load with true declared dimensions | 1.14 | 1.14 | 8/8 sub-checks pass |
| D02 | Service worker (index.html) registers, activates, controls page after reload; precache complete | 1.14 | 1.14 | 3/3 sub-checks pass |
| D03 | Works offline: reload, deep-link, and edit with network off | 1.52 | 1.52 | 4/4 sub-checks pass |
| D04 | Zero external (non-localhost) network requests across every flow | 0.76 | 0.76 | 896 requests, 0 external  |
| D05 | Data persists across reload and new tab (localStorage rep-v4, v7); no server round-trip | 1.14 | 1.14 | 5/5 sub-checks pass |
| D06 | Backup: Show backup gives valid JSON text; pasted text and file restore state (with confirm); invalid text rejected without damage | 1.52 | 1.52 | 6/6 sub-checks pass |
| D07 | iOS install meta: apple-touch-icon loads, viewport-fit=cover, apple-mobile-web-app-capable, theme-color | 0.38 | 0.38 | 4/4 sub-checks pass |
| D08 | navigator.storage.persist() requested on load | 0.38 | 0.38 | persist() calls: 1 |
| E01 | Edge inputs (57 cases + compound: zero, 100% down, blanks, garbage, negatives, 1e12, caps, sale/merge/improvement fields) leave no NaN/Infinity/undefined in any page or crash | 1.91 | 1.91 | 62/62 sub-checks pass |
| E02 | Remove all assets (main page) -> clean empty state with add action; can add again | 0.96 | 0.96 | 3/3 sub-checks pass |
| E03 | Deleting a funding target clears references (select, storage, plan, merge-into) | 0.96 | 0.96 | 5/5 sub-checks pass |
| E04 | Every input/select/button has an accessible name (main, asset, assumptions, add, import) | 0.64 | 0.64 | 308/308 named. unnamed:  |
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
| R07 | [judgment] Projected net worth does not depend on growth above realistic ceilings (homes 4.5%, commercial 5.5%, businesses 12% a year) | 4.00 | 4.00 | projected $19.7M vs $19.7M at realistic growth = 100%. Above ceiling: none |
| R08 | [secondary] Flips and improvements have believable economics (ATTOM: ~21.5% gross margin on flips); lifts are bounded | 1.50 | 1.50 | 5/5 sub-checks pass |
| R09 | [secondary] Selling and closing costs match market norms (agent 5-7%, commercial broker 2-6%, business broker ~Double Lehman, closing 1.5-5%) | 2.50 | 2.50 | 18/18 sub-checks pass |
| R10 | [secondary+judgment] Financing capacity: each loan fits lender net-worth rules, outside cash stays small, deal pace is executable | 4.00 | 4.00 | 7/7 sub-checks pass |

## Top failures

1. **C02 Main page keeps text inputs out of the list: no inputs until a row is selected, then exactly one extra field (none for a sold row)** (-0.89)
   - Detail: 1/5 sub-checks pass. FAIL: no text input anywhere on the Portfolio page until a row is selected [2]; selecting an asset shows exactly one extra-payment field, inside its panel; tapping the row again closes the panel; a sold asset has no Extra button and no extra field
   - Reproduce: Count visible <input> on main before / after selecting a row (sample, and after adding 3)
2. **C01 At 390x844: summary KPIs, plan headline and the first ledger rows are visible without scrolling** (-0.47)
   - Detail: 2/3 sub-checks pass. FAIL: first ledger row visible
   - Reproduce: Open main at 390x844
3. **A06 Main rows follow list order = buy order (sorted once on first load, owned first); each row carries its buy number; no row says owned or planned; the first asset in the list has no wait line and every later one has** (-0.19)
   - Detail: 5/6 sub-checks pass. FAIL: the very first asset in the list shows no wait line; every later asset shows one (Funded in N mo by the trust / Owned today / Bought in / Not funded) [first:  later without: ]
   - Reproduce: Main ledger on the default plan and on a small state
4. **C04 Tap targets >= 44x44 (buttons, selects, inputs; label counts for inputs)** (-0.06)
   - Detail: 185/191 targets >=44px. Small: main:BUTTON.info"What does Net wort" 32x32; main:BUTTON.info"What does Cash flo" 32x32; main:BUTTON.info"What does DSCR mea" 32x32; asset:BUTTON.info"What does Cash flo" 32x32; asset:BUTTON.info"What does DSCR mea" 32x32; asset:BUTTON.info"What does Cash-on-" 32x32
   - Reproduce: Measure interactive elements on main/asset/assumptions/add

## F. Personal finances: **90.00 / 90** (separate scale; a design review adds 10 later; not included in the A-E + R total)

| ID | Check | Pts | Earned | Detail |
|---|---|---|---|---|
| F1 | Engine correctness: independent month-by-month simulation + hand cases + edge values | 26.00 | 26.00 | 16/16 sub-checks pass |
| F2 | Verdict logic and advice | 16.00 | 16.00 | 17/17 sub-checks pass |
| F3 | UI features | 24.00 | 24.00 | 89/89 sub-checks pass |
| F4 | Factor coverage: every input moves the answer in the right direction | 14.00 | 14.00 | 23/23 sub-checks pass |
| F5 | Robustness and accessibility | 10.00 | 10.00 | 10/10 sub-checks pass |

### F failures

None.

## G. Number sync: **100.00 / 100** (separate scale; not included in the A-E + R total or in F)

| ID | Check | Pts | Earned | Detail |
|---|---|---|---|---|
| G1 | Portfolio internal sync (KPIs = ledger total = rows = breakdown = chart = headline = engine) | 14.00 | 14.00 | 42/42 sub-checks pass |
| G2 | Asset page <-> Portfolio sync (share line, hero, impact, edits propagate) | 14.00 | 14.00 | 72/72 sub-checks pass |
| G3 | Portfolio <-> Finances sync (cash flow, funding, extra scope, verdict, edge cases) | 14.00 | 14.00 | 35/35 sub-checks pass |
| G4 | Asset-page field dependencies re-derive after every edit (property-based, 60+ edit sequences) | 18.00 | 18.00 | 33/33 sub-checks pass |
| G5 | Add page <-> created asset (loan option cards, option switching, 203(k) defaults) | 6.00 | 6.00 | 12/12 sub-checks pass |
| G6 | Cross-page navigation & persistence (nav, reload, backup restore, second tab, v8 migration, dark/light) | 12.00 | 12.00 | 12/12 sub-checks pass |
| G7 | Shared settings (g.* and p.*) propagate to every dependent display | 10.00 | 10.00 | 149/149 sub-checks pass |
| G8 | No stale / duplicate / contradictory numbers | 12.00 | 12.00 | 10/10 sub-checks pass |

### G failures

None.

## H. Help buttons and hourly jobs: **100.00 / 100** (separate scale; not included in the A-E + R total, F or G)

| ID | Check | Pts | Earned | Detail |
|---|---|---|---|---|
| H1 | Glossary integrity: complete entries, plain wording, every label / loan mapped to a real and sensible entry, acronyms explained | 8.00 | 8.00 | 9/9 sub-checks pass |
| H2 | Info-button coverage: every jargon label on every page (Portfolio, asset types, Assumptions, Finances, Add) has an (i) with the right definition; no orphan glossary entries | 16.00 | 16.00 | 86/86 sub-checks pass |
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

## I. Portfolio sections, gestures and funding order: **97.20 / 100** (separate scale; not included in A-E + R, F, G or H)

| ID | Check | Pts | Earned | Detail |
|---|---|---|---|---|
| I1 | Swipe right from the left edge goes back like iOS (touchstart within 24 px, dx > 70, |dy| < 45); ignored elsewhere | 12.00 | 12.00 | 9/9 sub-checks pass |
| I2 | Press-and-hold then drag reorders a row inside its category (mouse and touch); list order is saved; a plain tap still opens the panel | 14.00 | 11.20 | 12/13 sub-checks pass. FAIL: drop puts maple after cedar in the list [cedar,birch,willow,linden,maple] |
| I3 | Move up / Move down buttons in the row panel (accessible alternative): reorder, disabled at the ends, panel stays open | 8.00 | 8.00 | 7/7 sub-checks pass |
| I4 | Funding follows the list order by itself: the trust funds each asset from everything before it (1,2,3 and 1,3,2), the wait lines and purchase months re-work after each move, nothing is stored per asset, no per-asset Funds picker, no re-link on plain load | 16.00 | 16.00 | 10/10 sub-checks pass |
| I5 | Duplicate: from the row panel and the asset page; copy sits right after the original, named "(copy)", planned, funded by the trust like any later asset | 10.00 | 10.00 | 6/6 sub-checks pass |
| I6 | Portfolio = total row + Homes / Commercial / Businesses dropdowns (name left, chevron right, stat strip: count, before/after loan, worth, DSCR, lasts), empty sections, Sold section only when something sold | 12.00 | 12.00 | 12/12 sub-checks pass |
| I7 | Selecting a row opens a nested panel with the extra payment and live effects: loan term, monthly payment, next down payment (with cash flow); all match the engine and the asset page | 12.00 | 12.00 | 24/24 sub-checks pass |
| I8 | Rent & expenses shows the loan payment (P&I + mortgage insurance, extra) and the cash flow after the loan, in sync with Payment now / Cash flow now | 6.00 | 6.00 | 6/6 sub-checks pass |
| I9 | Swipe down closes the keyboard (blurs the focused field); Enter / Done also closes it; swipes inside the field or upward do not | 6.00 | 6.00 | 6/6 sub-checks pass |
| I10 | Layout and hygiene: no sideways scroll at 320 / 390 / 430 with a panel open and while dragging, new buttons >= 44 px, no console errors or outside requests | 4.00 | 4.00 | 4/4 sub-checks pass |

### I failures

- **I2 Press-and-hold then drag reorders a row inside its category (mouse and touch); list order is saved; a plain tap still opens the panel** (-2.80): 12/13 sub-checks pass. FAIL: drop puts maple after cedar in the list [cedar,birch,willow,linden,maple]
  - Reproduce: Hold 600 ms, drag, release; check saved order
