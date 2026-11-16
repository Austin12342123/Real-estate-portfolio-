# AUTO audit 2026-11-16T05:02:21Z baseline-2026-11-16

Rule-based only (no hand judgments). Compare with the baseline in agents/audit/REPORT.md and playbook/metrics-format.md.

```json
{
 "ts": "2026-11-16T05:02:21Z",
 "label": "baseline-2026-11-16",
 "agents": 45,
 "active_min": 1189.0,
 "tools": 3021,
 "grader_runs": 1117,
 "full_runs": 162,
 "slice_runs": 255,
 "tool_errors": 126,
 "followup_handbacks": 0,
 "agent_overlap_min": 1.8,
 "orch_grader_cmds": 89,
 "orch_cmds_inside_agent_windows": 4,
 "user_msgs": 284,
 "flag_counts": {
  "grader-runs>40": 9,
  "full-runs>2": 22,
  "slice-runs>10": 11,
  "active>60min": 5,
  "tool-errors>=8": 5,
  "concurrent-agents": 7,
  "unverified-tail": 4
 }
}
```

| id | task | active min | tools | grader runs | full | slice | tool errs | flags |
|---|---|---|---|---|---|---|---|---|
| abd0ce | Fix asset numbering bugs | 94.7 | 110 | 55 | 11 | 10 | 2 | grader-runs>40,full-runs>2,active>60min,concurrent-agents |
| a13416 | Split Planned vs Bought portfolio | 94.1 | 225 | 113 | 11 | 29 | 5 | grader-runs>40,full-runs>2,slice-runs>10,active>60min |
| afc2c0 | Today's-dollars display and retarget plan | 68.8 | 172 | 60 | 13 | 11 | 5 | grader-runs>40,full-runs>2,slice-runs>10,active>60min |
| a1d0d1 | Fix design review defects to reach 90 | 66.3 | 110 | 40 | 5 | 6 | 7 | full-runs>2,active>60min |
| a1ee7b | Fix all audit problems for real | 66.3 | 194 | 105 | 3 | 38 | 3 | grader-runs>40,full-runs>2,slice-runs>10,active>60min |
| ad0bb9 | Robust plan, layout, sold profit, 95+ grades | 57.3 | 139 | 47 | 8 | 15 | 2 | grader-runs>40,full-runs>2,slice-runs>10 |
| a36951 | Three-page portfolio with saved portfolios | 49.2 | 94 | 51 | 3 | 17 | 0 | grader-runs>40,full-runs>2,slice-runs>10 |
| acc7e5 | Purchase examples drop-down | 48.7 | 120 | 37 | 6 | 12 | 3 | full-runs>2,slice-runs>10 |
| ada109 | Fix graders for page-specific totals | 46.6 | 104 | 62 | 9 | 13 | 3 | grader-runs>40,full-runs>2,slice-runs>10 |
| a74ba5 | Self-diagnosis, safety copies, bug report | 45.1 | 88 | 37 | 4 | 10 | 4 | full-runs>2,concurrent-agents |
| a19344 | Harsh logic and math audit with sources | 42.6 | 146 | 38 | 13 | 9 | 10 | full-runs>2,tool-errors>=8 |
| ae94d3 | Debug G1/G2/G8 full-run failure | 41.4 | 49 | 25 | 5 | 1 | 3 | full-runs>2 |
| ac243a | Adapt graders and add H category | 41.2 | 70 | 46 | 2 | 15 | 0 | grader-runs>40,slice-runs>10,unverified-tail |
| a8317d | Fix updates resurrecting removed assets | 39.8 | 36 | 22 | 4 | 7 | 2 | full-runs>2 |
| acf54b | Pooled trust funding model | 38.5 | 204 | 73 | 9 | 11 | 6 | grader-runs>40,full-runs>2,slice-runs>10 |
| ad318e | Business revenue input with per-year/month | 37.2 | 75 | 29 | 8 | 5 | 8 | full-runs>2,tool-errors>=8 |
| a23389 | Fix round-2 review defects | 34.3 | 95 | 28 | 15 | 1 | 9 | full-runs>2,tool-errors>=8 |
| aeba2d | Multifamily homes feature | 34.1 | 85 | 34 | 1 | 14 | 4 | slice-runs>10 |
| a8dd79 | Editable purchase examples | 27.3 | 72 | 29 | 5 | 11 | 2 | full-runs>2,slice-runs>10,unverified-tail |
| af60d8 | Fix round-3 review defects | 26.6 | 73 | 26 | 4 | 1 | 2 | full-runs>2 |
| aaa1c3 | Implement reorder, categories, extra panel | 25.4 | 70 | 37 | 2 | 8 | 1 | unverified-tail |
| ac7fb1 | Fix round-4 calculator polish | 24.0 | 71 | 19 | 3 | 0 | 4 | full-runs>2 |
| aba2c8 | Build the number-sync grader category | 19.3 | 27 | 14 | 2 | 6 | 0 |  |
| a4b889 | Fix graders after owned-order change | 14.4 | 55 | 18 | 5 | 2 | 2 | full-runs>2 |
| a96f4a | Audit all past agents' workflows | 13.2 | 58 | 8 | 3 | 0 | 1 | full-runs>2,concurrent-agents,unverified-tail |
| aa81ba | Build prototype grader harness | 11.8 | 12 | 5 | 4 | 0 | 0 | full-runs>2 |
| a47721 | Port grader to the current app (v4) | 9.5 | 12 | 5 | 2 | 0 | 0 | concurrent-agents |
| a9a1dc | Per-page design review, round 2 | 9.4 | 97 | 0 | 0 | 0 | 0 |  |
| a445df | Research commercial real estate and lending benc | 9.2 | 32 | 0 | 0 | 0 | 16 | concurrent-agents,tool-errors>=8 |
| a877d5 | Research small-business market benchmarks | 9.2 | 24 | 0 | 0 | 0 | 12 | concurrent-agents,tool-errors>=8 |
| aad7c6 | Third review newest parts | 8.9 | 55 | 22 | 0 | 0 | 2 |  |
| ae51c0 | Build the personal-finance grader category | 8.7 | 14 | 5 | 2 | 2 | 0 |  |
| ab4e41 | Final review newest parts | 6.5 | 50 | 4 | 0 | 0 | 2 |  |
| a8f8e7 | Independent design review of new parts | 6.0 | 54 | 2 | 0 | 0 | 2 |  |
| a1d83e | Re-review newest parts | 5.2 | 42 | 15 | 0 | 0 | 0 |  |
| a29eaa | Design fixes and the agent playbook | 4.6 | 31 | 6 | 0 | 1 | 4 | concurrent-agents |
| a62a95 | Design finance calculation model | 0.8 | 2 | 0 | 0 | 0 | 0 |  |
| adad88 | Research iPhone app delivery options | 0.5 | 1 | 0 | 0 | 0 | 0 |  |
| ae4893 | Baseline per-page design review (six pages) | 0.5 | 15 | 0 | 0 | 0 | 0 |  |
| aef458 | Ideate UX layout concepts | 0.5 | 1 | 0 | 0 | 0 | 0 |  |
| a51493 | Independent design review scoring | 0.3 | 6 | 0 | 0 | 0 | 0 |  |
| ad7655 | Independent design review of current app | 0.3 | 9 | 0 | 0 | 0 | 0 |  |
| ae97e6 | Fresh design review of the updated Finances page | 0.3 | 7 | 0 | 0 | 0 | 0 |  |
| a5028a | Independent design review of the Finances page | 0.2 | 7 | 0 | 0 | 0 | 0 |  |
| ab23ae | Fresh independent design re-review | 0.2 | 8 | 0 | 0 | 0 | 0 |  |

Orchestrator commands inside agent windows: {"ad318e": ["11-14T19:10"], "acc7e5": ["11-14T20:48", "11-14T21:01", "11-14T21:04"]}
Agent-vs-agent overlap pairs: {"a74ba5877d90db9da|abd0ceb2e134d1ac9": {"n": 2, "min": 1.8}}
