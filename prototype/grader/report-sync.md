# Number-sync grader (SYNC_ONLY)

Run: 2026-11-16T17:31:30.686Z  |  167s

## G. Number sync: **99.87 / 100** (separate scale; not included in the A-E + R total or in F)

| ID | Check | Pts | Earned | Detail |
|---|---|---|---|---|
| G1 | Portfolio internal sync (KPIs = ledger total = rows = breakdown = chart = headline = engine) | 14.00 | 14.00 | 42/42 sub-checks pass |
| G2 | Asset page <-> Portfolio sync (share line, hero, impact, edits propagate) | 14.00 | 13.87 | 66/67 sub-checks pass. FAIL: impact line shown iff the asset changes that number (110/344 ok) [sample ridge: Net worth: engine $11.9M -> $11.9M not shown // sample north: Net worth: engine $11.7M -> $11.9M not shown // sample keystone: Net worth: engine $9,625,379 -> $11.9M not shown] |
| G3 | Portfolio <-> Finances sync (cash flow, funding, extra scope, verdict, edge cases) | 14.00 | 14.00 | 34/34 sub-checks pass |
| G4 | Asset-page field dependencies re-derive after every edit (property-based, 60+ edit sequences) | 18.00 | 18.00 | 34/34 sub-checks pass |
| G5 | Add page <-> created asset (loan option cards, option switching, 203(k) defaults) | 6.00 | 6.00 | 12/12 sub-checks pass |
| G6 | Cross-page navigation & persistence (nav, reload, backup restore, second tab, v8 migration, dark/light) | 12.00 | 12.00 | 12/12 sub-checks pass |
| G7 | Shared settings (g.* and p.*) propagate to every dependent display | 10.00 | 10.00 | 146/146 sub-checks pass |
| G8 | No stale / duplicate / contradictory numbers | 12.00 | 12.00 | 10/10 sub-checks pass |

### G failures

- **G2 Asset page <-> Portfolio sync (share line, hero, impact, edits propagate)** (-0.13): 66/67 sub-checks pass. FAIL: impact line shown iff the asset changes that number (110/344 ok) [sample ridge: Net worth: engine $11.9M -> $11.9M not shown || sample north: Net worth: engine $11.7M -> $11.9M not shown || sample keystone: Net worth: engine $9,625,379 -> $11.9M not shown]
  - Reproduce: For several assets per state: asset-share line == Portfolio row; impact "with" == KPIs; then edit asset inputs and re-check every Portfolio number
