#!/usr/bin/env bash
# Deviation protocol (playbook/DEVIATIONS.md). Log file: agents/deviations/<owner>.jsonl
# open   --owner ME --monitor M --rule "<PLAYBOOK rule>" --why "<why better>" --plan "<what instead>" --risk "<risks>" --return "<how/when back to the plan>"
# ack    --owner ME --monitor M --note "<conditions the monitor sets>"      (monitor writes this)
# verify --owner ME --monitor M --note "<what the monitor checked>"        (monitor, after the deviant action)
# close  --owner ME --monitor M --note "<back on plan evidence>"           (monitor only)
# status [--owner ME]    list; exit 3 if any deviation is open/unacked
D="$(cd "$(dirname "$0")/.." && pwd)/deviations"; mkdir -p "$D"
cmd="${1:-}"; shift || true; owner=""; monitor=""; rule=""; why=""; plan=""; risk=""; ret=""; note=""
while [ $# -gt 0 ]; do case "$1" in --owner) owner="$2";; --monitor) monitor="$2";; --rule) rule="$2";; --why) why="$2";; --plan) plan="$2";; --risk) risk="$2";; --return) ret="$2";; --note) note="$2";; esac; shift 2; done
now="$(date -u +%FT%TZ)"
j() { python3 -c 'import json,sys;print(json.dumps(dict(zip(sys.argv[1::2],sys.argv[2::2]))))' "$@"; }
case "$cmd" in
 open) [ -n "$owner$monitor$rule$why$plan$risk$ret" ] && [ -n "$owner" ] && [ -n "$monitor" ] && [ -n "$rule" ] && [ -n "$why" ] && [ -n "$plan" ] && [ -n "$risk" ] && [ -n "$ret" ] || { echo "open needs --owner --monitor --rule --why --plan --risk --return"; exit 2; }
   j event open ts "$now" owner "$owner" monitor "$monitor" rule "$rule" why "$why" plan "$plan" risk "$risk" return "$ret" >> "$D/$owner.jsonl"
   echo "deviation opened. Send the monitor a message NOW (SendMessage) and WAIT for its 'ack' before acting; log: $D/$owner.jsonl";;
 ack|verify|close) [ -n "$owner" ] && [ -n "$monitor" ] || { echo "need --owner --monitor"; exit 2; }
   j event "$cmd" ts "$now" owner "$owner" monitor "$monitor" note "$note" >> "$D/$owner.jsonl"; echo "$cmd logged";;
 status) bad=0; for f in "$D"/*.jsonl; do [ -e "$f" ] || continue; o="$(basename "$f" .jsonl)"; [ -n "$owner" ] && [ "$o" != "$owner" ] && continue
   python3 - "$f" <<'P' || bad=1
import json,sys
ev=[json.loads(l) for l in open(sys.argv[1]) if l.strip()]
st=[]; 
for e in ev:
  if e['event']=='open': st.append({'o':e,'ack':0,'ver':0,'closed':0})
  elif st:
    k={'ack':'ack','verify':'ver','close':'closed'}[e['event']]; st[-1][k]=1
rc=0
for s in st:
  o=s['o']; state='CLOSED' if s['closed'] else ('VERIFIED' if s['ver'] else ('ACKED' if s['ack'] else 'WAITING FOR ACK'))
  print(f"{o['owner']}: [{state}] rule '{o['rule']}' -> {o['plan']} (monitor {o['monitor']}, return: {o['return']})")
  if not s['closed']: rc=3
sys.exit(rc)
P
   done; exit $bad;;
 *) sed -n 2,9p "$0"; exit 2;;
esac
