# Research policy (network-limited sessions)
Evidence: a877d5/a445df (18 agent-min, 28 tool errors, nothing verified); realism grader R=30/85 points rests on bench-*.json with 29/31 and 19/21 values `unverified`; a19344 missed its 40-source target (honest); adad88 answered from memory although WebSearch was allowed.
1. The orchestrator states the network state in the prompt: ONLINE (WebSearch/WebFetch usable) | OFFLINE. If unsure, the researcher probes first (curl -m 8 and one WebSearch). Probe fails -> stop within 2 min, hand back BLOCKED with the error. Do not retry 24 times.
2. Cloud/network settings are not changed by agents. If the allowlist blocks a host, the researcher reports the exact host and error; the user/orchestrator decides (environment tools are the orchestrator's, with the user's approval).
3. What CAN be verified offline: arithmetic, internal consistency of the app's numbers, formulas (cross-check two ways), unit tests, tax-law structure the model knows (labelled memory). What CANNOT: current prices, rents, rates, tax tables, listing data, market benchmarks. These stay unverified until a source is fetched.
4. Source labels (every number): [verified: URL, access date, quote] | [snippet-only] | [memory] | [derived: formula] | [user-supplied: date]. Unlabelled numbers forbidden. The deliverable begins with counts per label.
5. Anything labelled memory or snippet-only is shown as "unverified" in the app/grader/report and cannot support a "realism" point (grader-builder follow-up: split verified vs unverified points).
6. Asking the user: for listings (CLAUDE.md rule), anything not found online -> ask BEFORE adding.
7. Sources count is reported as actual; never pad to reach a target.
