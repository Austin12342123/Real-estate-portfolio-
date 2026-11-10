# Help / hourly-job grader (INFO_ONLY)

Run: 2026-11-10T20:58:49.560Z  |  24s

## H. Help buttons and hourly jobs: **100.00 / 100** (separate scale; not included in the A-E + R total, F or G)

| ID | Check | Pts | Earned | Detail |
|---|---|---|---|---|
| H1 | Glossary integrity: complete entries, plain wording, every label / loan mapped to a real and sensible entry, acronyms explained | 8.00 | 8.00 | 9/9 sub-checks pass |
| H2 | Info-button coverage: every jargon label on every page (Portfolio, asset types, Assumptions, Finances, Add) has an (i) with the right definition; no orphan glossary entries | 16.00 | 16.00 | 86/86 sub-checks pass |
| H3 | Info sheet: opens with the right content, closes by button / Escape / backdrop / navigation, accessible names and roles, keyboard, contrast, fits small screens, never changes data | 16.00 | 16.00 | 22/22 sub-checks pass |
| H4 | Definitions are accurate: numbers quoted match the engine constants and loan table, examples do their own arithmetic, stated rules behave that way in the engine | 16.00 | 16.00 | 42/42 sub-checks pass |
| H5 | Hourly jobs: add, gross = (wage + tips) x hours x weeks, automatic vs typed tax, blank tax returns to automatic, temporary end month, switching kind, clamps, persistence | 12.00 | 12.00 | 28/28 sub-checks pass |
| H6 | Optional fields left blank never break the plan or the finance verdict (job extras, improvements, exit fields, co-signers) | 8.00 | 8.00 | 16/16 sub-checks pass |
| H7 | Old saves migrate: v8 (assets only) and pre-hourly jobs (no kind / wage / tips / weeks) load, keep their numbers and show correctly | 6.00 | 6.00 | 10/10 sub-checks pass |
| H8 | Automatic tax estimate: matches an independent 2026 single-filer calculation (IRS Rev. Proc. 2025-32, Pub. 15) (federal after standard deduction + Social Security + Medicare, no state tax), is monotone and bounded | 6.00 | 6.00 | 6/6 sub-checks pass |
| H9 | Disclosure defaults and new wording: collapsed sections open on tap (and stay open), renamed labels, Hold/Sell/Merge + Status, loan grouping, import preview title | 8.00 | 8.00 | 12/12 sub-checks pass |
| H10 | Clean run: no console / page errors and no network requests outside localhost during all help and hourly-job flows | 4.00 | 4.00 | 2/2 sub-checks pass |

### H failures

None.
