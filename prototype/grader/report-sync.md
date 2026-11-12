# Number-sync grader (SYNC_ONLY)

Run: 2026-11-12T05:08:04.095Z  |  24s

## G. Number sync: **13.06 / 14** (separate scale; not included in the A-E + R total or in F)

| ID | Check | Pts | Earned | Detail |
|---|---|---|---|---|
| G3 | Portfolio <-> Finances sync (cash flow, funding, extra scope, verdict, edge cases) | 14.00 | 13.06 | 34/35 sub-checks pass. FAIL: Finances "Extra payments" (now) = Planned "extra now" + Real "extra now" (35/40 ok) [rand#17: Finances −$1,133 vs Planned header $0/mo extra now + bought 0 [engine extraNow 1133, planned 0, rx $0] (assets with an extra but no loan to pay down are counted in one but not the other) // rand#18: Finances −$192 vs Planned header $0/mo extra now + bought 0 [engine extraNow 192, planned 0, rx $0] (assets with an extra but no loan to pay down are counted in one but not the other) // rand#19: Finances −$2,605 vs Planned header $0/mo extra now · +$1,126 later + bought 2384 [engine extraNow 2605, planned 0, rx $2,384] (assets with an extra but no loan to pay down are counted in one but not the other)] |

### G failures

- **G3 Portfolio <-> Finances sync (cash flow, funding, extra scope, verdict, edge cases)** (-0.94): 34/35 sub-checks pass. FAIL: Finances "Extra payments" (now) = Planned "extra now" + Real "extra now" (35/40 ok) [rand#17: Finances −$1,133 vs Planned header $0/mo extra now + bought 0 [engine extraNow 1133, planned 0, rx $0] (assets with an extra but no loan to pay down are counted in one but not the other) || rand#18: Finances −$192 vs Planned header $0/mo extra now + bought 0 [engine extraNow 192, planned 0, rx $0] (assets with an extra but no loan to pay down are counted in one but not the other) || rand#19: Finances −$2,605 vs Planned header $0/mo extra now · +$1,126 later + bought 2384 [engine extraNow 2605, planned 0, rx $2,384] (assets with an extra but no loan to pay down are counted in one but not the other)]
  - Reproduce: Compare #finances with the Portfolio page and E.finance for the sample, 25 random states, 4 planned-extra edge cases and after editing job / cash / expense
