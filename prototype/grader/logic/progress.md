# Progress notes (round 2)

- Engine: `v4/engine.js` (loanPath/refi, capOf, reimbOf/nnn, cfAt/savedBy, depCum, portTaxAt, saleTax, housingAt), `v4/app.js` (fields, notes, tax lines, refi note), `v4/info.js` (glossary), `v4/style.css` (44px Extra button, badge contrast).
- Default plan regenerated with `logic/gen-plan.js` (20 assets, $126.1M at 28 years, business/home/commercial growth 4%).
- Older small sample (`E.seed`, Load realistic sample button) kept with commercial tenant repayment 0 so its numbers are unchanged; cash raised to $100k so its verdict stays Tight.
- Genuine app bugs found by the suite fixes: drag reorder could not move a taller row above a shorter one (now uses finger position); first asset of a category showed a wait line when planned.
- Test drift fixed in grade.js, gesture-grade.js, finance-grade.js, sync-grade.js, info-grade.js (no thresholds changed).
- Sources: 42 read (S1-S43, S19 withdrawn). Unverified checks carry 0 points.
