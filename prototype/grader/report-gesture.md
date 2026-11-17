# Portfolio gestures grader (GEST_ONLY)

Run: 2026-11-17T05:50:42.600Z  |  55s

## I. Portfolio sections, gestures and funding order: **141.71 / 144** (separate scale; not included in A-E + R, F, G or H)

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
| I11 | Buy order screen: one flat list of all planned assets (homes, commercial, business) with number badges; Up / Down / Top / Move to # / Buy position box / drag move assets ACROSS categories, renumber at once, Undo works, targets >= 44 px, no overflow at 320 / 390 / 430 in light and dark | 14.00 | 14.00 | 13/13 sub-checks pass |
| I12 | Shortfall panel: for a $10M business with $2.5M down and $1M to pull out the asset page shows the cash lines, down short -$1,500,000, uncovered -$9,000,000, the monthly lines and ranked changes; the row says Not possible - short $1.5M; the Finances chip and headline say Not yet with that reason; it all updates without a reload; scorecard lists every test | 14.00 | 14.00 | 11/11 sub-checks pass |
| I13 | Reorder by hold: a main Reorder button on the Planned page opens the Buy order page; pressing and holding anywhere on a row (real touch events) lifts it, dragging moves it across categories with a drop line and edge auto-scroll, release renumbers; a quick swipe still scrolls and moves nothing; a tap or hold without moving changes nothing; 44 px, no overflow at 320 / 390 / 430 light and dark | 16.00 | 13.71 | 12/14 sub-checks pass. FAIL: the main Reorder button is visible in the header, above the page tabs and inside the first screen, and at least 44 px tall [{"x":277.453125,"y":1559.34375,"width":96.546875,"height":44}]; main button and hint show, nothing overflows and every target >= 44 px at 320 / 390 / 430 in light and dark [light320 {"ok":false,"sw":320,"W":320} / light390 {"ok":false,"sw":390,"W":390} / light430 {"ok":false,"sw":430,"W":430} / dark320 {"ok":false,"sw":320,"W":320} / dark390 {"ok":false,"sw":390,"W":390} / dark430 {"ok":false,"sw":430,"W":430}] |

### I failures

- **I13 Reorder by hold: a main Reorder button on the Planned page opens the Buy order page; pressing and holding anywhere on a row (real touch events) lifts it, dragging moves it across categories with a drop line and edge auto-scroll, release renumbers; a quick swipe still scrolls and moves nothing; a tap or hold without moving changes nothing; 44 px, no overflow at 320 / 390 / 430 light and dark** (-2.29): 12/14 sub-checks pass. FAIL: the main Reorder button is visible in the header, above the page tabs and inside the first screen, and at least 44 px tall [{"x":277.453125,"y":1559.34375,"width":96.546875,"height":44}]; main button and hint show, nothing overflows and every target >= 44 px at 320 / 390 / 430 in light and dark [light320 {"ok":false,"sw":320,"W":320} | light390 {"ok":false,"sw":390,"W":390} | light430 {"ok":false,"sw":430,"W":430} | dark320 {"ok":false,"sw":320,"W":320} | dark390 {"ok":false,"sw":390,"W":390} | dark430 {"ok":false,"sw":430,"W":430}]
  - Reproduce: Playwright + CDP Input.dispatchTouchEvent on #order
