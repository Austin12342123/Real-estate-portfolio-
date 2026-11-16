# Standing metrics (so audits can run automatically)
File: agents/metrics/metrics.jsonl, one JSON object per audit run (append-only). Produced by `tools/audit-now.sh --label LABEL` (calls the auditor's scripts on the session logs, then tools/audit-auto.py). Baseline line: label `baseline-2026-11-16`.
Fields: ts, label, agents, active_min, tools, grader_runs, full_runs, slice_runs, tool_errors, followup_handbacks, agent_overlap_min, orch_grader_cmds, orch_cmds_inside_agent_windows, user_msgs, flag_counts{grader-runs>40, full-runs>2, slice-runs>10, active>60min, concurrent-agents, unverified-tail, grader-edit-after-full, tool-errors>=8}.
Also available per run: agents/audit-runs/<ts>/AUTO-REPORT.md (per-agent rows + flags).
Ledger-derived metrics (compute with jq from agents/ledger/grader-runs.jsonl; examples):
- full runs per task: `jq -s '[.[]|select(.event=="start" and .kind=="full")]|group_by(.task)|map({task:.[0].task,n:length})'`
- invalid runs: `select(.verdict=="invalid-tree-changed")`; flake rate per check: failing ids across runs on the same tree hash.
Targets vs baseline (judge improvement by comparing the next 10 agents with the baseline mean): grader_runs/agent < 15 (baseline ~25); full runs per task <= 1.3 (3.7); followup_handbacks 0 (23); agent_overlap_min 0 (40 real); orch commands inside agent windows 0 (4); unverified-tail 0 (4); WIP commits/100 < 3 (18.6); escaped defects per feature < 0.15 (0.36) with regression check 100%; review rounds <= 2; avoidable minutes < 10% (29%).
Planned fields (need transcript parsing, not yet implemented): tool-error classes, user "Like I said" repeats, per-agent real cost, orchestrator peak context, time-to-first-shipped per user request, hand-backs with ledger ids (%).
Rerun cadence: after every 10 agents or weekly; orchestrator reads the last two lines and acts on any worse metric.
