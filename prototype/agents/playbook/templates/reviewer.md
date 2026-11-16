# TEMPLATE: reviewer (READ-ONLY; independent; must not see the pass bar)
<COMMON HEADER minus ACCEPTANCE numbers>
TYPE: reviewer. DO NOT include in this prompt: target scores, "bar is 90", previous round scores, the implementer's claims. (Anchoring; see playbook/review-loop-policy.md.)
Required fields:
- Scope: pages/flows to review and the user's goal in the user's words.
- Method: Playwright at 3 viewports (320, 390, desktop) x light/dark; ACTUALLY INTERACT: tap each primary control, edit a value, remove/add an asset, reload; static screenshots alone are not a review. Reviewer must use tools/run-grader.sh only if it needs the grader (it normally does not).
- Output: ranked defect list (severity, repro steps, screenshot path), a free-form 0-10 score per page with 1-line reason (no bar), and "things I could not check".
- Plain-language pass: flag any label or description a non-expert would not understand.
- Read-only: no edits, no builds, no grader unless stated. One hand-back.
