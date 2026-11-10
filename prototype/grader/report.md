# Prototype grader report

Target: `prototype/v4`  |  Run: 2026-11-10T09:32:11.275Z  |  173s

## Automated score: **70.17 / 84.99900000000001** (a separate design review adds 15)

| Category | Score |
|---|---|
| A. Requirement / propagation | 11.03 / 18.00 |
| B. Engine correctness | 12.00 / 12.00 |
| C. UX conciseness & usability | 7.44 / 10.00 |
| D. PWA / local-first | 5.91 / 8.00 |
| E. Robustness & accessibility | 3.79 / 7.00 |
| R. Realism & market accuracy | 30.00 / 30.00 |

## All checks

| ID | Check | Pts | Earned | Detail |
|---|---|---|---|---|
| A01 | Add flow: each type x each loan option auto-fills dp/rate/term/closing, opens the asset page, adds a ledger row and changes plan numbers | 1.95 | 0.29 | 1/3 sub-checks pass. FAIL: all 14 type/loan combinations fill terms, open page, add row, change plan (13 ok) [cashh rows 22->23 nw 127400000->127400000]; new assets stored as planned [31] |
| A02 | Changing an asset's loan option re-populates dp/rate/term/closing and changes the plan numbers | 1.22 | 1.22 | 12/12 sub-checks pass |
| A03 | Edit matrix: every input (43 edits incl. improvements/exit/loan/assumptions) moves the main-page KPIs exactly as the engine says | 2.92 | 2.92 | 44/44 sub-checks pass |
| A04 | Two-way back-solves: wait-months->extra, payoff->extra, down$->%, and main page follows | 1.46 | 1.27 | 7/8 sub-checks pass. FAIL: main row shows extra and "opens in 24 mo" [133 / ] |
| A05 | Remove from the MAIN page: Edit mode, confirm, Undo, totals update; removing a funding source leaves the target listed | 1.95 | 0.00 | CRASH in check: page.click: Timeout 4000ms exceeded. Call log: [2m  - waiting for locator('[data-for="a"] [data-testid=row-remove]')[22m  |
| A06 | Main rows follow list order = buy order (sorted once on first load, owned first); tags match the engine's purchase months | 0.73 | 0.32 | 2/5 sub-checks pass. FAIL: owned homes come first in the Homes list (owned tag has no "· buy" part) [0]; row tags equal Engine purchase months; small state: list order sorted by month once, tags equal the engine [a:0,e:0,b:0,c:0,d:0] |
| A07 | No "Today" / "20 years" view toggle anywhere (single portfolio snapshot) | 0.49 | 0.49 | 3/3 sub-checks pass |
| A08 | Homes cannot cash-flow negative: warning on the asset page and on the main page; clears when fixed; not shown for non-homes | 1.22 | 1.22 | 7/7 sub-checks pass |
| A09 | Per-row numbers sum to the portfolio headline (cash flow, monthly payments, net worth) on the sample, and match the engine | 1.46 | 0.00 | CRASH in check: page.waitForSelector: Timeout 4000ms exceeded. Call log: [2m  - waiting for locator('[data-for="maple"] [data-testid=extra-input]') to be visible[22m  |
| A10 | Exit and improvements through the UI: Hold/Sell/Merge buttons and fields propagate to rows, KPIs and breakdown | 1.70 | 1.70 | 8/8 sub-checks pass |
| A11 | Sample portfolio on screen: all rows, three types, sane finite headline, no unfunded warning, no DTI warning | 0.97 | 0.63 | 4/6 sub-checks pass. FAIL: 14 ledger rows [17]; Home / Comm. / Biz rows present |
| A12 | Credit-line chain on screen: "opens in N mo" and buy months match the engine; raising source extra opens sooner | 0.97 | 0.00 | CRASH in check: page.waitForSelector: Timeout 4000ms exceeded. Call log: [2m  - waiting for locator('[data-for="a"] [data-testid=extra-input]') to be visible[22m  |
| A13 | FHA 203(k) through the UI: add flow auto-fills rehab + terms, owner-occupied notice, financed-rehab note, Limited cap warning, switching loan option resets | 0.97 | 0.97 | 11/11 sub-checks pass |
| B01 | P&I for 240k @6.5% 30y = 1516.96 | 0.32 | 0.32 | got 1516.9632563831167 |
| B02 | Scheduled balance after 60 mo = 224666.35 | 0.32 | 0.32 | 2/2 sub-checks pass |
| B03 | Balance after 60 mo with +500 extra = 189329.36 | 0.32 | 0.32 | got 189329.36208686503 |
| B04 | Payoff months with +500 extra = 192 | 0.32 | 0.32 | got 192 (scheduled: 360) |
| B05 | LOC months (D=60k) extra 0/500/1000 = 140/55/34 | 0.64 | 0.64 | 3/3 sub-checks pass |
| B06 | extraFor 24 mo = 1543.87, 36 mo = 918.49 | 0.64 | 0.64 | 3/3 sub-checks pass |
| B07 | Growth 3%: LOC months extra 0/500 = 50/32 (growth on asset, or g.appr with growth null) | 0.48 | 0.48 | 4/4 sub-checks pass |
| B08 | More extra never delays LOC (monotone, 0..3000 step 50) | 0.32 | 0.32 | 2/2 sub-checks pass |
| B09 | Purchase order respects chain (A->B->C->D, LOC month additive) | 0.48 | 0.48 | 5/5 sub-checks pass |
| B10 | No NaN/Infinity leaks in plan series & KPIs (23 edge scenarios) | 0.64 | 0.64 | 23/23 sub-checks pass |
| B11 | Funding cycles (A<->B, A->A, 3-cycle) do not hang or throw | 0.32 | 0.32 | ok Infinity,Infinity/0/0,49,98/49,0 |
| B12 | Net worth at t=0 = sum(value - balance - liens) of assets held at t=0 | 0.32 | 0.32 | 2/2 sub-checks pass |
| B13 | plan() under 100ms for the sample and 10-asset chain (median of 7) | 0.16 | 0.16 | median 2.6ms |
| B14 | locMonths matches independent month-by-month simulation (60 random scenarios incl. liens/haircut/appr/paid) | 0.48 | 0.48 | exact 60/60, within1 60/60  |
| B15 | Debt cap: every credit-line funder stays within cap (loan + liens + drawn LOC) when its target closes | 0.48 | 0.48 | 3/3 sub-checks pass |
| B16 | Loan options: every option listed, per-type lists, applyLoan fills dp/rate/term/io/closing; payment follows | 0.64 | 0.64 | 5/5 sub-checks pass |
| B17 | Improvements raise value/income only after capexMonths; capex is paid from cash/outside money | 0.64 | 0.64 | 6/6 sub-checks pass |
| B18 | Sale: proceeds = value*(1-cost) - balance - liens - LOC; asset and its cash flow vanish; cash counts in net worth | 0.96 | 0.96 | 6/6 sub-checks pass |
| B19 | Sale cash funds a later purchase before outside cash; outside cash only for the shortfall | 0.64 | 0.64 | 5/5 sub-checks pass |
| B20 | Merge applies exitLift to value and income at exitMonth; asset stays held | 0.48 | 0.48 | 3/3 sub-checks pass |
| B21 | Interest-only loan: balance stays flat, payment = interest; extra payments reduce it | 0.48 | 0.48 | 3/3 sub-checks pass |
| B22 | Portfolio rule: per-asset shares (snap/assetsAt) sum exactly to series nw/cf/monthly/debt/value at many months | 0.64 | 0.64 | 6/6 sub-checks pass |
| B23 | Sample portfolio: finite plan, none unfunded, DTI peak below limit, homes cash-flow positive, 20-year numbers sane | 0.64 | 0.64 | 7/7 sub-checks pass |
| B24 | FHA 203(k): rehab is financed in the loan (down payment on price + rehab), upfront MIP financed, monthly MIP in cash flow, owner-occupied flag, closing cash excludes rehab | 0.64 | 0.64 | 8/8 sub-checks pass |
| C01 | At 390x844: summary KPIs, plan headline and the first ledger rows are visible without scrolling | 1.33 | 1.33 | 3/3 sub-checks pass |
| C02 | Main page keeps text inputs out of the list: no inputs until a row is selected, then exactly one extra field (none for a sold row) | 1.00 | 0.00 | CRASH in check: page.click: Timeout 4000ms exceeded. Call log: [2m  - waiting for locator('[data-row="maple"] .addrbtn')[22m  |
| C03 | No horizontal overflow at 320/390/430 on main, asset, assumptions, add, import | 1.33 | 1.33 | 15/15 sub-checks pass |
| C04 | Tap targets >= 44x44 (buttons, selects, inputs; label counts for inputs) | 1.33 | 1.27 | 183/189 targets >=44px. Small: main:BUTTON.info"What does Cash flo" 32x32; main:BUTTON.info"What does DSCR mea" 32x32; main:BUTTON.info"What does Cash-on-" 32x32; asset:BUTTON.info"What does Cash flo" 32x32; asset:BUTTON.info"What does DSCR mea" 32x32; asset:BUTTON.info"What does Cash-on-" 32x32 |
| C05 | All inputs/selects use font-size >= 16px (no iOS zoom) | 0.67 | 0.67 | 41/41 ok  |
| C06 | Asset page reachable in 1 tap, back in 1 tap; adding an asset takes <= 3 taps | 1.33 | 0.00 | CRASH in check: page.click: Timeout 4000ms exceeded. Call log: [2m  - waiting for locator('[data-testid=open-details]')[22m  |
| C07 | Main page stays compact: <= 150px per ledger row (sample), plan below the ledger | 0.67 | 0.67 | avg row 106px x 17, page 3954px |
| C08 | Text contrast >= 4.5:1 in light and dark mode (main, chart, asset, assumptions, add) | 1.33 | 1.17 | 1164/1215 text elements pass (light 605/605, dark 559/610). dark/main: Bbn1 2.61; dark/main: Bbn2 2.61; dark/main: Bbn5 2.61; dark/main: Bbn8 2.61; dark/main: Bbn7 2.61; dark/main: Bbn12 2.61 |
| C09 | Summary-first: one concise summary card (single snapshot, short text), plan card collapsible | 1.00 | 1.00 | 3/3 sub-checks pass |
| D01 | Manifest valid; icons load with true declared dimensions | 1.14 | 1.14 | 8/8 sub-checks pass |
| D02 | Service worker (index.html) registers, activates, controls page after reload; precache complete | 1.14 | 1.14 | 3/3 sub-checks pass |
| D03 | Works offline: reload, deep-link, and edit with network off | 1.52 | 0.76 | 3/4 sub-checks pass. FAIL: offline reload renders the 14-row ledger |
| D04 | Zero external (non-localhost) network requests across every flow | 0.76 | 0.76 | 896 requests, 0 external  |
| D05 | Data persists across reload and new tab (localStorage rep-v4, v7); no server round-trip | 1.14 | 0.40 | 1/5 sub-checks pass. FAIL: added asset survives reload [18]; stored in localStorage key rep-v4 with v:7 [13]; second tab sees same data; stale data version is replaced by the current sample |
| D06 | Backup: Show backup gives valid JSON text; pasted text and file restore state (with confirm); invalid text rejected without damage | 1.52 | 0.94 | 4/6 sub-checks pass. FAIL: backup text = valid JSON with all 14 assets + assumptions [{"g":{"cap":85,"haircut":0,"closing":3,"]; corrupt text rejected with message, data untouched |
| D07 | iOS install meta: apple-touch-icon loads, viewport-fit=cover, apple-mobile-web-app-capable, theme-color | 0.38 | 0.38 | 4/4 sub-checks pass |
| D08 | navigator.storage.persist() requested on load | 0.38 | 0.38 | persist() calls: 1 |
| E01 | Edge inputs (60 cases + compound: zero, 100% down, blanks, garbage, negatives, 1e12, caps, sale/merge/improvement fields) leave no NaN/Infinity/undefined in any page or crash | 1.91 | 1.50 | 51/65 sub-checks pass. FAIL: h.ridge.capex="1000000000000" [threw page.waitForSelector: Timeout 4000ms exceeded. Call log: [2m  - waiting for loc]; h.ridge.capexMonths="-5" [threw page.waitForSelector: Timeout 4000ms exceeded. Call log: [2m  - waiting for loc]; h.ridge.capexMonths="99999" [threw page.waitForSelector: Timeout 4000ms exceeded. Call log: [2m  - waiting for loc]; h.ridge.arv="10000 |
| E02 | Remove all assets (main page) -> clean empty state with add action; can add again | 0.96 | 0.00 | CRASH in check: locator.click: Timeout 4000ms exceeded. Call log: [2m  - waiting for locator('[data-testid=row-remove]').first()[22m  |
| E03 | Deleting a funding target clears references (select, storage, plan, merge-into) | 0.96 | 0.00 | CRASH in check: page.click: Timeout 4000ms exceeded. Call log: [2m  - waiting for locator('[data-for="b"] [data-testid=row-remove]')[22m  |
| E04 | Every input/select/button has an accessible name (main, asset, assumptions, add, import) | 0.64 | 0.64 | 269/269 named. unnamed:  |
| E05 | Typing 5 digits sequentially keeps focus + full value (re-render safe) on main, asset, assumptions, text field | 0.64 | 0.38 | 3/5 sub-checks pass. FAIL: main extra field [threw page.waitForSelector: Timeout 4000ms exceeded. Call log: [2]; improvement budget [threw page.waitForSelector: Timeout 4000ms exceeded. Call log: [2] |
| E06 | No layout shift while navigating and editing (CLS <= 0.05) | 0.32 | 0.32 | CLS 0.0000 |
| E07 | No console errors or page errors during all flows | 0.96 | 0.96 | 0 errors:  |
| E08 | No render storm: DOM settles when an input is focused (no endless re-render loop) | 0.64 | 0.00 | CRASH in check: page.waitForSelector: Timeout 4000ms exceeded. Call log: [2m  - waiting for locator('[data-testid=extra-input]') to be visible[22m  |
| R01 | [verified] Loan-option rates are consistent with Freddie Mac PMMS (30-yr 7.18%, 15-yr 6.57%) | 3.50 | 3.50 | 5/5 sub-checks pass |
| R02 | [verified] SBA program limits: 7(a) max $5M, 504 debenture max $5.5M; 7(a) rate under Prime+3% | 3.00 | 3.00 | 4/4 sub-checks pass |
| R03 | [secondary] Every financed commercial property and business meets a lender DSCR minimum at purchase | 3.50 | 3.50 | 6/6 sub-checks pass |
| R04 | [secondary] Business prices are realistic multiples of yearly owner profit (BizBuySell ~2.6-2.7x SDE; GF Data ~6-7x EBITDA at $10M+) | 3.50 | 3.50 | 3/3 sub-checks pass |
| R05 | [secondary+judgment] Commercial cap rates are in a plausible band for the property type in secondary markets | 2.50 | 2.50 | 3/3 sub-checks pass |
| R06 | [secondary] Leverage and loan type fit the asset (LTV, minimum down payments, FHA only if you live there) | 2.00 | 2.00 | 7/7 sub-checks pass |
| R07 | [judgment] Projected net worth does not depend on growth above realistic ceilings (homes 4.5%, commercial 5.5%, businesses 12% a year) | 4.00 | 4.00 | projected $17.7M vs $17.7M at realistic growth = 100%. Above ceiling: none |
| R08 | [secondary] Flips and improvements have believable economics (ATTOM: ~21.5% gross margin on flips); lifts are bounded | 1.50 | 1.50 | 5/5 sub-checks pass |
| R09 | [secondary] Selling and closing costs match market norms (agent 5-7%, commercial broker 2-6%, business broker ~Double Lehman, closing 1.5-5%) | 2.50 | 2.50 | 18/18 sub-checks pass |
| R10 | [secondary+judgment] Financing capacity: each loan fits lender net-worth rules, outside cash stays small, deal pace is executable | 4.00 | 4.00 | 7/7 sub-checks pass |

## Top failures

1. **A05 Remove from the MAIN page: Edit mode, confirm, Undo, totals update; removing a funding source leaves the target listed** (-1.95)
   - Detail: CRASH in check: page.click: Timeout 4000ms exceeded.
Call log:
[2m  - waiting for locator('[data-for="a"] [data-testid=row-remove]')[22m

   - Reproduce: Main > Edit > Remove > Yes; Undo
2. **A01 Add flow: each type x each loan option auto-fills dp/rate/term/closing, opens the asset page, adds a ledger row and changes plan numbers** (-1.65)
   - Detail: 1/3 sub-checks pass. FAIL: all 14 type/loan combinations fill terms, open page, add row, change plan (13 ok) [cashh rows 22->23 nw 127400000->127400000]; new assets stored as planned [31]
   - Reproduce: Main > + Add > pick type > pick loan > Add; inspect asset page + main
3. **A09 Per-row numbers sum to the portfolio headline (cash flow, monthly payments, net worth) on the sample, and match the engine** (-1.46)
   - Detail: CRASH in check: page.waitForSelector: Timeout 4000ms exceeded.
Call log:
[2m  - waiting for locator('[data-for="maple"] [data-testid=extra-input]') to be visible[22m

   - Reproduce: Main page: sum row cash flows / payments / equity vs KPIs
4. **C06 Asset page reachable in 1 tap, back in 1 tap; adding an asset takes <= 3 taps** (-1.33)
   - Detail: CRASH in check: page.click: Timeout 4000ms exceeded.
Call log:
[2m  - waiting for locator('[data-testid=open-details]')[22m

   - Reproduce: Tap row, Back; Add > Add (defaults)
5. **C02 Main page keeps text inputs out of the list: no inputs until a row is selected, then exactly one extra field (none for a sold row)** (-1.00)
   - Detail: CRASH in check: page.click: Timeout 4000ms exceeded.
Call log:
[2m  - waiting for locator('[data-row="maple"] .addrbtn')[22m

   - Reproduce: Count visible <input> on main before / after selecting a row (sample, and after adding 3)
6. **A12 Credit-line chain on screen: "opens in N mo" and buy months match the engine; raising source extra opens sooner** (-0.97)
   - Detail: CRASH in check: page.waitForSelector: Timeout 4000ms exceeded.
Call log:
[2m  - waiting for locator('[data-for="a"] [data-testid=extra-input]') to be visible[22m

   - Reproduce: Main rows on small state
7. **E02 Remove all assets (main page) -> clean empty state with add action; can add again** (-0.96)
   - Detail: CRASH in check: locator.click: Timeout 4000ms exceeded.
Call log:
[2m  - waiting for locator('[data-testid=row-remove]').first()[22m

   - Reproduce: Edit > Remove each row
8. **E03 Deleting a funding target clears references (select, storage, plan, merge-into)** (-0.96)
   - Detail: CRASH in check: page.click: Timeout 4000ms exceeded.
Call log:
[2m  - waiting for locator('[data-for="b"] [data-testid=row-remove]')[22m

   - Reproduce: Remove Bravo; Alpha target must reset
9. **D03 Works offline: reload, deep-link, and edit with network off** (-0.76)
   - Detail: 3/4 sub-checks pass. FAIL: offline reload renders the 14-row ledger
   - Reproduce: DevTools offline; reload
10. **D05 Data persists across reload and new tab (localStorage rep-v4, v7); no server round-trip** (-0.74)
   - Detail: 1/5 sub-checks pass. FAIL: added asset survives reload [18]; stored in localStorage key rep-v4 with v:7 [13]; second tab sees same data; stale data version is replaced by the current sample
   - Reproduce: Edit extra + address + add asset via the add flow, reload
11. **E08 No render storm: DOM settles when an input is focused (no endless re-render loop)** (-0.64)
   - Detail: CRASH in check: page.waitForSelector: Timeout 4000ms exceeded.
Call log:
[2m  - waiting for locator('[data-testid=extra-input]') to be visible[22m

   - Reproduce: Type one char into any input (no blur), count #app mutations over 600ms (Chromium)
12. **D06 Backup: Show backup gives valid JSON text; pasted text and file restore state (with confirm); invalid text rejected without damage** (-0.59)
   - Detail: 4/6 sub-checks pass. FAIL: backup text = valid JSON with all 14 assets + assumptions [{"g":{"cap":85,"haircut":0,"closing":3,"]; corrupt text rejected with message, data untouched
   - Reproduce: Assumptions > Show backup; modify; Restore from pasted text / file
13. **E01 Edge inputs (60 cases + compound: zero, 100% down, blanks, garbage, negatives, 1e12, caps, sale/merge/improvement fields) leave no NaN/Infinity/undefined in any page or crash** (-0.41)
   - Detail: 51/65 sub-checks pass. FAIL: h.ridge.capex="1000000000000" [threw page.waitForSelector: Timeout 4000ms exceeded.
Call log:
[2m  - waiting for loc]; h.ridge.capexMonths="-5" [threw page.waitForSelector: Timeout 4000ms exceeded.
Call log:
[2m  - waiting for loc]; h.ridge.capexMonths="99999" [threw page.waitForSelector: Timeout 4000ms exceeded.
Call log:
[2m  - waiting for loc]; h.ridge.arv="1000000000000" [threw page.waitForSelector: Timeout 4000ms exceeded.
Call log:
[2m  - waiting for loc]; 
   - Reproduce: Type each value into the field; scan text + input values on all pages
14. **A06 Main rows follow list order = buy order (sorted once on first load, owned first); tags match the engine's purchase months** (-0.41)
   - Detail: 2/5 sub-checks pass. FAIL: owned homes come first in the Homes list (owned tag has no "· buy" part) [0]; row tags equal Engine purchase months; small state: list order sorted by month once, tags equal the engine [a:0,e:0,b:0,c:0,d:0]
   - Reproduce: Main ledger on sample and on a small state
15. **A11 Sample portfolio on screen: all rows, three types, sane finite headline, no unfunded warning, no DTI warning** (-0.34)
   - Detail: 4/6 sub-checks pass. FAIL: 14 ledger rows [17]; Home / Comm. / Biz rows present
   - Reproduce: Fresh load
