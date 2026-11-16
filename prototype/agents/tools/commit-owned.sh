#!/usr/bin/env bash
# Commit hygiene: commit ONLY files the committing agent owns (claim) and push to the DEV branch only.
# Usage: commit-owned.sh --owner ID -m "message" [--files "p1,p2"] [--push] [--to-main] [--trailer-file F] [--dry-run] [--allow-failing-snapshot]
#   default files = dirty files matching the owner's live claim patterns.  --files overrides but must stay inside the claim (or the claim list may be empty for docs-only areas: then --files is trusted).
#   Refuses: no owned changes; pre-staged files of others; message starting with WIP (unless --allow-failing-snapshot, which tags the message [SNAPSHOT-FAILING] and forbids --push);
#            --push to main/master unless --to-main AND the ledger's latest FULL run is clean on the CURRENT v4 tree; any force push (never supported).
#   Trailers: pass --trailer-file (e.g. the attribution lines the session requires) or env COMMIT_TRAILER.
# The environment stop-hook's blind 'WIP' commits are NOT replaced by this tool; see playbook/ADOPTION.md for disabling/replacing the hook.
. "$(dirname "$0")/lib.sh"
if [ "${1:-}" = "--self-test" ]; then
  T="$(mktemp -d)"; export AGENTS_HOME="$T/w/prototype/agents" REPO_ROOT="$T/w"; git init -q --bare "$T/r.git"; git init -q -b dev "$T/w"; cd "$T/w"; git config user.email a@b; git config user.name t
  mkdir -p prototype/v4 prototype/agents/ledger prototype/docs; echo 1 > prototype/v4/a.js; echo 1 > prototype/docs/d.md; git add -A; git commit -qm init; git remote add origin "$T/r.git"; git push -q origin dev
  S="$TOOLS_DIR/commit-owned.sh"; fail=0; t() { local w="$1"; shift; "$@" >"$T/o" 2>&1; r=$?; [ $r = $w ] && echo "ok   (exit $r) ${*:2:4}" || { echo "FAIL got $r want $w: $*"; cat "$T/o"; fail=1; }; }
  echo 2 > prototype/v4/a.js; echo 2 > prototype/docs/d.md
  bash "$TOOLS_DIR/claim.sh" acquire docs --owner D --files "prototype/docs/*" >/dev/null
  t 1 bash "$S" --owner D -m "WIP stuff"
  t 0 bash "$S" --owner D -m "docs: update" --push
  [ "$(git status --porcelain | grep -c v4/a.js)" = 1 ] && echo "ok   others' v4 file left uncommitted" || { echo "FAIL swept v4"; fail=1; }
  [ "$(git show --stat --name-only HEAD | grep -c 'v4/a.js')" = 0 ] && echo "ok   commit contains only owned files" || { echo FAIL; fail=1; }
  git checkout -q -b main; echo 3 > prototype/docs/d.md
  t 1 bash "$S" --owner D -m "docs: to main" --push
  t 1 bash "$S" --owner D -m "docs: to main" --push --to-main
  bash "$TOOLS_DIR/claim.sh" release docs --owner D >/dev/null; t 1 bash "$S" --owner D -m "no claim"
  cd /; rm -rf "$T"; [ $fail = 0 ] && echo "commit-owned.sh self-test PASS" || { echo "commit-owned.sh self-test FAIL"; exit 1; }; exit 0; fi
owner="" msg="" files="" push=0 tomain=0 tfile="" dry=0 snap=0
while [ $# -gt 0 ]; do case "$1" in --owner) owner="$2"; shift 2;; -m) msg="$2"; shift 2;; --files) files="$2"; shift 2;; --push) push=1; shift;; --to-main) tomain=1; shift;;
  --trailer-file) tfile="$2"; shift 2;; --dry-run) dry=1; shift;; --allow-failing-snapshot) snap=1; shift;; *) die "unknown arg $1";; esac; done
[ -n "$owner" ] && [ -n "$msg" ] || die "--owner and -m required"
case "$msg" in WIP*|wip*) [ $snap = 1 ] || die "message may not start with WIP (blind snapshots are banned). Use a real message, or --allow-failing-snapshot for a deliberate failing checkpoint (never pushed)." 1;; esac
[ $snap = 1 ] && { [ $push = 1 ] && die "failing snapshots are never pushed" 1; msg="[SNAPSHOT-FAILING] $msg"; }
cd "$ROOT"; branch="$(git branch --show-current)"
pats=""; for f in "$LOCKS"/*.lock; do [ -e "$f" ] || continue; [ "$(lockval "$f" owner)" = "$owner" ] && pats="$pats,$(lockval "$f" files)"; done; pats="${pats#,}"
[ -z "$pats" ] && [ -z "$files" ] && die "owner $owner has no live claim and no --files: nothing to commit safely" 1
own=(); while IFS= read -r -d '' ent; do p="${ent:3}"; [ "${ent:0:1}" = R ] && p="${p#* -> }"
  if [ -n "$files" ]; then IFS=, read -ra F <<<"$files"; for g in "${F[@]}"; do [[ "$p" == $g ]] && own+=("$p"); done
  else IFS=, read -ra F <<<"$pats"; for g in "${F[@]}"; do [[ "$p" == $g ]] && { own+=("$p"); break; }; done; fi
done < <(git status --porcelain -z)
[ ${#own[@]} -gt 0 ] || die "no changed files match your claim/--files" 1
staged="$(git diff --cached --name-only)"; for s in $staged; do ok=0; for o in "${own[@]}"; do [ "$s" = "$o" ] && ok=1; done; [ $ok = 1 ] || die "pre-staged file not yours: $s (unstage it: git restore --staged -- $s)" 1; done
echo "committing ${#own[@]} owned file(s) on $branch:"; printf '  %s\n' "${own[@]}"
if [ $push = 1 ]; then case "$branch" in main|master) [ $tomain = 1 ] || die "refusing to push to $branch without --to-main" 1
  lf="$(jq -c 'select(.event=="end" and .kind=="full")' "$LEDGER" 2>/dev/null | tail -1)"; [ -n "$lf" ] || die "no full ledger run: cannot push to $branch" 1
  [ "$(echo "$lf"|jq -r .verdict)" = clean ] && [ "$(echo "$lf"|jq -r .tree_end)" = "$(v4_hash)" ] || die "latest full run is not clean on the current v4 tree: cannot push to $branch" 1;; esac; fi
[ $dry = 1 ] && { echo "dry-run: stop here"; exit 0; }
body="$msg"; [ -n "$tfile" ] && body="$body

$(cat "$tfile")"; [ -z "$tfile" ] && [ -n "${COMMIT_TRAILER:-}" ] && body="$body

$COMMIT_TRAILER"
git add -- "${own[@]}" && git commit -q -m "$body" -o -- "${own[@]}" && echo "committed $(git rev-parse --short HEAD)"
[ $push = 1 ] && { git push origin HEAD && echo "pushed $branch"; }; exit 0
