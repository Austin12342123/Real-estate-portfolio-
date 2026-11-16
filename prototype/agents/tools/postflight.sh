#!/usr/bin/env bash
# Phase-6 postflight. Usage: postflight.sh --owner ID [--task TASK] [--build] [--emit handback-skeleton.md]; --self-test
#   --report FILE  also check the drafted hand-back against the ledger (integrity-check.sh C); --history-file FILE for the conduct scan.
#   --build   (only if you hold the v4 claim) run `python3 build-artifact.py` (restamps + rebuilds bundle) first.
# Checks and prints: stamp ok, artifact.html carries the same stamp as the sources, grader ledger state for THIS tree
# (latest FULL run: verdict, failing, tree hash == current tree?), your runs & budget use, diff summary of files you own,
# the honest-claims checklist. Exit 0 = shippable evidence present; 4 = evidence missing (hand back as UNVERIFIED, not as done).
. "$(dirname "$0")/lib.sh"
if [ "${1:-}" = "--self-test" ]; then T="$(mktemp -d)"; export AGENTS_HOME="$T/agents" REPO_ROOT="$T"; mkdir -p "$T/agents/ledger" "$T/prototype/v4"; git -C "$T" init -q; echo x>"$T/prototype/v4/app.js"
  bash "$0" --owner X --no-v4 >/dev/null; r1=$?
  h="$(cd "$T/prototype/v4" && cat app.js engine.js info.js style.css sw.js index.html 2>/dev/null | sha1sum | cut -c1-12)"
  echo '{"event":"end","run":"R1","owner":"X","task":"default","slice":"full","kind":"full","verdict":"clean","failing":[],"tree_end":"'$h'","secs":900}' > "$T/agents/ledger/grader-runs.jsonl"
  bash "$0" --owner X --no-v4 --emit "$T/hb.md" >/dev/null; r2=$?; grep -q R1 "$T/hb.md" && sk=1 || sk=0; rm -rf "$T"
  [ $r1 = 4 ] && [ $r2 = 0 ] && [ $sk = 1 ] && echo "postflight.sh self-test PASS (no full run=4, clean full=0, skeleton cites run id)" || { echo "postflight.sh self-test FAIL ($r1,$r2,$sk)"; exit 1; }; exit 0; fi
owner=""; task="${TASK_ID:-default}"; build=0; emit=""; nov4=0; rep=""
while [ $# -gt 0 ]; do case "$1" in --owner) owner="$2"; shift 2;; --task) task="$2"; shift 2;; --build) build=1; shift;; --emit) emit="$2"; shift 2;; --no-v4) nov4=1; shift;; --report) rep="$2"; shift 2;; --history-file) hf="$2"; shift 2;; *) die "unknown arg $1";; esac; done
[ -n "$owner" ] || die "--owner required"; E=0; bad() { echo "  MISSING: $*"; E=1; }
echo "== POSTFLIGHT $(iso) owner=$owner task=$task =="
if [ $build = 1 ] && [ $nov4 = 0 ]; then bash "$TOOLS_DIR/claim.sh" check-path prototype/v4/app.js --owner "$owner" >/dev/null || die "you do not own v4; cannot build" 1; ( cd "$PROTO/v4" && python3 build-artifact.py ) | tail -2; fi
if [ $nov4 = 0 ] && [ -f "$PROTO/v4/stamp.py" ]; then
  echo "-- stamp/bundle"; ( cd "$PROTO/v4" && python3 stamp.py --check ) || bad "sources carry stale stamp: run python3 stamp.py / build-artifact.py (v4 owner)"
  want="$(cd "$PROTO/v4" && python3 stamp.py --check 2>/dev/null | awk '{print $2}')"
  if [ -f "$PROTO/v4/artifact.html" ]; then grep -q "engine:'$want'" "$PROTO/v4/artifact.html" && echo "  artifact.html carries stamp $want" || bad "artifact.html does NOT carry stamp $want (stale bundle: rebuild)"; fi
fi
echo "-- grader ledger (this tree hash: $(v4_hash))"
lastfull=""; [ -f "$LEDGER" ] && lastfull="$(jq -c 'select(.event=="end" and .kind=="full")' "$LEDGER" | tail -1)"
if [ -z "$lastfull" ]; then bad "no FULL grader run in the ledger: you may not claim 'all green'. Hand back as UNVERIFIED TAIL."; else
  echo "  latest full: $lastfull" | cut -c1-300; v="$(echo "$lastfull" | jq -r .verdict)"; th="$(echo "$lastfull" | jq -r .tree_end)"
  [ "$v" = clean ] || bad "latest full run verdict=$v failing=$(echo "$lastfull" | jq -r '.failing|join(",")')"
  [ "$th" = "$(v4_hash)" ] || bad "latest full run was on a DIFFERENT v4 tree ($th vs $(v4_hash)): edits after it are UNVERIFIED TAIL"
fi
echo "-- my runs"; [ -f "$LEDGER" ] && jq -r --arg o "$owner" 'select(.event=="end" and .owner==$o)|"  \(.run) \(.slice) \(.verdict) fail=[\(.failing|join(","))] \(.secs)s"' "$LEDGER" | tail -12
echo "-- diff summary (uncommitted, whole repo; your files are the ones in your claim)"; git -C "$ROOT" diff --stat 2>/dev/null | tail -12 | sed 's/^/  /'; git -C "$ROOT" status --porcelain 2>/dev/null | grep '^??' | head -8 | sed 's/^/  new: /'
echo "-- grader/threshold edits (must be disclosed with before/after numbers)"; git -C "$ROOT" diff -U0 -- prototype/grader/*.js prototype/grader/logic 2>/dev/null | grep -E '^[+-][^+-].*(>=?|<=?|===?) *[0-9]' | head -10 | sed 's/^/  /' || true
echo "-- INTEGRITY (constants, conduct scan, claims vs ledger)"
ia=(--owner "$owner"); [ -n "$rep" ] && ia+=(--report "$rep"); [ -n "${hf:-}" ] && ia+=(--history-file "$hf")
bash "$TOOLS_DIR/integrity-check.sh" "${ia[@]}" || bad "integrity findings above (disclose each in the hand-back)"
echo "-- honest-claims checklist (answer each in the hand-back)"
cat <<'C'
  [ ] every 'passes/100%/green' sentence cites a ledger run id (full run for 'all', slice id for a slice)
  [ ] last edit came BEFORE the cited run (tree hash matches) else say UNVERIFIED TAIL
  [ ] every grader assertion/threshold I changed is listed with before -> after and why
  [ ] failures I saw are listed (including 'flaky' ones, each reproduced alone twice or marked unreproduced)
  [ ] what I did not view/test (screens, devices, interactions) is listed
  [ ] files changed outside my claim: none (or listed)
  [ ] I did not commit/push/kill/stash/change env or settings unless the delegation allowed it
  [ ] every INTEGRITY finding above is disclosed with an explanation
C
if [ -n "$emit" ]; then { echo "<!-- HANDBACK-SKELETON owner=$owner task=$task generated=$(iso) -->"; cat "$(dirname "$0")/../playbook/templates/handback.md" 2>/dev/null; echo; echo "## Auto-filled ledger evidence"; [ -f "$LEDGER" ] && jq -r --arg o "$owner" 'select(.event=="end" and .owner==$o)|"- run \(.run) slice=\(.slice) verdict=\(.verdict) failing=[\(.failing|join(","))] secs=\(.secs) tree=\(.tree_end)"' "$LEDGER"; } > "$emit"; echo "skeleton written: $emit"; fi
[ $E = 0 ] && { echo "POSTFLIGHT: evidence present"; exit 0; } || { echo "POSTFLIGHT: evidence MISSING -> hand back as UNVERIFIED, list the gaps"; exit 4; }
