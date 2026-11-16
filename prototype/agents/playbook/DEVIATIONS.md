# Deviation protocol: when an agent thinks the plan is not optimal
The PLAYBOOK is the default for every agent. Deviating is allowed only through this protocol; silent deviation is an integrity violation (integrity.md).
Monitor = the agent that delegated the task (normally the orchestrator). A monitor that is itself deviating reports to the user.

1. STOP before acting. Decide it is really better and reversible. If the deviation touches user data, money/time-basis meaning, permissions, network, git history, or kills processes: do NOT deviate; ask the user via the monitor.
2. OPEN: `tools/deviate.sh open --owner ME --monitor M --rule "<rule id/text>" --why "<evidence it is better>" --plan "<exact alternative steps>" --risk "<what could go wrong>" --return "<the step where you rejoin the plan>"`, then SendMessage the monitor the same text. Smallest possible deviation; one rule at a time.
3. WAIT for the monitor's `ack` (it may refuse or add conditions: smaller scope, extra check, a worktree, a snapshot to restore). No ack = no deviation; carry on with the plan or hand back BLOCKED.
4. EXECUTE carefully: keep the claim, keep logging, keep every other rule (integrity, ledger ids, changed thresholds old->new). Do the minimum, then tell the monitor the result.
5. VERIFY together: the monitor checks the deviant action (diff, ledger run, side effects on other files) and logs `verify`, or orders a rollback.
6. RETURN: the agent rejoins the plan at the stated step; the monitor logs `close` with evidence (e.g. the next ledger run id). A deviation not closed blocks the hand-back (handback.sh refuses) and shows in `tools/deviate.sh status`.
7. HAND-BACK lists each deviation: rule, why, ack, verify, close. The monitor repeats it to the user. If the deviation proves better, the monitor proposes the PLAYBOOK change to the user (never edits the plan on its own authority).
Monitor duties: answer within one turn; refuse by default when unsure; never approve a deviation that lowers a check, skips the full-run requirement, or kills/stashes shared state.
