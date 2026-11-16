# agent-a8317d7c9da552ed6: Fix updates resurrecting removed assets

**Grade B (83.3/100)** | type: implementer | started 2026-11-14T03:45:49.711Z | wall 39.8 min, active 39.8 min | tools 36 | out tokens 23k | est cost $1.79

**Top issue:** Fixed updates resurrecting removed assets; introduced ADDITIONS (append once) and DATA_V rule that became CLAUDE.md standing rule.

## Scores
| dimension | weight | score |
|---|---|---|
| Effectiveness (25) | 25 | 85 |
| Accuracy/honesty of report (20) | 20 | 88 |
| Verification rigor (15) | 15 | 80 |
| Efficiency (15) | 15 | 70 |
| Instruction adherence/scope (15) | 15 | 90 |
| Final-state hygiene (10) | 10 | 85 |

## Task

Fix updates resurrecting removed assets. Prompt length 4207 chars. First prompt line: _Work in /home/user/Real-estate-portfolio-/prototype (vanilla JS PWA v4: v4/engine.js, app.js, info.js, style.css; graders in grader/; bundle: `cd v4 && python3 build-artifact.py`; full grade: `cd grader && NODE_PATH=$(npm root -g)_

## Prompt quality

Clear user report quoted; flaky list given.

## Process trace and metrics

36 tools, 39.8 min, 4 full + 7 slice runs (22 invocations, 23 min), 2 builds, 0 screenshots.

Measured: tools {"Bash": 34, "Monitor": 1, "SubagentHandback": 1}; graders full/slice 4/7, grader wall (foreground only) 23.1 min; builds 2; png views 0; tool errors 2; re-read files (>2x): 0; idle gaps >12 min: []; concurrent agents (overlap min): []; hand-backs 1.

## Instruction adherence

Obeyed; wrote ADDITIONS pattern.

No commit/push/add by the agent (checked all Bash commands).

## Claims vs reality

Honest about three flaky checks (G1/G2/G8, F3 sub-checks) without root cause.

Final report excerpt: _The fix is in and the full grader reaches 100% in every category (A-E 85/85, F 90/90, G, H, I, J, L all 100/100). Nothing is committed or pushed, and I did not touch cloud or network settings.  Three flaky checks failed on separate full runs and passed on rerun. These were G1 and G2 (one run, G also passed alone with S_

## Escaped defects (user-reported later)

Pattern good; its own G1/G2/G8 "flakes" are consistent with concurrent grader runs.

## Efficiency

Estimated waste: ~8 min (~$0.36). Waits on 15-min graders.

## Improvements

- Standardise the ADDITIONS/DATA_V recipe in a script and test it in grader (A35 exists).
