# Portfolio gestures grader (GEST_ONLY)

Run: 2026-11-14T02:44:24.247Z  |  38s

## I. Portfolio sections, gestures and funding order: **100.00 / 100** (separate scale; not included in A-E + R, F, G or H)

| ID | Check | Pts | Earned | Detail |
|---|---|---|---|---|
| I1 | Swipe right from the left edge goes back like iOS (touchstart within 24 px, dx > 70, |dy| < 45); ignored elsewhere | 12.00 | 12.00 | 9/9 sub-checks pass |
| I2 | Press-and-hold then drag reorders a row inside its category (mouse and touch); list order is saved; a plain tap still opens the panel | 14.00 | 14.00 | 14/14 sub-checks pass |
| I3 | Move up / Move down buttons in the row panel (accessible alternative): reorder, disabled at the ends, panel stays open | 8.00 | 8.00 | 8/8 sub-checks pass |
| I4 | Funding follows the list order by itself: the trust funds each asset from everything before it (1,2,3 and 1,3,2), the wait lines and purchase months re-work after each move, nothing is stored per asset, no per-asset Funds picker, no re-link on plain load | 16.00 | 16.00 | 10/10 sub-checks pass |
| I5 | Duplicate: from the row panel and the asset page; copy sits right after the original, named "(copy)", planned, funded by the trust like any later asset | 10.00 | 10.00 | 6/6 sub-checks pass |
| I6 | Portfolio = total row + Homes / Commercial / Businesses dropdowns (name left, chevron right, stat strip: count, before/after loan, worth, DSCR, lasts), empty sections, Sold section only when something sold | 12.00 | 12.00 | 12/12 sub-checks pass |
| I7 | Selecting a row opens a nested panel with the extra payment and live effects: loan term, monthly payment, next down payment (with cash flow); all match the engine and the asset page | 12.00 | 12.00 | 25/25 sub-checks pass |
| I8 | Rent & expenses shows the loan payment (P&I + mortgage insurance, extra) and the cash flow after the loan, in sync with Payment now / Cash flow now | 6.00 | 6.00 | 6/6 sub-checks pass |
| I9 | Swipe down closes the keyboard (blurs the focused field); Enter / Done also closes it; swipes inside the field or upward do not | 6.00 | 6.00 | 6/6 sub-checks pass |
| I10 | Layout and hygiene: no sideways scroll at 320 / 390 / 430 with a panel open and while dragging, new buttons >= 44 px, no console errors or outside requests | 4.00 | 4.00 | 4/4 sub-checks pass |

### I failures

None.
