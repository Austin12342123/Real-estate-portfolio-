# Finance grader (FINANCE_ONLY)

Run: 2026-11-10T05:49:12.591Z  |  32s

## F. Personal finances: **89.35 / 90** (separate scale; a design review adds 10 later; not included in the A-E + R total)

| ID | Check | Pts | Earned | Detail |
|---|---|---|---|---|
| F1 | Engine correctness: independent month-by-month simulation + hand cases + edge values | 26.00 | 26.00 | 16/16 sub-checks pass |
| F2 | Verdict logic and advice | 16.00 | 16.00 | 17/17 sub-checks pass |
| F3 | UI features | 24.00 | 23.35 | 88/89 sub-checks pass. FAIL: a saved v8 state (assets only) keeps its assets and gains the default profile at DATA_V [v=9 p=45000 addr=Kept From V8] |
| F4 | Factor coverage: every input moves the answer in the right direction | 14.00 | 14.00 | 23/23 sub-checks pass |
| F5 | Robustness and accessibility | 10.00 | 10.00 | 10/10 sub-checks pass |

### F failures

- **F3 UI features** (-0.65): 88/89 sub-checks pass. FAIL: a saved v8 state (assets only) keeps its assets and gains the default profile at DATA_V [v=9 p=45000 addr=Kept From V8]
  - Reproduce: Playwright 390px: finances link, chip, jobs/expenses/capital editing, tooltip, persistence, backup, v8 migration, shared field, empty states
