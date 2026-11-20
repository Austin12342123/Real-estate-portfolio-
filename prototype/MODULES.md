# Modules of the v4 app

Teams: **Platform** (storage, boot, build, hosting), **Core Engine** (loans, plan, trust, buy order, seed data), **Experience** (screens, inputs, popovers), **Finance** (money views, taxes, assumptions), **Quality** (diagnostics, bug report, graders, differential tests).

## How to build
- Edit the pieces under `prototype/v4/src/engine/` and `prototype/v4/src/app/`. **Never edit `v4/engine.js` or `v4/app.js` by hand: they are generated.**
- `cd prototype/v4 && python3 build.py` joins the pieces (file-name order) into `engine.js` and `app.js` and restamps them. `python3 build.py --check` fails if a bundle is stale. `python3 stamp.py --check` checks the stamp AND the bundles.
- Each folder is ONE closure cut into consecutive pieces: `00-head.js` opens the `(function(){` and `99-tail.js` closes it. Pieces share scope exactly as before, so order matters (a `const` must come before code that runs it). Nothing is added between pieces.
- Outputs (committed): `v4/engine.js`, `v4/app.js` (`v4/info.js` and `v4/style.css` are edited directly, not generated). `index.html`, `sw.js`, `.github/workflows/pages.yml`, `build-artifact.py` (-> `artifact.html`) and all graders use these files unchanged.
- After editing: `python3 build.py && python3 build-artifact.py` (the second restamps and writes `artifact.html`).
- Proof of "no behavior change" for the split: `node prototype/grader/engine-diff.js [OLD_REV]` (default `09eaacf`) compares plan(), finance(), feasible(), checkList(), todayTotals(), shortfall(), afford() as JSON byte for byte on 40 seeded/varied portfolios.
- Formatting: prettier 3 `--single-quote --print-width 110` (one-time; keep new code under ~110 columns).

## Engine (`v4/src/engine/`)
| file | holds | team |
|---|---|---|
| 00-head.js / 99-tail.js | file comment, IIFE open/close, `module.exports` / `window.Engine` | Platform |
| 10-catalog.js | GDEF defaults, TYPES, LOANS and MFLOANS preset catalogs, loan lookups | Core Engine |
| 20-asset.js | asset DEFAULTS, mfDefaults, applyLoan, newAsset/newHouse, ARV helpers | Core Engine |
| 30-loans.js | payment/amortization/balance, NOI, refi, payoff, locMonths, extraFor, view | Core Engine |
| 40-taxes.js | personal profile, tax brackets, jobs income, depreciation, sale tax | Finance |
| 50-plan.js | `plan()` month-by-month simulation (one 31 KB function) | Core Engine |
| 55-finance.js | realPlan, stress, `finance()`, finToday, afford | Finance |
| 60-trust.js | cap rules, `feasAsset`, `feasible()` (can-I-buy-this, trust funding order) | Core Engine |
| 65-checks.js | `todayTotals()`, health checks `checkList()` | Quality |
| 70-shortfall.js | `shortfall()` (what is missing to buy an asset) | Core Engine |
| 72-normalize.js | normalize, fromListing (import), without, netCosts | Core Engine |
| 80-seeds-samples.js | sample portfolios seedStretch/seedBig/seedStradella | Core Engine |
| 82-seeds-plan.js | lostCreek/premierGC, **ADDITIONS (append-only)**, applyAdditions, seedPlan, seed | Core Engine |
| 85-buyorder.js | numbering, orderByBuy, relink, duplicate, reorder, moveTo | Core Engine |
| 90-examples-data.js | EXAMPLES (16 typical purchases) data | Core Engine |
| 92-examples-api.js | example overrides, check/effective values, warnings, metrics | Core Engine |
| 95-diag.js | `E.Diag`: safety copies, invariants, bug report text | Quality |
| 98-api.js | jobDefault/jobMoney, the exported `E` object | Core Engine |

## App (`v4/src/app/`)
| file | holds | team |
|---|---|---|
| 00-head.js / 99-tail.js | file comment, IIFE open/close | Platform |
| 10-diag-boot.js | diagnostics core, error capture, build-stamp mixed-version heal | Platform |
| 20-state.js | state S/UI, DATA_V, load + migrations + ADDITIONS apply, save, backups, hash routing | Platform |
| 25-format.js | `$f/$s/$k` formatters, date helpers, `RepDate` | Experience |
| 30-calc-hints.js | calculator-style field evaluation (`calcEval`, `perEval`) and hints | Experience |
| 35-info-popover.js | info (i) popover | Experience |
| 40-widgets.js | `lblOf`, `imFor`, `field`, `kpi`, `colSec`, `confirmBox`, net-worth chart | Experience |
| 45-planned-helpers.js | buy panel, verdict, shortfall and job-money rows, math notes | Experience |
| 50-planned.js | Planned/Real main screen `main()` (44 KB, one function) | Experience |
| 55-buy-order.js | buy-order page | Experience |
| 58-saved.js | Saved portfolios page | Experience |
| 60-asset-editor.js | asset editor `house()` (46 KB, one function) | Experience |
| 65-finances.js | Finances screen and its chart | Finance |
| 70-add-flow.js | Add-asset flow, examples editor | Experience |
| 75-settings.js | Settings / assumptions, scenarios, clear/load | Finance |
| 78-import.js | listing import page | Experience |
| 80-render.js | `render`, `render0`, `patchAround` | Platform |
| 82-bug-report.js | bug report, safety card, anomaly monitor, service-worker refresh, notes | Quality |
| 85-edit-actions.js | `setField`, undo, showPage, save/load saved | Experience |
| 88-inputs.js | text/number inputs (`txtInput`, `numInput` handlers), input/change listeners | Experience |
| 90-clicks.js | the single delegated click handler | Experience |
| 92-drag-reorder.js | drag/reorder of the buy order | Experience |
| 95-gestures-boot.js | swipe-back, key handling, first render, service worker, `window.__app` | Platform |

## Known limits
- `50-plan.js`, `60-trust.js` (31 KB), `50-planned.js` (44 KB) and `60-asset-editor.js` (46 KB) are over ~30 KB because each is one large function; splitting them needs function-level refactoring (later work).
- `info.js` (50 KB glossary) is not split.
