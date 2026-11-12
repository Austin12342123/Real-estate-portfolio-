# Number-sync grader (SYNC_ONLY)

Run: 2026-11-12T04:58:52.323Z  |  143s

## G. Number sync: **99.06 / 100** (separate scale; not included in the A-E + R total or in F)

| ID | Check | Pts | Earned | Detail |
|---|---|---|---|---|
| G1 | Portfolio internal sync (KPIs = ledger total = rows = breakdown = chart = headline = engine) | 14.00 | 14.00 | 44/44 sub-checks pass |
| G2 | Asset page <-> Portfolio sync (share line, hero, impact, edits propagate) | 14.00 | 14.00 | 74/74 sub-checks pass |
| G3 | Portfolio <-> Finances sync (cash flow, funding, extra scope, verdict, edge cases) | 14.00 | 13.06 | 34/35 sub-checks pass. FAIL: Finances "Extra payments" (now) = Planned "extra now" + Real "extra now" (35/40 ok) [rand#17: Finances −$1,133 vs Planned header $0/mo extra now + Real $0 (assets with an extra but no loan to pay down are counted in one but not the other) // rand#18: Finances −$192 vs Planned header $0/mo extra now + Real $0 (assets with an extra but no loan to pay down are counted in one but not the other) // rand#19: Finances −$2,605 vs Planned header $0/mo extra now · +$1,126 later + Real $2,384 (assets with an extra but no loan to pay down are counted in one but not the other)] |
| G4 | Asset-page field dependencies re-derive after every edit (property-based, 60+ edit sequences) | 18.00 | 18.00 | 34/34 sub-checks pass |
| G5 | Add page <-> created asset (loan option cards, option switching, 203(k) defaults) | 6.00 | 6.00 | 12/12 sub-checks pass |
| G6 | Cross-page navigation & persistence (nav, reload, backup restore, second tab, v8 migration, dark/light) | 12.00 | 12.00 | 12/12 sub-checks pass |
| G7 | Shared settings (g.* and p.*) propagate to every dependent display | 10.00 | 10.00 | 151/151 sub-checks pass |
| G8 | No stale / duplicate / contradictory numbers | 12.00 | 12.00 | 10/10 sub-checks pass |

### G failures

- **G3 Portfolio <-> Finances sync (cash flow, funding, extra scope, verdict, edge cases)** (-0.94): 34/35 sub-checks pass. FAIL: Finances "Extra payments" (now) = Planned "extra now" + Real "extra now" (35/40 ok) [rand#17: Finances −$1,133 vs Planned header $0/mo extra now + Real $0 (assets with an extra but no loan to pay down are counted in one but not the other) || rand#18: Finances −$192 vs Planned header $0/mo extra now + Real $0 (assets with an extra but no loan to pay down are counted in one but not the other) || rand#19: Finances −$2,605 vs Planned header $0/mo extra now · +$1,126 later + Real $2,384 (assets with an extra but no loan to pay down are counted in one but not the other)]
  - Reproduce: Compare #finances with the Portfolio page and E.finance for the sample, 25 random states, 4 planned-extra edge cases and after editing job / cash / expense
