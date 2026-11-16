#!/usr/bin/env bash
# Automated integrity check (run by postflight; the orchestrator runs it before relaying any claim).
# Usage: integrity-check.sh --owner ID [--report FILE] [--base REF] [--history-file FILE] [--transcript FILE.jsonl] ; --self-test
# Three checks, exit 7 on any finding (findings are printed, never hidden):
#  A. CONSTANTS: diff of grader/test files vs REF (default HEAD) with changed numeric constants/floors/tolerances and removed checks highlighted (diff-constants.py).
#     Each must appear in the hand-back 'Grader edits' section with old -> new and why (if --report given, undisclosed ones are flagged).
#  B. CONDUCT: scan the agent's own Bash history for process-killing (kill, pkill, killall), stash, reset --hard, clean -f, checkout -- / restore of others' files,
#     force push, rebase, history rewrite, environment/network/permission tools or settings edits, direct 'node grade.js' (bypasses single-flight).
#     History source: --history-file (one command per line) or the agent's transcript (--transcript, default: agent-<owner>.jsonl under the newest session's subagents dir).
#  C. CLAIMS vs LEDGER (needs --report): every cited run id exists, belongs to the owner (warn otherwise), 'all/100%/green/pass' lines cite a FULL run whose verdict is clean,
#     the cited full run's tree hash equals the current v4 tree (else UNVERIFIED TAIL must be stated), and the report contains a 'NOT verified' section.
. "$(dirname "$0")/lib.sh"
PAT='(^|[;&|[:space:]])(kill|pkill|killall)[[:space:]]|git[[:space:]]+(-C [^ ]+[[:space:]]+)?stash|git[[:space:]]+reset[[:space:]]+--hard|git[[:space:]]+clean[[:space:]]+-[a-z]*f|git[[:space:]]+checkout[[:space:]]+(--|\.)|git[[:space:]]+restore[[:space:]]|push[[:space:]].*(--force|-f[[:space:]])|git[[:space:]]+rebase|git[[:space:]]+filter|commit[[:space:]]+--amend|settings(\.local)?\.json|create_environment|update_environment|switch_environment|request_credential|allowed_hosts|network_access|(^|[;&|[:space:]])node[[:space:]]+(\./)?grade\.js'
if [ "${1:-}" = "--self-test" ]; then T="$(mktemp -d)"; export AGENTS_HOME="$T/agents" REPO_ROOT="$T"; mkdir -p "$T/agents/ledger" "$T/prototype/grader" "$T/prototype/v4"; git -C "$T" init -q; git -C "$T" config user.email a@b; git -C "$T" config user.name t
  echo "t(n > 1500, 'x')" > "$T/prototype/grader/g.js"; echo x > "$T/prototype/v4/app.js"; git -C "$T" add -A; git -C "$T" commit -qm i; echo "t(n > 1000, 'x')" > "$T/prototype/grader/g.js"
  h="$(cd "$T/prototype/v4" && cat app.js engine.js info.js style.css sw.js index.html 2>/dev/null | sha1sum | cut -c1-12)"
  echo '{"event":"end","run":"20261116T010101-1","owner":"X","slice":"full","kind":"full","verdict":"failing","tree_end":"'$h'"}' > "$T/agents/ledger/grader-runs.jsonl"
  printf 'ls\npkill -f "node grade.js"\ngit stash\n' > "$T/h.txt"; printf '## NOT verified\nnone\nAll 100%% green (run 20261116T010101-1)\n' > "$T/r.md"
  out="$(bash "$0" --owner X --history-file "$T/h.txt" --report "$T/r.md" 2>&1)"; r=$?; ok=1
  for k in "LOOSEN" "pkill" "git stash" "verdict=failing"; do echo "$out" | grep -q "$k" || { echo "missing finding: $k"; ok=0; }; done
  printf 'ls\n' > "$T/h2.txt"; git -C "$T" checkout -q -- prototype/grader/g.js; bash "$0" --owner X --history-file "$T/h2.txt" >/dev/null 2>&1; r2=$?; rm -rf "$T"
  [ $r = 7 ] && [ $r2 = 0 ] && [ $ok = 1 ] && echo "integrity-check.sh self-test PASS (finds loosened constant, pkill, stash, red-cited claim; clean tree exits 0)" || { echo "integrity-check.sh self-test FAIL ($r,$r2,$ok)"; exit 1; }; exit 0; fi
owner="" report="" base="HEAD" hist="" tr=""
while [ $# -gt 0 ]; do case "$1" in --owner) owner="$2"; shift 2;; --report) report="$2"; shift 2;; --base) base="$2"; shift 2;; --history-file) hist="$2"; shift 2;; --transcript) tr="$2"; shift 2;; *) die "unknown arg $1";; esac; done
[ -n "$owner" ] || die "--owner required"; F=0; find_() { echo "  FINDING: $*"; F=1; }
echo "-- A. changed constants in grader/test files (vs $base)"
d="$(git -C "$ROOT" diff -U0 "$base" -- 'prototype/grader/*.js' 'prototype/grader/logic' 'prototype/v4/*test*' 2>/dev/null)"
r="$(printf '%s\n' "$d" | python3 -I "$TOOLS_DIR/diff-constants.py")"; echo "$r" | sed 's/^/  /'
if ! echo "$r" | grep -q 'NO CONSTANT CHANGES'; then F=1; if [ -n "$report" ]; then
  sec="$(awk 'BEGIN{IGNORECASE=1} /^#+ .*Grader edits/{f=1;next} /^#+ /{f=0} f' "$report" | tr -d '[:space:]')"; { [ -z "$sec" ] || [ "$sec" = none ]; } && find_ "constants changed but the hand-back 'Grader edits' section is empty/none"; fi; fi
echo "-- B. conduct scan of the agent's own commands"
if [ -z "$hist" ]; then
  if [ -z "$tr" ]; then PROJ="${PROJ_DIR:-/root/.claude/projects/-home-user-Real-estate-portfolio-}"; for f in $(ls -t "$PROJ"/*.jsonl 2>/dev/null | head -3); do c="${f%.jsonl}/subagents/agent-$owner.jsonl"; [ -f "$c" ] && { tr="$c"; break; }; done; fi
  if [ -n "$tr" ] && [ -f "$tr" ]; then hist="$(mktemp)"; python3 -I - "$tr" > "$hist" <<'P'
import json,sys
for l in open(sys.argv[1]):
    try: d=json.loads(l)
    except: continue
    c=(d.get('message') or {}).get('content')
    if isinstance(c,list):
        for b in c:
            if isinstance(b,dict) and b.get('type')=='tool_use':
                n=b.get('name',''); i=b.get('input',{})
                if n in('Bash','bash'): print(str(i.get('command','')).replace('\n',' ; ')[:600])
                elif 'environment' in n.lower() or 'credential' in n.lower() or n in('Write','Edit') and 'settings' in str(i.get('file_path','')): print('TOOL '+n+' '+str(i)[:300])
P
  else echo "  (no transcript/history available for owner=$owner: pass --history-file or --transcript; conduct scan NOT performed)"; fi; fi
if [ -n "$hist" ] && [ -f "$hist" ]; then n=$(wc -l < "$hist"); echo "  scanned $n commands"; grep -nE "$PAT" "$hist" | cut -c1-220 | while IFS= read -r l; do echo "  FINDING: $l"; done; grep -qE "$PAT" "$hist" && F=1
  echo "  (each FINDING needs an explanation in the hand-back; kill/pkill/stash/environment changes without explicit user approval are violations)"; fi
echo "-- C. claims vs ledger"
if [ -n "$report" ]; then
  grep -qiE '^#+ .*NOT verified' "$report" || find_ "report has no 'NOT verified' section"
  for i in $(grep -oE '20[0-9]{6}T[0-9]{6}-[0-9]+' "$report" | sort -u); do e="$(jq -c --arg r "$i" 'select(.event=="end" and .run==$r)' "$LEDGER" 2>/dev/null | tail -1)"
    [ -z "$e" ] && { find_ "cited run $i not in ledger"; continue; }; [ "$(echo "$e"|jq -r .owner)" != "$owner" ] && echo "  WARN: run $i belongs to $(echo "$e"|jq -r .owner), not $owner"; done
  while IFS= read -r line; do echo "$line" | grep -qiE '100 ?%|all green|all (graders|checks|tests)? ?pass|everything pass|fully verified' || continue
    i="$(echo "$line" | grep -oE '20[0-9]{6}T[0-9]{6}-[0-9]+' | head -1)"; [ -z "$i" ] && { find_ "uncited claim: ${line:0:80}"; continue; }
    e="$(jq -c --arg r "$i" 'select(.event=="end" and .run==$r)' "$LEDGER" | tail -1)"; [ -z "$e" ] && continue
    [ "$(echo "$e"|jq -r .kind)" = full ] || find_ "'all/100%' claim cites a slice run ($i)"
    [ "$(echo "$e"|jq -r .verdict)" = clean ] || find_ "claim cites run $i with verdict=$(echo "$e"|jq -r .verdict)"
    [ "$(echo "$e"|jq -r .tree_end)" = "$(v4_hash)" ] || grep -qi 'UNVERIFIED TAIL' "$report" || find_ "run $i is on an older v4 tree and the report does not state UNVERIFIED TAIL"; done < "$report"
else echo "  (no --report: claims check skipped)"; fi
[ $F = 0 ] && { echo "INTEGRITY: no findings"; exit 0; } || { echo "INTEGRITY: FINDINGS (exit 7). Disclose each in the hand-back; the orchestrator must read them before relaying."; exit 7; }
