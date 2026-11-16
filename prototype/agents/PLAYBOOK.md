# PLAYBOOK: the one plan every agent follows for ANY task
Built from the audit of 44 agents + the orchestrator (audit/REPORT.md; evidence ids like a74ba5 = agent id prefix in audit/agent-<id>.md). Goal: efficient, effective, accurate, honest work, start to finish, without interruption. Tools live in `prototype/agents/tools/` (all have `--self-test`). Full rationale: playbook/00-problem-solution-map.md (P-numbers below).

## QUICK CARD (read this, then follow the phases)
1. Quote the user's goal verbatim. If a trigger in 2.3 fires, ASK (2-4 options + default) before building. Questions ("is there a way...?") get answers, not features (a74ba5). [P06,P07]
2. `tools/preflight.sh --owner ME --needs "<paths>"`. BLOCKED = wait/queue; never work around. [P01]
3. `tools/claim.sh acquire <area> --owner ME --files "<paths>"`. Edit only inside your claim. Two implementers on overlapping files = use a worktree (`tools/worktree.sh`) or queue (a74ba5/abd0ce overlapped 40 min). [P01]
4. Write a <=15-line plan (goal, 3 likeliest misreadings, files, checks, budget) to `agents/plans/ME.md`; then build in small steps, each step verified. [P22]
5. Run graders ONLY via `tools/run-grader.sh --owner ME --slice X`. Never `node grade.js`, never pkill/kill, never git stash. [P03,P20]
6. Budget: <=10 slice runs + 1 full run (2 hard max); slices 4-100 s, full ~16 min. Do not rerun with no edit between (12% of runs were repeats). Used up = STOP and report. [P10,P29]
7. Order: fast slice after each change -> flow smoke -> ONE full run last. Edit after the full run = say UNVERIFIED TAIL or rerun. [P16,P11]
8. A failure is never "known flaky": rerun ALONE twice, log run ids, diagnose; never lower a threshold or edit an assertion silently (a8dd79 1500->1000). [P09,P14]
9. User bug => failing regression check FIRST (RED run id), root-cause row in playbook/escaped-defects.md, then fix (GREEN run id). [P04]
10. Never replace user data in a migration; new assets = ADDITIONS + DATA_V (CLAUDE.md). [P21]
11. `tools/postflight.sh --owner ME` (stamp, bundle, ledger-on-this-tree, grader edits, checklist). Exit 4 = hand back as UNVERIFIED.
12. Write the hand-back from playbook/templates/handback.md; `tools/handback.sh --owner ME --report F --final`; send it ONCE via SubagentHandback after all your background jobs ended (acc7e5 sent 10). [P05]
13. Every "passes/100%/green" cites a ledger run id. List what you did NOT verify, what could not be done, assumptions, questions. [P30]
14. No commit/push unless delegated; then only `tools/commit-owned.sh` (no WIP, no failing snapshots, never main without a clean full ledger run). [P12]
15. INTEGRITY (playbook/integrity.md): list every changed threshold old->new; never weaken a check; kill only your own pids (`tools/safe-kill.sh`); no stash, no cloud/network/permission/git-history changes without the user's explicit approval; report failures and unknowns plainly; postflight runs `tools/integrity-check.sh`. [I1-I13]
16. Blocked >1 retry, budget hit, or surprise (files changed under you, tool errors x2) => tables D1-D4, then hand back BLOCKED. Never improvise around permissions/network/claims.

## PHASE 0 Intake and interpretation (<=5 min)
0.1 Read: this file, the delegation prompt, applicable rows of playbook/requirements-ledger.md, CLAUDE.md, and (bug fix) the matching escaped-defects.md rows.
0.2 Restate in 3 lines: goal (user's words), acceptance (testable, with one worked example per rule), out of scope. If the prompt lacks acceptance or a worked example for an ambiguous rule, take it from the ledger or ask. [P06; E4/E15 cost ~3-4 agent runs]
0.3 Classify the task type (implementer, bug-fixer, researcher, reviewer, auditor, grader-builder, debugger) and use its template constraints (playbook/templates/). Check that you have the tools the prompt assumes (no Agent tool? then you cannot spawn reviewers: say so; ad0bb9). [P18]
0.4 Ambiguity check (2.3). If it fires and the orchestrator did not answer, hand back QUESTION immediately (a short final report, status NOT-DONE) rather than guessing. Exception: an assumption that is cheap to reverse AND listed in the hand-back.

## PHASE 1 Preflight and claims (<=3 min)
1.1 `tools/preflight.sh --owner ME --needs "prototype/v4/*,prototype/grader/*"` (narrow to what you need). It shows branch, dirty files, graders running, live claims, stamp, bundle freshness, last ledger runs. Record the dirty list: everything dirty before you start is NOT yours (do not stage, stash, revert).
1.2 Acquire claims: `tools/claim.sh acquire <area> --owner ME --files "<globs>" --ttl-min 90 --note "<task>"`. Renew at each phase boundary. Release at the end (or on BLOCKED).
1.3 Siblings: the prompt lists them. If it does not and `claim.sh list` shows others, they exist: stay out of their files and note it in the hand-back (a74ba5 was never told about abd0ce).
1.4 When to use `git worktree` (tools/worktree.sh add ME): you are an implementer and another implementer is running whose files overlap or interlock (v4/app.js, grader/grade.js) and the wait would exceed ~20 min, or you must run the 16-min full grader while someone else edits. Work only in the worktree path; build+stamp there; the orchestrator merges; the grader lock/ledger remain shared. Otherwise serialise via claims.
1.5 Never wait by polling processes (abd0ce idled ~20 min with a pgrep loop): use `run-grader.sh --wait-sec N` or hand back BLOCKED with the queue position.

## PHASE 2 Plan (<=10 min)
2.1 Write agents/plans/ME.md: goal, interpretation + worked example, files to touch (must lie inside claim), steps, checks per step, canary/regression checks to add, run budget, rollback (what to revert if it goes wrong), questions.
2.2 Size the work: if it will exceed the wall cap (implementer 60 min), split and hand back the first half with a clear remaining list (a13416 94 min, 225 tools).
2.3 Ambiguity triggers (ASK, 2-4 concrete options, your default): the request is phrased as a question or "can you/is there a way/should"; a money, time-basis or ordering semantic is unspecified (today's vs future dollars, planned vs real, funding order); a user-visible label or default is new; a requirement can be read as removing or changing existing user data; two existing rules conflict (ledger rows); the request implies a new feature beyond the sentence the user wrote; the acceptance number cannot be derived from stated numbers; a destructive/irreversible/shipping action. Do not ask about things the ledger/CLAUDE.md answers, or about reversible implementation details.
2.4 Research/listing data you cannot find: ask BEFORE adding (CLAUDE.md).

## PHASE 3 Implement in small verified steps
3.1 One step = one behaviour. After each step: node-level/unit check or LOGIC slice (4 s) if the engine changed; the relevant slice (<100 s) if UI changed. Do not wait for the full grader to find an engine bug.
3.2 Edit only claimed files. Out-of-claim need -> add to Questions; do not edit (ada109 "edits beyond what you asked").
3.3 Wording/DOM changes: grep graders for the old text first; prefer engine-derived expectations and data-testid; list needed grader edits (a4b889, ada109 spent ~60 min fixing wording-coupled tests). [P24]
3.4 Data safety (any change touching storage/migration/DATA_V): ADDITIONS entry appended once; never replace; test with a portfolio that has a removed and an edited asset. [P21]
3.5 Plain-language and traceability: read every new label aloud as the user; each displayed number must trace to an editable field or a documented formula (E3,E13,E14). [P25]
3.6 Build + stamp after v4 edits (v4 owner only): `cd prototype/v4 && python3 build-artifact.py`. The runner refuses stale stamps (exit 77).
3.7 Keep a running notes file (agents/plans/ME.md "log" section): what changed, which run ids. It becomes the hand-back.
3.8 Do not use git stash/reset/checkout on shared files; to bisect, use a worktree or temp copy. [P20]

## PHASE 4 Verification ladder (fast -> one full)
4.1 Ladder: (1) syntax/unit/LOGIC slice (4 s). (2) category slice(s) you touched (15-100 s each; table below). (3) flow smoke: tap row -> edit -> back; add asset; remove asset -> renumber; reload keeps state; migration keeps user data (slice or by hand with screenshots at 320 and 390 px, light+dark). (4) ONE full run (~16 min) after the last edit. (5) reviewer is a separate agent (never yourself).
Slice medians (auditor Q7): logic 4 s, J 15 s, gest 25 s, info 26 s, G 32 s, ux 33 s, design 35 s, finance 35 s, numbering 50 s, main 56 s (p90 157), sync 102 s; full 10-16 min.
4.2 Never rerun the identical slice on the identical tree except as a flake check (ledger shows same tree hash). 51 of 413 sampled runs were such repeats.
4.3 Run: `tools/run-grader.sh --owner ME --slice <x> --task T [--wait-sec N]`. Read the VERDICT block; the log path is in it. Partial runs never overwrite grader/report.md/result.json (the tool restores them); cite the run id.
4.4 Full-run clean = verdict clean, tree hash unchanged. Any edit after => the run no longer covers it. Either rerun (if budget) or hand back "UNVERIFIED TAIL: <files>" (af60d8, ac7fb1, a8dd79, ad318e).
4.5 Budgets: slices 10, full 1 (hard 2), grader wall 45 min, no single wait >20 min. Over budget: `BUDGET_OVERRIDE` only by orchestrator decision.

### Table D1 - a check fails / flakes / times out
| situation | action |
|---|---|
| Fails once, clear cause in log | fix, rerun that slice only |
| Fails in a full run, passes in its slice | rerun the check ALONE twice (`checks:ID`), log both run ids. Check ledger for overlapping runs and foreign claims first (G1/G2/G8 cost ae94d3 41 min and were likely collisions). Still intermittent: report as OPEN FLAKE with the three run ids; propose a fix; never ignore; never change thresholds. |
| Same failing id in 2 consecutive runs after your edits | it is a regression; stop iterating on unrelated work; bisect your last edit |
| Times out (exit verdict timeout) | check preflight for other graders/CPU; rerun once alone; if again, hand back BLOCKED with both run ids |
| Verdict invalid-tree-changed | someone edited v4 during the run (or you did): the run is void; check claims; rerun |
| Grader aborts on stamps (77/exit 3) | v4 owner runs build-artifact.py; if you are not the owner, ask |
| An existing test is wrong (not the app) | fix the test, list "EXPECTATION CHANGE: file, before -> after, reason"; if it loosens a check, orchestrator sign-off BEFORE merge |
| Budget used and still red | STOP; hand back with the failing ids and best hypothesis |

### Table D2 - files change under you
| situation | action |
|---|---|
| `git status` shows files outside your claim changed | not yours; do not touch; note in hand-back; if they are inside your area: stop, run `claim.sh list`, message orchestrator |
| Your claim file is gone/expired | re-acquire (renew) if free; if taken, stop and hand back BLOCKED |
| Another agent's edit breaks your slice | do not fix their file; run `claim.sh check-path`; report exact failing ids + owner |
| Stamp stale at start of a run | owner restamps; others wait |
| You see an unknown commit (stop-hook WIP) | leave it; never rewrite history; mention it |

### Table D3 - ambiguity (triggers in 2.3)
Ask early with 2-4 options + default via the orchestrator (hand back QUESTION; status NOT-DONE) when a trigger fires. If the orchestrator is unreachable and the choice is reversible: proceed with the default, flag it [ask-user-if-wrong], keep the change isolated and small.

### Table D4 - blocked by network / permissions / environment
| situation | action |
|---|---|
| Network/host denied (403, ENOTFOUND, proxy refusal) | one retry; then stop research, label sources unverified, hand back BLOCKED with the host + error. Never change allowlists/settings yourself (a877d5/a445df burned 18 min). |
| Permission refused for a tool/command | do not look for a bypass; hand back with the exact refusal |
| Tool missing (e.g. no Agent tool) | say so; do not fake a subagent review (ad0bb9) |
| Same tool error twice | change approach; third time = BLOCKED |
| Disk/CPU pressure, browser crashes | preflight, one retry, then BLOCKED |
| Rate limits | stop; hand back with state in the plan file so work can resume |

## PHASE 5 Escaped-defect and regression guard
5.1 Bug-fixer order: reproduce (RED run id) -> root-cause row appended to playbook/escaped-defects.md (symptom, origin, gap) -> smallest fix -> GREEN run + slice + one full run. [P04]
5.2 Every feature ends with a regression check for each user-visible rule it adds (ledger rows R*), and, if you added/changed a check, its canary (playbook/canaries.md) with a RED run id (grader-builder only; others list the proposed canary).
5.3 Scan for siblings: grep for the same pattern; list hits.
5.4 Primary flows still work (4.1 step 3), recorded as evidence or listed as NOT verified.

## PHASE 6 Hygiene and hand-off
6.1 `tools/postflight.sh --owner ME --report agents/plans/ME-handback.md --emit agents/plans/ME-handback.md` (the integrity check compares your draft with the ledger) (add `--build` only if you own v4). Exit 0 = evidence present; exit 4 = list the gaps as UNVERIFIED. Fix stamp/bundle issues first.
6.2 Review your diff: only claimed files; no scratch files; no grader report churn (they are restored by the tool); no stray processes (`pgrep -af 'node.*grade'` shows yours? let them finish or wait; never kill others').
6.3 Commit only if delegated: `tools/commit-owned.sh --owner ME -m "<real message>" [--push]`. No WIP, no failing snapshots. Main requires `--to-main` and a clean full ledger run on the exact tree (tool enforces).
6.4 Release claims (`claim.sh release`), remove worktree if the orchestrator merged it.
6.5 Hand-back = ONE message from the template, <=7000 chars; details in files. Sections: What changed | Evidence (ledger run ids) | NOT verified | What could not be done | Assumptions | Questions for the user | Failures seen (incl. flaky) | Grader edits. Run `tools/handback.sh --owner ME --report F --final`; fix lint errors; then SubagentHandback once and STOP. Never hand back while any job you started is running; never hand back twice. [P05,P30]

## PHASE 7 Post-task self-audit (2 min, written into the plan file; the orchestrator may include in metrics)
Answer: minutes spent vs budget; grader runs (slices/full) vs budget; repeats with no edit; waits >5 min and why; anything I assumed; anything I would do differently; did any rule in this playbook cost me time (note for ADOPTION feedback). Then `tools/audit-now.sh` is the orchestrator's job, not yours.

## INTEGRITY (binding; full text and evidence in playbook/integrity.md)
I1 List every changed numeric assertion/threshold/floor/tolerance/removed check in the hand-back as `file:line old -> new why` (a8dd79 1500->1000; a13416 "except where noted" is not acceptable). Tool: integrity-check.sh section A highlights them.
I2 Never weaken a check to pass; loosening needs orchestrator sign-off first. "Green" only for a run that started after your last edit, else UNVERIFIED TAIL (af60d8, ac7fb1, a8dd79, ad318e, a1d0d1).
I3 Failures are facts: reproduce alone twice or report OPEN; no "known flaky" (6 agents did).
I4 Kill only your own PIDs: `tools/safe-kill.sh --owner ME --pid N`; no kill/pkill/killall (a74ba5).
I5 No cloud/network/credential/permission-settings/git-history changes without the user's explicit approval; hand back BLOCKED naming the change you need.
I6 Claims cite ledger run ids; "NOT verified" stated plainly (a19344 is the model).
I7 One hand-back, after all your jobs ended (acc7e5 x10, ad318e x4).
I8 No stash, no hidden work, nothing outside your claim.
I9-I13 Report unknowns and embarrassing facts; no concealed tool failures; label estimates and unverifiable sources; no invented evidence; disclose scope creep. Orchestrator verifies (postflight + integrity-check) before relaying anything (I10).
Automated: postflight runs `tools/integrity-check.sh` = (A) changed constants/removed checks vs HEAD, (B) scan of your own Bash history for kill/pkill/stash/reset/checkout/restore/force-push/rebase/env-and-settings tools/raw `node grade.js`, (C) your hand-back vs the ledger. Any finding => postflight exit 4; you must disclose each with an explanation.

## Role-specific overrides
- Reviewer: no pass bar, no previous scores, must interact; 10 min; read-only (playbook/review-loop-policy.md).
- Researcher: probe network first (2 min), label every number, memory is labelled (playbook/research-policy.md).
- Auditor: `tools/audit-now.sh` first; read-only; compare with metrics.jsonl.
- Grader-builder: canary per check; no threshold edits without sign-off; own report files for new slices.
- Debugger: environmental causes first (ledger, overlaps); 30 min box; evidence table.
- Orchestrator: playbook/ORCHESTRATOR.md (intake, sequencing, hand-back acceptance, shipping checklist, communication, budgets).

## What "without interruption" means
You do not need to ask permission for anything in this plan. You stop only for: (1) an ambiguity trigger, (2) BLOCKED by a decision table, (3) budget exhausted, (4) a destructive or shipping action not delegated. Everything else: proceed, verify, hand back once.

## Evidence index (why each rule exists)
Overlap a74ba5/abd0ce 40 min, orchestrator graders in ad318e/acc7e5 windows, ae94d3 41 min -> P01-P03 | acc7e5 x10, ad318e x4 hand-backs -> P05 | 11-12 8-agent loop 178 min -> P08 | a8dd79 1500->1000 -> P14 | a1ee7b 105 runs, a13416 113 -> P10 | a877d5/a445df -> P13 | 2cd6815 result.json -1,273 lines, 24 WIP, 9 failing pushes -> P12 | E1,E10,E12 -> P04 | credit line x6 restatements, 11-16 04:00-04:18 -> P06 | a74ba5 question built -> P07 | stash in 5 agents -> P20.
