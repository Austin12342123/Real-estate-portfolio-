# 02 Cross-cutting patterns (ranked by cost = minutes + dollars + risk)

Totals: 44 agents, ~1,160 active agent-minutes, est. $149 agents + ~$66 orchestrator (session cost-state $207.76). Estimated avoidable effort: ~335 agent-min (~29%) and ~$40 (27% of agent spend), before counting orchestrator waiting.

| # | Pattern | Evidence | Cost | Risk |
|---|---|---|---|---|
| 1 | **Concurrent writers/graders in one working tree** | Orchestrator ran its own full/slice graders inside running agents' windows: 11-14 19:10:03 (ad318e, 1 min after its first hand-back), 20:48:55 / 21:01:34 / 21:04:00 (acc7e5). a74ba5 and abd0ce overlapped 40 min (11-16 03:27-04:07) on grade.js, app.js, build. Agent ae94d3 then burned 41 min (38 min of grader time) on "G1/G2/G8 fail only in full runs" and found nothing; the collision windows are the only common factor found (hypothesis, not proof). a74ba5 used `pkill -f "node grade.js"` / `kill -9`. | ~100 agent-min, ~$8 | High: false failures normalised as "known flaky" |
| 2 | **Review-then-fix loops chasing a numeric bar** | 11-12: 8 agents (4 reviewers + 4 fixers) = 178 active min, ~$19.8; scores 52-78 -> 86 -> 88 -> ~90; bar was embedded in reviewer prompts ("Margin = points above 90", "bar is 90"); calculator commit behaviour changed 3 times (round 3 debounce, round 4 removal, orchestrator c7f2b1b). | ~50 min rework | Medium: reviewer anchoring; polish over function |
| 3 | **Graders saturate at 100/100 yet users keep finding defects** | Every feature was reported "100% in every category" (afc2c0, a8317d, acc7e5, ...) while the user reported ~14 defects afterwards (see table below). 36 of 129 commits mention graders ("graders accept new wording", "Regenerate grader reports", WIP). Graders are text/DOM coupled so each wording change breaks tests (a4b889, ada109, a13416). At 11-16 04:46 the full run is 84.53/85 (C01 still failing); at 03:56 A35 (data-loss check) was 0/4. | ~120 min of grader-maintenance | High: false assurance |
| 4 | **15-16 minute full grader as the only completion gate** | 158 full runs + 249 slice runs (1,092 grader invocations; >=523 min measured foreground); current full run 972 s. Agents wait with `sleep`/Monitor (24 Monitor calls in acc7e5). | ~25% of wall time | Medium |
| 5 | **Premature / duplicate hand-backs** | acc7e5 handed back the same 7,820-char report 10 times (20:48-21:04) while still grading; ad318e 4 times (19:09-19:20). 23 surplus hand-backs triggered orchestrator turns with a ~500k-token context. | ~$2 + decision errors (orchestrator acted on the first copy) | Medium |
| 6 | **Unverified tail ("100%" claimed after a last tweak without a rerun)** | af60d8 (J22 adjusted, no full rerun), ac7fb1 (no second full run, 2 items not screenshotted), a8dd79 (glossary shortened, no full rerun), ad318e (A35 timeout; no all-green run), a1d0d1 (F3 "flake, did not investigate"). All disclosed honestly, but each leaves an unverified state in the tree. | ~4 latent defects | Medium |
| 7 | **Hook-swept WIP commits and snapshot pushes** | 24 of 129 commits are "WIP" (stop hook) sweeping other agents' partial files; orchestrator pushed 127 times, e.g. 11-16 03:33-04:31 eight pushes of "may not pass the graders yet" snapshots (d7129ec, 035ab5d, d532a72, de7a5b9, fcdae52, ba3d038, df77975, 0c0f982, aa9e8e5). WIP commit 2cd6815 shows result.json -1,273 lines (partial-run report overwrote the full one). aeba2d reported commit c5fd2b5 as "not mine". | history noise | Medium: no clean revert points |
| 8 | **Requirement interpretation gaps (orchestrator-side)** | Credit-line/funding semantics restated by the user at 11-10 08:04, 08:15, 20:18, 20:25, 21:18 ("Like I said..."); today's-dollars basis restated 11-14 02:09 then 11-16 04:00, 04:02, 04:13, 04:18; "is there a way to automate this?" (11-16 03:21) became a 45-min feature build. Only 3 AskUserQuestion calls in 8 days. | ~3-4 agent runs of rework | High |
| 9 | **Prompt gaps** | (a) required a subagent review from an agent with no Agent tool (ad0bb9); (b) "known flaky" lists normalised failures (F3, G6, G1/G2/G8); (c) a74ba5 prompt omitted the sibling agent; (d) research prompts assumed network (a877d5/a445df); (e) no run budget or wall-clock cap (a1ee7b 105 grader invocations); (f) acceptance lacked "primary flows still work". | ~60 min | High |
| 10 | **Unverified evidence base for realism grader** | R = 30/85 automated points rests on bench-*.json where 29/31 and 19/21 values are `unverified: true` (snippet-sourced) because both research agents hit ENOTFOUND (env created 21:02, not effective). | credibility | Medium |
| 11 | **Orchestrator context bloat** | Peak context 892k tokens, 3 compactions (11-09 16:10, 11-10 18:26, 11-12 15:55), 270 notification wakeups; user nudged "Continue?" 3 times after rate limits. | ~$20 cache reads | Low-Med |
| 12 | **Stale bundle / unstamped build** | Graders test the built bundle, so every prompt repeats "run build-artifact after every v4 change"; a stamp mechanism (stamp.py, 11-16) was only added after incidents. | recurring prompt text | Medium |

## Escaped defects (user-reported after "all green" reports) and attribution

| # | User report (time) | Responsible agent / process | Gap |
|---|---|---|---|
| E1 | "I can't edit the houses anymore" (11-10 06:40) | aaa1c3 (+ reviewer a9a1dc round 9 scored 90 at 06:02) | no tap-to-edit smoke check; static-screenshot reviewer |
| E2 | Overlapping text chains (11-10 07:53) | aaa1c3 / orchestrator edits | design review blind to long-row wrapping at real data |
| E3 | "What does it mean by already owned?" (11-10 07:58) | orchestrator interpretation of earlier requirement | requirement echo missing |
| E4 | Credit line / funding semantics (11-10 08:04, 08:15, 20:18-21:18; 11-11 03:30) | orchestrator prompts; acf54b model | worked example missing; user said "Like I said" |
| E5 | "numbers haven't changed" (11-10 08:24) | orchestrator (plan not applied to live portfolio) | verify-before-report |
| E6 | "#4,5,6,7 funded before #2?" (11-12 01:47) | acf54b trust model + L9 plan-integrity blind spot | no monotonic-purchase invariant |
| E7 | Page totals not unique per page, naming (11-12 04:29/04:49) | a36951 | per-page invariants not in prompt |
| E8 | Migration popup with Undo reset the portfolio (11-12 04:59) | a13416/a36951 migration design | no "migration never destroys data" rule yet (added 11-14) |
| E9 | Details button over another section (11-12 05:36) | a13416 layout | 320px/overflow checks later added (J24) |
| E10 | Added house replaced/resurrected the user's planned list (11-14 03:45) | afc2c0 (DATA_V migration) - fixed by a8317d, rule written to CLAUDE.md | data-loss class; found by user not grader (A35 added after) |
| E11 | Numbers in business-add screen do not align (11-14 16:21) | earlier add-flow agents | no Add-flow arithmetic invariants |
| E12 | Asset numbers wrong after removal, asset 1 missing (11-16 03:26) | afc2c0/a13416 global numbering (found by abd0ce) | per-view numbering untested until grader N |
| E13 | Property manager expense not editable on Add (11-16 03:32) | aeba2d/ad318e add flow; K "design consistency" 100 missed | main-page cost not traceable to editable asset field |
| E14 | Planned-row description "doesn't make any sense" (11-16 03:40) | a13416 | plain-language review not required |
| E15 | Cash flow / top card shown at year 28 not today (11-16 04:00-04:18) | afc2c0 + orchestrator interpretation | basis clarified only by user |
| E16 | Update on phone not applied (11-12 22:03) | orchestrator deploy (SW update strategy) | adad88 flagged update prompt need |

Hindsight guard: E1-E16 were scored against what each agent knew at the time. Where the requirement was ambiguous (E4, E15) the cost is charged to the orchestrator/prompt, not the implementer.
