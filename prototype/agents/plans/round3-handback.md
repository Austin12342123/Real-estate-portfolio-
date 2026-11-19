# HAND-BACK (send exactly once)

Task: net worth today = assets + savings + trust cash; job money saved up override = real cash, counted once   Owner: round3   Status: DONE-WITH-GAPS

## What changed
/home/user/Real-estate-portfolio-/prototype/v4/engine.js: E.todayTotals now returns eq, cash (savings), trust (month-0 trust cash, pl.series.cash[0]) and nw = eq + cash + trust (single definition); engine run() credits the typed job money as real cash once at the first (non-pooled) purchase month: credit = typed - accrued job money (L - today's savings), stored in pl.jobs.credit[t]; finance() adds pl.jobs.credit[t] to the cash balance, so Health reserve/cash check, hero verdict and shortfall follow. info.js: networth and jobsaved (i) rewritten (networth 371 chars, jobsaved 363, both with an example, limit 450). app.js: note under the job box now says "You set this amount: it counts as real cash and replaces the plan's own." artifact.html rebuilt (stamp 5acbc0b3 ok, no grader live). grader/logic-grade.js: new L12.19, L12.20, L10.3 updated. Plan-end figures and gates untouched. No DATA_V bump, no schema change (jobSavedOverride already normalized; Reset to auto = null, unchanged). Plan: agents/plans/round3.md. No commit.

## Per-item checklist
(1) NW today = bought (value - debt - liens - HELOC) + savings + trust cash, in E.todayTotals, used by Planned hero and Real page: DONE; (i) text updated and documented. Plan-end/gates unchanged: DONE (full clean, L12.10 and others pass).
(2) Override is real cash, once, flows through ready-month, shortfall, feasibility, Health cash check, verdict, totals; cleared by Reset to auto; empty = byte-identical: DONE (L12.15/16/20).

## Evidence of verification (ledger run ids)
FULL clean on the final tree f5641660f88e: 20261119T205921-1907 (exit 0, 2538 s). artifact.html rebuilt after it with no grader live, tree hash unchanged (f5641660f88e), no unverified tail.
RED (new checks failing before the engine change): L12.19 and L12.20 FAIL in 20261119T204449-444 (log output.log; the ledger verdict column says "clean" because the logic slice verdict ignores them, read the FAIL lines in the log). GREEN: logic 20261119T204526-618 and 20261119T204603-760, info 20261119T204624-866.

## NOT verified
Real iPhone/iPad Safari: nothing run on a device. The design slice alone timed out (20261119T204705-1049, 601 s, exit 124, no assertion result; its K checks ran inside the full run instead). No UI check types an override and then reads the Health row on screen (logic-level only: fin.kpis.minLiquid and fin.series.liquid). Trust cash at month 0 cannot be non-zero in the real engine (a sale needs month >= 1), so L12.19 injects pl.series.cash[0]; in every natural state today's trust cash term is 0 and the hero numbers are unchanged. No separate escaped-defects row (decision change, not a bug).

## What could not be done
none.

## Assumptions
[ask-user-if-wrong] Trust cash today = the engine's month-0 trust cash (series.cash[0]); it is a separate pot from S.p.cash, so no double counting; it is 0 today in practice (reinvested cash flow and sale proceeds only appear from month 1).
[ask-user-if-wrong] Override timing: for the FIRST (non-pooled) purchase the typed amount replaces the job money accrued so far for the purchase decision (unchanged rule: savings above cushion + typed) AND the personal cash balance is adjusted by (typed - accrued) at the purchase month, once. So typing more than Auto adds cash, typing less (e.g. 0) removes the accrued job money. I credited personal cash (not trust cash) because the first purchase is paid from personal cash before any trust exists. Not credited into today's net worth (it is money saved by the purchase date, not held today). If never bought (unfunded), nothing is credited. Override on a later (pooled) asset is still ignored, as before.
The plan-end net worth does not include personal cash (unchanged definition), so a large leftover typed amount shows in the cash balance / Health, and in net worth only through the earlier purchase.

## Questions for the user
1. Should a typed amount lower than Auto remove cash (current: replace), or only ever add? Options: replace (default) / add only (max(typed, accrued)).

## Failures seen (including "flaky")
Design slice timeout 20261119T204705-1049 (see above), not a check failure. L2.7 (0 pts, UNVERIFIED label) shows as FAIL in logic output in every run including the baseline; unchanged. No other failures.

## Grader edits (assertions/thresholds/tests changed)
logic-grade.js L10.3: required /without your savings/ in INFO.networth -> also requires /cash the trust holds today/ (stricter); name text "the big today figure adds them" -> "adds savings and the cash the trust holds". New L12.19 (NW today, 7 states) and L12.20 (override real cash once, 1,000 step test, Health, reset, totals, round trip). L12.14 and L12.15 unchanged (still pass: trust is 0, counted cash = savings above cushion + typed). sync/ux/grade hero readers needed no change (hero values identical in natural states). No thresholds changed, nothing loosened.
