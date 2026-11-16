#!/usr/bin/env bash
# Process control on YOUR OWN processes only. Never use kill/pkill/killall directly (a74ba5 killed siblings' graders).
# Usage: safe-kill.sh --owner ID --pid N     kills N only if it is a descendant of the calling shell ($PPID tree) or registered by run-grader.sh for this owner.
#        safe-kill.sh --self-test
. "$(dirname "$0")/lib.sh"
desc() { local p="$1" c; for c in $(pgrep -P "$p" 2>/dev/null); do echo "$c"; desc "$c"; done; }
if [ "${1:-}" = "--self-test" ]; then sleep 60 & mine=$!; ( sleep 60 ) & other_sub=$!; foreign=$(bash -c "nohup sleep 60 >/dev/null 2>&1 & echo \$!"); sleep 0.3
  bash "$0" --owner T --pid $foreign --root $$ >/dev/null 2>&1; r1=$?; kill -0 $foreign 2>/dev/null && alive=1 || alive=0
  bash "$0" --owner T --pid $mine --root $$ >/dev/null 2>&1; r2=$?; sleep 0.2; kill -0 $mine 2>/dev/null && m=1 || m=0; kill $other_sub 2>/dev/null; kill $foreign 2>/dev/null
  [ $r1 = 1 ] && [ $alive = 1 ] && [ $r2 = 0 ] && [ $m = 0 ] && echo "safe-kill.sh self-test PASS (refused a foreign pid, killed own child)" || echo "safe-kill.sh self-test FAIL ($r1,$alive,$r2,$m)"; kill $foreign 2>/dev/null; exit 0; fi
owner="" pid="" root="$PPID"; while [ $# -gt 0 ]; do case "$1" in --owner) owner="$2"; shift 2;; --pid) pid="$2"; shift 2;; --root) root="$2"; shift 2;; *) die "unknown arg $1";; esac; done
[ -n "$owner" ] && [ -n "$pid" ] || die "--owner and --pid required"
if { desc "$root"; cat "$LOCKS/pids/$owner."* 2>/dev/null; } | grep -qx "$pid"; then kill "$pid" && echo "killed own pid $pid"; else echo "REFUSED: pid $pid is not your process (not a descendant of your shell and not registered for $owner). Do not kill it; wait for it or ask the orchestrator." >&2; exit 1; fi
