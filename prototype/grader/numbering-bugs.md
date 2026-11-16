# Asset numbering: bug ideation, policy and fix

User report (two phone screenshots of the Planned page): the Homes card shows one home badged 3, the Commercial card shows one commercial property badged 2, Businesses is empty, and there is no asset 1 on the page. Rule asked for: numbers are in the order of purchase; remove asset 6 and 7 becomes 6.

## Root cause (reproduced against the old build, 390x844, dpr 2)

`buyOrder(pl)` in `app.js` numbered EVERY house in `S.houses` (planned + owned + sold, all types) by one global key and the Planned page simply hid the ones that are not planned.

| State injected | Old build | Expected |
|---|---|---|
| owned house + planned commercial + planned home (the screenshot) | commercial 2, home 3 (asset 1 is the hidden bought house) | commercial 1, home 2 |
| the same without the bought house | commercial 1, home 2 | commercial 1, home 2 |
| owned o1, planned p1 p2 p3 | p1=2 p2=3 p3=4 | 1 2 3 |
| remove p2 (no reload) | p1=2 p3=3 | 1 2 |
| Real page, list o1 (paid 10), o2 (paid 55), o3 (paid 30) | o1 shown before o2 in the Homes card with numbers 3 and 1 | o2=1, o3=2, o1=3 shown oldest first |
| random list with an unfunded asset above funded ones | the unfunded asset jumped to the last number although it sits 2nd in the list | numbers follow list order |

So the defect was a global numbering consumed by a per-view page. Not a stale render: Remove did renumber correctly in the old build (see path 9).

## Policy (one function, one source of truth)

`Engine.numbering(S, pl)` in `engine.js` returns `{ num, view, count }`. Every consumer calls it (the row badge, its aria-label, the asset page header, the Sold note, Real page row order).

- Numbers are contiguous from 1, in purchase order, inside the view an asset belongs to.
- Planned view = every asset whose status is not owned (sold-in-plan assets keep their place in the plan sequence and show in the Sold card), counted in list order. The trust buys in list order and never buys an asset before one above it, so list order IS purchase order; an unfunded asset keeps its list place.
- Real view = every owned asset (sold-after-buying ones keep their place), oldest first (most months paid = 1), ties by list order. Real rows are displayed in that order.
- Nothing is stored on the asset. Numbers are recomputed from the list on every render, so removing an asset shifts every later number down by one at once, everywhere.
- The asset page header reads `#N planned` or `#N bought` (aria-label `Planned asset number N` / `Bought asset number N`, plus `data-no` and `data-view`), because the same N exists in both views.
- Cards (Homes / Commercial / Businesses / Sold) show a subset of the view's numbers, so a card can show 2 and 5. The Sold note says so.

## Ideation: every way a number could be wrong or stale

Verdict key: DEFECT = real defect in the old build, fixed; GUARDED = correct today, now covered by grader N; N/A = does not exist in the app.

| # | Path | Reproduce (state / action) | Expected | Verdict and root cause |
|---|---|---|---|---|
| 1 | Hidden owned house counted in Planned | owned house + planned rows | Planned starts at 1 | DEFECT. Global numbering. Fixed by per-view numbering. N2, N3 |
| 2 | Hidden owned asset of another type (commercial, business) | owned commercial, planned homes | Planned 1..n | DEFECT, same root. N3 |
| 3 | Two or more hidden owned assets | 3 owned + planned | no gap of 3 | DEFECT, same root. N3 |
| 4 | Sold-in-plan asset | planned `exit: sell` at month 60..110 | keeps its place; its number is in the Sold card | GUARDED. Sold are in the Planned sequence by policy; note text updated. N3 |
| 5 | Sold-after-buying (owned) asset | owned with sale | keeps its place in the Real sequence | GUARDED. N9 random mixes |
| 6 | Numbering per page vs globally | any mix | each page 1..own count | DEFECT. Root cause. N1 |
| 7 | Number stored on the asset (`h.n`, `h.no`, `h.seq`) | inspect saved assets | none stored | GUARDED. `seq` exists but is the creation sequence for the "latest added" strip, never shown as a number. N4 asserts no number keys in storage |
| 8 | Sort ties | equal purchase month (the default plan buys many in one month) | list order | GUARDED. Planned numbering no longer sorts at all (list order); owned ties by list order. N1 |
| 9 | Unfunded asset (1e9 key) above funded ones | list with an unfunded asset in the middle | list order, contiguous | DEFECT. The old key moved it to the end of the global sequence. Found with a seeded random state. Fixed by list order. N1 |
| 10 | Purchase month vs list order disagree | funded assets, any order | months never decrease down the list | GUARDED. The engine buys in list order. N1 and N10 assert it on random states and the default plan |
| 11 | 'Not before' (`buyIn`) months | a lower asset with a smaller `buyIn` | never bought before one above, numbers by list | GUARDED. N1, N9 random `buyIn` |
| 12 | Remove leaves stale DOM (render `prev` diff) | Remove, read DOM at once, no reload | renumbered | N/A. `prev` only drives the flash highlight; `render0()` rebuilds `#app` from scratch. Verified against the old build. N4 reads the DOM straight after the click and again after a reload |
| 13 | Selected / expanded row keeps old number | select row, remove another | new number | GUARDED. N4 |
| 14 | Remove first / middle / last | 7 assets | later numbers minus one, earlier unchanged | GUARDED (worked in old build for the visible rows, but off by the hidden ones, see 1). N4 |
| 15 | Remove a bought asset | owned o1 o2 o3 | Real renumbers, Planned unchanged | GUARDED. N4 |
| 16 | Remove all (planned) | owned + planned, Remove all | Planned empty, Real 1..m, next added planned asset is 1 | GUARDED (was DEFECT while owned assets took 1). N5 |
| 17 | Undo of Remove / Remove all / scenario / Saved open | Undo | old numbers back | GUARDED. Snapshot restore, numbers recomputed. N5, N6, N8 |
| 18 | Drag reorder / Move up / down | reorder inside a card | numbers follow the new list order | GUARDED. Move shares `E.reorder` with the drag; I-series covers the gesture, N6 the numbers |
| 19 | Duplicate planned | Duplicate p3 | copy is p3 + 1, later +1 | GUARDED. N6 |
| 20 | Duplicate a bought asset | Duplicate o1 | planned copy, Real unchanged | GUARDED. N6 |
| 21 | Owned <-> planned toggle | asset page Owned / Planned | leaves one view, joins the other, both contiguous | GUARDED (DEFECT before for the hidden-number reason). N6 |
| 22 | Add flow (planned) | + Add home | next number last in Planned | GUARDED. N7 |
| 23 | Add from an example / bought asset | + Add commercial with an example; Add something you own | last in its own view | GUARDED. N7 |
| 24 | Import from a listing | adds a planned asset at the end | last | GUARDED by the same append path as 22 |
| 25 | Scenario (sample portfolio) load | Assumptions > sample | contiguous both views | GUARDED. N8 |
| 26 | Saved open | Saved > Open | contiguous both views | GUARDED. N8 |
| 27 | Backup import with an unsorted list | Restore a backup whose list is reversed | contiguous; numbers follow the imported list | GUARDED. The import path does not re-sort (only first boot does, via `orderV`); numbers are by list so they stay contiguous. N8 |
| 28 | Migration of an old save | v8 save, no `orderV`, shuffled | sorted once at load, contiguous | GUARDED. N8. v9-v18 saves still switch to the default plan by the existing documented rule |
| 29 | ADDITIONS append | state at DATA_V without the `lostcreek` key | appended once as the LAST planned asset, others keep 1..n | GUARDED. N8 (also checks it is not added twice on reload) |
| 30 | Category cards (Homes / Commercial / Businesses) and collapsed cards | planned mix | a card shows a subset (2, 5); hidden card does not renumber | GUARDED by design and by the Sold note. N3 |
| 31 | Status filters | none exist on Planned / Real | | N/A. Status is the page itself (Planned, Real) |
| 32 | Asset page header `#N` | open any asset | `#N planned` / `#N bought` of its own view | DEFECT (global number, no view name). Fixed. N2, N3, N9 |
| 33 | aria-labels `Buy number N` | read labels | same N as the badge | DEFECT (same source). Header aria-label added. N1-N9 compare badge and label |
| 34 | Real page row order vs numbers | owned with different months paid, list order not oldest first | rows oldest first = numbered 1..m | DEFECT. Rows were in list order, numbers by age. Real rows now sorted by number. N3 |
| 35 | Sold card note text | read note | matches the policy | DEFECT (text said numbers are global). Updated. N3 |
| 36 | '#N' in funding / wait / 'bought the same month as' lines and Checks | scan page texts | any `#N` is a real number of its own view | N/A today (no such text exists; "pool of N" counts assets, not numbers, and the pool intentionally includes bought ones). N10 scans Planned, Real, Finances, Assumptions and the asset page so a future mention cannot go stale |
| 37 | Finances page / 'Biggest cash calls' naming and export | read Finances | assets named by address, never by number | N/A (by address). N10 |
| 38 | Saved cards | Saved page | counts and names only | N/A |
| 39 | Sync Planned vs Real | one asset moves between views | both views contiguous at once | GUARDED. N6, N8 |
| 40 | Default plan | fresh install | 36 assets, none bought, numbers 1..36 in list order, every asset funded, verdict Yes | GUARDED (unchanged). N10 |

## Files changed

- `v4/engine.js`: `buyKey`, `numbering()` (exported), `orderByBuy` uses `buyKey`.
- `v4/app.js`: `buyOrder` delegates to `E.numbering`; asset header, aria-labels, Real/Sold row order, Sold note.
- `v4/sw.js`: cache name `numbering-v26` (stamp refreshed by `stamp.py` through `build-artifact.py`).
- `grader/numbering-grade.js` (new, category N, 100 points), `grader/grade.js` (NUM_ONLY wiring, A06 updated to the policy).
