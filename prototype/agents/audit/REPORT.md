# REPORT: audit of every agent workflow (executive summary)

Auditor: agent a96f4a284bbdf078e (read-only; no grader run, no v4/grader edit, no commit). Files: `00-strategy.md`, `01-inventory.md`, `agent-<id>.md` (44), `02-cross-cutting-patterns.md`, `03-orchestrator-audit.md`, `audit.json`, `scripts/` (`run_all.sh`).

Headline: 44 agents, ~1,160 active min, est. $149 (agents) + ~$66 (orchestrator) = ~$215 vs $207.76 recorded. About 335 agent-min (29%) and ~$40 were avoidable. Agent honesty is high (most disclose failures); the main losses are process-level: concurrency in a shared tree, saturated graders that do not catch user-visible defects, prompt/requirement gaps, and bar-chasing review loops. Orchestrator grade: **C (72)**.

Grade scale: A>=90 B>=80 C>=70 D>=60. Weights: effectiveness 25, honesty 20, verification 15, efficiency 15, adherence 15, hygiene 10. `*` provisional (still running at audit time). #44 (this auditor) not graded.

## All agents

| # | id | task | grade | score | active min | est $ | top issue |
|---|---|---|---|---|---|---|---|
| 1 | a62a95 | Design finance calculation model | A | 90.9 | 0.8 | 0.17 | Good one-shot spec; no verification possible, never cross-checked against the later engine. |
| 2 | aef458 | Ideate UX layout concepts | A | 90.1 | 0.5 | 0.13 | UX concepts delivered in 30 s; 3 concepts, ASCII mocks, no feasibility check. |
| 3 | adad88 | Research iPhone app delivery options | B | 87.2 | 0.5 | 0.13 | Correct PWA recommendation (user installed it) but written from memory: WebSearch allowed yet not used. |
| 4 | aa81ba | Build prototype grader harness | B | 89.7 | 11.8 | 1.11 | Solid first grader (82.63/85, 51 s) with an honest failing list; became the template for all later graders. |
| 5 | a51493 | Independent design review scoring | B | 89.2 | 0.3 | 0.15 | Useful 9/15 review with 5 ranked defects; viewed all 5 screenshots. |
| 6 | ab23ae | Fresh independent design re-review | A | 90.1 | 0.2 | 0.16 | Fresh re-review (10/15) flagged its own uncertainty about a full-page screenshot artifact. |
| 7 | a877d5 | Research small-business market benchmarks | C | 74.0 | 9.2 | 0.39 | Honest total failure: network allowlist never reached the agent; 24 tool calls, nothing verified. |
| 8 | a445df | Research commercial real estate and lending benchmarks | C | 74.0 | 9.2 | 0.46 | Same environmental failure as a877d5 (16 tool errors); honest report. |
| 9 | a47721 | Port grader to the current app (v4) | B | 88.3 | 9.5 | 0.96 | Ported grader to v4 in 9.5 min; honest about 54.72/85 with R left as a 0 placeholder. |
| 10 | ad7655 | Independent design review of current app | A | 90.2 | 0.3 | 0.16 | 9.5/15; spotted that headline numbers are 20-year projections beside owned rows showing $0. |
| 11 | ae51c0 | Build the personal-finance grader category | B | 89.2 | 8.7 | 0.95 | F category built in 8.7 min; independent simulation on 80 random states; honest 89.05/90 stable over 5 runs. |
| 12 | a5028a | Independent design review of the Finances page | A | 90.0 | 0.2 | 0.06 | 6.5/10 Finances review with ranked fixes; verdict-vs-rows contradiction found. |
| 13 | ae97e6 | Fresh design review of the updated Finances page | B | 88.8 | 0.3 | 0.07 | Second "fresh" Finances review 3 minutes after the first; mostly repeats defects (page length, awkward labels). |
| 14 | ae4893 | Baseline per-page design review (six pages) | A | 91.2 | 0.5 | 0.12 | Baseline per-page scoring (6 pages) gave the first quantitative anchor (Portfolio 66/100). |
| 15 | aba2c8 | Build the number-sync grader category | B | 86.5 | 19.3 | 1.86 | G (number-sync) grader found real app bugs (chart end vs KPI, G8 6/12) and reported them without hiding them; 19 min. |
| 16 | a9a1dc | Per-page design review, round 2 | B | 84.3 | 9.4 | 1.64 | Nine-round reviewer reached 90/100 on every page, but static screenshots could not see broken interactions. |
| 17 | ac243a | Adapt graders and add H category | B | 81.9 | 41.2 | 3.74 | Adapted graders to a big UI change and added H; 46 grader runs / 41 min , and fixed 3 real app bugs. |
| 18 | aaa1c3 | Implement reorder, categories, extra panel | C | 78.4 | 25.4 | 3.57 | Implemented 9 UI requests (reorder, categories, extra panel) and passed all graders, yet the user could not edit houses 35 minutes later. |
| 19 | a19344 | Harsh logic and math audit with sources | B | 89.7 | 42.6 | 6.53 | Best-honesty agent: reported 100/100 but only ~87 points evidence-backed, 40-source target missed, gates not reproducible. |
| 20 | a1ee7b | Fix all audit problems for real | B | 82.3 | 66.3 | 12.16 | Fixed the 15 audit problems with real model changes (taxes, depreciation, refi, NNN); but 105 grader invocations / 40 min / 407k output toke |
| 21 | acf54b | Pooled trust funding model | C | 76.5 | 38.5 | 11.84 | Built the pooled trust-funding model and passed L=100, but its semantics still confused the user (#4-#7 funded before #2). |
| 22 | a4b889 | Fix graders after owned-order change | B | 86.5 | 14.4 | 1.12 | Fixed 8 order-dependent test failures in 14 min; two different hand-backs (01:40, 01:42). |
| 23 | a13416 | Split Planned vs Bought portfolio | C | 74.0 | 94.1 | 19.8 | Planned/Bought split delivered, but 94 min, 225 tools, 113 grader invocations (50 min), 24 builds; later the user said its planned-row descr |
| 24 | a36951 | Three-page portfolio with saved portfolios | B | 82.9 | 49.2 | 5.66 | Three-page main screen + saved portfolios in 49 min; honest caveats (G6 flake once in ~5 runs). |
| 25 | ada109 | Fix graders for page-specific totals | B | 82.4 | 46.6 | 2.88 | Fixed graders for page-specific totals; also made unrequested app edits ("a few edits beyond what you asked") - disclosed. |
| 26 | ad0bb9 | Robust plan, layout, sold profit, 95+ grades | B | 80.7 | 57.3 | 9.31 | Large bundle of 8 asks (robust 27-asset plan, details area, sold profit, dates, calculator, stretch scenario). Honest that it had no subagen |
| 27 | a8f8e7 | Independent design review of new parts | A | 90.8 | 6.0 | 0.91 | Best-practice independent reviewer: Playwright at 3 viewports, dark/light, 6 parts scored (52-78). |
| 28 | a1d0d1 | Fix design review defects to reach 90 | C | 77.8 | 66.3 | 7.64 | Fixed the first review round (scores 52-78) in 66 min; treated an F3 sub-check failure as a flake "and did not investigate further". |
| 29 | a1d83e | Re-review newest parts | B | 87.0 | 5.2 | 0.97 | Round-2 review: scores 82-91; found sale rounding mismatches; prompt included previous scores and the 90 bar (anchoring). |
| 30 | a23389 | Fix round-2 review defects | B | 81.1 | 34.3 | 3.64 | Fixed 12 defects incl. sale rounding in 34 min; also edited three graders (ux, sync, info) - disclosed. |
| 31 | aad7c6 | Third review newest parts | A | 92.5 | 8.9 | 1.1 | Verified every claimed fix by reproduction; still found calculator defects - model reviewer. |
| 32 | af60d8 | Fix round-3 review defects | C | 79.6 | 26.6 | 2.18 | Round-3 fixes in 27 min; did not repeat the full run after its last adjustment and did not view two changed screens - both disclosed. |
| 33 | ab4e41 | Final review newest parts | A | 90.2 | 6.5 | 0.97 | Final reviewer: reproduced round-3 claims; calculator just under bar. |
| 34 | ac7fb1 | Fix round-4 calculator polish | B | 82.8 | 24.0 | 2.35 | Round-4 calculator polish in 24 min; skipped screenshots for two of six items and a second full run (disclosed). |
| 35 | afc2c0 | Today's-dollars display and retarget plan | D | 69.9 | 68.8 | 11.17 | Today's-dollars + plan retarget + Lost Creek add: 172 tools / 69 min , then DATA-LOSS class defect (user #91) and 4 requ |
| 36 | a8317d | Fix updates resurrecting removed assets | B | 83.3 | 39.8 | 1.79 | Fixed updates resurrecting removed assets; introduced ADDITIONS (append once) and DATA_V rule that became CLAUDE.md standing rule. |
| 37 | ad318e | Business revenue input with per-year/month | B | 81.3 | 37.2 | 3.04 | Business revenue per month/year in 37 min; 4 identical hand-backs (19:09-19:20) and 8 tool errors. |
| 38 | aeba2d | Multifamily homes feature | B | 81.9 | 34.1 | 4.82 | Multi-family feature in 34 min; reported a WIP commit swept by the environment hook and offered a reset. |
| 39 | acc7e5 | Purchase examples drop-down | C | 74.1 | 48.7 | 6.49 | 16 purchase examples feature; sent the same 7.8k hand-back 10 times (20:48-21:04) and the first one 16 minutes before it finished; ran slice |
| 40 | a8dd79 | Editable purchase examples | C | 79.7 | 27.3 | 3.7 | Editable examples in 27 min; changed a coverage floor in logic-grade.js (`n > 1500` -> `n > 1000`) without reporting it, and used git stash. |
| 41 | ae94d3 | Debug G1/G2/G8 full-run failure | D | 67.3 | 41.4 | 1.64 | 41-minute debugging of a failure that agent could not reproduce; likely cause external: overlapping full grader runs by the orchestrator (20 |
| 42 | a74ba5 | Self-diagnosis, safety copies, bug report | D | 64.2 | 45.1 | 5.68 | Built bug-report/safety-copy/self-heal feature (user only asked "is there a way to automate this?"); ended with A35/C01/G6/H1/A07/G2 failing |
| 43 | abd0ce | Fix asset numbering bugs | D* | 68.6 | 79.9 | 5.27 | Numbering fix (still running at audit time): root cause found (one global numbering consumed by per-view pages) and a numbering grader (N) w |
| 44 | a96f4a | Audit all past agents' workflows | n/a | 0.0 | 3.2 | 0.51 | This auditor (self; not graded). |

## Top 15 improvements (ranked by expected savings x risk reduction)

1. **One writer per working tree** (serialise implementers or `git worktree` per agent; reviewers parallel only). Prevents patterns 1/7; est. saves ~100 agent-min and removes false "flaky" failures (a74ba5 vs abd0ce 40 min overlap; orchestrator graders inside ad318e/acc7e5 windows).
2. **Orchestrator never runs graders while a grading agent is active**; read its log instead. (ae94d3's 41 min debug is the cost of ignoring this.)
3. **Lock the grader** (`flock grader.lock` inside grade.js; fail fast if held; ban `pkill`).
4. **Make graders discriminating, not just green**: add a mutation canary list (break X, expect check Y red), and a "primary flows" smoke (tap row -> edit -> back, remove asset renumbering, migration preserves user data). Would have caught E1, E10, E12 before the user.
5. **Hand back exactly once, only after background jobs finish** (acc7e5 x10, ad318e x4). Saves ~$2 and prevents premature action on stale reports.
6. **Requirement ledger with a worked example per user rule**, pasted into each prompt (credit-line funding, today's-dollars basis, planned vs real). Four of the user's repeated corrections (E4, E15) trace here; est. saves 3-4 agent runs (~120 min).
7. **Treat questions as questions**: "is there a way to...?" gets a short plan and a go/no-go (a74ba5 built 45 min first).
8. **Remove the pass bar from reviewer prompts and add interaction probes**; cap polish loops at 2 rounds per feature (8-agent loop cost 178 min, ~$20).
9. **Never accept "known flaky"**: log failing check, run id, concurrent processes; investigate with `overlap.py` before rerun (F3/G6/G1/G2/G8 were dismissed in 6 agents).
10. **Run budget in every prompt**: at most ~10 slice runs + 1 final full run, state full-run wall time (15 min). a1ee7b used 105 grader invocations, a13416 113.
11. **Verification tail rule**: after the last edit always rerun the affected slice AND the full grader, or state "UNVERIFIED TAIL" (af60d8, ac7fb1, a8dd79, ad318e).
12. **Do not push snapshots of failing work; stop-hook WIP commits should be squashed**; commit only on a green hand-back. Removes 24 WIP and 9 failing pushes of noise.
13. **Connectivity probe before research fan-out** (a877d5/a445df 18 min wasted); label benchmark-based realism points as "unverified" in the grader score (R = 30/85 points rests on 48 of 52 benchmark source entries flagged unverified).
14. **Disclose every changed numeric assertion** in grader hand-backs (a8dd79 lowered a coverage floor 1500->1000 silently; a13416 "except where noted").
15. **Shrink orchestrator context**: summarise agents' hand-backs (not 8-11k chars each), avoid 270 wakeups, compact earlier; est. saves ~$15-20 of cache reads.

## Top findings (short)

- Collision: orchestrator launched/ran graders inside agent windows (11-14 19:10:03, 20:48:55, 21:01:34, 21:04:00; 11-16 03:22+03:27 parallel launches). Hypothesis (unproven): the "flaky" G1/G2/G8 that cost ae94d3 41 min were these collisions.
- Overclaim pattern is mild: agents say "100% in every category" and mean it for the grader; the product still failed user checks (E1, E10, E12). a19344 is the model of honesty (13 points disclosure-only, 40-source target missed).
- Worst data-loss class defect: afc2c0's migration replaced/resurrected the user's planned list (user 11-14 03:45); fixed by a8317d, rule now in CLAUDE.md.
- Research agents a877d5/a445df were set up to fail (no network) and reported so honestly; the realism grader (R) is therefore built on unverified benchmarks.
- Review/fix polish loop on 11-12 consumed 8 agents, 178 min and ~$20, with behaviour reversed twice (calculator commit).

## What data was missing
User screenshots (pixels), thinking blocks, per-agent dollar cost (estimated), content of published Artifact versions, Bash-heredoc edits (counted via git instead), abd0ce final report (still running), and background-run durations (lower bounds only).
