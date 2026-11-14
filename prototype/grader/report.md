# Prototype grader report

Target: `prototype/v4`  |  Run: 2026-11-14T19:09:24.555Z  |  48s

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
| A03 | Edit matrix: every input (43 edits incl. improvements/exit/loan/assumptions) moves the main-page KPIs exactly as the engine says | 10.80 | 10.80 | 44/44 sub-checks pass |
| A35 | A release never overwrites or resurrects the user's own portfolio (v19 -> v20 keeps it, S.added bookkeeping): empty stays empty, own assets kept with no second Lost Creek, missing S.added adds nothing, a new ADDITIONS entry lands once as the LAST planned asset and never returns after removal, Undo / Saved / backup keep S.added, v<=18 still switch with the "before the update" entry, new default plan targets hold | 7.20 | 7.20 | 19/19 sub-checks pass |

## Top failures

None.
