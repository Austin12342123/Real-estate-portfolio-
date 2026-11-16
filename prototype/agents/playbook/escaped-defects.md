# Escaped defects (user-found after an "all green" report) - the feedback loop
Rule: every user-reported bug gets a row BEFORE its fix ships: symptom (user words, time), responsible task, root cause, gate that should have caught it, regression check id (a failing check written first; ledger run id RED then GREEN), status. A fix without a regression check is not shipped. Repeat pattern (2+ rows same gap) -> add a canary or ledger rule.
Seeded from audit/02-cross-cutting-patterns.md (E1-E16; times UTC 2026).

| id | time | symptom | origin | gap | regression check (to build) | status |
|---|---|---|---|---|---|---|
| E1 | 11-10 06:40 | cannot edit houses | aaa1c3 (reviewer a9a1dc scored 90) | no tap-to-edit smoke; static review | FLOW-1 tap row -> edit field -> value persists | OPEN (check missing) |
| E2 | 11-10 07:53 | overlapping text chains | aaa1c3 | long-row wrap at real data | layout overlap check with 27 assets at 320px (J24 partly) | PARTIAL |
| E3 | 11-10 07:58 | "already owned" unclear | orchestrator interp. | requirement echo missing | plain-language pass | RULE |
| E4 | 11-10 08:04.. | credit line / funding semantics | prompts + acf54b | no worked example | invariant: asset N down payment funded only by cash flow of assets < N (L-category) | partial (L) |
| E5 | 11-10 08:24 | numbers unchanged | orchestrator | plan not applied to live portfolio | verify-before-report: read back live numbers | RULE |
| E6 | 11-12 01:47 | #4-7 funded before #2 | acf54b | no monotonic-purchase invariant | purchase months non-decreasing in buy order | OPEN |
| E7 | 11-12 04:29 | page totals not unique per page | a36951 | per-page invariants | per-page totals check (ada109 fixed graders) | DONE? verify |
| E8 | 11-12 04:59 | migration popup Undo reset portfolio | a13416/a36951 | migrations may destroy data | C-DATA canary | RULE (CLAUDE.md) |
| E9 | 11-12 05:36 | button over another section | a13416 | layout | J24/320px | DONE |
| E10 | 11-14 03:45 | added house resurrected removed list | afc2c0 | DATA_V migration | A35 (+ canary proving it can go red) | A35 exists |
| E11 | 11-14 16:21 | business-add numbers misaligned | add-flow agents | add-flow arithmetic invariants | Add-flow totals == main page contributions | OPEN |
| E12 | 11-16 03:26 | numbers wrong after removal | afc2c0/a13416 | per-view numbering | category N (numbering fixer building) | IN PROGRESS |
| E13 | 11-16 03:32 | property manager not editable on Add | aeba2d/ad318e | main-page cost not traceable to editable field | every main-page expense line has an editable asset field | OPEN |
| E14 | 11-16 03:40 | planned-row description nonsense | a13416 | plain-language review | reviewer plain-language pass | RULE |
| E15 | 11-16 04:00.. | cash flow at year 28 not today | afc2c0 + interp. | basis clarified only by user | ledger row T1 (today's dollars) + check top card basis label | OPEN |
| E16 | 11-12 22:03 | phone did not update | deploy | SW update strategy | ship checklist: stamp/cache name changed | RULE |

New rows go below, newest last: `| E17 | ... |`.
