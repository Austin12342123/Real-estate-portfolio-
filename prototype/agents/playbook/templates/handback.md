# HAND-BACK (send exactly once; lint with tools/handback.sh --owner ID --report FILE --final)

Task: <one line, in the user's words>   Owner: <agent id>   Status: DONE | DONE-WITH-GAPS | BLOCKED | NOT-DONE

## What changed
<files and behaviour, 5-10 lines max; paths absolute. Nothing else belongs here.>

## Evidence of verification (ledger run ids)
<each line: claim -> ledger run id (tools/run-grader.sh output) or file/screenshot path. 'Full grader clean: run <id>' is the only way to say "all green". A slice run id supports only its slice.>

## NOT verified
<every screen, device, interaction, category, or edit made after the last cited run (UNVERIFIED TAIL). 'none' only if true.>

## What could not be done
<blocked items and why (network, permission, claim conflict, budget). 'none' if none.>

## Assumptions
<every interpretation I made where the request was not explicit; mark each [ask-user-if-wrong].>

## Questions for the user
<max 3, each with 2-4 concrete options and my default. 'none' if none.>

## Failures seen (including "flaky")
<check id, run id, reproduced alone x2 (run ids) or UNREPRODUCED, my diagnosis or OPEN. Never 'known flaky'.>

## Grader edits (assertions/thresholds/tests changed)
<file, before -> after, why. 'none' if none. Any change that loosens a check needs orchestrator sign-off BEFORE merge.>
