#!/usr/bin/env bash
# Shared helpers for agents/tools/*. Source it; do not run it.
# Resolves the MAIN worktree (so claims, ledger and grader lock are shared even from a git worktree).
set -u
TOOLS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -n "${AGENTS_HOME:-}" ]; then            # test / override mode
  AGENTS="$AGENTS_HOME"; ROOT="${REPO_ROOT:-$(cd "$AGENTS/.." && pwd)}"
else
  ROOT="${REPO_ROOT:-$(git -C "$TOOLS_DIR" rev-parse --show-toplevel)}"          # this worktree
  COMMON="$(git -C "$ROOT" rev-parse --git-common-dir)"; case "$COMMON" in /*) ;; *) COMMON="$ROOT/$COMMON";; esac
  MAIN="$(cd "$COMMON/.." && pwd)"                                                # main worktree
  AGENTS="$MAIN/prototype/agents"
fi
PROTO="$ROOT/prototype"
LOCKS="$AGENTS/locks"; LEDGER_DIR="$AGENTS/ledger"; LEDGER="$LEDGER_DIR/grader-runs.jsonl"; HB="$AGENTS/handbacks"
mkdir -p "$LOCKS" "$LEDGER_DIR" "$HB" 2>/dev/null
now() { date +%s; }
iso() { date -u +%Y-%m-%dT%H:%M:%SZ; }
die() { echo "ERROR: $*" >&2; exit "${2:-2}"; }
# jq-free JSON line writer: jw key=value ... (all string values; keys prefixed n: are numbers)
jw() { python3 -I -c '
import json,sys
d={}
for a in sys.argv[1:]:
    k,_,v=a.partition("=")
    if k.startswith("n:"): 
        try: d[k[2:]]=float(v) if "." in v else int(v)
        except: d[k[2:]]=None
    elif k.startswith("l:"): d[k[2:]]=[x for x in v.split(",") if x]
    else: d[k]=v
print(json.dumps(d,separators=(",",":")))' "$@"; }
# area-overlap test on path patterns (prefix up to first glob char)
_norm() { local p="${1%%[*?[]*}"; echo "$p"; }
overlaps() { local a b; a="$(_norm "$1")"; b="$(_norm "$2")"; case "$a" in "$b"*) return 0;; esac; case "$b" in "$a"*) return 0;; esac; return 1; }
lockval() { sed -n "s/^$2=//p" "$1" | head -1; }
# v4 source hash: what the grader actually tests
v4_hash() { ( cd "$PROTO/v4" 2>/dev/null && cat app.js engine.js info.js style.css sw.js index.html 2>/dev/null | sha1sum | cut -c1-12 ) || echo none; }
