# TEMPLATE: grader-builder (adds/changes a grader category; WRITES grader files)
<COMMON HEADER>
TYPE: grader-builder. Own: prototype/grader/<file> only (claim it).
Required:
- State what user-visible failure each new check detects. Derive expectations from the app's engine/data, not from copying current text (graders coupled to wording broke 8 times: a4b889, ada109, a13416).
- MUTATION CANARY: for each new check, list a one-line mutation of the app (in a temp copy, never in v4/) that must turn it red (playbook/canaries.md). Run it via a copy of v4 in a temp dir and show the red run id. A check that cannot go red is rejected.
- Never change an existing threshold/assertion except via explicit 'EXPECTATION CHANGE' entry (file, before->after, reason) and orchestrator sign-off. Report every one.
- Run only through tools/run-grader.sh; a slice for iteration, ONE full run at the end.
- New slice must write its own report-<x>.md/result-<x>.json (never report.md/result.json).
