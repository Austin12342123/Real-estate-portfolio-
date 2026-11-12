# UX grader (UX_ONLY)

Run: 2026-11-12T15:21:56.647Z

## J. Dates, number-box math, Checks, sold profit, migration, stretch house: **100.00 / 100** (separate scale)

| ID | Check | Pts | Earned | Detail |
|---|---|---|---|---|
| J1 | Calendar dates: month 0 = today (Nov 12, 2026), month N = today + N months (Nov 12, 2026 / Nov 2026; never MM/DD/YY); every month-from-today field shows its date and updates as you type; the first asset says where its money comes from; no bare "starting point" | 10.34 | 10.34 | 9/9 sub-checks pass |
| J2 | Math in number boxes: 650*3, 1,200+450, (2000-300)/2, 650x3 and $/% forms evaluate with a safe parser; the answer reaches rows, totals and the asset page; invalid, half-typed and divide-by-zero input never changes the data and says "Check the math"; no eval / Function in the source | 13.79 | 13.79 | 27/27 sub-checks pass |
| J3 | Planned page Checks: one plain row per check, highlighted only past a safe amount; one calm line when everything is safe; Details link is in normal flow (no overlap at 320/390/430) and >= 44px | 12.07 | 12.07 | 16/16 sub-checks pass |
| J4 | Sold assets show how much cash was profited: Sold row, Sold category and the asset page all match the engine (price - selling costs - loan - tax - cash put in) | 10.34 | 10.34 | 6/6 sub-checks pass |
| J5 | Old saves move silently to the current plan with the default finance profile (no popup or undo banner); the old portfolio, with its own profile, is filed in Saved as "Portfolio N (before the update)" | 10.34 | 10.34 | 5/5 sub-checks pass |
| J6 | Stretch scenario button loads a plan that buys 607 Siena Way ($135,000,000) and the Finances verdict is not "no"; the button and confirm text say so | 8.62 | 8.62 | 6/6 sub-checks pass |
| J7 | Every (i) info button, the Details link and the tab buttons are >= 44px in both directions on Planned, asset, Finances and Assumptions at 390px | 6.90 | 6.90 | 4/4 sub-checks pass |
| J8 | Loading a sample portfolio files the current plan in Saved as "Portfolio N (before <scenario>)", shows an Undo banner that restores it, lands on the Planned tab, and the buttons are neutral with short titles | 10.34 | 10.34 | 6/6 sub-checks pass |
| J9 | Invalid math (5/0, 650*) never changes state or any dependent while typing or after leaving, the box goes back to its last good value with a Kept note, the field never moves, the hint is >= 13px, and labels keep their (i) beside the last word | 10.34 | 10.34 | 5/5 sub-checks pass |
| J10 | Checks: no Last purchase / Lenders / "Down payments beyond the trust" rows, the Details button stays visible (and in the gutter) when something is flagged, DTI over the limit is red on the chip, the header and the row | 6.90 | 6.90 | 4/4 sub-checks pass |

### J failures

None.
