# COMMON HEADER (orchestrator pastes this at the top of EVERY delegation prompt; fill the <> fields)

You work under the agents playbook: /home/user/Real-estate-portfolio-/prototype/agents/PLAYBOOK.md (read its quick card first, ~1 page; follow it exactly).
- GOAL (the user's words, verbatim): "<quote>"
- ACCEPTANCE (testable, with one worked example per rule; include "primary flows still work": tap row -> edit -> back, remove asset -> renumber, migration keeps user data): <list>
- REQUIREMENTS LEDGER (rules the user already stated; do not re-decide them): <paste rows from playbook/requirements-ledger.md that apply>
- OWNER ID: <agentid>   TASK ID: <task>   FILES YOU OWN (claim them): <paths>   FILES YOU MUST NOT TOUCH: <paths>
- SIBLINGS RUNNING NOW: <ids + what/files each owns | none>. Never edit their files; never run anything that disturbs them.
- TOOLS: run graders ONLY with tools/run-grader.sh (single-flight; never pkill/kill, never `node grade.js` directly). Claims with tools/claim.sh. Preflight/postflight scripts are mandatory.
- RUN BUDGET: max <10> slice runs + <1> full run (2 hard max), wall cap <N> min of grader time, total wall <N> min. A full run takes ~16 min; slices 4-100 s. When a budget is used up: STOP, list what is unverified, hand back.
- WHEN BLOCKED (network, permission, claim conflict, grader busy, ambiguity): follow PLAYBOOK tables D1-D4; never work around; if still blocked after 1 retry, hand back BLOCKED with the exact error.
- FLAKY RULE: a failing check is never "known flaky". Re-run it ALONE twice (ledger ids), log both, diagnose with `tools/audit-now.sh` overlap data / process list. Never lower a threshold or edit an assertion to make it pass without listing before->after in the hand-back and getting orchestrator sign-off.
- INTERPRETATION RULE: if the request matches an ambiguity trigger (PLAYBOOK 2.3), do not build; hand back QUESTION with 2-4 concrete options and your default, unless the orchestrator already answered.
- NO commit / push / stash / reset / checkout of files you don't own. Do not kill processes you did not start.
- HAND-BACK: exactly ONE final message using playbook/templates/handback.md, only after every job you started has finished; run tools/handback.sh --final first. Cite ledger run ids for every verification claim.
- INTEGRITY (binding, playbook/integrity.md): (1) list every changed numeric assertion/threshold/floor/tolerance/removed check as `file:line old -> new why` in "Grader edits"; never weaken a check to pass; (2) "green" only with a ledger run id on a tree that did not change afterwards, else say UNVERIFIED TAIL; state what was NOT verified plainly; (3) kill only your own PIDs (tools/safe-kill.sh), no kill/pkill/killall, no git stash/reset/checkout of others' files, no hidden work; (4) no changes to cloud/network/credentials/permission settings/git history/CLAUDE.md without the user's explicit approval: hand back BLOCKED instead; (5) report failures, tool errors, unknowns and your own mistakes even if embarrassing; (6) label estimates and unverifiable sources; never invent evidence. `tools/postflight.sh` runs the automated integrity check; disclose every finding.
