# Finance grader (FINANCE_ONLY)

Run: 2026-11-09T16:04:28.957Z  |  22s

## F. Personal finances: **66.00 / 90** (separate scale; a design review adds 10 later; not included in the A-E + R total)

| ID | Check | Pts | Earned | Detail |
|---|---|---|---|---|
| F1 | Engine correctness: independent month-by-month simulation + hand cases + edge values | 26.00 | 26.00 | 16/16 sub-checks pass |
| F2 | Verdict logic and advice | 16.00 | 16.00 | 17/17 sub-checks pass |
| F3 | UI features | 24.00 | 0.00 | CRASH in check: page.waitForSelector: Timeout 4000ms exceeded. Call log: [2m  - waiting for locator('[data-p="j.job1.raise"]') to be visible[22m      at setVal (/home/user/Real-estate-portfolio-/prototype/grader/grade.js:105:14)     at fin (/home/user/Real-estate-portfolio-/prototype/grader/finance-grade.js:252:4 |
| F4 | Factor coverage: every input moves the answer in the right direction | 14.00 | 14.00 | 23/23 sub-checks pass |
| F5 | Robustness and accessibility | 10.00 | 10.00 | 10/10 sub-checks pass |

### F failures

- **F3 UI features** (-24.00): CRASH in check: page.waitForSelector: Timeout 4000ms exceeded.
Call log:
[2m  - waiting for locator('[data-p="j.job1.raise"]') to be visible[22m

    at setVal (/home/user/Real-estate-portfolio-/prototype/grader/grade.js:105:14)
    at fin (/home/user/Real-estate-portfolio-/prototype/grader/finance-grade.js:252:4
  - Reproduce: Playwright 390px: finances link, chip, jobs/expenses/capital editing, tooltip, persistence, backup, v8 migration, shared field, empty states
