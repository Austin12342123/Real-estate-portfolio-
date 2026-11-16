# ADOPTION: rolling the playbook out and measuring it

## 1. What exists (all under prototype/agents/, nothing under v4/ or grader/ was touched)
PLAYBOOK.md (the plan) | playbook/ (problem map, orchestrator protocol, review/research policies, templates, requirements ledger, escaped defects, canaries, metrics format) | tools/ (claim, run-grader, preflight, postflight, commit-owned, worktree, handback, audit-now, audit-auto.py, selftest-all) | ledger/, locks/, handbacks/, metrics/ (runtime state; locks/handbacks/ledger runs are git-ignored via agents/.gitignore; ledger/grader-runs.jsonl and metrics/metrics.jsonl are tracked). Baseline metrics line already recorded (label baseline-2026-11-16).

## 2. How the orchestrator injects the playbook into every delegation
1. Open every delegation prompt with playbook/templates/_common-header.md (fill all <> fields), then the typed template (implementer, bug-fixer, researcher, reviewer, auditor, grader-builder, debugger).
2. Always set: goal verbatim; acceptance with worked example + primary flows; ledger rows; OWNER/TASK ids; files owned; SIBLINGS RUNNING (symmetric); budgets; network state for researchers; tools the agent actually has.
3. Include the one-line pointer "Read /home/user/Real-estate-portfolio-/prototype/agents/PLAYBOOK.md quick card first" (the file is on disk; do not paste the whole playbook: ~2.5k words each time costs context).
4. Orchestrator does its own prompt lint (ORCHESTRATOR.md 2) before sending.

## 3. CLAUDE.md
Apply playbook/CLAUDE-md-proposal.md (user decision). CLAUDE.md is the only text guaranteed to reach every agent without the orchestrator remembering.

## 4. Safe rollout (3 stages; each reversible; no tool touches v4/grader)
Stage 0 (now): `tools/selftest-all.sh` passes (done by the architect). Nothing else changes.
Stage 1 (next 2-3 agents): use claims + run-grader.sh + handback.sh only (the three that remove the largest waste: collisions, premature hand-backs, unevidenced claims). Watch for friction: if run-grader refuses incorrectly, fix the tool, not the rule. First real use also validates the output parsing of failing ids against a real grader log (self-tests use a fake grader; the failing-id regex expects the grader's lines like `  [0.00/4] A35 name  <-- detail`).
Stage 2 (next 10 agents): add templates, requirements ledger, escaped-defects loop, review-loop policy, worktrees for genuinely parallel implementers, commit-owned.sh.
Stage 3: CLAUDE.md edit, hook decision, grader-internal flock, flow-smoke slice, canaries.
Rollback: delete agents/locks/*, stop using the tools; nothing else depends on them.

## 5. Measuring improvement against the audit baseline
`tools/audit-now.sh --label after-10-agents` appends to metrics/metrics.jsonl; compare to the baseline line (see playbook/metrics-format.md for targets). Headline measures: avoidable minutes (29% -> <10%), grader runs per agent (~25 -> <15), full runs per task (3.7 -> <=1.3), surplus hand-backs (23 -> 0), concurrent overlap minutes (40 -> 0), orchestrator commands inside agent windows (4 -> 0), unverified-tail count (4 -> 0), WIP commits per 100 (18.6 -> <3), escaped defects per feature (0.36 -> <0.15, each with a regression check), repeated user corrections ("Like I said") (~12 in 8 days -> <=2). Ledger-derived measures come free from grader-runs.jsonl. Re-audit with a fresh auditor agent (template auditor.md) after ~20 agents, grading with the same rubric; the playbook is judged by cost per shipped feature and the user's repeat-correction count, not by grader scores.

## 6. Known limits (not solved)
- The stop hook creating blind WIP commits is environment configuration; commit-owned.sh does not prevent it (decision 1).
- Graders can still be run raw (`node grade.js`) by an agent that ignores the rules; preflight detects raw processes and the handback lint demands ledger ids, but only a flock inside grade.js enforces it (3-line patch proposed below; needs the grader owner).
- Mutation canaries and the flow-smoke slice need grader work (grader-builder task); canaries.md only specifies them.
- Full run still ~16 min; speeding it up is a separate grader project.
- Per-agent dollar cost, thinking blocks, tool-error classes are not in the logs/parsed (estimates only).
- run-grader.sh restores report.md/result.json after partial runs by file copy; two humans editing those files by hand during a run would be overwritten.
- Research agents: nothing I built can create network access.
- audit-now.sh's generate.py (hand judgments) is not automatable: new agents need notes.py entries by an auditor agent; the automatic part is audit-auto.

## 7. Suggested follow-up for the grader owner (NOT applied; I may not edit grader files)
Make raw runs fail fast too: in grade.js exit with code 78 and a message unless `process.env.RUN_GRADER_WRAPPER === '1'`, and add `RUN_GRADER_WRAPPER=1` to the env line in tools/run-grader.sh (one-line change on my side once the grader check exists). Until then enforcement is by convention: preflight flags raw `node grade.js` processes and handback.sh rejects claims without ledger run ids.

## 8. Open questions the user must decide
1. Stop hook: disable the blind WIP-commit hook, or change it to call tools/commit-owned.sh (or to do nothing when other claims are live)? (24 of 129 commits were hook WIP commits that swept other agents' files.) I cannot change it.
2. Push policy: keep pushing to the dev branch on every green hand-back (recommended) vs. never push without your say-so? Main only after a clean full run?
3. Parallelism: allow worktree-parallel implementers (faster, needs orchestrator merges) or strictly one implementer at a time (slower, simplest)?
4. Budgets: confirm 10 slices + 1 full (2 max) and the 60-min implementer cap, or set your own.
5. Review rounds: confirm max 2 per feature and that cosmetic items may be left on a list.
6. May the orchestrator ask you questions more often (up to ~1 per task when a trigger in PLAYBOOK 2.3 fires)? The audit shows 3 questions in 8 days vs ~12 repeated corrections.
7. Should "is there a way to ...?" always be answered without building, even if a build seems obviously wanted?
8. Network for research: do you want the research agents' environment fixed (the allowlist never took effect) or accept offline/unverified benchmarks and label them?
9. Apply the CLAUDE.md proposal as written?
10. Realism grader: show verified vs unverified points separately (grader change)?
