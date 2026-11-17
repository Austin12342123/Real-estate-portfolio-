# Help / hourly-job grader (INFO_ONLY)

Run: 2026-11-17T05:51:51.535Z  |  25s

## H. Help buttons and hourly jobs: **74.51 / 100** (separate scale; not included in the A-E + R total, F or G)

| ID | Check | Pts | Earned | Detail |
|---|---|---|---|---|
| H1 | Glossary integrity: complete entries, plain wording, every label / loan mapped to a real and sensible entry, acronyms explained | 8.00 | 8.00 | 9/9 sub-checks pass |
| H2 | Info-button coverage: every jargon label on every page (Portfolio, asset types, Assumptions, Finances, Add) has an (i) with the right definition; no orphan glossary entries | 16.00 | 14.51 | 107/112 sub-checks pass. FAIL: Add house: every loan card (conv30, conv15, fha, k203, dscr, cashh) has an (i) beside it with its own definition [missing/wrong: conv30,conv15,fha,k203,dscr,cashh]; Add commercial: every loan card (comm25, sba504, bridge, sellerc) has an (i) beside it with its own definition [missing/wrong: comm25,sba504,bridge,sellerc]; Add business: every loan card (sba7a, bankbiz, sellerb, cashb) has an (i) beside it with its own definition [missing/wrong: sba7a,bankbiz,sellerb,cashb]; Add multi-family: Home type, Number of units, Building or pack and every one of the 22 loan cards have an (i) with their own definition [missing: mfFha,mfVa,mfConvOO,mfK203,mfConvInv,mfBlanket,mfDscr,mfSbl,mfAgency,mfHud,mfBank5,mfBank10,mfCmbs,mfSba504,mfBridge,mfSeller,mfSellerIO,mfAssume,mfLease,mfSubTo,mfJv,mfCash]; no orphan glossary entries: every definition can be opened from some page (146 entries) [30 never shown: dscrloan, fha, k203, bridge, sba, sellerfin, conv, cashbuy, bankloan, mfFha, mfVa, mfConvOO, mfK203, mfConvInv, mfBlanket, mfDscr, mfSbl, mfAgency, mfHud, mfBank5, mfBank10, mfCmbs, mfSba504, mfBridge, mfSeller, mfSellerIO, mfAssume, mfLease, mfSubTo, mfJv] |
| H3 | Info sheet: opens with the right content, closes by button / Escape / backdrop / navigation, accessible names and roles, keyboard, contrast, fits small screens, never changes data | 16.00 | 0.00 | CRASH in check: page.click: Timeout 4000ms exceeded. Call log: [2m  - waiting for locator('[data-info=dscr]')[22m [2m    - locator resolved to <button class="info" type="button" data-info="dscr" aria-label="What does DSCR mean?">…</button>[22m [2m  - attempting click action[22m [2m    2 × waiting for element to be visible, enabled and stable[22m [2m      - element is not visible[22m [2m    - retrying click action[22m [2m    - waiting 20ms[22m [2m    2 × waiting for element to be visible, enabled  |
| H4 | Definitions are accurate: numbers quoted match the engine constants and loan table, examples do their own arithmetic, stated rules behave that way in the engine | 16.00 | 16.00 | 42/42 sub-checks pass |
| H5 | Hourly jobs: add, gross = (wage + tips) x hours x weeks, automatic vs typed tax, blank tax returns to automatic, temporary end month, switching kind, clamps, persistence | 12.00 | 12.00 | 28/28 sub-checks pass |
| H6 | Optional fields left blank never break the plan or the finance verdict (job extras, improvements, exit fields, co-signers) | 8.00 | 8.00 | 16/16 sub-checks pass |
| H7 | Old saves migrate: v8 (assets only) and pre-hourly jobs (no kind / wage / tips / weeks) load, keep their numbers and show correctly | 6.00 | 6.00 | 10/10 sub-checks pass |
| H8 | Automatic tax estimate: matches an independent 2026 single-filer calculation (IRS Rev. Proc. 2025-32, Pub. 15) (federal after standard deduction + Social Security + Medicare, no state tax), is monotone and bounded | 6.00 | 6.00 | 6/6 sub-checks pass |
| H9 | Disclosure defaults and new wording: collapsed sections open on tap (and stay open), renamed labels, Hold/Sell/Merge + Status, loan grouping, import preview title | 8.00 | 0.00 | CRASH in check: page.evaluate: TypeError: Cannot read properties of null (reading 'querySelectorAll')     at eval (eval at evaluate (:311:30), <anonymous>:1:85)     at UtilityScript.evaluate (<anonymous>:313:16)     at UtilityScript.<anonymous> (<anonymous>:1:44)     at /home/user/Real-estate-portfolio-/prototype/grader/info-grade.js:492:67     at async hcheck (/home/user/Real-estate-portfolio-/prototype/grader/info-grade.js:20:15)     at async Object.run (/home/user/Real-estate-portfolio-/prototype/grader/info |
| H10 | Clean run: no console / page errors and no network requests outside localhost during all help and hourly-job flows | 4.00 | 4.00 | 2/2 sub-checks pass |

### H failures

- **H2 Info-button coverage: every jargon label on every page (Portfolio, asset types, Assumptions, Finances, Add) has an (i) with the right definition; no orphan glossary entries** (-1.49): 107/112 sub-checks pass. FAIL: Add house: every loan card (conv30, conv15, fha, k203, dscr, cashh) has an (i) beside it with its own definition [missing/wrong: conv30,conv15,fha,k203,dscr,cashh]; Add commercial: every loan card (comm25, sba504, bridge, sellerc) has an (i) beside it with its own definition [missing/wrong: comm25,sba504,bridge,sellerc]; Add business: every loan card (sba7a, bankbiz, sellerb, cashb) has an (i) beside it with its own definition [missing/wrong: sba7a,bankbiz,sellerb,cashb]; Add multi-family: Home type, Number of units, Building or pack and every one of the 22 loan cards have an (i) with their own definition [missing: mfFha,mfVa,mfConvOO,mfK203,mfConvInv,mfBlanket,mfDscr,mfSbl,mfAgency,mfHud,mfBank5,mfBank10,mfCmbs,mfSba504,mfBridge,mfSeller,mfSellerIO,mfAssume,mfLease,mfSubTo,mfJv,mfCash]; no orphan glossary entries: every definition can be opened from some page (146 entries) [30 never shown: dscrloan, fha, k203, bridge, sba, sellerfin, conv, cashbuy, bankloan, mfFha, mfVa, mfConvOO, mfK203, mfConvInv, mfBlanket, mfDscr, mfSbl, mfAgency, mfHud, mfBank5, mfBank10, mfCmbs, mfSba504, mfBridge, mfSeller, mfSellerIO, mfAssume, mfLease, mfSubTo, mfJv]
  - Reproduce: Open each page without expanding anything extra, expand its sections as a user would, list the (i) buttons beside labels
- **H3 Info sheet: opens with the right content, closes by button / Escape / backdrop / navigation, accessible names and roles, keyboard, contrast, fits small screens, never changes data** (-16.00): CRASH in check: page.click: Timeout 4000ms exceeded.
Call log:
[2m  - waiting for locator('[data-info=dscr]')[22m
[2m    - locator resolved to <button class="info" type="button" data-info="dscr" aria-label="What does DSCR mean?">…</button>[22m
[2m  - attempting click action[22m
[2m    2 × waiting for element to be visible, enabled and stable[22m
[2m      - element is not visible[22m
[2m    - retrying click action[22m
[2m    - waiting 20ms[22m
[2m    2 × waiting for element to be visible, enabled 
  - Reproduce: Playwright 390x844 and 320x568: open (i), inspect dialog, close every way
- **H9 Disclosure defaults and new wording: collapsed sections open on tap (and stay open), renamed labels, Hold/Sell/Merge + Status, loan grouping, import preview title** (-8.00): CRASH in check: page.evaluate: TypeError: Cannot read properties of null (reading 'querySelectorAll')
    at eval (eval at evaluate (:311:30), <anonymous>:1:85)
    at UtilityScript.evaluate (<anonymous>:313:16)
    at UtilityScript.<anonymous> (<anonymous>:1:44)
    at /home/user/Real-estate-portfolio-/prototype/grader/info-grade.js:492:67
    at async hcheck (/home/user/Real-estate-portfolio-/prototype/grader/info-grade.js:20:15)
    at async Object.run (/home/user/Real-estate-portfolio-/prototype/grader/info
  - Reproduce: Fresh state: check aria-expanded, hidden fields, labels
