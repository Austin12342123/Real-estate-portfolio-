# Diagnosis: number keyboard drops to the letter keyboard (iPhone)
Read-only diagnosis, no repo edits. Scratch copy: /tmp/claude-0/-home-user-Real-estate-portfolio-/7dc1946d-079b-5fd1-ab6e-c2df61093438/scratchpad/diag-kb (static server, Playwright chromium, devices['iPhone 13'], serviceWorkers blocked). Scripts: scratchpad/pk.js (per-key same-node test), tap.js (box-to-box), explore.js (input inventory). No grader/stamp/build run.

## Root cause (reproduced)
1. 700 ms debounce commit that re-renders the focused box: app.js:1166. In the `input` handler, a plain number (not math, not %, not a months box with a date hint, not the Buy-position box) sets `pendT = setTimeout(... setField(p, el.value) ... save(); render())` after 700 ms of no typing. render0() does `app.innerHTML=''` and rebuilds, so the focused `<input>` is destroyed; app.js:930 then calls `el.focus()` on the NEW node and restores value/caret. On iOS a node removal dismisses the keyboard, and a programmatic focus() brings back the default keyboard layer (letters) instead of the 123 layer the person had switched to. This is exactly "occasionally ... drops out and reverts to the letter keyboard": it happens whenever you pause ~0.7 s while typing (read the number, think, look at the hint).
2. Box-to-box tap: focusout handler app.js:1186-1201 commits (`liveCommit`) and, when the next target is another data-p input, runs `setTimeout(render, 0)` (1193/1201), which destroys the box you just tapped and re-focuses a new node (930). Keyboard flickers/resets on every hop between number boxes when the first box changed.
3. Number boxes are `inputmode="text"` (app.js:198 and :346, :507), deliberately so math like `650*3` can be typed. So iOS never offers the numeric pad automatically; people tap the "123" key, and every re-render (1, 2) resets that to ABC. (Design decision to confirm, see Recommendation.) Read-only calc boxes use inputmode=decimal (198) but are readonly.
Text boxes are already fixed (txtInput, E17). Number boxes were not audited.

## Per-key reproduction (iPhone 13 emulation, insertText, same-node check via marker property)
Per key with 60 ms gaps: no drop. After a 900 ms settle: node replaced + focus moved to a new node for every plain number box (table). Enter/blur: after Enter the focus is dropped to BODY (expected, blur(); keyboard closes by design, 1373).

| input kind | attributes | what re-renders | reproduced? | file:line |
|---|---|---|---|---|
| Asset price, down payment %, down $, growth, capex $, capex months, ARV, gain, liftIncome (house page; also rent/other money boxes inside collapsed sections, same `field()`) | type=text inputmode=text data-num enterkeyhint=done autocapitalize/autocorrect off | 700 ms idle: setField+save+render() replaces node, focus() on new node (feeds synced dependents: loan, down$, ratios) | YES: price, dp, down, growth, capex, capexMonths, arv, gain, liftIncome on maple and cedar: node replaced + focus restored on new node after idle | 1166, 930 |
| Finances: gross, hours, raise, tax, cash, cashApy, emergencyMonths, living, housing, inflation, otherDebt | same | same | YES (all except job end/start, which show a date hint and are exempt) | 198, 1166 |
| Assumptions g.cap, capBiz, haircut, closing, hrate, refiRate, refiTermY, p1, p2, dti, rentCount, otherDebt, vac, mgmt (manager %), maint, appr, planYears | same | same | YES, all 17 | 198, 1166 |
| Months/date boxes (buyIn, end, start, wait, paid, exitMonth) with `.dh` hint | same | no 700 ms commit (hint exempts); commit on blur | NO on idle (ok); but blur path below applies | 1166 (`!dh`) |
| Buy position (`pos`, house page and Move-to box on order page, 36 boxes) | inputmode=text data-num | POSBOX exempt from debounce; commits on blur/Enter | NO on idle (ok); blur path below applies | 507, 1148, 1166 |
| Extra payment / month box | inputmode=text data-num data-pre=$ | same debounce as plain numbers (not exempt) | YES by code path (same handler); not browser-tested separately | 346, 1166 |
| Add flow example-editor boxes (`x.` fields via X(k)) | same field() | same debounce: setField -> exSetField, then render() | Same code path, NOT separately run (editor needs a chosen example) | 743-750, 763, 1166 |
| Box-to-box tap (any number box -> another data-p box after a change) | - | focusout: liveCommit then setTimeout(render,0); new box replaced | YES: price->dp, dp->down, capex->capexMonths, price->growth all land on a NEW node (marked old node gone) at +50 ms and +350 ms | 1193, 1201, 930 |
| Name/text boxes (addr, job/planned/capital names) | type=text autocorrect/capitalize on | none while typing (txtInput); render on blur | NO (fixed E17) | 1168-1174 |
| Saved name / rename / bug description | type=text / textarea | input handler returns early, no render | NO | 1159 |
| Date input (Bought on) | type=date | change handler | not tested; native picker, not a keyboard | 614 |
| Selects (loan option, merge, ex-loan) | select | change -> render | n/a, no keyboard | 541, 548, 751 |
| Textareas (backup out/paste, listing paste, bug text) | textarea | no handler renders on input | NO | 850-852, 894, 1042 |
| Import/backup file inputs | type=file hidden | n/a | n/a | 851, 892 |

## Other things checked (not the cause)
- Per-key: nothing is committed or re-rendered while typing; only the hint (placeHint, 167) is inserted/removed inside `.iw` with insertAdjacentHTML (a sibling insert, not a replace). Low risk, but the hint sitting inside the same `.iw` shifts layout when it appears.
- Number formatting rewrites `.value` only on blur (fmtBox in focusout, 1199); not mid-typing. No comma/%/$ rewriting while focused, so no caret jumps. Caret restore after render at 930 only runs because of the bug above.
- scheduleMonitor/runMonitor (1007, 500 ms): contains no render(). SW `controllerchange` handler does `location.reload()` with no USED guard (1379): a new service worker taking over an installed PWA while typing reloads the page and drops the keyboard (low frequency; not reproduced; the `USED` guard at 19/1005 covers only the heal path). 'storage' listener (1375) skips rendering when an INPUT is focused (ok). Undo toast timer (1105) only removes a node. No resize/visualViewport/scroll handlers exist.
- Enter key blurs the input (1373), so the keyboard closes by design.

## Recommendation: ONE general fix, numInput() (mirror of txtInput)
- While a number box is focused, NEVER call render() or replace any node (remove the 700 ms `pendT` render at 1166 and the `setTimeout(render,0)` hop at 1193/1201 for next-focus targets).
- Keep the pre-blur dependents live in place: on input (debounced or immediate) call setField+save, then update only the dependent displays by value (down $/%, loan, hints, KPI cells) via a targeted `refreshDerived()` that writes `.value`/text of OTHER nodes (skip document.activeElement), or just defer all dependents to blur/Enter.
- On blur to another data-p box, commit and update dependents in place, do not render; render only when the new focus target is not an input (deferRender as today) or on Enter/Back/leave.
- Delete the focus-restore for inputs at 930 (nothing re-renders while focused, so nothing to restore; keep it only for buttons/selects).
- Keep enterkeyhint=done and autocapitalize/autocorrect/spellcheck off. Inputmode: product decision needed. Math (`650*3`, `5/0`) is a requirement, so inputmode=decimal/numeric would remove `* / + -` on iOS (decimal pad has no operators). Options: (a) inputmode=text only for boxes that accept math, inputmode=decimal for boxes where math is not meaningful (months, position, %, rates, counts, years); (b) keep text but make the fix above so the 123 layer is never reset. Default recommended: (b) now, plus (a) for non-math boxes, since the person is typing plain numbers. Do not change this silently (money/units semantics unaffected, keyboard only).

## Regression checks to add (RED first on the current tree)
1. every-input-attribute scan: for every `#app input` (all routes: main, house with all sections expanded, finances, assumptions, add incl. example editor, order, settings): assert type/inputmode is one of {text with autocorrect attrs for name boxes, numeric inputmode decimal/numeric/text for data-num boxes (explicit allow-list per `data-p` pattern)}, every data-num box has enterkeyhint=done and autocapitalize=off; fail on a missing inputmode, or inputmode=text on a box in the non-math list. RED now: all data-num boxes are inputmode=text.
2. per-key same-node check on EVERY data-num box on every route (use the pk.js approach): tap, mark node with a property, insert one digit at a time (60 ms) AND once with a 1000 ms pause after the 2nd digit, assert after every key and after the pause that document.activeElement is the marked node, the node is still in the DOM, and its attributes (minus value) are unchanged, and window.__app.renders did not increase. RED now: fails on all plain boxes after the pause (list above).
3. box-to-box tap: for the pairs price->dp, dp->down, capex->capexMonths, rent-like->price, mgmt->maint, cash->living: type a digit, tap the other box, assert the tapped box node is the one marked before the tap and renders did not increase while focus is in an input; assert dependents (down $, loan, KPI) show the committed value after the hop.
4. Dependents: typing in price/rent/dp%/down$/budget/ARV/mgmt%/rate then pausing: derived boxes (down $, loan, hints) update without the focused node changing.
5. Escaped-defects row (E18) + requirements-ledger line "number boxes never re-render while focused".
Run via tools/run-grader.sh slice only (Add the checks to J53's neighbour, same area as the txtInput check).

## Could NOT verify
Real iOS keyboard behaviour (Safari/PWA numeric pad, 123-layer reset, focus() after node removal). Chromium emulation only proves the DOM mechanism: node replaced + programmatic refocus after the 700 ms idle and after a box-to-box tap. The Extra panel and the Add-flow editor boxes were inspected by code only, not typed in. SW-update reload and visualViewport effects not exercised.
