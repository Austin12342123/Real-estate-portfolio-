# TEMPLATE: implementer (feature work; WRITES files)
<COMMON HEADER>
TYPE: implementer. Phases: PLAYBOOK 0-7.
Extra required fields:
- Feature spec in 5 lines + the 3 most likely misreadings and the intended reading (orchestrator fills; agent confirms in its plan).
- "Primary flows" smoke list to re-check by hand/with the flow-smoke slice before hand-back (tap-to-edit, add asset, remove asset renumbers, migration preserves user data, reload keeps state).
- Data-safety rule: never replace a user's portfolio in a migration; new assets via ADDITIONS + DATA_V (CLAUDE.md).
- Plain-language check: every new label/description read aloud as the user would; no jargon unexplained (escaped defect E3/E14).
- Do not add features beyond the goal. If you think one is needed, list it under Questions.
- Plan first (<=15 lines) written to agents/plans/<owner>.md; start coding only after claim acquired.
- After last edit: build+stamp (v4 owner), 1 slice per touched area, then ONE full run via run-grader.sh; stop.
