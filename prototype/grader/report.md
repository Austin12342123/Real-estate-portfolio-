# Prototype grader report

Target: `prototype/v3`  |  Run: 2026-11-08T19:49:38.593Z  |  54s

## Score: **70.98 / 85**

| Category | Score |
|---|---|
| A. Requirement / propagation | 22.73 / 30 |
| B. Engine correctness | 19.73 / 20 |
| C. UX conciseness & usability | 14.04 / 14.5 |
| D. PWA / local-first | 8.50 / 10 |
| E. Robustness & accessibility | 5.98 / 10.5 |

## All checks

| ID | Check | Pts | Earned | Detail |
|---|---|---|---|---|
| A01 | Add house: appears in ledger with extra field, all loan inputs shown, plan counts update | 3 | 2.80 | 8/9 sub-checks pass. FAIL: editing buy-in months moves plan completion date [10y 8m -> 10y 8m] |
| A02 | Remove house: ledger, plan counts, overview figures update; stale target refs cleared | 3 | 3.00 | 4/4 sub-checks pass |
| A03 | Edit matrix: each input changes the plan/summary figures it should (23 edits, exact deltas) | 12 | 10.43 | 20/23 sub-checks pass. FAIL: oak down 20%->40% [want nw +60000, monthly drops; nw 60000->112800 mon 2917->4614 cf -332->-555 nwF 304817->288752 monF 6664->6284 elm buy 2y 7m->buy now]; g.appr 0->3 [want plan-complete nw up, today unchanged; nw 60000->60000 mon 2917->2917 cf -332->-332 nwF 304817->226934 monF 6664->6664 elm buy 2y 7m->buy 21 mo]; co-signer income 200k+200k -> 0+0 (affordability) [t |
| A04 | Two-way back-solves: wait-months->extra, payoff->extra, down$->% | 5 | 0.00 | CRASH in check: Cannot read properties of null (reading 'houses') |
| A05 | Chain timing monotonic; raising source extra never delays; 4th house extends chain | 2 | 2.00 | 3/3 sub-checks pass |
| A06 | Liens / drawn LOC reduce headroom: later LOC; debt line counts liens + LOC | 2 | 1.50 | 2/3 sub-checks pass. FAIL: house debt% (loan+liens+LOC) does not exceed cap 85% [pct 120] |
| A07 | Main page shows per-house total monthly payment, total monthly, net worth; totals = sum of rows; row edit propagates | 3 | 3.00 | 5/5 sub-checks pass |
| B01 | P&I for 240k @6.5% 30y = 1516.96 | 1 | 1.00 | got 1516.9632563831167 |
| B02 | Scheduled balance after 60 mo = 224666.35 | 1 | 1.00 | 2/2 sub-checks pass |
| B03 | Balance after 60 mo with +500 extra = 189329.36 | 1 | 1.00 | got 189329.36208686503 |
| B04 | Payoff months with +500 extra = 192 | 1 | 1.00 | got 192 (scheduled: 360) |
| B05 | LOC months (D=60k) extra 0/500/1000 = 140/55/34 | 2 | 2.00 | 3/3 sub-checks pass |
| B06 | extraFor 24 mo = 1543.87, 36 mo = 918.49 | 2 | 2.00 | 3/3 sub-checks pass |
| B07 | Appreciation 3%: LOC months extra 0/500 = 50/32 | 1.5 | 1.50 | 2/2 sub-checks pass |
| B08 | More extra never delays LOC (monotone, 0..3000 step 50) | 1 | 1.00 | 2/2 sub-checks pass |
| B09 | Purchase order respects chain (A->B->C->D, LOC month additive) | 1.5 | 1.50 | 5/5 sub-checks pass |
| B10 | No NaN/Infinity leaks in plan series & KPIs (15 edge scenarios) | 2 | 1.73 | 13/15 sub-checks pass. FAIL: zero income [dti[0]=Infinity]; rent0 zero income [dti[0]=Infinity] |
| B11 | Funding cycles (A<->B, A->A, 3-cycle) do not hang or throw | 1 | 1.00 | ok Infinity,Infinity/0/0,162,324/162,0 |
| B12 | Net worth at t=0 = sum(value - balance - liens) of owned/bought houses | 1 | 1.00 | 2/2 sub-checks pass |
| B13 | plan() under 100ms for 10 houses (median of 7) | 0.5 | 0.50 | median 2.8ms |
| B14 | locMonths matches independent month-by-month simulation (60 random scenarios incl. liens/haircut/appr/paid) | 1.5 | 1.50 | exact 60/60, within1 60/60  |
| B15 | 85% cap counts loan + liens + drawn LOC for every house in a 3-chain (and totals add up) | 2 | 2.00 | 4/4 sub-checks pass |
| C01 | At 390x844 all 3 ledger rows (incl. extra field + LOC info) fit in first viewport | 2 | 2.00 | 3/3 rows fully visible above fold/bottom bar; last row bottom 658px, bar top 779px |
| C02 | Main page (plan collapsed) has only per-house extra fields as text inputs (3 and 6 houses) | 2 | 2.00 | 2/2 sub-checks pass |
| C03 | No horizontal overflow at 320/390/430 on main, house, settings | 2 | 2.00 | 9/9 sub-checks pass |
| C04 | Tap targets >= 44x44 (buttons, selects, inputs; label counts for inputs) | 2 | 1.58 | 42/53 targets >=44px. Small: main:INPUT"Extra monthly paym" 92x42; main:BUTTON"Timeline" 109x36; main:BUTTON"Net worth" 109x36; main:BUTTON.on"Hide" 109x36; house:BUTTON.on"Owned" 163x36; house:BUTTON"Planned" 163x36; house:BUTTON.chip"Vacancy 5%" 91x32; house:BUTTON.chip"Mgmt 8%" 75x32 |
| C05 | All inputs/selects use font-size >= 16px (no iOS zoom) | 1 | 1.00 | 37/37 ok  |
| C06 | House page reachable in 1 tap, back in 1 tap | 1 | 1.00 | 3/3 sub-checks pass |
| C07 | Main page height with 6 houses is reasonable (<= ~2 screens) | 1 | 1.00 | scrollHeight 1389px (1.6 screens) |
| C08 | Text contrast >= 4.5:1 in light and dark mode (all text on main, chart, house, settings) | 2 | 1.96 | 471/474 text elements pass (light 234/234, dark 237/240). dark/main: BUTTONbtn+ House 2.61; dark/main+chart: BUTTONbtn+ House 2.61; dark/settings: BUTTONbtnExport backu 2.61 |
| C09 | Summary-first: KPIs above fold, concise text (<1000 chars), primary Add action in thumb zone | 1.5 | 1.50 | 3/3 sub-checks pass |
| D01 | Manifest valid; icons load with true declared dimensions | 1.5 | 1.50 | 8/9 sub-checks pass. FAIL: maskable icon (nice to have) |
| D02 | Service worker registers, activates, controls page after reload; precache complete | 1.5 | 1.50 | 3/3 sub-checks pass |
| D03 | Works offline: reload, deep-link, and edit with network off | 2 | 2.00 | 4/4 sub-checks pass |
| D04 | Zero external (non-localhost) network requests across every flow | 1 | 1.00 | 434 requests, 0 external  |
| D05 | Data persists across reload and new tab; no server round-trip | 1.5 | 0.00 | CRASH in check: locator.fill: Timeout 4000ms exceeded. Call log: [2m  - waiting for locator('[data-p="h.oak.addr"]').first()[22m [2m    12 × locator resolved to <input class="t" type="text" value="12 Oak St" data-p="h.oak.addr" aria-label="Address"/>[22m [2m       - fill("Zed Lane")[22m [2m     - attempting fill action[22m [2m       - waiting for element to be visible, enabled and editabl |
| D06 | Export gives valid JSON; import restores state; invalid file rejected without damage | 1.5 | 1.50 | 4/4 sub-checks pass |
| D07 | iOS install meta: apple-touch-icon loads, viewport-fit=cover, apple-mobile-web-app-capable, theme-color | 0.5 | 0.50 | 4/4 sub-checks pass |
| D08 | navigator.storage.persist() requested on load | 0.5 | 0.50 | persist() calls: 1 |
| E01 | Edge inputs (40 cases: 0, 100% down, 0% rate, blank, garbage, negative, 1e12, caps) leave no NaN/Infinity/undefined in main/house/settings DOM or crash | 3 | 0.00 | CRASH in check: locator.fill: Timeout 4000ms exceeded. Call log: [2m  - waiting for locator('[data-p="h.oak.down"]').first()[22m [2m    11 × locator resolved to <input value="0" inputmode="decimal" data-p="h.oak.down" data-k="h.oak.down" aria-label="Down payment $"/>[22m [2m       - fill("5000")[22m [2m     - attempting fill action[22m [2m       - waiting for element to be visible, enable |
| E02 | Delete all houses -> clean empty state; can add again | 1 | 1.00 | 3/3 sub-checks pass |
| E03 | Deleting a funding target clears references (select, storage, plan) | 1 | 1.00 | 3/3 sub-checks pass |
| E04 | Every input/select/button has an accessible name | 1.5 | 1.48 | 75/76 named. unnamed: #/settings INPUTimport-file |
| E05 | Typing 5 digits sequentially keeps focus + full value (re-render safe) on main, house, settings, text field | 1.5 | 0.00 | CRASH in check: locator.click: Timeout 4000ms exceeded. Call log: [2m  - waiting for locator('[data-p="h.oak.price"]').first()[22m [2m    10 × locator resolved to <input value="300,000" aria-label="Price" inputmode="decimal" data-p="h.oak.price" data-k="h.oak.price"/>[22m [2m     - attempting click action[22m [2m       - waiting for element to be visible, enabled and stable[22m [2m     -  |
| E06 | No layout shift while navigating and editing (CLS <= 0.05) | 0.5 | 0.50 | CLS 0.0000 |
| E07 | No console errors or page errors during all flows | 2 | 2.00 | 0 errors:  |

## Top failures

1. **A04 Two-way back-solves: wait-months->extra, payoff->extra, down$->%** (-5.00)
   - Detail: CRASH in check: Cannot read properties of null (reading 'houses')
   - Reproduce: House page: type in "Months until LOC", "Paid off in", "Down payment $"
2. **E01 Edge inputs (40 cases: 0, 100% down, 0% rate, blank, garbage, negative, 1e12, caps) leave no NaN/Infinity/undefined in main/house/settings DOM or crash** (-3.00)
   - Detail: CRASH in check: locator.fill: Timeout 4000ms exceeded.
Call log:
[2m  - waiting for locator('[data-p="h.oak.down"]').first()[22m
[2m    11 × locator resolved to <input value="0" inputmode="decimal" data-p="h.oak.down" data-k="h.oak.down" aria-label="Down payment $"/>[22m
[2m       - fill("5000")[22m
[2m     - attempting fill action[22m
[2m       - waiting for element to be visible, enabled and editable[22m
[2m     - element was detached from the DOM, retrying[22m
[2m    - locator re
   - Reproduce: Type each value into the field; scan text + input values on all pages
3. **A03 Edit matrix: each input changes the plan/summary figures it should (23 edits, exact deltas)** (-1.57)
   - Detail: 20/23 sub-checks pass. FAIL: oak down 20%->40% [want nw +60000, monthly drops; nw 60000->112800 mon 2917->4614 cf -332->-555 nwF 304817->288752 monF 6664->6284 elm buy 2y 7m->buy now]; g.appr 0->3 [want plan-complete nw up, today unchanged; nw 60000->60000 mon 2917->2917 cf -332->-332 nwF 304817->226934 monF 6664->6664 elm buy 2y 7m->buy 21 mo]; co-signer income 200k+200k -> 0+0 (affordability) [threw locator.fill: Timeout 4000ms exceeded.
Call log:
[2m  - waiting for locator('[data-p="g.p2"]')
   - Reproduce: Edit each field; compare main-page KPIs/plan/ledger before vs after
4. **D05 Data persists across reload and new tab; no server round-trip** (-1.50)
   - Detail: CRASH in check: locator.fill: Timeout 4000ms exceeded.
Call log:
[2m  - waiting for locator('[data-p="h.oak.addr"]').first()[22m
[2m    12 × locator resolved to <input class="t" type="text" value="12 Oak St" data-p="h.oak.addr" aria-label="Address"/>[22m
[2m       - fill("Zed Lane")[22m
[2m     - attempting fill action[22m
[2m       - waiting for element to be visible, enabled and editable[22m
[2m     - element was detached from the DOM, retrying[22m

   - Reproduce: Edit extra + address + add house, reload
5. **E05 Typing 5 digits sequentially keeps focus + full value (re-render safe) on main, house, settings, text field** (-1.50)
   - Detail: CRASH in check: locator.click: Timeout 4000ms exceeded.
Call log:
[2m  - waiting for locator('[data-p="h.oak.price"]').first()[22m
[2m    10 × locator resolved to <input value="300,000" aria-label="Price" inputmode="decimal" data-p="h.oak.price" data-k="h.oak.price"/>[22m
[2m     - attempting click action[22m
[2m       - waiting for element to be visible, enabled and stable[22m
[2m     - element was detached from the DOM, retrying[22m

   - Reproduce: page.keyboard.type("12345") with delay
6. **A06 Liens / drawn LOC reduce headroom: later LOC; debt line counts liens + LOC** (-0.50)
   - Detail: 2/3 sub-checks pass. FAIL: house debt% (loan+liens+LOC) does not exceed cap 85% [pct 120]
   - Reproduce: Add other liens on Elm; read "Debt on this house" note on Elm page
7. **C04 Tap targets >= 44x44 (buttons, selects, inputs; label counts for inputs)** (-0.42)
   - Detail: 42/53 targets >=44px. Small: main:INPUT"Extra monthly paym" 92x42; main:BUTTON"Timeline" 109x36; main:BUTTON"Net worth" 109x36; main:BUTTON.on"Hide" 109x36; house:BUTTON.on"Owned" 163x36; house:BUTTON"Planned" 163x36; house:BUTTON.chip"Vacancy 5%" 91x32; house:BUTTON.chip"Mgmt 8%" 75x32
   - Reproduce: Measure interactive elements on main/house/settings
8. **B10 No NaN/Infinity leaks in plan series & KPIs (15 edge scenarios)** (-0.27)
   - Detail: 13/15 sub-checks pass. FAIL: zero income [dti[0]=Infinity]; rent0 zero income [dti[0]=Infinity]
   - Reproduce: node: Engine.plan on edge states; scan series/today/final
9. **A01 Add house: appears in ledger with extra field, all loan inputs shown, plan counts update** (-0.20)
   - Detail: 8/9 sub-checks pass. FAIL: editing buy-in months moves plan completion date [10y 8m -> 10y 8m]
   - Reproduce: Main > "+ House"; inspect house page + main ledger + Plan card
10. **C08 Text contrast >= 4.5:1 in light and dark mode (all text on main, chart, house, settings)** (-0.04)
   - Detail: 471/474 text elements pass (light 234/234, dark 237/240). dark/main: BUTTONbtn+ House 2.61; dark/main+chart: BUTTONbtn+ House 2.61; dark/settings: BUTTONbtnExport backu 2.61
   - Reproduce: emulate prefers-color-scheme; compute WCAG ratio for every text element
11. **E04 Every input/select/button has an accessible name** (-0.02)
   - Detail: 75/76 named. unnamed: #/settings INPUTimport-file
   - Reproduce: aria-label / label / text on all pages
