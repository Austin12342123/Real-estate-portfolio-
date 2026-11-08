# Prototype grader report

Target: `prototype/v3`  |  Run: 2026-11-08T20:08:27.513Z  |  51s

## Score: **84.00 / 85**

| Category | Score |
|---|---|
| A. Requirement / propagation | 29.00 / 30 |
| B. Engine correctness | 20.00 / 20 |
| C. UX conciseness & usability | 15.00 / 15 |
| D. PWA / local-first | 10.00 / 10 |
| E. Robustness & accessibility | 10.00 / 10 |

## All checks

| ID | Check | Pts | Earned | Detail |
|---|---|---|---|---|
| A01 | Add house: appears in ledger with extra field, all loan inputs shown, plan counts update | 3 | 3.00 | 9/9 sub-checks pass |
| A02 | Remove house: ledger, plan counts, overview figures update; stale target refs cleared | 3 | 3.00 | 4/4 sub-checks pass |
| A03 | Edit matrix: each input changes the plan/summary figures it should (23 edits, exact deltas) | 12 | 12.00 | 23/23 sub-checks pass |
| A04 | Two-way back-solves: wait-months->extra, payoff->extra, down$->% | 5 | 5.00 | 11/11 sub-checks pass |
| A05 | Chain timing monotonic; raising source extra never delays; 4th house extends chain | 2 | 2.00 | 3/3 sub-checks pass |
| A06 | Liens / drawn LOC reduce headroom: later LOC; debt line counts liens + LOC | 2 | 1.00 | 1/3 sub-checks pass. FAIL: house page debt% includes liens and drawn LOC [ => ]; house debt% (loan+liens+LOC) does not exceed cap 85% [pct NaN] |
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
| B10 | No NaN/Infinity leaks in plan series & KPIs (15 edge scenarios) | 2 | 2.00 | 15/15 sub-checks pass |
| B11 | Funding cycles (A<->B, A->A, 3-cycle) do not hang or throw | 1 | 1.00 | ok Infinity,Infinity/0/0,162,324/162,0 |
| B12 | Net worth at t=0 = sum(value - balance - liens) of owned/bought houses | 1 | 1.00 | 2/2 sub-checks pass |
| B13 | plan() under 100ms for 10 houses (median of 7) | 0.5 | 0.50 | median 2.5ms |
| B14 | locMonths matches independent month-by-month simulation (60 random scenarios incl. liens/haircut/appr/paid) | 1.5 | 1.50 | exact 60/60, within1 60/60  |
| B15 | 85% cap counts loan + liens + drawn LOC for every house in a 3-chain (and totals add up) | 2 | 2.00 | 4/4 sub-checks pass |
| C01 | At 390x844 all 3 ledger rows (incl. extra field + LOC info) fit in first viewport | 2 | 2.00 | 3/3 rows fully visible above fold/bottom bar; last row bottom 751px, bar top 779px |
| C02 | Main page (plan collapsed) has only per-house extra fields as text inputs (3 and 6 houses) | 2 | 2.00 | 2/2 sub-checks pass |
| C03 | No horizontal overflow at 320/390/430 on main, house, settings | 2 | 2.00 | 9/9 sub-checks pass |
| C04 | Tap targets >= 44x44 (buttons, selects, inputs; label counts for inputs) | 2 | 2.00 | 54/54 targets >=44px. Small:  |
| C05 | All inputs/selects use font-size >= 16px (no iOS zoom) | 1 | 1.00 | 37/37 ok  |
| C06 | House page reachable in 1 tap, back in 1 tap | 1.5 | 1.50 | 2/2 sub-checks pass |
| C07 | Main page height with 6 houses is reasonable (<= ~2 screens) | 1 | 1.00 | scrollHeight 1563px (1.9 screens) |
| C08 | Text contrast >= 4.5:1 in light and dark mode (all text on main, chart, house, settings) | 2 | 2.00 | 488/488 text elements pass (light 241/241, dark 247/247).  |
| C09 | Summary-first: KPIs above fold, concise text (<1000 chars), primary Add action in thumb zone | 1.5 | 1.50 | 3/3 sub-checks pass |
| D01 | Manifest valid; icons load with true declared dimensions | 1.5 | 1.50 | 8/8 sub-checks pass |
| D02 | Service worker registers, activates, controls page after reload; precache complete | 1.5 | 1.50 | 3/3 sub-checks pass |
| D03 | Works offline: reload, deep-link, and edit with network off | 2 | 2.00 | 4/4 sub-checks pass |
| D04 | Zero external (non-localhost) network requests across every flow | 1 | 1.00 | 498 requests, 0 external  |
| D05 | Data persists across reload and new tab; no server round-trip | 1.5 | 1.50 | 4/4 sub-checks pass |
| D06 | Export gives valid JSON; import restores state; invalid file rejected without damage | 1.5 | 1.50 | 4/4 sub-checks pass |
| D07 | iOS install meta: apple-touch-icon loads, viewport-fit=cover, apple-mobile-web-app-capable, theme-color | 0.5 | 0.50 | 4/4 sub-checks pass |
| D08 | navigator.storage.persist() requested on load | 0.5 | 0.50 | persist() calls: 1 |
| E01 | Edge inputs (40 cases: 0, 100% down, 0% rate, blank, garbage, negative, 1e12, caps) leave no NaN/Infinity/undefined in main/house/settings DOM or crash | 3 | 3.00 | 44/44 sub-checks pass |
| E02 | Delete all houses -> clean empty state; can add again | 1 | 1.00 | 3/3 sub-checks pass |
| E03 | Deleting a funding target clears references (select, storage, plan) | 1 | 1.00 | 3/3 sub-checks pass |
| E04 | Every input/select/button has an accessible name | 1 | 1.00 | 76/76 named. unnamed:  |
| E05 | Typing 5 digits sequentially keeps focus + full value (re-render safe) on main, house, settings, text field | 1 | 1.00 | 4/4 sub-checks pass |
| E06 | No layout shift while navigating and editing (CLS <= 0.05) | 0.5 | 0.50 | CLS 0.0000 |
| E07 | No console errors or page errors during all flows | 1.5 | 1.50 | 0 errors:  |
| E08 | No render storm: DOM settles when an input is focused (no endless re-render loop) | 1 | 1.00 | 3/3 sub-checks pass |

## Top failures

1. **A06 Liens / drawn LOC reduce headroom: later LOC; debt line counts liens + LOC** (-1.00)
   - Detail: 1/3 sub-checks pass. FAIL: house page debt% includes liens and drawn LOC [ => ]; house debt% (loan+liens+LOC) does not exceed cap 85% [pct NaN]
   - Reproduce: Add other liens on Elm; read "Debt on this house" note on Elm page
