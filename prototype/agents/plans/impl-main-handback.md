# HAND-BACK (send exactly once; lint with tools/handback.sh --owner ID --report FILE --final)

Task: main page "today basis" batch (2026*, today's terms for cash flow / payments / DSCR, Real page both values + correct DSCR, two-line rows, category strip, Checks generated from the engine, "N months from today")   Owner: impl-main   Status: DONE-WITH-GAPS

## What changed
- /home/user/Real-estate-portfolio-/prototype/v4/engine.js: new E.todayTotals(S, pl, ids) (month-0 cash flow, payments, income, debt service, DSCR = income / (P&I + MIP)) and E.checkList(S, pl, fin) (every check the engine runs: the 8 portfolio tests of E.feasible + "Assets you can buy" + "Paid from your own pocket" when > 0); mAt/inM now write "N months from today (Mon YYYY)"; Diag total-equals-rows compares the on-screen total with today's terms (engine plan-end consistency test kept).
- /home/user/Real-estate-portfolio-/prototype/v4/app.js: top card label "2026*" with the * footnote and an (i) (no "Year 28 outlook"); Planned KPIs Cash flow / Payments / DSCR = today's terms, sub text only "Positive total income" / "Negative income", no second value; Net worth main = today's dollars with the year-28 amount as the small line; Real page: same KPIs plus the year-28 small lines, DSCR from the engine ratio, all bought assets listed; rows: big cash flow = today's with "Positive/Negative income", line 1 "$price · $rent/mo rent · +$X reno", line 2 "verdict · needs $X (first asset: uses $X saved cash) · in N mo (Mon YYYY)" (a "Not possible" row says what is short instead of a date); category strip "N homes · +$X/mo · $Y"; breakdown cash flow column today's; Checks card rendered from E.checkList (value, limit, status word, (i)); asset-page impact box cash flow / payments in today's terms; Finances "At plan end" note says the Portfolio page shows today's terms; "month N" wording -> "N months from today (Mon YYYY)".
- /home/user/Real-estate-portfolio-/prototype/v4/info.js: units entry rewritten for 2026*; new entries runway, hours, cltv, concentration. No style.css or DATA_V change (no migration, no user data touched). Artifact rebuilt with python3 build-artifact.py (stamp c627dd1f).
- Graders: new A60 (today basis, rows, strips, wording), A61 (Real page both values + DSCR reconciles with the engine and the asset page), A62 (Checks card count and fields = E.checkList, 2 portfolios), A63 (wording, glossary); plannedhz.js now returns today's terms (todayOf) with plan-end figures under .y28; dates.js mond; many existing assertions updated (list below). Row E20 added to /home/user/Real-estate-portfolio-/prototype/agents/playbook/escaped-defects.md. Plan file: /home/user/Real-estate-portfolio-/prototype/agents/plans/impl-main.md.

## Evidence of verification (ledger run ids)
- Full grader clean on the final tree (v4 hash 0961e84086b2, no edit after it): 20261116T163610-6482 (budget: slices 10/10, full 1/1).
- Slices on the same tree (0961e84086b2): main 20261116T162826-5621 clean; sync 20261116T163317-6106 clean.
- Earlier slices on earlier trees (each failure was fixed and re-checked in the later runs above or the full run): checks:A60,A61,A62,A63,A09,A12,A27,A31,A32 20261116T155230-1406 (it ran the other categories too; timeout, tree changed mid-run because I stamped v4 while it ran, so INVALID; its failures guided the fixes); ux 20261116T160543-2854 (only J49, fixed in engine); gest 20261116T161014-3412 clean; sync 20261116T161109-3638 (G1,G2,G6,G7 fixed) and 20261116T161431-4051 (G7 fixed in the grader); info 20261116T161737-4428 clean; design 20261116T161827-4639 clean; main 20261116T162306-5058 (A21,A22,A29,A33,C03 fixed).
- Own screenshots (not grader): /tmp/claude-0/s/shot-390-light-planned.png, shot-320-dark-planned.png, shot-390-light-real.png (viewed 390 light, 320 dark, Real 390 light).

## NOT verified
- 430px light/dark and 320 light were not viewed by me; K (design) and the layout checks passed in the full run only.
- No real-device check; no check of an installed (service-worker cached) old copy upgrading in place beyond the grader's J45.
- The published Artifact was NOT updated or checked: only python3 build-artifact.py was run; publishing/pushing is the orchestrator's step.
- The L2.7 "UNVERIFIED" note in the logic log (lostcreek cap 9.6) is an existing unverified-benchmark note, not a failure; it is unchanged by this task.

## What could not be done
- No RED ledger run for the new checks A60-A63: they were written after the implementation and call E.todayTotals / E.checkList, which do not exist at HEAD (same situation as E19). Budget did not allow a RED run on a stashed copy (stash is forbidden).
- Field labels such as "Not before (months)", "Sell in (months)" were left as they are: they are lengths of time, not points in time. Only points in time were changed to "N months from today".

## Assumptions [ask-user-if-wrong]
- "Today's (2026) terms" for cash flow / payments / DSCR = each asset's own month-0 numbers (planned assets count once they are in the plan's end snapshot, same set as before); Net worth stays the plan-end value in today's dollars (it exists only at the plan end). [ask-user-if-wrong]
- The Sub text "Positive total income" / "Negative income" is applied to payments, cash flow and DSCR alike, by the sign of the cash flow. Rows use the shorter "Positive income" / "Negative income". [ask-user-if-wrong]
- Real page "whole portfolio with all assets listed" = every bought asset under its category; Planned and Real totals stay unique per page (R5). [ask-user-if-wrong]
- Row line 2 for the first asset reads "uses $20,378 saved cash" (the engine's savings above the cushion, about $20,000) instead of "needs $X"; the cash it still needs beyond that comes from job pay (on the asset page). A "Not possible" row shows what is short (e.g. "short $1.5M", "DSCR 1.10 vs 1.25") instead of the date. [ask-user-if-wrong]
- The Future dollars switch in Assumptions is kept (default today's). In that mode net worth main = future dollars with today's as the small line; cash flow, payments and DSCR stay today's. [ask-user-if-wrong]
- Finances "At plan end" card and the asset-page "portfolio share" line stay plan-end (year 28) figures; the Finances note now says so. The asset-page impact box (cash flow, payments) follows today's terms so it still reconciles with the two KPI sets. [ask-user-if-wrong]
- Checks: the card lists all portfolio tests every time (the DTI row is hidden only when nothing can be funded and nothing is owned, as before) and "Paid from your own pocket" only when above $0.

## Questions for the user
- Should the per-row payment and equity (removed from the row by the declutter) come back anywhere? Options: (a) no, expanded Extra panel only (current; the row keeps data-pay / data-equity for checks); (b) show payment in line 1. Default (a).

## Failures seen (including "flaky")
- Mid-run tree change: I ran python3 stamp.py while slice 20261116T155230-1406 was running; the run is invalid (diagnosed, my own action; not repeated).
- Slice run 20261116T155230-1406 with checks: also ran every non-A-E category and hit its 600 s default timeout (exit 124); later runs used --timeout-sec.
- No check was dismissed as flaky; every failure listed above was diagnosed and fixed, then confirmed in a later run.

## Grader edits (assertions/thresholds/tests changed)
- grade.js A09 (~l.598): headline regex /month \d+/ -> /\d+ months? from today/ (wording). A09 first KPI check: Engine plan horizon -> PH() (cash flow and payments in today's terms).
- grade.js A12 (~l.602): dp-line "pool of N has / room / cash / by month M" -> verdict + "needs $X" (first asset "uses $X saved cash") + "in N mo (Mon YYYY)"; the pool and room text no longer exists in the row (pool sizes are the engine's, still asserted in gesture I4).
- grade.js A10 (~l.593): row text /Renovation/ -> /+$X reno/ (the reno tag became part of line 1).
- grade.js A22 (~l.633-635): Real totals expectation payments/cash flow plan-end -> today's terms (HZ.todayOf); A29 (~l.654) the "whole plan" sum for payments / cash flow -> today's terms.
- grade.js A27 (~l.715-718): label /Year 28 outlook ... today's dollars/ -> /2026*/ and no outlook / Year N; cash flow expectation year-28/f -> today's terms; the alt-line check for cash flow and payments (>= $2.98M future dollars) REMOVED because those KPIs have no second value now (net worth alt kept, >= $286M).
- grade.js A31 (~l.726-737): alt lines for cash flow / payments removed (asserted absent); top-card payments and cash flow, breakdown Portfolio cash flow, category rows and per-row cash flow expectations = today's terms; text check /today's dollars/ -> /2026*/ and not "in today's dollars".
- grade.js A32 (~l.747): future-mode cash flow / payments expectation = today's terms; /future dollars/ -> /future dollars/i.
- grade.js A33 (~l.767): row price parse /price \$X/ -> first "$X · $rent/mo rent" of line 1.
- grade.js READ_MAIN / snap: payN now from the row's data-pay (the row no longer prints its payment); equity text unchanged (data-equity).
- plannedhz.js: plannedHz / realHz cf, monthly, noi, ds, dscr now today's terms (old plan-end values kept in .y28); added todayOf. dates.js mond: 'month N (Mon YYYY)' -> 'N months from today (Mon YYYY)'.
- sync-grade.js: KPI subtext checks (net worth "N assets · by year Y" -> "N planned assets" + alt "at year Y ("; payments/cash flow "incl. extra" / "after extra" subtexts -> only the sign phrase, no second value); row payment text check -> data-pay = V.payment and line 1 price/rent; row cash flow = V cf (was plan-end share); row equity TEXT check REMOVED (equity no longer printed; data-equity check kept); share payment / cash flow = row checks REMOVED (row is today's, the share line is plan-end; share = engine and share equity = data-equity kept); "unbought asset: row does not claim a payment" -> cash flow "—" and no data-pay; engine snapshot-sum check split into plan-end sums (.y28) plus month-0 sums; Finances sync-cf and "At plan end" Before tax = year-28 cash flow of Planned + Real (was Planned KPI + Real KPI); impact box cash flow / payments expectation = today's terms; sold/lowest-cash/regexes "month N" -> "N months from today"; G7 cap check (~l.632): "by month rd" -> "in N mo (" or a "Not possible · needs $X · <why>" row (a Not possible row shows the shortfall instead of a date; this loosens the date requirement for Not possible rows only); "extra now" header check: subtext "incl." rule -> subtext has no extra text, /by year/ -> /(by|at) year/i.
- ux-grade.js l.80 (J2) row cash flow expectation plan-end -> today's (V cf); l.134 J4 "in month" -> "in N months from today"; l.274 J13 Month N (Mon YYYY) -> N months from today (Mon YYYY); l.512 J29 "now" parse -> the row's big cash flow (today's).
- gesture-grade.js l.121-130 I4: dp-line month parse "by month M" / "pool of N" -> "in N mo (" (= purchase month) and needs $X; l.166 I6 strip check: before/after loan, worth, DSCR, lasts -> "N homes · +$X/mo · $Y".
- finance-grade.js l.167, 171, 249: 'month N' -> 'N months from today' regexes (F2, F3).
- No numeric threshold, tolerance or coverage floor was changed (diff-constants not run by me; the list above is complete by reading git diff).
- Integrity check section A (postflight exit 7) lists each changed assertion above as "CONSTANT CHANGE" (about 40 lines in grade.js, sync-grade.js, ux-grade.js, gesture-grade.js, finance-grade.js); every one is described in the list above with before -> after and the reason; none is a numeric threshold lowered to pass; no LOOSEN? flag was raised. Section B (conduct scan) was not performed by the tool (no transcript). I ran no kill, stash, reset, checkout or direct node grade.js; the only process control issue was my own stamp.py during a run (disclosed under Failures). style.css differs from HEAD only by the build stamp line (no CSS change).
- Changed files outside the claim: none. grader/report-*.md, result-*.json and grader/screens/*.png also changed as a side effect of the slice and full runs (generated outputs, not hand edits).
