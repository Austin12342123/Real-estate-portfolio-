# User decisions on the playbook (2026-11-16)
1. Commit hook: the user chose "only commit when no agent is working". STATUS: the hook is configured outside this repository (not found in repo or user settings files visible to the session), so it could NOT be changed from here. Until the user changes it in their Claude Code settings, the orchestrator satisfies it by committing WIP snapshots to the dev branch only (never main), and agents use tools/commit-owned.sh for their own commits.
2. Parallel work: the user chose "parallel in separate copies" (git worktrees via tools/worktree.sh). The orchestrator merges, then runs ONE full grader run on the merged tree before pushing main.
3. Questions: the user chose "rarely, just proceed": agents state assumptions in the report; ask only for data loss / silent money-or-time-basis changes / irreversible actions. (This overrides the playbook's earlier 'ask early' default.)
4. Adoption: yes. CLAUDE.md now carries the agent-workflow section.

- 2026-11-19 (user): ACCEPTED the loosened sync-grade basis-label check (/portfolio row/) after the asset-note text was cut at the user's request.

- 2026-11-25 (user): MERGE the module-split lineage to main ("Merge the new version"). Done: main = ac12b16 (full run 20261123T055744-18571 clean), Artifact v54.
- 2026-11-25 (user): STANDING RULE: publish every resolved card to the live app right away, one by one (see AUTOPUSH.md). Server sync, hosting changes and paid services still need his yes.
