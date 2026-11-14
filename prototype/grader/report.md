# Prototype grader report

Target: `prototype/v4`  |  Run: 2026-11-14T03:04:34.293Z  |  13s

## Automated score: **18.00 / 18** (a separate design review adds 15)

| Category | Score |
|---|---|
| A. Requirement / propagation | 18.00 / 18.00 |
| B. Engine correctness | 0.00 / 0.00 |
| C. UX conciseness & usability | 0.00 / 0.00 |
| D. PWA / local-first | 0.00 / 0.00 |
| E. Robustness & accessibility | 0.00 / 0.00 |
| R. Realism & market accuracy | 0.00 / 0.00 |

## All checks

| ID | Check | Pts | Earned | Detail |
|---|---|---|---|---|
| A21 | Main screen: always-visible tab bar Planned | Real | Saved (even when Real is empty), exactly one page at a time, tabs >= 44px at 320/390/430 with no sideways scroll, swipe or tap, page remembered while you move around | 3.38 | 3.38 | 7/7 sub-checks pass |
| A27 | Default plan on screen: in TODAY'S dollars net worth at least $125.0M (up to about $135M) and cash flow at least $1.3M a month at year 28 (the future-dollar amounts, at the cost-increase rate, shown smaller), in one clear plan line and in the KPIs | 2.25 | 2.25 | 4/4 sub-checks pass |
| A30 | Opening an old save (v9-v18): no pop-up or Undo banner, the working portfolio is the current default plan (net worth >= $125M in today's dollars), and the old portfolio sits in Saved as "Portfolio N (before the update)" and loads back exactly | 2.25 | 2.25 | 4/4 sub-checks pass |
| A31 | Today's dollars on screen: with 5% cost increase and a sold asset, the Planned top card, category strips, breakdown and every row show the engine's future-dollar figure divided by 1.05^(months/12) (28 years at the plan end), the smaller line shows the future-dollar figure, and the Saved card follows the same rule | 3.38 | 3.38 | 9/9 sub-checks pass |
| A32 | Show figures in: Assumptions has Today's dollars | Future dollars with an (i), default Today's, tap targets >= 44px; switching shows the engine's future-dollar figures on the Planned and Real top cards, the breakdown and the Saved card; the choice persists in the UI storage and after a reload; nothing in the portfolio data changes | 3.38 | 3.38 | 8/8 sub-checks pass |
| A33 | Prices stay today's prices: every planned asset's price on screen is the entered price (nothing is inflated), the cash a purchase needs is its down payment + closing + improvements on that price whatever month it is bought, and the glossary says so | 2.25 | 2.25 | 5/5 sub-checks pass |
| A34 | An older default plan (v18) opens silently on the new default: no pop-up or Undo banner, the working portfolio is the new plan, the old portfolio is filed in Saved as "Portfolio N (before the update)" and loads back exactly; the unit choice is not touched | 1.13 | 1.13 | 3/3 sub-checks pass |

## Top failures

None.
