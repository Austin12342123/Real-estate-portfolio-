# Standing rules

When asked to add a house/asset to the app: look the listing up online (price, beds/baths/sqft, year built, rent and Section 8 rent, property tax, insurance, HOA); ask the user for anything that cannot be found BEFORE adding it; add it to the PLANNED portfolio as the LAST asset (next number in the buy order) by default; write a listing-import JSON in prototype/listing-import/.

To add an asset to the app, append an entry to ADDITIONS in prototype/v4/engine.js (key + make) and bump DATA_V; NEVER replace users' portfolios in a migration; the entry is appended once to each device's own planned portfolio.

When the user pastes an in-app bug report: parse build stamps/invariants/events, reproduce it (Playwright against v4 with the described state), fix the root cause, add a regression check to the graders, run the full grader, push to main and publish the Artifact as usual.

# Agent workflow (mandatory for every task and every agent)

Follow prototype/agents/PLAYBOOK.md (quick card first). Tools: prototype/agents/tools/ (run `tools/selftest-all.sh` if unsure they work). The user's decisions are in prototype/agents/playbook/DECISIONS.md.
- Claim files before editing (tools/claim.sh); one writer per area. Parallel implementers are allowed ONLY in separate git worktrees (tools/worktree.sh), merged by the orchestrator, with the full grader run on the merged tree.
- Run graders only with tools/run-grader.sh (single-flight, ledger). Never run `node grade.js` directly; never pkill/kill, never git stash/reset shared files.
- Budget per task: at most 10 slice runs and 1 full run (2 hard max). A failing check is never "known flaky": rerun it alone twice, log the run ids, diagnose; never lower a threshold or edit an assertion without listing before -> after in the hand-back.
- "All green" is claimed only with a ledger run id of a clean FULL run on the final tree; edits after it are UNVERIFIED TAIL.
- Questions ("is there a way to...?") get an answer and a short plan, not a build. When a request is ambiguous, PROCEED with the most reasonable reading and state the assumption in the report. Ask the user only when a wrong guess could lose user data, change money or time-basis semantics silently, or cannot be undone. Requirements the user already stated are in prototype/agents/playbook/requirements-ledger.md.
- Every user-reported bug: failing regression check first, then a row in prototype/agents/playbook/escaped-defects.md, then the fix.
- INTEGRITY: list every changed threshold/assertion old -> new; never weaken a check to pass; kill only your own PIDs (tools/safe-kill.sh); no cloud/network/permission/git-history changes without the user's explicit approval; report failures and unknowns plainly (prototype/agents/playbook/integrity.md).
- Hand back exactly once (template prototype/agents/playbook/templates/handback.md, lint with tools/handback.sh), only after your background jobs finished. Commit/push only via tools/commit-owned.sh when delegated; no failing snapshots on main; never push main without a clean full ledger run on the exact tree.
- Deviation protocol: an agent may deviate from PLAYBOOK.md only through prototype/agents/playbook/DEVIATIONS.md (tools/deviate.sh: open, monitor ack, careful minimal action, monitor verify, return to the plan, monitor closes). Silent deviation is an integrity violation; the orchestrator is the monitor of every delegated agent and answers promptly.
- Orchestrator: read prototype/agents/playbook/ORCHESTRATOR.md at session start and after each compaction.
