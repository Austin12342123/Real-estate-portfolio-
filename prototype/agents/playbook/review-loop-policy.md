# Review-loop policy (avoid numeric-bar chasing)
Evidence: 11-12 loop = 8 agents, 178 min, ~$19.8; bar and prior scores in reviewer prompts (a1d83e anchoring); behaviour reversed 3 times; round-9 reviewer scored 90 while tap-to-edit was broken (E1).
1. Reviewers never receive: a pass bar, previous scores, the implementer's claims, or "make it 90". They receive the user's goal in the user's words, the scope, and the method.
2. Reviewers must interact (tap, edit, add/remove, reload, 3 viewports, light/dark); a review based only on screenshots is rejected by the orchestrator.
3. Output is a defect list with severity (blocker/major/minor/cosmetic), repro steps, evidence path; scores are optional, free-form, and used only for trend.
4. Fix rule: fix blockers and majors with repro steps. Minors/cosmetics go to a backlog list unless the user asked for polish.
5. Round limit: max 2 review rounds per feature (review -> fix -> re-review). After round 2, the orchestrator decides: ship with the open list shown to the user, or ask the user. No round 3 without the user.
6. Independence: the re-reviewer is a fresh agent but sees only the defect list (to verify fixes by reproduction), not the first review's scores.
7. Reversals: if a fix reverses an earlier decision (e.g. calculator debounce -> removal), stop and ask the user which behaviour they want.
8. Stop conditions: no blocker/major open; or round limit; or the same defect reappears twice (then it is a design question for the user).
9. Reviewer budget: 10 min, 1 hand-back. Implementer fix budget: 30 min per round.
