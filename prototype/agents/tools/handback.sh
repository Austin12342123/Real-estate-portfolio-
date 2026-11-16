#!/usr/bin/env bash
# Hand-back gate: lint a final report, then record that THE ONE hand-back is being sent.
# Usage: handback.sh --owner ID --report FILE [--task T] [--lint-only] [--final]
#   --lint-only : just lint. --final : lint + write agents/handbacks/<owner>.done (a second --final for the same owner/task is refused, exit 5).
#   After --final succeeds, send the file's text via SubagentHandback ONCE and stop. Never hand back while background jobs/graders you started run.
# Lint rules (exit 6 on failure): all mandatory sections present and non-empty; every 'green/100%/all pass' sentence cites a ledger run id that exists in
# agents/ledger/grader-runs.jsonl (and is a FULL run for 'all'); no 'known flaky'/'pre-existing' dismissals; size <= 7000 chars (warn) ; no 'TODO'/'<fill>'.
. "$(dirname "$0")/lib.sh"
SECTIONS=("What changed" "Evidence" "NOT verified" "could not be done" "Assumptions" "Questions for the user" "Failures seen" "Grader edits")
if [ "${1:-}" = "--self-test" ]; then T="$(mktemp -d)"; export AGENTS_HOME="$T/agents"; mkdir -p "$T/agents/ledger"; S="$0"; fail=0
  echo '{"event":"end","run":"20261116T010101-1","owner":"X","slice":"full","kind":"full","verdict":"clean"}' > "$T/agents/ledger/grader-runs.jsonl"
  good="$T/g.md"; { for s in "${SECTIONS[@]}"; do echo "## $s"; echo "content"; done; echo "Full grader 100% green: run 20261116T010101-1"; } > "$good"
  bad="$T/b.md"; { for s in "${SECTIONS[@]}"; do echo "## $s"; echo "content"; done; echo "All graders pass 100%"; echo "that failure is known flaky"; } > "$bad"
  t() { local w="$1"; shift; bash "$S" "$@" >"$T/o" 2>&1; r=$?; [ $r = $w ] && echo "ok   (exit $r) $*" | cut -c1-90 || { echo "FAIL got $r want $w: $*"; cat "$T/o"; fail=1; }; }
  t 6 --owner X --report "$bad" --lint-only; t 0 --owner X --report "$good" --lint-only; t 0 --owner X --report "$good" --final; t 5 --owner X --report "$good" --final
  rm -rf "$T"; [ $fail = 0 ] && echo "handback.sh self-test PASS" || { echo "handback.sh self-test FAIL"; exit 1; }; exit 0; fi
owner="" rep="" task="${TASK_ID:-default}" lint=0 final=0
while [ $# -gt 0 ]; do case "$1" in --owner) owner="$2"; shift 2;; --report) rep="$2"; shift 2;; --task) task="$2"; shift 2;; --lint-only) lint=1; shift;; --final) final=1; shift;; *) die "unknown arg $1";; esac; done
[ -n "$owner" ] && [ -f "$rep" ] || die "--owner and --report FILE required" 
[ $final = 1 ] && ! bash "$(dirname "$0")/deviate.sh" status --owner "$owner" >/dev/null 2>&1 && { echo "REFUSED (7): an open deviation for $owner is not closed by the monitor (tools/deviate.sh status --owner $owner; playbook/DEVIATIONS.md)."; exit 7; }
mark="$HB/$owner.$task.done"; [ $final = 1 ] && [ -e "$mark" ] && { echo "REFUSED (5): hand-back for $owner/$task already sent at $(cat "$mark"). Exactly ONE hand-back is allowed. If you were wrong, tell the orchestrator via the final message of a NEW task, not a duplicate."; exit 5; }
F=0; err() { echo "  LINT: $*"; F=1; }
for s in "${SECTIONS[@]}"; do l="$(grep -n -i "^#\+ .*$s" "$rep" | head -1 | cut -d: -f1)"; [ -z "$l" ] && { err "missing section: $s"; continue; }
  body="$(sed -n "$((l+1)),\$p" "$rep" | awk '/^#+ /{exit} {print}' | tr -d '[:space:]')"; [ -z "$body" ] && err "empty section: $s (write 'none' if none)"; done
ids="$(grep -oE '20[0-9]{6}T[0-9]{6}-[0-9]+' "$rep" | sort -u)"
for i in $ids; do grep -q "\"run\":\"$i\"" "$LEDGER" 2>/dev/null || err "cited run id not in ledger: $i"; done
while IFS= read -r line; do echo "$line" | grep -qiE '100 ?%|all green|all (graders|checks|tests)? ?pass|everything pass|every check pass|fully verified' || continue
  echo "$line" | grep -qE '20[0-9]{6}T[0-9]{6}-[0-9]+' || err "unsupported claim (no ledger run id on the line): ${line:0:90}"; done < "$rep"
grep -qiE 'known flak|pre-?existing failure|flaky, ignored|unrelated failure' "$rep" && err "dismissal wording found (flaky/pre-existing): reproduce alone twice and log it, or report it as OPEN"
grep -qE 'TODO|<fill>|FIXME' "$rep" && err "placeholder text left in report"
[ "$(wc -c < "$rep")" -gt 7000 ] && echo "  WARN: report > 7000 chars; the orchestrator pays for this in context. Move detail to a file and cite the path."
[ $F = 1 ] && { echo "LINT FAILED (6)"; exit 6; }; echo "LINT OK"
[ $final = 1 ] && { echo "$(iso) $rep" > "$mark"; echo "marked FINAL. Now send via SubagentHandback exactly once, then STOP."; }; exit 0
