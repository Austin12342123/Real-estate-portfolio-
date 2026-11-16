Task: feasibility verdict ("Tight is not the right word"), shortfall panel with the math, buy-order reorder across categories   Owner: impl-feas   Status: DONE-WITH-GAPS

## What changed
- /home/user/Real-estate-portfolio-/prototype/v4/engine.js: E.feasible (per-asset and portfolio criteria {id,label,status,measured,limit,how,hard,kind}), E.shortfall (panel lines + ranked changes), E.moveTo/E.plannedIds (buy order across categories via E.reorder), FEAS constants; E.finance now takes the worst of its old verdict and feasibility (fin.feas, headline, reasons first, fixes); E.afford(S,h,pl,feas) extension; plan() keeps trust.best for unfunded assets (keepBest) so the "closest the plan gets" is known.
- v4/app.js: planned row verdict+clause (verdictFor reads feasibility), shortfall panel + "Can I buy this?" scorecard on the asset page, Checks rows (Assets you can buy, Debt vs value, Concentration), Plan timing row red when the last purchase is after the plan ends, Buy order screen (#order, link under the tabs), Buy position box (asset page + Extra panel), Undo toast on all reorders (also existing Move up/down and drag).
- v4/info.js (buyscore, buypos), v4/style.css (block placed before the examples block, tokens only), artifact rebuilt/stamped.
- Graders: logic L12.1-L12.10, gesture I11 (reorder flows, 44px, 320/390/430 light+dark, screenshots grader/screens/order-*.png) and I12 (panel, row clause, chip/headline, no-reload update, shortfall-*.png); design K screens extended. escaped-defects row E19.
- Default plan unchanged: 36 assets, nothing owned, verdict yes, every test ok, NW >= $125M (L12.10).

## Evidence of verification (ledger run ids)
- logic L12 all pass: 20261116T104209-14877 (before L8.7/L9.8 edits); finance clean 90/90: 20261116T110139-17497 (earlier F2 fail: 20261116T104247-15150, fixed by grader expectation edits); gest I11,I12 14/14 each: 20261116T104438-15440; design K screens: 20261116T105042-16829 (K6,K14 failed, fixed afterwards, NOT re-run); info H1 failed 20261116T110041-17295 (text fixed, NOT re-run).
- FULL run 1: 20261116T110335-17872 failing C02,J12,J3,J6 (all caused by my change; fixed). FULL run 2 (final tree): 20261116T112520-19026 failing G1,G2,G8,J20. NOT clean. No claim of all green.

## NOT verified
- Final tree is NOT proven green. Budget is spent (10 slices, 2 fulls). G1,G2,G8,J20 failed in run 2 but passed in run 1. Not yet rerun alone. Facts: G2 crashed at sync-grade.js:155 because the page state did not hold the expected asset id; G1 tooltip showed $9.8M vs KPI $132.8M; J20 saw cashApy 3 after typing 4%. Looks like page-state/timing, not my logic, but UNPROVEN; my edit between run 1 and 2 only changed a label, the Plan timing row colour and graders. Needs BUDGET_OVERRIDE (orchestrator): rerun checks G1,G2,G8,J20 alone twice, then a full.
- Not re-run after the last edits: design K6/K14 (CSS moved, baseline extended), info H1 (text shortened). They passed inside full run 2 (not in its failing list), so run 2 does cover them on the final tree.
- Real-device touch drag not tested (mouse long-press only).

## What could not be done
- Separate RED ledger run for the new checks: they call functions that do not exist at HEAD, so no RED run was made.

## Assumptions [ask-user-if-wrong]
- "-9 million" = price minus what can be pulled out (money still uncovered, negative, red); "-monthly cash flow" = (asset income + pool cash flow + your monthly surplus when nothing is owned) minus the new loan payment.
- Pull-out = savings above the cushion (first purchase only) + trust cash + borrowing room, exactly the plan's own numbers at the month it buys, in plan dollars; monthly amounts in today's dollars.
- Hard fails (verdict no): not fundable in the plan or funded after the plan ends, DSCR more than 0.05 under the loan minimum (1.25 default), loan-to-value over the program, SBA 7(a) loan over $5M, asset-level debt-to-income over the limit, payment not carried, a home losing money. Concentration over 60% (only with 3+ assets), stress and reserve are soft (tight). Portfolio debt-to-income stays tight (shown red as before).
- Buy order list includes every non-owned asset, including sold-in-plan ones.

## Questions for the user
- The stretch sample loads a $8.1M SBA 7(a) loan (cap $5M) and a 64% concentration; it now reads Not yet. Default: left as is. Option: change the sample loan.

## Failures seen (including flaky)
- G1,G2,G8,J20 in 20261116T112520-19026: UNREPRODUCED, OPEN (see NOT verified).

## Grader edits (old -> new)
- logic-grade.js L8.7: weak profile verdict 'tight' -> 'no' (purchase after plan end is now not possible). L9.8: finance verdict !== 'no' -> that asset's feas verdict !== 'no' (sample Bridgeway loan over SBA cap).
- finance-grade.js F2: rescue test counts only states that are 'no' because cash runs out and accepts feas 'no'; independent-status comparison: engine = worse of independent and feas verdict.
- ux-grade.js J3: plan-timing row 'warn' -> 'bad'; chip 'warn' -> 'bad'. J6: portfolio verdict !== 'no' -> asset verdict !== 'no'.
- grade.js C02: inputs on selecting a row 1 -> 2 (extra payment + Buy position box).
- design-grade.js K21: style.css must equal HEAD except the can-I-buy-this block; baseline for K6/K14 also measures the panel and Buy order screens; both screens added to the example-screen checks.
