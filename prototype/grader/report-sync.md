# Number-sync grader (SYNC_ONLY)

Run: 2026-11-17T05:55:32.108Z  |  195s

## G. Number sync: **97.89 / 101** (separate scale; not included in the A-E + R total or in F)

| ID | Check | Pts | Earned | Detail |
|---|---|---|---|---|
| G1 | Portfolio internal sync (KPIs = ledger total = rows = breakdown = chart = headline = engine) | 14.00 | 14.00 | 42/42 sub-checks pass |
| G2 | Asset page <-> Portfolio sync (share line, hero, impact, edits propagate) | 14.00 | 14.00 | 70/70 sub-checks pass |
| G3 | Portfolio <-> Finances sync (cash flow, funding, extra scope, verdict, edge cases) | 14.00 | 14.00 | 34/34 sub-checks pass |
| G4 | Asset-page field dependencies re-derive after every edit (property-based, 60+ edit sequences) | 18.00 | 18.00 | 34/34 sub-checks pass |
| G5 | Add page <-> created asset (loan option cards, option switching, 203(k) defaults) | 6.00 | 2.89 | 5/11 sub-checks pass. FAIL: add-page card shows down / rate / term of the option (0/14 ok) [conv30: null // conv15: null // fha: null]; created asset stores the option (closing %, interest-only, insurance, loan id) (3/14 ok) [conv15: {"l":"conv30","c":3,"io":false,"mu":0,"ma":0} // fha: {"l":"conv30","c":3,"io":false,"mu":0,"ma":0} // k203: {"l":"conv30","c":3,"io":false,"mu":0,"ma":0}]; created asset: closing field and payment follow the option (5/14 ok) [fha: payment $2,088 vs $2,088 // k203: payment $2,088 vs $2,088 // dscr: payment $2,088 vs $2,088]; 203(k): rehab default is set and appraisal = (price + rehab) x 1.15 (0/1 ok) [capex 0 arv 0]; 203(k): appraisal follows a new price until typed over (0/1 ok) [price 275000 arv 0 want 316000]; 203(k): appraisal follows a new rehab budget until typed over (0/1 ok) [capex 60000 arv 359000 want 385000] |
| G6 | Cross-page navigation & persistence (nav, reload, backup restore, second tab, v8 migration, dark/light) | 12.00 | 12.00 | 12/12 sub-checks pass |
| G7 | Shared settings (g.* and p.*) propagate to every dependent display | 10.00 | 10.00 | 146/146 sub-checks pass |
| G8 | No stale / duplicate / contradictory numbers | 12.00 | 12.00 | 10/10 sub-checks pass |
| G9 | The grader loads the intended portfolio every time (no boot race, 30 loads at 4x CPU throttle) | 1.00 | 1.00 | 0 of 30 loads started from a different portfolio  |

### G failures

- **G5 Add page <-> created asset (loan option cards, option switching, 203(k) defaults)** (-3.11): 5/11 sub-checks pass. FAIL: add-page card shows down / rate / term of the option (0/14 ok) [conv30: null || conv15: null || fha: null]; created asset stores the option (closing %, interest-only, insurance, loan id) (3/14 ok) [conv15: {"l":"conv30","c":3,"io":false,"mu":0,"ma":0} || fha: {"l":"conv30","c":3,"io":false,"mu":0,"ma":0} || k203: {"l":"conv30","c":3,"io":false,"mu":0,"ma":0}]; created asset: closing field and payment follow the option (5/14 ok) [fha: payment $2,088 vs $2,088 || k203: payment $2,088 vs $2,088 || dscr: payment $2,088 vs $2,088]; 203(k): rehab default is set and appraisal = (price + rehab) x 1.15 (0/1 ok) [capex 0 arv 0]; 203(k): appraisal follows a new price until typed over (0/1 ok) [price 275000 arv 0 want 316000]; 203(k): appraisal follows a new rehab budget until typed over (0/1 ok) [capex 60000 arv 359000 want 385000]
  - Reproduce: Open #add, pick every loan option for every type, add it, compare card numbers with the asset fields; switch options on the asset page; 203(k) rehab/appraisal follow price+rehab until typed over
