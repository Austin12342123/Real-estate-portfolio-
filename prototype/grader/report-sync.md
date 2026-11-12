# Number-sync grader (SYNC_ONLY)

Run: 2026-11-12T02:25:38.995Z  |  123s

## G. Number sync: **99.91 / 100** (separate scale; not included in the A-E + R total or in F)

| ID | Check | Pts | Earned | Detail |
|---|---|---|---|---|
| G1 | Portfolio internal sync (KPIs = ledger total = rows = breakdown = chart = headline = engine) | 14.00 | 14.00 | 41/41 sub-checks pass |
| G2 | Asset page <-> Portfolio sync (share line, hero, impact, edits propagate) | 14.00 | 14.00 | 71/71 sub-checks pass |
| G3 | Portfolio <-> Finances sync (cash flow, funding, extra scope, verdict, edge cases) | 14.00 | 14.00 | 35/35 sub-checks pass |
| G4 | Asset-page field dependencies re-derive after every edit (property-based, 60+ edit sequences) | 18.00 | 18.00 | 34/34 sub-checks pass |
| G5 | Add page <-> created asset (loan option cards, option switching, 203(k) defaults) | 6.00 | 6.00 | 12/12 sub-checks pass |
| G6 | Cross-page navigation & persistence (nav, reload, backup restore, second tab, v8 migration, dark/light) | 12.00 | 12.00 | 12/12 sub-checks pass |
| G7 | Shared settings (g.* and p.*) propagate to every dependent display | 10.00 | 9.91 | 147/148 sub-checks pass. FAIL: cap edit moves the funding date on the Portfolio row of the next asset (b) = engine (0/1 ok) [Possible needs $55,200 cash · pool of 1: borrowing room $3,411 + cash $60,937 = $64,348 · +$29/mo reinvested · funded by the trust at month 27, held until your date (month 30) vs 30] |
| G8 | No stale / duplicate / contradictory numbers | 12.00 | 12.00 | 10/10 sub-checks pass |

### G failures

- **G7 Shared settings (g.* and p.*) propagate to every dependent display** (-0.09): 147/148 sub-checks pass. FAIL: cap edit moves the funding date on the Portfolio row of the next asset (b) = engine (0/1 ok) [Possible needs $55,200 cash · pool of 1: borrowing room $3,411 + cash $60,937 = $64,348 · +$29/mo reinvested · funded by the trust at month 27, held until your date (month 30) vs 30]
  - Reproduce: Edit each Assumptions / Finances setting through the UI; Portfolio, asset pages and Finances must re-derive (cap, DTI, closing, growth default, projection length, other debts, vacancy / mgmt / repairs, ...)
