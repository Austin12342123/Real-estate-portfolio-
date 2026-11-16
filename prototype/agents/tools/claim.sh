#!/usr/bin/env bash
# Work-claim / file-ownership protocol. One claim file per area: agents/locks/<area>.lock
# Usage:
#   claim.sh acquire <area> --owner ID --files "prototype/v4/*,prototype/grader/*" [--ttl-min 90] [--note TEXT] [--steal-expired]
#   claim.sh renew   <area> --owner ID [--ttl-min 90]
#   claim.sh release <area> --owner ID
#   claim.sh list
#   claim.sh check-path <path> [--owner ID]      exit 0 free (or owned by ID), 1 claimed by someone else
#   claim.sh foreign-edit [--owner ID]           exit 1 if another owner holds a live claim on prototype/v4 or prototype/grader
#   claim.sh --self-test
# Rules: exclusive; two live claims may not overlap by path prefix; claims expire (default 90 min) and must be renewed;
# an expired claim may be taken over only with --steal-expired (the takeover is logged in the lock file history).
. "$(dirname "$0")/lib.sh"
cmd="${1:-}"; shift || true
area="" owner="" files="" ttl=90 note="" steal=0
if [ "$cmd" != "list" ] && [ "$cmd" != "--self-test" ] && [ "$cmd" != "foreign-edit" ]; then area="${1:-}"; shift || true; fi
while [ $# -gt 0 ]; do case "$1" in
  --owner) owner="$2"; shift 2;; --files) files="$2"; shift 2;; --ttl-min) ttl="$2"; shift 2;;
  --note) note="$2"; shift 2;; --steal-expired) steal=1; shift;; *) die "unknown arg $1";; esac; done
live() { local f="$1" e; e="$(lockval "$f" expires)"; [ -n "$e" ] && [ "$e" -gt "$(now)" ]; }
conflicts() { # print conflicting lock files for $files, ignoring own area file
  local f p q o; for f in "$LOCKS"/*.lock; do [ -e "$f" ] || continue
    [ "$(basename "$f" .lock)" = "$area" ] && continue; live "$f" || continue
    IFS=, read -ra Q <<<"$(lockval "$f" files)"; IFS=, read -ra P <<<"$files"
    for p in "${P[@]}"; do for q in "${Q[@]}"; do overlaps "$p" "$q" && { echo "$f"; continue 3; }; done; done; done; }
case "$cmd" in
acquire)
  [ -n "$area" ] && [ -n "$owner" ] && [ -n "$files" ] || die "acquire needs <area> --owner --files"
  [ "$area" = "grader" ] && die "'grader' is reserved for the grader flock"
  c="$(conflicts)"; if [ -n "$c" ]; then echo "REFUSED: overlaps live claim(s):"; for x in $c; do echo "  $(basename "$x") owner=$(lockval "$x" owner) files=$(lockval "$x" files) expires_in=$(( $(lockval "$x" expires)-$(now) ))s"; done; exit 1; fi
  f="$LOCKS/$area.lock"
  if [ -e "$f" ]; then
    if live "$f" && [ "$(lockval "$f" owner)" != "$owner" ]; then echo "REFUSED: area '$area' held by $(lockval "$f" owner) for $(( ($(lockval "$f" expires)-$(now))/60 )) more min"; exit 1; fi
    if ! live "$f" && [ "$(lockval "$f" owner)" != "$owner" ] && [ $steal = 0 ]; then echo "REFUSED: area '$area' has an EXPIRED claim by $(lockval "$f" owner); rerun with --steal-expired after checking git status for their unfinished files"; exit 1; fi
  fi
  prev=""; [ -e "$f" ] && prev="$(lockval "$f" owner)"
  printf 'owner=%s\nfiles=%s\ncreated=%s\nexpires=%s\nnote=%s\nprev_owner=%s\ncreated_iso=%s\n' "$owner" "$files" "$(now)" "$(( $(now)+ttl*60 ))" "$note" "$prev" "$(iso)" > "$f.tmp.$$" && mv "$f.tmp.$$" "$f"
  echo "CLAIMED $area owner=$owner files=$files ttl=${ttl}min";;
renew)
  f="$LOCKS/$area.lock"; [ -e "$f" ] || die "no such claim"; [ "$(lockval "$f" owner)" = "$owner" ] || die "not your claim"
  sed -i "s/^expires=.*/expires=$(( $(now)+ttl*60 ))/" "$f"; echo "RENEWED $area ${ttl}min";;
release)
  f="$LOCKS/$area.lock"; [ -e "$f" ] || { echo "no claim $area (ok)"; exit 0; }
  [ "$(lockval "$f" owner)" = "$owner" ] || die "not your claim (owner=$(lockval "$f" owner))" 1; rm -f "$f"; echo "RELEASED $area";;
list)
  n=0; for f in "$LOCKS"/*.lock; do [ -e "$f" ] || continue; n=$((n+1)); s=LIVE; live "$f" || s=EXPIRED
    echo "$s $(basename "$f" .lock) owner=$(lockval "$f" owner) files=$(lockval "$f" files) left=$(( ($(lockval "$f" expires)-$(now))/60 ))min note=$(lockval "$f" note)"; done; [ $n = 0 ] && echo "no claims"; exit 0;;
check-path)
  p="$area"; for f in "$LOCKS"/*.lock; do [ -e "$f" ] || continue; live "$f" || continue; [ "$(lockval "$f" owner)" = "$owner" ] && continue
    IFS=, read -ra Q <<<"$(lockval "$f" files)"; for q in "${Q[@]}"; do overlaps "$p" "$q" && { echo "CLAIMED by $(lockval "$f" owner) ($(basename "$f" .lock))"; exit 1; }; done; done; echo free; exit 0;;
foreign-edit)
  for f in "$LOCKS"/*.lock; do [ -e "$f" ] || continue; live "$f" || continue; [ "$(lockval "$f" owner)" = "$owner" ] && continue
    IFS=, read -ra Q <<<"$(lockval "$f" files)"; for q in "${Q[@]}"; do for r in prototype/v4/x prototype/grader/x; do overlaps "$r" "$q" && { echo "FOREIGN-EDIT: $(lockval "$f" owner) holds $(basename "$f" .lock) ($q)"; exit 1; }; done; done; done; exit 0;;
--self-test) exec bash "$0" __selftest;;
__selftest)
  T="$(mktemp -d)"; export AGENTS_HOME="$T/agents"; mkdir -p "$AGENTS_HOME"; S="$0"; fail=0
  t() { local want="$1"; shift; "$@" >/dev/null 2>&1; local r=$?; [ "$r" = "$want" ] && echo "ok   $*" || { echo "FAIL (got $r want $want) $*"; fail=1; }; }
  t 0 bash "$S" acquire v4 --owner A --files "prototype/v4/*" --ttl-min 5
  t 1 bash "$S" acquire v4b --owner B --files "prototype/v4/app.js"
  t 0 bash "$S" acquire docs --owner B --files "prototype/agents/*"
  t 1 bash "$S" check-path prototype/v4/engine.js --owner B
  t 0 bash "$S" check-path prototype/v4/engine.js --owner A
  t 0 bash "$S" check-path prototype/grader/x.js --owner B
  t 1 bash "$S" release v4 --owner B
  t 0 bash "$S" renew v4 --owner A
  t 1 bash "$S" foreign-edit --owner B
  t 0 bash "$S" foreign-edit --owner A
  sed -i "s/^expires=.*/expires=1/" "$AGENTS_HOME/locks/v4.lock"
  t 1 bash "$S" acquire v4 --owner C --files "prototype/v4/*"
  t 0 bash "$S" acquire v4 --owner C --files "prototype/v4/*" --steal-expired
  t 0 bash "$S" release v4 --owner C
  t 0 bash "$S" list; rm -rf "$T"; [ $fail = 0 ] && echo "claim.sh self-test PASS" || { echo "claim.sh self-test FAIL"; exit 1; };;
*) sed -n 2,14p "$0"; exit 2;;
esac
