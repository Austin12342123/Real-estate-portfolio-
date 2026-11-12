# Prototype grader report

Target: `prototype/v4`  |  Run: 2026-11-12T04:48:42.522Z  |  56s

## Automated score: **18.00 / 18** (a separate design review adds 15)

| Category | Score |
|---|---|
| A. Requirement / propagation | 18.00 / 18.00 |
| B. Engine correctness | 0.00 / 0.00 |
| C. UX conciseness & usability | 0.00 / 0.00 |
| D. PWA / local-first | 0.00 / 0.00 |
| E. Robustness & accessibility | 0.00 / 0.00 |
| R. Realism & market accuracy | 0.00 / 0.00 |

## All checks

| ID | Check | Pts | Earned | Detail |
|---|---|---|---|---|
| A02 | Changing an asset's loan option re-populates dp/rate/term/closing and changes the plan numbers | 1.55 | 1.55 | 12/12 sub-checks pass |
| A03 | Edit matrix: every input (43 edits incl. improvements/exit/loan/assumptions) moves the main-page KPIs exactly as the engine says | 3.72 | 3.72 | 44/44 sub-checks pass |
| A05 | Remove from the MAIN page: Edit mode, confirm, Undo, totals update; removing a funding source leaves the target listed | 2.48 | 2.48 | 10/10 sub-checks pass |
| A09 | Per-row numbers sum to the portfolio headline (cash flow, monthly payments, net worth) on the sample, and match the engine | 1.86 | 1.86 | 7/7 sub-checks pass |
| A10 | Exit and improvements through the UI: Hold/Sell/Merge buttons and fields propagate to rows, KPIs and breakdown | 2.17 | 2.17 | 8/8 sub-checks pass |
| A22 | Planned and Real hold the right rows: Planned = planned assets with the plan totals, Real = bought assets only; each page total equals the sum of its rows (and the engine) | 1.86 | 1.86 | 7/7 sub-checks pass |
| A24 | Saved portfolios: Save current portfolio (name field, default "Portfolio n", confirm), the card shows name, date, assets, net worth and cash flow from the engine; Open replaces the working portfolio with exactly the saved numbers and Undo brings the previous one back | 2.48 | 2.48 | 13/13 sub-checks pass |
| A29 | Each page's totals are unique to it: with 2 bought and 4 planned assets, Planned totals = sum of the planned rows (never the bought ones), Real totals = sum of the bought rows, the two differ, and together they equal the whole plan | 1.86 | 1.86 | 9/9 sub-checks pass |

## Top failures

None.
