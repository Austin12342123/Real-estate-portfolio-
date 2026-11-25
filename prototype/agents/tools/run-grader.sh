#!/usr/bin/env bash
# Single-flight grader runner. The ONLY sanctioned way to run prototype/grader/grade.js.
# Usage: run-grader.sh --owner ID --slice SLICE [--task TASK] [--note TEXT] [--wait-sec N] [--timeout-sec N] [--max-slices N] [--max-full N]
#   SLICE: full | main | finance | sync | info | gest | ux | design | numbering | logic | checks:A13,A16 | h:H3,H5
#   --self-test   dry-run with a fake grader (never starts node/Playwright)
# Guarantees: (1) never two graders at once (flock agents/locks/grader.lock, fail fast exit 75 unless --wait-sec);
# (2) refuses while another owner holds a live claim on prototype/v4 or prototype/grader (exit 76);
# (3) refuses stale build stamps (exit 77); (4) per-task run budget (exit 78; override: BUDGET_OVERRIDE="reason", logged);
# (5) partial runs NEVER overwrite full-run reports: every run's outputs are copied to agents/ledger/runs/<run_id>/ and,
#     for non-full slices, grader/report.md + result.json are restored to their pre-run content;
# (6) a ledger line (start + end) in agents/ledger/grader-runs.jsonl with commit, v4 tree hash, slice, exit, failing ids, verdict;
# (7) the run is INVALID (verdict tree-changed) if the v4 source hash changed during the run.
# Verdict values: clean | failing | invalid-tree-changed | timeout | aborted. Only a FULL run with verdict clean counts as evidence for 'all green'.
. "$(dirname "$0")/lib.sh"
[ "${1:-}" = "--self-test" ] && exec bash "$0" __selftest
if [ "${1:-}" = "__selftest" ]; then
  T="$(mktemp -d)"; export AGENTS_HOME="$T/agents"; export REPO_ROOT="$T"; mkdir -p "$T/agents" "$T/prototype/grader/logic" "$T/prototype/v4"; S="$0"; fail=0
  echo FULLREPORT > "$T/prototype/grader/report.md"; echo '{"full":1}' > "$T/prototype/grader/result.json"; echo x > "$T/prototype/v4/app.js"
  export GRADER_DIR="$T/prototype/grader" SKIP_STAMP=1
  t() { local want="$1"; shift; "$@" >"$T/o.txt" 2>&1; local r=$?; [ "$r" = "$want" ] && echo "ok   (exit $r) ${*:2:5}" || { echo "FAIL (got $r want $want) $*"; cat "$T/o.txt"; fail=1; }; }
  export GRADER_CMD='echo "  [1.00/1] A01 fine"; echo PARTIAL > report.md; echo "{}" > result.json'
  t 0 bash "$S" --owner T1 --slice main --task selftest
  [ "$(cat $T/prototype/grader/report.md)" = FULLREPORT ] && echo "ok   partial run did not overwrite report.md" || { echo "FAIL report.md clobbered"; fail=1; }
  export GRADER_CMD='echo "  [0.00/4] A35 data loss  <-- bad"'
  t 1 bash "$S" --owner T1 --slice full --task selftest
  grep -q '"verdict":"failing"' "$T/agents/ledger/grader-runs.jsonl" && echo "ok   ledger records failing verdict" || { echo FAIL ledger; fail=1; }
  export GRADER_CMD='sleep 3; echo "  [1/1] A01 ok"'
  ( bash "$S" --owner T1 --slice logic --task selftest >/dev/null 2>&1 & ); sleep 1
  t 75 bash "$S" --owner T2 --slice logic --task other
  sleep 3
  export GRADER_CMD='echo "  [1/1] A01 ok"; echo changed >> '"$T"'/prototype/v4/app.js'
  t 1 bash "$S" --owner T1 --slice sync --task selftest
  grep -q 'invalid-tree-changed' "$T/agents/ledger/grader-runs.jsonl" && echo "ok   tree change invalidates run" || { echo "FAIL tree-change"; fail=1; }
  export GRADER_CMD='echo "  [1/1] A01 ok"'
  for i in 1 2 3; do bash "$S" --owner T3 --slice logic --task b --max-slices 2 >/dev/null 2>&1; done; t 78 bash "$S" --owner T3 --slice logic --task b --max-slices 2
  bash "$TOOLS_DIR/claim.sh" acquire v4 --owner OTHER --files "prototype/v4/*" >/dev/null
  t 76 bash "$S" --owner T9 --slice logic --task c
  export GRADER_CMD='sleep 5'; bash "$TOOLS_DIR/claim.sh" release v4 --owner OTHER >/dev/null
  t 1 bash "$S" --owner T4 --slice logic --task d --timeout-sec 1
  grep -q '"verdict":"timeout"' "$T/agents/ledger/grader-runs.jsonl" && echo "ok   timeout verdict" || { echo "FAIL timeout"; fail=1; }
  rm -rf "$T"; [ $fail = 0 ] && echo "run-grader.sh self-test PASS (fake grader only; no node, no browser)" || { echo "run-grader.sh self-test FAIL"; exit 1; }; exit 0
fi
owner="" slice="" task="${TASK_ID:-default}" note="" waitsec=0 tmo="" maxs="${MAX_SLICES:-10}" maxf="${MAX_FULL:-2}"
while [ $# -gt 0 ]; do case "$1" in --owner) owner="$2"; shift 2;; --slice) slice="$2"; shift 2;; --task) task="$2"; shift 2;;
  --note) note="$2"; shift 2;; --wait-sec) waitsec="$2"; shift 2;; --timeout-sec) tmo="$2"; shift 2;; --max-slices) maxs="$2"; shift 2;; --max-full) maxf="$2"; shift 2;; *) die "unknown arg $1";; esac; done
[ -n "$owner" ] && [ -n "$slice" ] || { sed -n 2,6p "$0"; exit 2; }
GRADER_DIR="${GRADER_DIR:-$PROTO/grader}"
case "$slice" in
 full) envs=""; kind=full; dflt=1800;; main) envs="MAIN_ONLY=1"; kind=slice; dflt=600;; finance) envs="FINANCE_ONLY=1"; kind=slice; dflt=600;;
 sync) envs="SYNC_ONLY=1"; kind=slice; dflt=600;; info) envs="INFO_ONLY=1"; kind=slice; dflt=600;; gest) envs="GEST_ONLY=1"; kind=slice; dflt=600;;
 ux) envs="UX_ONLY=1"; kind=slice; dflt=600;; design) envs="DESIGN_ONLY=1"; kind=slice; dflt=600;; numbering) envs="NUM_ONLY=1"; kind=slice; dflt=600;;
 logic) envs="LOGIC_ONLY=1"; kind=slice; dflt=300;; checks:*) envs="ONLY_CHECKS=${slice#checks:}"; kind=slice; dflt=600;; h:*) envs="INFO_ONLY=1 H_ONLY=${slice#h:}"; kind=slice; dflt=600;;
 *) die "unknown slice '$slice'";; esac
tmo="${tmo:-$dflt}"
# (2) foreign claims
if ! out="$(bash "$TOOLS_DIR/claim.sh" foreign-edit --owner "$owner")"; then echo "REFUSED (76): $out"; echo "Wait for release or ask the orchestrator; do not run the grader over someone else's edits."; exit 76; fi
# (4) budget
if [ -f "$LEDGER" ]; then
  used_s=$(jq -s --arg o "$owner" --arg t "$task" '[.[]|select(.event=="start" and .owner==$o and .task==$t and .kind=="slice")]|length' "$LEDGER")
  used_f=$(jq -s --arg o "$owner" --arg t "$task" '[.[]|select(.event=="start" and .owner==$o and .task==$t and .kind=="full")]|length' "$LEDGER")
else used_s=0; used_f=0; fi
if { [ "$kind" = slice ] && [ "$used_s" -ge "$maxs" ]; } || { [ "$kind" = full ] && [ "$used_f" -ge "$maxf" ]; }; then
  if [ -n "${BUDGET_OVERRIDE:-}" ]; then echo "BUDGET OVERRIDE logged: $BUDGET_OVERRIDE"; else
  echo "REFUSED (78): run budget used (slices $used_s/$maxs, full $used_f/$maxf) for owner=$owner task=$task. Stop, summarise what is unverified, and ask the orchestrator (BUDGET_OVERRIDE=\"reason\" to continue)."; exit 78; fi
fi
# (3) stamps
if [ -z "${SKIP_STAMP:-}" ]; then ( cd "$PROTO/v4" && python3 stamp.py --check ) >/dev/null 2>&1 || { echo "REFUSED (77): build stamps stale. Owner of v4 must run: cd prototype/v4 && python3 stamp.py"; exit 77; }; fi
# (1) single flight
exec 9>"$LOCKS/grader.lock"
if ! flock -n 9; then
  if [ "$waitsec" -gt 0 ]; then flock -w "$waitsec" 9 || { echo "REFUSED (75): grader still busy after ${waitsec}s: $(cat "$LOCKS/grader.holder" 2>/dev/null)"; exit 75; }
  else echo "REFUSED (75): another grader is running: $(cat "$LOCKS/grader.holder" 2>/dev/null). Do NOT kill it (no pkill). Wait (--wait-sec) or read its log in agents/ledger/runs/."; exit 75; fi
fi
rid="$(date -u +%Y%m%dT%H%M%S)-$$"; RUND="$LEDGER_DIR/runs/$rid"; mkdir -p "$RUND"
commit="$(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || echo nogit)"; dirty="$(git -C "$ROOT" status --porcelain 2>/dev/null | wc -l)"
h0="$(v4_hash)"; t0=$(now)
echo "run=$rid owner=$owner slice=$slice pid=$$ since=$(iso)" > "$LOCKS/grader.holder"
jw event=start run="$rid" owner="$owner" task="$task" slice="$slice" kind="$kind" commit="$commit" n:dirty="$dirty" tree="$h0" ts="$(iso)" note="$note" >> "$LEDGER"
# snapshot full-run outputs so a partial run can never clobber them
SNAP="$LEDGER_DIR/tmp/$rid"; mkdir -p "$SNAP"; for f in report.md result.json; do [ -f "$GRADER_DIR/$f" ] && cp "$GRADER_DIR/$f" "$SNAP/$f"; done
[ -f "$GRADER_DIR/logic/report.md" ] && mkdir -p "$SNAP/logic" && cp "$GRADER_DIR/logic/report.md" "$SNAP/logic/report.md"
touch "$SNAP/.marker"
GCMD="${GRADER_CMD:-NODE_PATH=\$(npm root -g) node grade.js}"
echo ">> running $slice (timeout ${tmo}s); log: $RUND/output.log"
( cd "$GRADER_DIR" && env $envs timeout "$tmo" bash -c "$GCMD" ) > "$RUND/output.log" 2>&1; ec=$?
t1=$(now); h1="$(v4_hash)"
# collect outputs written during the run
( cd "$GRADER_DIR" && find . -maxdepth 2 \( -name 'report*.md' -o -name 'result*.json' \) -newer "$SNAP/.marker" 2>/dev/null ) | while read -r f; do mkdir -p "$RUND/out/$(dirname "$f")"; cp "$GRADER_DIR/$f" "$RUND/out/$f"; done
restored=no
if [ "$kind" != full ]; then
  for f in report.md result.json; do [ -f "$SNAP/$f" ] && cp "$SNAP/$f" "$GRADER_DIR/$f" && restored=yes; done
  [ -f "$SNAP/logic/report.md" ] && cp "$SNAP/logic/report.md" "$GRADER_DIR/logic/report.md"
fi
rm -rf "$SNAP"
fails="$(grep -E '<--' "$RUND/output.log" | sed -E 's/^ *\[[^]]*\] *([A-Z]+[0-9]+[a-z]?).*/\1/' | sort -u | paste -sd, -)"
# Logic-grader failures (FAIL L<n>.<m> (<weight>)) count too when their weight is above 0 (weight-0 lines are UNVERIFIED notes). Without this a weighted logic regression printed "clean" (run 20261125T201343-401: L 93.08 vs 100).
lfails="$(grep -E '^ +FAIL L[0-9]+\.[0-9]+ \(' "$RUND/output.log" | sed -E 's/^ +FAIL (L[0-9]+\.[0-9]+) \(([0-9.]+)\).*/\1 \2/' | awk '$2+0>0{print $1}' | sort -u | paste -sd, -)"
[ -n "$lfails" ] && fails="${fails:+$fails,}$lfails"
if [ "$ec" = 124 ]; then verdict=timeout; elif [ "$h0" != "$h1" ]; then verdict=invalid-tree-changed; elif [ "$ec" != 0 ]; then verdict=aborted; elif [ -n "$fails" ]; then verdict=failing; else verdict=clean; fi
jw event=end run="$rid" owner="$owner" task="$task" slice="$slice" kind="$kind" n:exit="$ec" n:secs=$((t1-t0)) tree_start="$h0" tree_end="$h1" l:failing="$fails" verdict="$verdict" partial_restored="$restored" log="$RUND/output.log" ts="$(iso)" >> "$LEDGER"
rm -f "$LOCKS/grader.holder"
ks=0; kf=0; [ "$kind" = slice ] && ks=1; [ "$kind" = full ] && kf=1
echo "================ GRADER VERDICT ================"
chg=""; [ "$h0" != "$h1" ] && chg=" -> $h1 (CHANGED DURING RUN)"
echo "run=$rid slice=$slice kind=$kind exit=$ec secs=$((t1-t0)) commit=$commit tree=$h0$chg"
echo "verdict=$verdict failing=[${fails:-none}] budget_used: slices=$((used_s+ks)) full=$((used_f+kf))"
[ "$kind" != full ] && echo "NOTE: partial run; full-run reports left untouched (restored=$restored). Cite run id $rid, not 'all green'."
tail -n 4 "$RUND/output.log" | cut -c1-200
[ "$verdict" = clean ]; exit $?
