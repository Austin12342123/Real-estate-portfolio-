# Asset numbering grader (NUM_ONLY)

Run: 2026-11-16T04:10:09.520Z  |  48s

## N. Asset numbering: **100.00 / 100** (separate scale; policy and ideation in numbering-bugs.md)

| ID | Check | Pts | Earned | Detail |
|---|---|---|---|---|
| N1 | Engine numbering(): contiguous 1..n per view in purchase order on 300 seeded random portfolios, pure, shifts by one on removal | 10.00 | 10.00 | 9/9 sub-checks pass |
| N2 | The screenshot: one planned commercial + one planned home (+ a bought asset) show 1 and 2 in purchase order, nothing skipped | 10.00 | 10.00 | 11/11 sub-checks pass |
| N3 | Hidden assets never take a Planned number: two bought assets, a bought commercial and business, a sold-in-plan asset | 10.00 | 10.00 | 30/30 sub-checks pass |
| N4 | Remove an asset (first / middle / last) shifts every later number down by one at once, read without reloading, and again after a reload | 12.00 | 12.00 | 14/14 sub-checks pass |
| N5 | Remove all planned assets, Undo, and add after Remove-all keep the numbers right (bought assets stay 1..m, new planned asset is 1) | 8.00 | 8.00 | 11/11 sub-checks pass |
| N6 | Undo of a removal, Duplicate, Move up/down and the owned <-> planned toggle all leave contiguous numbers in order | 12.00 | 12.00 | 30/30 sub-checks pass |
| N7 | Adding an asset (Add flow, an example, a bought asset) numbers it last in its own view and renumbers nothing else | 8.00 | 8.00 | 12/12 sub-checks pass |
| N8 | Scenario load, Saved open, backup import, ADDITIONS append and an old unsorted save all give contiguous numbers in both views | 12.00 | 12.00 | 53/53 sub-checks pass |
| N9 | Seeded random portfolios (home / commercial / business / multi-family, planned / bought / sold / merged): both pages contiguous, headers and labels agree, and after a random Remove | 10.00 | 10.00 | 135/135 sub-checks pass |
| N10 | Every "#N" the app prints is a real number of its own view; Finances and Saved pages carry no stale numbers; the default plan is 1..36 in order and unchanged | 8.00 | 8.00 | 15/15 sub-checks pass |

### N failures

None.
