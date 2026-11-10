# Finance grader (FINANCE_ONLY)

Run: 2026-11-10T09:32:39.995Z  |  28s

## F. Personal finances: **81.28 / 90** (separate scale; a design review adds 10 later; not included in the A-E + R total)

| ID | Check | Pts | Earned | Detail |
|---|---|---|---|---|
| F1 | Engine correctness: independent month-by-month simulation + hand cases + edge values | 26.00 | 26.00 | 16/16 sub-checks pass |
| F2 | Verdict logic and advice | 16.00 | 16.00 | 17/17 sub-checks pass |
| F3 | UI features | 24.00 | 15.28 | 57/89 sub-checks pass. FAIL: afford chip on main equals the engine status (Tight) [Yes]; sample: verdict chip + headline equal the engine (Tight) [Yes / Yes. You can carry this plan. vs Tight / Tight. Your cash dips below your emergency reserve in month 18.]; sample: lowest cash + month equal the engine [$63,302 · month 0 vs 7156 m18]; sample: fix list equals the engine []; gross 150000: lowest cash + month equal the engine [$66,722 · month 0 vs 74343 m18]; raise 6: lowest cash + month equal the engine [$66,722 · month 0 vs 76353 m18]; tax 30: lowest cash + month equal the engine [$65,972 · month 0 vs 61460 m18]; hours 55: lowest cash + month equal the engine [$65,972 · month 0 vs 61460 m18]; start 3: lowest cash + month equal the engine [$57,222 · month 0 vs 32477 m18]; end 40: lowest cash + month equal the engine [$57,222 · month 0 vs 32477 m18]; blank end = ongoing: lowest cash + mont |
| F4 | Factor coverage: every input moves the answer in the right direction | 14.00 | 14.00 | 23/23 sub-checks pass |
| F5 | Robustness and accessibility | 10.00 | 10.00 | 10/10 sub-checks pass |

### F failures

- **F3 UI features** (-8.72): 57/89 sub-checks pass. FAIL: afford chip on main equals the engine status (Tight) [Yes]; sample: verdict chip + headline equal the engine (Tight) [Yes / Yes. You can carry this plan. vs Tight / Tight. Your cash dips below your emergency reserve in month 18.]; sample: lowest cash + month equal the engine [$63,302 · month 0 vs 7156 m18]; sample: fix list equals the engine []; gross 150000: lowest cash + month equal the engine [$66,722 · month 0 vs 74343 m18]; raise 6: lowest cash + month equal the engine [$66,722 · month 0 vs 76353 m18]; tax 30: lowest cash + month equal the engine [$65,972 · month 0 vs 61460 m18]; hours 55: lowest cash + month equal the engine [$65,972 · month 0 vs 61460 m18]; start 3: lowest cash + month equal the engine [$57,222 · month 0 vs 32477 m18]; end 40: lowest cash + month equal the engine [$57,222 · month 0 vs 32477 m18]; blank end = ongoing: lowest cash + mont
  - Reproduce: Playwright 390px: finances link, chip, jobs/expenses/capital editing, tooltip, persistence, backup, v8 migration, shared field, empty states
