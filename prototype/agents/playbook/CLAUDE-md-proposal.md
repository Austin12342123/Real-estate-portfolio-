# Proposed edits to /home/user/Real-estate-portfolio-/CLAUDE.md (NOT applied; the user/orchestrator decides)
Keep the two existing standing rules unchanged. Append this section (about 25 lines; CLAUDE.md is loaded into every agent, so keep it short and point to the playbook):

```
# Agent workflow (mandatory for every task and every agent)

Follow prototype/agents/PLAYBOOK.md (quick card first). Tools: prototype/agents/tools/ (run `tools/selftest-all.sh` if unsure they work).
- Claim files before editing (tools/claim.sh); one writer per area; parallel implementers only in separate git worktrees (tools/worktree.sh).
- Run graders only with tools/run-grader.sh (single-flight, ledger). Never run `node grade.js` directly; never pkill/kill, never git stash/reset shared files.
- Budget per task: at most 10 slice runs and 1 full run (2 hard max). A failing check is never "known flaky": rerun it alone twice, log the run ids, diagnose; never lower a threshold or edit an assertion without listing before -> after and getting orchestrator sign-off.
- "All green" is claimed only with a ledger run id of a clean FULL run on the final tree; edits after it are UNVERIFIED TAIL.
- Questions ("is there a way to...?") get an answer and a short plan, not a build. Ask early (2-4 options + default) when money/time-basis/order semantics, labels, or user data are involved (PLAYBOOK 2.3). Requirements the user already stated are in prototype/agents/playbook/requirements-ledger.md.
- Every user-reported bug: failing regression check first, then a row in prototype/agents/playbook/escaped-defects.md, then the fix.
- Hand back exactly once (template prototype/agents/playbook/templates/handback.md, lint with tools/handback.sh), only after your background jobs finished. Commit/push only via tools/commit-owned.sh when delegated; no WIP commits; never push main without a clean full ledger run.
```
Optional (user decision): add "Orchestrator: read prototype/agents/playbook/ORCHESTRATOR.md at session start and after each compaction."
