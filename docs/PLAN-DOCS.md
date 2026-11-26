# Plan documents for the build cards

Read-only inputs for the build cards. Read them with `git show origin/claude/plan-docs:docs/<file>`. Do not merge this branch.

- inflation-spec.md: inflation estimate spec (cards IF1a, IF1b)
- themes.json: the six theme token sets (cards TH1a, TH1)
- schema-v22.md: data schema v22 (card B1)
- learn.json: Learn page content (card L1)
- cut-list.tsv: copy trim decisions (card C1)
- themes-contrast-check.py: contrast check for the six themes (card TH1a ports it into scripts/)
- cut-list-v2.tsv: Nov 24 cut list under Austin's corrected rule (every (i) keeps its popup); flips-v2.md lists what changed
- themes-v2.json, themes-v2.md, build-themes-v2.py: themes v2 (Nov 25), replaces themes.json for card TH1 v2.
- asset-flow/: asset flow redesign (design thread, Nov 25; Austin approved for the build). Its src/themes.json is the old theme set: build it on themes-v2.json tokens and radius tokens instead.
- accounts-plan.md: accounts plan v9 (cards ACC0, ACC1a, ACC1b; Austin said yes to building and publishing it, Nov 26)
- acc-prototype/: the tested database part of the accounts plan (Supabase migrations, send-email hook, rule tests, privacy page). No secrets: the hook reads its keys from Edge Function secrets.
- quality-rubric.md: the grading rubric used for build handbacks
