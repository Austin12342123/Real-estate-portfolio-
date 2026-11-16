
# Q&A for playbook architect (from auditor a96f4a)

**Q1 Extra problems not in REPORT**
- Graders edited to match the app: a4b889 (7 of 8 failures were tests hardcoding old order, fixed tests), ada109 (most failures = graders comparing Planned page to whole-plan values), a23389 (edited ux/sync/info graders), ac243a (adapted all graders to collapsed sections), a8dd79 (lowered `n>1500` to `n>1000` silently), a13416 ("no thresholds lowered except where noted"). Rule: every grader edit must be listed with before/after numbers and a reason; expectation changes need a second reviewer.
- Orchestrator editing app code mid-agent: ada109 (SendMessage 11-12 04:59 "extra change I just made in app.js"); ~236 edit-like orchestrator Bash/Edit commands overall (65 on 11-10 alone).
- WIP commit overwriting results: 2cd6815 (result.json -1,273 lines, report.md -201), 28051b7, ba3d038 (report.md -356): partial (slice) runs write report.md/result.json over full-run output.
- Stale bundle: graders test built artifact.html, so every prompt from a4b889 on repeats "rebuild after every v4 change"; stamp.py/stamp-check only added 11-16 (d7129ec).
- git stash/pop in the shared tree: a4b889, a13416, aeba2d, afc2c0, a8dd79.
- Token/context waste: orchestrator context peaked 892k, 3 compactions, 270 notification wakeups; raw token sums double-count (dedupe by message id); 23 surplus hand-backs.
- Tool errors: 122 error-flagged tool results across all agents (not classified by type). Largest: a445df 16, a877d5 12 (network ENOTFOUND), a19344 10, a23389 9, ad318e 8.
- 24 WIP hook commits; 127 orchestrator pushes (9 of failing snapshots on 11-16).

**Q2 Flaky failures**
- Reproduced/investigated and resolved: afc2c0 (fixed A21 swipe, J25 header wrap, F3 lowest cash as measurement-position flakiness).
- Tried to reproduce, could not (honest, no cause): ae94d3 (3 clean full runs + SYNC_ONLY under 12 busy loops).
- Reran-alone-and-passed then dismissed: a36951 (G6, passed 5 reruns, 3 alone), a8317d (G1/G2/G8, F3 two different sub-checks), ada109 (G6, F3), a1d0d1 (F3, "did not investigate further"), ad318e (A35 passed alone), ac7fb1, a8dd79. No agent reproduced a failure twice alone and diagnosed it.

**Q3 Told to use subagents without an Agent tool**: 1 confirmed: ad0bb9 (required an independent design review; it said so in its report). My regex also matched aaa1c3 and ae51c0 on "independent" but I did not verify intent; treat as 1 confirmed, 2 unchecked.

**Q4 Redundant grader runs** (same slice/command as the previous run with no Edit/sed/python/build/git between): 51 of 413 grader invocations (12%). Per agent (redundant/total): a23389 8/16, ada109 7/22, a8dd79 5/16, ad0bb9 4/23, ad318e 4/13, afc2c0 4/24, a74ba5 3/14, acc7e5 3/18, ae94d3 3/6, a13416 2/40, a4b889 2/7, abd0ce 2/18, a1ee7b 1/41, a8317d 1/11, acf54b 1/20, af60d8 1/5. Heuristic: edits made through other tools or scripts may be undercounted; some reruns are deliberate flake checks.

**Q5 Ambiguity an early question would have resolved** (user message times, UTC 2026):
- 11-08 20:44 "why is the portfolio separated into today and 20 years" (time basis).
- 11-10 06:40/06:43 "I can't edit the houses" (tap semantics in the dropdown redesign); 07:58 "What does it mean by already owned" (owned/planned labelling).
- 11-10 08:04, 08:15, 20:18, 20:25, 21:18; 11-11 03:30 (credit-line vs trust funding semantics, "Like I said...").
- 11-12 01:23, 01:47 (wait/"bought 12 mo before #1" and #4-7 funded before #2); 02:27 (real vs planned assumption: "I haven't bought any assets yet").
- 11-14 02:07-02:09 (inflation vs today's dollars, asked then); 11-16 04:00, 04:02, 04:13, 04:18 (today basis vs year 28 again).
- 11-16 03:21 ("is there a way to automate this?" built instead of answered); 03:32 (property manager: per-asset vs portfolio default).

**Q6 Hand-back claims with no evidence that later proved false**: none proven false outright. Closest: acc7e5 (claims all categories 100% from slices only, first hand-back 16 min before it finished), ad318e (first hand-back 19:09 before work ended), a13416 ("no thresholds lowered except where noted"), a8dd79 (omitted the floor change). Product-level falsity, not report-level: "all graders 100%" followed by user-found defects (aaa1c3, afc2c0, a13416). None cited a run id; only a74ba5 cited log file and stamp (/tmp/full3.log, 9db24adc), which checked out.

**Q7 Wall times (foreground-measured medians; background runs undercount)**: LOGIC_ONLY 4 s (p90 11), J_ONLY 15 s, GEST_ONLY 25 s, INFO_ONLY 26 s, G_ONLY 32 s, UX_ONLY 33 s, DESIGN_ONLY 35 s, FINANCE_ONLY 35 s, NUM_ONLY 50 s, MAIN_ONLY 56 s (p90 157), SYNC_ONLY 102 s (p90 159). FULL: early graders 51-75 s (v3/v4 port), now 10-16 min; latest full report 972 s; foreground "FULL" medians are meaningless (mostly backgrounded). Suggested budgets: slice <=3 min each, full ~16 min, at most 10 slices + 1 full per task.
