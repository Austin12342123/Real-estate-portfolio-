# UX grader (UX_ONLY)

Run: 2026-11-16T03:40:45.880Z

## J. Dates, number-box math, Checks, sold profit, migration, stretch house: **100.00 / 100** (separate scale)

| ID | Check | Pts | Earned | Detail |
|---|---|---|---|---|
| J49 | Anomaly monitor: NaN in a KPI, a changed total, a failed read-back, mismatched stamps and a wrong state version are each flagged with their code; the Planned page shows "Something looked wrong. Tap to copy a bug report" (one tap copies, dismiss works); errors, rejections and storage failures land in a 60-entry, size-capped event ring | 35.90 | 35.90 | 15/15 sub-checks pass |
| J50 | Bug report: 8 sections, parseable, <= 8,000 characters; with "Include my numbers" off no street names, addresses or dollar amounts (sentinel address and price), with it on prices and rents but still no address; Copy uses the clipboard with the select-by-hand fallback; the GitHub link is valid, <= 7,500 characters and says the full report was copied; the app makes no network request | 41.03 | 41.03 | 13/13 sub-checks pass |
| J51 | No slowdown: the safety / monitor start-up work costs under 50 ms on the default 36-asset plan (median of 5 starts), the monitor under 50 ms, and the invariants run in node in under 20 ms | 10.26 | 10.26 | 3/3 sub-checks pass |
| J52 | Nothing else changed: backup export excludes safety and diagnostic keys, backup import still restores, Saved portfolios do not hold safety copies, and the default plan is untouched (36 assets, nothing owned, real NW >= $125M, cash flow >= $1.3M/mo, verdict Yes) | 12.82 | 12.82 | 4/4 sub-checks pass |

### J failures

None.
