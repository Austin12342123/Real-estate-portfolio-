#!/usr/bin/env bash
# git-worktree isolation for parallel IMPLEMENTERS (reviewers/researchers are read-only and need none).
# Usage: worktree.sh add <owner> [base-ref]   -> ../.wt/<owner> on branch agent/<owner>   (prints path; agent works ONLY there)
#        worktree.sh status                    -> list agent worktrees + dirty counts
#        worktree.sh merge <owner> [--into BRANCH]  -> in the main tree: merge agent/<owner> (no-ff); stops on conflict; orchestrator only
#        worktree.sh remove <owner>            -> remove worktree (refuses if dirty) and branch (if merged)
#   --self-test
# WHEN to use (see PLAYBOOK 1.4): two or more agents that will EDIT overlapping or interdependent files in the same window
# (e.g. v4/app.js, grader/grade.js); or any agent that must run a ~16 min full grader while another edits.
# Otherwise serialise implementers and use claims. A worktree needs its own bundle build + stamp; the grader lock/claims/ledger stay SHARED (main tree).
. "$(dirname "$0")/lib.sh"
if [ "${1:-}" = "--self-test" ]; then T="$(mktemp -d)"; git init -q -b dev "$T/m"; cd "$T/m"; git config user.email a@b; git config user.name t; mkdir -p prototype/agents/tools; cp "$TOOLS_DIR"/*.sh prototype/agents/tools/; echo 1>f; git add -A; git commit -qm i
  W=prototype/agents/tools/worktree.sh; fail=0
  p="$(bash $W add alpha | tail -1)"; [ -d "$p" ] && echo "ok   worktree created $p" || { echo FAIL add; fail=1; }
  ( cd "$p" && echo 2 > f && git add f && git commit -qm "alpha change" ); bash $W status | grep -q alpha && echo "ok   status lists alpha" || { echo FAIL status; fail=1; }
  bash $W remove alpha >/dev/null 2>&1 && { echo "FAIL removed unmerged"; fail=1; } || echo "ok   remove refuses unmerged branch"
  bash $W merge alpha >/dev/null 2>&1 && [ "$(cat f)" = 2 ] && echo "ok   merge into dev" || { echo FAIL merge; fail=1; }
  bash $W remove alpha >/dev/null 2>&1 && [ ! -d "$p" ] && echo "ok   removed" || { echo FAIL remove; fail=1; }
  cd /; rm -rf "$T"; [ $fail = 0 ] && echo "worktree.sh self-test PASS" || { echo "worktree.sh self-test FAIL"; exit 1; }; exit 0; fi
MAINR="$(dirname "$(dirname "$AGENTS")")"; WT="$(dirname "$MAINR")/.wt"
case "${1:-}" in
 add) o="${2:?owner}"; base="${3:-HEAD}"; mkdir -p "$WT"; git -C "$MAINR" worktree add -q -b "agent/$o" "$WT/$o" "$base" || exit 1; echo "$WT/$o";;
 status) git -C "$MAINR" worktree list | grep '/\.wt/' | while read -r p rest; do echo "$p $rest dirty=$(git -C "$p" status --porcelain | wc -l)"; done;;
 merge) o="${2:?owner}"; into=""; [ "${3:-}" = "--into" ] && into="$4"; cd "$MAINR"; [ -n "$into" ] && git checkout -q "$into"
   [ -z "$(git status --porcelain --untracked-files=no)" ] || die "main tree has uncommitted tracked changes; commit/claim them first" 1
   git merge --no-ff -m "merge agent/$o" "agent/$o" || { echo "CONFLICT: resolve by hand (orchestrator), then re-run the full grader once"; exit 1; };;
 remove) o="${2:?owner}"; git -C "$MAINR" merge-base --is-ancestor "agent/$o" HEAD || { echo "REFUSED: agent/$o is not merged into the main tree HEAD"; exit 1; }; git -C "$MAINR" worktree remove "$WT/$o" || exit 1; git -C "$MAINR" branch -d "agent/$o" || exit 1; echo removed;;
 *) sed -n 2,9p "$0"; exit 2;;
esac
