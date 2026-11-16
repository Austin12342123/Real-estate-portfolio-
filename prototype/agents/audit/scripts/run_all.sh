#!/bin/bash
# Repeatable audit pipeline (read-only on repo; writes to OUT scratch dir and agents/audit/). No grader is run.
set -e
OUT=${1:-/tmp/claude-0/-home-user-Real-estate-portfolio-/7dc1946d-079b-5fd1-ab6e-c2df61093438/scratchpad/audit}
AUD=${2:-/home/user/Real-estate-portfolio-/prototype/agents/audit}
D=$(dirname "$0"); mkdir -p "$OUT"
python3 -I $D/extract_main.py $OUT     # user msgs, launches, notifications from the main transcript
python3 -I $D/inventory.py $OUT        # per-agent metrics (token usage de-duplicated per message id)
python3 -I $D/overlap.py $OUT          # concurrent foreground grader runs
python3 -I $D/activity.py $OUT         # active time, idle gaps, agent-vs-agent and orchestrator-vs-agent collisions
python3 -I $D/metrics.py $OUT          # full vs slice runs, png views, tool errors
python3 -I $D/tasklogs.py $OUT         # classify tasks/*.output
python3 -I $D/generate.py $OUT $AUD    # per-agent files, inventory, audit.json (judgments live in notes.py)
