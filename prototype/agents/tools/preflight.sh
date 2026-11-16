#!/usr/bin/env bash
# Phase-1 preflight. Read-only. Usage: preflight.sh --owner ID [--needs "prototype/v4/*"] ; --self-test
# Prints: branch/ahead-behind, dirty files grouped by claim owner, running graders, live claims, stamp check, bundle freshness, last ledger runs.
# Exit 0 = go; 3 = BLOCKERS (printed). Blockers: grader running, a live foreign claim overlapping --needs, stale stamps (only if you do not yet own v4), unknown dirty files in your needs area.
. "$(dirname "$0")/lib.sh"
[ "${1:-}" = "--self-test" ] && { T="$(mktemp -d)"; export AGENTS_HOME="$T/agents" REPO_ROOT="$T" NO_PROC_CHECK=1; mkdir -p "$T/agents" "$T/prototype/v4"; git -C "$T" init -q; echo x>"$T/prototype/v4/app.js"
  bash "$0" --owner X --needs "prototype/v4/*" --no-stamp; r=$?; bash "$TOOLS_DIR/claim.sh" acquire v4 --owner Y --files "prototype/v4/*" >/dev/null; bash "$0" --owner X --needs "prototype/v4/*" --no-stamp >/dev/null; r2=$?; rm -rf "$T"
  [ $r = 0 ] && [ $r2 = 3 ] && echo "preflight.sh self-test PASS (clean=0, foreign claim=3)" || { echo "preflight.sh self-test FAIL ($r,$r2)"; exit 1; }; exit 0; }
owner=""; needs=""; nostamp=0
while [ $# -gt 0 ]; do case "$1" in --owner) owner="$2"; shift 2;; --needs) needs="$2"; shift 2;; --no-stamp) nostamp=1; shift;; *) die "unknown arg $1";; esac; done
[ -n "$owner" ] || die "--owner required"; B=0; blk() { echo "  BLOCKER: $*"; B=1; }
echo "== PREFLIGHT $(iso) owner=$owner =="
echo "-- git"; echo "  root=$ROOT branch=$(git -C "$ROOT" branch --show-current 2>/dev/null) head=$(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null)"
up="$(git -C "$ROOT" rev-list --left-right --count '@{u}...HEAD' 2>/dev/null)"; [ -n "$up" ] && echo "  behind/ahead upstream: $up"
dn="$(git -C "$ROOT" status --porcelain 2>/dev/null | wc -l)"; echo "  dirty files: $dn"; git -C "$ROOT" status --porcelain 2>/dev/null | head -15 | sed 's/^/    /'
[ "$dn" -gt 0 ] && echo "  NOTE: record this list; anything dirty BEFORE you start is not yours (do not stage, stash, or revert it)."
echo "-- graders"; gp=""; [ -z "${NO_PROC_CHECK:-}" ] && gp="$(pgrep -af '^(timeout [0-9]+ )?node( [^ ]+)* [^ ]*grade\.js' 2>/dev/null | head -3)"; [ -n "$gp" ] && { echo "$gp" | sed 's/^/  /'; blk "a grader/browser process is running (do not kill it; read its log or wait)"; } || echo "  none running"
[ -f "$LOCKS/grader.holder" ] && { echo "  holder: $(cat "$LOCKS/grader.holder")"; blk "grader lock held"; }
echo "-- claims"; bash "$TOOLS_DIR/claim.sh" list | sed 's/^/  /'
if [ -n "$needs" ]; then IFS=, read -ra N <<<"$needs"; for p in "${N[@]}"; do r="$(bash "$TOOLS_DIR/claim.sh" check-path "$p" --owner "$owner")" || blk "$p $r"; done; fi
echo "-- stamp / bundle"
if [ $nostamp = 0 ] && [ -f "$PROTO/v4/stamp.py" ]; then ( cd "$PROTO/v4" && python3 stamp.py --check ) 2>&1 | sed 's/^/  /' || echo "  (stamps stale: the v4 owner must run python3 stamp.py before any grader)"; fi
if [ -f "$PROTO/v4/artifact.html" ]; then newest="$(cd "$PROTO/v4" && ls -t app.js engine.js info.js style.css index.html 2>/dev/null | head -1)"; [ "$PROTO/v4/$newest" -nt "$PROTO/v4/artifact.html" ] && echo "  bundle STALE: $newest is newer than artifact.html (rebuild: cd prototype/v4 && python3 build-artifact.py, by the v4 owner)" || echo "  bundle fresh vs sources (mtime)"; fi
echo "-- last grader runs"; [ -f "$LEDGER" ] && jq -c 'select(.event=="end")|{run,owner,slice,verdict,failing,tree}' "$LEDGER" | tail -4 | sed 's/^/  /' || echo "  ledger empty"
echo "-- budget reminder: <=10 slice runs + 1 full run (2 max); use tools/run-grader.sh only"
[ $B = 0 ] && { echo "PREFLIGHT: GO"; exit 0; } || { echo "PREFLIGHT: BLOCKED (see BLOCKER lines). Wait/queue/ask orchestrator; do not work around."; exit 3; }
