# Portfolio gestures grader (GEST_ONLY)

Run: 2026-11-10T09:34:58.697Z  |  34s

## I. Portfolio sections, gestures and funding order: **6.00 / 100** (separate scale; not included in A-E + R, F, G or H)

| ID | Check | Pts | Earned | Detail |
|---|---|---|---|---|
| I1 | Swipe right from the left edge goes back like iOS (touchstart within 24 px, dx > 70, |dy| < 45); ignored elsewhere | 12.00 | 0.00 | CRASH in check: page.click: Timeout 4000ms exceeded. Call log: [2m  - waiting for locator('[data-testid=open-details]')[22m      at /home/user/Real-estate-portfolio-/prototype/grader/gesture-grade.js:52:36     at async icheck (/home/user/Real-estate-portfolio-/prototype/grader/gesture-grade.js:14:15)     at async Object.run (/home/user/Real-estate-portfolio-/prototype/grader/gesture-grade.js:50:3)     at async /home/user/Real-estate-portfolio-/prototype/grader/grade.js:744:18 |
| I2 | Press-and-hold then drag reorders a row inside its category (mouse and touch); list order is saved; a plain tap still opens the panel | 14.00 | 0.00 | CRASH in check: page.click: Timeout 4000ms exceeded. Call log: [2m  - waiting for locator('[data-row=birch] .addrbtn')[22m      at /home/user/Real-estate-portfolio-/prototype/grader/gesture-grade.js:81:48     at async icheck (/home/user/Real-estate-portfolio-/prototype/grader/gesture-grade.js:14:15)     at async Object.run (/home/user/Real-estate-portfolio-/prototype/grader/gesture-grade.js:65:3)     at async /home/user/Real-estate-portfolio-/prototype/grader/grade.js:744:18 |
| I3 | Move up / Move down buttons in the row panel (accessible alternative): reorder, disabled at the ends, panel stays open | 8.00 | 0.00 | CRASH in check: page.click: Timeout 4000ms exceeded. Call log: [2m  - waiting for locator('[data-testid=move-down]')[22m      at /home/user/Real-estate-portfolio-/prototype/grader/gesture-grade.js:101:16     at async icheck (/home/user/Real-estate-portfolio-/prototype/grader/gesture-grade.js:14:15)     at async Object.run (/home/user/Real-estate-portfolio-/prototype/grader/gesture-grade.js:98:3)     at async /home/user/Real-estate-portfolio-/prototype/grader/grade.js:744:18 |
| I4 | Funding auto-assigns by list order: the asset before another funds it (1,2,3 and 1,3,2), stale in-category links clear, other categories untouched, no re-link on plain load | 16.00 | 0.00 | CRASH in check: page.click: Timeout 4000ms exceeded. Call log: [2m  - waiting for locator('[data-testid=move-down]')[22m      at /home/user/Real-estate-portfolio-/prototype/grader/gesture-grade.js:114:49     at async icheck (/home/user/Real-estate-portfolio-/prototype/grader/gesture-grade.js:14:15)     at async Object.run (/home/user/Real-estate-portfolio-/prototype/grader/gesture-grade.js:109:3)     at async /home/user/Real-estate-portfolio-/prototype/grader/grade.js:744:18 |
| I5 | Duplicate: from the row panel and the asset page; copy sits right after the original, named "(copy)", planned, funding relinked | 10.00 | 0.00 | CRASH in check: page.click: Timeout 4000ms exceeded. Call log: [2m  - waiting for locator('[data-for=maple] [data-testid=row-duplicate]')[22m      at /home/user/Real-estate-portfolio-/prototype/grader/gesture-grade.js:135:16     at async icheck (/home/user/Real-estate-portfolio-/prototype/grader/gesture-grade.js:14:15)     at async Object.run (/home/user/Real-estate-portfolio-/prototype/grader/gesture-grade.js:133:3)     at async /home/user/Real-estate-portfolio-/prototype/grader/grade.js:744:18 |
| I6 | Portfolio = total row + Homes / Commercial / Businesses dropdowns (name left, chevron right, "N homes · latest: name"), empty sections, Sold section only when something sold | 12.00 | 0.00 | CRASH in check: page.evaluate: TypeError: Cannot read properties of null (reading 'textContent')     at eval (eval at evaluate (:311:30), <anonymous>:1:199)     at Array.map (<anonymous>)     at eval (eval at evaluate (:311:30), <anonymous>:1:68)     at UtilityScript.evaluate (<anonymous>:313:16)     at UtilityScript.<anonymous> (<anonymous>:1:44)     at /home/user/Real-estate-portfolio-/prototype/grader/gesture-grade.js:149:27     at async icheck (/home/user/Real-estate-portfolio-/prototype/grader/gesture-grad |
| I7 | Selecting a row opens a nested panel with the extra payment and live effects: loan term, monthly payment, next down payment (with cash flow); all match the engine and the asset page | 12.00 | 0.00 | CRASH in check: page.evaluate: TypeError: Cannot read properties of null (reading 'nextElementSibling')     at eval (eval at evaluate (:311:30), <anonymous>:1:268)     at UtilityScript.evaluate (<anonymous>:313:16)     at UtilityScript.<anonymous> (<anonymous>:1:44)     at rd (/home/user/Real-estate-portfolio-/prototype/grader/gesture-grade.js:175:33)     at check1 (/home/user/Real-estate-portfolio-/prototype/grader/gesture-grade.js:178:23)     at /home/user/Real-estate-portfolio-/prototype/grader/gesture-grade |
| I8 | Rent & expenses shows the loan payment (P&I + mortgage insurance, extra) and the cash flow after the loan, in sync with Payment now / Cash flow now | 6.00 | 6.00 | 6/6 sub-checks pass |
| I9 | Swipe down closes the keyboard (blurs the focused field); Enter / Done also closes it; swipes inside the field or upward do not | 6.00 | 0.00 | CRASH in check: page.click: Timeout 4000ms exceeded. Call log: [2m  - waiting for locator('[data-testid=extra-input]')[22m      at /home/user/Real-estate-portfolio-/prototype/grader/gesture-grade.js:221:16     at async icheck (/home/user/Real-estate-portfolio-/prototype/grader/gesture-grade.js:14:15)     at async Object.run (/home/user/Real-estate-portfolio-/prototype/grader/gesture-grade.js:219:3)     at async /home/user/Real-estate-portfolio-/prototype/grader/grade.js:744:18 |
| I10 | Layout and hygiene: no sideways scroll at 320 / 390 / 430 with a panel open and while dragging, new buttons >= 44 px, no console errors or outside requests | 4.00 | 0.00 | CRASH in check: locator.getAttribute: Timeout 4000ms exceeded. Call log: [2m  - waiting for locator('[data-testid=cat-header-house]')[22m      at openCat (/home/user/Real-estate-portfolio-/prototype/grader/gesture-grade.js:32:106)     at openAll (/home/user/Real-estate-portfolio-/prototype/grader/gesture-grade.js:33:92)     at /home/user/Real-estate-portfolio-/prototype/grader/gesture-grade.js:230:76     at async icheck (/home/user/Real-estate-portfolio-/prototype/grader/gesture-grade.js:14:15)     at async O |

### I failures

- **I1 Swipe right from the left edge goes back like iOS (touchstart within 24 px, dx > 70, |dy| < 45); ignored elsewhere** (-12.00): CRASH in check: page.click: Timeout 4000ms exceeded.
Call log:
[2m  - waiting for locator('[data-testid=open-details]')[22m

    at /home/user/Real-estate-portfolio-/prototype/grader/gesture-grade.js:52:36
    at async icheck (/home/user/Real-estate-portfolio-/prototype/grader/gesture-grade.js:14:15)
    at async Object.run (/home/user/Real-estate-portfolio-/prototype/grader/gesture-grade.js:50:3)
    at async /home/user/Real-estate-portfolio-/prototype/grader/grade.js:744:18
  - Reproduce: CDP touch swipes on asset page, deep link, portfolio, inputs
- **I2 Press-and-hold then drag reorders a row inside its category (mouse and touch); list order is saved; a plain tap still opens the panel** (-14.00): CRASH in check: page.click: Timeout 4000ms exceeded.
Call log:
[2m  - waiting for locator('[data-row=birch] .addrbtn')[22m

    at /home/user/Real-estate-portfolio-/prototype/grader/gesture-grade.js:81:48
    at async icheck (/home/user/Real-estate-portfolio-/prototype/grader/gesture-grade.js:14:15)
    at async Object.run (/home/user/Real-estate-portfolio-/prototype/grader/gesture-grade.js:65:3)
    at async /home/user/Real-estate-portfolio-/prototype/grader/grade.js:744:18
  - Reproduce: Hold 600 ms, drag, release; check saved order
- **I3 Move up / Move down buttons in the row panel (accessible alternative): reorder, disabled at the ends, panel stays open** (-8.00): CRASH in check: page.click: Timeout 4000ms exceeded.
Call log:
[2m  - waiting for locator('[data-testid=move-down]')[22m

    at /home/user/Real-estate-portfolio-/prototype/grader/gesture-grade.js:101:16
    at async icheck (/home/user/Real-estate-portfolio-/prototype/grader/gesture-grade.js:14:15)
    at async Object.run (/home/user/Real-estate-portfolio-/prototype/grader/gesture-grade.js:98:3)
    at async /home/user/Real-estate-portfolio-/prototype/grader/grade.js:744:18
  - Reproduce: Select row, press Move
- **I4 Funding auto-assigns by list order: the asset before another funds it (1,2,3 and 1,3,2), stale in-category links clear, other categories untouched, no re-link on plain load** (-16.00): CRASH in check: page.click: Timeout 4000ms exceeded.
Call log:
[2m  - waiting for locator('[data-testid=move-down]')[22m

    at /home/user/Real-estate-portfolio-/prototype/grader/gesture-grade.js:114:49
    at async icheck (/home/user/Real-estate-portfolio-/prototype/grader/gesture-grade.js:14:15)
    at async Object.run (/home/user/Real-estate-portfolio-/prototype/grader/gesture-grade.js:109:3)
    at async /home/user/Real-estate-portfolio-/prototype/grader/grade.js:744:18
  - Reproduce: Reorder with Move buttons; read Funds selects + saved targets + plan
- **I5 Duplicate: from the row panel and the asset page; copy sits right after the original, named "(copy)", planned, funding relinked** (-10.00): CRASH in check: page.click: Timeout 4000ms exceeded.
Call log:
[2m  - waiting for locator('[data-for=maple] [data-testid=row-duplicate]')[22m

    at /home/user/Real-estate-portfolio-/prototype/grader/gesture-grade.js:135:16
    at async icheck (/home/user/Real-estate-portfolio-/prototype/grader/gesture-grade.js:14:15)
    at async Object.run (/home/user/Real-estate-portfolio-/prototype/grader/gesture-grade.js:133:3)
    at async /home/user/Real-estate-portfolio-/prototype/grader/grade.js:744:18
  - Reproduce: Panel > Duplicate; asset page > Duplicate
- **I6 Portfolio = total row + Homes / Commercial / Businesses dropdowns (name left, chevron right, "N homes · latest: name"), empty sections, Sold section only when something sold** (-12.00): CRASH in check: page.evaluate: TypeError: Cannot read properties of null (reading 'textContent')
    at eval (eval at evaluate (:311:30), <anonymous>:1:199)
    at Array.map (<anonymous>)
    at eval (eval at evaluate (:311:30), <anonymous>:1:68)
    at UtilityScript.evaluate (<anonymous>:313:16)
    at UtilityScript.<anonymous> (<anonymous>:1:44)
    at /home/user/Real-estate-portfolio-/prototype/grader/gesture-grade.js:149:27
    at async icheck (/home/user/Real-estate-portfolio-/prototype/grader/gesture-grad
  - Reproduce: Headers, subtitles, collapse state, empty portfolio
- **I7 Selecting a row opens a nested panel with the extra payment and live effects: loan term, monthly payment, next down payment (with cash flow); all match the engine and the asset page** (-12.00): CRASH in check: page.evaluate: TypeError: Cannot read properties of null (reading 'nextElementSibling')
    at eval (eval at evaluate (:311:30), <anonymous>:1:268)
    at UtilityScript.evaluate (<anonymous>:313:16)
    at UtilityScript.<anonymous> (<anonymous>:1:44)
    at rd (/home/user/Real-estate-portfolio-/prototype/grader/gesture-grade.js:175:33)
    at check1 (/home/user/Real-estate-portfolio-/prototype/grader/gesture-grade.js:178:23)
    at /home/user/Real-estate-portfolio-/prototype/grader/gesture-grade
  - Reproduce: Panel on maple, type extra, compare with engine + asset page
- **I9 Swipe down closes the keyboard (blurs the focused field); Enter / Done also closes it; swipes inside the field or upward do not** (-6.00): CRASH in check: page.click: Timeout 4000ms exceeded.
Call log:
[2m  - waiting for locator('[data-testid=extra-input]')[22m

    at /home/user/Real-estate-portfolio-/prototype/grader/gesture-grade.js:221:16
    at async icheck (/home/user/Real-estate-portfolio-/prototype/grader/gesture-grade.js:14:15)
    at async Object.run (/home/user/Real-estate-portfolio-/prototype/grader/gesture-grade.js:219:3)
    at async /home/user/Real-estate-portfolio-/prototype/grader/grade.js:744:18
  - Reproduce: Focus the extra field, swipe
- **I10 Layout and hygiene: no sideways scroll at 320 / 390 / 430 with a panel open and while dragging, new buttons >= 44 px, no console errors or outside requests** (-4.00): CRASH in check: locator.getAttribute: Timeout 4000ms exceeded.
Call log:
[2m  - waiting for locator('[data-testid=cat-header-house]')[22m

    at openCat (/home/user/Real-estate-portfolio-/prototype/grader/gesture-grade.js:32:106)
    at openAll (/home/user/Real-estate-portfolio-/prototype/grader/gesture-grade.js:33:92)
    at /home/user/Real-estate-portfolio-/prototype/grader/gesture-grade.js:230:76
    at async icheck (/home/user/Real-estate-portfolio-/prototype/grader/gesture-grade.js:14:15)
    at async O
  - Reproduce: Resize, measure, collected errors
