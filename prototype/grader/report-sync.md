# Number-sync grader (SYNC_ONLY)

Run: 2026-11-12T15:48:47.565Z  |  156s

## G. Number sync: **99.91 / 100** (separate scale; not included in the A-E + R total or in F)

| ID | Check | Pts | Earned | Detail |
|---|---|---|---|---|
| G1 | Portfolio internal sync (KPIs = ledger total = rows = breakdown = chart = headline = engine) | 14.00 | 14.00 | 44/44 sub-checks pass |
| G2 | Asset page <-> Portfolio sync (share line, hero, impact, edits propagate) | 14.00 | 14.00 | 74/74 sub-checks pass |
| G3 | Portfolio <-> Finances sync (cash flow, funding, extra scope, verdict, edge cases) | 14.00 | 14.00 | 34/34 sub-checks pass |
| G4 | Asset-page field dependencies re-derive after every edit (property-based, 60+ edit sequences) | 18.00 | 18.00 | 34/34 sub-checks pass |
| G5 | Add page <-> created asset (loan option cards, option switching, 203(k) defaults) | 6.00 | 6.00 | 12/12 sub-checks pass |
| G6 | Cross-page navigation & persistence (nav, reload, backup restore, second tab, v8 migration, dark/light) | 12.00 | 12.00 | 12/12 sub-checks pass |
| G7 | Shared settings (g.* and p.*) propagate to every dependent display | 10.00 | 9.91 | 149/150 sub-checks pass. FAIL: Portfolio afford note = Finances headline (minus the Yes/Tight prefix) (24/25 ok) [after p.cash=5000: Can I afford this?Lenders may decline a loan around month 180 (Nov 2041).Not yet › vs Tight. Your cash dips below your emergency reserve today.] |
| G8 | No stale / duplicate / contradictory numbers | 12.00 | 12.00 | 10/10 sub-checks pass |

### G failures

- **G7 Shared settings (g.* and p.*) propagate to every dependent display** (-0.09): 149/150 sub-checks pass. FAIL: Portfolio afford note = Finances headline (minus the Yes/Tight prefix) (24/25 ok) [after p.cash=5000: Can I afford this?Lenders may decline a loan around month 180 (Nov 2041).Not yet › vs Tight. Your cash dips below your emergency reserve today.]
  - Reproduce: Edit each Assumptions / Finances setting through the UI; Portfolio, asset pages and Finances must re-derive (cap, DTI, closing, growth default, projection length, other debts, vacancy / mgmt / repairs, ...)
