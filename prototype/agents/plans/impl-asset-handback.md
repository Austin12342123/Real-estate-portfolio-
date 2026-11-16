# HAND-BACK

Task: asset-page batch (property manager per asset, cap rate, budget-driven appraisal, Rent increase, Sale card first + page order audit, Impact box reconciliation, Bought on date, false "portfolio replaced" banner)   Owner: impl-asset   Status: DONE-WITH-GAPS

## What changed
- /home/user/Real-estate-portfolio-/prototype/v4/engine.js: mgmtOf now honours a per-asset rate on every non-business asset (null = Assumptions rate, so no existing cash flow changes); new E.mgmtAmt, E.ARV_K (1.4), E.autoArv, E.arvIsAuto; view() gains capNow (NOI x 12 / value) and mgmtAmt; boughtOn on assets (newAsset default null, normalize keeps a valid YYYY-MM-DD only on owned assets, drops it elsewhere, idempotent; business never stores a manager rate). No DATA_V bump, no migration, no ADDITIONS (appended state defaults only).
- /home/user/Real-estate-portfolio-/prototype/v4/app.js: asset page: editable "Property manager (of rent)" % plus read-only $/month (home, commercial, building; blank box = back to the Assumptions rate; a business page says why it has none); cap rate card (h-cap) replaces cash-on-cash; budget edit sets the appraisal to price + 1.4 x budget with an "auto" tag, a typed appraisal overrides it (note says so, "Use auto" button restores); "Rent increase" (business: "Profit increase") with "$470/mo now -> $517/mo after"; Sale card is now directly under the title; Impact box: cash flow and payments in today's terms, each line "without it + this asset + other assets = with it" (data-before/own/other/after), whole portfolio = Planned page + Real page; Bought on date box with "Date not recorded" for old owned assets (future dates refused); Planned -> Owned stores today; diag fix: dgSave drops the old fingerprint when the saved portfolio vanished while the app was open (no false "replaced" banner). Page order: Buy order link moved under the list, Saved list before the clear card, Assumptions lender settings first, Finances month picture before the inputs.
- /home/user/Real-estate-portfolio-/prototype/v4/info.js: caprate (<=450 chars with example, says NOI / value), arv (1.4 rule, auto, override), liftincome renamed Rent increase, mgmt, cashflow (net profit of all assets in the trust), impact, boughton; cash-on-cash entry removed. style.css: small "asset-page batch" block (date box, impact lines; tokens only) placed before the examples block. artifact.html rebuilt (python3 build-artifact.py, stamp b5dcc094, no grader live).
- Graders: new A64-A73 in grade.js (see below). Plan audit table: /home/user/Real-estate-portfolio-/prototype/agents/plans/page-order-audit.md. Rows E21, E22 in playbook/escaped-defects.md.

## Evidence of verification (ledger run ids)
- FULL grader clean on the final tree (v4 hash 87a870c8f304, no edit after it): 20261116T175444-25892 (slices 10/10, full 1/1). It contains A64-A73.
- Slices before it (earlier trees): logic 20261116T172821-19319 clean; ux 20261116T173834-21325 clean; sync 20261116T172843-19431 (G2 failed, fixed); info 20261116T173748-21153 (H2 failed, fixed); main 20261116T173209-19987 and 20261116T174243-22425 (A64 failed, fixed); info 20261116T174819-24038 clean and main 20261116T174905-24287 clean (both on the tree that the full run then covered).
- Bug E21 reproduction: Playwright script before the fix showed the banner (count 1), after the fix 0; A72 covers it plus a control (a real replacement still raises the banner). No separate RED ledger run (checks call new functions).
- Own screenshots: none taken by me for the new UI.

## NOT verified
- 320/390/430 light and dark of the new boxes (date input, Impact lines, manager fields) were NOT viewed by me; only the design (K) checks in the full run cover them. 44px: the date box uses .iw (min-height 44px) but was not measured by me.
- No real device; native date picker behaviour on iOS not tested.
- The published Artifact was not updated (publishing is the orchestrator's step).
- Ledger gap: run 20261116T172244-17411 (main) was started by me, then run-grader was killed by my own `timeout 115` wrapper (my mistake), the node grader finished alone; the ledger has a start but no end line for it. It is not cited as evidence.

## What could not be done
- No RED ledger run for A64-A73 (they call E.mgmtAmt, E.autoArv, h-cap, impact-* that do not exist at HEAD).
- Business "property manager": not added as a per-asset box (see assumptions).

## Assumptions [ask-user-if-wrong]
- Manager convention = % of rent collected (the engine's existing mgmtPct); default = Assumptions rate (8%) for every category so no saved asset changes. A business has no per-asset manager (its owner profit is after management; the manager you pay when you do not run it stays in Finances). [ask-user-if-wrong]
- Appraisal rule for the auto value = price + 1.4 x budget (the convention the first four homes use); 203(k) loans keep their own 15%-above-cost rule. An appraisal is "auto" when the flag is set or it equals the rule exactly (so the seeded homes maple/cedar/willow/linden follow a new budget; birch's 109,000 is an override and is kept). Typing the exact auto value counts as auto. Price edits follow only when the appraisal is auto-flagged. [ask-user-if-wrong]
- Cap rate = yearly NOI / current value (price for a planned asset, grown value for a bought one; business: owner profit / value). The commercial "Cap rate" field in Purchase (NOI / price) is unchanged.
- Impact box scope = the whole portfolio (planned + bought), as before (impl-main's choice, G2 reconciles it with Planned KPI + Real KPI); new reconciliation line: without + this asset + other assets (timing, trust cash; the remainder) = with. Net worth and outside cash show without + this asset = with.
- boughtOn: stored when Status is switched to Owned (today); assets added through "Add something you already own" start with no date ("date not recorded"). Switching back to Planned clears it.
- Page-order changes limited to those in the audit table; Add flow, Real, Buy order and the asset page (apart from Sale) judged already main-first. Import page not audited.
- False banner: fixed in dgSave (a clear while open forgets the fingerprint); the in-memory portfolio is not auto re-saved after a clear (user intent unknown).

## Questions for the user
- Should assets added as already owned ask for the real purchase date at once? Default: no (date not recorded, set later).

## Failures seen (including "flaky")
- All listed failures were my own changes and were fixed: A64 (my test oracle: multi-family default rate, wrong breakdown selector, sign, and a blank box not being allowed: EMPTYOK now includes mgmtPct), A66 ($K row format), A69 (heading element between title and card), A70/G2 (my scope helper called the app's one-argument H with two arguments, then my label markup broke the existing impact reader), G4 (old 1.15 expectation), H2 (orphan glossary entry "payments", removed), K3/K16 (my CSS had been appended after the markers they measure; moved), J44/N* (first run invalid: I edited v4 during it, and it hit its timeout).
- Nothing dismissed as flaky.

## Grader edits (assertions/thresholds/tests changed)
- sync-grade.js ~l.296-301: "cash-on-cash now = yearly cash flow / cash invested" -> "cap rate now = yearly NOI / value" (kpi h-coc -> h-cap); ~l.473-479 hero check same swap (cash-on-cash removed from the app).
- sync-grade.js ~l.447: expected arv after price/capex edit: 1.15 x (price + rehab) rounded to $1,000 for every auto appraisal -> rule(): 0 without budget, 1.15 rule only for 203(k), else price + 1.4 x budget, and a budget edit on a non-overridden appraisal sets it (mirrors the new behaviour).
- sync-grade.js ~l.472: "auto appraisal = (price + rehab) x 1.15" -> that OR price + 1.4 x budget (non-203(k)).
- info-grade.js l.112-113: label regexes /^Cash-on-cash/ ['coc'] -> /^Cap rate (now|while held)/ ['caprate']; /^Income lift/ -> /^Rent increase/; the example check "cash-on-cash $2,400 / $30,000 = 8%" REMOVED and replaced by "cash-on-cash is gone from the glossary"; example label income lift -> rent increase.
- design-grade.js K21: the style.css comparison against HEAD also strips the "asset-page batch" block (same treatment as the can-I-buy block).
- logic-grade.js L10.2: the model-notes text window ended at 'Borrowing</div>'; the notes now sit after the Borrowing section, so it ends at the Backup section (a wider window; every positive assertion kept; the negative ones still hold).
- No numeric threshold, tolerance or coverage floor was changed. integrity-check section A lists these as CONSTANT CHANGE lines (all described above); section B (conduct) not run by the tool (no transcript). I ran no kill (apart from the `timeout 115` wrapper that ended run-grader, disclosed above), stash, reset or direct node grade.js; one safe-kill attempt on a pid that was not mine was refused. Files changed outside the claim: none (CLAUDE.md, PLAYBOOK.md, tools/handback.sh, DEVIATIONS.md, tools/deviate.sh are the orchestrator's). Generated outputs (grader reports, screens, ledger) also changed by runs.
