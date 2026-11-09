# Number-sync grader (SYNC_ONLY)

Run: 2026-11-09T05:06:56.294Z  |  66s

## G. Number sync: **99.03 / 100** (separate scale; not included in the A-E + R total or in F)

| ID | Check | Pts | Earned | Detail |
|---|---|---|---|---|
| G1 | Portfolio internal sync (KPIs = ledger total = rows = breakdown = chart = headline = engine) | 14.00 | 14.00 | 40/40 sub-checks pass |
| G2 | Asset page <-> Portfolio sync (share line, hero, impact, edits propagate) | 14.00 | 14.00 | 72/72 sub-checks pass |
| G3 | Portfolio <-> Finances sync (cash flow, funding, extra scope, verdict, edge cases) | 14.00 | 14.00 | 32/32 sub-checks pass |
| G4 | Asset-page field dependencies re-derive after every edit (property-based, 60+ edit sequences) | 18.00 | 17.48 | 34/35 sub-checks pass. FAIL: NOI note = independent NOI and cash flow (0/280 ok) [seq0 step0: ridge exit=merge -> Net operating income $808/mo: rent minus operating costs, before the loan. vs $808 / $808 // seq0 step1: birch down=115050 -> Net operating income $1,319/mo: rent minus operating costs, before the loan. vs $1,319 / $746 // seq0 step2: birch growth=7.0 -> Net operating income $1,319/mo: rent minus operating costs, before the loan. vs $1,319 / $746] |
| G5 | Add page <-> created asset (loan option cards, option switching, 203(k) defaults) | 6.00 | 6.00 | 12/12 sub-checks pass |
| G6 | Cross-page navigation & persistence (nav, reload, backup restore, second tab, v8 migration, dark/light) | 12.00 | 12.00 | 12/12 sub-checks pass |
| G7 | Shared settings (g.* and p.*) propagate to every dependent display | 10.00 | 9.55 | 138/142 sub-checks pass. FAIL: asset page: NOI note = independent NOI and cash flow (0/15 ok) [after g.cap=70 a -> Net operating income $1,672/mo: rent minus operating costs, before the loan. vs $1,672 / −$6 // after g.dti=25 a -> Net operating income $1,672/mo: rent minus operating costs, before the loan. vs $1,672 / −$6 // after g.closing=5 a -> Net operating income $1,672/mo: rent minus operating costs, before the loan. vs $1,672 / −$6]; vac edit re-derives NOI / cap rate on commercial and home pages (0/1 ok) [chips Vacancy 12% Mgmt 8% Repairs 1%/yr +$100/mo → 5 mo sooner]; mgmt edit re-derives NOI / cap rate on commercial and home pages (0/1 ok) [chips Vacancy 12% Mgmt 15% Repairs 1%/yr +$100/mo → 5 mo sooner]; maint edit re-derives NOI / cap rate on commercial and home pages (0/1 ok) [chips Vacancy 12% Mgmt 15% Repairs 2.5%/yr +$100/mo → 5 mo sooner] |
| G8 | No stale / duplicate / contradictory numbers | 12.00 | 12.00 | 10/10 sub-checks pass |

### G failures

- **G4 Asset-page field dependencies re-derive after every edit (property-based, 60+ edit sequences)** (-0.52): 34/35 sub-checks pass. FAIL: NOI note = independent NOI and cash flow (0/280 ok) [seq0 step0: ridge exit=merge -> Net operating income $808/mo: rent minus operating costs, before the loan. vs $808 / $808 || seq0 step1: birch down=115050 -> Net operating income $1,319/mo: rent minus operating costs, before the loan. vs $1,319 / $746 || seq0 step2: birch growth=7.0 -> Net operating income $1,319/mo: rent minus operating costs, before the loan. vs $1,319 / $746]
  - Reproduce: Random edit sequences on asset pages (price, down, rate, term, extra, payoff, wait, liens, paid, rent, costs, growth, capex, appraisal, gain, exit, loan option, status, target); every dependent field is re-derived independently after each edit
- **G7 Shared settings (g.* and p.*) propagate to every dependent display** (-0.45): 138/142 sub-checks pass. FAIL: asset page: NOI note = independent NOI and cash flow (0/15 ok) [after g.cap=70 a -> Net operating income $1,672/mo: rent minus operating costs, before the loan. vs $1,672 / −$6 || after g.dti=25 a -> Net operating income $1,672/mo: rent minus operating costs, before the loan. vs $1,672 / −$6 || after g.closing=5 a -> Net operating income $1,672/mo: rent minus operating costs, before the loan. vs $1,672 / −$6]; vac edit re-derives NOI / cap rate on commercial and home pages (0/1 ok) [chips Vacancy 12% Mgmt 8% Repairs 1%/yr +$100/mo → 5 mo sooner]; mgmt edit re-derives NOI / cap rate on commercial and home pages (0/1 ok) [chips Vacancy 12% Mgmt 15% Repairs 1%/yr +$100/mo → 5 mo sooner]; maint edit re-derives NOI / cap rate on commercial and home pages (0/1 ok) [chips Vacancy 12% Mgmt 15% Repairs 2.5%/yr +$100/mo → 5 mo sooner]
  - Reproduce: Edit each Assumptions / Finances setting through the UI; Portfolio, asset pages and Finances must re-derive (cap, DTI, closing, growth default, projection length, other debts, vacancy / mgmt / repairs, ...)
