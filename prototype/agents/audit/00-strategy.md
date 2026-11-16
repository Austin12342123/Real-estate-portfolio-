# Audit strategy (written BEFORE inspecting any data)

## Goal
Grade every agent (and the orchestrator) on process + outcome, with evidence, wasted effort and concrete fixes.

## Rubric (100 pts)
| Dim | Wt | Proof of score |
|---|---|---|
| Effectiveness (task achieved, acceptance met) | 25 | final repo state/commit diffs vs prompt ask; later grader runs |
| Accuracy / honesty of final report | 20 | claims in hand-back vs repo state, later runs, user bug reports; overclaim = deduction |
| Verification rigor | 15 | ran checks, viewed screenshots, full vs partial runs, re-verified after last edit |
| Efficiency (time/tokens/tool calls) | 15 | duration, tool count, tokens, waits, retries, re-reads, grader runs |
| Instruction adherence & scope | 15 | no commit/push, thresholds untouched, one grader at a time, out-of-scope files/settings |
| Hygiene of final state | 10 | stale bundle, unstamped files, regenerated reports, scratch left, WIP sweeps |
Grade: A>=90 B>=80 C>=70 D>=60 F<60. Escaped defects (user-reported later) apply a cap/deduction to Effectiveness/Accuracy of the responsible agent only if the defect was in its scope AND discoverable with the info it had.

## Evidence & method
1. Inventory every transcript/log file; classify (agent transcript, Monitor/Bash log, other); map to task via first user prompt and orchestrator launch prompts.
2. Per agent extract: first/last timestamps, tool-use counts by name, token usage, Bash commands (grader runs, git commands, sleeps), edited files, final message.
3. Claim-vs-reality: extract numeric/absolute claims ("100%", "all pass", "N tests") from final messages; compare with later grader outputs/result json, git diffs, and user complaints.
4. Efficiency: wall minutes, idle/wait time (sleep, Monitor), repeated reads of same file, duplicate grader runs, concurrent grader collisions (overlapping grader time windows across agents), retries after failure. Estimate waste as minutes overlapping/duplicated.
5. Escaped-defect attribution: list user messages with complaint/bug cues in the main transcript; for each find the agent whose scope/commit touched it (git log/blame, prompt text) and the process gap (prompt missing criterion / no verification / grader blind spot).
6. Anti-bias: score on information available at the time (prompt, repo state), separate "process quality" from "outcome luck"; hindsight defects flagged as grader/prompt gaps not agent faults unless discoverable; use same rubric and numeric anchors for all; cite evidence for every deduction.
7. Sampling: exhaustive on metadata (all files, scripted); deep reading only of final messages, prompts, user messages, and targeted windows around errors.
8. Scripts (agents/audit/scripts): inventory.py (classify+metrics), extract_main.py (user msgs, launches), claims.py, overlap.py (grader windows), gitmap.py. Output audit.json.
9. Missing data is stated explicitly; substitutes named.

## As executed (appended after the work; the plan above was written first and not changed)
- Scripts actually written (scripts/): extract_main.py, inventory.py, overlap.py, activity.py, metrics.py, tasklogs.py, generate.py, notes.py (hand judgments with evidence), run_all.sh. claims.py/gitmap.py were folded into manual targeted reads of final messages and `git log --stat`.
- Deviation 1: raw token sums overstated usage ~2x (usage repeated per content block); inventory.py now de-duplicates by message id. Costs are calibrated to the session cost-state total.
- Deviation 2: collision detection uses agent active windows (gaps >12 min split) and orchestrator grader commands, because background runs hide true duration.
- Deviation 3: sampling was exhaustive on metadata (all 44 agents, 241 task files, 129 commits, 121 user messages) and deep on prompts/finals/user complaints/collision windows; individual tool results were not read except in targeted windows.
- Scoring uses the same anchors for every agent: 90+ = prompt fully met, claims verified, no waste; judgments with evidence are in scripts/notes.py and each agent file.
