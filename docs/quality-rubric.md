# Quality rubric (PM, Nov 20 2026). Austin: "occasionally run grade checks on your agents work to ensure they're doing a good job."
A reviewer who did not do the work grades every build handback before the PM accepts it, and spot-checks docs. Grade A (accept), B (accept with listed fixes), C (send back).

## Build handbacks (one line per criterion, with evidence)
1. Correct: every "Done when" item on the card is met, shown by a test name or command output, not by the handback's word.
2. Scope: the diff touches only the card's "Files allowed"; no math change unless the card says so; T1-T5 money tests green.
3. Budget: tokens used vs the card's budget; over by more than 50% is a C unless explained.
4. Honest: the handback names what failed, what was skipped and what was not checked.
5. Phone: M1 device suite green on all profiles (once M1 lands).
C on 1, 2 or 4 sends it back.

## Docs and content
1. Accurate: each figure or claim checked against its source (money spec for math, IRS for tax, the vendor's page for prices); unconfirmed items marked as unconfirmed.
2. Consistent: no contradiction with the money spec, interfaces.md or queue.md, and Austin's decisions shown as decided.
3. Links: a sample of links opens to the right page (all links for course content).
4. Austin's words: matches what he asked; nothing he ruled out, nothing he didn't ask for presented as decided.
5. Lean: no padding; a reader can act on it.
Grades go in quality/grades.md, newest first.
