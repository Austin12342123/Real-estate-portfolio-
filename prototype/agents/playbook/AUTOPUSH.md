# AUTOPUSH: publish every resolved card right away

Austin's standing rule (Nov 25, 2:03 PM): "You should start publishing every resolved task to the application."

A card that is finished, tested and graded clean is merged to `main` and published to the live app right away, one card at a time. No waiting for a batch, a later card or a separate yes.

## The gate (all must hold, on the exact tree being published)
1. A FULL grader run with verdict `clean` in `agents/ledger/grader-runs.jsonl`, whose tree hash (`sha1` of app.js engine.js info.js style.css sw.js index.html, first 12 hex) equals the commit being pushed.
2. `python3 prototype/v4/stamp.py --check` and `build.py --check` pass on that commit.
3. `npx vitest run` passes.
4. The push to `main` is a fast-forward of a commit the ledger run covers. If `main` moved, merge `main` in, rebuild and rerun the full grader first.
5. Nothing it depends on is unmerged. Anything that needs another piece waits for that piece and is named in the hand-back.

## Publish steps
1. `git push origin <commit>:main` (fast-forward).
2. Republish the Artifact (`prototype/v4/artifact.html` from that commit) to https://claude.ai/artifact/2AFJisJSWV961ui5sRvrLs.
3. Check the GitHub Pages run for that commit.
4. Report the ledger run id, the commit, the Pages run and the Artifact version in the hand-back to Austin.

## If a card cannot publish
Do not hold it silently. Say which card and why in the hand-back: a merge conflict, a failing check (name it), a missing dependency, or an unverified edit after the clean run (UNVERIFIED TAIL).

## Still needs Austin's yes
Server sync, hosting changes, paid services, deleting data, rewriting git history, and any change to network or permissions.

## What does not change
- Never push `main` without the clean full run above. A failing snapshot never goes to `main`.
- Never replace a user's portfolio in a migration.
- A failing check is never "known flaky": rerun it alone twice, log the run ids, diagnose.
