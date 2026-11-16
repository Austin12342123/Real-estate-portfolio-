# Diagnosis: "Remove all planned" leaves a Planned page that says "Not yet" (read-only, no repo edits)

Reproduced in a scratch copy (scratchpad diag-v4, Playwright, 390px). Scripts: scratchpad/diag.js, d2.js. No graders run.

## 1. State confirmed
The user's state is B: ONE OWNED asset (about $175,000, ~98% debt, i.e. 2% down) remains after Remove; 0 planned.
The Remove confirm text even says "Assets you have already bought stay" (app.js:807). Repro: default portfolio, mark one home owned (price 175000, dp 2), press Remove -> Yes. The page matches the screenshots exactly:
"Net worth $0, 0 planned assets", payments $0, cash flow +$0, DSCR "—", "Plan end, after tax: $948/mo (user: $1,259), 0% of the target", "Your 1 asset is bought.", Can I afford: "Total debt is 98% of value, over the 85% cap. Not yet", Checks "3 of 9 to look at" (user had 4: runway 0.6 mo because savings are $20,000, my run $45,000).
State A (houses = []) is a different branch: the Planned page returns early at app.js:425 with "Nothing added yet..." (no verdict, no Checks, no target line). A2 (press Remove with only planned assets) lands in A and is fine. State C (default, 36 planned): all green, "All 10 checks are in the safe range", Yes.
Not a bug in A or C. The bug exists only in B (planned list empty, owned list not).

## 2. Root cause (two halves)
The Planned page splits the numbers by asset status in SOME places (top KPIs, total row, breakdown table: all use `restSn`/`td = E.todayTotals(S,pl,restSn ids)`, app.js:316-317, 446) but not in the engine's plan-wide results, which cover ALL houses (owned + planned):
- The verdict chip + sentence: `E.finance(S,pl)` -> `fin.feas` = `E.feasible()` (engine.js:709). Its `p-cltv` check (716) uses `pl.at(min(T,pl.lastBuy)).cltv` = debt/value of ALL assets, with `lastBuy=0` when nothing is planned (engine.js:442). 98% > 85% cap, hard fail -> verdict 'no' -> "Not yet. Total debt is 98% of value..." (738). Shown at app.js:484.
- `p-concentration` (726-727) uses `S.houses` (all), not planned: 100% in one (caution/fail only when >= FEAS.concMin assets, so "Safe" here, but the number is shown).
- `p-funding` (714) with nPl=0: value "last 0 mo", how "the last purchase is today" (checkList 764; noStart is false because it needs nPl>0).
- `check-buy`: "none planned", Safe (engine.js:770).
- `outside-cash` (773): `plIn.outsideTotal` includes capex on assets owned today paid with outside money (engine.js:365) and the owned asset's startup; so "Paid from your own pocket $10,927" appears with zero planned purchases.
- Cash cushion / runway / hours / DTI come from `fin.kpis` (the personal finance run, includes the owned asset's debt payment and the person's living costs). These are personal-cash tests, they are legitimate for a person who owns one house, but they are labelled as plan tests on the Planned page.
- Target line (app.js:477): `fin.kpis.planEnd.cfAfter` = after-tax cash flow of ALL assets at plan end ($948) even though the page's own KPI says planned cash flow is $0. Prints "Plan end, after tax: $948/mo, 0% of the target" (noise; also it does not match "+$0" above).
- Wording (app.js:470): `headline` for nPl===0 says `n===1 ? 'Your 1 asset is bought.'` : n counts ALL assets, so it is correct for the data but contradicts a page that says "0 planned assets" and hides the bought asset (it is on Real). It never says "see Real".
- Chart/breakdown "Debt 0% of value" bar (app.js:~471 `sn.cltv`) is planned-only (0%) while the check says 98%: two numbers for "debt vs value" on one page.

## 3. Table (my repro; "right?" judged against "this page is the PLAN; with nothing planned the plan is empty")
Cols: A = no assets at all, B = only 1 owned asset ($175k, 98% debt), C = default 36 planned.
| Item (Planned page) | A | B | C | B right? | Cause |
|---|---|---|---|---|---|
| Whole summary/Checks | not rendered ("Nothing added yet") | rendered | rendered | A ok | app.js:377,425 `empty = !S.houses.length` ignores owned |
| Net worth / planned assets | - | $0 / 0 planned | $131.7M / 36 | yes | restSn excludes owned (446) |
| Total payments, cash flow, DSCR | - | $0, +$0, — | $2.0M, +$1.19M, 1.61 | yes (but "Positive total income" under $0 is odd) | todayTotals(restSn) |
| Target line "Plan end, after tax $948/mo, 0%" | absent | shown | $1.38M, 106% | NO (planned is $0, owned asset's $948 leaks) | app.js:477 uses fin.kpis.planEnd (all assets) |
| "Your 1 asset is bought." | absent | shown | "Nothing bought yet. All 36 planned..." | wording unclear | app.js:470 `n` = all assets |
| Can I afford this? chip | absent | Not yet (98% > 85%) | Yes | NO: nothing planned to afford | engine feasible p-cltv (716) over all assets, lastBuy=0 |
| Checks count | absent | 3-4 of 9 | all 10 safe | NO | engine checkList 757 |
| Plan timing | - | "last 0 mo / last purchase is today" (Safe) | last 271 mo | NO (should be n/a) | engine 714/764 |
| Cash cushion | - | lowest $21,855 Watch | safe | partly: it is a personal-cash fact about the owned house, not the plan | fin.kpis.minLiquid/reserveGap |
| If paycheck stops | - | 5.4 mo (user 0.6, Over) | safe | personal, see above | fin.kpis.minRunway |
| Hours, DTI | - | 40 h, 7% Safe | safe | plan-neutral | fin.kpis / pl.worst |
| Debt vs value | - | 98% Over | ok | NO on the Planned page (owned asset's own LTV; Real should say it) | engine 716 |
| Concentration | - | 100% in one | ok | NO (not a plan fact) | engine 726 all S.houses |
| Assets you can buy | - | none planned Safe | 36 of 36 | wrong place to show a row | engine 770 |
| Paid from own pocket | - | $10,927 Watch | none | NO (no purchase) | owned capex, engine 365/773 |
| Breakdown "0 assets", bar Debt 0%, Portfolio $0 | - | as shown | ok | yes, but contradicts "Debt vs value 98%" above | app.js:446,471 vs engine 716 |
| "Homes must cash flow positive ... Maple Ridge" warning | - | shown (my asset had rent 1500) | none | arguably right but belongs to Real | app.js:445 `badHomes` uses all houses |

## 4. Recommended design (one option)
The Planned page is "the plan"; the Real page is "what you own". Rule: with ZERO planned assets, the Planned page has no plan to grade.
1. In app.js planned page: add `nPl === 0` branch (like `empty`, app.js:425): show header + a neutral card "Nothing planned yet. Add a home, a commercial property or a business to see your plan." plus, when n > 0, one line "N bought asset(s) are counted on Real (open Real)." with a data-go link. No target line, no KPI grid of zeros, no verdict chip, no Checks card, no breakdown. (State A already behaves this way; B reuses it. Cheapest and removes every wrong number at once.)
2. Keep the Real page as the home of the owned asset's health (its own loan due, DSCR, cash flow; already there). Optionally add a Real-page note when debt/value > cap (out of scope, only if the user wants it).
3. Do NOT change the engine's feasible/checkList for plans WITH planned assets (Planned+owned combination stays: owned assets legitimately count in the pool, DTI, cushion, LTV when something is planned). Optional engine hardening: `checkList`/`feasible` return no `p-funding`/`check-buy` rows when nPl === 0 (so any other consumer, e.g. Finances page verdict-card at app.js:708 and the report, does not say "Not yet"/"last 0 mo"). Note Finances still calls the same feasible: check what it shows in B (not reproduced here) and give it the same "Nothing planned" neutral verdict for nPl===0.
4. `headline` (app.js:470): for nPl===0 keep only if the new card does not replace it; wording "Your 1 asset is bought" -> "1 bought asset (see Real)".
Alternative (not recommended): make feasible evaluate only planned assets; wrong because owned debt really enters the pool/lender view when something is planned.

Assumption to state in the hand-back: the user wants the empty-plan page; whether the owned asset's 98% LTV should surface a warning on Real is NOT decided here.

## 5. Regression checks to add (RED first, then fix)
Run only via tools/run-grader.sh; suggested slice: main or logic.
1. Planned page, state B (1 owned 98% LTV, 0 planned): no `afford-chip`, no `checks`, no `cf-progress`, no "Not yet", `plan-empty`-style note present and contains "Real"; `kpi-networth` absent or "Nothing planned".
2. Same state: engine `E.checkList` has no `check-pace` with value "last 0 mo" and no `check-buy`; `feasible.verdict` is not 'no' purely from an owned asset when nPl===0 (if hardening is chosen).
3. State A (no assets) unchanged: `empty-note` shown, no verdict, no checks.
4. State C unchanged: default plan still "Yes", 10 checks safe (guards that the fix did not touch plans with planned assets).
5. Press Remove on a portfolio with owned + planned, then confirm the page equals check 1 (flow test, the user's exact path), and Undo restores the plan.
6. Real page for state B still shows the owned asset, loans due, DSCR.
7. Add a row to playbook/escaped-defects.md before the fix.

## 6. Not verified / notes
- My owned asset (dp 2, rent 1500, cash $45,000) differs from the user's (cash $20,000 -> runway 0.6 mo, 4 flags). Same code path, so the structure is the same.
- Did not reproduce the Finances page (app.js:708) or the exported report in state B; they call the same engine so expect the same "Not yet".
- $10,927 "own pocket" likely the owned asset's improvements capex (engine.js:365) in the default home I picked; not isolated further.
- Screenshots: scratchpad/B-owned-only-direct.png, B2-owned+planned-then-remove.png, A-none.png, C-default.png.
