# Orchestrator protocol (the main assistant that launches agents and talks to the user)
Audit grade C (72). This file fixes its listed weaknesses. Tools: agents/tools/*.sh.

## 1. Intake of a user message (never skip)
1. Classify: QUESTION ("can you/is there a way/should/why") | CHANGE | BUG REPORT | RESEARCH | META. A QUESTION gets an answer + 3-line scoped plan + go/no-go; build nothing (a74ba5, 11-16 03:21).
2. Check ambiguity triggers (PLAYBOOK 2.3). If any fires: ask now (AskUserQuestion, 2-4 concrete options + default). Cheap: 1 turn; expensive: 45 min wrong build.
3. BUG REPORT: append to playbook/escaped-defects.md (symptom, user words, time) before delegating; the fix task is a bug-fixer (regression check first).
4. Update playbook/requirements-ledger.md if the message states or corrects a rule (add worked example). Paste applicable rows into the prompt.
5. Reply to the user in <=5 lines: what you understood, what happens next, expected time, what is queued behind what.

## 2. Sequencing and concurrency
- One writer per area. Before launching, run `tools/claim.sh list` and `tools/preflight.sh --owner orchestrator`.
- Two implementers may run together only if their file sets are disjoint (claims) OR each gets its own `tools/worktree.sh add`. Reviewers/researchers/auditors are read-only and parallel.
- If a launch would queue work behind a long agent, tell the user the queue (P27).
- Prompt lint before every launch: header fields all filled (goal verbatim, acceptance with worked example + primary flows, ledger rows, owner/task id, files owned, SIBLINGS RUNNING listing every live agent symmetrically, run budget, blocked-handling, flaky rule, interpretation rule, hand-back rule, tools list actually available to that agent type). Do not require abilities the agent lacks (ad0bb9: subagent review without Agent tool).
- Never run a grader, a build or an edit in the tree while an agent holds the v4/grader claim. To see status read `agents/ledger/grader-runs.jsonl` and the agent's last output. Your own work uses claims and `run-grader.sh` like anyone.
- Tiny hotfixes by the orchestrator: allowed only when no implementer holds v4; take a claim, one slice, release (P19).

## 3. While agents run
- Do not poll. Subscribe via notifications; one status line per 15 min at most.
- Act only on a hand-back that (a) is marked FINAL (handbacks/<owner>.<task>.done exists) and (b) passes `tools/handback.sh --lint-only`. A hand-back arriving while the agent's background jobs live is premature: ignore it, note it, wait (acc7e5 sent 10, first 16 min early).
- Duplicate hand-back = process defect; record in metrics (followup_handbacks); do not re-run work because of it.
- Agent stuck (no tool use 12+ min, or budget exceeded): message once; then take the result as BLOCKED/UNVERIFIED rather than relaunching a twin.

## 4. Accepting a hand-back
Read only: Status, What changed, Evidence, NOT verified, Questions (the rest on demand). Verify cheaply: `tools/postflight.sh --owner ID` (stamp, bundle, ledger on this tree, grader edits). Check every "Grader edits" row; loosening needs your sign-off. Evidence missing -> either schedule ONE verification run yourself via run-grader.sh (when nobody holds claims) or tell the user it is unverified. Never relay "100%" without a ledger run id.

### 4b. Integrity verification before relaying (I10)
Before telling the user anything is done/green/live: `tools/postflight.sh --owner ID --report <handback>` (runs integrity-check.sh A/B/C). Read every FINDING: undisclosed constant changes, kill/pkill/stash/env/settings commands, claims that cite no run or a red/old-tree run. Undisclosed finding = reject the hand-back, tell the user what happened, do not relay the claim. Also verify your own conduct: no cloud/network/permission/environment change without the user's explicit approval (ask first, one question, with the exact change); no relaying of unverified claims; state "not verified" items to the user every time.

## 5. Shipping checklist (merge to main / publish / tell the user "live")
[ ] integrity-check on every contributing agent has no undisclosed findings
[ ] working tree clean of foreign changes; all claims released
[ ] `tools/postflight.sh` exit 0: latest FULL ledger run clean on this exact v4 tree hash
[ ] artifact.html stamp == sources stamp (rebuild by the v4 owner if not)
[ ] primary-flow smoke (tap-to-edit, add/remove renumber, migration keeps data, reload) passed or listed as unverified
[ ] data-safety: ADDITIONS + DATA_V rule honoured; no migration replaces user data
[ ] escaped-defects.md entries for every bug being fixed have a regression check id
[ ] commit via `tools/commit-owned.sh` (no WIP, trailers); push dev branch; main only with `--to-main` (tool enforces the ledger)
[ ] publish artifact; phone path: stamped SW cache name changed; give the user the exact refresh step (E16)
[ ] message: what changed (3 lines), what was NOT verified, what you need from the user
Never push snapshots of failing work (9 on 11-16). Never say "done and live" without opening/reading back the published version stamp.

## 6. User communication
Short, plain, honest. Lead with the answer. No overclaiming ("verified" only with a run id). State unverified items every time. Never silent on rate limits: if work pauses, say why and what resumes. Ask max 3 questions per message, each with options. Never relay agent prose verbatim (8-11k chars); 10-line summary + path.

## 7. Budgets and context
- Per task defaults: <=10 slice runs, 1 full run (2 hard), grader wall <=45 min, agent wall <=60 min (implementer), 30 min (debugger), 10 min (reviewer), 5 min (researcher probe). Above: stop and report.
- Keep agents/state/ORCH-STATE.md (open tasks, owners, claims, queue, decisions, user rules). Update after every launch/hand-back. Compact proactively near 300k tokens (the audit shows 892k peaks cost ~$20 in cache reads); after compaction re-read ORCH-STATE.md, PLAYBOOK quick card and ledger tail.
- Prefer fewer, larger, well-specified agents over chains of tiny fix agents; max 2 review rounds per feature.
- Run `tools/audit-now.sh --label <date>` weekly or after every 10 agents; compare with baseline; act on flags.

## 8. Escaped-defect loop (orchestrator side)
User bug -> escaped-defects.md row (before any fix) -> bug-fixer with regression check -> row completed (root cause, gate that should have caught it, check id) -> if a pattern repeats twice, add a canary/ledger rule.
