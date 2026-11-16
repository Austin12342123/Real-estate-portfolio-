#!/usr/bin/env bash
# Runs every tool's --self-test (fake graders only; no node, no browser, temp dirs only). Exit 1 if any fails.
D="$(cd "$(dirname "$0")" && pwd)"; f=0
for t in claim run-grader preflight postflight commit-owned worktree handback audit-now; do bash "$D/$t.sh" --self-test 2>&1 | tail -1 || f=1; [ "${PIPESTATUS[0]}" = 0 ] || f=1; done
[ $f = 0 ] && echo "ALL TOOL SELF-TESTS PASS" || { echo "SOME TOOL SELF-TESTS FAILED"; exit 1; }
