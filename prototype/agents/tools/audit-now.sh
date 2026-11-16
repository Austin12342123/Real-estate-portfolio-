#!/usr/bin/env bash
# Regenerate the audit data from the session logs and append one standing-metrics line. Read-only on the repo (no grader, no browser).
# Usage: audit-now.sh [--main-transcript FILE.jsonl] [--label TEXT] [--full]   ;  --self-test
#   default main transcript = newest *.jsonl under /root/.claude/projects/-home-user-Real-estate-portfolio-/
#   outputs: agents/audit-runs/<ts>/ (intermediate json + AUTO-REPORT.md) and one line appended to agents/metrics/metrics.jsonl
#   --full also runs the auditor's hand-judgment generate.py in a copy (it fails with KeyError for agents that have no hand-written notes; a human/auditor must add them to notes.py).
. "$(dirname "$0")/lib.sh"
main=""; label=""; full=0; mdir="${METRICS_DIR:-$AGENTS/metrics}"
if [ "${1:-}" = "--self-test" ]; then export METRICS_DIR="$(mktemp -d)"; export AUDIT_RUNS_DIR="$(mktemp -d)"; bash "$0" --label selftest >/dev/null 2>&1 && [ -s "$METRICS_DIR/metrics.jsonl" ] && jq -e '.agents>0' "$METRICS_DIR/metrics.jsonl" >/dev/null && echo "audit-now.sh self-test PASS ($(jq -c '{agents,active_min,grader_runs}' "$METRICS_DIR/metrics.jsonl"))" || { echo "audit-now.sh self-test FAIL (is the session transcript present?)"; exit 1; }; rm -rf "$METRICS_DIR" "$AUDIT_RUNS_DIR"; exit 0; fi
while [ $# -gt 0 ]; do case "$1" in --main-transcript) main="$2"; shift 2;; --label) label="$2"; shift 2;; --full) full=1; shift;; *) die "unknown arg $1";; esac; done
PROJ="${PROJ_DIR:-/root/.claude/projects/-home-user-Real-estate-portfolio-}"
[ -n "$main" ] || main="$(ls -t "$PROJ"/*.jsonl 2>/dev/null | head -1)"; [ -f "$main" ] || die "no main transcript found (use --main-transcript)" 1
sid="$(basename "$main" .jsonl)"; sub="${main%.jsonl}/subagents"; tasks="${TASKS_DIR:-/tmp/claude-0/-home-user-Real-estate-portfolio-/$sid/tasks}"
ts="$(date -u +%Y%m%dT%H%M%S)"; RUN="${AUDIT_RUNS_DIR:-$AGENTS/audit-runs}/$ts"; mkdir -p "$RUN/scripts" "$mdir"
cp "$AGENTS"/audit/scripts/*.py "$RUN/scripts/"; sed -i -E "s#^(MAIN|SUB|T)='[^']*'#\1='@@\1@@'#" "$RUN/scripts/"{activity,extract_main,inventory,metrics,tasklogs}.py
sed -i "s#@@MAIN@@#$main#; s#@@SUB@@#$sub#; s#@@T@@#$tasks#" "$RUN/scripts/"{activity,extract_main,inventory,metrics,tasklogs}.py
for s in extract_main inventory overlap activity metrics tasklogs; do python3 -I "$RUN/scripts/$s.py" "$RUN" >"$RUN/$s.log" 2>&1 || echo "WARN: $s.py failed (see $RUN/$s.log)"; done
python3 -I "$TOOLS_DIR/audit-auto.py" "$RUN" "$RUN/AUTO-REPORT.md" "$mdir/metrics.jsonl" "$label" || die "auto report failed" 1
[ $full = 1 ] && { python3 -I "$RUN/scripts/generate.py" "$RUN" "$RUN" >"$RUN/generate.log" 2>&1 || echo "generate.py needs hand judgments for new agents (see $RUN/generate.log)"; }
echo "audit data: $RUN ; report: $RUN/AUTO-REPORT.md ; metrics line appended to $mdir/metrics.jsonl"
