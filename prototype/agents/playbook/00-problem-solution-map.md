# 00 Problem -> root cause -> solutions map

Inputs: audit/REPORT.md (top-15, per-agent table), 02-cross-cutting-patterns.md (patterns 1-12, escaped defects E1-E16), 03-orchestrator-audit.md, audit/qa-for-playbook.md (the auditor's answers to my questions: extra problems, flaky handling, redundant runs, ambiguity timestamps, wall times), per-agent files, git history, grader/*.md, CLAUDE.md. Auditor assisted via SendMessage (answers in qa-for-playbook.md).
Baseline numbers (audit): 44 agents, ~1,160 active min, ~$215 total, ~335 min / ~$40 avoidable (29%); 1,092 grader invocations (158 full + 249 slice foreground-classified; 12% of 413 sampled invocations were exact repeats with no edit between); 24 WIP commits of 129; 127 pushes; 23 surplus hand-backs; ~16 user-found escaped defects; orchestrator grade C (72).
Legend: T = tool (script, enforced), R = rule (in PLAYBOOK/CLAUDE.md), P = prompt template field. "Metric" refers to playbook/metrics-format.md. NEW = not in the auditor's report; found while building the solution set (or via the Q&A).

## Index
P01 concurrent writers | P02 orchestrator runs graders in agent windows | P03 unlocked grader/pkill | P04 saturated graders, escaped defects | P05 duplicate/premature hand-backs | P06 requirement interpretation | P07 questions built as features | P08 review loops chasing a bar | P09 "known flaky" dismissal | P10 no run budget / redundant runs | P11 unverified tail | P12 WIP commits, snapshot pushes, clobbered reports | P13 research without network | P14 silent assertion changes | P15 orchestrator context/cost | P16 16-minute full run as only gate | P17 stale bundle/stamps | P18 prompt gaps | P19 orchestrator edits app mid-agent (NEW) | P20 git stash/pop in shared tree (NEW) | P21 data-loss migrations | P22 acceptance lacks primary flows | P23 scope creep | P24 wording-coupled graders | P25 plain-language/UX defects | P26 phone update/deploy | P27 user waits for nothing shipped | P28 unclassified tool errors (NEW) | P29 redundant grader runs (NEW) | P30 claims with no evidence ids (NEW) | P31 orchestrator relays claims unverified | P32 audit cannot run automatically / missing data | P33 unrealistic benchmark evidence (R grader) | P34 unreproducible honesty-gates (a19344) | P35 orchestrator verifies on a contaminated tree | P36 partial reports committed as if full (NEW) | P37 agent ignores sibling's files when waiting (pgrep loops) (NEW)

---
## P01 Concurrent writers/graders in one working tree (pattern 1, top-1)
Evidence: a74ba5 and abd0ce overlapped 40 min (11-16 03:27-04:07) on grade.js/app.js/build; two of a74ba5's own full runs overlapped ~2 min; abd0ce ~20 min idle waiting on a74ba5's grader; ae94d3 spent 41 min on G1/G2/H failures it could not reproduce.
Root cause: shared mutable tree, orchestrator launches parallel implementers; "never run two graders" existed only as prose, and "never edit v4 while a grader runs" is unsatisfiable with a second writer.
Candidates: (A) serialise implementers (one writer per area), parallelise only read-only agents. (B) git worktree per implementer, merge by orchestrator. (C) claim files with expiry + enforcement in the grader runner. (D) do nothing, rely on prompts.
Chosen: C always + A by default + B when two implementers must run at the same time (PLAYBOOK 1.4). Rationale: C is cheap and enforced; A has zero merge risk; B removes the wait but costs a merge + a second build/stamp, so use it only when the wait would exceed ~20 min.
Cost/risk: claim bookkeeping (~1 min/task); stale claims (mitigated by expiry + --steal-expired). Worktree merges conflict in app.js (orchestrator resolves; one full run after merge).
Metric: agent_overlap_min (baseline 1.8 detected, 40 real); concurrent-agents flag count (baseline 7); foreign-claim refusals logged in ledger.
Type: T claim.sh, worktree.sh, preflight.sh + R + P (SIBLINGS RUNNING field).

## P02 Orchestrator runs graders inside agents' windows (top-2)
Evidence: 11-14 19:10:03 (ad318e), 20:48:55/21:01:34/21:04:00 (acc7e5); 89 orchestrator grader commands; ae94d3's 41 min.
Root cause: orchestrator verifies by running; no visibility of who is grading; acted on premature hand-backs.
Candidates: (A) orchestrator reads agent logs/ledger instead. (B) orchestrator uses the same single-flight runner. (C) forbid orchestrator graders entirely until all agents finish.
Chosen: B + A: orchestrator may run only via run-grader.sh and never while a claim/grader holder exists (the tool refuses: exit 75/76); to learn status it reads agents/ledger/grader-runs.jsonl.
Cost/risk: low. Metric: orch_cmds_inside_agent_windows (baseline 4 -> target 0). Type: T + R (ORCHESTRATOR.md).

## P03 Grader not locked; pkill/kill -9 (top-3)
Evidence: a74ba5 `pkill -f "node grade.js"` 03:49:02 and `kill -9` 03:50:54 (kills other agents' runs); 3 full starts, two killed.
Candidates: (A) flock inside grade.js (edits the grader; v4/grader owned by others now). (B) wrapper script with flock (run-grader.sh). (C) OS-level wrapper alias.
Chosen: B now (no grader edit, enforced by convention + preflight detection of raw `node grade.js` processes); A recommended as a follow-up for the numbering fixer/orchestrator (3-line patch listed in ADOPTION.md) so raw runs also fail fast.
Risk: agents could bypass the wrapper -> preflight reports raw processes as BLOCKER; handback lint requires run ids from the ledger. Metric: raw-grader-process detections; ledger coverage ratio (ledger runs / transcript grader commands). Type: T + R.

## P04 Graders saturate at 100/100 while users find defects (pattern 3, top-4; E1,E10,E12,E13)
Evidence: ~16 escaped defects after "100% in every category"; A35 (data loss) was 0/4 at 03:56 11-16; reviewer a9a1dc scored 90 while the user could not edit houses.
Root cause: checks written from the implementer's view; no negative testing of graders; no primary-flow smoke; static screenshot review.
Candidates: (A) mutation canaries per check (break X, expect Y red). (B) primary-flows smoke slice (tap row -> edit -> back; remove -> renumber; migration keeps data; reload persists). (C) escaped-defect loop: every user bug -> regression check + root cause before fix ships. (D) interaction-probing reviewers.
Chosen: all four, small. A is a list + temp-copy procedure (playbook/canaries.md) rather than infrastructure; B is a grader-builder task (template provided) starting with E1/E10/E12 as the first three flows; C is escaped-defects.md + bug-fixer template; D in reviewer template.
Cost: ~1 agent-run to build the smoke slice; ~3 min per new check for canary. Risk: canary needs a copy of v4 (never mutate v4). Metric: escaped defects per feature (baseline ~16/44 agents = 0.36); share of escaped defects with a regression check (target 100%). Type: P + R + (grader-builder task).

## P05 Premature and duplicate hand-backs (pattern 5, top-5)
Evidence: acc7e5 10x the same 7,820-char report (20:48-21:04), first 16 min early; ad318e 4x; a4b889 two different (01:40/01:42); 23 surplus hand-backs each waking a ~500k-token orchestrator.
Candidates: (A) rule only. (B) gate script: lint + one-shot marker file. (C) orchestrator ignores any hand-back while the agent's background tasks are live.
Chosen: B + C + A. handback.sh --final refuses a second hand-back (exit 5) and refuses reports without evidence; the orchestrator rule: act only on the report marked FINAL with the ledger run ids; queue everything else.
Metric: followup_handbacks per agent (baseline 23 surplus total; target 0). Type: T + R + P.

## P06 Requirement interpretation gaps (pattern 8, top-6; E3,E4,E5,E6,E15)
Evidence: credit-line/funding semantics restated 11-10 08:04, 08:15, 20:18, 20:25 ("Like I said"), 21:18, 11-11 03:30; time basis restated 11-14 02:09, 11-16 04:00/04:02/04:13/04:18; real vs planned 11-12 02:27.
Root cause: rules existed only in the chat; each new agent got a fresh paraphrase; no worked example.
Candidates: (A) requirements ledger file with one worked example per rule, pasted into each prompt. (B) acceptance test per rule in the grader (invariants: purchases monotonic, funded-by-prior-assets). (C) echo-back: agent restates requirement + example in its plan before coding; orchestrator checks. (D) AskUserQuestion early.
Chosen: A + C + D; B for the two invariants already known (E6, E15) via grader-builder tasks. playbook/requirements-ledger.md seeded from the user's own words with timestamps.
Cost: ledger upkeep (1 row per new rule). Metric: user "Like I said"/repeat corrections per week (baseline ~12 repeated corrections in 8 days). Type: R + P (file).

## P07 Questions treated as build orders (top-7; 11-16 03:21 "is there a way to automate this?")
Evidence: a74ba5 built an 8.6k-char spec feature for 45 min; only 3 AskUserQuestion calls in 8 days.
Candidates: (A) interpretation rule with enumerated triggers (PLAYBOOK 2.3). (B) hard "question mark" heuristic: any request phrased "can you/is there a way/should" gets answer + 3-line plan + go/no-go. (C) agent-side: first deliverable of any feature >30 min is a 15-line plan for orchestrator approval.
Chosen: A+B+C. Cost: one extra turn (~1-2 min) vs 45 min of wrong work. Metric: wrong-direction minutes (agent active min on tasks later reverted) and AskUserQuestion count. Type: R + P.

## P08 Review-then-fix loops chasing a numeric bar (pattern 2, top-8)
Evidence: 11-12: 8 agents, 178 min, ~$19.8; scores 52-78 -> 86 -> 88 -> ~90; bar in reviewer prompts; calculator behaviour reversed 3 times; static reviews missed E1.
Candidates: (A) blind reviewers (no bar, no previous scores). (B) cap 2 rounds per feature then stop with a decision list. (C) fix only defects with repro steps + severity >= major; cosmetic goes to a list. (D) drop numeric scoring, use defect lists.
Chosen: A+B+C+D (playbook/review-loop-policy.md). Cost: user may see a few cosmetic items remain. Metric: review rounds per feature (baseline 4 on the calculator; target <=2); reviewer prompts containing a bar (target 0). Type: R + P.

## P09 "Known flaky" accepted without diagnosis (top-9)
Evidence (Q2): zero agents reproduced a failure twice alone and diagnosed it; F3/G6/G1/G2/G8 dismissed by a36951, a8317d, ada109, a1d0d1, ad318e, ac7fb1, a8dd79; ae94d3 could not reproduce (concurrency suspected).
Candidates: (A) rule: reproduce alone x2, log, never ignore. (B) ledger auto-records failing ids per run so flakes are countable. (C) quarantine list with owner+expiry (a check may be quarantined only by orchestrator, max 7 days, still reported). (D) ban threshold lowering.
Chosen: A+B+C+D. Handback lint rejects "known flaky / pre-existing" wording. Metric: failing ids per check across ledger (flake rate = fails / runs per check id); unresolved quarantines. Type: T (ledger+lint) + R + P.

## P10 No run budget (top-10); P29 redundant runs (NEW, Q4)
Evidence: a1ee7b 105 grader invocations/40 min, a13416 113 (50 min, 24 builds), 12% of invocations exact repeats with no edit (a23389 8/16, ada109 7/22, a8dd79 5/16).
Candidates: (A) budget in prompt. (B) enforce in runner (per owner+task counts; exit 78). (C) dedupe: runner refuses a repeat of the same slice on the same tree hash unless --recheck (flake test).
Chosen: B (done: --max-slices 10 --max-full 2) + A; C is implemented as advice in PLAYBOOK 4.2 and visible in ledger (same tree hash, same slice) - not enforced (flake rechecks are legitimate). Metric: grader_runs per agent (baseline mean ~25, 9 agents >40). Type: T + P.

## P11 Unverified tail (pattern 6, top-11)
Evidence: af60d8, ac7fb1, a8dd79, ad318e, a1d0d1: edits after the last full run.
Chosen: ledger stores the v4 tree hash at start/end of each run; postflight.sh compares the latest full run's tree hash to the current tree and prints UNVERIFIED TAIL; handback lint requires run ids; run is INVALID if the tree changed during it. Alternatives: forbid last-minute edits (rule only) - weaker. Metric: unverified-tail flag count (baseline 4 -> 0). Type: T + R.

## P12 WIP commits, snapshot pushes (pattern 7, top-12) and P36 clobbered reports (NEW)
Evidence: 24 of 129 commits WIP via stop hook sweeping other agents' partial files; 9 failing snapshots pushed 11-16; commit 2cd6815 result.json -1,273 lines because a partial run overwrote the full report; aeba2d could not tell if c5fd2b5 was its own.
Candidates: (A) disable stop hook. (B) keep hook but have it call commit-owned.sh. (C) squash WIP commits before merge. (D) commit-owned.sh for agents/orchestrator + push rules.
Chosen: D now (tool), and recommend B or A as a USER decision (ADOPTION open question 1) since the hook is environment config that I may not change. P36: run-grader.sh copies every run's outputs to ledger/runs/<id>/ and restores report.md/result.json after partial slices, so the committed reports are always the last FULL run. Metric: WIP commits per 100 commits (baseline 18.6); failing pushes (baseline 9 -> 0). Type: T + R + user decision.

## P13 Research with no network (top-13; pattern 9d, 10; P33)
Evidence: a877d5/a445df 18 agent-min, 28 tool errors (ENOTFOUND), honest but useless; R category = 30/85 points on benchmarks flagged unverified (29/31, 19/21).
Candidates: (A) connectivity probe first, abort in 2 min. (B) orchestrator checks network state before launching (curl probe in preflight). (C) label sources; downweight unverified in the grade. (D) use the user's own supplied numbers/ask the user.
Chosen: A+B+C (research-policy.md; researcher template). preflight.sh does not probe the network (offline-safe); the researcher template does. Metric: research minutes with zero verified sources (baseline 18). Type: R + P.

## P14 Silent threshold/assertion changes (top-14; Q1)
Evidence: a8dd79 `n > 1500` -> `n > 1000` unreported; a13416 "except where noted"; a4b889/ada109/a23389/ac243a edited graders to match app.
Chosen: postflight prints changed numeric comparisons in grader diffs; handback template has mandatory "Grader edits" section (lint: section required); loosening needs orchestrator sign-off; a second reviewer for expectation changes. Alternatives: make graders read-only for implementers (too rigid: real test fixes are needed). Metric: undisclosed grader edits found by audit (baseline >=2). Type: T + R.

## P15 Orchestrator context and cost (top-15; pattern 11; P27)
Evidence: peak 892k tokens, 3 compactions, 270 wakeups, ~$66 of $207; user said "Continue?" 3 times after rate limits.
Candidates: (A) require <=7000-char hand-backs with details in files (lint warns). (B) orchestrator keeps a state file (agents/state/ORCH-STATE.md) and compacts proactively at ~300k. (C) one agent per task, sized to finish; fewer wakeups (no Monitor polling loops by agents). (D) summarise hand-backs to <=10 lines before reasoning.
Chosen: A+B+C+D (ORCHESTRATOR.md). Metric: orchestrator peak context, cost per shipped feature (baseline: $215/ ~25 features ~ $8.6). Type: R.

## P16 16-minute full grader as the only gate (pattern 4)
Evidence: 158 full runs; full = 972 s; 24 Monitor calls in acc7e5.
Candidates: (A) verification ladder: fast slices (4-100 s) while iterating, ONE full run at the end. (B) parallelise categories (not possible: one grader at a time). (C) make full run faster (grader-builder project; out of scope). (D) tiered full: run categories touched + smoke + full only before merge.
Chosen: A+D with budgets (PLAYBOOK 4). Timing table from auditor Q7 included. Recommend C as a backlog item. Metric: full runs per task (baseline 3.7 average; target <=1.3). Type: R + T (budgets).

## P17 Stale bundle/unstamped build (pattern 12)
Chosen: stamp checks already exist (stamp.py, stamp-check.js); run-grader.sh refuses stale stamps (77), preflight/postflight check artifact.html carries the same stamp as the sources. Removes the recurring prompt sentence. Type: T.

## P18 Prompt gaps (pattern 9)
Items and fixes: (a) subagent review required from agent without Agent tool (ad0bb9; Q3: 1 confirmed, 2 unchecked) -> template lists tools available; orchestrator does independent review as a separate agent. (b) known-flaky lists -> forbidden (P09). (c) sibling omitted (a74ba5 vs abd0ce) -> SIBLINGS field mandatory, symmetric. (d) research assumed network -> P13. (e) no budgets -> P10. (f) no primary flows -> P22. Chosen: _common-header.md + typed templates; orchestrator checklist "prompt lint" (ORCHESTRATOR.md 2). Metric: prompts missing a required field (audit samples launches). Type: P.

## P19 Orchestrator edits app code while an agent works (NEW; Q1)
Evidence: ada109 got a SendMessage "extra change I just made in app.js" (11-12 04:59); ~236 edit-like orchestrator commands (65 on 11-10).
Chosen: orchestrator must hold a claim like any writer; tiny hotfixes only when no implementer holds v4; otherwise delegate or queue. preflight shows claims. Metric: orchestrator edits inside agent windows (extend audit-auto later). Type: R + T(claims).

## P20 git stash/pop and shared-tree git operations (NEW; Q1)
Evidence: a4b889, a13416, aeba2d, afc2c0, a8dd79 used git stash; aeba2d asked whether WIP commit c5fd2b5 was its own.
Chosen: ban stash/reset/checkout of unowned files; use worktree or temp copy for bisecting; commit-owned.sh handles commits. Type: R + T.

## P21 Data-loss-class migrations (E8, E10; CLAUDE.md)
Evidence: afc2c0 DATA_V migration replaced/resurrected the planned list (user 11-14 03:45); E8 migration popup reset portfolio.
Chosen: keep CLAUDE.md rule (ADDITIONS, never replace); add a mandatory data-safety checklist to implementer template and a migration canary: seed a user portfolio with one removed + one edited asset, bump DATA_V, assert preserved (canaries.md C-DATA). A35 exists in grader; canary proves it can go red. Type: R + P.

## P22 Acceptance lacks "primary flows still work"
Chosen: acceptance field must include the flow list; the flow-smoke slice (P04-B). Type: P.

## P23 Scope creep / unrequested edits (ada109 "a few edits beyond what you asked"; a74ba5 feature from a question)
Chosen: files-owned list + postflight diff vs claim; extra edits must be listed under Questions, not applied. Type: R + T.

## P24 Wording/DOM-coupled graders (pattern 3 maintenance; ~120 min)
Evidence: a4b889 (7/8 failures tests hardcoding old order), ada109, a13416, a23389.
Candidates: (A) data-testid / engine-derived expectations (grader-builder rule). (B) a change-impact list: before changing wording, grep graders. Chosen: both in grader-builder template and PLAYBOOK 3. Metric: grader-edit commits per feature. Type: R + P.

## P25 Plain-language / UX defects (E2,E3,E11,E13,E14)
Chosen: plain-language pass mandatory for implementer and reviewer; "number traceability" check: every main-page number must be traceable to an editable field (E13) - added to canaries/acceptance when a number is displayed. Type: P.

## P26 Phone update not applied (E16)
Chosen: ship checklist item: verify service-worker update path (stamped cache name changed) and tell the user the exact refresh step. Type: R.

## P27 User waits ~70 min with 12 requests unbuilt (11-16 03:32-04:45)
Evidence: three agents on the same files; requests queued.
Chosen: one writer per area + worktrees for independent requests; orchestrator posts a 3-line queue/ETA to the user; do not launch two agents that must queue behind one another. Metric: time-to-first-shipped per user request. Type: R.

## P28 Tool errors unclassified (NEW; 122 error-flagged results)
Chosen: audit-auto records tool_errors per agent with a flag >=8; classification of error type is a follow-up (needs transcript parse) listed in metrics-format "planned fields". Rule: 2 identical tool errors -> change approach (PLAYBOOK table D1). Type: R + T(metric).

## P30 Claims with no evidence ids (NEW; Q6)
Evidence: no hand-back cited a run id (only a74ba5 cited /tmp/full3.log + stamp 9db24adc); no claim proven false at report level but product-level false.
Chosen: ledger run ids + handback lint. Type: T.

## P31 Orchestrator relays claims without independent check
Evidence: 04:30 "Done and live ... version 39" not verified here.
Chosen: shipping checklist (ORCHESTRATOR.md 5): postflight exit 0 for the current tree, artifact fetched and stamp compared to ledger tree, list of unverified. Type: R + T.

## P32 Audit cannot be rerun automatically / data missing
Chosen: audit-now.sh (data regeneration without hand notes), audit-auto.py, metrics.jsonl with baseline line labelled baseline-2026-11-16. Per-agent dollar cost and thinking blocks remain unavailable (estimated). Type: T.

## P33 Realism grader rests on unverified benchmarks
Chosen: research-policy.md labels; the R score should split "verified" and "unverified" points (grader-builder follow-up; not mine to edit). Type: R + backlog.

## P34 Honesty gates not reproducible (a19344 13 points disclosure-only)
Chosen: handback section "NOT verified" and ledger ids; for research claims, source labels. Type: R.

## P35 Orchestrator verification contaminated by concurrent runs
Subsumed by P02 (same runner, same lock). 

## P37 Agent waits on another agent's process with pgrep loops (NEW; abd0ce ~20 min idle)
Chosen: run-grader.sh --wait-sec N (blocking flock) replaces pgrep loops; but better: do not hold work waiting; queue in orchestrator. Type: T + R.

## Cross-reference: patterns 1-12 and top-15 coverage
Pattern 1 -> P01,P02,P03,P37 | 2 -> P08 | 3 -> P04,P24 | 4 -> P16 | 5 -> P05 | 6 -> P11 | 7 -> P12,P36 | 8 -> P06,P07 | 9 -> P18,P22 | 10 -> P13,P33 | 11 -> P15 | 12 -> P17.
Top-15: 1 P01 | 2 P02 | 3 P03 | 4 P04 | 5 P05 | 6 P06 | 7 P07 | 8 P08 | 9 P09 | 10 P10 | 11 P11 | 12 P12 | 13 P13 | 14 P14 | 15 P15.
Escaped defects: E1 P04,P22 | E2 P25 | E3 P06,P25 | E4 P06 | E5 P31 | E6 P06,P04 | E7 P06 | E8 P21 | E9 P04 | E10 P21 | E11 P25 | E12 P04 | E13 P25 | E14 P25 | E15 P06 | E16 P26.
Orchestrator findings 1-7: delegation P18, concurrency P01/P02, ambiguity P06/P07, reporting P31, commit hygiene P12, token efficiency P15, friction P06/P27.

## Automation split
Tools (enforced): claim.sh, run-grader.sh, preflight.sh, postflight.sh, commit-owned.sh, worktree.sh, handback.sh, audit-now.sh (+audit-auto.py), selftest-all.sh.
Rules (PLAYBOOK + CLAUDE.md): interpretation, review-loop, research, orchestrator protocol, flaky handling, budgets, communication, context management.
Prompt templates: _common-header.md + 7 typed templates + handback.md.
Not solvable by me: stop-hook change (environment config), grader-internal flock (needs grader edit), mutation canaries as code (needs grader/v4 edits), full-run speed-up, per-agent dollar costs.
