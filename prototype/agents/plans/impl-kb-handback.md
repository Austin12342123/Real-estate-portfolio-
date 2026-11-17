Task: "Occasionally when typing a number, the keyboard will drop out and revert back to the letter keyboard"   Owner: impl-kb   Status: DONE-WITH-GAPS

## What changed
- /home/user/Real-estate-portfolio-/prototype/v4/app.js: render0() redraws softly while a data-p box is focused on an unchanged screen: patchAround keeps the focused box and its ancestor chain and swaps all else for a fresh build; falls back to a full redraw if the new screen lacks that box (editor closed). The 700 ms idle commit and the focusout hop remain but no longer replace nodes, so the tapped box is the same DOM node. window.__app.renders counts hard redraws only; softRenders added. Focus-restore for inputs removed (selects keep it). Untouched focused box shows a recalculated value (down $ after a dp% edit) so blur never writes back the old value.
- Keyboards (imFor): dollar boxes and boxes that can go negative (growth, gain, raise, g.appr) stay inputmode=text; months/position/units/counts numeric; other number boxes decimal; Move-to # numeric; all enterkeyhint=done, autocapitalize/autocorrect off, spellcheck false.
- Service-worker controllerchange: no reload while typing; reload 400 ms after leaving the box.
- Graders: ux-grade.js J56-J60 (new); playbook rows E26 and R14. Artifact rebuilt (build-artifact.py, no grader live), tree 020ac627524f.

## Evidence of verification (ledger run ids)
- RED (before fix): ux 20261117T013846-18110 failed J56-J60.
- Final tree 020ac627524f: ux clean 20261117T033154-2884 (incl. J30, J42, J56-J60), design clean 20261117T033804-3639 (K9, K19), main clean 20261117T034214-4345 (A26, A71). Earlier same-logic slices: gest 20261117T020106-21673, G6 alone x2 clean 20261117T021359-24864 and 20261117T021445-25071.
- Full runs: 20261117T021529-25273 failed J30 only; 20261117T031021-839 (tree c26c597aeccb) failed A26, A71, J42, K19, all diagnosed (soft render also ran for date/textarea/editor-close and left stale or missing UI) and fixed, then cleared by the slices above.

## NOT verified
- UNVERIFIED TAIL: NO clean FULL run on the final tree 020ac627524f. Budget used (2 fulls, override). Orchestrator must authorize a third full. Slices not rerun on the final tree: gest, sync, logic, numbering, finance, info.
- Real iOS Safari/PWA keyboard (Chromium emulation only proves the DOM mechanism: same node, focus, attributes, no hard render).
- Numeric pad on math-capable money boxes: impossible (iOS decimal pad has no * / + -); they stay text.

## What could not be done
- Full-run evidence on the final tree (budget).

## Assumptions [ask-user-if-wrong]
- Keyboard attributes as listed above; negative-capable percent boxes stay text because the iOS number pad has no minus. Count/units boxes lose typed math (2*3) on phones.
- Pause commit (700 ms) kept, via soft redraw; values also land on blur/Enter.
- Soft redraw counts separately from window.__app.renders.

## Questions for the user
none

## Failures seen (including "flaky")
- G6 'backup text contains the whole state' failed once inside sync run 20261117T021027-23911; alone x2 clean (21359-24864, 21445-25071); cause UNREPRODUCED, OPEN (not seen in later full runs, where G6 passed).
- J30, A26, A71, J42, K19: real regressions of my first design, fixed as above.
- Integrity: I ran `kill` once on my own python http.server pid (debug server) before safe-kill refused a stale pid; no other process touched.

## Grader edits (assertions/thresholds/tests changed)
- ux-grade.js J36 keyboard assertion: "units box props (inputmode incl.) equal rent box props" -> "equal except inputmode, units inputmode=numeric, rent inputmode=text".
- design-grade.js K9 (line ~176): "unit box inputmode/enterkeyhint/autocapitalize/spellcheck/num equal rent box" -> "same except inputmode; units numeric, rent text".
- No thresholds changed; J56-J60 are new.
