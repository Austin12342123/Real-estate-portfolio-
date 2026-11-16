# 01 Inventory of all agents and data sources

Times are UTC, 2026-11-08 .. 2026-11-16. Tokens are de-duplicated per assistant message (a streamed message repeats its usage on every content block; summing raw lines overstates output ~2x). "New tok" = input+output+cache-write; cache-read shown separately. Cost = estimate calibrated against the session cost-state total ($207.76).

## Agents (44 subagent transcripts; #44 is this auditor)

| # | id | task | start | wall min | active min | tools | out tok | new tok | cache-read tok | est $ | grader runs (full/slice) | builds | png views | tool errs |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | a62a95 | Design finance calculation model | 11-08T19:23 | 0.8 | 0.8 | 2 | 5k | 71k | 0M | 0.17 | 0/0 | 0 | 0 | 0 |
| 2 | aef458 | Ideate UX layout concepts | 11-08T19:23 | 0.5 | 0.5 | 1 | 3k | 63k | 0M | 0.13 | 0/0 | 0 | 0 | 0 |
| 3 | adad88 | Research iPhone app delivery options | 11-08T19:23 | 0.5 | 0.5 | 1 | 3k | 63k | 0M | 0.13 | 0/0 | 0 | 0 | 0 |
| 4 | aa81ba | Build prototype grader harness | 11-08T19:42 | 11.8 | 11.8 | 12 | 70k | 316k | 1M | 1.11 | 4/0 | 0 | 0 | 0 |
| 5 | a51493 | Independent design review scoring | 11-08T19:42 | 0.3 | 0.3 | 6 | 1k | 73k | 0M | 0.15 | 0/0 | 0 | 5 | 0 |
| 6 | ab23ae | Fresh independent design re-review | 11-08T19:56 | 0.2 | 0.2 | 8 | 1k | 76k | 0M | 0.16 | 0/0 | 0 | 7 | 0 |
| 7 | a877d5 | Research small-business market benchmarks | 11-08T21:01 | 9.2 | 9.2 | 24 | 9k | 134k | 0M | 0.39 | 0/0 | 0 | 0 | 12 |
| 8 | a445df | Research commercial real estate and lending benchmarks | 11-08T21:01 | 9.2 | 9.2 | 32 | 9k | 149k | 0M | 0.46 | 0/0 | 0 | 0 | 16 |
| 9 | a47721 | Port grader to the current app (v4) | 11-08T21:02 | 9.5 | 9.5 | 12 | 67k | 224k | 1M | 0.96 | 2/0 | 0 | 0 | 0 |
| 10 | ad7655 | Independent design review of current app | 11-08T21:22 | 0.3 | 0.3 | 9 | 2k | 76k | 0M | 0.16 | 0/0 | 0 | 8 | 0 |
| 11 | ae51c0 | Build the personal-finance grader category | 11-09T04:22 | 8.7 | 8.7 | 14 | 49k | 258k | 1M | 0.95 | 2/2 | 0 | 0 | 0 |
| 12 | a5028a | Independent design review of the Finances page | 11-09T04:31 | 0.2 | 0.2 | 7 | 1k | 22k | 0M | 0.06 | 0/0 | 0 | 6 | 0 |
| 13 | ae97e6 | Fresh design review of the updated Finances page | 11-09T04:34 | 0.3 | 0.3 | 7 | 1k | 23k | 0M | 0.07 | 0/0 | 0 | 6 | 0 |
| 14 | ae4893 | Baseline per-page design review (six pages) | 11-09T04:37 | 0.5 | 0.5 | 15 | 4k | 36k | 0M | 0.12 | 0/0 | 0 | 14 | 0 |
| 15 | aba2c8 | Build the number-sync grader category | 11-09T04:41 | 19.3 | 19.3 | 27 | 92k | 432k | 4M | 1.86 | 2/6 | 0 | 0 | 0 |
| 16 | a9a1dc | Per-page design review, round 2 | 11-09T16:08 | 834.1 | 9.4 | 97 | 30k | 657k | 2M | 1.64 | 0/0 | 0 | 88 | 0 |
| 17 | ac243a | Adapt graders and add H category | 11-09T16:33 | 41.2 | 41.2 | 70 | 118k | 714k | 12M | 3.74 | 2/15 | 2 | 0 | 0 |
| 18 | aaa1c3 | Implement reorder, categories, extra panel | 11-10T05:35 | 25.4 | 25.4 | 70 | 114k | 444k | 15M | 3.57 | 2/8 | 7 | 5 | 1 |
| 19 | a19344 | Harsh logic and math audit with sources | 11-10T08:53 | 42.6 | 42.6 | 146 | 160k | 516k | 33M | 6.53 | 13/9 | 6 | 0 | 10 |
| 20 | a1ee7b | Fix all audit problems for real | 11-10T17:31 | 66.3 | 66.3 | 194 | 208k | 830k | 66M | 12.16 | 3/38 | 11 | 0 | 3 |
| 21 | acf54b | Pooled trust funding model | 11-10T20:25 | 38.5 | 38.5 | 204 | 167k | 624k | 68M | 11.84 | 9/11 | 3 | 1 | 6 |
| 22 | a4b889 | Fix graders after owned-order change | 11-12T01:28 | 14.4 | 14.4 | 55 | 15k | 140k | 5M | 1.12 | 5/2 | 3 | 0 | 2 |
| 23 | a13416 | Split Planned vs Bought portfolio | 11-12T01:42 | 94.1 | 94.1 | 225 | 245k | 3657k | 83M | 19.8 | 11/29 | 24 | 6 | 5 |
| 24 | a36951 | Three-page portfolio with saved portfolios | 11-12T03:27 | 49.2 | 49.2 | 94 | 102k | 1218k | 20M | 5.66 | 3/17 | 13 | 5 | 0 |
| 25 | ada109 | Fix graders for page-specific totals | 11-12T04:37 | 46.6 | 46.6 | 104 | 44k | 242k | 15M | 2.88 | 9/13 | 8 | 0 | 3 |
| 26 | ad0bb9 | Robust plan, layout, sold profit, 95+ grades | 11-12T05:36 | 556.9 | 57.3 | 139 | 124k | 1830k | 37M | 9.31 | 8/15 | 12 | 7 | 2 |
| 27 | a8f8e7 | Independent design review of new parts | 11-12T14:54 | 6.0 | 6.0 | 54 | 28k | 172k | 3M | 0.91 | 0/0 | 0 | 26 | 2 |
| 28 | a1d0d1 | Fix design review defects to reach 90 | 11-12T15:00 | 66.3 | 66.3 | 110 | 112k | 1896k | 25M | 7.64 | 5/6 | 10 | 11 | 7 |
| 29 | a1d83e | Re-review newest parts | 11-12T16:07 | 5.2 | 5.2 | 42 | 26k | 133k | 4M | 0.97 | 0/0 | 0 | 10 | 0 |
| 30 | a23389 | Fix round-2 review defects | 11-12T16:12 | 34.3 | 34.3 | 95 | 82k | 326k | 18M | 3.64 | 15/1 | 4 | 10 | 9 |
| 31 | aad7c6 | Third review newest parts | 11-12T16:46 | 8.9 | 8.9 | 55 | 30k | 126k | 4M | 1.1 | 0/0 | 0 | 16 | 2 |
| 32 | af60d8 | Fix round-3 review defects | 11-12T16:56 | 26.6 | 26.6 | 73 | 43k | 478k | 7M | 2.18 | 4/1 | 6 | 10 | 2 |
| 33 | ab4e41 | Final review newest parts | 11-12T17:31 | 6.5 | 6.5 | 50 | 22k | 148k | 4M | 0.97 | 0/0 | 0 | 8 | 2 |
| 34 | ac7fb1 | Fix round-4 calculator polish | 11-12T17:38 | 24.0 | 24.0 | 71 | 43k | 535k | 8M | 2.35 | 3/0 | 3 | 17 | 4 |
| 35 | afc2c0 | Today's-dollars display and retarget plan | 11-14T02:11 | 68.8 | 68.8 | 172 | 140k | 2138k | 45M | 11.17 | 13/11 | 8 | 5 | 5 |
| 36 | a8317d | Fix updates resurrecting removed assets | 11-14T03:45 | 39.8 | 39.8 | 36 | 23k | 651k | 3M | 1.79 | 4/7 | 2 | 0 | 2 |
| 37 | ad318e | Business revenue input with per-year/month | 11-14T18:43 | 37.2 | 37.2 | 75 | 42k | 749k | 10M | 3.04 | 8/5 | 4 | 5 | 8 |
| 38 | aeba2d | Multifamily homes feature | 11-14T19:29 | 34.1 | 34.1 | 85 | 125k | 790k | 19M | 4.82 | 1/14 | 5 | 4 | 4 |
| 39 | acc7e5 | Purchase examples drop-down | 11-14T20:16 | 48.7 | 48.7 | 120 | 132k | 988k | 27M | 6.49 | 6/12 | 6 | 6 | 3 |
| 40 | a8dd79 | Editable purchase examples | 11-14T21:27 | 27.3 | 27.3 | 72 | 88k | 668k | 14M | 3.7 | 5/11 | 2 | 4 | 2 |
| 41 | ae94d3 | Debug G1/G2/G8 full-run failure | 11-14T22:09 | 41.4 | 41.4 | 49 | 22k | 477k | 4M | 1.64 | 5/1 | 1 | 0 | 3 |
| 42 | a74ba5 | Self-diagnosis, safety copies, bug report | 11-16T03:22 | 45.1 | 45.1 | 88 | 176k | 903k | 21M | 5.68 | 4/10 | 5 | 4 | 4 |
| 43 | abd0ce | Fix asset numbering bugs | 11-16T03:27 | 79.9 | 79.9 | 95 | 77k | 1534k | 14M | 5.27 | 10/5 | 5 | 0 | 2 |
| 44 | a96f4a | Audit all past agents' workflows | 11-16T04:45 | 2.0 | 3.2 | 18 | 14k | 105k | 1M | 0.51 | 0/0 | 1 | 0 | 1 |

Totals: active 1160 min, tools 2935, output tokens 2894k, est cost $149.0 (agents) + ~$66 orchestrator = ~$215 vs cost-state $207.76 (calibration error <4%).

## Data sources and what was used

| source | location | classification | used for |
|---|---|---|---|
| Subagent transcripts | /root/.claude/projects/.../subagents/agent-*.jsonl (+ .meta.json, .prefix.json) | 44 agent transcripts (JSONL) | all per-agent metrics, prompts, hand-backs, bash traces |
| tasks/*.output symlinks | scratchpad/../tasks/a*.output | 44 symlinks to the same transcripts | mapping agent id -> transcript |
| tasks/*.output Bash/Monitor logs | same dir | 197 files: 71 >200 B (63 contain grader output), 126 tiny exit-status stubs | evidence of full-run results (e.g. b0bwsgpqy = 100/100 run; b3rqo3gg1 = A35/C01 failures) |
| Orchestrator transcript | .../7dc1946d-....jsonl (45 MB, 994 assistant msgs, 121 real user messages, 457 queue ops) | main | user requests, launch prompts, hand-backs, complaints, pushes, publishes, cost-state |
| git history | `git log` (129 commits, 24 "WIP", 126 by Claude, 3 merges by owner) | commits/stat | WIP sweep analysis, escaped-defect fixes, grader-report churn |
| Grader outputs | prototype/grader/report*.md, result*.json, numbering-bugs.md, multifamily-research.md, logic/ | current tree | claim-vs-reality (current report.md at 04:46 shows 84.53/85) |
| CLAUDE.md | repo root | standing rules (ADDITIONS/DATA_V, never replace user portfolios) | adherence + attribution |
| notifications | queue-operation <task-notification> usage lines | 270 task notifications | duplicate hand-back detection |

## Missing / limited data

- User-attached screenshots (images in user messages) were not available as pixels; user bug descriptions used as text only.
- No per-agent cost figures exist; costs are estimates calibrated to the session total. Orchestrator thinking blocks are not in the transcript.
- Agent edits made through `python3 - <<EOF` / `sed -i` in Bash are not captured by Edit/Write counts, so "files edited" is incomplete (git diff per WIP commit used instead).
- Artifact publishes (55 calls) were counted, not content-verified (no network; versions not read).
- a74ba5 and abd0ce were still running when the audit was taken (04:47); abd0ce has no final report; their grades are provisional. This auditor (a96f4a) is not graded.
- Foreground grader durations are measured exactly; background runs (nohup/run_in_background) are only visible as launch + Monitor/sleep, so grader minutes are a lower bound.
