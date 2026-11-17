# Diagnosis: grader G6 "backup text contains the whole state" (read-only debug, no repo edits)

## Verdict
REPRODUCED. Cause is a GRADER RACE in the shared page helper `load()` (grader/sync-grade.js:84-91, same pattern in other graders' load()), triggered by the grader's AUTO_EXPAND observer (grader/grade.js:85-90). Not an app data bug. The G6 sequence (#add, reload, dark/light, Export) is innocent: the wrong state is already there when load() returns.

## What differs
Failing run: backup has 36 houses (the app's default `E.seedPlan()` portfolio, ids sycamore, maplex, ... lostcreek) instead of the 14 houses of `E.seed()` (sampleS, ids auto, north, syc, keystone, harbor, freight, lake...). Backup length 26699 is constant because it is always the serialized default plan (+ saved list); a passing run gives 10814 chars for the 14-house sample. So hypotheses 1 (draft house at #add), 2 (ADDITIONS append), 3 (debounced save/other tab) and 4 (numInput/soft redraw) are all ruled out: state/localStorage/DOM all agree on 36 houses at export time and the app is behaving correctly for the data it was given.

## Mechanism (file:function:line)
1. grader/sync-grade.js `load()` line 84-91: `page.goto(app)` with empty localStorage -> app boots page 1 with `E.seedPlan()` (app.js:58) and renders.
2. grader `page.evaluate(...)` clears localStorage and writes the sample S into 'rep-v4' (line 87). Page 1 is still alive.
3. The context's AUTO_EXPAND MutationObserver (grade.js:85-90, installed by mkCtx) keeps clicking one collapsed [data-coll] section per tick while page 1 renders. Each click runs the app handler app.js:1310 (`UI.coll[id] = !cur; ... save()`), and `save()` (app.js:91) writes page 1's in-memory S (the 36-house default) to 'rep-v4'.
4. If one of those queued clicks lands after step 2 and before the 2nd `goto` (line 88), localStorage holds the default plan; page 2 boots from it (valid v21 save, nothing to migrate) and the whole test runs on 36 houses instead of 14.
5. Under CPU load page 1 renders its collapsed sections later (slower chain of mutation-observer clicks), so the window is hit in full runs when machines are busy, not in an idle slice.

Evidence (scratchpad g6dbg/, Playwright against a copy of v4, CPU throttle 4x + 3 busy loops):
- Full G6 sequence x ~14 iterations: 2 failures (expected 14, backup 36, len 26699, extra ids = seedPlan ids, missing = sample ids). 0 failures at 5 idle iterations.
- load() only, AUTO_EXPAND on, 4x throttle: 4 of ~25 and 2 of 25 runs ended with state houses = 36.
- Same, AUTO_EXPAND off (NOAUTO=1): 0 of 25.
- Probe: reading localStorage in page 1, 150 ms after the grader's write, already showed 36 houses in the failing runs, i.e. the overwrite happens before navigation.

Why only G6 notices: it is the one sub-check comparing houses.length against the intended sample; the digest checks derive their ids/routes from S and are tolerant. Other graders using the same load() pattern (design-grade.js:22, gesture-grade.js:24, info-grade.js:36, numbering-grade.js:45, finance) can be hit silently (a different portfolio than intended) without failing. Possibly related to other "intermittent" failures.

## User exposure
None found. A real user has one page; the clobbering needs two live pages of the same origin where the older page keeps saving (e.g. an old tab open while another tab restores a backup). app.js:1403 only listens to storage events for the example-edits key, not 'rep-v4', so a stale tab saving (any collapsible toggle, field edit) overwrites a newer tab's portfolio (last write wins). That is a separate, pre-existing multi-tab hazard; G6's "second tab" sub-check does not cover a stale-tab WRITE. Optional hardening, not needed for this fix.

## Recommended fix (grader only, not implemented)
In the `load()` helpers: set localStorage from a same-origin URL that does NOT run the app (e.g. `page.goto(base()+'/manifest.webmanifest')`, then evaluate the localStorage writes, then goto the app), so no page-1 app instance exists to overwrite it. Alternative: in the init script/observer, set `window.__noExpand = true` until the 2nd navigation (observer already honours it), or `await page.goto('about:blank')` is NOT enough (no origin storage) so use the manifest route. Also make load() assert `window.__app.state.houses.length === S.houses.length` (retry once, then throw with ids) so a wrong start state can never silently pass.

## Regression check to add
1. In every `load(page, S, hash)` helper: after waitForSelector, evaluate `window.__app.state.houses.map(h=>h.id).join()` and compare with `S.houses` ids; throw 'load: app booted from a different portfolio' on mismatch (when S has houses).
2. A grader self-test: run load(sampleS) 30x with `Emulation.setCPUThrottlingRate` rate 4 (CDP) and assert 0 mismatches (RED before the fix: ~10-15% mismatches on this machine under load; GREEN after).

## Not verified / notes
- I did not run the real graders or edit anything; scratch scripts: /tmp/claude-0/-home-user-Real-estate-portfolio-/7dc1946d-079b-5fd1-ab6e-c2df61093438/scratchpad/g6dbg/{run.js,load.js,load2.js}.
- The ledger failures 20261117T034743-5428, 20261117T021027-23911 and impl-retarget's first full run fit this signature (length 26699 = default plan); I did not open their logs beyond the report text.
- The uncommitted keyboard/numInput work in the tree was not involved.
