# TEMPLATE: researcher (READ-ONLY; no repo edits except its own output file)
<COMMON HEADER>
TYPE: researcher.
Extra required fields:
- NETWORK STATE: orchestrator states one of: WebSearch/WebFetch available | NO network (offline). First action: run the connectivity probe `curl -sS -m 8 -o /dev/null -w '%{http_code}' https://example.com` and one WebSearch if the tool exists; report result in the first line of the output file. If dead: STOP after 2 min, hand back BLOCKED (do not spend 9 minutes on 24 failed calls as a877d5/a445df did).
- Every number gets a source label: [verified: URL + access date + quoted snippet] | [snippet-only: search result text, page not opened] | [memory: unverified] | [derived: formula]. Unlabelled numbers are forbidden. Memory-only research must say so at the top.
- Output: one file under agents/ or the path given; table of claims with labels; list of questions it could not answer.
- Target: N sources minimum is a goal, not a licence to pad; report the actual count.
