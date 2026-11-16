#!/usr/bin/env bash
# Replacement body for the Claude Code "Stop" hook that demands commits.
# Behaviour: if any agent holds a live work-claim, or a grader is running, do NOTHING (exit 0, no output)
# so unfinished files are not swept into a snapshot. Otherwise, if the repo has uncommitted changes, print the
# usual request and exit 2 (blocks the stop and feeds the message back), exactly like the old hook.
# Install: in your Claude Code settings JSON, set the Stop hook command to:
#   bash /home/user/Real-estate-portfolio-/prototype/agents/tools/stop-hook-guard.sh
DIR="$(cd "$(dirname "$0")/../.." && cd .. && pwd)"   # repo root
cd "$DIR" 2>/dev/null || exit 0
CL="$(bash "$DIR/prototype/agents/tools/claim.sh" list 2>/dev/null)"
if [ -n "$CL" ] && [ "$CL" != "no claims" ]; then exit 0; fi
if pgrep -f "node .*grade.js" >/dev/null 2>&1; then exit 0; fi
if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
  echo "There are uncommitted changes in the repository. Please commit and push these changes to the remote branch." >&2
  exit 2
fi
exit 0
