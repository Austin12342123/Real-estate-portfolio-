# TEMPLATE: bug-fixer (user-reported or grader-reported defect; WRITES files)
<COMMON HEADER>
TYPE: bug-fixer.
Extra required fields:
- Defect statement in the user's words + steps to reproduce + expected vs actual.
- STEP A (before any fix): write a failing regression check (grader check or node test) that reproduces it; run it via run-grader.sh slice 'checks:ID' and cite the RED run id. No red = not reproduced = ask.
- STEP B: root-cause note (3 lines: where, why it escaped, which gate should have caught it) appended to playbook/escaped-defects.md BEFORE the fix ships.
- STEP C: smallest fix; rerun the regression check (GREEN run id) + the affected slice + one full run.
- Scan for siblings: grep for the same pattern elsewhere; list hits (fixed or deliberately not).
- Never loosen an existing assertion to get green.
