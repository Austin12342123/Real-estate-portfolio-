# Prototype grader report

Target: `prototype/v4`  |  Run: 2026-11-16T04:57:34.813Z  |  12s

## Automated score: **28.00 / 28** (a separate design review adds 15)

| Category | Score |
|---|---|
| A. Requirement / propagation | 18.00 / 18.00 |
| B. Engine correctness | 0.00 / 0.00 |
| C. UX conciseness & usability | 10.00 / 10.00 |
| D. PWA / local-first | 0.00 / 0.00 |
| E. Robustness & accessibility | 0.00 / 0.00 |
| R. Realism & market accuracy | 0.00 / 0.00 |

## All checks

| ID | Check | Pts | Earned | Detail |
|---|---|---|---|---|
| A25 | Saved portfolios: Rename, Duplicate and Delete (confirm; Cancel keeps it) work, persist after reload, and the empty state returns when the last one is deleted | 3.75 | 3.75 | 7/7 sub-checks pass |
| A26 | Backup includes the saved portfolios and the start-page choice; Restore brings them back (also after the storage was wiped) | 3.75 | 3.75 | 5/5 sub-checks pass |
| A27 | Default plan on screen: in TODAY'S dollars net worth at least $125.0M (up to about $135M) and cash flow at least $1.3M a month at year 28 (the future-dollar amounts, at the cost-increase rate, shown smaller), in one clear plan line and in the KPIs | 3.00 | 3.00 | 4/4 sub-checks pass |
| A30 | Opening an old save (v9-v18): no pop-up or Undo banner, the working portfolio is the current default plan (net worth >= $125M in today's dollars), and the old portfolio sits in Saved as "Portfolio N (before the update)" and loads back exactly | 3.00 | 3.00 | 4/4 sub-checks pass |
| A31 | Today's dollars on screen: with 5% cost increase and a sold asset, the Planned top card, category strips, breakdown and every row show the engine's future-dollar figure divided by 1.05^(months/12) (28 years at the plan end), the smaller line shows the future-dollar figure, and the Saved card follows the same rule | 4.50 | 4.50 | 9/9 sub-checks pass |
| C01 | At 390x844: summary KPIs, plan headline and the first ledger rows are visible without scrolling | 10.00 | 10.00 | 3/3 sub-checks pass |

## Top failures

None.
