# impl-retarget plan
Goal (user): cash-flow target $1.3M/mo means AFTER TAX, today's dollars, plan end; default plan must reach it (was $1,008,574), keep NW>=125M, verdict Yes, checks ok, nothing owned.
Misreadings: (1) target before tax (no: after tax); (2) replace users' portfolios (no: seedPlan only = fresh install/reset; no ADDITIONS, no DATA_V bump); (3) NW ceiling 135M must be kept (kept: NW 131.7M).
Files: v4/engine.js (seedPlan rows, CF_TARGET), v4/app.js (target label + progress), v4/style.css, grader/{grade,ux-grade,logic-grade}.js, grader/logic/gen-plan.js (docs).
Checks: logic L8.4c (new), A27 (label+progress), ux J-checks (after tax), full run once.
Log: generator BIZMOD=3->4, STEP 1.25->1.23, MULTS top 4.9,5.5->4.7,5.1, SBAMAX 2.6e6->2.2e6 (L4.7: SBA outstanding 6.0M>5M with 2.6e6). Result today$: NW 131.7M, cf before tax 1.949M, after tax 1.379M, last buy month 271, verdict Yes, 10/10 checks ok.
