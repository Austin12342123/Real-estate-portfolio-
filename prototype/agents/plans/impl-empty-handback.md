# HAND-BACK
Task: Planned page after Remove with one bought asset says Not yet / Checks / target line (user bug E24)   Owner: impl-empty   Status: DONE-WITH-GAPS (no clean full run on the final tree)

## What changed
- /home/user/Real-estate-portfolio-/prototype/v4/app.js: Planned page with 0 planned but >=1 bought asset returns the neutral card ("Nothing planned yet. Add a home, a commercial property or a business to see your plan.") plus "N bought asset(s) is/are counted on Real" and an "Open Real" link (data-page=real, linkbtn class); no KPI block, chip, Checks, target line or breakdown. State A (no assets) keeps "Nothing added yet.". Remove confirm now says "1 bought asset stays" (count). Undo already existed. Finances verdict card shows chip "Nothing planned" + neutral headline, hides reasons and fixes, when nothing is planned.
- /home/user/Real-estate-portfolio-/prototype/v4/engine.js: E.feasible with 0 planned: no p-funding / p-cltv / p-concentration criteria, verdict 'yes' with headline "Nothing planned yet.", reasons empty, new flag feas.none. E.checkList with 0 planned: no Plan timing, Debt vs value, Concentration, If big earners stop, check-buy or outside-cash rows. Plans WITH planned assets are unchanged.
- No new CSS (existing vchip.yes / linkbtn tokens only); no new warning for 98% debt on Real. Artifact bundle built (stamp 8a886f96 ok per preflight; last build run with no grader live, before the final two full runs).
- Tests: /home/user/Real-estate-portfolio-/prototype/grader/logic-grade.js L12.11, ux-grade.js J55; escaped-defects.md row E24; sync-grade.js edits listed below.

## Evidence of verification (ledger run ids)
- RED before the fix: logic L12.11 failed on HEAD code -> 20261116T235020-6771 (FAIL line L12.11 in log; the ledger verdict field read clean for that run, so the FAIL line is the evidence). ux J55 failed on HEAD code (crashed on the missing empty-note, the first assertion also fails) -> 20261116T235040-6887 and 20261116T235503-7546.
- GREEN: logic L12.11 -> 20261116T235915-8069; ux J55 8/8 and ux slice 100/100 -> 20261117T000801-9292 (two earlier ux runs 20261116T235933-8181 and 20261117T000342-8787 failed only on my own new J55 sub-assertion about the default plan's folded Checks text; fixed in the check, see Grader edits).
- gesture slice clean (I13 alone) -> 20261117T003744-12010.
- Full run 1 -> 20261117T001217-9787: failing G1,G2,G3,I13 (see Failures).
- Full run 2 on the final v4 tree (45436a2dcf4d, same as run 1) -> 20261117T003848-12191: failing G3,G4. NO clean full run exists. "All green" is NOT claimed.

## NOT verified
- UNVERIFIED TAIL: the final edit to /home/user/Real-estate-portfolio-/prototype/grader/sync-grade.js (noPlan branches inside chkFinances, made after full run 2 to fix the G3 crash) was never run; the G3 fix is untested. The genState edit in the same file was run in full run 2 (G1, G2 passed there).
- Not rerun: G4 alone twice; budget was used up (10 slices, 2 fulls). Needs an orchestrator BUDGET_OVERRIDE to run: sync slice once (confirms G3), then a final full.
- Not visually checked: screenshots at 320/390/430 light+dark (J55 asserts no horizontal overflow and a 44px Open Real link; it passed in 20261117T000801-9292).
- Finances page with owned-only assets checked by J55 only (chip text), not by eye.

## What could not be done
- A clean full ledger run: blocked by the G3 grader crash (fixed in grader, untested) and G4 (open, below); budget exhausted.
- No commit or push (not delegated).

## Assumptions
- [ask-user-if-wrong] With nothing planned, Finances hides the personal cash-shortfall reasons and "What would fix it" (the cash lines further down still show lowest cash and runway); the neutral chip reads "Nothing planned".
- [ask-user-if-wrong] "Open Real" link is a text button inside the note, reusing linkbtn.
- The verdict value stays 'yes' (with feas.none) rather than a new verdict value, so no consumer of yes/tight/no breaks; fin.status of the personal cash run is untouched.
- Sync random states: each now keeps at least one planned asset (the old random states could be all bought, which now correctly renders the neutral card).

## Questions for the user
none

## Failures seen (including "flaky")
- G1, G2 in full run 1 and the sync slice 20261117T003237-11358 (and G1/G2/G3 in 20261117T003440-11688): caused by my change, not storage timing. Random sync states with only bought assets now render the neutral Planned page (no KPI block), so Planned-vs-engine comparisons read blanks. Fixed in the grader (genState keeps one planned asset): G1 and G2 passed in full run 2 (20261117T003848-12191). They are not the open storage-timing G1/G2 flake.
- G3 crash "Cannot read properties of undefined (reading 'v')" in runs 20261117T001217-9787 and 20261117T003848-12191 at sync-grade.js chkFinances: two edge cases ("owned cash purchase with an extra", "owned loan already paid off") are owned-only, so the Planned page has no KPI block. Cause diagnosed; fix written after the last run (UNVERIFIED TAIL).
- I13 (hold lifts a row, "#order lifted 0") failed in full run 1 only; clean alone in the gesture slice 20261117T003744-12010 and in full run 2. Rerun alone twice was NOT done (budget); one alone run clean. Diagnosis OPEN (looks like touch timing under load); not changed by this task (reorder code untouched).
- G4 "auto appraisal ... seq19 step4: r3 loan=conv30 -> arv 143000 price 92000 rehab 32000" failed in full run 2 only (passed in full run 1 on the identical v4 tree 45436a2dcf4d). Asset-page property test, unrelated to my edits as far as I can tell; OPEN, not reproduced alone, needs the two alone reruns.
- L2.7 shows FAIL with 0 points (lostcreek cap 9.6, unverified) in every run; untouched by me.

## Grader edits (assertions/thresholds/tests changed)
- /home/user/Real-estate-portfolio-/prototype/grader/logic-grade.js: added L12.11 (1 point, new); no existing assertion changed.
- /home/user/Real-estate-portfolio-/prototype/grader/ux-grade.js: added J55 (8 points, new); inside J55 my own assertion "state C: Yes, Plan timing and Assets you can buy present" -> "Yes, All 10 checks in the safe range, target line shown" (the Checks list is folded in the DOM; the rows are asserted in L12.11). No existing assertion changed.
- /home/user/Real-estate-portfolio-/prototype/grader/sync-grade.js: (1) genState: if every random asset is bought, the last becomes planned (new line; rng draws unchanged). (2) chkFinances: noPlan = no KPI block and "Nothing planned yet" text; kpi-cashflow falls back to +$0, planned extra-now header to $0, afford chip check becomes "no Planned chip and Finances chip = Nothing planned", afford-note check skipped when noPlan. These keep the old expectation (planned totals are $0) for owned-only edge cases; they do not lower any number. Item (2) is untested.
- No threshold, tolerance or timeout changed. No CSS baseline change (no CSS added).
