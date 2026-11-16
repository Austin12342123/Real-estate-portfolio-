# impl-main plan: main page "today basis" batch

Goal (user words): "main page today basis": remove 'Year 28 outlook', '2026*' instead of "in today's dollars" (* explained), portfolio cash flow / payments / DSCR in TODAY's (2026) terms with only 'Positive total income' / 'Negative income' under them, net worth main = today's dollars with year-28 as sub text, Real page shows both (today's main, year-28 sub), whole portfolio, correct DSCR; global rule today's main / year-28 sub; per-row cash flow today's with a short sign phrase; two-line planned rows; category strip 'N homes · +$X/mo · $Y'; Checks lists every check the engine runs (generated, count == engine list), 'month' = 'N months from today'.

Interpretations (3 likeliest misreadings):
1. "today's terms" = each asset's own month-0 numbers (E.todayTotals from pl.V), NOT the year-28 figure divided by inflation. Net worth stays the plan-end value in today's dollars (it only exists at the plan end).
2. Real page "whole portfolio, all assets listed" = every bought asset listed under its category (R5 totals stay per page).
3. "month" wording: every point in time reads 'N months from today (Mon YYYY)'; field labels such as 'Not before (months)' are lengths of time and are unchanged.

Files: v4/engine.js, v4/app.js, v4/info.js, grader/*.js (grade.js, plannedhz.js, dates.js, sync-grade.js, ux-grade.js, gesture-grade.js, finance-grade.js), playbook/escaped-defects.md. No style.css change (K21 compares it with HEAD).
Checks added: A60 (today basis), A61 (Real page + DSCR), A62 (Checks card = E.checkList), A63 (wording).
Budget: 10 slices, 1 full. Rollback: git checkout of the files above (orchestrator).

## log
- slice runs: see the hand-back.
