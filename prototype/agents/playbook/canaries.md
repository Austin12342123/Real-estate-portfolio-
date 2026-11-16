# Mutation canaries (a grader check must be able to go red)
Problem P04: 100/100 reports coexisted with E1/E10/E12. A check that never fails proves nothing.
Procedure (grader-builder, per new/changed check; never edit v4/): copy v4 to a temp dir (`cp -r prototype/v4 $TMP/v4`), apply ONE mutation with sed, point the grader at the copy (GRADER V4 path override - if the grader cannot take a path, run the mutation in a worktree), run only that check via `tools/run-grader.sh --slice checks:ID` (in the worktree), record the RED run id, discard the copy.
Seed list (mutation -> check that must go red). Fill the "check id" column when the check exists.
| id | mutation (in the copy) | expected red |
|---|---|---|
| C-EDIT | remove the click handler that opens an asset's edit sheet | FLOW-1 tap-to-edit (E1) |
| C-DATA | in the migration, replace `S.houses` with the seed list | A35 data-safety (E10) |
| C-DATA2 | bump DATA_V without an ADDITIONS entry guard (re-append every time) | A35 / one-append check |
| C-NUM | number assets by global index instead of per-view | category N (E12) |
| C-FUND | allow purchase month of asset 4 < asset 2 | L9 / monotonic purchase (E6) |
| C-BASIS | show year-28 value in the top card | today's-dollars label check (E15) |
| C-TRACE | hard-code the property-manager total instead of summing assets | traceability check (E13) |
| C-STAMP | edit app.js without restamp | run-grader refuses (77) / grader exit 3 |
| C-SYNC | chart end value != KPI | G8 |
Rule: a grader-builder hand-back lists each new check with its canary and the RED run id; reviewers sample 2.
